import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AccessAdminClient } from "./access-admin-client";

export default async function AccessAdminPage() {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    redirect("/signin");
  }

  const {
    data: { user }
  } = (await supabase.auth.getUser()) ?? { data: { user: null } };

  if (!user) {
    redirect("/signin");
  }

  return <AccessAdminClient />;
}
