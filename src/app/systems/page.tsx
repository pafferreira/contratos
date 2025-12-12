import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SystemRow = {
  id: string;
  name: string;
  key: string | null;
  url: string;
};

type UserSystemProfile = {
  system_id: string;
  profile: string;
};

export default async function SystemsPage() {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    redirect("/signin?redirect=/systems");
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/signin?redirect=/systems");
  }

  const {
    data: userSystems,
    error: userSystemsError
  } = await supabase
    .from("usuarios_sistema_perfis")
    .select("system_id, profile")
    .eq("user_id", user.id);

  if (userSystemsError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-25 px-4">
        <div className="max-w-xl rounded-2xl border border-neutral-200 bg-white p-8 shadow-card">
          <h1 className="text-xl font-semibold text-neutral-800">Erro ao carregar sistemas</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Não foi possível buscar suas permissões. Tente novamente ou contate o administrador.
          </p>
        </div>
      </main>
    );
  }

  const systemIds = (userSystems ?? []).map((item) => item.system_id);

  if (systemIds.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-25 px-4">
        <div className="max-w-xl rounded-2xl border border-neutral-200 bg-white p-8 shadow-card">
          <h1 className="text-xl font-semibold text-neutral-800">Nenhum sistema disponível</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Sua conta ainda não tem acesso a sistemas. Solicite permissão ao administrador.
          </p>
        </div>
      </main>
    );
  }

  const { data: systems, error: systemsError } = await supabase
    .from("sistemas")
    .select("id, name, key, url")
    .in("id", systemIds);

  if (systemsError || !systems) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-25 px-4">
        <div className="max-w-xl rounded-2xl border border-neutral-200 bg-white p-8 shadow-card">
          <h1 className="text-xl font-semibold text-neutral-800">Erro ao carregar sistemas</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Não foi possível buscar a lista de sistemas. Tente novamente ou contate o administrador.
          </p>
        </div>
      </main>
    );
  }

  const systemsWithProfile = systems
    .map((system) => {
      const profile = (userSystems ?? []).find((entry) => entry.system_id === system.id)?.profile;
      return { ...system, profile: profile ?? "" };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  if (systemsWithProfile.length === 1) {
    redirect(systemsWithProfile[0].url || "/dashboard");
  }

  return (
    <main className="min-h-screen bg-neutral-25 px-4 py-12">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-800">Escolha um sistema</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Selecione um sistema para continuar. Você verá apenas os sistemas liberados para seu
            perfil.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {systemsWithProfile.map((system) => (
          <Link
            key={system.id}
            href={system.url}
            className="group rounded-2xl border border-neutral-200 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-lg"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-brand-600">
                  {system.key ?? "Sistema"}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-neutral-900">{system.name}</h2>
              </div>
                <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                  {system.profile || "Acesso"}
                </span>
              </div>
              <p className="mt-3 text-sm text-neutral-600">
                Acesse em{" "}
                <span className="font-medium text-neutral-800">{system.url || "—"}</span>
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
