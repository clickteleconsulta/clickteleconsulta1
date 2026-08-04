-- Guarda o valor que o Asaas realmente creditou, para o painel bater com o extrato.
--
-- PROBLEMA
-- O painel de saques calculava tudo a partir de price_in_cents — o que o paciente
-- pagou. Só que esse valor nunca chega inteiro na conta: o Asaas retém a taxa
-- dele antes de creditar. O admin via "R$ 40,00 recebidos" enquanto o extrato
-- mostrava algo em torno de R$ 38, e a conciliação não fechava.
--
-- O QUE MUDA E O QUE NÃO MUDA
-- O repasse do médico NÃO muda. A cláusula 5.2 do Termo de Adesão define a parte
-- da aviDoc como um percentual do valor total pago pelo paciente, e a parcela
-- restante como do parceiro — a taxa do Asaas sai da margem da plataforma, não
-- do médico. Mexer nisso exigiria alterar o Termo, o que é decisão de negócio e
-- não de código.
--
-- O que muda é o painel passar a mostrar os três valores separados:
--
--   Pago                 o que o paciente pagou            (price_in_cents)
--   Recebido do Asaas    o que existe na conta             (esta coluna)
--   Repasse ao médico    o que pertence ao parceiro        (pago - taxa da plataforma)
--   Margem da plataforma recebido - repasse                (calculado na tela)
--
-- A margem real é sempre menor que a taxa nominal e pode ficar NEGATIVA. A tela
-- separa as duas causas, porque exigem reações opostas:
--
--   taxa = 0%    esperado. O repasse é o valor cheio e a taxa do Asaas fica com
--                a plataforma por decisão. Hoje é o caso do Ryan e do Celso.
--                Aparece em cinza como "Custo do Asaas · médico sem taxa".
--
--   taxa > 0%    problema de preço: a comissão cobrada não cobriu o custo do
--                Asaas. Aparece em vermelho como "Prejuízo".
--
-- Tratar os dois como alerta faria o vermelho tocar em todo saque dos médicos
-- sem taxa, e alarme que sempre toca deixa de ser lido.
--
-- ONDE É PREENCHIDA
-- Em supabase/functions/asaas-webhook, no evento de pagamento confirmado. A
-- função já consultava a cobrança no Asaas para validar o status; agora também
-- lê o netValue da mesma resposta, sem chamada extra.
--
-- Fica NULA em cobranças anteriores a 04/08/2026 e enquanto o pagamento não é
-- confirmado. A tela trata esse caso como "não informado" — não assume zero, que
-- distorceria os totais.

alter table public.agendamentos
  add column if not exists valor_liquido_centavos integer;

comment on column public.agendamentos.valor_liquido_centavos is
 'Valor liquido que o Asaas creditou na conta, em centavos (payment.netValue x 100). E o que existe de fato para repassar. A taxa do Asaas e price_in_cents - valor_liquido_centavos. Fica nulo em cobrancas anteriores a 04/08/2026 e enquanto o pagamento nao e confirmado.';

-- PENDENTE: as cobranças já pagas antes desta mudança não têm o líquido. O
-- preenchimento retroativo precisa consultar a API do Asaas cobrança a cobrança
-- e só pode rodar de dentro de uma edge function, onde a chave vive.
