// Supabase Edge Function: notify-doctor-new-appointment
//
// Avisa o MÉDICO, por WhatsApp, que um agendamento foi PAGO.
//
// Provedor: WhatsApp Cloud API da Meta (oficial). A escolha tem uma
// consequência que manda no formato desta função inteira:
//
//   MENSAGEM INICIADA PELA EMPRESA SÓ SAI POR MODELO APROVADO.
//
// Texto livre só é aceito dentro da janela de 24h depois que a pessoa escreve
// para o número. O médico não escreve para o bot antes de receber o aviso, então
// aqui NUNCA cabe texto livre — e é por isso que esta função monta uma lista
// ordenada de variáveis em vez de uma string. Se um dia alguém "simplificar"
// isto para mandar texto solto, a Meta devolve erro e nenhum médico é avisado.
//
// O modelo a cadastrar (categoria UTILIDADE, idioma pt_BR) está em
// docs/WHATSAPP.md, com o texto exato e a ordem das variáveis.
//
// Quem chama: o asaas-webhook, no instante em que o pagamento vira "pago" —
// server-to-server, e não o navegador. Isso é deliberado: a chamada ficava na
// tela de confirmação, então bastava o paciente fechar a aba (ou pagar um Pix
// horas depois) para o médico nunca ser avisado de um agendamento que já estava
// na agenda dele.

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

const API_VERSION = Deno.env.get("META_WA_API_VERSION") ?? "v21.0";
const WA_TOKEN = Deno.env.get("META_WA_TOKEN") ?? "";
const WA_PHONE_ID = Deno.env.get("META_WA_PHONE_ID") ?? "";
const WA_TEMPLATE = Deno.env.get("META_WA_TEMPLATE") ?? "novo_agendamento_medico";
const WA_LANG = Deno.env.get("META_WA_LANG") ?? "pt_BR";

// Marca no histórico do agendamento. É também a TRAVA contra aviso repetido:
// ver supabase/sql/whatsapp-medico.sql, que põe um índice único parcial nesta
// ação — em dois envios simultâneos o segundo INSERT falha em vez de virar uma
// segunda mensagem no celular do médico.
const ACAO_ENVIADO = "whatsapp_medico_enviado";

/**
 * Número em formato E.164 sem o "+", como a Cloud API espera.
 *
 * A validação não é frescura: número torto aqui vira mensagem entregue a um
 * DESCONHECIDO com o nome do paciente, a data e o protocolo dentro. Aceita só o
 * que tem cara de telefone brasileiro — 55 + DDD válido + 8 ou 9 dígitos.
 */
function normalizarTelefone(bruto: string): string {
  let d = (bruto || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.length <= 11) d = "55" + d;            // veio sem DDI
  if (!d.startsWith("55")) return "";          // fora do Brasil: fora do escopo
  const semDdi = d.slice(2);
  if (semDdi.length !== 10 && semDdi.length !== 11) return "";
  const ddd = Number(semDdi.slice(0, 2));
  if (ddd < 11 || ddd > 99) return "";
  return d;
}

/**
 * A Meta rejeita variável de modelo com quebra de linha, tabulação ou quatro
 * espaços seguidos. Nome de paciente vem de campo digitado, então passa por
 * aqui antes de virar parâmetro.
 */
function limparVariavel(v: string): string {
  return (v || "").replace(/\s+/g, " ").trim().slice(0, 200) || "-";
}

