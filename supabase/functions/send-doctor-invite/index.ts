// Supabase Edge Function: send-doctor-invite
// Envia o e-mail de convite (via Resend — mesmo provedor já usado no SMTP do projeto)
// com o LINK DE TOKEN para a página privada onde o médico cria a própria conta.
// NÃO cria a conta antecipadamente.
// Secret necessário: RESEND_API_KEY (a mesma chave do Resend do projeto).
// Opcional: INVITE_FROM (padrão: "Click Teleconsulta <noreply@clickteleconsulta.online>")

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
      <div style="background:linear-gradient(135deg,#0a2540 0%,#2563eb 100%);padding:26px 28px;">
        <h1 style="color:#ffffff;margin:0;font-size:20px;">Click Teleconsulta</h1>
        <p style="color:#cbd5e1;margin:6px 0 0;font-size:13px;">Convite para médico parceiro</p>
      </div>
      <div style="padding:28px;font-size:15px;line-height:1.65;">
        <p>Olá,</p>
        <p>É com satisfação que convidamos você a fazer parte do corpo clínico da <strong>Click Teleconsulta</strong>, nossa plataforma de teleconsultas que conecta pacientes a profissionais de saúde de forma simples, segura e humanizada.</p>
        <p>Ao aceitar o convite e criar sua conta de <strong>médico parceiro</strong>, você poderá:</p>
        <ul style="padding-left:18px;margin:12px 0;color:#475569;">
          <li>Realizar atendimentos por telemedicina, de onde estiver;</li>
          <li>Gerenciar sua agenda e seus horários de disponibilidade;</li>
          <li>Acompanhar suas consultas e o histórico de pagamentos;</li>
          <li>Receber os repasses das consultas realizadas com transparência.</li>
        </ul>
        <p>Para criar sua conta e concluir seu cadastro profissional, clique no botão abaixo:</p>
        <div style="text-align:center;margin:26px 0;">
          <a href="${link}" style="background:#2563eb;color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:9px;font-weight:bold;font-size:15px;display:inline-block;">Criar minha conta de médico</a>
        </div>
        <p style="font-size:12px;color:#64748b;">Se o botão não funcionar, copie e cole este link no navegador:</p>
        <p style="font-size:12px;color:#2563eb;word-break:break-all;">${link}</p>
        <p style="font-size:13px;color:#64748b;">Por segurança, este convite é pessoal e válido apenas para o e-mail que o recebeu. Somente profissionais convidados pela administração conseguem abrir uma conta de médico.</p>
        <p style="margin-top:22px;">Seja bem-vindo(a)!<br><strong>Equipe Click Teleconsulta</strong></p>
      </div>
      <div style="padding:16px 28px;border-top:1px solid #e2e8f0;background:#f8fafc;">
        <p style="margin:0;font-size:11px;color:#94a3b8;">Este é um e-mail automático da plataforma Click Teleconsulta. Se você não reconhece esta solicitação, ignore esta mensagem.</p>
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

    // Confirma que o chamador é admin
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Não autenticado" }, 401);
    const { data: perfil } = await userClient
      .from("perfis_usuarios").select("role").eq("id", user.id).maybeSingle();
    if (perfil?.role !== "admin") return json({ error: "Acesso negado" }, 403);

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email ?? "").trim().toLowerCase();
    const link = String(body?.link ?? "");
    if (!email || !link) return json({ error: "Dados incompletos (email/link)" }, 400);

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY não configurada" }, 500);
    const FROM = Deno.env.get("INVITE_FROM") || "Click Teleconsulta <noreply@clickteleconsulta.online>";

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
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
