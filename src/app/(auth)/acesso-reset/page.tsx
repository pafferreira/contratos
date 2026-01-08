"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { hashPassword } from "@/lib/password";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Lock, ShieldCheck } from "lucide-react";

type ZUser = Database["public"]["Tables"]["z_usuarios"]["Row"];
type ZUserUpdate = Database["public"]["Tables"]["z_usuarios"]["Update"];

export default function AccessResetPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ZUser | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!supabase) {
        setError("Supabase não configurado. Contate o administrador.");
        setLoading(false);
        return;
      }

      const { data } = await supabase.auth.getUser();
      const email = data.user?.email ?? "";

      if (!email) {
        setError("Link inválido ou expirado. Solicite um novo link.");
        setLoading(false);
        return;
      }

      const { data: userProfileData, error: profileError } = await supabase
        .from("z_usuarios")
        .select("id, email, nome_completo, ativo")
        .eq("email", email)
        .maybeSingle();

      const userProfile = userProfileData as ZUser | null;

      if (profileError || !userProfile) {
        setError("Usuário não encontrado. Contate o administrador.");
        setLoading(false);
        return;
      }
      if (!userProfile.ativo) {
        setError("Usuário inativo. Contate o administrador.");
        setLoading(false);
        return;
      }

      setProfile(userProfile);
      setLoading(false);
    };

    loadProfile();
  }, [supabase]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!profile) {
      setError("Usuário inválido para redefinição.");
      return;
    }

    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }

    if (!supabase) {
      setError("Supabase não configurado. Contate o administrador.");
      return;
    }

    setSaving(true);
    try {
      const { error: authError } = await supabase.auth.updateUser({ password });
      if (authError) throw authError;

      const hashed = await hashPassword(password);
      const payload: ZUserUpdate = { senha_hash: hashed };
      const { error: updateError } = await supabase
        .from("z_usuarios")
        .update(payload)
        .eq("id", profile.id);

      if (updateError) throw updateError;

      await supabase.auth.signOut();
      setSuccess("Senha atualizada com sucesso. Faça login novamente.");
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error("Erro ao redefinir senha:", err);
      setError("Não foi possível redefinir a senha. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-25 px-4">
      <Card className="w-full max-w-md space-y-4 p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-brand-600 text-white">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-neutral-900">Redefinir senha</h1>
            <p className="text-sm text-neutral-500">
              Crie uma nova senha para continuar acessando os sistemas.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <Loader2 className="size-4 animate-spin" />
            Verificando link...
          </div>
        ) : null}

        {profile ? (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
              {profile.nome_completo ? profile.nome_completo + " - " : ""}
              {profile.email}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700" htmlFor="password">
                Nova senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-3 text-sm text-neutral-800 outline-none hover:border-brand-500 focus:border-brand-500"
                  placeholder="Digite a nova senha"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700" htmlFor="confirm">
                Confirmar senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                <input
                  id="confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-3 text-sm text-neutral-800 outline-none hover:border-brand-500 focus:border-brand-500"
                  placeholder="Confirme a nova senha"
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Atualizar senha"
              )}
            </Button>
          </form>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-sm text-green-700">
            {success}
          </div>
        ) : null}

        <Button asChild variant="outline" className="w-full">
          <Link href="/acesso-geral">Voltar para o acesso</Link>
        </Button>
      </Card>
    </main>
  );
}
