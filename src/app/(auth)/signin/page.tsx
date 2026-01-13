"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

type ZUser = Database["public"]["Tables"]["z_usuarios"]["Row"];

function SignInContent() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = (searchParams.get("redirect") ?? "/dashboard") as Route;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setSubmitting(true);

    if (!supabase) {
      setMessage("Supabase não configurado. Contate o administrador.");
      setSubmitting(false);
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setMessage("Informe seu e-mail.");
      setSubmitting(false);
      return;
    }

    if (!password) {
      setMessage("Informe sua senha.");
      setSubmitting(false);
      return;
    }

    try {
      const ensureResponse = await fetch("/api/auth/ensure-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, password })
      });
      const ensurePayload = await ensureResponse.json().catch(() => ({}));

      if (!ensureResponse.ok) {
        setMessage(ensurePayload?.error || "Não foi possível validar o usuário.");
        setSubmitting(false);
        return;
      }

      const finalPassword = ensurePayload?.tempPassword || password;
      const nextRoute = ensurePayload?.tempPassword ? "/acesso-reset" : redirectTo;
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: finalPassword
      });

      if (authError) {
        setMessage("E-mail ou senha inválidos.");
        setSubmitting(false);
        return;
      }

      router.push(nextRoute);
    } catch (err) {
      console.error("Erro ao autenticar:", err);
      setMessage("Não foi possível autenticar. Tente novamente.");
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    setMessage(null);
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setMessage("Digite seu e-mail acima para solicitar a recuperação.");
      return;
    }

    if (!supabase) return;

    setResetting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/acesso-reset`,
      });

      if (error) {
        setMessage("Erro ao enviar e-mail de recuperação.");
      } else {
        setMessage("E-mail de recuperação enviado! Verifique sua caixa de entrada.");
      }
    } catch (err) {
      setMessage("Erro inesperado ao solicitar recuperação.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-25 px-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-100 bg-white p-8 shadow-card">
        <h1 className="text-2xl font-semibold text-neutral-800">
          Acessar Inventário de Contratos
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Informe suas credenciais para entrar.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSignIn}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-600" htmlFor="user">
              E-mail
            </label>
            <input
              id="user"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 shadow-sm outline-none hocus:border-brand-500"
              placeholder="Digite seu e-mail"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-600" htmlFor="password">
              Senha
            </label>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 pl-10 text-sm text-neutral-800 shadow-sm outline-none hocus:border-brand-500"
                placeholder="Digite sua senha"
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Entrando..." : "Entrar"}
          </Button>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[10px] font-medium text-neutral-400">
              v1.3.6
            </span>
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={resetting}
              className="text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50"
            >
              {resetting ? "Enviando..." : "Esqueci minha senha"}
            </button>
          </div>
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

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-neutral-25 px-4">
          <p className="text-sm text-neutral-500">Carregando...</p>
        </main>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
