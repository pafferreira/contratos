import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export const runtime = "nodejs";

type Payload = {
  id?: string;
  nome?: string;
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
  try {
    const { supabase, error } = getServerSupabase();
    if (!supabase || error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    const payload = (await request.json()) as Payload;
    const nome = payload.nome?.trim();
    if (!nome) {
      return NextResponse.json({ error: "Nome obrigatório." }, { status: 400 });
    }

    if (payload.id) {
      const { error: updateError } = await supabase
        .from("z_papeis")
        .update({ nome })
        .eq("id", payload.id);
      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    } else {
      const { error: insertError } = await supabase.from("z_papeis").insert({ nome });
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erro ao salvar papel:", err);
    const message = err instanceof Error ? err.message : "Erro inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { supabase, error } = getServerSupabase();
    if (!supabase || error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    const payload = (await request.json()) as { id?: string };
    if (!payload.id) {
      return NextResponse.json({ error: "Id obrigatório." }, { status: 400 });
    }

    const { error: deleteError } = await supabase.from("z_papeis").delete().eq("id", payload.id);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erro ao excluir papel:", err);
    const message = err instanceof Error ? err.message : "Erro inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
