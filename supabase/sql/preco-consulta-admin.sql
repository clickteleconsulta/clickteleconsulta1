-- Permissão de administrador para alterar o valor da consulta
-- ============================================================
--
-- QUANDO RODAR ISTO
-- Só se a tela Profissionais → "Alterar valor da consulta" der a mensagem
-- "O banco não aplicou a alteração". A tela LÊ os preços hoje, então a leitura
-- já está liberada; o que pode faltar é a escrita.
--
-- Antes de rodar, dá para conferir o que já existe:
--
--   select policyname, cmd, roles
--     from pg_policies
--    where schemaname = 'public' and tablename = 'procedimentos';
--
-- POR QUE UMA POLÍTICA A MAIS NÃO TIRA O ACESSO DO MÉDICO
-- Políticas permissivas se SOMAM (OR). A política abaixo abre o caminho do
-- admin sem encostar nas que já existem — o médico continua mexendo nos
-- próprios procedimentos exatamente como antes.
--
-- O REGISTRO JÁ EXISTE, NÃO PRECISA SER CRIADO
-- A alteração de preço já é gravada na auditoria pelo gatilho trg_audit_proc
-- (ver audit-central.sql), que registra preco, nome e principal com o autor da
-- mudança. Ou seja: quando o admin mexe no valor, isso aparece na tela
-- Auditoria com o nome de quem mexeu.

alter table public.procedimentos enable row level security;

drop policy if exists "admin gerencia procedimentos" on public.procedimentos;
create policy "admin gerencia procedimentos"
  on public.procedimentos
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
