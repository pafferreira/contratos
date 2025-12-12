"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as Dialog from "@radix-ui/react-dialog";
import {
  AlertTriangle,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  ShieldCheck,
  ShieldOff,
  Trash2,
  X
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { type Database, type TablesRow } from "@/lib/supabase/types";

type SystemRow = {
  id: string;
  name: string;
  key?: string | null;
};
type UserSystemProfileRow = TablesRow<Database["public"]["Tables"]["usuarios_sistema_perfis"]>;

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  created_at?: string | null;
};

type UserRecord = UserRow & {
  permissions: Array<
    UserSystemProfileRow & {
      system?: Pick<SystemRow, "name" | "key">;
    }
  >;
};

type FormState = {
  name: string;
  email: string;
  permissions: Array<{ system_id: string; profile: string; id?: string }>;
};

type UsersAdminClientProps = {
  isAdmin: boolean;
  systems: SystemRow[];
  currentUserId: string;
};

const PROFILE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "coord", label: "Coordenação" },
  { value: "user", label: "Usuário" }
];

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  permissions: []
};

export function UsersAdminClient({
  isAdmin,
  systems: initialSystems,
  currentUserId
}: UsersAdminClientProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const supabaseClient = supabase as unknown as SupabaseClient<any> | null;

  const [systems, setSystems] = useState<SystemRow[]>(initialSystems);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(isAdmin);
  const [error, setError] = useState<string | null>(null);
  const [permissionWarning, setPermissionWarning] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formState, setFormState] = useState<FormState>({ ...EMPTY_FORM });
  const [formError, setFormError] = useState<string | null>(null);
  const [activeUser, setActiveUser] = useState<UserRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<UserRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!supabaseClient) {
      setError(
        "Supabase não configurado. Verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY."
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const [usersResponse, permissionsResponse, systemsResponse] = await Promise.all([
      supabaseClient.from("usuarios").select("id, name, email, created_at"),
      supabaseClient.from("usuarios_sistema_perfis").select("id, user_id, system_id, profile"),
      systems.length
        ? Promise.resolve({ data: systems, error: null })
        : supabaseClient.from("sistemas").select("id, name, key")
    ]);

    if (usersResponse.error) {
      setError(usersResponse.error.message ?? "Não foi possível carregar os dados de usuários.");
      setLoading(false);
      return;
    }

    const permissionsError = permissionsResponse.error;
    if (permissionsError) {
      if (
        (permissionsError.message ?? "")
          .toLowerCase()
          .includes("infinite recursion")
      ) {
        setPermissionWarning(
          "Permissões não carregadas: ajuste a policy RLS de usuarios_sistema_perfis (erro de recursão)."
        );
      } else {
        setError(permissionsError.message ?? "Não foi possível carregar as permissões dos usuários.");
        setLoading(false);
        return;
      }
    } else {
      setPermissionWarning(null);
    }

    if (systemsResponse.error) {
      setError(systemsResponse.error.message ?? "Não foi possível carregar os sistemas.");
      setLoading(false);
      return;
    }

    const systemsList = (systemsResponse.data ?? systems) as SystemRow[];
    setSystems(systemsList);

    const systemIndex = new Map(systemsList.map((system) => [system.id, system]));
    const permissionsByUser: Record<string, UserRecord["permissions"]> = {};
    const permissionsData = permissionsResponse.error
      ? []
      : ((permissionsResponse.data ?? []) as UserSystemProfileRow[]);
    for (const permission of permissionsData) {
      if (!permissionsByUser[permission.user_id]) {
        permissionsByUser[permission.user_id] = [];
      }
      permissionsByUser[permission.user_id]?.push({
        ...permission,
        system: systemIndex.get(permission.system_id)
      });
    }

    const userRecords = ((usersResponse.data ?? []) as UserRow[])
      .map((user) => ({
        ...user,
        permissions: permissionsByUser[user.id] ?? []
      }))
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));

    setUsers(userRecords);
    setLoading(false);
  }, [supabaseClient, systems]);

  useEffect(() => {
    if (isAdmin) {
      void loadData();
    }
  }, [isAdmin, loadData]);

  const filteredUsers = users.filter((user) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      (user.name ?? "").toLowerCase().includes(term) ||
      (user.email ?? "").toLowerCase().includes(term) ||
      user.permissions.some(
        (permission) =>
          permission.profile.toLowerCase().includes(term) ||
          (permission.system?.name ?? "").toLowerCase().includes(term) ||
          (permission.system?.key ?? "").toLowerCase().includes(term)
      )
    );
  });

  function openCreateUser() {
    setFormMode("create");
    setFormState({ ...EMPTY_FORM });
    setFormError(null);
    setActiveUser(null);
    setFormOpen(true);
  }

  function openEditUser(user: UserRecord) {
    setFormMode("edit");
    setActiveUser(user);
    setFormState({
      name: user.name ?? "",
      email: user.email ?? "",
      permissions: user.permissions.map((permission) => ({
        id: permission.id,
        system_id: permission.system_id,
        profile: permission.profile
      }))
    });
    setFormError(null);
    setFormOpen(true);
  }

  function resetForm() {
    setFormState({ ...EMPTY_FORM });
    setFormError(null);
    setActiveUser(null);
    setFormOpen(false);
  }

  function handleFormOpenChange(open: boolean) {
    setFormOpen(open);
    if (!open) {
      resetForm();
    }
  }

  function updatePermissionRow(index: number, field: "system_id" | "profile", value: string) {
    setFormState((prev) => {
      const permissions = [...prev.permissions];
      permissions[index] = { ...permissions[index], [field]: value };
      return { ...prev, permissions };
    });
  }

  function addPermissionRow() {
    setFormState((prev) => ({
      ...prev,
      permissions: [...prev.permissions, { system_id: "", profile: "user" }]
    }));
  }

  function removePermissionRow(index: number) {
    setFormState((prev) => ({
      ...prev,
      permissions: prev.permissions.filter((_, idx) => idx !== index)
    }));
  }

  async function savePermissions(userId: string, permissions: FormState["permissions"]) {
    if (!supabaseClient) return false;

    const validProfiles = new Set(PROFILE_OPTIONS.map((item) => item.value));

    const normalized = permissions
      .map((item) => ({
        system_id: item.system_id.trim(),
        profile: item.profile.trim().toLowerCase()
      }))
      .filter((item) => item.system_id && validProfiles.has(item.profile));

    const { error: deleteError } = await supabaseClient
      .from("usuarios_sistema_perfis")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      if ((deleteError.message ?? "").toLowerCase().includes("infinite recursion")) {
        setPermissionWarning(
          "Permissões não foram atualizadas porque a policy RLS de usuarios_sistema_perfis está em loop. Ajuste a policy para reativar."
        );
        return true; // segue com o restante para não bloquear edição de nome/e-mail
      }
      setFormError("Não foi possível atualizar as permissões do usuário.");
      return false;
    }

    if (normalized.length === 0) {
      return true;
    }

    const { error: insertError } = await supabaseClient
      .from("usuarios_sistema_perfis")
      .insert(normalized.map((item) => ({ ...item, user_id: userId })));

    if (insertError) {
      if ((insertError.message ?? "").toLowerCase().includes("infinite recursion")) {
        setPermissionWarning(
          "Permissões não foram salvas porque a policy RLS de usuarios_sistema_perfis está em loop. Ajuste a policy para reativar."
        );
        return true; // não bloqueia a edição do usuário
      }
      setFormError("Não foi possível salvar as permissões do usuário.");
      return false;
    }

    return true;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!supabaseClient) {
      setFormError("Supabase não configurado.");
      return;
    }

    const name = formState.name.trim();
    const email = formState.email.trim();

    if (!name) {
      setFormError("Informe o nome do usuário.");
      return;
    }

    if (!email) {
      setFormError("Inclua o e-mail corporativo para habilitar MFA e notificações.");
      return;
    }

    setSaving(true);

    if (formMode === "create") {
      const { data: createdUser, error: createError } = await supabaseClient
        .from("usuarios")
        .insert({ name, email })
        .select("id")
        .single();

      if (createError || !createdUser) {
        setFormError("Não foi possível criar o usuário. Tente novamente.");
        setSaving(false);
        return;
      }

      const permissionsSaved = await savePermissions(createdUser.id, formState.permissions);
      if (!permissionsSaved) {
        setSaving(false);
        return;
      }
    } else if (activeUser) {
      const { error: updateError } = await supabaseClient
        .from("usuarios")
        .update({ name, email })
        .eq("id", activeUser.id);

      if (updateError) {
        setFormError("Não foi possível atualizar o usuário.");
        setSaving(false);
        return;
      }

      const permissionsSaved = await savePermissions(activeUser.id, formState.permissions);
      if (!permissionsSaved) {
        setSaving(false);
        return;
      }
    }

    await loadData();
    setSaving(false);
    resetForm();
  }

  function openDelete(user: UserRecord) {
    setPendingDelete(user);
    setDeleteOpen(true);
  }

  async function handleDelete() {
    if (!supabaseClient || !pendingDelete) return;

    if (pendingDelete.id === currentUserId) {
      setError("Você não pode remover seu próprio usuário enquanto estiver conectado.");
      setDeleteOpen(false);
      setPendingDelete(null);
      return;
    }

    setDeleteLoading(true);

    const { error: permissionsError } = await supabaseClient
      .from("usuarios_sistema_perfis")
      .delete()
      .eq("user_id", pendingDelete.id);

    if (permissionsError) {
      if ((permissionsError.message ?? "").toLowerCase().includes("infinite recursion")) {
        setPermissionWarning(
          "Permissões não foram removidas porque a policy RLS de usuarios_sistema_perfis está em loop."
        );
        // continua para remover o usuário mesmo assim
      } else {
        setError("Não foi possível remover as permissões do usuário.");
        setDeleteLoading(false);
        return;
      }
    }

    const { error: deleteError } = await supabaseClient
      .from("usuarios")
      .delete()
      .eq("id", pendingDelete.id);

    if (deleteError) {
      setError("Não foi possível excluir o usuário.");
      setDeleteLoading(false);
      return;
    }

    await loadData();
    setDeleteLoading(false);
    setDeleteOpen(false);
    setPendingDelete(null);
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Administração de Usuários"
          subtitle="Apenas administradores podem gerenciar perfis e acessos aos sistemas."
        />
        <Card className="flex items-start gap-3">
          <ShieldOff className="mt-1 size-5 text-danger" />
          <div>
            <p className="text-sm text-neutral-700">
              Seu perfil não tem permissão para administrar usuários. Solicite ao time de
              segurança ou a um administrador para liberar o acesso.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administração de Usuários"
        subtitle="Visualize perfis, e-mails e permissões por sistema. O e-mail é obrigatório para MFA e alertas."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => loadData()} disabled={loading}>
              <RefreshCcw className="mr-2 size-4" />
              Atualizar
            </Button>
            <Button onClick={openCreateUser}>
              <Plus className="mr-2 size-4" />
              Novo usuário
            </Button>
          </div>
        }
      />

      {error ? (
        <Card className="border-danger/30 bg-danger/5 text-danger">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 size-5" />
            <div>
              <p className="font-medium">Erro ao carregar usuários</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </Card>
      ) : null}

      {permissionWarning ? (
        <Card className="border-warning/40 bg-warning/10 text-neutral-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 size-5 text-warning" />
            <div>
              <p className="font-medium">Permissões não carregadas</p>
              <p className="text-sm">{permissionWarning}</p>
            </div>
          </div>
        </Card>
      ) : null}

      <Card className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-neutral-600">
              Liste usuários com nome, e-mail e perfis vinculados aos sistemas cadastrados.
            </p>
            <p className="text-xs text-neutral-500">
              E-mail é exibido para facilitar convites, MFA e recuperação de acesso.
            </p>
          </div>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, e-mail ou sistema"
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 shadow-sm outline-none hocus:border-brand-500 md:w-72"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-100">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="px-3 py-2">Usuário</th>
                <th className="px-3 py-2">E-mail</th>
                <th className="px-3 py-2">Permissões</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td className="px-3 py-6 text-sm text-neutral-600" colSpan={4}>
                    <div className="flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      Carregando usuários...
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-sm text-neutral-600" colSpan={4}>
                    Nenhum usuário encontrado com esse filtro.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isUserAdmin = user.permissions.some(
                    (permission) => permission.profile.toLowerCase().trim() === "admin"
                  );

                  return (
                    <tr key={user.id} className="text-sm text-neutral-800">
                      <td className="px-3 py-3">
                        <div className="font-semibold text-neutral-900">{user.name ?? "—"}</div>
                        <div className="text-xs text-neutral-500">
                          Criado em{" "}
                          {user.created_at
                            ? new Date(user.created_at).toLocaleDateString("pt-BR")
                            : "Data não informada"}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-neutral-800">{user.email ?? "E-mail não informado"}</div>
                        <div className="text-xs text-neutral-500">Necessário para MFA</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          {user.permissions.length === 0 ? (
                            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600">
                              Sem sistemas atribuídos
                            </span>
                          ) : (
                            user.permissions.map((permission) => (
                              <span
                                key={permission.id}
                                className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700"
                              >
                                <span className="rounded bg-white px-2 py-0.5 text-[11px] font-bold text-neutral-800">
                                  {permission.system?.key ?? "SYS"}
                                </span>
                                {permission.profile}
                              </span>
                            ))
                          )}
                        </div>
                        {isUserAdmin ? (
                          <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-neutral-900 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                            <ShieldCheck className="size-3.5" />
                            Admin
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <Button variant="secondary" size="sm" onClick={() => openEditUser(user)}>
                            <Pencil className="mr-2 size-4" />
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-danger hocus:bg-danger/10"
                            onClick={() => openDelete(user)}
                          >
                            <Trash2 className="mr-1.5 size-4" />
                            Remover
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog.Root open={formOpen} onOpenChange={handleFormOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl focus:outline-none">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <Dialog.Title className="text-lg font-semibold text-neutral-900">
                  {formMode === "create" ? "Novo usuário" : "Editar usuário"}
                </Dialog.Title>
                <Dialog.Description className="text-sm text-neutral-500">
                  Informe nome, e-mail (para MFA) e os acessos por sistema.
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

            {formError ? (
              <div className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                {formError}
              </div>
            ) : null}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700" htmlFor="name">
                    Nome
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={formState.name}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, name: event.target.value }))
                    }
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 shadow-sm outline-none hocus:border-brand-500"
                    placeholder="Nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700" htmlFor="email">
                    E-mail (necessário para MFA)
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={formState.email}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, email: event.target.value }))
                    }
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 shadow-sm outline-none hocus:border-brand-500"
                    placeholder="usuario@empresa.com.br"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-neutral-800">Permissões por sistema</p>
                    <p className="text-xs text-neutral-500">
                      Defina o perfil em cada sistema. Inclua um perfil &quot;admin&quot; apenas para
                      quem pode gerenciar outros usuários.
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" type="button" onClick={addPermissionRow}>
                    <Plus className="mr-2 size-4" />
                    Adicionar sistema
                  </Button>
                </div>

                {formState.permissions.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
                    Nenhuma permissão adicionada. Clique em &quot;Adicionar sistema&quot; para
                    vincular perfis.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {formState.permissions.map((permission, index) => (
                      <div
                        key={permission.id ?? index}
                        className="grid gap-3 rounded-lg border border-neutral-200 p-3 md:grid-cols-[1fr,1fr,auto]"
                      >
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                            Sistema
                          </label>
                          <select
                            value={permission.system_id}
                            onChange={(event) =>
                              updatePermissionRow(index, "system_id", event.target.value)
                            }
                            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 shadow-sm outline-none hocus:border-brand-500"
                          >
                            <option value="">Selecione um sistema</option>
                            {systems.map((system) => (
                              <option key={system.id} value={system.id}>
                                {(system as any).key ? `${(system as any).key} — ${system.name}` : system.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                            Perfil
                          </label>
                          <select
                            value={permission.profile}
                            onChange={(event) =>
                              updatePermissionRow(index, "profile", event.target.value)
                            }
                            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 shadow-sm outline-none hocus:border-brand-500"
                          >
                            <option value="">Selecione um perfil</option>
                            {PROFILE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-end justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-danger hocus:bg-danger/10"
                            onClick={() => removePermissionRow(index)}
                          >
                            <Trash2 className="mr-1.5 size-4" />
                            Remover
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2">
                <Dialog.Close asChild>
                  <Button type="button" variant="secondary" onClick={resetForm}>
                    Cancelar
                  </Button>
                </Dialog.Close>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      Salvando...
                    </span>
                  ) : (
                    "Salvar usuário"
                  )}
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
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-1 size-5 text-danger" />
              <div className="space-y-1">
                <Dialog.Title className="text-lg font-semibold text-neutral-900">
                  Confirmar exclusão
                </Dialog.Title>
                <Dialog.Description className="text-sm text-neutral-600">
                  Essa ação remove o usuário e todas as permissões vinculadas. Não será possível
                  desfazer.
                </Dialog.Description>
              </div>
            </div>

            <div className="mt-4 space-y-1 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
              <p className="text-sm font-semibold text-neutral-800">
                {pendingDelete?.name ?? "Usuário sem nome"}
              </p>
              <p className="text-xs text-neutral-600">{pendingDelete?.email ?? "Sem e-mail"}</p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <Dialog.Close asChild>
                <Button variant="secondary" type="button" onClick={() => setPendingDelete(null)}>
                  Cancelar
                </Button>
              </Dialog.Close>
              <Button
                variant="destructive"
                type="button"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Removendo..." : "Remover"}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
