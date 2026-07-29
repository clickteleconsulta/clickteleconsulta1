// Reconciliação com o Asaas. verify_jwt = false; protegida por header x-reconcile-token.
// Chamada pelo pg_cron (net.http_post) a cada 15 min. Pega pagamentos que o webhook
// possa ter perdido: confirma pagos e reflete estornos. Só fetch nativo (sem imports).

const ASAAS_ENV = Deno.env.get("ASAAS_ENV") ?? "sandbox";
const ASAAS_BASE = ASAAS_ENV === "production" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";
const ASAAS_KEY = Deno.env.get("ASAAS_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RECONCILE_TOKEN = Deno.env.get("RECONCILE_TOKEN") ?? "";

const PAID_STATUS = ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"];
const REFUND_STATUS = ["REFUNDED", "REFUND_REQUESTED", "CHARGEBACK_REQUESTED"];

const svc = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
async function restGet(query: string) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, { headers: svc });
  return r.ok ? await r.json() : [];
}
async function patchAppt(query: string, patch: Record<string, unknown>) {
  await fetch(`${SUPABASE_URL}/rest/v1/agendamentos?${query}`, {
    method: "PATCH", headers: { ...svc, Prefer: "return=minimal" }, body: JSON.stringify(patch),
  }).catch(() => {});
}
async function logAppt(id: string, acao: string, dados: unknown) {
  await fetch(`${SUPABASE_URL}/rest/v1/agendamento_logs`, {
    method: "POST", headers: { ...svc, Prefer: "return=minimal" },
    body: JSON.stringify({ agendamento_id: id, acao, dados, usuario_id: null }),
  }).catch(() => {});
}
async function asaasGet(path: string) {
  const r = await fetch(`${ASAAS_BASE}${path}`, { headers: { access_token: ASAAS_KEY } });
  return r.ok ? await r.json() : null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const token = req.headers.get("x-reconcile-token") ?? "";
  if (!RECONCILE_TOKEN || token !== RECONCILE_TOKEN) return json({ error: "unauthorized" }, 401);

  const summary = { checked: 0, confirmed: 0, refunded: 0, errors: 0 };

  // Candidatos: têm cobrança no Asaas e ainda não estão pagos/estornados. Últimos 5 dias.
  const since = new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString();
  const rows = await restGet(
    `agendamentos?checkout_session_id=not.is.null&pagamento_status=in.(pendente)&created_at=gte.${since}` +
    `&select=id,medico_id,horario_inicio,pagamento_status,checkout_session_id,status&limit=200`,
  );
  if (!Array.isArray(rows)) return json({ error: "query falhou" }, 500);

  for (const a of rows) {
    summary.checked++;
    try {
      const p = await asaasGet(`/payments/${a.checkout_session_id}`);
      if (!p?.status) continue;

      if (PAID_STATUS.includes(p.status)) {
        // Confirma o pagamento, com a mesma trava anti-duplo-agendamento do webhook.
        if (a.medico_id && a.horario_inicio) {
          const hi = encodeURIComponent(a.horario_inicio);
          const conflicts = await restGet(
            `agendamentos?medico_id=eq.${a.medico_id}&horario_inicio=eq.${hi}&pagamento_status=eq.pago` +
            `&status=not.in.(cancelado,expirado)&id=not.eq.${a.id}&select=id`,
          );
          if (Array.isArray(conflicts) && conflicts.length > 0) {
            const rf = await fetch(`${ASAAS_BASE}/payments/${a.checkout_session_id}/refund`, {
              method: "POST", headers: { access_token: ASAAS_KEY, "Content-Type": "application/json" },
              body: JSON.stringify({ description: "Estorno automático — horário já indisponível" }),
            });
            await patchAppt(`id=eq.${a.id}`, {
              status: "cancelado",
              pagamento_status: rf.ok ? "reembolsado" : "pago",
              refund_percent: 100,
              cancelado_em: new Date().toISOString(),
              valor_estornado: rf.ok ? Number(p.value || 0) : null,
              estornado_em: rf.ok ? new Date().toISOString() : null,
            });
            await logAppt(a.id, "estorno_horario_indisponivel", { asaas_payment_id: a.checkout_session_id, via: "reconcile", estornado: rf.ok });
            continue;
          }
        }
        await patchAppt(`id=eq.${a.id}&pagamento_status=eq.pendente`, {
          pagamento_status: "pago",
          status: "confirmado",
          pagamento_confirmado_em: new Date().toISOString(),
        });
        await logAppt(a.id, "pagamento_confirmado", { asaas_payment_id: a.checkout_session_id, status: p.status, via: "reconcile" });
        summary.confirmed++;
      } else if (REFUND_STATUS.includes(p.status)) {
        await patchAppt(`id=eq.${a.id}`, { pagamento_status: "reembolsado", estornado_em: new Date().toISOString() });
        await logAppt(a.id, "estorno_reconciliado", { asaas_payment_id: a.checkout_session_id, status: p.status, via: "reconcile" });
        summary.refunded++;
      }
    } catch (_e) {
      summary.errors++;
    }
  }

  return json({ ok: true, ...summary });
});
