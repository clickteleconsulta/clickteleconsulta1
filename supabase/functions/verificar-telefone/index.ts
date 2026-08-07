// Supabase Edge Function: verificar-telefone
//
// Envia um código de 6 dígitos por WhatsApp e confere a resposta. Usada em dois
// lugares: no cadastro do paciente e na avaliação pública, que é escrita por
// quem não tem conta.
//
// POR QUE ISTO NÃO USA O TELEFONE DO SUPABASE AUTH
// O `signInWithOtp({ phone })` do Auth verifica um número CRIANDO OU TROCANDO
// SESSÃO. Isso serve para login por telefone e atrapalha nos dois casos daqui:
// na avaliação não queremos criar conta nenhuma, e no cadastro a pessoa já está
// autenticada por e-mail — verificar o telefone por lá mexeria na identidade
// dela. Aqui o código só prova que o número existe e responde.
//
// A RESTRIÇÃO QUE MANDA NO FORMATO
// Mensagem iniciada pela empresa no WhatsApp Cloud API só sai por MODELO
// APROVADO. Para código, a Meta tem a categoria AUTENTICAÇÃO, que exige um
// modelo próprio com o botão de copiar código. O nome do modelo vem de
// META_WA_TEMPLATE_OTP. Sem ele aprovado, nada é entregue — e é por isso que a
// função registra o que enviaria em vez de fingir sucesso.
//
// O QUE FICA GUARDADO
// Nem o número nem o código: só o hash dos dois, com um sal que mora na
// variável de ambiente. Ver supabase/sql/verificacao-telefone.sql.

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

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PEPPER = Deno.env.get("TELEFONE_PEPPER") ?? "";
// Canal de envio. 'auto' usa o primeiro que estiver configurado, na ordem
// SMS → WhatsApp. Deixar explícito ('sms' ou 'whatsapp') evita a surpresa de o
// canal mudar sozinho no dia em que a outra credencial for preenchida.
const CANAL = (Deno.env.get("CANAL_VERIFICACAO") ?? "auto").toLowerCase();

// Twilio (SMS). Serve qualquer provedor com API parecida; trocar significa
// mexer só na função enviarSms.
// E-mail (Resend) — o único canal que já está configurado no projeto, usado
// pelos avisos de agendamento. Serve de ponte até o WhatsApp entrar.
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const EMAIL_FROM = Deno.env.get("INVITE_FROM") || "aviDoc <noreply@avidoc.com.br>";

const SMS_SID = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
const SMS_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
const SMS_FROM = Deno.env.get("TWILIO_FROM") ?? "";

const WA_TOKEN = Deno.env.get("META_WA_TOKEN") ?? "";
const WA_PHONE_ID = Deno.env.get("META_WA_PHONE_ID") ?? "";
const WA_TEMPLATE = Deno.env.get("META_WA_TEMPLATE_OTP") ?? "codigo_verificacao";
const WA_LANG = Deno.env.get("META_WA_LANG") ?? "pt_BR";
const API_VERSION = Deno.env.get("META_API_VERSION") ?? "v21.0";

// Quanto tempo o código vale, e quanto vale o comprovante que ele gera.
const MINUTOS_CODIGO = 10;
const MINUTOS_COMPROVANTE = 30;
const MAX_TENTATIVAS = 5;
const MAX_ENVIOS_POR_HORA = 3;

const banco = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function sha256(texto: string): Promise<string> {
  const dados = new TextEncoder().encode(texto);
  const digest = await crypto.subtle.digest("SHA-256", dados);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Telefone brasileiro em E.164, ou null.
 *
 * Normalizar importa mais do que parece: "(21) 99999-8888", "21999998888" e
 * "+5521999998888" são o mesmo número, e sem normalizar cada grafia geraria um
 * hash diferente — ou seja, a mesma pessoa poderia avaliar três vezes.
 */
function normalizar(bruto: string): string | null {
  const so = (bruto || "").replace(/\D/g, "");
  const sem55 = so.startsWith("55") ? so.slice(2) : so;
  // DDD (2) + celular (9, começando em 9). Fixo não recebe WhatsApp nem SMS.
  if (!/^[1-9][0-9]9[0-9]{8}$/.test(sem55)) return null;
  return `55${sem55}`;
}

async function enviarWhatsapp(para: string, codigo: string) {
  if (!WA_TOKEN || !WA_PHONE_ID) {
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
          { type: "body", parameters: [{ type: "text", text: codigo }] },
          // Modelo de AUTENTICAÇÃO exige o botão de copiar, e o código vai nele.
          { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: codigo }] },
        ],
      },
    }),
  });
  const corpo = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    console.error("[verificar-telefone] Meta recusou:", JSON.stringify(corpo));
    return { enviado: false, detalhe: corpo?.error?.message ?? `HTTP ${resp.status}` };
  }
  return { enviado: true, detalhe: "ok" };
}

