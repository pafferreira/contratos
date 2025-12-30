"use client";

import { useState } from "react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function SignInPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/systems";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    if (!supabase) {
      setMessage("Configuração do Supabase ausente. Contate o administrador.");
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) {
      setMessage("Usuário ou senha inválidos. Tente novamente.");
      setLoading(false);
      return;
    }
    router.push(redirectTo as Route);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-25 px-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-100 bg-white p-8 shadow-card">
        <h1 className="text-2xl font-semibold text-neutral-800">
          Acessar Inventário de Contratos
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Informe seu e-mail corporativo para receber o link de acesso seguro.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSignIn}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-600" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 shadow-sm outline-none hocus:border-brand-500"
              placeholder="usuario@empresa.com.br"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-600" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 shadow-sm outline-none hocus:border-brand-500"
              placeholder="••••••••"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
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
