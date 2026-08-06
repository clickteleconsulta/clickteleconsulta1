-- ============================================================
-- Registro de erro de interface (o que quebra no navegador do usuário)
-- Rodar uma vez no SQL Editor do Supabase.
-- ============================================================
--
-- POR QUE ISTO EXISTE
-- O ErrorBoundary evitava a tela branca, mas registrava o erro com
-- console.error — que morre no navegador da pessoa. Na prática, se um paciente
-- tomasse erro no meio do agendamento, ninguém ficava sabendo. A falha só
-- aparecia se ele resolvesse escrever para o suporte, e a maioria não escreve:
-- desiste.
--
-- O QUE NÃO ENTRA AQUI
-- Nada que identifique a pessoa. Sem id de usuário, sem e-mail, sem sessão.
-- Guarda-se a mensagem, um pedaço da pilha, a rota e o navegador — o
-- suficiente para reproduzir, e nada além. Isso mantém o registro fora do
-- alcance da LGPD como dado pessoal e evita ter de declarar mais uma
-- finalidade na Política de Privacidade.
--
-- QUEM PODE O QUÊ
-- Anônimo INSERE e não lê. Isso é essencial: erro de interface costuma trazer
-- caminho de arquivo e trecho de código, e uma tabela de log legível por
-- qualquer um vira mapa para quem procura brecha. Só admin lê.

create table if not exists public.erros_cliente (
  id          bigint generated always as identity primary key,
  criado_em   timestamptz  not null default now(),
  mensagem    text         not null,
  pilha       text,
  rota        text,
  navegador   text,
  origem      text         not null default 'react'   -- react | window | promise
);

comment on table public.erros_cliente is
  'Erros ocorridos no navegador do usuário. Sem dado pessoal: só mensagem, pilha, rota e navegador.';

create index if not exists erros_cliente_criado_em_idx
  on public.erros_cliente (criado_em desc);

-- Deduplicação barata na leitura: mensagens iguais na mesma rota são o mesmo
-- problema acontecendo com várias pessoas, e é assim que se quer olhar.
create index if not exists erros_cliente_mensagem_rota_idx
  on public.erros_cliente (mensagem, rota);

alter table public.erros_cliente enable row level security;

-- INSERE: qualquer visitante, inclusive não logado — é justamente quem quebra
-- antes de entrar que a gente não estava enxergando.
drop policy if exists "anon insere erro" on public.erros_cliente;
create policy "anon insere erro"
  on public.erros_cliente for insert
  to anon, authenticated
  with check (true);

-- LÊ: só admin. Sem política de select para anon, o PostgREST devolve vazio.
drop policy if exists "admin lê erro" on public.erros_cliente;
create policy "admin lê erro"
  on public.erros_cliente for select
  using (public.is_admin());

-- ------------------------------------------------------------
-- TETO DE VOLUME
-- Tabela que qualquer um insere é tabela que qualquer um enche. O código do
-- site já limita a 5 relatos por sessão e ignora repetidos, mas isso é do lado
-- do cliente e portanto não é garantia. Esta função apara o histórico; agende-a
-- no pg_cron (ou chame de vez em quando) para o registro não crescer sem fim.
-- ------------------------------------------------------------
create or replace function public.limpar_erros_cliente(dias int default 30)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare apagados integer;
begin
  delete from public.erros_cliente where criado_em < now() - (dias || ' days')::interval;
  get diagnostics apagados = row_count;
  return apagados;
end;
$$;

revoke all on function public.limpar_erros_cliente(int) from public, anon, authenticated;
