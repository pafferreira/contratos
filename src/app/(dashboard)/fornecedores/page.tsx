"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { ChangeEvent, FormEvent } from "react";

import { format, parseISO } from "date-fns";

import clsx from "clsx";

import * as Dialog from "@radix-ui/react-dialog";
import * as Tooltip from "@radix-ui/react-tooltip";

import { CalendarDays, LayoutGrid, List, Pencil, Plus, RefreshCcw, Trash2, X } from "lucide-react";

import { z } from "zod";

import { PageHeader } from "@/components/common/page-header";

import { Button } from "@/components/ui/button";

import { Card } from "@/components/ui/card";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import { type Database, type TablesRow } from "@/lib/supabase/types";

type SupplierContractRow = TablesRow<Database["public"]["Tables"]["C_CONTRATOS_FORNECEDOR"]>;

type SupplierRow = TablesRow<Database["public"]["Tables"]["C_FORNECEDORES"]>;

type SupplierContractRecord = SupplierContractRow & {

  fornecedor?: Pick<SupplierRow, "id" | "nome"> | null;

};

type SupplierFormState = {
  id?: string;
  nome: string;
  documento: string;
  email_contato: string;
};

type SupplierFormErrors = Partial<Record<keyof SupplierFormState | "general", string>>;

type ContractFormState = {

  fornecedor_id: string;

  numero_contrato: string;

  data_inicio: string;

  data_fim: string;

  valor_total: string;

  valor_total_display: string;

  valor_comprometido: string;

  valor_comprometido_display: string;
  status: string;

};

type FormErrors = Partial<Record<keyof ContractFormState, string>> & {

  general?: string;

};

const CONTRACTS_TABLE = (

  process.env.NEXT_PUBLIC_SUPABASE_SUPPLIER_CONTRACTS_TABLE ?? "C_CONTRATOS_FORNECEDOR"

) as keyof Database["public"]["Tables"];

const SUPPLIERS_TABLE = (

  process.env.NEXT_PUBLIC_SUPABASE_SUPPLIERS_TABLE ?? "C_FORNECEDORES"

) as keyof Database["public"]["Tables"];

const STATUS_OPTIONS = [
  { value: "rascunho", label: "Rascunho" },
  { value: "ativo", label: "Ativo" },
  { value: "encerrado", label: "Encerrado" }
] as const;

const statusStyles: Record<string, string> = {
  rascunho: "bg-neutral-100 text-neutral-600",
  ativo: "bg-success/10 text-success",
  encerrado: "bg-neutral-200 text-neutral-700"
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {

  style: "currency",

  currency: "BRL"

});

const EMPTY_FORM_STATE: ContractFormState = {

  fornecedor_id: "",

  numero_contrato: "",

  data_inicio: "",

  data_fim: "",

  valor_total: "",

  valor_total_display: "",

  valor_comprometido: "",

  valor_comprometido_display: "",
  status: "rascunho",

};

const EMPTY_SUPPLIER_FORM_STATE: SupplierFormState = {
  nome: "",
  documento: "",
  email_contato: ""
};

const ContractFormSchema = z

  .object({

    fornecedor_id: z.string().trim().min(1, "Selecione o fornecedor"),

    numero_contrato: z.string().trim().min(1, "Informe o número do contrato"),

    data_inicio: z.string().trim().min(1, "Informe a data inicial"),

    data_fim: z.string().trim().min(1, "Informe a data final"),

    valor_total: z

      .string()

      .trim()

      .min(1, "Informe o valor total")

      .transform(Number)

      .refine((value) => !Number.isNaN(value), "Valor total inválido")

      .refine((value) => value > 0, "O valor total deve ser maior que zero"),

    valor_comprometido: z

      .string()

      .trim()

      .transform((value) => (value === "" ? 0 : Number(value)))

      .refine((value) => !Number.isNaN(value), "Valor comprometido inválido")

      .refine((value) => value >= 0, "O valor comprometido não pode ser negativo"),

    status: z.string().trim().min(1, "Selecione um status"),
  })

  .refine(

    (data) => {

      const start = new Date(data.data_inicio);

      const end = new Date(data.data_fim);

      return !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end >= start;

    },

    {

      message: "A data final deve ser posterior ou igual Ã  data inicial",

      path: ["data_fim"]

    }

  )

  .refine(

    (data) => data.valor_comprometido <= data.valor_total,

    {

      message: "O valor comprometido não pode ser maior que o total",

      path: ["valor_comprometido"]

    }

  );

const SupplierFormSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome do fornecedor"),
  documento: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((value = "") => value),
  email_contato: z
    .string()
    .trim()
    .email("Informe um email válido")
    .optional()
    .or(z.literal(""))
    .transform((value = "") => value)
});

