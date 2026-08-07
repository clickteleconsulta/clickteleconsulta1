-- Verificação de telefone por código (WhatsApp/SMS)
-- =================================================
--
-- Serve a dois usos:
--   1. Confirmar o WhatsApp de quem cria conta de paciente.
--   2. Confirmar o telefone de quem escreve uma avaliação sem estar logado.
--
-- POR QUE O NÚMERO NÃO FICA GUARDADO AQUI
-- Só o hash. Isso resolve os dois problemas que a tabela precisa resolver —
-- barrar avaliação repetida do mesmo número e bloquear reincidente — sem manter
-- uma lista de telefones que, vazada, vira base para golpe contra pacientes.
-- O sal (pepper) fica na variável de ambiente da função, não no banco: quem
-- levar um dump da tabela não consegue nem testar números um a um.
--
-- O CÓDIGO TAMBÉM É HASH
-- Pelo mesmo motivo, e por mais um: quem tiver leitura da tabela não consegue
-- ler o código de outra pessoa e verificar por ela.
--
-- NINGUÉM ACESSA ESTA TABELA DIRETO
-- Sem política de RLS nenhuma, e com RLS ligada, o resultado é: anon e usuário
-- logado não leem nem escrevem. Só a service_role, de dentro das funções
-- verificar-telefone e avaliacao-publica. É proposital — o cliente nunca deve
-- poder contar tentativas, listar hashes ou marcar algo como verificado.

create extension if not exists pgcrypto;

create table if not exists public.verificacoes_telefone (
  id                    uuid primary key default gen_random_uuid(),
  telefone_hash         text        not null,
  codigo_hash           text        not null,
  finalidade            text        not null check (finalidade in ('cadastro', 'avaliacao')),
  tentativas            integer     not null default 0,
  expira_em             timestamptz not null,
  verificado_em         timestamptz,
  -- Entregue ao navegador só depois do código conferir. É ele que autoriza a
  -- gravação da avaliação, e vale uma vez.
  comprovante           text unique,
  comprovante_expira_em timestamptz,
  comprovante_usado_em  timestamptz,
  -- Só na finalidade 'cadastro': é o fio que liga a verificação, feita antes de
  -- a conta existir, ao perfil que nasce depois.
  email                 text,
  ip                    inet,
  created_at            timestamptz not null default now()
);

create index if not exists idx_verif_tel_hash on public.verificacoes_telefone (telefone_hash, created_at desc);
create index if not exists idx_verif_comprovante on public.verificacoes_telefone (comprovante) where comprovante is not null;

alter table public.verificacoes_telefone enable row level security;
-- (nenhuma política: acesso apenas por service_role)

-- Limpeza. Código expirado não serve para nada e é dado pessoal parado.
-- Agende junto com as outras rotinas de manutenção.
create or replace function public.limpar_verificacoes_telefone()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  apagados integer;
begin
  delete from public.verificacoes_telefone
   where created_at < now() - interval '30 days';
  get diagnostics apagados = row_count;
  return apagados;
end;
$$;

-- ---------------------------------------------------------------------------
-- Avaliação: as colunas que o modelo aberto exige
-- ---------------------------------------------------------------------------
--
-- Hoje toda avaliação nasce de um agendamento e de um paciente logado. Com a
-- avaliação aberta isso deixa de ser verdade, e as duas colunas passam a poder
-- ser nulas — mas NÃO ao mesmo tempo que `origem` diz 'agendamento'. É o que a
-- restrição no fim garante: nada de avaliação "de agendamento" sem agendamento.

alter table public.avaliacoes
  add column if not exists origem        text default 'agendamento',
  add column if not exists telefone_hash text,
  add column if not exists autor_nome    text,
  -- A prova do aceite fica na própria avaliação, e não numa tabela de
  -- consentimentos à parte: é ela que sustenta o texto se alguém contestar, e
  -- separar as duas coisas é como se perde a ligação entre a declaração e o
  -- que foi declarado.
  add column if not exists aceite_em     timestamptz,
  add column if not exists aceite_ip     inet,
  add column if not exists aceite_versao text;

update public.avaliacoes set origem = 'agendamento' where origem is null;

alter table public.avaliacoes
  alter column origem set not null,
  alter column agendamento_id drop not null,
  alter column paciente_id    drop not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'avaliacoes_origem_coerente') then
    alter table public.avaliacoes
      add constraint avaliacoes_origem_coerente check (
        (origem = 'agendamento' and agendamento_id is not null)
        or
        (origem = 'aberta' and telefone_hash is not null)
      );
  end if;
end $$;

-- Um número, uma avaliação por profissional. Sem isto, o mesmo telefone
-- confirmado uma vez poderia escrever dez vezes sobre o mesmo médico.
create unique index if not exists idx_avaliacao_unica_por_telefone
  on public.avaliacoes (medico_id, telefone_hash)
  where telefone_hash is not null;

comment on column public.avaliacoes.origem is
  'agendamento = veio do link de uma consulta realizada e paga (mostra "paciente verificado"); aberta = formulário público, só com telefone confirmado';
comment on column public.avaliacoes.telefone_hash is
  'Hash do telefone que confirmou o código. Nunca o número.';
comment on column public.avaliacoes.aceite_em is
  'Quando a pessoa marcou a declaração de que a avaliação é da própria experiência, sem incentivo e autorizada.';
comment on column public.avaliacoes.autor_nome is
  'Nome ou iniciais informados por quem avaliou sem conta. Aparece ao lado da avaliação.';


-- ---------------------------------------------------------------------------
-- Cadastro: marcar o perfil como verificado quando a conta nasce
-- ---------------------------------------------------------------------------
--
-- No cadastro o telefone é confirmado ANTES de a conta existir — a pessoa ainda
-- está preenchendo o formulário. Então nada pode ser marcado naquele momento.
--
-- Quem marca é este gatilho, quando o perfil é criado: ele procura uma
-- verificação confirmada, para o mesmo e-mail, feita na última hora. A decisão
-- é do banco e não do navegador, que é o ponto — se dependesse do cliente,
-- bastaria mandar `whatsapp_verificado: true` no cadastro para se declarar
-- verificado sem nunca ter recebido código nenhum.

alter table public.perfis_usuarios
  add column if not exists whatsapp_verificado_em timestamptz;

comment on column public.perfis_usuarios.whatsapp_verificado_em is
  'Quando a pessoa respondeu ao código enviado por WhatsApp. Nulo = número informado mas não confirmado.';

create or replace function public.marcar_whatsapp_verificado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is null then
    return new;
  end if;

  if exists (
    select 1
      from public.verificacoes_telefone v
     where v.email = lower(new.email)
       and v.finalidade = 'cadastro'
       and v.verificado_em is not null
       and v.verificado_em > now() - interval '1 hour'
  ) then
    new.whatsapp_verificado_em := now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_marcar_whatsapp_verificado on public.perfis_usuarios;
create trigger trg_marcar_whatsapp_verificado
before insert on public.perfis_usuarios
for each row execute function public.marcar_whatsapp_verificado();
