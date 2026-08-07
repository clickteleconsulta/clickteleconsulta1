// Supabase Edge Function: avaliacao-publica
//
// Grava a avaliação escrita por quem NÃO tem conta, depois de conferir o
// comprovante que a verificar-telefone entregou.
//
// POR QUE NÃO DEIXAR O NAVEGADOR GRAVAR DIRETO
// Bastaria uma política de RLS permitindo INSERT para anon — e aí qualquer
// pessoa com o endereço da API escreveria avaliações em massa, sem passar por
// telefone nenhum. O comprovante só vale quando conferido no servidor, contra
// uma linha que diz que aquele número respondeu ao código há menos de 30
// minutos. Por isso a gravação mora aqui, com service_role, e a tabela continua
// fechada para o anon.
//
// A AVALIAÇÃO NASCE PENDENTE, SEMPRE
// Nada entra publicado. A moderação é o segundo filtro, e é ela que sustenta a
// promessa das Diretrizes de Avaliação — telefone confirmado prova que existe
// uma pessoa, não que o texto respeita as regras.

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

const banco = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const MIN_TEXTO = 50;
const MAX_TEXTO = 2000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  try {
    const { comprovante, medico_id, rating, comentario, autor_nome, aceite_versao } = await req.json();

    if (!comprovante || !medico_id) return json({ error: "Dados incompletos." }, 400);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return json({ error: "A nota vai de 1 a 5." }, 400);
    }
    const texto = String(comentario ?? "").trim();
    if (texto.length < MIN_TEXTO) {
      return json({ error: `Escreva pelo menos ${MIN_TEXTO} caracteres.` }, 400);
    }
    if (texto.length > MAX_TEXTO) return json({ error: "Texto muito longo." }, 400);

    const nome = String(autor_nome ?? "").trim().slice(0, 60);
    if (!nome) return json({ error: "Informe seu nome ou iniciais." }, 400);

    // ── O comprovante ─────────────────────────────────────────────────────
    const { data: verificacoes } = await banco
      .from("verificacoes_telefone")
      .select("id, telefone_hash, comprovante_expira_em, comprovante_usado_em")
      .eq("comprovante", comprovante)
      .eq("finalidade", "avaliacao")
      .limit(1);

    const verificacao = verificacoes?.[0];
    if (!verificacao) return json({ error: "Verificação não encontrada. Confirme o telefone de novo." }, 400);
    if (verificacao.comprovante_usado_em) {
      return json({ error: "Esta verificação já foi usada." }, 400);
    }
    if (new Date(verificacao.comprovante_expira_em) < new Date()) {
      return json({ error: "A verificação expirou. Confirme o telefone de novo." }, 400);
    }

    // ── A gravação ────────────────────────────────────────────────────────
    const { error: erroInsert } = await banco.from("avaliacoes").insert({
      medico_id,
      rating,
      comentario: texto,
      autor_nome: nome,
      telefone_hash: verificacao.telefone_hash,
      origem: "aberta",
      status: "pendente",
      aceite_em: new Date().toISOString(),
      aceite_ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      aceite_versao: aceite_versao ?? "0.1",
    });

    if (erroInsert) {
      // O índice único (medico_id, telefone_hash) é o que barra a segunda
      // avaliação do mesmo número sobre o mesmo profissional.
      if (erroInsert.code === "23505") {
        return json({ error: "Você já avaliou este profissional." }, 409);
      }
      throw erroInsert;
    }

    // Queima o comprovante só depois de a avaliação existir. Na ordem inversa,
    // uma falha na gravação deixaria a pessoa sem avaliação e sem comprovante.
    await banco
      .from("verificacoes_telefone")
      .update({ comprovante_usado_em: new Date().toISOString() })
      .eq("id", verificacao.id);

    return json({ ok: true, status: "pendente" });
  } catch (erro) {
    console.error("[avaliacao-publica]", erro);
    return json({ error: "Não foi possível enviar sua avaliação agora." }, 500);
  }
});
