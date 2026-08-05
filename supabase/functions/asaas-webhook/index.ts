// Webhook do Asaas. verify_jwt = false (quem chama é o Asaas).
// Segurança: VERIFICA a cobrança direto na API do Asaas antes de agir (à prova de forja).
// Trava anti-duplo-agendamento: se o horário já estiver pago por outro agendamento,
// estorna este pagamento e cancela este agendamento (não é culpa do paciente).

const PAID_EVENTS = ["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"];
const REFUND_EVENTS = ["PAYMENT_REFUNDED"];
const PAID_STATUS = ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"];
const REFUND_STATUS = ["REFUNDED", "REFUND_REQUESTED", "CHARGEBACK_REQUESTED"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ENV = Deno.env.get("ASAAS_ENV") ?? "sandbox";
const ASAAS_BASE = ENV === "production" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";
const ASAAS_KEY = Deno.env.get("ASAAS_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const svcHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

function ok(extra: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ received: true, ...extra }), { status: 200, headers: { "Content-Type": "application/json" } });
}
async function restGet(query: string) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, { headers: svcHeaders });
  return r.ok ? await r.json() : [];
}
// Devolve QUANTAS linhas mudaram. Não é curiosidade: os PATCH daqui são
// condicionais (`pagamento_status=eq.pendente`), então "mudou 1 linha" é a
// prova de que ESTA execução fez a transição, e não uma reentrega do webhook
// pelo Asaas. É nisso que o aviso ao médico se apoia para sair uma vez só.
async function patchAppt(query: string, patch: Record<string, unknown>): Promise<number> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/agendamentos?${query}`, {
    method: "PATCH", headers: { ...svcHeaders, Prefer: "return=representation" }, body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error(`patch ${r.status}: ${await r.text()}`);
  const linhas = await r.json().catch(() => []);
  return Array.isArray(linhas) ? linhas.length : 0;
}

// Avisa o médico por WhatsApp. Best-effort de verdade: o `catch` vazio é
// deliberado, porque o webhook do Asaas NÃO pode falhar por causa do aviso — se
// respondermos erro, o Asaas reenvia o evento e o risco vira pagamento
// processado duas vezes. Aviso perdido é ruim; cobrança bagunçada é pior.
async function avisarMedico(apptId: string) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/notify-doctor-new-appointment`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ appointmentId: apptId }),
    });
  } catch (_) { /* ver comentário acima */ }
}
async function logAppt(id: string, acao: string, dados: unknown) {
  await fetch(`${SUPABASE_URL}/rest/v1/agendamento_logs`, {
    method: "POST", headers: { ...svcHeaders, Prefer: "return=minimal" },
    body: JSON.stringify({ agendamento_id: id, acao, dados, usuario_id: null }),
  }).catch(() => {});
}
async function asaasRefund(paymentId: string) {
  const r = await fetch(`${ASAAS_BASE}/payments/${paymentId}/refund`, {
    method: "POST", headers: { access_token: ASAAS_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ description: "Estorno automático — horário já indisponível" }),
  });
  return { ok: r.ok };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let body: any;
  try { body = await req.json(); } catch { return ok({ ignored: "bad json" }); }

  const event: string = body?.event ?? "";
  const paymentId: string = body?.payment?.id ?? "";
  const isPaid = PAID_EVENTS.includes(event);
  const isRefund = REFUND_EVENTS.includes(event);
  if (!paymentId || (!isPaid && !isRefund)) return ok({ ignored: event || "sem evento" });

  // Verifica a cobrança direto no Asaas (fonte da verdade)
  let realStatus = "";
  let apptId = "";
  // Valor que o Asaas realmente creditou, já descontada a taxa dele. É o que
  // existe para repassar — o valor pago pelo paciente nunca chega inteiro na
  // conta, e sem guardar isto a contabilidade do painel não fecha com o extrato.
  let liquidoCentavos: number | null = null;
  try {
    const r = await fetch(`${ASAAS_BASE}/payments/${paymentId}`, { headers: { access_token: ASAAS_KEY } });
    if (!r.ok) return new Response(JSON.stringify({ error: `asaas payment ${r.status}` }), { status: 500 });
    const p = await r.json();
    realStatus = p?.status ?? "";
    apptId = p?.externalReference ?? "";
    const net = Number(p?.netValue);
    if (Number.isFinite(net) && net > 0) liquidoCentavos = Math.round(net * 100);
  } catch (e) {
    return new Response(JSON.stringify({ error: `asaas fetch: ${String(e)}` }), { status: 500 });
  }

  if (!apptId || !UUID_RE.test(apptId)) return ok({ ignored: "externalReference não é agendamento" });

  try {
    if (isPaid && PAID_STATUS.includes(realStatus)) {
      const a = (await restGet(`agendamentos?id=eq.${apptId}&select=medico_id,horario_inicio,pagamento_status`))?.[0];
      if (a && a.pagamento_status === "pago") return ok({ status: realStatus, already: true });

      // Trava anti-duplo-agendamento: outro agendamento PAGO no mesmo médico+horário?
      if (a && a.medico_id && a.horario_inicio) {
        const hi = encodeURIComponent(a.horario_inicio);
        const conflicts = await restGet(
          `agendamentos?medico_id=eq.${a.medico_id}&horario_inicio=eq.${hi}&pagamento_status=eq.pago&status=not.in.(cancelado,expirado)&id=not.eq.${apptId}&select=id`,
        );
        if (Array.isArray(conflicts) && conflicts.length > 0) {
          // Horário já ocupado: estorna este pagamento e cancela este agendamento.
          const rf = await asaasRefund(paymentId);
          await patchAppt(`id=eq.${apptId}`, {
            status: "cancelado",
            pagamento_status: rf.ok ? "reembolsado" : "pago",
            refund_percent: 100,
            cancelado_em: new Date().toISOString(),
            checkout_session_id: paymentId,
            valor_estornado: rf.ok ? Number(body?.payment?.value || 0) || null : null,
            estornado_em: rf.ok ? new Date().toISOString() : null,
          });
          await logAppt(apptId, "estorno_horario_indisponivel", { asaas_payment_id: paymentId, estornado: rf.ok });
          return ok({ status: realStatus, doubleBooking: true, refunded: rf.ok });
        }
      }

      const confirmou = await patchAppt(`id=eq.${apptId}&pagamento_status=eq.pendente`, {
        pagamento_status: "pago",
        status: "confirmado",
        pagamento_confirmado_em: new Date().toISOString(),
        checkout_session_id: paymentId,
        valor_liquido_centavos: liquidoCentavos,
      });
      await logAppt(apptId, "pagamento_confirmado", {
        asaas_payment_id: paymentId,
        status: realStatus,
        liquido_centavos: liquidoCentavos,
      });

      // Só na transição de verdade. O Asaas reenvia o mesmo evento quando não
      // recebe 200 na primeira tentativa, e o PATCH condicional acima é o que
      // separa "acabou de ser pago" de "já estava pago".
      if (confirmou > 0) await avisarMedico(apptId);
    } else if (isRefund && REFUND_STATUS.includes(realStatus)) {
      await patchAppt(`id=eq.${apptId}`, { pagamento_status: "reembolsado", estornado_em: new Date().toISOString() });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }

  return ok({ status: realStatus });
});
