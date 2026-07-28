// Cria a cobrança no Asaas (Pix + cartão via página hospedada) para um agendamento.
// verify_jwt = true (exige usuário logado). Sem dependências externas (só fetch).

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ASAAS_ENV = Deno.env.get("ASAAS_ENV") ?? "sandbox";
const ASAAS_BASE = ASAAS_ENV === "production"
  ? "https://api.asaas.com/v3"
  : "https://api-sandbox.asaas.com/v3";
const ASAAS_KEY = Deno.env.get("ASAAS_API_KEY") ?? "";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function asaas(path: string, method = "GET", payload?: unknown) {
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    method,
    headers: { access_token: ASAAS_KEY, "Content-Type": "application/json" },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Asaas ${method} ${path} -> ${res.status}: ${JSON.stringify(data)}`);
  return data;
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
    if (!ASAAS_KEY) return json({ error: "ASAAS_API_KEY não configurada" }, 500);

    const { appointmentId, origin } = await req.json();
    if (!appointmentId) return json({ error: "appointmentId obrigatório" }, 400);

    // Identifica o usuário pelo JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const uRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: ANON_KEY, Authorization: authHeader },
    });
    if (!uRes.ok) return json({ error: "Não autenticado" }, 401);
    const user = await uRes.json();
    if (!user?.id) return json({ error: "Não autenticado" }, 401);

    // Agendamento = fonte da verdade do preço
    const appts = await rest(
      `agendamentos?id=eq.${appointmentId}&select=id,patient_id,medico_id,price_in_cents,pagamento_status,appointment_date,appointment_time`,
    );
    const appt = appts?.[0];
    if (!appt) return json({ error: "Agendamento não encontrado" }, 404);
    if (appt.patient_id !== user.id) return json({ error: "Agendamento não pertence ao usuário" }, 403);
    if (appt.pagamento_status === "pago") return json({ error: "Agendamento já está pago" }, 409);
    if (!appt.price_in_cents || appt.price_in_cents <= 0) return json({ error: "Valor inválido" }, 400);

    // Dados do paciente e do médico
    const perfil = (await rest(`perfis_usuarios?id=eq.${user.id}&select=full_name,cpf,whatsapp,email`))?.[0] ?? {};
    const med = (await rest(`medicos?id=eq.${appt.medico_id}&select=public_name,name`))?.[0] ?? {};
    const cpf = String(perfil.cpf ?? "").replace(/\D/g, "");
    const phone = String(perfil.whatsapp ?? "").replace(/\D/g, "");
    const name = perfil.full_name || user.email || "Paciente";
    const email = perfil.email || user.email;
    const medicoNome = med.public_name || med.name || "Médico";

    // 1) Encontra ou cria o cliente no Asaas (por CPF)
    let customerId: string | null = null;
    if (cpf) {
      const found = await asaas(`/customers?cpfCnpj=${cpf}`);
      if (found?.data?.length) customerId = found.data[0].id;
    }
    if (!customerId) {
      const created = await asaas("/customers", "POST", {
        name,
        email,
        cpfCnpj: cpf || undefined,
        mobilePhone: phone || undefined,
        externalReference: user.id,
      });
      customerId = created.id;
    }

    // 2) Cria a cobrança (Pix + cartão via página hospedada do Asaas)
    const value = Number((appt.price_in_cents / 100).toFixed(2));
    const today = new Date().toISOString().slice(0, 10);
    const back = String(origin || "https://clickteleconsulta.online").replace(/\/+$/, "");
    const hora = String(appt.appointment_time ?? "").slice(0, 5);
    const payment = await asaas("/payments", "POST", {
      customer: customerId,
      billingType: "UNDEFINED",
      value,
      dueDate: today,
      description: `Teleconsulta com ${medicoNome} · ${appt.appointment_date} ${hora}`,
      externalReference: appt.id,
      callback: {
        successUrl: `${back}/agendamento/confirmado?appointmentId=${appt.id}&paid=1`,
        autoRedirect: true,
      },
    });

    // 3) Guarda o id da cobrança no agendamento
    await fetch(`${SUPABASE_URL}/rest/v1/agendamentos?id=eq.${appt.id}`, {
      method: "PATCH",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ checkout_session_id: payment.id, pagamento_iniciado_em: new Date().toISOString() }),
    });

    const url = payment.invoiceUrl || payment.bankSlipUrl;
    if (!url) return json({ error: "Asaas não retornou URL de pagamento" }, 502);
    return json({ url, paymentId: payment.id });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
