import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SystemsPage() {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
    error: userError
  } = (await supabase?.auth.getUser()) ?? { data: { user: null }, error: null };

  const supabaseClient = supabase;
  if (!supabaseClient || userError || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-25 px-4">
        <div className="max-w-xl rounded-2xl border border-neutral-200 bg-white p-8 shadow-card text-center">
          <h1 className="text-xl font-semibold text-neutral-800">Acesso restrito</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Você precisa estar logado para acessar esta página.
          </p>
          <Link
            href="/signin"
            className="mt-6 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            Ir para Login
          </Link>
        </div>
      </main>
    );
  }

  const { data: userRoles, error: userRolesError } = await supabaseClient
    .from("z_usuarios_papeis")
    .select("papel_id, z_papeis ( id, nome, sistema_id )")
    .eq("usuario_id", user.id);

  if (userRolesError) {
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

  const systemProfiles = new Map<string, string[]>();

  (userRoles ?? []).forEach((entry: any) => {
    const role = entry.z_papeis as { sistema_id: string | null; nome: string | null } | null;
    if (!role?.sistema_id) {
      return;
    }

    const profiles = systemProfiles.get(role.sistema_id) ?? [];
    if (role.nome && !profiles.includes(role.nome)) {
      profiles.push(role.nome);
    }
    systemProfiles.set(role.sistema_id, profiles);
  });

  const systemIds = Array.from(systemProfiles.keys());

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

  const { data: systems, error: systemsError } = await supabaseClient
    .from("z_sistemas")
    .select("id, nome, descricao, ativo")
    .in("id", systemIds)
    .eq("ativo", true);

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

  const systemsWithProfile = (systems as Array<{ id: string; nome: string; descricao: string | null; ativo: boolean }>)
    .map((system) => {
      const profile = systemProfiles.get(system.id) ?? [];
      return { ...system, profile: profile.join(", ") };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome));

  if (systemsWithProfile.length === 1) {
    redirect(`/dashboard?sistema_id=${systemsWithProfile[0].id}`);
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
              href={`/dashboard?sistema_id=${system.id}`}
              className="group rounded-2xl border border-neutral-200 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-lg"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium uppercase tracking-wide text-brand-600">
                    Sistema
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-neutral-900">{system.nome}</h2>
                </div>
                <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                  {system.profile || "Acesso"}
                </span>
              </div>
              <p className="mt-3 text-sm text-neutral-600">
                {system.descricao || "Acesso liberado para este sistema."}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