async function enviarEmail(destino: string, codigo: string) {
  if (!RESEND_KEY || !destino) return { enviado: false, detalhe: "RESEND_API_KEY ou e-mail ausente" };
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [destino],
      subject: `${codigo} é o seu código de confirmação`,
      html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <p style="color:#3E4756;font-size:15px">Use o código abaixo para confirmar seu cadastro na aviDoc.</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#141922;margin:24px 0">${codigo}</p>
        <p style="color:#6B7484;font-size:13px">Ele vale por 10 minutos. Se não foi você quem pediu, ignore esta mensagem.</p>
      </div>`,
    }),
  });
  if (!resp.ok) {
    console.error("[verificar-telefone] Resend recusou:", (await resp.text()).slice(0, 300));
    return { enviado: false, detalhe: `e-mail HTTP ${resp.status}` };
  }
  return { enviado: true, detalhe: "email" };
}

async function enviarSms(para: string, codigo: string) {
  if (!SMS_SID || !SMS_TOKEN || !SMS_FROM) {
    return { enviado: false, detalhe: "TWILIO_* ausentes" };
  }
  // Texto curto de propósito: SMS é cobrado por segmento de 160 caracteres, e
  // um texto que passa disso dobra o custo de cada verificação.
  const corpo = `aviDoc: seu codigo e ${codigo}. Vale 10 minutos. Nao compartilhe.`;
  const resp = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${SMS_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${SMS_SID}:${SMS_TOKEN}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: `+${para}`, From: SMS_FROM, Body: corpo }),
    },
  );
  if (!resp.ok) {
    const erro = await resp.text();
    console.error("[verificar-telefone] SMS recusado:", erro.slice(0, 300));
    return { enviado: false, detalhe: `SMS HTTP ${resp.status}` };
  }
  return { enviado: true, detalhe: "sms" };
}

/**
 * Escolhe o canal e envia.
 *
 * Nenhum canal configurado NÃO é erro: o código fica no log e o fluxo continua
 * testável. O que seria erro é responder "enviamos" para uma mensagem que nunca
 * saiu — a pessoa ficaria esperando, e ninguém saberia por quê.
 */
async function enviarCodigo(para: string, codigo: string, destinoEmail?: string) {
  const temSms = Boolean(SMS_SID && SMS_TOKEN && SMS_FROM);
  const temWa = Boolean(WA_TOKEN && WA_PHONE_ID);

  // E-MAIL É PONTE, NÃO DESTINO.
  // Ele confirma que a pessoa controla aquela caixa — não que o telefone
  // digitado está certo, que é o que o médico precisa para ligar. Serve
  // enquanto o WhatsApp não entra, e só onde há e-mail: no cadastro. Na
  // avaliação pública ninguém informa e-mail, e conta de e-mail é gratuita e
  // infinita, o que a tornaria uma barreira de mentira contra avaliação falsa.
  if (CANAL === "email") {
    return destinoEmail
      ? await enviarEmail(destinoEmail, codigo)
      : { enviado: false, detalhe: "canal e-mail sem endereço (avaliação pública não informa e-mail)" };
  }

  if (CANAL === "sms" || (CANAL === "auto" && temSms)) {
    const r = await enviarSms(para, codigo);
    if (r.enviado || CANAL === "sms") return r;
  }
  if (CANAL === "whatsapp" || (CANAL === "auto" && temWa)) {
    return await enviarWhatsapp(para, codigo);
  }
  console.log("[verificar-telefone] Nenhum canal configurado. Código de", para, "seria", codigo);
  return { enviado: false, detalhe: "nenhum canal configurado" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  try {
    const { acao, telefone, codigo, finalidade, email } = await req.json();
    if (!["cadastro", "avaliacao"].includes(finalidade)) {
      return json({ error: "Finalidade inválida" }, 400);
    }

    const numero = normalizar(telefone);
    if (!numero) {
      return json({ error: "Informe um celular com DDD, no formato (21) 99999-8888." }, 400);
    }
    const telHash = await sha256(`${numero}${PEPPER}`);
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

    // ── Enviar o código ───────────────────────────────────────────────────
    if (acao === "enviar") {
      const umaHoraAtras = new Date(Date.now() - 3600_000).toISOString();
      const { count } = await banco
        .from("verificacoes_telefone")
        .select("id", { count: "exact", head: true })
        .eq("telefone_hash", telHash)
        .gte("created_at", umaHoraAtras);

      if ((count ?? 0) >= MAX_ENVIOS_POR_HORA) {
        // Sem isto, o formulário público vira uma torneira de mensagens pagas
        // apontada para o número de quem o atacante quiser.
        return json({ error: "Muitas tentativas para este número. Tente novamente em uma hora." }, 429);
      }

      const gerado = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, "0");
      const { error } = await banco.from("verificacoes_telefone").insert({
        telefone_hash: telHash,
        codigo_hash: await sha256(`${gerado}${numero}${PEPPER}`),
        finalidade,
        // No cadastro a conta ainda NÃO existe quando o telefone é confirmado —
        // a pessoa está preenchendo o formulário. O e-mail é o único fio que
        // liga esta verificação ao perfil que nascerá depois, e é o gatilho no
        // banco que amarra os dois. Sem ele, só restaria acreditar no navegador.
        email: finalidade === 'cadastro' ? String(email ?? '').trim().toLowerCase() || null : null,
        expira_em: new Date(Date.now() + MINUTOS_CODIGO * 60_000).toISOString(),
        ip,
      });
      if (error) throw error;

      const envio = await enviarCodigo(numero, gerado, String(email ?? '').trim() || undefined);
      // `enviado: false` não vira erro de propósito: em ambiente sem a Meta
      // configurada o fluxo continua testável, e o código aparece no log da
      // função. Em produção, com a Meta ligada, o false é o que denuncia
      // modelo reprovado ou token vencido.
      return json({ ok: true, enviado: envio.enviado, expira_em_minutos: MINUTOS_CODIGO });
    }

    // ── Conferir o código ─────────────────────────────────────────────────
    if (acao === "conferir") {
      if (!/^\d{6}$/.test(String(codigo ?? ""))) {
        return json({ error: "O código tem 6 dígitos." }, 400);
      }

      const { data: registros } = await banco
        .from("verificacoes_telefone")
        .select("id, codigo_hash, tentativas, expira_em, verificado_em")
        .eq("telefone_hash", telHash)
        .eq("finalidade", finalidade)
        .is("verificado_em", null)
        .gte("expira_em", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1);

      const registro = registros?.[0];
      if (!registro) return json({ error: "Código expirado. Peça um novo." }, 400);

      if (registro.tentativas >= MAX_TENTATIVAS) {
        return json({ error: "Muitas tentativas. Peça um código novo." }, 429);
      }

      const confere = registro.codigo_hash === (await sha256(`${codigo}${numero}${PEPPER}`));
      if (!confere) {
        await banco
          .from("verificacoes_telefone")
          .update({ tentativas: registro.tentativas + 1 })
          .eq("id", registro.id);
        return json({ error: "Código incorreto." }, 400);
      }

      const comprovante = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
      await banco
        .from("verificacoes_telefone")
        .update({
          verificado_em: new Date().toISOString(),
          comprovante,
          comprovante_expira_em: new Date(Date.now() + MINUTOS_COMPROVANTE * 60_000).toISOString(),
        })
        .eq("id", registro.id);

      // No cadastro não há perfil para marcar ainda: quem faz isso é o gatilho
      // trg_marcar_whatsapp_verificado, quando a conta é criada. Se a pessoa já
      // tem conta (verificando um número novo), marca aqui mesmo.
      if (finalidade === "cadastro") {
        const auth = req.headers.get("Authorization")?.replace("Bearer ", "");
        if (auth) {
          const { data: dono } = await banco.auth.getUser(auth);
          if (dono?.user?.id) {
            await banco
              .from("perfis_usuarios")
              .update({ whatsapp_verificado_em: new Date().toISOString() })
              .eq("id", dono.user.id);
          }
        }
      }

      return json({ ok: true, comprovante, expira_em_minutos: MINUTOS_COMPROVANTE });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (erro) {
    console.error("[verificar-telefone]", erro);
    return json({ error: "Não foi possível verificar o telefone agora." }, 500);
  }
});
