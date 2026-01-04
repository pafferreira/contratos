// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

type EmailFlow = "magic" | "reset";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("CORS_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const requiredEnv = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USERNAME",
  "SMTP_PASSWORD",
  "SMTP_FROM",
  "SITE_URL"
];

function missingEnv() {
  return requiredEnv.filter((key) => !Deno.env.get(key));
}

function normalizeRedirect(redirectTo: string | undefined, baseOrigin: string) {
  if (!redirectTo) return baseOrigin;
  try {
    const url = new URL(redirectTo, baseOrigin);
    if (url.origin !== baseOrigin) return baseOrigin;
    return url.toString();
  } catch {
    return baseOrigin;
  }
}

function buildTemplate(flow: EmailFlow, actionLink: string, appName: string) {
  const title =
    flow === "reset" ? "Redefinicao de senha" : "Acesso ao portal";
  const subject =
    flow === "reset"
      ? `${appName} - Redefinicao de senha`
      : `${appName} - Link de acesso`;
  const buttonLabel = flow === "reset" ? "Criar nova senha" : "Acessar portal";
  const intro =
    flow === "reset"
      ? "Recebemos sua solicitacao para redefinir a senha."
      : "Seu link de acesso seguro esta pronto.";

  const html = `
  <!doctype html>
  <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${title}</title>
      <style>
        body { margin: 0; background: #f6f8fa; font-family: Arial, Helvetica, sans-serif; }
        .wrapper { padding: 32px 16px; }
        .card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; padding: 28px; }
        .title { font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 8px; }
        .text { font-size: 14px; color: #4b5563; margin: 0 0 18px; line-height: 1.5; }
        .button { display: inline-block; background: #1f6feb; color: #ffffff; text-decoration: none; font-weight: 600; padding: 12px 18px; border-radius: 10px; }
        .footer { margin-top: 18px; font-size: 12px; color: #6b7280; }
        .link { color: #1f6feb; word-break: break-all; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="card">
          <p class="title">${title}</p>
          <p class="text">${intro}</p>
          <p class="text">Clique no botao abaixo para continuar.</p>
          <a class="button" href="${actionLink}">${buttonLabel}</a>
          <p class="footer">
            Se voce nao solicitou esta acao, ignore este email.
          </p>
          <p class="footer">
            Problemas com o botao? Copie e cole este link no navegador:<br />
            <span class="link">${actionLink}</span>
          </p>
        </div>
      </div>
    </body>
  </html>
  `.trim();

  const text = `${title}\n\n${intro}\n\nAcesse: ${actionLink}\n\nSe voce nao solicitou esta acao, ignore este email.`;

  return { subject, html, text };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const missing = missingEnv();
  if (missing.length) {
    return new Response(
      JSON.stringify({ error: `Missing env: ${missing.join(", ")}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { email, flow, redirectTo } = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ error: "Email obrigatorio." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const flowValue = (flow ?? "magic") as EmailFlow;
    if (flowValue !== "magic" && flowValue !== "reset") {
      return new Response(
        JSON.stringify({ error: "Fluxo invalido." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const siteUrl = Deno.env.get("SITE_URL")!;
    const appName = Deno.env.get("APP_NAME") ?? "Inventario de Contratos";
    const baseOrigin = new URL(siteUrl).origin;
    const finalRedirect = normalizeRedirect(redirectTo, baseOrigin);

        // Minimal local Database type so createClient can be typed in this edge function.
        // We keep a very small, permissive shape because this function only uses
        // the Auth admin API and doesn't interact with Postgres tables here.
        type Database = {
          public: {
            Tables: {
              [key: string]: {
                Row: Record<string, unknown>;
                Insert: Record<string, unknown>;
                Update: Record<string, unknown>;
              };
            };
          };
        };

        const supabase = createClient<Database>(supabaseUrl, serviceKey);
    const linkType = flowValue === "reset" ? "recovery" : "magiclink";
    const { data, error } = await supabase.auth.admin.generateLink({
      type: linkType,
      email,
      options: { redirectTo: finalRedirect }
    });

    if (error || !data?.properties?.action_link) {
      return new Response(
        JSON.stringify({ error: "Falha ao gerar o link." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { subject, html, text } = buildTemplate(
      flowValue,
      data.properties.action_link,
      appName
    );

    const client = new SMTPClient({
      connection: {
        hostname: Deno.env.get("SMTP_HOST")!,
        port: Number(Deno.env.get("SMTP_PORT")!),
        tls: Deno.env.get("SMTP_TLS") === "true",
        auth: {
          username: Deno.env.get("SMTP_USERNAME")!,
          password: Deno.env.get("SMTP_PASSWORD")!
        }
      }
    });

    const fromName = Deno.env.get("SMTP_FROM_NAME") ?? appName;
    const fromEmail = Deno.env.get("SMTP_FROM")!;

    await client.send({
      from: `${fromName} <${fromEmail}>`,
      to: email,
      subject,
      content: "text/html",
      html,
      text
    });

    await client.close();

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-auth-email error:", error);
    return new Response(
      JSON.stringify({ error: "Falha ao enviar email." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
