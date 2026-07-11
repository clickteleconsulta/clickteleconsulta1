// Supabase Edge Function: send-doctor-invite
// Envia o e-mail de convite para o médico (via Resend).
// Secrets necessários:  RESEND_API_KEY  (obrigatório)
//                       INVITE_FROM     (opcional, ex: "Click Teleconsulta <no-reply@clickteleconsulta.online>")
// SUPABASE_URL e SUPABASE_ANON_KEY são injetados automaticamente pelo runtime.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildHtml(link: string) {
  return `<!doctype html>
  <html lang="pt-BR"><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:520px;margin:0 auto;padding:32px 16px;">
      <div style="background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
        <div style="background:linear-gradient(135deg,#0a2540 0%,#2563eb 100%);padding:28px 24px;">
          <h1 style="color:#ffffff;margin:0;font-size:20px;">Click Teleconsulta</h1>
          <p style="color:#cbd5e1;margin:6px 0 0;font-size:13px;">Convite para médico parceiro</p>
        </div>
        <div style="padding:28px 24px;color:#334155;font-size:15px;line-height:1.6;">
          <p>Olá,</p>
          <p>Você foi convidado(a) para se tornar um <strong>médico parceiro</strong> da Click Teleconsulta. Para criar sua conta e começar a atender, clique no botão abaixo:</p>
          <div style="text-align:center;margin:28px 0;">
            <a href="${link}" style="background:#2563eb;color:#ffffff;text-decoration:none;padding:13px 26px;border-radius:9px;font-weight:bold;font-size:15px;display:inline-block;">Criar minha conta</a>
          </div>
          <p style="font-size:13px;color:#64748b;">Ou copie e cole este link no navegador:</p>
          <p style="font-size:12px;color:#2563eb;word-break:break-all;">${link}</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
          <p style="font-size:12px;color:#94a3b8;">Se você não esperava este convite, pode ignorar este e-mail. Somente e-mails convidados conseguem criar uma conta de médico.</p>
        </div>
      </div>
    </div>
  </body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Identifica o chamador pelo JWT e confirma que é admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Não autenticado" }, 401);

    const { data: perfil } = await userClient
      .from("perfis_usuarios")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (perfil?.role !== "admin") return json({ error: "Acesso negado" }, 403);

    const { email, link } = await req.json();
    if (!email || !link) return json({ error: "Dados incompletos (email/link)" }, 400);

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY não configurada" }, 500);
    const FROM = Deno.env.get("INVITE_FROM") || "Click Teleconsulta <onboarding@resend.dev>";

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        subject: "Convite para ser médico parceiro — Click Teleconsulta",
        html: buildHtml(link),
      }),
    });

    const result = await resp.json().catch(() => ({}));
    if (!resp.ok) return json({ error: result?.message || "Falha no envio do e-mail" }, 502);

    return json({ ok: true, id: result?.id ?? null });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
