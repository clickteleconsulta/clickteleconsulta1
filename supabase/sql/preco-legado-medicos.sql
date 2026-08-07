-- Limpeza dos preços legados na tabela `medicos`
-- ==============================================
--
-- O PROBLEMA
-- `medicos` tem três colunas de preço de quando o valor morava no cadastro do
-- profissional: preco, price_in_cents e consulta_preco. Hoje o preço do paciente
-- sai de `procedimentos.preco` com a taxa por cima, e essas três ficaram para
-- trás guardando números antigos.
--
-- Não é hipótese: em 7 de agosto de 2026, um dos cadastros tinha
-- price_in_cents = 12900 e consulta_preco = 129 contra R$ 65,00 de preço real.
-- Enquanto o valor esteve ali, a grade de horários do perfil público cobrava
-- por ele — a tela mostrava R$ 65,00 e o agendamento saía por R$ 129,00.
--
-- O CÓDIGO JÁ NÃO LÊ NENHUMA DAS TRÊS
-- As colunas saíram da consulta pública e há teste (src/lib/precoOrigem.test.js)
-- que falha se alguém voltar a usá-las. Este arquivo trata do outro lado: o dado
-- velho continua no banco, e dado errado guardado é uma armadilha esperando a
-- próxima pessoa.
--
-- POR QUE ZERAR E NÃO APAGAR A COLUNA
-- `drop column` é irreversível e pode quebrar uma view, um gatilho ou um
-- relatório que ninguém lembra que existe. Zerar resolve o risco — o valor
-- errado deixa de existir — e mantém a porta aberta. Apagar de vez, se for o
-- caso, depois de um tempo sem ninguém sentir falta.
--
-- ANTES DE RODAR, veja o que vai mudar:
--
--   select id, public_name, preco, price_in_cents, consulta_preco
--     from public.medicos
--    where preco is not null
--       or price_in_cents is not null
--       or consulta_preco is not null;
--
-- ⚠️ Isto NÃO mexe em `agendamentos.price_in_cents`. Aquele é o valor que o
-- paciente pagou, é o que a cobrança e o reembolso usam, e é imutável por
-- definição. Não confunda as duas colunas de mesmo nome em tabelas diferentes.

update public.medicos
   set preco = null,
       price_in_cents = null,
       consulta_preco = null
 where preco is not null
    or price_in_cents is not null
    or consulta_preco is not null;

-- Confirmação: deve devolver zero linhas.
select count(*) as ainda_com_preco_legado
  from public.medicos
 where preco is not null
    or price_in_cents is not null
    or consulta_preco is not null;
