import type { Database } from "@/lib/supabase/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UsersAdminClient } from "./users-admin-client";

type SystemRow = {
  id: string;
  name: string;
  key?: string | null;
  url?: string | null;
};

export default async function UsersPage() {
  const supabase = createSupabaseServerClient();

  // Acesso liberado para validação: assume admin sempre.
  const isAdmin = true;
  let userId = "anonymous";
  let systems: SystemRow[] = [];

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      userId = user.id;
    }

    const { data: systemsData } = await supabase
      .from("sistemas")
      .select("id, name, key, url")
      .order("name", { ascending: true });

    systems = systemsData ?? [];
  }

  return (
    <UsersAdminClient
      isAdmin={isAdmin}
      systems={systems}
      currentUserId={userId}
    />
  );
}
