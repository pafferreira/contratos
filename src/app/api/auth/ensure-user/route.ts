import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { createHash, randomBytes } from "crypto";

export const runtime = "nodejs";

type Payload = {
  email?: string;
  password?: string;
};

type AuthUser = {
  user: {
    id: string;
    email?: string | null;
  };
};

const hashPasswordServer = (value: string) =>
  createHash("sha256").update(value).digest("hex");

const generateTemporaryPassword = () => {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const length = 10;
  const values = randomBytes(length);
  return Array.from(values, (value) => charset[value % charset.length]).join("");
};

export async function POST(request: Request) {
  try {
    const { email, password } = (await request.json()) as Payload;
    const normalizedEmail = email?.trim().toLowerCase() ?? "";

    if (!normalizedEmail) {
      return NextResponse.json({ error: "Credenciais inválidas." }, { status: 400 });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Configuração ausente: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY");
      return NextResponse.json(
        { error: "Erro de configuração no servidor." },
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
      console.error("Erro ao buscar usuário no banco:", userError);
      return NextResponse.json(
        { error: "Ocorreu um erro ao processar sua solicitação." },
        { status: 500 }
      );
    }

    // Mensagem genérica para evitar enumeração de usuários
    const invalidCredentialsResponse = () =>
      NextResponse.json({ error: "E-mail ou senha inválidos." }, { status: 401 });

    if (!userRecord || !userRecord.ativo) {
      return invalidCredentialsResponse();
    }

    let tempPassword: string | null = null;

    if (!userRecord.senha_hash) {
      tempPassword = generateTemporaryPassword();
      const { error: updateError } = await supabase
        .from("z_usuarios")
        .update({ senha_hash: hashPasswordServer(tempPassword) })
        .eq("id", userRecord.id);
      if (updateError) {
        return NextResponse.json({ error: "Falha ao processar credenciais." }, { status: 500 });
      }
    } else {
      if (!password) {
        return invalidCredentialsResponse();
      }

      const hashed = hashPasswordServer(password);
      const passwordMatches =
        userRecord.senha_hash === hashed || userRecord.senha_hash === password;

      if (!passwordMatches) {
        return invalidCredentialsResponse();
      }
    }

    const admin = supabase.auth.admin;
    let authUser: AuthUser | null = null;

    const getUserByEmail = (
      admin as typeof admin & {
        getUserByEmail?: (email: string) => Promise<{ data: AuthUser | null; error: unknown }>;
      }
    ).getUserByEmail;

    if (typeof getUserByEmail === "function") {
      const { data, error: authLookupError } = await getUserByEmail(normalizedEmail);
      if (authLookupError) {
        return NextResponse.json({ error: "Falha ao consultar autenticação." }, { status: 500 });
      }
      authUser = data ?? null;
    } else if (typeof admin.listUsers === "function") {
      const { data, error: authLookupError } = await admin.listUsers({
        page: 1,
        perPage: 1000
      });
      if (authLookupError) {
        return NextResponse.json({ error: "Falha ao consultar autenticação." }, { status: 500 });
      }
      const found = data?.users?.find(
        (user) => user.email?.toLowerCase() === normalizedEmail
      );
      authUser = found ? { user: found } : null;
    } else {
      return NextResponse.json(
        { error: "Admin do Supabase não disponível para validar usuário." },
        { status: 500 }
      );
    }

    const finalPassword = tempPassword ?? password!;
    if (authUser?.user) {
      const { error: updateError } = await admin.updateUserById(authUser.user.id, {
        password: finalPassword
      });

      if (updateError) {
        return NextResponse.json({ error: "Falha ao atualizar autenticação." }, { status: 500 });
      }
    } else {
      const { error: createError } = await admin.createUser({
        email: normalizedEmail,
        password: finalPassword,
        email_confirm: true
      });

      if (createError) {
        return NextResponse.json({ error: "Falha ao criar autenticação." }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, tempPassword });
  } catch (err) {
    console.error("Erro crítico na API ensure-user:", err);
    const message = err instanceof Error ? err.message : "Erro inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
