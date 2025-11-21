"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import clsx from "clsx";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tooltip from "@radix-ui/react-tooltip";
import { LayoutGrid, List, Pencil, Plus, RefreshCcw, Trash2, X } from "lucide-react";
import { z } from "zod";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { type Database, type TablesRow } from "@/lib/supabase/types";

type ResourceRow = TablesRow<Database["public"]["Tables"]["C_RECURSOS_FORNECEDOR"]>;
type SupplierRow = TablesRow<Database["public"]["Tables"]["C_FORNECEDORES"]>;
type ProfileRow = TablesRow<Database["public"]["Tables"]["C_PERFIS_RECURSOS"]>;

type ResourceRecord = ResourceRow & {
  fornecedor?: Pick<SupplierRow, "id" | "nome"> | null;
  perfil?: Pick<ProfileRow, "id" | "nome" | "valor_hora"> | null;
};

type SupabaseResourceQueryResult = ResourceRow & {
  fornecedor: { id: SupplierRow["id"]; nome: SupplierRow["nome"] }[] | null;
  perfil: { id: ProfileRow["id"]; nome: ProfileRow["nome"]; valor_hora: ProfileRow["valor_hora"] }[] | null;
};

type ResourceFormState = {
  nome_completo: string;
  email: string;
  fornecedor_id: string;
  perfil_id: string;
  ativo: "true" | "false";
};

type FormErrors = Partial<Record<keyof ResourceFormState, string>> & {
  general?: string;
};

type ProfileFormState = {
  nome: string;
  descricao: string;
  valor_hora: string;
  valor_hora_display: string;
};

type ProfileFormErrors = Partial<Record<keyof ProfileFormState, string>> & {
  general?: string;
};

const RESOURCES_TABLE = (
  process.env.NEXT_PUBLIC_SUPABASE_RESOURCES_TABLE ?? "C_RECURSOS_FORNECEDOR"
) as keyof Database["public"]["Tables"];
const SUPPLIERS_TABLE = (
  process.env.NEXT_PUBLIC_SUPABASE_SUPPLIERS_TABLE ?? "C_FORNECEDORES"
) as keyof Database["public"]["Tables"];
const PROFILES_TABLE = (
  process.env.NEXT_PUBLIC_SUPABASE_PROFILES_TABLE ?? "C_PERFIS_RECURSOS"
) as keyof Database["public"]["Tables"];

const EMPTY_FORM_STATE: ResourceFormState = {
  nome_completo: "",
  email: "",
  fornecedor_id: "",
  perfil_id: "",
  ativo: "true"
};

const EMPTY_PROFILE_FORM_STATE: ProfileFormState = {
  nome: "",
  descricao: "",
  valor_hora: "",
  valor_hora_display: ""
};

const ResourceFormSchema = z.object({
  nome_completo: z.string().trim().min(1, "Informe o nome do recurso"),
  fornecedor_id: z.string().trim().min(1, "Selecione o fornecedor"),
  perfil_id: z.string().trim().min(1, "Selecione o perfil"),
  email: z
    .union([z.string().trim().email("Informe um e-mail válido"), z.literal("")])
    .transform((value) => (value === "" ? null : value)),
  ativo: z.enum(["true", "false"])
});

const ProfileFormSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome do perfil"),
  descricao: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((value = "") => value.trim()),
  valor_hora: z
    .string()
    .trim()
    .min(1, "Informe o valor hora")
    .transform(Number)
    .refine((value) => !Number.isNaN(value), "Valor hora inválido")
    .refine((value) => value > 0, "O valor hora deve ser maior que zero")
});

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

function formatCurrency(value?: number | null) {
  if (typeof value !== "number") {
    return "Valor não informado";
  }
  return currencyFormatter.format(value);
}

function formatCurrencyDisplayFromNumber(value?: number | null) {
  return typeof value === "number"
    ? currencyFormatter.format(value).replace(/\u00A0/g, " ")
    : "";
}

function normalizeCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) {
    return { raw: "", display: "" };
  }
  const numeric = (Number(digits) / 100).toFixed(2);
  const display = currencyFormatter.format(Number(numeric)).replace(/\u00A0/g, " ");
  return { raw: numeric, display };
}

function inputClassName(hasError?: boolean) {
  return clsx(
    "w-full rounded-lg border px-3 py-2 text-sm text-neutral-900 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-1",
    hasError
      ? "border-danger bg-white"
      : "border-neutral-300 bg-neutral-50 hover:border-brand-500 hover:bg-white"
  );
}

function tabButtonClassName(isActive: boolean) {
  return clsx(
    "rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition-colors",
    isActive
      ? "bg-brand-50 hover:bg-brand-100 ring-1 ring-brand-200 !text-brand-700"
      : "text-neutral-600 hover:text-neutral-900 hover:bg-white"
  );
}

function viewToggleClassName(isActive: boolean) {
  return clsx(
    "rounded-lg transition-colors",
    isActive
      ? "bg-brand-50 text-brand-700 ring-1 ring-brand-200"
      : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
  );
}

