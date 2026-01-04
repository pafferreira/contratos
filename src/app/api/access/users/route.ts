import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type Payload = {
  id?: string;
  nome_completo?: string | null;
  email?: string;
  ativo?: boolean;
  senha_hash?: string | null;
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
  if (!payload.email) {
    return NextResponse.json({ error: "Email obrigatório." }, { status: 400 });
  }

  const normalizedEmail = payload.email.trim().toLowerCase();
  const data: {
    nome_completo: string | null;
    email: string;
    ativo: boolean;
    senha_hash?: string | null;
  } = {
    nome_completo: payload.nome_completo ?? null,
    email: normalizedEmail,
    ativo: payload.ativo ?? true
  };

  if (payload.senha_hash) {
    data.senha_hash = payload.senha_hash;
  }

  if (payload.id) {
    const { error: updateError } = await supabase
      .from("z_usuarios")
      .update(data)
      .eq("id", payload.id);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  } else {
    const { error: insertError } = await supabase.from("z_usuarios").insert(data);
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const { supabase, error } = getServerSupabase();
  if (!supabase || error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  const payload = (await request.json()) as { id?: string };
  if (!payload.id) {
    return NextResponse.json({ error: "Id obrigatório." }, { status: 400 });
  }

  const { error: deleteError } = await supabase.from("z_usuarios").delete().eq("id", payload.id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
