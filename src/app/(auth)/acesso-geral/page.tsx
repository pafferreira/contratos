"use client";

import { useEffect, useMemo, useState } from "react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

type ZUser = Database["public"]["Tables"]["z_usuarios"]["Row"];

export default function AccessGeneralPage() {
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
      const response = await fetch("/api/auth/users");
      const payload = await response.json().catch(() => ({}));
      if (!isMounted) return;
      if (!response.ok) {
        console.error("Erro ao carregar usuários:", payload?.error);
        setMessage(payload?.error || "Não foi possível carregar os usuários.");
        setLoadingUsers(false);
        return;
      }
      setUsers(payload?.users ?? []);
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
    <main className="relative min-h-screen overflow-hidden bg-neutral-25 px-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 size-64 -translate-x-1/3 -translate-y-1/3 rounded-full bg-brand-100/80 blur-3xl" />
        <div className="absolute bottom-0 right-0 size-72 translate-x-1/3 translate-y-1/3 rounded-full bg-brand-200/60 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-8 py-12">
        <div className="flex items-start gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg">
            <ShieldCheck className="size-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-600">
              Controle de Acesso Geral
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-neutral-900">
              Portal seguro para todos os Sistemas
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              Selecione um usuário para entrar. A segurança será retomada em breve.
            </p>
          </div>
        </div>

        <Card className="space-y-6 border-neutral-100 bg-white/95 p-6 shadow-xl">
          <form className="space-y-4" onSubmit={handleSignIn}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700" htmlFor="user">
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
            <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3 text-xs text-neutral-600">
              {message}
            </div>
          ) : null}
        </Card>
      </div>
    </main>
  );
}
