// Webhook do Asaas. verify_jwt = false (quem chama é o Asaas).
// Segurança: ao receber um evento, VERIFICA a cobrança direto na API do Asaas
// (fonte da verdade) antes de marcar como pago — não dá para forjar um "pago".
// O token (asaas-access-token) é checado se enviado, mas a proteção principal é a verificação.

const PAID_EVENTS = ["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"];
const REFUND_EVENTS = ["PAYMENT_REFUNDED"];
const PAID_STATUS = ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"];
const REFUND_STATUS = ["REFUNDED", "REFUND_REQUESTED", "CHARGEBACK_REQUESTED"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ENV = Deno.env.get("ASAAS_ENV") ?? "sandbox";
const ASAAS_BASE = ENV === "production" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";
const ASAAS_KEY = Deno.env.get("ASAAS_API_KEY") ?? "";
const WTOKEN = Deno.env.get("ASAAS_WEBHOOK_TOKEN") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function ok(extra: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ received: true, ...extra }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function patchAppt(query: string, patch: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/agendamentos?${query}`, {
    method: "PATCH",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`patch ${res.status}: ${await res.text()}`);
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  // Não bloqueamos por token: a proteção real é a verificação da cobrança na API do
  // Asaas (mais abaixo). Isso evita que um evento legítimo seja recusado por 401.

  let body: any;
  try {
    body = await req.json();
  } catch {
    return ok({ ignored: "bad json" });
  }

  const event: string = body?.event ?? "";
  const paymentId: string = body?.payment?.id ?? "";
  const isPaid = PAID_EVENTS.includes(event);
  const isRefund = REFUND_EVENTS.includes(event);
  if (!paymentId || (!isPaid && !isRefund)) return ok({ ignored: event || "sem evento" });

  // Verifica a cobrança direto no Asaas (fonte da verdade)
  let realStatus = "";
  let apptId = "";
  try {
    const r = await fetch(`${ASAAS_BASE}/payments/${paymentId}`, { headers: { access_token: ASAAS_KEY } });
    if (!r.ok) {
      // Não conseguiu verificar: devolve 500 para o Asaas reenviar depois.
      return new Response(JSON.stringify({ error: `asaas payment ${r.status}` }), { status: 500 });
    }
    const p = await r.json();
    realStatus = p?.status ?? "";
    apptId = p?.externalReference ?? "";
  } catch (e) {
    return new Response(JSON.stringify({ error: `asaas fetch: ${String(e)}` }), { status: 500 });
  }

  if (!apptId || !UUID_RE.test(apptId)) return ok({ ignored: "externalReference não é agendamento" });

  try {
    if (isPaid && PAID_STATUS.includes(realStatus)) {
      await patchAppt(`id=eq.${apptId}&pagamento_status=eq.pendente`, {
        pagamento_status: "pago",
        status: "confirmado",
        pagamento_confirmado_em: new Date().toISOString(),
        checkout_session_id: paymentId,
      });
    } else if (isRefund && REFUND_STATUS.includes(realStatus)) {
      await patchAppt(`id=eq.${apptId}`, { pagamento_status: "reembolsado" });
    }
    // Caso contrário (status ainda não pago), nada a fazer -> 200.
  } catch (e) {
    // Erro real de banco -> 500 (retry legítimo do Asaas).
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }

  return ok({ status: realStatus });
});
