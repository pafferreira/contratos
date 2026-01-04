import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type Payload = {
  action?: "add" | "remove";
  usuario_id?: string;
  papel_id?: string;
  sistema_id?: string;
};

function getServerSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    const missing = [
      !supabaseUrl ? "SUPABASE_URL" : null,
      !serviceRoleKey ? "SUPABASE_SERVICE_ROLE_KEY" : null
    ].filter(Boolean);
    return { error: `Supabase não configurado (${missing.join(", ")}).` };
  }

  return { supabase: createClient<Database>(supabaseUrl, serviceRoleKey) };
}

export async function POST(request: Request) {
  const { supabase, error } = getServerSupabase();
  if (!supabase || error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  const payload = (await request.json()) as Payload;
  const { action, usuario_id, papel_id, sistema_id } = payload;

  if (!action || !usuario_id || !papel_id || !sistema_id) {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  if (action === "add") {
    const { error: insertError } = await supabase
      .from("z_usuarios_papeis")
      .insert({ usuario_id, papel_id, sistema_id });
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  } else {
    const { error: deleteError } = await supabase
      .from("z_usuarios_papeis")
      .delete()
      .match({ usuario_id, papel_id, sistema_id });
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
