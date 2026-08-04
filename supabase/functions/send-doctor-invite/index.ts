// Supabase Edge Function: send-doctor-invite
// Cria/reusa o convite (com token) e envia o e-mail (via Resend) com o LINK DE TOKEN
// para a página privada onde o médico cria a própria conta. NÃO cria a conta antecipadamente.
// Precisa apenas de { email } no corpo (origin é opcional). Secret: RESEND_API_KEY.

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
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#334155;">
  <div style="max-width:560px;margin:0 auto;padding:28px 14px;">
    <div style="background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:linear-gradient(135deg,#28385C 0%,#3B5BA5 100%);padding:26px 28px;">
        <h1 style="color:#ffffff;margin:0;font-size:20px;">avi<span style="color:#3DDC97">Doc</span></h1>
        <p style="color:#C9D6EE;margin:6px 0 0;font-size:13px;">Convite para médico parceiro</p>
      </div>
      <div style="padding:28px;font-size:15px;line-height:1.65;">
        <p>Olá,</p>
        <p>É com satisfação que convidamos você a integrar o corpo clínico da <strong>aviDoc</strong>, um marketplace de agendamentos que conecta pacientes a médicos parceiros. Fazemos apenas a intermediação do agendamento e do pagamento; a teleconsulta e o ato médico são de responsabilidade exclusiva do profissional.</p>
        <p>Ao aceitar o convite e criar sua conta de <strong>médico parceiro</strong>, você poderá:</p>
        <ul style="padding-left:18px;margin:12px 0;color:#475569;">
          <li>Receber agendamentos de pacientes de todo o Brasil e atendê-los pelos seus próprios meios;</li>
          <li>Gerenciar sua agenda e seus horários de disponibilidade;</li>
          <li>Acompanhar suas consultas e o histórico de pagamentos;</li>
          <li>Receber os repasses das consultas realizadas com transparência.</li>
        </ul>
        <p>Para criar sua conta e concluir seu cadastro profissional, clique no botão abaixo:</p>
        <div style="text-align:center;margin:26px 0;">
          <a href="${link}" style="background:#3B5BA5;color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:9px;font-weight:bold;font-size:15px;display:inline-block;">Criar minha conta de médico</a>
        </div>
        <p style="font-size:12px;color:#64748b;">Se o botão não funcionar, copie e cole este link no navegador:</p>
        <p style="font-size:12px;color:#3B5BA5;word-break:break-all;">${link}</p>
        <p style="font-size:13px;color:#64748b;">Por segurança, este convite é pessoal e válido apenas para o e-mail que o recebeu. Somente profissionais convidados pela administração conseguem abrir uma conta de médico.</p>
        <p style="margin-top:22px;">Seja bem-vindo(a)!<br><strong>Equipe aviDoc</strong></p>
      </div>
      <div style="padding:16px 28px;border-top:1px solid #e2e8f0;background:#f8fafc;">
        <p style="margin:0;font-size:11px;color:#94a3b8;">Este é um e-mail automático da plataforma aviDoc. Se você não reconhece esta solicitação, ignore esta mensagem.</p>
      </div>
    </div>
  </div></body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Confirma que o chamador é admin
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Não autenticado" }, 401);
    const { data: perfil } = await userClient
      .from("perfis_usuarios").select("role").eq("id", user.id).maybeSingle();
    if (perfil?.role !== "admin") return json({ error: "Acesso negado" }, 403);

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email ?? "").trim().toLowerCase();
    if (!email) return json({ error: "E-mail obrigatório" }, 400);

    // Base para o link (aceita origin, deriva de redirectTo, ou usa padrão)
    let base = String(body?.origin ?? "").trim();
    if (!base && body?.redirectTo) base = String(body.redirectTo).replace(/\/cadastro-medico.*$/, "");
    if (!base) base = Deno.env.get("SITE_URL") || "https://avidoc.com.br";
    base = base.replace(/\/+$/, "");

    const admin = createClient(url, service);

    // Cria ou reaproveita um convite ativo (com token)
    let token: string | null = null;
    const { data: existing } = await admin
      .from("convites_medico").select("token")
      .eq("email", email).in("status", ["pendente", "enviado"]).maybeSingle();
    if (existing?.token) {
      token = existing.token;
    } else {
      const { data: created, error: insErr } = await admin
        .from("convites_medico").insert({ email, invited_by: user.id, status: "pendente" })
        .select("token").single();
      if (insErr) return json({ error: "Falha ao registrar convite: " + insErr.message }, 500);
      token = created.token;
    }

    const link = `${base}/cadastro-medico/${token}`;

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY não configurada", link }, 500);
    const FROM = Deno.env.get("INVITE_FROM") || "aviDoc <noreply@avidoc.com.br>";

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        subject: "Convite para ser médico parceiro — aviDoc",
        html: buildHtml(link),
      }),
    });
    const result = await resp.json().catch(() => ({}));
    if (!resp.ok) return json({ error: result?.message || "Falha no envio do e-mail", link }, 502);

    await admin.from("convites_medico").update({ status: "enviado" }).eq("email", email).eq("status", "pendente");

    return json({ ok: true, id: result?.id ?? null });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