export default function RecursosPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [resources, setResources] = useState<ResourceRecord[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formState, setFormState] = useState<ResourceFormState>({ ...EMPTY_FORM_STATE });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [activeResourceId, setActiveResourceId] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pendingResource, setPendingResource] = useState<ResourceRecord | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [activeTab, setActiveTab] = useState<"resources" | "profiles">("resources");

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileFormOpen, setProfileFormOpen] = useState(false);
  const [profileFormMode, setProfileFormMode] = useState<"create" | "edit">("create");
  const [profileFormState, setProfileFormState] = useState<ProfileFormState>({
    ...EMPTY_PROFILE_FORM_STATE
  });
  const [profileFormErrors, setProfileFormErrors] = useState<ProfileFormErrors>({});
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [profileDeleteOpen, setProfileDeleteOpen] = useState(false);
  const [pendingProfile, setPendingProfile] = useState<ProfileRow | null>(null);
  const [profileDeleteError, setProfileDeleteError] = useState<string | null>(null);
  const [profileDeleteLoading, setProfileDeleteLoading] = useState(false);
  const [profileSearchTerm, setProfileSearchTerm] = useState("");

  const suppliersMap = useMemo(() => {
    const map = new Map<string, SupplierRow>();
    suppliers.forEach((supplier) => {
      if (supplier.id) {
        map.set(supplier.id, supplier);
      }
    });
    return map;
  }, [suppliers]);

  const profilesMap = useMemo(() => {
    const map = new Map<string, ProfileRow>();
    profiles.forEach((profile) => {
      if (profile.id) {
        map.set(profile.id, profile);
      }
    });
    return map;
  }, [profiles]);

  const loadSuppliers = useCallback(async () => {
    if (!supabase) {
      setError("Supabase não configurado. Verifique as variáveis de ambiente.");
      setSuppliers([]);
      return [];
    }
    const { data, error: fetchError } = await supabase
      .from(SUPPLIERS_TABLE)
      .select("id, nome")
      .order("nome", { ascending: true });

    if (fetchError) {
      setError("Erro ao carregar fornecedores.");
      return [];
    }

    const rows = (data || []) as SupplierRow[];
    setSuppliers(rows);
    return rows;
  }, [supabase]);

  const loadProfiles = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!supabase) {
        setProfileError("Supabase não configurado. Verifique as variáveis de ambiente.");
        setProfileLoading(false);
        return [];
      }
      if (!options?.silent) {
        setProfileLoading(true);
      }

      const { data, error: fetchError } = await supabase
        .from(PROFILES_TABLE)
        .select("id, nome, descricao, valor_hora")
        .order("nome", { ascending: true });

      if (fetchError) {
        setProfileError("Erro ao carregar perfis de recursos.");
        setProfileLoading(false);
        return [];
      }

      const rows = (data || []) as ProfileRow[];
      setProfileError(null);
      setProfiles(rows);
      setProfileLoading(false);
      return rows;
    },
    [supabase]
  );

  const loadResources = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!supabase) {
        setError("Supabase não configurado. Verifique as variáveis de ambiente.");
        setResources([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      if (!options?.silent) {
        setLoading(true);
      }

      const { data, error: fetchError } = await supabase
        .from(RESOURCES_TABLE)
        .select(
          "id, fornecedor_id, perfil_id, nome_completo, email, ativo, fornecedor:C_FORNECEDORES(id, nome), perfil:C_PERFIS_RECURSOS(id, nome, valor_hora)"
        )
        .order("nome_completo", { ascending: true });

      if (fetchError) {
        setError("Erro ao carregar recursos.");
        setResources([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setError(null);
      const normalizedResources: ResourceRecord[] = (data || []).map((resource) => {
        const { fornecedor, perfil, ...rest } = resource as SupabaseResourceQueryResult;
        return {
          ...rest,
          fornecedor: fornecedor?.[0] ?? null,
          perfil: perfil?.[0] ?? null
        };
      });
      setResources(normalizedResources);
      setLoading(false);
      setRefreshing(false);
    },
    [supabase]
  );

  useEffect(() => {
    void Promise.all([loadSuppliers(), loadProfiles(), loadResources()]);
  }, [loadProfiles, loadResources, loadSuppliers]);

  const displayResources = useMemo(() => {
    return resources.map((resource) => {
      const fallbackSupplier = suppliersMap.get(resource.fornecedor_id ?? "") ?? null;
      const fallbackProfile = profilesMap.get(resource.perfil_id ?? "") ?? null;

      return {
        ...resource,
        fornecedor:
          resource.fornecedor ??
          (fallbackSupplier ? { id: fallbackSupplier.id, nome: fallbackSupplier.nome } : null),
        perfil:
          resource.perfil ??
          (fallbackProfile
            ? {
                id: fallbackProfile.id,
                nome: fallbackProfile.nome,
                valor_hora: fallbackProfile.valor_hora
              }
            : null)
      };
    });
  }, [resources, suppliersMap, profilesMap]);

  const filteredResources = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    return displayResources.filter((resource) => {
      const supplierName = resource.fornecedor?.nome ?? "";
      const profileName = resource.perfil?.nome ?? "";

      const matchesSearch =
        normalized.length === 0 ||
        resource.nome_completo?.toLowerCase().includes(normalized) ||
        resource.email?.toLowerCase().includes(normalized) ||
        supplierName.toLowerCase().includes(normalized) ||
        profileName.toLowerCase().includes(normalized);

      const isActive = resource.ativo !== false;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && isActive) ||
        (statusFilter === "inactive" && !isActive);

      return matchesSearch && matchesStatus;
    });
  }, [displayResources, searchTerm, statusFilter]);

  const filteredProfiles = useMemo(() => {
    const normalized = profileSearchTerm.trim().toLowerCase();
    if (!normalized) return profiles;
    return profiles.filter((profile) => {
      return (
        profile.nome?.toLowerCase().includes(normalized) ||
        profile.descricao?.toLowerCase().includes(normalized)
      );
    });
  }, [profiles, profileSearchTerm]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadSuppliers(),
      loadProfiles({ silent: true }),
      loadResources({ silent: true })
    ]);
    setRefreshing(false);
  };

  const handleProfileRefresh = () => {
    void loadProfiles();
  };

  const resetForm = useCallback(() => {
    setFormState({ ...EMPTY_FORM_STATE });
    setFormErrors({});
    setActiveResourceId(null);
  }, []);

  const handleFormDialogChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setFormOpen(false);
        resetForm();
        setSubmitting(false);
      } else {
        setFormOpen(true);
      }
    },
    [resetForm]
  );

  const openCreateForm = () => {
    setFormMode("create");
    resetForm();
    setFormOpen(true);
  };

  const openEditForm = (resource: ResourceRecord) => {
    setFormMode("edit");
    setActiveResourceId(resource.id);
    setFormState({
      nome_completo: resource.nome_completo ?? "",
      email: resource.email ?? "",
      fornecedor_id: resource.fornecedor_id ?? "",
      perfil_id: resource.perfil_id ?? "",
      ativo: resource.ativo === false ? "false" : "true"
    });
    setFormErrors({});
    setFormOpen(true);
  };

  const resetProfileForm = useCallback(() => {
    setProfileFormState({ ...EMPTY_PROFILE_FORM_STATE });
    setProfileFormErrors({});
    setActiveProfileId(null);
  }, []);

  const handleProfileFormDialogChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setProfileFormOpen(false);
        resetProfileForm();
        setProfileSubmitting(false);
      } else {
        setProfileFormOpen(true);
      }
    },
    [resetProfileForm]
  );

  const openProfileCreate = () => {
    setProfileFormMode("create");
    resetProfileForm();
    setProfileFormOpen(true);
  };

  const openProfileEdit = (profile: ProfileRow) => {
    setProfileFormMode("edit");
    setActiveProfileId(profile.id);
    setProfileFormState({
      nome: profile.nome ?? "",
      descricao: profile.descricao ?? "",
      valor_hora:
        typeof profile.valor_hora === "number" ? profile.valor_hora.toFixed(2) : "",
      valor_hora_display: formatCurrencyDisplayFromNumber(profile.valor_hora)
    });
    setProfileFormErrors({});
    setProfileFormOpen(true);
  };

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setProfileFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileCurrencyChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    const { raw, display } = normalizeCurrencyInput(value);
    setProfileFormState((prev) => ({
      ...prev,
      valor_hora: raw,
      valor_hora_display: display
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormErrors({});

    const parsed = ResourceFormSchema.safeParse(formState);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const formattedErrors: FormErrors = {};
      (Object.keys(fieldErrors) as (keyof typeof fieldErrors)[]).forEach((key) => {
        const [message] = fieldErrors[key] ?? [];
        if (message) {
          formattedErrors[key as keyof ResourceFormState] = message;
        }
      });
      setFormErrors(formattedErrors);
      return;
    }

    if (!suppliersMap.has(parsed.data.fornecedor_id)) {
      setFormErrors({ fornecedor_id: "Selecione um fornecedor válido" });
      return;
    }

    if (!profilesMap.has(parsed.data.perfil_id)) {
      setFormErrors({ perfil_id: "Selecione um perfil válido" });
      return;
    }

    if (!supabase) {
      setFormErrors({
        general: "Supabase não configurado. Verifique as variáveis de ambiente."
      });
      return;
    }

    const payload = {
      nome_completo: parsed.data.nome_completo,
      email: parsed.data.email,
      fornecedor_id: parsed.data.fornecedor_id,
      perfil_id: parsed.data.perfil_id,
      ativo: parsed.data.ativo === "true"
    };

    setSubmitting(true);
    setError(null);

    if (!supabase) {
      setFormErrors({
        general: "Supabase não configurado. Verifique as variáveis de ambiente."
      });
      setSubmitting(false);
      return;
    }

    const query = supabase.from(RESOURCES_TABLE);
    const response =
      formMode === "edit" && activeResourceId
        ? await query.update(payload).eq("id", activeResourceId)
        : await query.insert(payload);

    setSubmitting(false);

    if (response.error) {
      setFormErrors({
        general:
          response.error.message ||
          "Erro ao salvar o recurso. Verifique os dados e tente novamente."
      });
      return;
    }

    setFormOpen(false);
    resetForm();
    await loadResources();
  };

  const handleDelete = async () => {
    if (!pendingResource?.id) return;
    if (!supabase) {
      setDeleteError("Supabase não configurado. Verifique as variáveis de ambiente.");
      return;
    }

    setDeleteLoading(true);
    setDeleteError(null);

    const { error: deleteErr } = await supabase
      .from(RESOURCES_TABLE)
      .delete()
      .eq("id", pendingResource.id);

    setDeleteLoading(false);

    if (deleteErr) {
      setDeleteError("Erro ao excluir o recurso.");
      return;
    }

    setDeleteOpen(false);
    setPendingResource(null);
    await loadResources();
  };

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileFormErrors({});

    if (!supabase) {
      setProfileFormErrors({
        general: "Supabase não configurado. Verifique as variáveis de ambiente."
      });
      return;
    }

    const parsed = ProfileFormSchema.safeParse(profileFormState);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const formattedErrors: ProfileFormErrors = {};
      (Object.keys(fieldErrors) as (keyof typeof fieldErrors)[]).forEach((key) => {
        const [message] = fieldErrors[key] ?? [];
        if (message) {
          formattedErrors[key as keyof ProfileFormState] = message;
        }
      });
      setProfileFormErrors(formattedErrors);
      return;
    }

    const payload = {
      nome: parsed.data.nome.trim(),
      descricao: parsed.data.descricao ? parsed.data.descricao : null,
      valor_hora: parsed.data.valor_hora
    };

    setProfileSubmitting(true);

    const query = supabase.from(PROFILES_TABLE);
    const response =
      profileFormMode === "edit" && activeProfileId
        ? await query.update(payload).eq("id", activeProfileId)
        : await query.insert(payload);

    setProfileSubmitting(false);

    if (response.error) {
      setProfileFormErrors({
        general:
          response.error.message ||
          "Erro ao salvar o perfil. Verifique os dados e tente novamente."
      });
      return;
    }

    setProfileFormOpen(false);
    resetProfileForm();
    await loadProfiles();
  };

  const handleProfileDelete = async () => {
    if (!pendingProfile?.id) return;
    if (!supabase) {
      setProfileDeleteError("Supabase não configurado. Verifique as variáveis de ambiente.");
      return;
    }

    setProfileDeleteLoading(true);
    setProfileDeleteError(null);

    const { error: deleteErr } = await supabase
      .from(PROFILES_TABLE)
      .delete()
      .eq("id", pendingProfile.id);

    setProfileDeleteLoading(false);

    if (deleteErr) {
      setProfileDeleteError("Erro ao excluir o perfil.");
      return;
    }

    setProfileDeleteOpen(false);
    setPendingProfile(null);
    await loadProfiles();
  };

  const isCreateMode = formMode === "create";
  const supplierSelectDisabled = suppliers.length === 0;
  const profileSelectDisabled = profiles.length === 0;
  const submitDisabled =
    submitting || ((supplierSelectDisabled || profileSelectDisabled) && isCreateMode);
  const profileIsCreateMode = profileFormMode === "create";
  const profileSubmitDisabled = profileSubmitting;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recursos ATE"
        subtitle="Gerencie alocações, perfis e disponibilidade dos recursos."
        actions={
          activeTab === "resources" ? (
            <Button onClick={openCreateForm}>
              <Plus className="mr-2 size-4" />
              Novo recurso
            </Button>
          ) : (
            <Button onClick={openProfileCreate}>
              <Plus className="mr-2 size-4" />
              Novo perfil
            </Button>
          )
        }
      />

      <div className="flex flex-wrap items-center gap-2 rounded-full border border-neutral-50 bg-neutral-50 p-1">
        <Button
          type="button"
          variant="ghost"
          className={tabButtonClassName(activeTab === "resources")}
          onClick={() => setActiveTab("resources")}
          aria-pressed={activeTab === "resources"}
        >
          Recursos
        </Button>
        <Button
          type="button"
          variant="ghost"
          className={tabButtonClassName(activeTab === "profiles")}
          onClick={() => setActiveTab("profiles")}
          aria-pressed={activeTab === "profiles"}
        >
          Perfis
        </Button>
      </div>

      {activeTab === "resources" ? (
        <>
          {error ? (
            <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="w-full md:max-w-md">
              <label className="text-sm font-medium text-neutral-600">
                Buscar por nome, e-mail, fornecedor ou perfil
              </label>
              <input
                type="text"
                placeholder="Ex.: Ana Souza ou Tech Experts"
                className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 focus:border-brand-500 focus:outline-none"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <div className="flex w-full flex-col gap-2 md:max-w-xs">
              <label className="text-sm font-medium text-neutral-600">Status</label>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as "all" | "active" | "inactive")
                }
                className="rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 focus:border-brand-500 focus:outline-none"
              >
                <option value="all">Todos</option>
                <option value="active">Apenas ativos</option>
                <option value="inactive">Apenas inativos</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-neutral-600">Visualização</span>
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg border border-neutral-200 bg-white p-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className={viewToggleClassName(viewMode === "cards")}
                    onClick={() => setViewMode("cards")}
                    aria-pressed={viewMode === "cards"}
                  >
                    <LayoutGrid className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className={viewToggleClassName(viewMode === "list")}
                    onClick={() => setViewMode("list")}
                    aria-pressed={viewMode === "list"}
                  >
                    <List className="size-4" />
                  </Button>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  type="button"
                >
                  <RefreshCcw className={clsx("mr-2 size-4", refreshing && "animate-spin")} />
                  Atualizar
                </Button>
              </div>
            </div>
          </div>

          {loading ? (
            <Card>
              <p className="text-sm text-neutral-500">Carregando recursos...</p>
            </Card>
          ) : filteredResources.length === 0 ? (
            <Card>
              <p className="text-sm text-neutral-500">
                Nenhum recurso encontrado para o filtro informado.
              </p>
            </Card>
          ) : viewMode === "cards" ? (
            <div className="grid gap-4 xl:grid-cols-2">
          {filteredResources.map((resource) => {
            const isActive = resource.ativo !== false;
            const supplierName =
              resource.fornecedor?.nome ??
              suppliersMap.get(resource.fornecedor_id ?? "")?.nome ??
              "Fornecedor não informado";
            const profileName =
              resource.perfil?.nome ??
              profilesMap.get(resource.perfil_id ?? "")?.nome ??
              "Perfil não informado";
            const profileRate =
              resource.perfil?.valor_hora ??
              profilesMap.get(resource.perfil_id ?? "")?.valor_hora ??
              null;
            return (
              <Card key={resource.id} className="space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-neutral-400">Recurso</p>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-semibold text-neutral-900">
                            {resource.nome_completo}
                          </h2>
                          <span
                            className={clsx(
                              "rounded-full px-2 py-0.5 text-xs font-medium",
                              isActive
                                ? "bg-success/10 text-success"
                                : "bg-neutral-200 text-neutral-600"
                            )}
                          >
                            {isActive ? "Ativo" : "Inativo"}
                          </span>
                        </div>
                        <p className="text-sm text-neutral-600">
                          {resource.email ?? "E-mail não informado"}
                        </p>
                      </div>

                      <Tooltip.Provider delayDuration={150}>
                        <div className="flex items-center gap-2">
                          <Tooltip.Root>
                            <Tooltip.Trigger asChild>
                              <Button variant="secondary" size="sm" onClick={() => openEditForm(resource)}>
                                <Pencil className="mr-2 size-4" />
                                Editar
                              </Button>
                            </Tooltip.Trigger>
                            <Tooltip.Portal>
                              <Tooltip.Content
                                side="top"
                                sideOffset={6}
                                className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-neutral-900 shadow-lg"
                              >
                                Editar recurso
                                <Tooltip.Arrow className="fill-white" />
                              </Tooltip.Content>
                            </Tooltip.Portal>
                          </Tooltip.Root>

                          <Tooltip.Root>
                            <Tooltip.Trigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setPendingResource(resource);
                                  setDeleteOpen(true);
                                  setDeleteError(null);
                                }}
                                aria-label="Excluir recurso"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </Tooltip.Trigger>
                            <Tooltip.Portal>
                              <Tooltip.Content
                                side="top"
                                sideOffset={6}
                                className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-neutral-900 shadow-lg"
                              >
                                Excluir recurso
                                <Tooltip.Arrow className="fill-white" />
                              </Tooltip.Content>
                            </Tooltip.Portal>
                          </Tooltip.Root>
                        </div>
                      </Tooltip.Provider>
                    </div>

                <div className="grid gap-3 text-sm text-neutral-600 md:grid-cols-2">
                  <div>
                    <p className="text-neutral-500">Fornecedor</p>
                    <p className="font-medium text-neutral-900">{supplierName}</p>
                  </div>
                  <div>
                    <p className="text-neutral-500">Perfil</p>
                    <p className="font-medium text-neutral-900">{profileName}</p>
                    {profileRate ? (
                      <p className="text-xs text-neutral-500">
                        Valor hora: {formatCurrency(profileRate)}
                      </p>
                    ) : null}
                  </div>
                </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200 text-sm">
                  <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    <tr>
                      <th className="px-4 py-3">Recurso</th>
                      <th className="px-4 py-3">Fornecedor</th>
                      <th className="px-4 py-3">Perfil</th>
                      <th className="px-4 py-3">Valor hora</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-neutral-700">
                    {filteredResources.map((resource) => {
                      const isActive = resource.ativo !== false;
                      const supplierName =
                        resource.fornecedor?.nome ??
                        suppliersMap.get(resource.fornecedor_id ?? "")?.nome ??
                        "Fornecedor não informado";
                      const profileName =
                        resource.perfil?.nome ??
                        profilesMap.get(resource.perfil_id ?? "")?.nome ??
                        "Perfil não informado";
                      const profileRate =
                        resource.perfil?.valor_hora ??
                        profilesMap.get(resource.perfil_id ?? "")?.valor_hora ??
                        null;
                      return (
                        <tr key={`${resource.id}-list`}>
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-neutral-900">
                                {resource.nome_completo}
                              </span>
                              <span
                                className={clsx(
                                  "rounded-full px-2 py-0.5 text-xs font-medium",
                                  isActive
                                    ? "bg-success/10 text-success"
                                    : "bg-neutral-200 text-neutral-600"
                                )}
                              >
                                {isActive ? "Ativo" : "Inativo"}
                              </span>
                            </div>
                            <p className="text-xs text-neutral-500">
                              {resource.email ?? "E-mail não informado"}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            {supplierName}
                          </td>
                          <td className="px-4 py-3">{profileName}</td>
                          <td className="px-4 py-3">
                            {profileRate ? formatCurrency(profileRate) : "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Tooltip.Provider delayDuration={150}>
                              <div className="flex items-center justify-end gap-2">
                                <Tooltip.Root>
                                  <Tooltip.Trigger asChild>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => openEditForm(resource)}
                                      type="button"
                                    >
                                      <Pencil className="mr-2 size-4" />
                                      Editar
                                    </Button>
                                  </Tooltip.Trigger>
                                  <Tooltip.Portal>
                                    <Tooltip.Content
                                      side="top"
                                      sideOffset={6}
                                      className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-neutral-900 shadow-lg"
                                    >
                                      Editar recurso
                                      <Tooltip.Arrow className="fill-white" />
                                    </Tooltip.Content>
                                  </Tooltip.Portal>
                                </Tooltip.Root>

                                <Tooltip.Root>
                                  <Tooltip.Trigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      type="button"
                                      onClick={() => {
                                        setPendingResource(resource);
                                        setDeleteOpen(true);
                                        setDeleteError(null);
                                      }}
                                      aria-label="Excluir recurso"
                                    >
                                      <Trash2 className="size-4" />
                                    </Button>
                                  </Tooltip.Trigger>
                                  <Tooltip.Portal>
                                    <Tooltip.Content
                                      side="top"
                                      sideOffset={6}
                                      className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-neutral-900 shadow-lg"
                                    >
                                      Excluir recurso
                                      <Tooltip.Arrow className="fill-white" />
                                    </Tooltip.Content>
                                  </Tooltip.Portal>
                                </Tooltip.Root>
                              </div>
                            </Tooltip.Provider>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <Dialog.Root open={formOpen} onOpenChange={handleFormDialogChange}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm" />
              <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl focus:outline-none">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <Dialog.Title className="text-lg font-semibold text-neutral-900">
                    {isCreateMode ? "Novo recurso" : "Editar recurso"}
                  </Dialog.Title>
                  <Dialog.Description className="text-sm text-neutral-500">
                    Preencha os dados e clique em salvar. Pressione ESC ou clique fora para fechar.
                  </Dialog.Description>
                </div>
                <Dialog.Close asChild>
                  <button
                    className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100"
                    aria-label="Fechar"
                    type="button"
                    onClick={resetForm}
                  >
                    <X className="size-4" />
                  </button>
                </Dialog.Close>
              </div>

              {formErrors.general ? (
                <div className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                  {formErrors.general}
                </div>
              ) : null}

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="text-sm font-medium text-neutral-700">Nome completo</label>
                  <input
                    type="text"
                    name="nome_completo"
                    value={formState.nome_completo}
                    onChange={handleInputChange}
                    className={clsx(inputClassName(Boolean(formErrors.nome_completo)), "mt-2")}
                  />
                  {formErrors.nome_completo ? (
                    <p className="mt-1 text-xs text-danger">{formErrors.nome_completo}</p>
                  ) : null}
                </div>

                <div>
                  <label className="text-sm font-medium text-neutral-700">E-mail corporativo</label>
                  <input
                    type="email"
                    name="email"
                    value={formState.email}
                    onChange={handleInputChange}
                    placeholder="nome.sobrenome@empresa.com"
                    className={clsx(inputClassName(Boolean(formErrors.email)), "mt-2")}
                  />
                  {formErrors.email ? (
                    <p className="mt-1 text-xs text-danger">{formErrors.email}</p>
                  ) : (
                    <p className="mt-1 text-xs text-neutral-500">Campo opcional</p>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-neutral-700">Fornecedor</label>
                    <select
                      name="fornecedor_id"
                      value={formState.fornecedor_id}
                      onChange={handleInputChange}
                      className={clsx(inputClassName(Boolean(formErrors.fornecedor_id)), "mt-2 bg-white")}
                      disabled={supplierSelectDisabled}
                    >
                      <option value="">
                        {supplierSelectDisabled
                          ? "Cadastre fornecedores primeiro"
                          : "Selecione o fornecedor"}
                      </option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.nome}
                        </option>
                      ))}
                    </select>
                    {formErrors.fornecedor_id ? (
                      <p className="mt-1 text-xs text-danger">{formErrors.fornecedor_id}</p>
                    ) : null}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-neutral-700">Perfil</label>
                    <select
                      name="perfil_id"
                      value={formState.perfil_id}
                      onChange={handleInputChange}
                      className={clsx(inputClassName(Boolean(formErrors.perfil_id)), "mt-2 bg-white")}
                      disabled={profileSelectDisabled}
                    >
                      <option value="">
                        {profileSelectDisabled
                          ? "Cadastre perfis primeiro"
                          : "Selecione o perfil"}
                      </option>
                      {profiles.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          {profile.nome}
                        </option>
                      ))}
                    </select>
                    {formErrors.perfil_id ? (
                      <p className="mt-1 text-xs text-danger">{formErrors.perfil_id}</p>
                    ) : null}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-neutral-700">Status</label>
                  <select
                    name="ativo"
                    value={formState.ativo}
                    onChange={handleInputChange}
                    className={clsx(inputClassName(Boolean(formErrors.ativo)), "mt-2 bg-white")}
                  >
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                  {formErrors.ativo ? (
                    <p className="mt-1 text-xs text-danger">{formErrors.ativo}</p>
                  ) : null}
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Dialog.Close asChild>
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancelar
                    </Button>
                  </Dialog.Close>
                  <Button type="submit" disabled={submitDisabled}>
                    {submitting ? "Salvando..." : isCreateMode ? "Criar recurso" : "Atualizar recurso"}
                  </Button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

      <Dialog.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl focus:outline-none">
            <Dialog.Title className="text-lg font-semibold text-neutral-900">
              Confirmar exclusão
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-neutral-600">
              Tem certeza que deseja excluir o recurso {pendingResource?.nome_completo}? Essa ação
              não pode ser desfeita.
            </Dialog.Description>

              {deleteError ? (
                <div className="mt-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                  {deleteError}
                </div>
              ) : null}

              <div className="mt-6 flex justify-end gap-3">
                <Dialog.Close asChild>
                  <Button variant="outline" type="button" onClick={() => setPendingResource(null)}>
                    Cancelar
                  </Button>
                </Dialog.Close>
                <Button
                  variant="destructive"
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? "Excluindo..." : "Excluir"}
                </Button>
              </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
        </>
      ) : (
        <>
          {profileError ? (
            <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {profileError}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="w-full md:max-w-md">
              <label className="text-sm font-medium text-neutral-600">
                Buscar por nome ou descrição
              </label>
              <input
                type="text"
                placeholder="Ex.: Perfil RPA ou Arquitetura"
                className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 focus:border-brand-500 focus:outline-none"
                value={profileSearchTerm}
                onChange={(event) => setProfileSearchTerm(event.target.value)}
              />
            </div>

            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={handleProfileRefresh}
              disabled={profileLoading}
            >
              <RefreshCcw className={clsx("mr-2 size-4", profileLoading && "animate-spin")} />
              Atualizar
            </Button>
          </div>

          {profileLoading ? (
            <Card>
              <p className="text-sm text-neutral-500">Carregando perfis...</p>
            </Card>
          ) : filteredProfiles.length === 0 ? (
            <Card>
              <p className="text-sm text-neutral-500">
                Nenhum perfil encontrado para o filtro informado.
              </p>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200 text-sm">
                  <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    <tr>
                      <th className="px-4 py-3">Perfil</th>
                      <th className="px-4 py-3">Descrição</th>
                      <th className="px-4 py-3">Valor hora</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-neutral-700">
                    {filteredProfiles.map((profile) => (
                      <tr key={`${profile.id}-profile`}>
                        <td className="px-4 py-3 font-semibold text-neutral-900">{profile.nome}</td>
                        <td className="px-4 py-3 text-neutral-600">
                          {profile.descricao && profile.descricao.trim().length > 0
                            ? profile.descricao
                            : "Descrição não informada"}
                        </td>
                        <td className="px-4 py-3 font-medium text-neutral-900">
                          {typeof profile.valor_hora === "number"
                            ? formatCurrency(profile.valor_hora)
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Tooltip.Provider delayDuration={150}>
                            <div className="flex items-center justify-end gap-2">
                              <Tooltip.Root>
                                <Tooltip.Trigger asChild>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    type="button"
                                    onClick={() => openProfileEdit(profile)}
                                  >
                                    <Pencil className="mr-2 size-4" />
                                    Editar
                                  </Button>
                                </Tooltip.Trigger>
                                <Tooltip.Portal>
                                  <Tooltip.Content
                                    side="top"
                                    sideOffset={6}
                                    className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-neutral-900 shadow-lg"
                                  >
                                    Editar perfil
                                    <Tooltip.Arrow className="fill-white" />
                                  </Tooltip.Content>
                                </Tooltip.Portal>
                              </Tooltip.Root>

                              <Tooltip.Root>
                                <Tooltip.Trigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    type="button"
                                    onClick={() => {
                                      setPendingProfile(profile);
                                      setProfileDeleteOpen(true);
                                      setProfileDeleteError(null);
                                    }}
                                    aria-label="Excluir perfil"
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                </Tooltip.Trigger>
                                <Tooltip.Portal>
                                  <Tooltip.Content
                                    side="top"
                                    sideOffset={6}
                                    className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-neutral-900 shadow-lg"
                                  >
                                    Excluir perfil
                                    <Tooltip.Arrow className="fill-white" />
                                  </Tooltip.Content>
                                </Tooltip.Portal>
                              </Tooltip.Root>
                            </div>
                          </Tooltip.Provider>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <Dialog.Root open={profileFormOpen} onOpenChange={handleProfileFormDialogChange}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm" />
              <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl focus:outline-none">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <Dialog.Title className="text-lg font-semibold text-neutral-900">
                      {profileIsCreateMode ? "Novo perfil" : "Editar perfil"}
                    </Dialog.Title>
                      <Dialog.Description className="text-sm text-neutral-500">
                        Cadastre perfis com descrição e valor hora padrão.
                      </Dialog.Description>
                    </div>
                    <Dialog.Close asChild>
                      <button
                        className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100"
                        aria-label="Fechar"
                        type="button"
                        onClick={resetProfileForm}
                      >
                        <X className="size-4" />
                      </button>
                    </Dialog.Close>
                  </div>

                  {profileFormErrors.general ? (
                    <div className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                      {profileFormErrors.general}
                    </div>
                  ) : null}

                  <form className="space-y-4" onSubmit={handleProfileSubmit}>
                    <div>
                      <label className="text-sm font-medium text-neutral-700">Nome do perfil</label>
                      <input
                        type="text"
                        name="nome"
                        value={profileFormState.nome}
                        onChange={handleProfileInputChange}
                        className={clsx(inputClassName(Boolean(profileFormErrors.nome)), "mt-2")}
                      />
                      {profileFormErrors.nome ? (
                        <p className="mt-1 text-xs text-danger">{profileFormErrors.nome}</p>
                      ) : null}
                    </div>

                    <div>
                      <label className="text-sm font-medium text-neutral-700">Descrição</label>
                      <textarea
                        name="descricao"
                        value={profileFormState.descricao}
                        onChange={handleProfileInputChange}
                        rows={3}
                        className={clsx(
                          inputClassName(Boolean(profileFormErrors.descricao)),
                          "mt-2 resize-none"
                        )}
                        placeholder="Principais atribuições, senioridade, etc."
                      />
                      <p className="mt-1 text-xs text-neutral-500">Campo opcional</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-neutral-700">Valor hora (R$)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        name="valor_hora_display"
                        value={profileFormState.valor_hora_display}
                        onChange={handleProfileCurrencyChange}
                        className={clsx(inputClassName(Boolean(profileFormErrors.valor_hora)), "mt-2")}
                      />
                      {profileFormErrors.valor_hora ? (
                        <p className="mt-1 text-xs text-danger">{profileFormErrors.valor_hora}</p>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <Dialog.Close asChild>
                        <Button type="button" variant="outline" onClick={resetProfileForm}>
                          Cancelar
                        </Button>
                      </Dialog.Close>
                      <Button type="submit" disabled={profileSubmitDisabled}>
                        {profileSubmitting
                          ? "Salvando..."
                          : profileIsCreateMode
                            ? "Criar perfil"
                            : "Atualizar perfil"}
                      </Button>
                    </div>
                  </form>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>

          <Dialog.Root open={profileDeleteOpen} onOpenChange={setProfileDeleteOpen}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm" />
              <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl focus:outline-none">
                <Dialog.Title className="text-lg font-semibold text-neutral-900">
                  Confirmar exclusão
                </Dialog.Title>
                <Dialog.Description className="mt-2 text-sm text-neutral-600">
                  Tem certeza que deseja excluir o perfil {pendingProfile?.nome}? Essa ação não pode
                  ser desfeita.
                </Dialog.Description>

                {profileDeleteError ? (
                  <div className="mt-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                    {profileDeleteError}
                  </div>
                ) : null}

                <div className="mt-6 flex justify-end gap-3">
                  <Dialog.Close asChild>
                    <Button variant="outline" type="button" onClick={() => setPendingProfile(null)}>
                      Cancelar
                    </Button>
                  </Dialog.Close>
                  <Button
                    variant="destructive"
                    type="button"
                    onClick={handleProfileDelete}
                    disabled={profileDeleteLoading}
                  >
                    {profileDeleteLoading ? "Excluindo..." : "Excluir"}
                  </Button>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </>
      )}
    </div>
  );
}
