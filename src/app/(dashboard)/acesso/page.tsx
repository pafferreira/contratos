import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AccessControlClient } from "./access-control-client";
import { redirect } from "next/navigation";

export default async function AccessControlPage() {
    const supabase = createSupabaseServerClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    return <AccessControlClient />;
}
