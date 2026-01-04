"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import type { Database } from "@/lib/supabase/types";
import {
    LayoutGrid,
    List,
    Loader2,
    Lock,
    Monitor,
    Pencil,
    Plus,
    Search,
    Shield,
    Trash2,
    Users,
    X
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tooltip from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

type ZUser = Database["public"]["Tables"]["z_usuarios"]["Row"];
type ZUserInsert = Database["public"]["Tables"]["z_usuarios"]["Insert"];
type ZSystem = Database["public"]["Tables"]["z_sistemas"]["Row"];
type ZRole = Database["public"]["Tables"]["z_papeis"]["Row"];
type ZUserRole = Database["public"]["Tables"]["z_usuarios_papeis"]["Row"];

export function AccessControlClient() {
    const { supabase } = useSupabase();
    const [activeTab, setActiveTab] = useState("users");

    // Data State
    const [users, setUsers] = useState<ZUser[]>([]);
    const [systems, setSystems] = useState<ZSystem[]>([]);
    const [roles, setRoles] = useState<ZRole[]>([]);
    const [userRoles, setUserRoles] = useState<ZUserRole[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load Data
    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [usersRes, systemsRes, rolesRes, userRolesRes] = await Promise.all([
                supabase.from("z_usuarios").select("*").order("nome_completo"),
                supabase.from("z_sistemas").select("*").order("nome"),
                supabase.from("z_papeis").select("*").order("nome"),
                supabase.from("z_usuarios_papeis").select("*")
            ]);

            if (usersRes.error) throw usersRes.error;
            if (systemsRes.error) throw systemsRes.error;
            if (rolesRes.error) throw rolesRes.error;
            if (userRolesRes.error) throw userRolesRes.error;

            setUsers(usersRes.data);
            setSystems(systemsRes.data);
            setRoles(rolesRes.data);
            setUserRoles(userRolesRes.data);
        } catch (err: any) {
            console.error("Error loading data:", err);
            setError(err.message || "Erro ao carregar dados.");
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900">Controle de Acesso</h1>
                    <p className="text-sm text-neutral-500">
                        Gerencie usuários, sistemas e permissões de acesso.
                    </p>
                </div>
                <Button onClick={loadData} variant="outline" size="sm" className="gap-2">
                    <Loader2 className={cn("size-4", loading && "animate-spin")} />
                    Atualizar
                </Button>
            </div>

            {error && (
                <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                    {error}
                </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                    <TabsTrigger value="users" className="gap-2">
                        <Users className="size-4" />
                        Usuários
                    </TabsTrigger>
                    <TabsTrigger value="systems" className="gap-2">
                        <Monitor className="size-4" />
                        Sistemas
                    </TabsTrigger>
                    <TabsTrigger value="roles" className="gap-2">
                        <Shield className="size-4" />
                        Papéis
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="users" className="mt-6 space-y-4">
                    <UsersTab
                        users={users}
                        systems={systems}
                        roles={roles}
                        userRoles={userRoles}
                        onRefresh={loadData}
                        supabase={supabase}
                    />
                </TabsContent>

                <TabsContent value="systems" className="mt-6 space-y-4">
                    <SystemsTab
                        systems={systems}
                        userRoles={userRoles}
                        onRefresh={loadData}
                        supabase={supabase}
                    />
                </TabsContent>

                <TabsContent value="roles" className="mt-6 space-y-4">
                    <RolesTab
                        roles={roles}
                        users={users}
                        userRoles={userRoles}
                        systems={systems}
                        onRefresh={loadData}
                        supabase={supabase}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}

// --- Users Tab Component ---

// --- Users Tab Component ---

function UsersTab({ users, systems, roles, userRoles, onRefresh, supabase }: any) {
    const [search, setSearch] = useState("");
    const [viewMode, setViewMode] = useState<"cards" | "list">("list");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<ZUser | null>(null);
    const [formData, setFormData] = useState<ZUserInsert>({ nome_completo: "", email: "", ativo: true });
    const [saving, setSaving] = useState(false);

    // Delete Dialog State
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<ZUser | null>(null);

    // Manage Roles Dialog
    const [isRolesDialogOpen, setIsRolesDialogOpen] = useState(false);
    const [selectedUserForRoles, setSelectedUserForRoles] = useState<ZUser | null>(null);

    const filteredUsers = users.filter((u: ZUser) =>
        u.nome_completo?.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    const handleSave = async () => {
        setSaving(true);
        try {
            if (editingUser) {
                const { error } = await supabase.from("z_usuarios").update(formData).eq("id", editingUser.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from("z_usuarios").insert(formData);
                if (error) throw error;
            }
            setIsDialogOpen(false);
            onRefresh();
        } catch (err: any) {
            alert("Erro ao salvar usuário: " + err.message);
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
            onRefresh();
            setDeleteOpen(false);
            setPendingDelete(null);
        } catch (err: any) {
            alert("Erro ao excluir: " + err.message);
        }
    };

    return (
        <>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="relative max-w-sm flex-1">
                    <Search className="absolute left-2.5 top-2.5 size-4 text-neutral-500" />
                    <input
                        type="text"
                        placeholder="Buscar usuários..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-md border border-neutral-200 bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-lg border border-neutral-200 bg-white p-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-7 w-7", viewMode === "cards" && "bg-neutral-100 text-neutral-900")}
                            onClick={() => setViewMode("cards")}
                        >
                            <LayoutGrid className="size-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-7 w-7", viewMode === "list" && "bg-neutral-100 text-neutral-900")}
                            onClick={() => setViewMode("list")}
                        >
                            <List className="size-4" />
                        </Button>
                    </div>
                    <Button onClick={() => { setEditingUser(null); setFormData({ ativo: true }); setIsDialogOpen(true); }}>
                        <Plus className="mr-2 size-4" />
                        Novo Usuário
                    </Button>
                </div>
            </div>

            {viewMode === "cards" ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredUsers.map((user: ZUser) => (
                        <Card key={user.id} className="flex flex-col justify-between p-4 transition-shadow hover:shadow-md">
                            <div>
                                <div className="flex items-start justify-between">
                                    <div className="flex size-10 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700">
                                        {user.nome_completo?.charAt(0).toUpperCase() || "U"}
                                    </div>
                                    <div className="flex gap-1">
                                        <ActionTooltip label="Gerenciar Acessos">
                                            <Button variant="ghost" size="icon" className="size-8 text-neutral-500 hover:text-brand-600"
                                                onClick={() => { setSelectedUserForRoles(user); setIsRolesDialogOpen(true); }}
                                            >
                                                <Lock className="size-4" />
                                            </Button>
                                        </ActionTooltip>
                                        <ActionTooltip label="Editar">
                                            <Button variant="ghost" size="icon" className="size-8 text-neutral-500 hover:text-brand-600"
                                                onClick={() => { setEditingUser(user); setFormData(user); setIsDialogOpen(true); }}
                                            >
                                                <Pencil className="size-4" />
                                            </Button>
                                        </ActionTooltip>
                                        <ActionTooltip label="Excluir">
                                            <Button variant="ghost" size="icon" className="size-8 text-neutral-500 hover:text-red-600"
                                                onClick={() => confirmDelete(user)}
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </ActionTooltip>
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <h3 className="font-semibold text-neutral-900">{user.nome_completo}</h3>
                                    <p className="text-sm text-neutral-500">{user.email}</p>
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                    <span className={cn("inline-flex h-2 w-2 rounded-full", user.ativo ? "bg-green-500" : "bg-red-500")} />
                                    <span className="text-xs text-neutral-500">{user.ativo ? "Ativo" : "Inativo"}</span>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="rounded-md border border-neutral-200 bg-white">
                    <table className="w-full text-sm">
                        <thead className="bg-neutral-50 text-neutral-500">
                            <tr>
                                <th className="p-3 text-left font-medium">Nome</th>
                                <th className="p-3 text-left font-medium">Email</th>
                                <th className="p-3 text-left font-medium">Status</th>
                                <th className="p-3 text-right font-medium">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {filteredUsers.map((user: ZUser) => (
                                <tr key={user.id} className="hover:bg-neutral-50">
                                    <td className="p-3 font-medium text-neutral-900">{user.nome_completo}</td>
                                    <td className="p-3 text-neutral-500">{user.email}</td>
                                    <td className="p-3">
                                        <span className={cn("inline-flex items-center rounded-full px-2 py-1 text-xs font-medium", user.ativo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                                            {user.ativo ? "Ativo" : "Inativo"}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right">
                                        <div className="flex justify-end gap-1">
                                            <ActionTooltip label="Gerenciar Acessos">
                                                <Button variant="ghost" size="icon" className="size-8 text-neutral-500 hover:text-brand-600"
                                                    onClick={() => { setSelectedUserForRoles(user); setIsRolesDialogOpen(true); }}
                                                >
                                                    <Lock className="size-4" />
                                                </Button>
                                            </ActionTooltip>
                                            <ActionTooltip label="Editar">
                                                <Button variant="ghost" size="icon" className="size-8 text-neutral-500 hover:text-brand-600"
                                                    onClick={() => { setEditingUser(user); setFormData(user); setIsDialogOpen(true); }}
                                                >
                                                    <Pencil className="size-4" />
                                                </Button>
                                            </ActionTooltip>
                                            <ActionTooltip label="Excluir">
                                                <Button variant="ghost" size="icon" className="size-8 text-neutral-500 hover:text-red-600"
                                                    onClick={() => confirmDelete(user)}
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </ActionTooltip>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* User Dialog */}
            <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
                    <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-xl">
                        <Dialog.Title className="text-lg font-bold">
                            {editingUser ? "Editar Usuário" : "Novo Usuário"}
                        </Dialog.Title>
                        <div className="mt-4 space-y-4">
                            <div>
                                <label className="text-sm font-medium">Nome Completo</label>
                                <input
                                    className="w-full rounded-md border p-2 text-sm"
                                    value={formData.nome_completo || ""}
                                    onChange={e => setFormData({ ...formData, nome_completo: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Email</label>
                                <input
                                    className="w-full rounded-md border p-2 text-sm"
                                    value={formData.email || ""}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="ativo"
                                    checked={formData.ativo}
                                    onChange={e => setFormData({ ...formData, ativo: e.target.checked })}
                                />
                                <label htmlFor="ativo" className="text-sm">Usuário Ativo</label>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSave} disabled={saving}>
                                {saving ? <Loader2 className="size-4 animate-spin" /> : "Salvar"}
                            </Button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* Delete Confirmation Dialog */}
            <Dialog.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-40 bg-neutral-900/60 backdrop-blur-sm" />
                    <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(420px,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-100 bg-white p-6 shadow-card">
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
                        <Dialog.Description className="mt-1 text-sm text-neutral-500">
                            Confirma a exclusão do usuário?
                            <div className="mt-2 font-semibold text-neutral-800">
                                {pendingDelete?.nome_completo} - {pendingDelete?.email}
                            </div>
                            <p className="mt-2">Essa ação não pode ser desfeita.</p>
                        </Dialog.Description>

                        <div className="mt-6 flex items-center justify-end gap-3">
                            <Dialog.Close asChild>
                                <Button type="button" variant="ghost">
                                    Cancelar
                                </Button>
                            </Dialog.Close>
                            <Button
                                variant="destructive"
                                onClick={handleDelete}
                            >
                                Excluir
                            </Button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* Roles Management Dialog */}
            {selectedUserForRoles && (
                <UserRolesDialog
                    user={selectedUserForRoles}
                    isOpen={isRolesDialogOpen}
                    onClose={() => setIsRolesDialogOpen(false)}
                    systems={systems}
                    roles={roles}
                    userRoles={userRoles}
                    onRefresh={onRefresh}
                    supabase={supabase}
                />
            )}
        </>
    );
}

// --- User Roles Dialog ---

function UserRolesDialog({ user, isOpen, onClose, systems, roles, userRoles, onRefresh, supabase }: any) {
    const [saving, setSaving] = useState(false);
    const hasRoles = roles.length > 0;

    // Group roles by system
    const rolesBySystem = useMemo(() => {
        const grouped: Record<string, ZRole[]> = {};
        const sortedRoles = [...roles].sort((a, b) => a.nome.localeCompare(b.nome));
        systems.forEach((sys: ZSystem) => {
            grouped[sys.id] = sortedRoles;
        });
        return grouped;
    }, [systems, roles]);

    // Current user roles
    const currentUserRoles = userRoles.filter((ur: ZUserRole) => ur.usuario_id === user.id);

    const handleToggleRole = async (roleId: string, systemId: string, checked: boolean) => {
        setSaving(true);
        try {
            if (checked) {
                await supabase
                    .from("z_usuarios_papeis")
                    .insert({ usuario_id: user.id, papel_id: roleId, sistema_id: systemId });
            } else {
                await supabase
                    .from("z_usuarios_papeis")
                    .delete()
                    .match({ usuario_id: user.id, papel_id: roleId, sistema_id: systemId });
            }
            onRefresh();
        } catch (err: any) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
                <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[80vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
                    <Dialog.Title className="mb-1 text-lg font-bold">
                        Acessos de {user.nome_completo}
                    </Dialog.Title>
                    <Dialog.Description className="mb-4 text-sm text-neutral-500">
                        Gerencie os papeis atribuídos a este usuário em cada sistema.
                    </Dialog.Description>

                    {!hasRoles ? (
                        <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-neutral-700">
                            Nenhum papel cadastrado. Crie papéis antes de atribuir acessos por sistema.
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {systems.map((sys: ZSystem) => {
                                const sysRoles = rolesBySystem[sys.id] || [];
                                if (sysRoles.length === 0) return null;

                                return (
                                    <div key={sys.id} className="rounded-lg border p-4">
                                        <h4 className="mb-3 flex items-center gap-2 font-semibold text-neutral-900">
                                            <Monitor className="size-4 text-neutral-500" />
                                            {sys.nome}
                                        </h4>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            {sysRoles.map((role: ZRole) => {
                                                const hasRole = currentUserRoles.some(
                                                    (ur: ZUserRole) =>
                                                        ur.papel_id === role.id && ur.sistema_id === sys.id
                                                );
                                                return (
                                                    <label key={role.id} className="flex cursor-pointer items-center gap-2 rounded p-2 text-sm hover:bg-neutral-50">
                                                        <input
                                                            type="checkbox"
                                                            checked={hasRole}
                                                            onChange={(e) => handleToggleRole(role.id, sys.id, e.target.checked)}
                                                            disabled={saving}
                                                            className="rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
                                                        />
                                                        <span>{role.nome}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                            {systems.length === 0 && (
                                <p className="text-center text-neutral-500">Nenhum sistema cadastrado.</p>
                            )}
                        </div>
                    )}

                    <div className="mt-6 flex justify-end">
                        <Button onClick={onClose}>Fechar</Button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

// --- Systems Tab Component ---

// --- Systems Tab Component ---

function SystemsTab({ systems, userRoles, onRefresh, supabase }: any) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingSystem, setEditingSystem] = useState<ZSystem | null>(null);
    const [formData, setFormData] = useState<Partial<ZSystem>>({ nome: "", descricao: "", ativo: true });
    const [saving, setSaving] = useState(false);

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<ZSystem | null>(null);

    const rolesBySystem = useMemo(() => {
        const map = new Map<string, number>();
        (userRoles as ZUserRole[]).forEach((entry) => {
            if (!entry.sistema_id) return;
            map.set(entry.sistema_id, (map.get(entry.sistema_id) ?? 0) + 1);
        });
        return map;
    }, [userRoles]);

    const handleSave = async () => {
        setSaving(true);
        try {
            if (editingSystem) {
                const { error } = await supabase.from("z_sistemas").update(formData).eq("id", editingSystem.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from("z_sistemas").insert(formData);
                if (error) throw error;
            }
            setIsDialogOpen(false);
            onRefresh();
        } catch (err: any) {
            alert("Erro ao salvar sistema: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = (sys: ZSystem) => {
        setPendingDelete(sys);
        setDeleteOpen(true);
    };

    const handleDelete = async () => {
        if (!pendingDelete) return;
        try {
            const { error } = await supabase.from("z_sistemas").delete().eq("id", pendingDelete.id);
            if (error) throw error;
            onRefresh();
            setDeleteOpen(false);
            setPendingDelete(null);
        } catch (err: any) {
            alert("Erro ao excluir: " + err.message);
        }
    };

    return (
        <>
            <div className="mb-4 flex justify-end">
                <Button onClick={() => { setEditingSystem(null); setFormData({ ativo: true }); setIsDialogOpen(true); }}>
                    <Plus className="mr-2 size-4" />
                    Novo Sistema
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {systems.map((sys: ZSystem) => (
                    <Card key={sys.id} className="p-4">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                                <Monitor className="size-5 text-brand-600" />
                                <h3 className="font-semibold">{sys.nome}</h3>
                            </div>
                            <div className="flex gap-1">
                                <ActionTooltip label="Editar">
                                    <Button variant="ghost" size="icon" className="size-8" onClick={() => { setEditingSystem(sys); setFormData(sys); setIsDialogOpen(true); }}>
                                        <Pencil className="size-4" />
                                    </Button>
                                </ActionTooltip>
                                <ActionTooltip label="Excluir">
                                    <Button variant="ghost" size="icon" className="size-8 text-red-500" onClick={() => confirmDelete(sys)}>
                                        <Trash2 className="size-4" />
                                    </Button>
                                </ActionTooltip>
                            </div>
                        </div>
                        <p className="mt-2 text-sm text-neutral-500">{sys.descricao || "Sem descrição"}</p>
                        {(rolesBySystem.get(sys.id) ?? 0) === 0 && (
                            <p className="mt-2 text-xs font-semibold text-warning">
                                Nenhum papel atribuído para este sistema.
                            </p>
                        )}
                        <div className="mt-4 flex items-center gap-2">
                            <span className={cn("inline-flex h-2 w-2 rounded-full", sys.ativo ? "bg-green-500" : "bg-neutral-300")} />
                            <span className="text-xs text-neutral-500">{sys.ativo ? "Ativo" : "Inativo"}</span>
                        </div>
                    </Card>
                ))}
            </div>

            <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
                    <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-xl">
                        <Dialog.Title className="text-lg font-bold">
                            {editingSystem ? "Editar Sistema" : "Novo Sistema"}
                        </Dialog.Title>
                        <div className="mt-4 space-y-4">
                            <div>
                                <label className="text-sm font-medium">Nome</label>
                                <input
                                    className="w-full rounded-md border p-2 text-sm"
                                    value={formData.nome || ""}
                                    onChange={e => setFormData({ ...formData, nome: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Descrição</label>
                                <textarea
                                    className="w-full rounded-md border p-2 text-sm"
                                    value={formData.descricao || ""}
                                    onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="sysAtivo"
                                    checked={formData.ativo}
                                    onChange={e => setFormData({ ...formData, ativo: e.target.checked })}
                                />
                                <label htmlFor="sysAtivo" className="text-sm">Sistema Ativo</label>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSave} disabled={saving}>
                                {saving ? <Loader2 className="size-4 animate-spin" /> : "Salvar"}
                            </Button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* Delete Confirmation Dialog */}
            <Dialog.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-40 bg-neutral-900/60 backdrop-blur-sm" />
                    <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(420px,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-100 bg-white p-6 shadow-card">
                        <div className="flex items-start justify-between">
                            <Dialog.Title className="text-lg font-semibold text-neutral-900">
                                Excluir sistema
                            </Dialog.Title>
                            <Dialog.Close asChild>
                                <Button variant="ghost" size="icon" aria-label="Fechar">
                                    <X className="size-4" />
                                </Button>
                            </Dialog.Close>
                        </div>
                        <Dialog.Description className="mt-1 text-sm text-neutral-500">
                            Confirma a exclusão do sistema{" "}
                            <span className="font-semibold text-neutral-800">{pendingDelete?.nome}</span>?
                            <p className="mt-2">Essa ação não pode ser desfeita.</p>
                        </Dialog.Description>

                        <div className="mt-6 flex items-center justify-end gap-3">
                            <Dialog.Close asChild>
                                <Button type="button" variant="ghost">
                                    Cancelar
                                </Button>
                            </Dialog.Close>
                            <Button
                                variant="destructive"
                                onClick={handleDelete}
                            >
                                Excluir
                            </Button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </>
    );
}

// --- Roles Tab Component ---

// --- Roles Tab Component ---

function RolesTab({ roles, users, userRoles, systems, onRefresh, supabase }: any) {
    const [search, setSearch] = useState("");
    const [viewMode, setViewMode] = useState<"cards" | "list">("list");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<ZRole | null>(null);
    const [formData, setFormData] = useState<Partial<ZRole>>({ nome: "" });
    const [saving, setSaving] = useState(false);

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<ZRole | null>(null);
    const [isRoleUsersOpen, setIsRoleUsersOpen] = useState(false);
    const [selectedRoleForUsers, setSelectedRoleForUsers] = useState<ZRole | null>(null);

    const usersByRole = useMemo(() => {
        const map = new Map<string, string[]>();
        userRoles.forEach((ur: ZUserRole) => {
            const user = users.find((u: ZUser) => u.id === ur.usuario_id);
            if (!user) return;
            const key = `${ur.papel_id ?? ""}::${ur.sistema_id ?? ""}`;
            const list = map.get(key) ?? [];
            list.push(user.nome_completo || user.email);
            map.set(key, list);
        });
        map.forEach((list, key) => {
            map.set(key, Array.from(new Set(list)).sort((a, b) => a.localeCompare(b)));
        });
        return map;
    }, [userRoles, users]);

    const systemNameById = useMemo(() => {
        const map = new Map<string, string>();
        systems.forEach((system: ZSystem) => {
            map.set(system.id, system.nome);
        });
        return map;
    }, [systems]);

    const filteredRoles = roles.filter((r: ZRole) => {
        return r.nome.toLowerCase().includes(search.toLowerCase());
    });

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = { nome: (formData.nome ?? "").trim() };
            if (!payload.nome) {
                alert("Informe o nome do papel.");
                setSaving(false);
                return;
            }
            if (editingRole) {
                const { error } = await supabase
                    .from("z_papeis")
                    .update(payload)
                    .eq("id", editingRole.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from("z_papeis").insert(payload);
                if (error) throw error;
            }
            setIsDialogOpen(false);
            onRefresh();
        } catch (err: any) {
            alert("Erro ao salvar papel: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = (role: ZRole) => {
        setPendingDelete(role);
        setDeleteOpen(true);
    };

    const handleDelete = async () => {
        if (!pendingDelete) return;
        try {
            const { error } = await supabase.from("z_papeis").delete().eq("id", pendingDelete.id);
            if (error) throw error;
            onRefresh();
            setDeleteOpen(false);
            setPendingDelete(null);
        } catch (err: any) {
            alert("Erro ao excluir: " + err.message);
        }
    };

    const handleCreateRole = () => {
        setEditingRole(null);
        setFormData({ nome: "" });
        setIsDialogOpen(true);
    };

    const handleEditRole = (role: ZRole) => {
        setEditingRole(role);
        setFormData({ nome: role.nome });
        setIsDialogOpen(true);
    };

    const handleManageUsers = (role: ZRole) => {
        setSelectedRoleForUsers(role);
        setIsRoleUsersOpen(true);
    };

    return (
        <>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="relative max-w-sm flex-1">
                    <Search className="absolute left-2.5 top-2.5 size-4 text-neutral-500" />
                    <input
                        type="text"
                        placeholder="Buscar papeis..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-md border border-neutral-200 bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-lg border border-neutral-200 bg-white p-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-7 w-7", viewMode === "cards" && "bg-neutral-100 text-neutral-900")}
                            onClick={() => setViewMode("cards")}
                        >
                            <LayoutGrid className="size-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-7 w-7", viewMode === "list" && "bg-neutral-100 text-neutral-900")}
                            onClick={() => setViewMode("list")}
                        >
                            <List className="size-4" />
                        </Button>
                    </div>
                    <Button onClick={handleCreateRole}>
                        <Plus className="mr-2 size-4" />
                        Novo Papel
                    </Button>
                </div>
            </div>

            {viewMode === "cards" ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredRoles.map((role: ZRole) => (
                        <Card key={role.id} className="p-4 transition-shadow hover:shadow-md">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="mb-1 flex items-center gap-2">
                                        <Shield className="size-4 text-brand-600" />
                                        <h3 className="font-semibold text-neutral-900">{role.nome}</h3>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <ActionTooltip label="Editar">
                                        <Button variant="ghost" size="icon" className="size-8 text-neutral-500 hover:text-brand-600" onClick={() => handleEditRole(role)}>
                                            <Pencil className="size-4" />
                                        </Button>
                                    </ActionTooltip>
                                    <ActionTooltip label="Usuários">
                                        <Button variant="ghost" size="icon" className="size-8 text-neutral-500 hover:text-brand-600" onClick={() => handleManageUsers(role)}>
                                            <Users className="size-4" />
                                        </Button>
                                    </ActionTooltip>
                                    <ActionTooltip label="Excluir">
                                        <Button variant="ghost" size="icon" className="size-8 text-neutral-500 hover:text-red-600" onClick={() => confirmDelete(role)}>
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </ActionTooltip>
                                </div>
                            </div>
                            <div className="mt-3 space-y-1 text-xs text-neutral-500">
                                {systems.length === 0 ? (
                                    <p>Sem sistemas cadastrados.</p>
                                ) : (
                                    systems.map((system: ZSystem) => {
                                        const key = `${role.id}::${system.id}`;
                                        const total = (usersByRole.get(key) ?? []).length;
                                        return (
                                            <p key={system.id}>
                                                {system.nome}: {total} usuário(s)
                                            </p>
                                        );
                                    })
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="rounded-md border border-neutral-200 bg-white">
                    <table className="w-full text-sm">
                        <thead className="bg-neutral-50 text-neutral-500">
                            <tr>
                                <th className="p-3 text-left font-medium">Papel</th>
                                <th className="p-3 text-left font-medium">Sistema</th>
                                <th className="p-3 text-left font-medium">Usuários</th>
                                <th className="p-3 text-right font-medium">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {filteredRoles.map((role: ZRole) => (
                                systems.length > 0 ? (
                                    systems.map((system: ZSystem) => {
                                        const key = `${role.id}::${system.id}`;
                                        const usersList = usersByRole.get(key) ?? [];
                                        return (
                                            <tr key={`${role.id}-${system.id}`} className="hover:bg-neutral-50">
                                                <td className="p-3 font-medium text-neutral-900">{role.nome}</td>
                                                <td className="p-3 text-neutral-500">
                                                    {systemNameById.get(system.id) ?? system.id}
                                                </td>
                                                <td className="p-3 text-neutral-500">
                                                    {usersList.join(", ") || "—"}
                                                </td>
                                                <td className="p-3 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <ActionTooltip label="Editar">
                                                            <Button variant="ghost" size="icon" className="size-8 text-neutral-500 hover:text-brand-600" onClick={() => handleEditRole(role)}>
                                                                <Pencil className="size-4" />
                                                            </Button>
                                                        </ActionTooltip>
                                                        <ActionTooltip label="Usuários">
                                                            <Button variant="ghost" size="icon" className="size-8 text-neutral-500 hover:text-brand-600" onClick={() => handleManageUsers(role)}>
                                                                <Users className="size-4" />
                                                            </Button>
                                                        </ActionTooltip>
                                                        <ActionTooltip label="Excluir">
                                                            <Button variant="ghost" size="icon" className="size-8 text-neutral-500 hover:text-red-600" onClick={() => confirmDelete(role)}>
                                                                <Trash2 className="size-4" />
                                                            </Button>
                                                        </ActionTooltip>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr key={role.id} className="hover:bg-neutral-50">
                                        <td className="p-3 font-medium text-neutral-900">{role.nome}</td>
                                        <td className="p-3 text-neutral-500">—</td>
                                        <td className="p-3 text-neutral-500">—</td>
                                        <td className="p-3 text-right">
                                            <div className="flex justify-end gap-1">
                                                <ActionTooltip label="Editar">
                                                    <Button variant="ghost" size="icon" className="size-8 text-neutral-500 hover:text-brand-600" onClick={() => handleEditRole(role)}>
                                                        <Pencil className="size-4" />
                                                    </Button>
                                                </ActionTooltip>
                                                <ActionTooltip label="Usuários">
                                                    <Button variant="ghost" size="icon" className="size-8 text-neutral-500 hover:text-brand-600" onClick={() => handleManageUsers(role)}>
                                                        <Users className="size-4" />
                                                    </Button>
                                                </ActionTooltip>
                                                <ActionTooltip label="Excluir">
                                                    <Button variant="ghost" size="icon" className="size-8 text-neutral-500 hover:text-red-600" onClick={() => confirmDelete(role)}>
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                </ActionTooltip>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            ))}
                            {filteredRoles.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-4 text-center text-neutral-500">Nenhum papel encontrado.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
                    <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-xl">
                        <Dialog.Title className="text-lg font-bold">
                            {editingRole ? "Editar Papel" : "Novo Papel"}
                        </Dialog.Title>
                        <div className="mt-4 space-y-4">
                            <div>
                                <label className="text-sm font-medium">Nome do Papel</label>
                                <input
                                    className="w-full rounded-md border p-2 text-sm"
                                    value={formData.nome || ""}
                                    onChange={e => setFormData({ ...formData, nome: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSave} disabled={saving}>
                                {saving ? <Loader2 className="size-4 animate-spin" /> : "Salvar"}
                            </Button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* Role Users Dialog */}
            {selectedRoleForUsers && (
                <RoleUsersDialog
                    role={selectedRoleForUsers}
                    users={users}
                    systems={systems}
                    userRoles={userRoles}
                    isOpen={isRoleUsersOpen}
                    onClose={() => setIsRoleUsersOpen(false)}
                    onRefresh={onRefresh}
                    supabase={supabase}
                />
            )}

            {/* Delete Confirmation Dialog */}
            <Dialog.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-40 bg-neutral-900/60 backdrop-blur-sm" />
                    <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(420px,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-100 bg-white p-6 shadow-card">
                        <div className="flex items-start justify-between">
                            <Dialog.Title className="text-lg font-semibold text-neutral-900">
                                Excluir papel
                            </Dialog.Title>
                            <Dialog.Close asChild>
                                <Button variant="ghost" size="icon" aria-label="Fechar">
                                    <X className="size-4" />
                                </Button>
                            </Dialog.Close>
                        </div>
                        <Dialog.Description className="mt-1 text-sm text-neutral-500">
                            Confirma a exclusão do papel?
                            <div className="mt-2 font-semibold text-neutral-800">
                                {pendingDelete?.nome}
                            </div>
                            <p className="mt-2">Essa ação não pode ser desfeita.</p>
                        </Dialog.Description>

                        <div className="mt-6 flex items-center justify-end gap-3">
                            <Dialog.Close asChild>
                                <Button type="button" variant="ghost">
                                    Cancelar
                                </Button>
                            </Dialog.Close>
                            <Button
                                variant="destructive"
                                onClick={handleDelete}
                            >
                                Excluir
                            </Button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </>
    );
}

// --- Role Users Dialog ---

function RoleUsersDialog({ role, users, systems, userRoles, isOpen, onClose, onRefresh, supabase }: any) {
    const [saving, setSaving] = useState(false);
    const [selectedSystemId, setSelectedSystemId] = useState<string>(systems[0]?.id ?? "");

    useEffect(() => {
        if (!selectedSystemId && systems[0]?.id) {
            setSelectedSystemId(systems[0].id);
        }
    }, [selectedSystemId, systems]);

    const currentRoleUsers = userRoles.filter(
        (ur: ZUserRole) => ur.papel_id === role.id && ur.sistema_id === selectedSystemId
    );
    const currentUserIds = new Set(currentRoleUsers.map((ur: ZUserRole) => ur.usuario_id));
    const systemName = systems.find((sys: ZSystem) => sys.id === selectedSystemId)?.nome || "Selecione um sistema";

    const handleToggleUser = async (userId: string, checked: boolean) => {
        setSaving(true);
        try {
            if (checked) {
                await supabase
                    .from("z_usuarios_papeis")
                    .insert({ usuario_id: userId, papel_id: role.id, sistema_id: selectedSystemId });
            } else {
                await supabase
                    .from("z_usuarios_papeis")
                    .delete()
                    .match({ usuario_id: userId, papel_id: role.id, sistema_id: selectedSystemId });
            }
            onRefresh();
        } catch (err: any) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const sortedUsers = [...users].sort((a: ZUser, b: ZUser) =>
        (a.nome_completo || "").localeCompare(b.nome_completo || "")
    );

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
                <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[80vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
                    <Dialog.Title className="mb-1 text-lg font-bold">
                        Usuários do papel {role.nome}
                    </Dialog.Title>
                    <Dialog.Description className="mb-4 text-sm text-neutral-500">
                        Gerencie os usuários vinculados ao papel no sistema {systemName}.
                    </Dialog.Description>

                    <div className="space-y-3">
                        <div className="grid gap-2">
                            <label className="text-xs font-semibold text-neutral-500">Sistema</label>
                            <select
                                className="w-full rounded-md border bg-white p-2 text-sm"
                                value={selectedSystemId}
                                onChange={(e) => setSelectedSystemId(e.target.value)}
                            >
                                <option value="" disabled>Selecione um sistema</option>
                                {systems.map((sys: ZSystem) => (
                                    <option key={sys.id} value={sys.id}>
                                        {sys.nome}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedSystemId ? (
                            <>
                                {sortedUsers.map((user: ZUser) => {
                                    const isChecked = currentUserIds.has(user.id);
                                    return (
                                        <label key={user.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-neutral-100 px-3 py-2 text-sm hover:bg-neutral-50">
                                            <div>
                                                <div className="font-medium text-neutral-900">{user.nome_completo || "Sem nome"}</div>
                                                <div className="text-neutral-500">{user.email}</div>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={(e) => handleToggleUser(user.id, e.target.checked)}
                                                disabled={saving}
                                                className="rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
                                            />
                                        </label>
                                    );
                                })}
                                {sortedUsers.length === 0 && (
                                    <p className="text-center text-neutral-500">Nenhum usuário cadastrado.</p>
                                )}
                            </>
                        ) : (
                            <p className="text-sm text-neutral-500">Selecione um sistema para gerenciar os usuários.</p>
                        )}
                    </div>

                    <div className="mt-6 flex justify-end">
                        <Button onClick={onClose}>Fechar</Button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

// Helper Component for Tooltips
function ActionTooltip({ label, children }: { label: string, children: React.ReactNode }) {
    return (
        <Tooltip.Provider delayDuration={150}>
            <Tooltip.Root>
                <Tooltip.Trigger asChild>
                    {children}
                </Tooltip.Trigger>
                <Tooltip.Portal>
                    <Tooltip.Content
                        side="top"
                        sideOffset={6}
                        className="z-50 rounded-md bg-white px-3 py-1 text-xs font-semibold text-neutral-900 shadow-lg"
                    >
                        {label}
                        <Tooltip.Arrow className="fill-white" />
                    </Tooltip.Content>
                </Tooltip.Portal>
            </Tooltip.Root>
        </Tooltip.Provider>
    );
}
