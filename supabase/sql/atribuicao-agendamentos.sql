-- De onde veio o paciente, gravado no agendamento.
--
-- POR QUE NO AGENDAMENTO E NÃO SÓ NO NAVEGADOR
-- O pagamento acontece fora do site, no checkout do Asaas. O paciente fecha a
-- aba, paga o Pix duas horas depois, de outro aparelho — e o evento de compra
-- que o navegador dispararia nunca acontece. Quem sabe a verdade é o
-- asaas-webhook, no servidor. Para ele poder dizer ao TikTok "esta venda veio
-- daquele anúncio", a origem precisa estar guardada aqui, junto do agendamento.
--
-- JSONB e não colunas soltas: os parâmetros de campanha mudam (hoje ttclid,
-- amanhã outro identificador de rede), e cada mudança viraria uma migração.
--
-- Rodar no SQL Editor do Supabase. É idempotente.

ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS atribuicao jsonb;

COMMENT ON COLUMN public.agendamentos.atribuicao IS
  'Origem do tráfego capturada na página de entrada: ttclid/fbclid/gclid, utm_* '
  'e a página onde a pessoa caiu. NULL = orgânico ou desconhecido. Preenchido '
  'pelo site em src/lib/atribuicao.js e consumido pelo asaas-webhook.';

-- Índice só para as linhas que TÊM origem. A maioria dos agendamentos é
-- orgânica e ficaria ocupando espaço no índice sem nunca ser consultada — o
-- relatório de tráfego pago pergunta exatamente pelo contrário.
CREATE INDEX IF NOT EXISTS agendamentos_atribuicao_idx
  ON public.agendamentos USING gin (atribuicao)
  WHERE atribuicao IS NOT NULL;