function formatCurrency(value?: number | null) {

  if (typeof value !== "number") {

    return "até";

  }

  return currencyFormatter.format(value);

}

function formatDateRange(start?: string | null, end?: string | null) {

  if (!start || !end) return "Perí­odo não informado";

  try {

    return `${format(parseISO(start), "dd/MM/yyyy")} até ${format(parseISO(end), "dd/MM/yyyy")}`;

  } catch {

    return `${start} até ${end}`;

  }

}

function inputClassName(hasError?: boolean) {

  return clsx(

    "w-full rounded-lg border px-3 py-2 text-sm text-neutral-900 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-1",

    hasError

      ? "border-danger bg-white"

      : "border-neutral-300 bg-neutral-50 hover:border-brand-500 hover:bg-white"

  );

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

export default function ContratosFornecedorPage() {

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [contracts, setContracts] = useState<SupplierContractRecord[]>([]);

  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);

  const [formMode, setFormMode] = useState<"create" | "edit">("create");

  const [formState, setFormState] = useState<ContractFormState>({ ...EMPTY_FORM_STATE });

  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [submitting, setSubmitting] = useState(false);

  const [activeContractId, setActiveContractId] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);

  const [pendingContract, setPendingContract] = useState<SupplierContractRecord | null>(null);

  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [deleteLoading, setDeleteLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [activeTab, setActiveTab] = useState<"contracts" | "suppliers">("contracts");
  const [supplierSearchTerm, setSupplierSearchTerm] = useState("");
  const [suppliersLoading, setSuppliersLoading] = useState(true);
  const [suppliersRefreshing, setSuppliersRefreshing] = useState(false);
  const [supplierFormOpen, setSupplierFormOpen] = useState(false);
  const [supplierFormMode, setSupplierFormMode] = useState<"create" | "edit">("create");
  const [supplierFormState, setSupplierFormState] = useState<SupplierFormState>({
    ...EMPTY_SUPPLIER_FORM_STATE
  });
  const [supplierFormErrors, setSupplierFormErrors] = useState<SupplierFormErrors>({});
  const [supplierSubmitting, setSupplierSubmitting] = useState(false);
  const [supplierDeleteOpen, setSupplierDeleteOpen] = useState(false);
  const [pendingSupplier, setPendingSupplier] = useState<SupplierRow | null>(null);
  const [supplierDeleteError, setSupplierDeleteError] = useState<string | null>(null);
  const [supplierDeleteLoading, setSupplierDeleteLoading] = useState(false);

  const suppliersMap = useMemo(() => {

    const map = new Map<string, SupplierRow>();

    suppliers.forEach((supplier) => {

      if (supplier.id) {

        map.set(supplier.id, supplier);

      }

    });

    return map;

  }, [suppliers]);

  const loadSuppliers = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!supabase) {
        setError("Supabase não configurado.");
        setSuppliers([]);
        setSuppliersLoading(false);
        setSuppliersRefreshing(false);
        return [];
      }

      options?.silent ? setSuppliersRefreshing(true) : setSuppliersLoading(true);
      const { data, error: fetchError } = await supabase
        .from(SUPPLIERS_TABLE)
        .select("id, nome, documento, email_contato")
        .order("nome", { ascending: true });

      if (fetchError) {
        setError("Erro ao carregar fornecedores.");
        options?.silent ? setSuppliersRefreshing(false) : setSuppliersLoading(false);
        return [];
      }

      const rows = (data || []) as SupplierRow[];
      setSuppliers(rows);
      options?.silent ? setSuppliersRefreshing(false) : setSuppliersLoading(false);
      return rows;
    },
    [supabase]
  );

  const loadContracts = useCallback(

    async (options?: { silent?: boolean }) => {

      if (!supabase) {
        setError("Supabase não configurado.");
        setContracts([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (!options?.silent) {

        setLoading(true);

      }

      const { data, error: fetchError } = await supabase

        .from(CONTRACTS_TABLE)

        .select("*, fornecedor:C_FORNECEDORES(id, nome)")

        .order("data_inicio", { ascending: false });

      if (fetchError) {

        setError("Erro ao carregar contratos de fornecedor.");

        setContracts([]);

        setLoading(false);

        setRefreshing(false);

        return;

      }

      setContracts((data || []) as SupplierContractRecord[]);

      setLoading(false);

      setRefreshing(false);

    },

    [supabase]

  );

  useEffect(() => {

    void loadSuppliers();

    void loadContracts();

  }, [loadContracts, loadSuppliers]);

  const filteredContracts = useMemo(() => {

    const normalized = searchTerm.trim().toLowerCase();

    if (!normalized) return contracts;

    return contracts.filter((contract) => {

      return (

        contract.numero_contrato.toLowerCase().includes(normalized) ||

        contract.fornecedor?.nome?.toLowerCase().includes(normalized)

      );

    });

  }, [contracts, searchTerm]);

  const filteredSuppliers = useMemo(() => {
    const normalized = supplierSearchTerm.trim().toLowerCase();
    if (!normalized) return suppliers;
    return suppliers.filter((supplier) => {
      return (
        supplier.nome?.toLowerCase().includes(normalized) ||
        (supplier.documento ?? "").toLowerCase().includes(normalized) ||
        (supplier.email_contato ?? "").toLowerCase().includes(normalized)
      );
    });
  }, [suppliers, supplierSearchTerm]);

  const handleRefresh = async () => {

    setRefreshing(true);

    await Promise.all([loadSuppliers({ silent: true }), loadContracts({ silent: true })]);

    setRefreshing(false);

  };

  const resetForm = useCallback(() => {

    setFormState({ ...EMPTY_FORM_STATE });

    setFormErrors({});

    setActiveContractId(null);

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

    resetForm();

    setFormMode("create");

    setFormOpen(true);

  };

  const openEditForm = (contract: SupplierContractRecord) => {

    setFormMode("edit");

    setActiveContractId(contract.id ?? null);

    setFormState({

      fornecedor_id: contract.fornecedor_id ?? "",

      numero_contrato: contract.numero_contrato ?? "",

      data_inicio: contract.data_inicio ?? "",

      data_fim: contract.data_fim ?? "",

      valor_total: contract.valor_total?.toString() ?? "",

      valor_total_display: formatCurrencyDisplayFromNumber(contract.valor_total),

      valor_comprometido: contract.valor_comprometido?.toString() ?? "",

      valor_comprometido_display: formatCurrencyDisplayFromNumber(contract.valor_comprometido),

      status: contract.status ?? "rascunho",

    });

    setFormErrors({});

    setFormOpen(true);

  };

  const handleInputChange = (

    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>

  ) => {

    const { name, value } = event.target;

    setFormState((prev) => ({ ...prev, [name]: value }));

  };

  const handleCurrencyChange = (

    event: ChangeEvent<HTMLInputElement>,

    field: "valor_total" | "valor_comprometido"

  ) => {

    const { value } = event.target;

    const { raw, display } = normalizeCurrencyInput(value);

    setFormState((prev) => ({

      ...prev,

      [field]: raw,

      [`${field}_display`]: display

    }));

  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {

    event.preventDefault();

    setFormErrors({});

    const parsed = ContractFormSchema.safeParse(formState);

    if (!parsed.success) {

      const fieldErrors = parsed.error.flatten().fieldErrors;

      const formattedErrors: FormErrors = {};

      (Object.keys(fieldErrors) as (keyof typeof fieldErrors)[]).forEach((key) => {

        const [message] = fieldErrors[key] ?? [];

        if (message) {

          formattedErrors[key as keyof ContractFormState] = message;

        }

      });

      setFormErrors(formattedErrors);

      return;

    }

    if (!suppliersMap.has(parsed.data.fornecedor_id)) {

      setFormErrors({ fornecedor_id: "Selecione um fornecedor vÃ¡lido" });

      return;

    }

    const payload = {

      fornecedor_id: parsed.data.fornecedor_id,

      numero_contrato: parsed.data.numero_contrato,

      data_inicio: parsed.data.data_inicio,

      data_fim: parsed.data.data_fim,

      valor_total: parsed.data.valor_total,

      valor_comprometido: parsed.data.valor_comprometido,

      status: parsed.data.status,

    };

    setSubmitting(true);

    setError(null);

    if (!supabase) {
      setFormErrors({
        general: "Supabase não configurado. Verifique as variáveis de ambiente."
      });
      return;
    }

    const query = supabase.from(CONTRACTS_TABLE);

    const response = formMode === "edit" && activeContractId

      ? await query.update(payload).eq("id", activeContractId)

      : await query.insert(payload);

    setSubmitting(false);

    if (response.error) {

      setFormErrors({

        general: response.error.message || "Erro ao salvar o contrato. Verifique os dados e tente novamente.",

      });

      return;

    }

    setFormOpen(false);

    resetForm();

    await loadContracts();

  };

  const resetSupplierForm = useCallback(() => {
    setSupplierFormState({ ...EMPTY_SUPPLIER_FORM_STATE });
    setSupplierFormErrors({});
    setSupplierFormMode("create");
    setPendingSupplier(null);
  }, []);

  const handleSupplierFormDialogChange = (open: boolean) => {
    if (!open) {
      setSupplierFormOpen(false);
      resetSupplierForm();
      setSupplierSubmitting(false);
    } else {
      setSupplierFormOpen(true);
    }
  };

  const openCreateSupplierForm = () => {
    resetSupplierForm();
    setSupplierFormMode("create");
    setSupplierFormOpen(true);
  };

  const openEditSupplierForm = (supplier: SupplierRow) => {
    setSupplierFormMode("edit");
    setSupplierFormState({
      id: supplier.id,
      nome: supplier.nome ?? "",
      documento: supplier.documento ?? "",
      email_contato: supplier.email_contato ?? ""
    });
    setSupplierFormErrors({});
    setSupplierFormOpen(true);
  };

  const handleSupplierInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setSupplierFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSupplierSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSupplierFormErrors({});

    if (!supabase) {
      setSupplierFormErrors({
        general: "Supabase não configurado. Verifique as variáveis de ambiente."
      });
      return;
    }

    const parsed = SupplierFormSchema.safeParse(supplierFormState);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const formatted: SupplierFormErrors = {};
      Object.entries(fieldErrors).forEach(([field, messages]) => {
        if (messages?.length) {
          formatted[field as keyof SupplierFormState] = messages[0] ?? "Campo obrigatório";
        }
      });
      setSupplierFormErrors(formatted);
      return;
    }

    const payload = {
      nome: parsed.data.nome.trim(),
      documento: parsed.data.documento?.trim() ? parsed.data.documento.trim() : null,
      email_contato: parsed.data.email_contato?.trim() ? parsed.data.email_contato.trim() : null
    };

    setSupplierSubmitting(true);
    const query = supabase.from(SUPPLIERS_TABLE);
    const response =
      supplierFormMode === "edit" && supplierFormState.id
        ? await query.update(payload).eq("id", supplierFormState.id)
        : await query.insert(payload);
    setSupplierSubmitting(false);

    if (response.error) {
      setSupplierFormErrors({
        general: response.error.message ?? "Não foi possível salvar o fornecedor."
      });
      return;
    }

    resetSupplierForm();
    setSupplierFormOpen(false);
    await loadSuppliers({ silent: true });
    await loadContracts({ silent: true });
  };

  const openDeleteSupplierDialog = (supplier: SupplierRow) => {
    setPendingSupplier(supplier);
    setSupplierDeleteError(null);
    setSupplierDeleteOpen(true);
  };

  const handleSupplierDelete = async () => {
    if (!pendingSupplier?.id) return;
    if (!supabase) {
      setSupplierDeleteError("Supabase não configurado. Verifique as variáveis de ambiente.");
      return;
    }
    setSupplierDeleteLoading(true);
    const { error: deleteErr } = await supabase
      .from(SUPPLIERS_TABLE)
      .delete()
      .eq("id", pendingSupplier.id);
    setSupplierDeleteLoading(false);
    if (deleteErr) {
      setSupplierDeleteError(
        deleteErr.message ?? "Não foi possível excluir o fornecedor. Verifique vínculos existentes."
      );
      return;
    }
    setSupplierDeleteOpen(false);
    setPendingSupplier(null);
    await loadSuppliers({ silent: true });
    await loadContracts({ silent: true });
  };

  const handleDelete = async () => {

    if (!pendingContract?.id) return;

    setDeleteLoading(true);

    setDeleteError(null);

    if (!supabase) {
      setDeleteLoading(false);
      setDeleteError("Supabase não configurado.");
      return;
    }

    const { error: deleteErr } = await supabase

      .from(CONTRACTS_TABLE)

      .delete()

      .eq("id", pendingContract.id);

    setDeleteLoading(false);

    if (deleteErr) {

      setDeleteError("Erro ao excluir o contrato.");

      return;

    }

    setDeleteOpen(false);

    setPendingContract(null);

    await loadContracts();

  };

  const isCreateMode = formMode === "create";

  const supplierSelectDisabled = suppliers.length === 0;

  const submitDisabled = submitting || (supplierSelectDisabled && isCreateMode);
  const supplierModeIsCreate = supplierFormMode === "create";
  const supabaseUnavailable = supabase === null;

  const renderContractsSection = () => {
    if (loading) {
      return (
        <Card>
          <p className="text-sm text-neutral-500">Carregando contratos...</p>
        </Card>
      );
    }

    if (filteredContracts.length === 0) {
      return (
        <Card>
          <p className="text-sm text-neutral-500">
            Nenhum contrato encontrado para o filtro informado.
          </p>
        </Card>
      );
    }

    if (viewMode === "cards") {
      return (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredContracts.map((contract) => (
            <Card key={contract.id} className="space-y-4">

              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">

                <div>

                  <p className="text-xs uppercase tracking-wide text-neutral-400">

                    Contrato

                  </p>

                  <div className="flex items-center gap-2">

                    <h2 className="text-xl font-semibold text-neutral-900">

                      {contract.numero_contrato}

                    </h2>

                    <span

                      className={clsx(

                        "rounded-full px-2 py-0.5 text-xs font-medium",

                        statusStyles[contract.status ?? "rascunho"] ?? "bg-neutral-100 text-neutral-600"

                      )}

                    >

                      {STATUS_OPTIONS.find((option) => option.value === contract.status)?.label ??

                        "Sem status"}

                    </span>

                  </div>

                  <p className="text-sm text-neutral-600">

                    {contract.fornecedor?.nome ?? "Fornecedor não informado"}

                  </p>

                </div>

                <Tooltip.Provider delayDuration={150}>

                  <div className="flex items-center gap-2">

                    <Tooltip.Root>

                      <Tooltip.Trigger asChild>

                        <Button

                          variant="secondary"

                          size="sm"

                          onClick={() => openEditForm(contract)}

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

                          Editar contrato

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

                            setPendingContract(contract);

                            setDeleteOpen(true);

                            setDeleteError(null);

                          }}

                          aria-label="Excluir contrato"

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

                          Excluir contrato

                          <Tooltip.Arrow className="fill-white" />

                        </Tooltip.Content>

                      </Tooltip.Portal>

                    </Tooltip.Root>

                  </div>

                </Tooltip.Provider>

              </div>

              <div className="grid gap-3 text-sm text-neutral-600 md:grid-cols-2">

                <div>

                  <p className="text-neutral-500">Valor total</p>

                  <p className="font-medium text-neutral-900">

                    {formatCurrency(contract.valor_total)}

                  </p>

                </div>

                <div>

                  <p className="text-neutral-500">Valor comprometido</p>

                  <p className="font-medium text-neutral-900">

                    {formatCurrency(contract.valor_comprometido)}

                  </p>

                </div>

                <div>

                  <p className="text-neutral-500">Saldo disponível</p>

                  <p className="font-medium text-success">

                    {formatCurrency(contract.valor_disponivel)}

                  </p>

                </div>

                <div className="text-neutral-700">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="size-4 text-neutral-400" />
                    <span className="text-neutral-500">Vigência</span>
                  </div>
                  <p className="mt-1 font-medium text-neutral-900">
                    {formatDateRange(contract.data_inicio, contract.data_fim)}
                  </p>
                </div>

              </div>

            </Card>

          ))}

        </div>
      );
    }

    return (
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200 text-sm">
            <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3">Contrato</th>
                <th className="px-4 py-3">Valores</th>
                <th className="px-4 py-3">Vigência</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-700">
              {filteredContracts.map((contract) => {
                const statusLabel =
                  STATUS_OPTIONS.find((option) => option.value === contract.status)?.label ??
                  "Sem status";
                return (
                  <tr key={`${contract.id}-list`}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-neutral-900">{contract.numero_contrato}</p>
                      <p className="text-xs text-neutral-500">
                        {contract.fornecedor?.nome ?? "Fornecedor não informado"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-neutral-900">
                        {formatCurrency(contract.valor_total)}
                      </p>
                      <p className="text-xs text-neutral-500">
                        Comprometido: {formatCurrency(contract.valor_comprometido)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {formatDateRange(contract.data_inicio, contract.data_fim)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          statusStyles[contract.status ?? "rascunho"] ??
                            "bg-neutral-100 text-neutral-600"
                        )}
                      >
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Tooltip.Provider delayDuration={150}>
                        <div className="flex items-center justify-end gap-2">
                          <Tooltip.Root>
                            <Tooltip.Trigger asChild>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => openEditForm(contract)}
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
                                Editar contrato
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
                                  setPendingContract(contract);
                                  setDeleteOpen(true);
                                  setDeleteError(null);
                                }}
                                aria-label="Excluir contrato"
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
                                Excluir contrato
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
    );
  };

  const renderSuppliersSection = () => {
    if (suppliersLoading) {
      return (
        <Card>
          <p className="text-sm text-neutral-500">Carregando fornecedores...</p>
        </Card>
      );
    }

    if (filteredSuppliers.length === 0) {
      return (
        <Card>
          <div className="flex flex-col items-center justify-center gap-3 text-center text-sm text-neutral-500">
            <p>Nenhum fornecedor encontrado.</p>
            {supplierSearchTerm ? (
              <Button variant="secondary" size="sm" onClick={() => setSupplierSearchTerm("")}>
                Limpar busca
              </Button>
            ) : (
              <Button onClick={openCreateSupplierForm} disabled={supabaseUnavailable}>
                <Plus className="mr-2 size-4" />
                Cadastrar fornecedor
              </Button>
            )}
          </div>
        </Card>
      );
    }

    return (
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-100 text-sm">
            <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3">Fornecedor</th>
                <th className="px-4 py-3">Documento</th>
                <th className="px-4 py-3">Email de contato</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-700">
              {filteredSuppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td className="px-4 py-3 font-semibold text-neutral-900">{supplier.nome}</td>
                  <td className="px-4 py-3 text-neutral-700">
                    {supplier.documento ?? "Documento não informado"}
                  </td>
                  <td className="px-4 py-3 text-neutral-700">
                    {supplier.email_contato ?? "Email não informado"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Tooltip.Provider delayDuration={150}>
                      <div className="flex justify-end gap-2">
                        <Tooltip.Root>
                          <Tooltip.Trigger asChild>
                            <Button
                              variant="secondary"
                              size="sm"
                              type="button"
                              onClick={() => openEditSupplierForm(supplier)}
                              disabled={supabaseUnavailable}
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
                              Editar fornecedor
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
                              onClick={() => openDeleteSupplierDialog(supplier)}
                              className="text-danger"
                              disabled={supabaseUnavailable}
                              aria-label="Excluir fornecedor"
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
                              Excluir fornecedor
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
    );
  };

  const renderToolbar = () => {
    if (activeTab === "contracts") {
      return (
        <div className="flex flex-col gap-4 rounded-xl border border-neutral-100 bg-white/80 p-4 shadow-sm md:flex-row md:items-end md:gap-6">
          <div className="w-full md:flex-1">
            <label className="text-sm font-medium text-neutral-600">
              Buscar por número ou fornecedor
            </label>
            <input
              type="text"
              placeholder="Ex.: FORN-2024-08 ou Tech Experts"
              className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 focus:border-brand-500 focus:outline-none"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2 md:w-auto">
            <span className="text-sm font-medium text-neutral-600">Visualização</span>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-neutral-200 bg-white p-1">
                <Button
                  type="button"
                  size="icon"
                  variant={viewMode === "cards" ? "primary" : "ghost"}
                  onClick={() => setViewMode("cards")}
                  aria-pressed={viewMode === "cards"}
                >
                  <LayoutGrid className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant={viewMode === "list" ? "primary" : "ghost"}
                  onClick={() => setViewMode("list")}
                  aria-pressed={viewMode === "list"}
                >
                  <List className="size-4" />
                </Button>
              </div>
              <div className="flex flex-col gap-2 md:flex-row">
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
                <Button onClick={openCreateForm} disabled={supabaseUnavailable}>
                  <Plus className="mr-2 size-4" />
                  Novo contrato
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4 rounded-xl border border-neutral-100 bg-white/80 p-4 shadow-sm md:flex-row md:items-end md:justify-between">
        <div className="w-full md:flex-1">
          <label className="text-sm font-medium text-neutral-600">Buscar fornecedor</label>
          <input
            type="text"
            placeholder="Ex.: Nome, documento ou email"
            className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 focus:border-brand-500 focus:outline-none"
            value={supplierSearchTerm}
            onChange={(event) => setSupplierSearchTerm(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-end">
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={() => void loadSuppliers({ silent: true })}
            disabled={suppliersRefreshing}
          >
            <RefreshCcw className={clsx("mr-2 size-4", suppliersRefreshing && "animate-spin")} />
            {suppliersRefreshing ? "Atualizando..." : "Atualizar fornecedores"}
          </Button>
          <Button onClick={openCreateSupplierForm} disabled={supabaseUnavailable}>
            <Plus className="mr-2 size-4" />
            Novo fornecedor
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contratos de Fornecedor"
        subtitle="Gerencie contratos, vigências e valores negociados com fornecedores."
      />

      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={activeTab === "contracts" ? "secondary" : "ghost"}
          onClick={() => setActiveTab("contracts")}
        >
          Contratos
        </Button>
        <Button
          type="button"
          variant={activeTab === "suppliers" ? "secondary" : "ghost"}
          onClick={() => setActiveTab("suppliers")}
        >
          Fornecedores
        </Button>
      </div>

      {renderToolbar()}

      {activeTab === "contracts" ? renderContractsSection() : renderSuppliersSection()}

      <Dialog.Root open={formOpen} onOpenChange={handleFormDialogChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl focus:outline-none"
          >

            <div className="mb-4 flex items-center justify-between">

                <div>

                  <Dialog.Title className="text-lg font-semibold text-neutral-900">

                    {isCreateMode ? "Novo contrato de fornecedor" : "Editar contrato de fornecedor"}

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

                  <label className="text-sm font-medium text-neutral-700">Fornecedor</label>

                  <select

                    name="fornecedor_id"

                    value={formState.fornecedor_id}

                    onChange={handleInputChange}

                    className={clsx(inputClassName(Boolean(formErrors.fornecedor_id)), "mt-2 bg-white")}

                    disabled={supplierSelectDisabled}

                  >

                    <option value="">

                      {supplierSelectDisabled ? "Cadastre fornecedores primeiro" : "Selecione o fornecedor"}

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

                  <label className="text-sm font-medium text-neutral-700">Número do contrato</label>

                  <input

                    type="text"

                    name="numero_contrato"

                    value={formState.numero_contrato}

                    onChange={handleInputChange}

                    className={clsx(inputClassName(Boolean(formErrors.numero_contrato)), "mt-2")}

                  />

                  {formErrors.numero_contrato ? (

                    <p className="mt-1 text-xs text-danger">{formErrors.numero_contrato}</p>

                  ) : null}

                </div>

                <div className="grid gap-4 md:grid-cols-2">

                  <div>

                    <label className="text-sm font-medium text-neutral-700">Início da vigência</label>

                    <input

                      type="date"

                      name="data_inicio"

                      value={formState.data_inicio}

                      onChange={handleInputChange}

                      className={clsx(inputClassName(Boolean(formErrors.data_inicio)), "mt-2")}

                    />

                    {formErrors.data_inicio ? (

                      <p className="mt-1 text-xs text-danger">{formErrors.data_inicio}</p>

                    ) : null}

                  </div>

                  <div>

                    <label className="text-sm font-medium text-neutral-700">Fim da vigência</label>

                    <input

                      type="date"

                      name="data_fim"

                      value={formState.data_fim}

                      onChange={handleInputChange}

                      className={clsx(inputClassName(Boolean(formErrors.data_fim)), "mt-2")}

                    />

                    {formErrors.data_fim ? (

                      <p className="mt-1 text-xs text-danger">{formErrors.data_fim}</p>

                    ) : null}

                  </div>

                </div>

                <div className="grid gap-4 md:grid-cols-3">

                  <div>

                    <label className="text-sm font-medium text-neutral-700">Valor total</label>

                    <input

                      type="text"

                      name="valor_total_display"

                      value={formState.valor_total_display}

                      onChange={(event) => handleCurrencyChange(event, "valor_total")}

                      className={clsx(inputClassName(Boolean(formErrors.valor_total)), "mt-2")}

                    />

                    {formErrors.valor_total ? (

                      <p className="mt-1 text-xs text-danger">{formErrors.valor_total}</p>

                    ) : null}

                  </div>

                  <div>

                    <label className="text-sm font-medium text-neutral-700">Valor comprometido</label>

                    <input

                      type="text"

                      name="valor_comprometido_display"

                      value={formState.valor_comprometido_display}

                      onChange={(event) => handleCurrencyChange(event, "valor_comprometido")}

                      className={clsx(inputClassName(Boolean(formErrors.valor_comprometido)), "mt-2")}

                    />

                    {formErrors.valor_comprometido ? (

                      <p className="mt-1 text-xs text-danger">{formErrors.valor_comprometido}</p>

                    ) : null}

                  </div>

                  <div>

                    <label className="text-sm font-medium text-neutral-700">Status</label>

                    <select

                      name="status"

                      value={formState.status}

                      onChange={handleInputChange}

                      className={clsx(inputClassName(Boolean(formErrors.status)), "mt-2 bg-white")}

                    >

                      {STATUS_OPTIONS.map((option) => (

                        <option key={option.value} value={option.value}>

                          {option.label}

                        </option>

                      ))}

                    </select>

                    {formErrors.status ? (

                      <p className="mt-1 text-xs text-danger">{formErrors.status}</p>

                    ) : null}

                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">

                  <Dialog.Close asChild>

                    <Button type="button" variant="outline" onClick={resetForm}>

                      Cancelar

                    </Button>

                  </Dialog.Close>

                  <Button type="submit" disabled={submitDisabled}>

                    {submitting ? "Salvando..." : isCreateMode ? "Criar contrato" : "Atualizar contrato"}

                  </Button>

                </div>

              </form>

          </Dialog.Content>

        </Dialog.Portal>

      </Dialog.Root>

      <Dialog.Root open={supplierFormOpen} onOpenChange={handleSupplierFormDialogChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl focus:outline-none">
            <div className="flex items-start justify-between">
              <div>
                <Dialog.Title className="text-lg font-semibold text-neutral-900">
                  {supplierModeIsCreate ? "Novo fornecedor" : "Editar fornecedor"}
                </Dialog.Title>
                <Dialog.Description className="text-sm text-neutral-500">
                  Cadastre ou atualize os dados do fornecedor.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100"
                  onClick={resetSupplierForm}
                  aria-label="Fechar modal de fornecedor"
                >
                  <X className="size-4" />
                </button>
              </Dialog.Close>
            </div>

            {supplierFormErrors.general ? (
              <div className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                {supplierFormErrors.general}
              </div>
            ) : null}

            <form className="mt-4 space-y-4" onSubmit={handleSupplierSubmit}>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700" htmlFor="supplier_nome">
                  Nome do fornecedor
                </label>
                <input
                  id="supplier_nome"
                  name="nome"
                  value={supplierFormState.nome}
                  onChange={handleSupplierInputChange}
                  className={inputClassName(Boolean(supplierFormErrors.nome))}
                  placeholder="Ex.: ACME Serviços"
                />
                {supplierFormErrors.nome ? (
                  <p className="text-xs text-danger">{supplierFormErrors.nome}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700" htmlFor="supplier_documento">
                  Documento
                </label>
                <input
                  id="supplier_documento"
                  name="documento"
                  value={supplierFormState.documento}
                  onChange={handleSupplierInputChange}
                  className={inputClassName(Boolean(supplierFormErrors.documento))}
                  placeholder="CNPJ/CPF (opcional)"
                />
                {supplierFormErrors.documento ? (
                  <p className="text-xs text-danger">{supplierFormErrors.documento}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700" htmlFor="supplier_email">
                  Email de contato
                </label>
                <input
                  id="supplier_email"
                  type="email"
                  name="email_contato"
                  value={supplierFormState.email_contato}
                  onChange={handleSupplierInputChange}
                  className={inputClassName(Boolean(supplierFormErrors.email_contato))}
                  placeholder="contato@empresa.com (opcional)"
                />
                {supplierFormErrors.email_contato ? (
                  <p className="text-xs text-danger">{supplierFormErrors.email_contato}</p>
                ) : (
                  <p className="text-xs text-neutral-500">
                    Informe um email para avisos e comunicados.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Dialog.Close asChild>
                  <Button type="button" variant="outline" onClick={resetSupplierForm}>
                    Cancelar
                  </Button>
                </Dialog.Close>
                <Button type="submit" disabled={supplierSubmitting}>
                  {supplierSubmitting
                    ? supplierModeIsCreate
                      ? "Salvando..."
                      : "Atualizando..."
                    : supplierModeIsCreate
                      ? "Salvar fornecedor"
                      : "Atualizar fornecedor"}
                </Button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={supplierDeleteOpen} onOpenChange={setSupplierDeleteOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl focus:outline-none">
            <Dialog.Title className="text-lg font-semibold text-neutral-900">
              Excluir fornecedor
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-neutral-600">
              Confirma a exclusão do fornecedor{" "}
              <span className="font-semibold text-neutral-900">{pendingSupplier?.nome}</span>? Essa
              ação não pode ser desfeita.
            </Dialog.Description>

            {supplierDeleteError ? (
              <div className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                {supplierDeleteError}
              </div>
            ) : null}

            <div className="mt-6 flex justify-end gap-3">
              <Dialog.Close asChild>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setPendingSupplier(null);
                  }}
                >
                  Cancelar
                </Button>
              </Dialog.Close>
              <Button
                variant="destructive"
                type="button"
                onClick={handleSupplierDelete}
                disabled={supplierDeleteLoading || !pendingSupplier}
              >
                {supplierDeleteLoading ? "Excluindo..." : "Excluir"}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl focus:outline-none"
          >
              <Dialog.Title className="text-lg font-semibold text-neutral-900">
                Excluir contrato
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-neutral-600">
                Confirma a exclusão do contrato{" "}
                <span className="font-semibold text-neutral-800">
                 {pendingContract?.numero_contrato} 
                 </span>{" "} ? 
                <p>Essa ação não pode ser desfeita.</p>
              </Dialog.Description>

              {deleteError ? (
                <div className="mt-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                  {deleteError}
                </div>
              ) : null}

              <div className="mt-6 flex justify-end gap-3">
                <Dialog.Close asChild>
                  <Button variant="outline" type="button" onClick={() => setPendingContract(null)}>
                    Cancelar
                  </Button>
                </Dialog.Close>
                <Button
                  variant="destructive"
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteLoading || !pendingContract}
                >
                  {deleteLoading ? "Excluindo..." : "Excluir"}
                </Button>
              </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );

}

