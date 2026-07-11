// Supabase Edge Function: notify-doctor-new-appointment
// ESQUELETO (ainda não envia de verdade). Objetivo: quando o pagamento de um
// agendamento é confirmado, enviar uma notificação de WhatsApp ao MÉDICO, a partir
// de um número "bot" da plataforma, com os dados do agendamento.
//
// Fluxo previsto:
//   1) Pagamento confirmado -> chamar esta função com { appointmentId }.
//      (pode ser chamada pelo cliente após o verify-stripe-payment, ou por um
//       Database Webhook/trigger no UPDATE de agendamentos quando pagamento_status='pago')
//   2) Esta função busca os dados do agendamento (data, hora, protocolo, paciente)
//      e o WhatsApp do médico, monta a mensagem e envia pelo provedor escolhido.
//
// PARA ATIVAR (quando decidir o provedor): implemente `sendWhatsApp()` abaixo e
// configure os secrets correspondentes (ex.: Z-API, Meta Cloud API, Twilio, Evolution).

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// Apenas dígitos, com DDI Brasil (55) se não houver.
function normalizePhone(raw: string): string {
  let d = (raw || "").replace(/\D/g, "");
  if (!d) return "";
  if (!d.startsWith("55")) d = "55" + d;
  return d;
}

// ─────────────────────────────────────────────────────────────────────────────
// PONTO DE ENVIO — trocar pela integração do provedor escolhido.
// Hoje: apenas "esquematizado" (retorna sent:false se não configurado).
// Exemplos de secrets por provedor:
//   Z-API:        ZAPI_INSTANCE, ZAPI_TOKEN, ZAPI_CLIENT_TOKEN
//   Meta Cloud:   META_WA_TOKEN, META_WA_PHONE_ID, META_WA_TEMPLATE
//   Twilio:       TWILIO_SID, TWILIO_TOKEN, TWILIO_WA_FROM
//   Evolution:    EVOLUTION_URL, EVOLUTION_KEY, EVOLUTION_INSTANCE
// ─────────────────────────────────────────────────────────────────────────────
async function sendWhatsApp(to: string, message: string): Promise<{ sent: boolean; detail?: string }> {
  const provider = Deno.env.get("WHATSAPP_PROVIDER"); // ex.: "zapi" | "meta" | "twilio" | "evolution"
  if (!provider) {
    // Esquema ainda não ativado — não envia, apenas registra.
    console.log("[notify-doctor] WHATSAPP_PROVIDER não configurado. Mensagem que seria enviada para", to, ":\n", message);
    return { sent: false, detail: "provedor não configurado" };
  }

  // TODO: implementar o envio conforme o provider escolhido, por exemplo (Z-API):
  //
  // if (provider === "zapi") {
  //   const instance = Deno.env.get("ZAPI_INSTANCE");
  //   const token = Deno.env.get("ZAPI_TOKEN");
  //   const clientToken = Deno.env.get("ZAPI_CLIENT_TOKEN") ?? "";
  //   const url = `https://api.z-api.io/instances/${instance}/token/${token}/send-text`;
  //   const resp = await fetch(url, {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json", "Client-Token": clientToken },
  //     body: JSON.stringify({ phone: to, message }),
  //   });
  //   const body = await resp.json().catch(() => ({}));
  //   return { sent: resp.ok, detail: JSON.stringify(body) };
  // }

  return { sent: false, detail: `provider '${provider}' ainda não implementado` };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, service);

    const { appointmentId } = await req.json().catch(() => ({}));
    if (!appointmentId) return json({ error: "appointmentId obrigatório" }, 400);

    // Busca o agendamento + médico + paciente
    const { data: appt, error } = await admin
      .from("agendamentos")
      .select("id, protocolo, horario_inicio, appointment_date, appointment_time, paciente_nome, patient_id, medico_id, pagamento_status")
      .eq("id", appointmentId)
      .maybeSingle();
    if (error) throw error;
    if (!appt) return json({ error: "Agendamento não encontrado" }, 404);

    // Só notifica se estiver pago
    if (appt.pagamento_status !== "pago") return json({ ok: true, skipped: "agendamento não está pago" });

    // Contato do médico (telefone público do médico ou WhatsApp do perfil)
    const { data: medico } = await admin.from("medicos").select("user_id, phone_number, public_name, name").eq("id", appt.medico_id).maybeSingle();
    let doctorPhone = medico?.phone_number || "";
    if (!doctorPhone && medico?.user_id) {
      const { data: perfilMed } = await admin.from("perfis_usuarios").select("whatsapp").eq("id", medico.user_id).maybeSingle();
      doctorPhone = perfilMed?.whatsapp || "";
    }

    // Nome do paciente (snapshot ou perfil)
    let pacienteNome = appt.paciente_nome || "";
    if (!pacienteNome && appt.patient_id) {
      const { data: perfilPac } = await admin.from("perfis_usuarios").select("full_name").eq("id", appt.patient_id).maybeSingle();
      pacienteNome = perfilPac?.full_name || "Paciente";
    }

    // Data e hora (Horário de Brasília)
    const raw = appt.horario_inicio || (appt.appointment_date ? `${appt.appointment_date}T${appt.appointment_time || "00:00:00"}` : null);
    let dataStr = "-", horaStr = "-";
    if (raw) {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        dataStr = d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
        horaStr = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
      }
    }

    const message =
      `*Novo Agendamento*\n` +
      `Data: ${dataStr}\n` +
      `Hora: ${horaStr}\n` +
      `Protocolo: ${appt.protocolo || "-"}\n` +
      `Paciente: ${pacienteNome}`;

    const to = normalizePhone(doctorPhone);
    if (!to) return json({ ok: false, error: "Médico sem telefone/WhatsApp cadastrado", message });

    const result = await sendWhatsApp(to, message);
    return json({ ok: true, sent: result.sent, detail: result.detail, to, message });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
