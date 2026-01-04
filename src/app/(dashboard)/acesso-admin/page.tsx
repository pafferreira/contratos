import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AccessAdminClient } from "./access-admin-client";

export default async function AccessAdminPage() {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    redirect("/acesso-geral");
  }

  const {
    data: { user }
  } = (await supabase.auth.getUser()) ?? { data: { user: null } };

  if (!user) {
    redirect("/acesso-geral");
  }

  return <AccessAdminClient />;
}
