// Supabase Edge Function: notify-patient-appointment
//
// Avisa o PACIENTE, por WhatsApp, que a consulta dele está confirmada — assim
// que o pagamento é aprovado e o horário fica reservado.
//
// É a gêmea da notify-doctor-new-appointment. Mesmo número remetente, mesmas
// regras da Meta, outro destinatário e outro modelo. Os dois disparos saem do
// mesmo ponto: o webhook do Asaas, quando o pagamento vira "pago".
//
// POR QUE UMA FUNÇÃO SEPARADA, E NÃO UM `if` DENTRO DA OUTRA
// Porque falham por motivos diferentes e precisam falhar sozinhas. Médico sem
// telefone no cadastro não pode impedir o aviso ao paciente, e um modelo do
// paciente reprovado na Meta não pode calar o aviso ao médico. Juntas, uma
// exceção no meio derrubaria as duas.
//
// A MENSAGEM QUE MAIS IMPORTA DAS TRÊS
// Esta é a única que a pessoa está esperando. Ela acabou de pagar e quer a
// confirmação de que o horário é dela — se não chegar, ela liga no suporte, ou
// pior, paga de novo achando que não deu certo.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const WA_TOKEN = Deno.env.get("META_WA_TOKEN") ?? "";
const WA_PHONE_ID = Deno.env.get("META_WA_PHONE_ID") ?? "";
const WA_TEMPLATE = Deno.env.get("META_WA_TEMPLATE_PACIENTE") ?? "agendamento_confirmado_paciente";
const WA_LANG = Deno.env.get("META_WA_LANG") ?? "pt_BR";
const API_VERSION = Deno.env.get("META_WA_API_VERSION") ?? "v21.0";

const ACAO_ENVIADO = "whatsapp_paciente_enviado";

/** Telefone brasileiro em E.164 sem o "+", como a Meta espera. */
function normalizarTelefone(bruto: string): string {
  const so = (bruto || "").replace(/\D/g, "");
  const sem55 = so.startsWith("55") ? so.slice(2) : so;
  if (!/^[1-9][0-9]9[0-9]{8}$/.test(sem55)) return "";
  return `55${sem55}`;
}

/**
 * A Meta recusa variável com quebra de linha, tabulação ou espaço duplo — e
 * recusa a mensagem inteira, não só o campo.
 */
function limparVariavel(v: string): string {
  return String(v ?? "").replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, 120) || "-";
}

async function enviarModelo(para: string, variaveis: string[]) {
  if (!WA_TOKEN || !WA_PHONE_ID) {
    console.log("[notify-patient] Meta não configurada. Enviaria para", para, variaveis);
    return { enviado: false, detalhe: "META_WA_TOKEN/META_WA_PHONE_ID ausentes" };
  }
  const resp = await fetch(`https://graph.facebook.com/${API_VERSION}/${WA_PHONE_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${WA_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: para,
      type: "template",
      template: {
        name: WA_TEMPLATE,
        language: { code: WA_LANG },
        components: [{ type: "body", parameters: variaveis.map((text) => ({ type: "text", text })) }],
      },
    }),
  });
  const corpo = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = corpo?.error ?? {};
    console.error("[notify-patient] Meta recusou:", JSON.stringify(err));
    return { enviado: false, detalhe: err?.message ?? `HTTP ${resp.status}` };
  }
  return { enviado: true, detalhe: "ok", messageId: corpo?.messages?.[0]?.id };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const admin = createClient(url, service);
    const { appointmentId } = await req.json().catch(() => ({}));
    if (!appointmentId) return json({ error: "appointmentId obrigatório" }, 400);

    const { data: appt, error } = await admin
      .from("agendamentos")
      .select(
        "id, protocolo, horario_inicio, appointment_date, appointment_time, paciente_nome, patient_id, medico_id, pagamento_status, status",
      )
      .eq("id", appointmentId)
      .maybeSingle();
    if (error) throw error;
    if (!appt) return json({ error: "Agendamento não encontrado" }, 404);

    if (appt.pagamento_status !== "pago") return json({ ok: true, pulou: "agendamento não está pago" });
    if (appt.status === "cancelado") return json({ ok: true, pulou: "agendamento cancelado" });

    const { data: jaFoi } = await admin
      .from("agendamento_logs")
      .select("id")
      .eq("agendamento_id", appt.id)
      .eq("acao", ACAO_ENVIADO)
      .maybeSingle();
    if (jaFoi) return json({ ok: true, pulou: "já notificado" });

    // O telefone do paciente sai do perfil, que é onde a verificação por código
    // grava — e não de um campo digitado no agendamento.
    let telefoneBruto = "";
    let pacienteNome = appt.paciente_nome || "";
    if (appt.patient_id) {
      const { data: perfil } = await admin
        .from("perfis_usuarios")
        .select("whatsapp, full_name")
        .eq("id", appt.patient_id)
        .maybeSingle();
      telefoneBruto = perfil?.whatsapp || "";
      if (!pacienteNome) pacienteNome = perfil?.full_name || "";
    }

    const { data: medico } = await admin
      .from("medicos")
      .select("public_name, name")
      .eq("id", appt.medico_id)
      .maybeSingle();
    const medicoNome = medico?.public_name || medico?.name || "seu profissional";

    const bruto = appt.horario_inicio ||
      (appt.appointment_date ? `${appt.appointment_date}T${appt.appointment_time || "00:00:00"}` : null);
    let dataStr = "-", horaStr = "-";
    if (bruto) {
      const d = new Date(bruto);
      if (!isNaN(d.getTime())) {
        dataStr = d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
        horaStr = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
      }
    }

    const para = normalizarTelefone(telefoneBruto);
    if (!para) {
      await admin.from("agendamento_logs").insert({
        agendamento_id: appt.id,
        acao: "whatsapp_paciente_sem_telefone",
        dados: { patient_id: appt.patient_id, telefone_cadastrado: telefoneBruto || null },
      });
      return json({ ok: false, error: "Paciente sem WhatsApp válido no cadastro" });
    }

    // A ORDEM É A DO MODELO APROVADO NA META. Trocar aqui não dá erro: entrega
    // a mensagem com o nome do médico no lugar da data. Ver docs/WHATSAPP.md.
    const variaveis = [
      limparVariavel(pacienteNome.split(" ")[0] || "Olá"), // {{1}} primeiro nome
      limparVariavel(medicoNome),                          // {{2}} profissional
      limparVariavel(dataStr),                             // {{3}} data
      limparVariavel(horaStr),                             // {{4}} hora
      limparVariavel(appt.protocolo || "-"),               // {{5}} protocolo
    ];

    const r = await enviarModelo(para, variaveis);

    await admin.from("agendamento_logs").insert({
      agendamento_id: appt.id,
      acao: r.enviado ? ACAO_ENVIADO : "whatsapp_paciente_falhou",
      dados: { detalhe: r.detalhe, message_id: r.messageId ?? null },
    });

    return json({ ok: r.enviado, detalhe: r.detalhe });
  } catch (erro) {
    console.error("[notify-patient]", erro);
    return json({ error: String(erro?.message ?? erro) }, 500);
  }
});
