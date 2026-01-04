import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { createHash } from "crypto";

type Payload = {
  email?: string;
  password?: string;
};

const hashPasswordServer = (value: string) =>
  createHash("sha256").update(value).digest("hex");

export async function POST(request: Request) {
  const { email, password } = (await request.json()) as Payload;
  const normalizedEmail = email?.trim().toLowerCase() ?? "";

  if (!normalizedEmail || !password) {
    return NextResponse.json({ error: "Credenciais inválidas." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  }

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey);

  const { data: userRecord, error: userError } = await supabase
    .from("z_usuarios")
    .select("id, email, senha_hash, ativo")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (userError || !userRecord || !userRecord.ativo) {
    return NextResponse.json({ error: "Usuário inválido." }, { status: 401 });
  }

  const hashed = hashPasswordServer(password);
  const passwordMatches =
    userRecord.senha_hash === hashed || userRecord.senha_hash === password;

  if (!passwordMatches) {
    return NextResponse.json({ error: "Senha inválida." }, { status: 401 });
  }

  const { data: authUser, error: authLookupError } =
    await supabase.auth.admin.getUserByEmail(normalizedEmail);

  if (authLookupError) {
    return NextResponse.json({ error: "Falha ao consultar autenticação." }, { status: 500 });
  }

  if (authUser?.user) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      authUser.user.id,
      { password }
    );

    if (updateError) {
      return NextResponse.json({ error: "Falha ao atualizar autenticação." }, { status: 500 });
    }
  } else {
    const { error: createError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true
    });

    if (createError) {
      return NextResponse.json({ error: "Falha ao criar autenticação." }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
