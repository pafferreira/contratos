"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { hashPassword } from "@/lib/password";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Chrome,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck
} from "lucide-react";

type ZSystem = Database["public"]["Tables"]["z_sistemas"]["Row"];
type ZUser = Database["public"]["Tables"]["z_usuarios"]["Row"];

type SystemWithProfile = ZSystem & { profile: string };

const REDIRECT_PATH = "/acesso-geral";

export default function AccessGeneralPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [authUser, setAuthUser] = useState<ZUser | null>(null);
  const [systems, setSystems] = useState<SystemWithProfile[]>([]);
  const [systemsLoading, setSystemsLoading] = useState(false);

  const passwordScore = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password) || /[^a-zA-Z0-9]/.test(password)) score += 1;
    return score;
  }, [password]);

  const passwordLabel = useMemo(() => {
    if (password.length === 0) return "Digite a senha para validar.";
    if (passwordScore <= 1) return "Senha fraca";
    if (passwordScore === 2) return "Senha boa";
    return "Senha forte";
  }, [passwordScore, password.length]);

  const loadSession = useCallback(async () => {
    if (!supabase) {
      setMessage("Supabase não configurado. Contate o administrador.");
      return;
    }

    const { data } = await supabase.auth.getUser();
    if (data?.user?.email) {
      const { data: profile } = await supabase
        .from("z_usuarios")
        .select("id, email, nome_completo, ativo, senha_hash, criado_em, atualizado_em")
        .eq("email", data.user.email)
        .maybeSingle();

      if (!profile?.ativo) {
        setMessage("Conta sem autorização. Solicite liberação ao administrador.");
        await supabase.auth.signOut();
        setAuthUser(null);
        setSystems([]);
        return;
      }

      setAuthUser(profile);
    } else {
      setAuthUser(null);
      setSystems([]);
    }
  }, [supabase]);

  const loadSystems = useCallback(async () => {
    if (!supabase || !authUser?.id) return;
    setSystemsLoading(true);
    try {
      const { data: userRoles, error: userRolesError } = await supabase
        .from("z_usuarios_papeis")
        .select("papel_id, z_papeis ( id, nome, sistema_id )")
        .eq("usuario_id", authUser.id);

      if (userRolesError) throw userRolesError;

      const systemProfiles = new Map<string, string[]>();

      (userRoles ?? []).forEach((entry: any) => {
        const role = entry.z_papeis as { sistema_id: string | null; nome: string | null } | null;
        if (!role?.sistema_id) return;
        const profiles = systemProfiles.get(role.sistema_id) ?? [];
        if (role.nome && !profiles.includes(role.nome)) {
          profiles.push(role.nome);
        }
        systemProfiles.set(role.sistema_id, profiles);
      });

      const systemIds = Array.from(systemProfiles.keys());
      if (systemIds.length === 0) {
        setSystems([]);
        return;
      }

      const { data: systemsData, error: systemsError } = await supabase
        .from("z_sistemas")
        .select("id, nome, descricao, ativo, criado_em, atualizado_em")
        .in("id", systemIds)
        .eq("ativo", true);

      if (systemsError) throw systemsError;

      const systemsWithProfile = (systemsData ?? [])
        .map((system) => ({
          ...system,
          profile: (systemProfiles.get(system.id) ?? []).join(", ")
        }))
        .sort((a, b) => a.nome.localeCompare(b.nome));

      setSystems(systemsWithProfile);
    } catch (error) {
      console.error("Erro ao carregar módulos:", error);
      setMessage("Erro ao carregar módulos. Tente novamente.");
    } finally {
      setSystemsLoading(false);
    }
  }, [authUser?.id, supabase]);

  useEffect(() => {
    if (!supabase) return;
    loadSession();
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) {
        loadSession();
      } else {
        setAuthUser(null);
        setSystems([]);
      }
    });
    return () => {
      subscription.subscription.unsubscribe();
    };
  }, [loadSession, supabase]);

  useEffect(() => {
    if (authUser?.id) {
      loadSystems();
    }
  }, [authUser?.id, loadSystems]);

  const handlePasswordLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setLoading(true);

    if (!supabase) {
      setMessage("Supabase não configurado. Contate o administrador.");
      setLoading(false);
      return;
    }

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { data: userRecord, error } = await supabase
        .from("z_usuarios")
        .select("id, email, nome_completo, ativo, senha_hash, criado_em, atualizado_em")
        .ilike("email", normalizedEmail)
        .maybeSingle();

      if (error) throw error;
      if (!userRecord) {
        setMessage("Usuário não encontrado. Solicite acesso.");
        return;
      }
      if (!userRecord.ativo) {
        setMessage("Usuário inativo. Contate o administrador.");
        return;
      }
      if (!userRecord.senha_hash) {
        setMessage("Senha não cadastrada. Use o magic link para acessar.");
        return;
      }

      const hashed = await hashPassword(password);
      if (hashed !== userRecord.senha_hash) {
        setMessage("Senha inválida.");
        return;
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password
      });
      if (authError) throw authError;

      setMessage("Login autorizado. Carregando módulos...");
      setPassword("");
    } catch (error) {
      console.error("Erro ao autenticar:", error);
      setMessage("Erro ao autenticar. Verifique os dados e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!supabase) {
      setMessage("Supabase não configurado. Contate o administrador.");
      return;
    }
    if (!email) {
      setMessage("Informe o e-mail para enviar o magic link.");
      return;
    }
    setMagicLoading(true);
    setMessage(null);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { error } = await supabase.functions.invoke("send-auth-email", {
        body: {
          email: normalizedEmail,
          flow: "magic",
          redirectTo: `${window.location.origin}/auth/callback?next=${REDIRECT_PATH}`
        }
      });
      if (error) throw error;
      setMessage("Magic link enviado. Verifique sua caixa de entrada.");
    } catch (error) {
      console.error("Erro no magic link:", error);
      setMessage("Não foi possível enviar o magic link. Tente novamente.");
    } finally {
      setMagicLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!supabase) {
      setMessage("Supabase não configurado. Contate o administrador.");
      return;
    }
    if (!email) {
      setMessage("Informe o e-mail para enviar o link de redefinição.");
      return;
    }
    setResetLoading(true);
    setMessage(null);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { error } = await supabase.functions.invoke("send-auth-email", {
        body: {
          email: normalizedEmail,
          flow: "reset",
          redirectTo: `${window.location.origin}/auth/callback?next=/acesso-reset`
        }
      });
      if (error) throw error;
      setMessage("Link de redefinição enviado. Verifique sua caixa de entrada.");
    } catch (error) {
      console.error("Erro ao enviar link de redefinição:", error);
      setMessage("Não foi possível enviar o link de redefinição. Tente novamente.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!supabase) {
      setMessage("Supabase não configurado. Contate o administrador.");
      return;
    }
    setGoogleLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${REDIRECT_PATH}`
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error("Erro ao autenticar com Google:", error);
      setMessage("Não foi possível autenticar com Google. Tente novamente.");
      setGoogleLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    setSignOutLoading(true);
    await supabase.auth.signOut();
    setAuthUser(null);
    setSystems([]);
    setSignOutLoading(false);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-neutral-25">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 size-64 -translate-x-1/3 -translate-y-1/3 rounded-full bg-brand-100/80 blur-3xl" />
        <div className="absolute bottom-0 right-0 size-72 translate-x-1/3 translate-y-1/3 rounded-full bg-brand-200/60 blur-3xl" />
      </div>

      <div className="relative mx-auto grid w-full max-w-6xl gap-8 px-6 py-12 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6">
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
                Acesse sistemas com validação por senha, magic link ou Google. Perfis e permissões
                são aplicados automaticamente.
              </p>
            </div>
          </div>

          <Card className="relative space-y-6 overflow-hidden border-neutral-100 bg-white/95 p-6 shadow-xl">
            <div className="absolute right-4 top-4 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              Acesso confiável
            </div>
            {authUser ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-brand-100 bg-brand-50 p-4">
                  <p className="text-sm font-semibold text-brand-700">Sessão ativa</p>
                  <p className="mt-1 text-sm text-neutral-700">{authUser.nome_completo ?? authUser.email}</p>
                  <p className="text-xs text-neutral-500">{authUser.email}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={handleSignOut} disabled={signOutLoading}>
                    {signOutLoading ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Encerrando...
                      </>
                    ) : (
                      "Sair"
                    )}
                  </Button>
                  <Button variant="outline" onClick={loadSystems} disabled={systemsLoading}>
                    {systemsLoading ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Atualizando
                      </>
                    ) : (
                      "Atualizar módulos"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handlePasswordLogin}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700" htmlFor="email">
                    E-mail corporativo
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-3 text-sm text-neutral-800 shadow-sm outline-none transition hocus:border-brand-500"
                      placeholder="usuario@empresa.com.br"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700" htmlFor="password">
                    Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="w-full rounded-lg border border-neutral-200 bg-white px-10 py-2 text-sm text-neutral-800 shadow-sm outline-none transition hocus:border-brand-500"
                      placeholder="Digite sua senha"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-neutral-400 transition hover:text-neutral-600"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <div className="flex flex-1 gap-1">
                      {[0, 1, 2].map((index) => (
                        <span
                          key={index}
                          className={cn(
                            "h-1 flex-1 rounded-full",
                            index < passwordScore
                              ? passwordScore === 1
                                ? "bg-warning"
                                : passwordScore === 2
                                  ? "bg-brand-500"
                                  : "bg-success"
                              : "bg-neutral-100"
                          )}
                        />
                      ))}
                    </div>
                    <span>{passwordLabel}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={resetLoading}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-brand-600 transition hover:text-brand-700 disabled:cursor-not-allowed disabled:text-brand-400"
                  >
                    {resetLoading ? (
                      <>
                        <Loader2 className="size-3 animate-spin" />
                        Enviando link...
                      </>
                    ) : (
                      "Esqueci minha senha"
                    )}
                  </button>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Validando...
                    </>
                  ) : (
                    "Entrar com senha"
                  )}
                </Button>

                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-neutral-100" />
                  <span className="text-xs font-semibold text-neutral-400">ou</span>
                  <span className="h-px flex-1 bg-neutral-100" />
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleMagicLink}
                    disabled={magicLoading}
                    className="justify-center"
                  >
                    {magicLoading ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Enviando
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 size-4" />
                        Magic link
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleGoogleLogin}
                    disabled={googleLoading}
                    className="justify-center"
                  >
                    {googleLoading ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Redirecionando
                      </>
                    ) : (
                      <>
                        <Chrome className="mr-2 size-4" />
                        Continuar com Google
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}

            {message ? (
              <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3 text-xs text-neutral-600">
                {message}
              </div>
            ) : null}
          </Card>
        </section>

        <section className="space-y-6">
          <Card className="space-y-4 border-neutral-100 bg-white/95 p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">Módulos disponíveis</h2>
                <p className="text-sm text-neutral-500">
                  Acesso baseado nos seus papéis atribuídos.
                </p>
              </div>
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
                {systems.length} módulo(s)
              </span>
            </div>

            {systemsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-20 animate-pulse rounded-xl border border-neutral-100 bg-neutral-50"
                  />
                ))}
              </div>
            ) : systems.length > 0 ? (
              <div className="space-y-3">
                {systems.map((system) => (
                  <div
                    key={system.id}
                    className="flex flex-col gap-4 rounded-xl border border-neutral-100 bg-white p-4 transition hover:border-brand-200 hover:shadow-md"
                  >
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                        Sistema liberado
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-neutral-900">{system.nome}</h3>
                      <p className="mt-1 text-sm text-neutral-500">
                        {system.descricao || "Acesso liberado para este módulo."}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                        {system.profile || "Acesso padrão"}
                      </span>
                      <Button asChild size="sm" className="gap-2">
                        <Link href={`/dashboard?sistema_id=${system.id}`}>
                          Acessar módulo
                          <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center">
                <p className="text-sm font-semibold text-neutral-700">
                  Faça login para ver seus módulos disponíveis.
                </p>
                <p className="mt-2 text-xs text-neutral-500">
                  Você verá apenas os sistemas liberados para seu perfil.
                </p>
              </div>
            )}
          </Card>
          <Card className="border-neutral-100 bg-white/90 p-5 text-sm text-neutral-600">
            <p className="font-semibold text-neutral-700">Segurança & compliance</p>
            <p className="mt-2">
              O acesso é validado por e-mail corporativo e papéis cadastrados. Dúvidas ou solicitações
              de acesso devem ser encaminhadas para o administrador.
            </p>
          </Card>
        </section>
      </div>
    </main>
  );
}