async function enviarModelo(
  para: string,
  variaveis: string[],
): Promise<{ enviado: boolean; detalhe: string; messageId?: string }> {
  if (!WA_TOKEN || !WA_PHONE_ID) {
    // Sem credencial não é erro: é a integração ainda desligada. O agendamento
    // já aconteceu e não pode falhar por causa do aviso.
    console.log("[notify-doctor] Meta não configurada. Enviaria para", para, variaveis);
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
        components: [
          { type: "body", parameters: variaveis.map((text) => ({ type: "text", text })) },
        ],
      },
    }),
  });

  const corpo = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = corpo?.error ?? {};
    return { enviado: false, detalhe: `${resp.status} ${err.code ?? ""} ${err.message ?? ""}`.trim() };
  }
  return { enviado: true, detalhe: "ok", messageId: corpo?.messages?.[0]?.id };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Só quem tem a service role chama. Antes qualquer usuário autenticado podia
  // POSTar um appointmentId qualquer; com o WhatsApp de verdade ligado isso
  // deixaria de ser barulho no log e passaria a ser mensagem no celular de um
  // médico, paga por nós e contada na cota da Meta.
  const auth = req.headers.get("Authorization") ?? "";
  if (!service || auth.replace(/^Bearer\s+/i, "") !== service) {
    return json({ error: "Não autorizado" }, 401);
  }

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

    // Já avisado? Mais de uma porta chega aqui (o webhook e, um dia, um reenvio
    // manual do admin) e o médico não pode receber a mesma consulta duas vezes.
    const { data: jaFoi } = await admin
      .from("agendamento_logs")
      .select("id")
      .eq("agendamento_id", appt.id)
      .eq("acao", ACAO_ENVIADO)
      .maybeSingle();
    if (jaFoi) return json({ ok: true, pulou: "já notificado" });

    const { data: medico } = await admin
      .from("medicos")
      .select("user_id, phone_number, public_name, name")
      .eq("id", appt.medico_id)
      .maybeSingle();

    let telefoneBruto = medico?.phone_number || "";
    if (!telefoneBruto && medico?.user_id) {
      const { data: perfilMed } = await admin
        .from("perfis_usuarios").select("whatsapp").eq("id", medico.user_id).maybeSingle();
      telefoneBruto = perfilMed?.whatsapp || "";
    }

    let pacienteNome = appt.paciente_nome || "";
    if (!pacienteNome && appt.patient_id) {
      const { data: perfilPac } = await admin
        .from("perfis_usuarios").select("full_name").eq("id", appt.patient_id).maybeSingle();
      pacienteNome = perfilPac?.full_name || "Paciente";
    }

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
      // Fica registrado: sem isto, um médico com telefone em branco no cadastro
      // simplesmente não recebe avisos e ninguém descobre por quê.
      await admin.from("agendamento_logs").insert({
        agendamento_id: appt.id,
        acao: "whatsapp_medico_sem_telefone",
        dados: { medico_id: appt.medico_id, telefone_cadastrado: telefoneBruto || null },
      });
      return json({ ok: false, error: "Médico sem WhatsApp válido no cadastro" });
    }

    // A ORDEM É A DO MODELO APROVADO NA META. Trocar a ordem aqui não dá erro
    // nenhum: entrega uma mensagem com a data no lugar do nome do paciente.
    // Ver docs/WHATSAPP.md antes de mexer.
    const variaveis = [
      limparVariavel(pacienteNome),           // {{1}} paciente
      limparVariavel(dataStr),                // {{2}} data
      limparVariavel(horaStr),                // {{3}} hora
      limparVariavel(appt.protocolo || "-"),  // {{4}} protocolo
    ];

    const r = await enviarModelo(para, variaveis);

    if (r.enviado) {
      const { error: erroLog } = await admin.from("agendamento_logs").insert({
        agendamento_id: appt.id,
        acao: ACAO_ENVIADO,
        dados: { message_id: r.messageId ?? null, modelo: WA_TEMPLATE },
      });
      // 23505 = o índice único pegou uma corrida: outra execução já avisou.
      if (erroLog && erroLog.code !== "23505") console.error("[notify-doctor] log falhou:", erroLog);
    } else {
      await admin.from("agendamento_logs").insert({
        agendamento_id: appt.id,
        acao: "whatsapp_medico_falhou",
        dados: { detalhe: r.detalhe, modelo: WA_TEMPLATE },
      });
    }

    return json({ ok: true, enviado: r.enviado, detalhe: r.detalhe });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
