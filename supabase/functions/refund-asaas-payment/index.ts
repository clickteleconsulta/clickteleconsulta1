// Estorna no Asaas o pagamento de um agendamento. verify_jwt = true.
// Autorização: o médico dono do agendamento OU um admin.
// Uso: quando o médico cancela um agendamento PAGO -> estorno integral (100%).
// Sem dependências externas (só fetch).

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ENV = Deno.env.get("ASAAS_ENV") ?? "sandbox";
const ASAAS_BASE = ENV === "production" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";
const ASAAS_KEY = Deno.env.get("ASAAS_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
async function asaas(path: string, method = "GET", payload?: unknown) {
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    method,
    headers: { access_token: ASAAS_KEY, "Content-Type": "application/json" },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
}
async function rest(path: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  return res.ok ? await res.json() : [];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { appointmentId } = await req.json();
    if (!appointmentId) return json({ error: "appointmentId obrigatório" }, 400);

    // Usuário
    const uRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: ANON_KEY, Authorization: req.headers.get("Authorization") ?? "" },
    });
    if (!uRes.ok) return json({ error: "Não autenticado" }, 401);
    const user = await uRes.json();
    if (!user?.id) return json({ error: "Não autenticado" }, 401);

    // Agendamento
    const appt = (await rest(
      `agendamentos?id=eq.${appointmentId}&select=id,medico_id,patient_id,pagamento_status,checkout_session_id,price_in_cents,refund_percent,cancelado_por`,
    ))?.[0];
    if (!appt) return json({ error: "Agendamento não encontrado" }, 404);

    // Autorização: médico dono ou admin
    const med = (await rest(`medicos?id=eq.${appt.medico_id}&select=user_id`))?.[0];
    const perfil = (await rest(`perfis_usuarios?id=eq.${user.id}&select=role`))?.[0];
    const isOwnerDoctor = med?.user_id === user.id;
    const isAdmin = perfil?.role === "admin";
    if (!isOwnerDoctor && !isAdmin) return json({ error: "Sem permissão" }, 403);

    // Aplicável? Só estorna pagamento efetivo e ainda não estornado
    if (appt.pagamento_status !== "pago" || !appt.checkout_session_id) {
      return json({ refunded: false, reason: "não há pagamento a estornar" });
    }

    const pay = await asaas(`/payments/${appt.checkout_session_id}`);
    const value = Number(pay?.data?.value || 0);
    const netValue = Number(pay?.data?.netValue || 0);
    if (!pay.ok || value <= 0) {
      return json({ refunded: false, error: "não foi possível consultar o valor da cobrança" });
    }

    // Valor devido = % da política (refund_percent). Nulo (ex.: cancelamento pelo médico) = 100%.
    const pct = appt.refund_percent != null ? Number(appt.refund_percent) : 100;
    let target = value * (pct / 100);

    // Cancelamento POR OPÇÃO DO PACIENTE retém a taxa de processamento; cancelamento pelo
    // Médico/Plataforma é integral (a Plataforma absorve a taxa).
    const byPatient = !!appt.cancelado_por && appt.cancelado_por === appt.patient_id;
    const fee = Math.max(0, value - netValue);
    if (byPatient) target = Math.max(0, target - fee);

    if (target <= 0) {
      return json({ refunded: false, error: "não há valor a estornar conforme a política de cancelamento." });
    }

    // Limitado ao saldo disponível para nunca falhar por saldo (devolve o máximo possível).
    const bal = await asaas("/finance/balance");
    const saldo = Number(bal?.data?.balance || 0);
    const refundValue = Number(Math.min(target, Math.floor(saldo * 100) / 100).toFixed(2));
    if (refundValue <= 0) {
      return json({ refunded: false, error: "saldo insuficiente na conta de pagamento no momento (fundos ainda em liberação)." });
    }

    const r = await asaas(`/payments/${appt.checkout_session_id}/refund`, "POST", {
      value: refundValue,
      description: "Estorno por cancelamento (taxa de processamento retida)",
    });
    if (!r.ok) {
      // Não concluído (ex.: saldo insuficiente). Devolve o motivo com HTTP 200 para o app
      // tratar como "estorno pendente" (não como falha do sistema).
      const motivo = r.data?.errors?.[0]?.description || `Asaas ${r.status}`;
      return json({ refunded: false, error: motivo });
    }

    // Estorno parcial não muda o status da cobrança no Asaas, então marcamos aqui.
    const pctReal = value > 0 ? Math.round((refundValue / value) * 100) : 100;
    await fetch(`${SUPABASE_URL}/rest/v1/agendamentos?id=eq.${appt.id}`, {
      method: "PATCH",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ pagamento_status: "reembolsado", refund_percent: pctReal }),
    });

    // Trilha de auditoria do estorno (agendamento_logs é imutável).
    await fetch(`${SUPABASE_URL}/rest/v1/agendamento_logs`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        agendamento_id: appt.id,
        acao: "estorno_processado",
        dados: { valor_estornado: refundValue, percentual: pctReal, retido_taxa: byPatient, asaas_payment_id: appt.checkout_session_id },
        usuario_id: user?.id ?? null,
      }),
    }).catch(() => {});

    return json({ refunded: true, refundValue });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
