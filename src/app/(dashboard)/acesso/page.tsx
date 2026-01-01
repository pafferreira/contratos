import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AccessControlClient } from "./access-control-client";
import { redirect } from "next/navigation";

export default async function AccessControlPage() {
    const supabase = createSupabaseServerClient();
    if (!supabase) {
        redirect("/signin");
    }

    const {
        data: { user },
    } = (await supabase.auth.getUser()) ?? { data: { user: null } };

    if (!user) {
        redirect("/signin");
    }

    return <AccessControlClient />;
}
