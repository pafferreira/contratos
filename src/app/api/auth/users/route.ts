import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export async function GET() {
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
  const { data, error } = await supabase
    .from("z_usuarios")
    .select("id, email, nome_completo, ativo")
    .eq("ativo", true)
    .order("nome_completo");

  if (error) {
    return NextResponse.json({ error: "Falha ao carregar usuários." }, { status: 500 });
  }

  return NextResponse.json({ users: data ?? [] });
}
