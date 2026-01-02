"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import type { Database } from "@/lib/supabase/types";
import { hashPassword } from "@/lib/password";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  X
} from "lucide-react";

type ZUser = Database["public"]["Tables"]["z_usuarios"]["Row"];
type ZUserRole = Database["public"]["Tables"]["z_usuarios_papeis"]["Row"];
type ZSystem = Database["public"]["Tables"]["z_sistemas"]["Row"];

type StatusFilter = "all" | "active" | "inactive" | "password";

const REDIRECT_PATH = "/acesso-geral";

export function AccessAdminClient() {
  const { supabase } = useSupabase();

  const [users, setUsers] = useState<ZUser[]>([]);
  const [userRoles, setUserRoles] = useState<ZUserRole[]>([]);
  const [systems, setSystems] = useState<ZSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ZUser | null>(null);
  const [formData, setFormData] = useState<Partial<ZUser>>({
    nome_completo: "",
    email: "",
    ativo: true
  });
  const [passwordValue, setPasswordValue] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [clearPassword, setClearPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ZUser | null>(null);
  const [magicLoadingId, setMagicLoadingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, userRolesRes, systemsRes] = await Promise.all([
        supabase.from("z_usuarios").select("*").order("nome_completo"),
        supabase.from("z_usuarios_papeis").select("*"),
        supabase.from("z_sistemas").select("id, nome, ativo").order("nome")
      ]);

      if (usersRes.error) throw usersRes.error;
      if (userRolesRes.error) throw userRolesRes.error;
      if (systemsRes.error) throw systemsRes.error;

      setUsers(usersRes.data ?? []);
      setUserRoles(userRolesRes.data ?? []);
      setSystems(systemsRes.data ?? []);
    } catch (err: any) {
      console.error("Erro ao carregar dados:", err);
      setError(err.message || "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const rolesByUser = useMemo(() => {
    const roleCount = new Map<string, number>();
    userRoles.forEach((role) => {
      roleCount.set(role.usuario_id, (roleCount.get(role.usuario_id) ?? 0) + 1);
    });
    return roleCount;
  }, [userRoles]);

  const stats = useMemo(() => {
    const totalUsers = users.length;
    const activeUsers = users.filter((user) => user.ativo).length;
    const withPassword = users.filter((user) => Boolean(user.senha_hash)).length;
    const accessLinks = userRoles.length;
    const activeSystems = systems.filter((system) => system.ativo).length;
    return { totalUsers, activeUsers, withPassword, accessLinks, activeSystems };
  }, [systems, userRoles.length, users]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.nome_completo?.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;
      if (statusFilter === "active" && !user.ativo) return false;
      if (statusFilter === "inactive" && user.ativo) return false;
      if (statusFilter === "password" && user.senha_hash) return false;
      return true;
    });
  }, [search, statusFilter, users]);

  const openCreateDialog = () => {
    setEditingUser(null);
    setFormData({ nome_completo: "", email: "", ativo: true });
    setPasswordValue("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirm(false);
    setClearPassword(false);
    setActionMessage(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (user: ZUser) => {
    setEditingUser(user);
    setFormData({
      nome_completo: user.nome_completo,
      email: user.email,
      ativo: user.ativo
    });
    setPasswordValue("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirm(false);
    setClearPassword(false);
    setActionMessage(null);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setActionMessage(null);
    try {
      if (!formData.email) {
        setActionMessage("Informe o e-mail do usuário.");
        setSaving(false);
        return;
      }

      if ((passwordValue || confirmPassword) && passwordValue !== confirmPassword) {
        setActionMessage("As senhas não conferem.");
        setSaving(false);
        return;
      }

      const payload: Partial<ZUser> = {
        nome_completo: formData.nome_completo ?? "",
        email: formData.email,
        ativo: formData.ativo ?? true
      };

      if (clearPassword) {
        payload.senha_hash = null;
      } else if (passwordValue) {
        payload.senha_hash = await hashPassword(passwordValue);
      }

      if (editingUser) {
        const { error } = await supabase.from("z_usuarios").update(payload).eq("id", editingUser.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("z_usuarios").insert(payload);
        if (error) throw error;
      }

      setIsDialogOpen(false);
      await loadData();
    } catch (err: any) {
      console.error("Erro ao salvar usuário:", err);
      setActionMessage(err.message || "Erro ao salvar usuário.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (user: ZUser) => {
    setPendingDelete(user);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      const { error } = await supabase.from("z_usuarios").delete().eq("id", pendingDelete.id);
      if (error) throw error;
      setDeleteOpen(false);
      setPendingDelete(null);
      await loadData();
    } catch (err: any) {
      console.error("Erro ao excluir usuário:", err);
      setError("Erro ao excluir usuário.");
    }
  };

  const handleSendMagicLink = async (user: ZUser) => {
    setActionMessage(null);
    setMagicLoadingId(user.id);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${REDIRECT_PATH}`
        }
      });
      if (error) throw error;
      setActionMessage(`Magic link enviado para ${user.email}.`);
    } catch (err: any) {
      console.error("Erro ao enviar magic link:", err);
      setActionMessage("Não foi possível enviar o magic link.");
    } finally {
      setMagicLoadingId(null);
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("pt-BR");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Administração de Acessos</h1>
          <p className="text-sm text-neutral-500">
            Monitore usuários e gerencie credenciais e permissões do controle de acesso geral.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} className="gap-2">
            <Loader2 className={cn("size-4", loading && "animate-spin")} />
            Atualizar
          </Button>
          <Button size="sm" onClick={openCreateDialog} className="gap-2">
            <Plus className="size-4" />
            Novo usuário
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="flex items-center gap-4 p-4">
          <div className="rounded-xl bg-brand-50 p-3 text-brand-600">
            <Users className="size-5" />
          </div>
          <div>
            <p className="text-xs uppercase text-neutral-400">Usuários</p>
            <p className="text-lg font-semibold text-neutral-900">{stats.totalUsers}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-4">
          <div className="rounded-xl bg-green-50 p-3 text-success">
            <Users className="size-5" />
          </div>
          <div>
            <p className="text-xs uppercase text-neutral-400">Ativos</p>
            <p className="text-lg font-semibold text-neutral-900">{stats.activeUsers}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-4">
          <div className="rounded-xl bg-neutral-100 p-3 text-neutral-600">
            <Lock className="size-5" />
          </div>
          <div>
            <p className="text-xs uppercase text-neutral-400">Com senha</p>
            <p className="text-lg font-semibold text-neutral-900">{stats.withPassword}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-4">
          <div className="rounded-xl bg-brand-50 p-3 text-brand-600">
            <Lock className="size-5" />
          </div>
          <div>
            <p className="text-xs uppercase text-neutral-400">Vínculos</p>
            <p className="text-lg font-semibold text-neutral-900">{stats.accessLinks}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-4">
          <div className="rounded-xl bg-neutral-100 p-3 text-neutral-600">
            <Lock className="size-5" />
          </div>
          <div>
            <p className="text-xs uppercase text-neutral-400">Sistemas ativos</p>
            <p className="text-lg font-semibold text-neutral-900">{stats.activeSystems}</p>
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm outline-none hocus:border-brand-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700"
        >
          <option value="all">Todos os usuários</option>
          <option value="active">Somente ativos</option>
          <option value="inactive">Somente inativos</option>
          <option value="password">Sem senha</option>
        </select>
      </div>

      {actionMessage ? (
        <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3 text-sm text-neutral-600">
          {actionMessage}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-neutral-100 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="p-3 text-left font-medium">Usuário</th>
              <th className="p-3 text-left font-medium">Status</th>
              <th className="p-3 text-left font-medium">Senha</th>
              <th className="p-3 text-left font-medium">Acessos</th>
              <th className="p-3 text-left font-medium">Atualizado</th>
              <th className="p-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-neutral-50">
                <td className="p-3">
                  <div className="font-medium text-neutral-900">{user.nome_completo || "Sem nome"}</div>
                  <div className="text-xs text-neutral-500">{user.email}</div>
                </td>
                <td className="p-3">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
                      user.ativo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                    )}
                  >
                    {user.ativo ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="p-3">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
                      user.senha_hash ? "bg-brand-50 text-brand-700" : "bg-neutral-100 text-neutral-500"
                    )}
                  >
                    {user.senha_hash ? "Definida" : "Pendente"}
                  </span>
                </td>
                <td className="p-3 text-neutral-600">{rolesByUser.get(user.id) ?? 0}</td>
                <td className="p-3 text-neutral-500">{formatDate(user.atualizado_em)}</td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Enviar magic link"
                      onClick={() => handleSendMagicLink(user)}
                      disabled={magicLoadingId === user.id}
                    >
                      {magicLoadingId === user.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Mail className="size-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Editar"
                      onClick={() => openEditDialog(user)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Excluir"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => confirmDelete(user)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-sm text-neutral-500">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-neutral-900/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(520px,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-100 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <Dialog.Title className="text-lg font-semibold text-neutral-900">
                {editingUser ? "Editar usuário" : "Novo usuário"}
              </Dialog.Title>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon" aria-label="Fechar">
                  <X className="size-4" />
                </Button>
              </Dialog.Close>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-neutral-700">Nome completo</label>
                <input
                  className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                  value={formData.nome_completo ?? ""}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, nome_completo: event.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-700">E-mail</label>
                <input
                  className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                  value={formData.email ?? ""}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, email: event.target.value }))
                  }
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={formData.ativo ?? false}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, ativo: event.target.checked }))
                  }
                />
                <label htmlFor="ativo" className="text-sm text-neutral-600">
                  Usuário ativo
                </label>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">
                  {editingUser ? "Nova senha (opcional)" : "Senha inicial (opcional)"}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 pr-10 text-sm"
                    value={passwordValue}
                    onChange={(event) => setPasswordValue(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 pr-10 text-sm"
                    placeholder="Confirmar senha"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400"
                  >
                    {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {editingUser ? (
                  <label className="flex items-center gap-2 text-xs text-neutral-500">
                    <input
                      type="checkbox"
                      checked={clearPassword}
                      onChange={(event) => setClearPassword(event.target.checked)}
                    />
                    Remover senha atual
                  </label>
                ) : null}
              </div>
            </div>

            {actionMessage ? (
              <div className="mt-4 rounded-lg border border-neutral-100 bg-neutral-50 p-3 text-xs text-neutral-600">
                {actionMessage}
              </div>
            ) : null}

            <div className="mt-6 flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button variant="secondary">Cancelar</Button>
              </Dialog.Close>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : "Salvar"}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-neutral-900/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(420px,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-100 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <Dialog.Title className="text-lg font-semibold text-neutral-900">
                Excluir usuário
              </Dialog.Title>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon" aria-label="Fechar">
                  <X className="size-4" />
                </Button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="mt-2 text-sm text-neutral-500">
              Confirma a exclusão do usuário{" "}
              <span className="font-semibold text-neutral-700">{pendingDelete?.email}</span>?
            </Dialog.Description>
            <div className="mt-6 flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button variant="secondary">Cancelar</Button>
              </Dialog.Close>
              <Button variant="destructive" onClick={handleDelete}>
                Excluir
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
