import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      const missing = [
        !supabaseUrl ? "SUPABASE_URL" : null,
        !serviceRoleKey ? "SUPABASE_SERVICE_ROLE_KEY" : null
      ].filter(Boolean);
      return NextResponse.json(
        { error: `Supabase não configurado (${missing.join(", ")}).` },
        { status: 500 }
      );
    }

    const supabase = createClient<Database>(supabaseUrl, serviceRoleKey);

    const [usersRes, systemsRes, rolesRes, userRolesRes] = await Promise.all([
      supabase.from("z_usuarios").select("*").order("nome_completo"),
      supabase.from("z_sistemas").select("*").order("nome"),
      supabase.from("z_papeis").select("*").order("nome"),
      supabase.from("z_usuarios_papeis").select("*")
    ]);

    if (usersRes.error || systemsRes.error || rolesRes.error || userRolesRes.error) {
      return NextResponse.json(
        {
          error: "Falha ao carregar dados.",
          details: [
            usersRes.error?.message,
            systemsRes.error?.message,
            rolesRes.error?.message,
            userRolesRes.error?.message
          ].filter(Boolean)
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      users: usersRes.data ?? [],
      systems: systemsRes.data ?? [],
      roles: rolesRes.data ?? [],
      userRoles: userRolesRes.data ?? []
    });
  } catch (err) {
    console.error("Erro ao carregar dados de acesso:", err);
    const message = err instanceof Error ? err.message : "Erro inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
