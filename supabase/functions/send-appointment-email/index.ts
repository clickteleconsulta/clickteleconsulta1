// E-mail transacional ao paciente (via Resend). verify_jwt=false; protegida por header
// x-email-token = EMAIL_TOKEN. Chamada pelo gatilho do banco (pg_net) em transições:
// event ∈ 'confirmado' | 'cancelado' | 'reembolsado'. Só fetch nativo (sem imports remotos).

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const EMAIL_TOKEN = Deno.env.get("EMAIL_TOKEN") ?? "";
const FROM = Deno.env.get("INVITE_FROM") || "Click Teleconsulta <noreply@clickteleconsulta.online>";
const SITE = (Deno.env.get("SITE_URL") || "https://clickteleconsulta.online").replace(/\/$/, "");

const svc = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };

function json(b: unknown, s = 200) { return new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } }); }

const BRL = (v: number) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "long", timeStyle: "short" });
  } catch { return "—"; }
}
const esc = (s: unknown) => String(s ?? "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string));

function shell(title: string, accent: string, bodyHtml: string) {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f1f5f9;font-family:-apple-system,Segoe UI,Arial,sans-serif;color:#334155;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
      <div style="background:linear-gradient(90deg,#0ea5e9,#14b8a6);padding:22px 28px;">
        <div style="font-size:20px;font-weight:800;color:#fff;letter-spacing:-.3px;">Click Teleconsulta</div>
        <div style="font-size:12px;color:rgba(255,255,255,.85);margin-top:2px;">Marketplace de agendamento de consultas</div>
      </div>
      <div style="padding:28px;">
        <h1 style="margin:0 0 8px;font-size:19px;color:${accent};">${title}</h1>
        ${bodyHtml}
      </div>
      <div style="padding:16px 28px;background:#f8fafc;border-top:1px solid #eef2f6;font-size:11px;color:#94a3b8;line-height:1.5;">
        CLICK TELECONSULTA ONLINE LTDA · CNPJ 68.171.336/0001-50<br/>
        Somos um marketplace de agendamentos; a teleconsulta e o ato médico são de responsabilidade do profissional. Dúvidas: suporte@clickteleconsulta.online
      </div>
    </div>
  </div></body></html>`;
}

function rows(pairs: [string, string][]) {
  return `<table style="width:100%;border-collapse:collapse;font-size:14px;margin:14px 0;">${pairs
    .map(([k, v]) => `<tr><td style="padding:8px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">${k}</td><td style="padding:8px 0;text-align:right;font-weight:600;color:#1e293b;border-bottom:1px solid #f1f5f9;">${v}</td></tr>`)
    .join("")}</table>`;
}
function btn(href: string, label: string) {
  return `<div style="margin:18px 0 4px;"><a href="${href}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 20px;border-radius:10px;">${label}</a></div>`;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!EMAIL_TOKEN || req.headers.get("x-email-token") !== EMAIL_TOKEN) return json({ error: "unauthorized" }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ ignored: "bad json" }); }
  const apptId: string = body?.appointmentId ?? "";
  const event: string = body?.event ?? "";
  if (!apptId || !["confirmado", "cancelado", "reembolsado"].includes(event)) return json({ ignored: "params" });

  // Busca o agendamento + e-mail do paciente (registrado ou convidado) + médico
  const sel = "*,medicos(public_name,name,specialty,phone_number),perfis_usuarios!agendamentos_patient_perfis_fkey(full_name,email),guest_patients:guest_id(name,email)";
  const r = await fetch(`${SUPABASE_URL}/rest/v1/agendamentos?id=eq.${apptId}&select=${encodeURIComponent(sel)}`, { headers: svc });
  const a = (r.ok ? await r.json() : [])?.[0];
  if (!a) return json({ ignored: "appt not found" });

  const email = a.perfis_usuarios?.email || a.guest_patients?.email || "";
  if (!email) return json({ ignored: "sem e-mail" });
  const nome = (a.paciente_nome || a.perfis_usuarios?.full_name || a.guest_patients?.name || "").split(" ")[0] || "Olá";
  const medico = a.medicos?.public_name || a.medicos?.name || "profissional";
  const quando = fmtDateTime(a.horario_inicio || (a.appointment_date ? `${a.appointment_date}T${a.appointment_time || "00:00:00"}` : null));
  const valor = BRL((a.price_in_cents || 0) / 100);
  const protocolo = a.protocolo || "—";
  const linkConsultas = `${SITE}/paciente/dashboard/consultas`;

  let subject = "", html = "";
  if (event === "confirmado") {
    subject = "Pagamento confirmado — sua consulta está agendada";
    html = shell("Pagamento confirmado ✔", "#15803d",
      `<p style="margin:0 0 6px;font-size:15px;">Olá, ${esc(nome)}! O pagamento foi confirmado e a sua teleconsulta está <b>agendada</b>.</p>
       ${rows([["Profissional", esc(medico)], ["Especialidade", esc(a.medicos?.specialty || "Médico")], ["Data e hora", esc(quando)], ["Valor pago", valor], ["Protocolo", esc(protocolo)]])}
       <p style="font-size:13px;color:#475569;background:#eff6ff;border:1px solid #dbeafe;border-radius:10px;padding:12px;">O médico entrará em contato <b>até 15 minutos antes</b> do horário para conduzir o atendimento. Fique atento ao seu <b>WhatsApp</b> e <b>e-mail</b>.</p>
       ${btn(linkConsultas, "Ver minha consulta")}`);
  } else if (event === "cancelado") {
    subject = "Sua consulta foi cancelada";
    html = shell("Consulta cancelada", "#b91c1c",
      `<p style="margin:0 0 6px;font-size:15px;">Olá, ${esc(nome)}. A sua consulta foi <b>cancelada</b>.</p>
       ${rows([["Profissional", esc(medico)], ["Data e hora", esc(quando)], ["Protocolo", esc(protocolo)]])}
       <p style="font-size:13px;color:#475569;">Se houver reembolso devido conforme a Política de Cancelamento, ele será processado automaticamente e você receberá um aviso.</p>
       ${btn(linkConsultas, "Ver minhas consultas")}`);
  } else {
    const estornado = a.valor_estornado != null ? BRL(a.valor_estornado) : valor;
    subject = "Seu reembolso foi processado";
    html = shell("Reembolso processado", "#6d28d9",
      `<p style="margin:0 0 6px;font-size:15px;">Olá, ${esc(nome)}. O reembolso da sua consulta foi <b>processado</b>.</p>
       ${rows([["Profissional", esc(medico)], ["Protocolo", esc(protocolo)], ["Valor devolvido", `<span style="color:#6d28d9;">${estornado}</span>`]])}
       <p style="font-size:13px;color:#475569;">O prazo para o valor aparecer na sua fatura/conta depende da instituição de pagamento (em geral alguns dias úteis).</p>
       ${btn(linkConsultas, "Ver minhas consultas")}`);
  }

  const send = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: email, subject, html }),
  });
  const ok = send.ok;
  // Trilha de auditoria (best-effort)
  await fetch(`${SUPABASE_URL}/rest/v1/agendamento_logs`, {
    method: "POST", headers: { ...svc, Prefer: "return=minimal" },
    body: JSON.stringify({ agendamento_id: apptId, acao: "email_enviado", usuario_id: null, dados: { event, para: email, ok } }),
  }).catch(() => {});

  if (!ok) return json({ error: "resend", detail: await send.text().catch(() => "") }, 502);
  return json({ sent: true, event });
});
