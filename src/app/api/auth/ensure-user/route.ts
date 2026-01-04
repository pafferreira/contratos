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

const generateTemporaryPassword = () => {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const length = 10;
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => charset[value % charset.length]).join("");
};

export async function POST(request: Request) {
  const { email, password } = (await request.json()) as Payload;
  const normalizedEmail = email?.trim().toLowerCase() ?? "";

  if (!normalizedEmail) {
    return NextResponse.json({ error: "Credenciais inválidas." }, { status: 400 });
  }

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

  const { data: userRecord, error: userError } = await supabase
    .from("z_usuarios")
    .select("id, email, senha_hash, ativo")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (userError) {
    return NextResponse.json({ error: "Falha ao buscar usuário." }, { status: 500 });
  }

  if (!userRecord) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 401 });
  }

  if (!userRecord.ativo) {
    return NextResponse.json({ error: "Usuário inativo." }, { status: 403 });
  }

  let tempPassword: string | null = null;

  if (!userRecord.senha_hash) {
    tempPassword = generateTemporaryPassword();
    const { error: updateError } = await supabase
      .from("z_usuarios")
      .update({ senha_hash: hashPasswordServer(tempPassword) })
      .eq("id", userRecord.id);
    if (updateError) {
      return NextResponse.json({ error: "Falha ao gerar senha." }, { status: 500 });
    }
  } else {
    if (!password) {
      return NextResponse.json({ error: "Senha inválida." }, { status: 401 });
    }

    const hashed = hashPasswordServer(password);
    const passwordMatches =
      userRecord.senha_hash === hashed || userRecord.senha_hash === password;

    if (!passwordMatches) {
      return NextResponse.json({ error: "Senha inválida." }, { status: 401 });
    }
  }

  const { data: authUser, error: authLookupError } =
    await supabase.auth.admin.getUserByEmail(normalizedEmail);

  if (authLookupError) {
    return NextResponse.json({ error: "Falha ao consultar autenticação." }, { status: 500 });
  }

  const finalPassword = tempPassword ?? password!;
  if (authUser?.user) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      authUser.user.id,
      { password: finalPassword }
    );

    if (updateError) {
      return NextResponse.json({ error: "Falha ao atualizar autenticação." }, { status: 500 });
    }
  } else {
    const { error: createError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password: finalPassword,
      email_confirm: true
    });

    if (createError) {
      return NextResponse.json({ error: "Falha ao criar autenticação." }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, tempPassword });
}
