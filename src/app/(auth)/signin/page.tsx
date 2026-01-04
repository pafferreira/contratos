"use client";

import { useEffect, useMemo, useState } from "react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";

type ZUser = Database["public"]["Tables"]["z_usuarios"]["Row"];

export default function SignInPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = (searchParams.get("redirect") ?? "/acesso-geral") as Route;

  const [users, setUsers] = useState<ZUser[]>([]);
  const [email, setEmail] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadUsers = async () => {
      setLoadingUsers(true);
      if (!supabase) {
        setMessage("Supabase não configurado.");
        setLoadingUsers(false);
        return;
      }
      const { data, error } = await supabase
        .from("z_usuarios")
        .select("id, email, nome_completo, ativo")
        .eq("ativo", true)
        .order("nome_completo");
      if (!isMounted) return;
      if (error) {
        console.error("Erro ao carregar usuários:", error);
        setMessage("Não foi possível carregar os usuários.");
        setLoadingUsers(false);
        return;
      }
      setUsers(data ?? []);
      setLoadingUsers(false);
    };

    loadUsers();
    return () => {
      isMounted = false;
    };
  }, [supabase]);

  const selectedUser = useMemo(() => {
    if (!email) return null;
    return users.find((user) => user.email.toLowerCase() === email.trim().toLowerCase()) ?? null;
  }, [email, users]);

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setSubmitting(true);

    if (!selectedUser) {
      setMessage("Selecione um usuário válido.");
      setSubmitting(false);
      return;
    }

    sessionStorage.setItem("mock_user_email", selectedUser.email);
    router.push(redirectTo);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-25 px-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-100 bg-white p-8 shadow-card">
        <h1 className="text-2xl font-semibold text-neutral-800">
          Acessar Inventário de Contratos
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Selecione um usuário para entrar.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSignIn}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-600" htmlFor="user">
              Usuário
            </label>
            <input
              id="user"
              list="users"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 shadow-sm outline-none hocus:border-brand-500"
              placeholder={loadingUsers ? "Carregando usuários..." : "Selecione pelo e-mail"}
              disabled={loadingUsers}
              required
            />
            <datalist id="users">
              {users.map((user) => (
                <option
                  key={user.id}
                  value={user.email}
                >{`${user.nome_completo ?? "Usuário"} (${user.email})`}</option>
              ))}
            </datalist>
            {selectedUser ? (
              <p className="text-xs text-neutral-500">
                {selectedUser.nome_completo ?? selectedUser.email}
              </p>
            ) : null}
          </div>

          <Button type="submit" className="w-full" disabled={submitting || loadingUsers}>
            {submitting ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        {message ? (
          <p className="mt-4 text-sm text-neutral-600" role="status">
            {message}
          </p>
        ) : null}
      </div>
    </main>
  );
}
