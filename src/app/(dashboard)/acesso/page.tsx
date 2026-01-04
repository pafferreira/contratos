import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AccessControlClient } from "./access-control-client";
import { redirect } from "next/navigation";

export default async function AccessControlPage() {
    const supabase = createSupabaseServerClient();
    if (!supabase) {
        redirect("/acesso-geral");
    }

    const {
        data: { user },
    } = (await supabase.auth.getUser()) ?? { data: { user: null } };

    if (!user) {
        redirect("/acesso-geral");
    }

    return <AccessControlClient />;
}
