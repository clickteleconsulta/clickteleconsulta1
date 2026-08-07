-- ============================================================
-- Contagem dos passos do funil (medição própria, sem depender de cookie)
-- Rodar uma vez no SQL Editor do Supabase.
-- ============================================================
--
-- POR QUE ISTO EXISTE
-- GA4, Meta Pixel e TikTok só carregam depois que a pessoa aceita o banner de
-- cookies — está certo assim pela LGPD, e é caro para a medição: quem recusa ou
-- ignora o banner some da conta. Pior, nenhum dos três recebia evento dos
-- passos do meio do funil. O resultado prático é que dava para saber que o
-- funil vaza, mas não ONDE. Sem isso, toda otimização daqui para frente é
-- palpite.
--
-- POR QUE NÃO PRECISA DE CONSENTIMENTO
-- Não é rastreio de terceiro, não segue ninguém entre sites e não guarda dado
-- pessoal: entra o nome do passo e um identificador aleatório que vive só
-- enquanto a aba está aberta (sessionStorage), morre quando ela fecha e não é
-- ligado a usuário, e-mail, CPF ou IP. É contagem agregada de uso do próprio
-- serviço. Não misture nada identificável aqui — é essa fronteira que mantém a
-- tabela fora do regime de dado pessoal e evita declarar outra finalidade na
-- Política de Privacidade.
--
-- QUEM PODE O QUÊ
-- Ninguém escreve direto na tabela. A gravação passa pela função
-- registrar_etapa_funil, que só aceita nome de etapa da lista fixa abaixo.
-- Diferente do log de erro, este número vira decisão de negócio: tabela aberta
-- para insert livre é tabela que qualquer um envenena, e um funil envenenado é
-- pior que funil nenhum, porque parece verdade. Ler, só admin.

create table if not exists public.eventos_funil (
  id         bigint generated always as identity primary key,
  criado_em  timestamptz not null default now(),
  sessao     text        not null,   -- aleatório, por aba, sem vínculo com pessoa
  etapa      text        not null
);

comment on table public.eventos_funil is
  'Passos do funil alcançados por sessão anônima. Sem dado pessoal: só o nome do passo e um id aleatório de aba.';

create index if not exists eventos_funil_criado_em_idx
  on public.eventos_funil (criado_em desc);

-- A leitura interessante é sempre "quantas sessões distintas chegaram na etapa
-- X", então o índice é por etapa e sessão.
create index if not exists eventos_funil_etapa_sessao_idx
  on public.eventos_funil (etapa, sessao);

alter table public.eventos_funil enable row level security;

-- Sem política de insert: nem anon nem authenticated escrevem direto.
-- Sem política de select para anon: o PostgREST devolve vazio.
drop policy if exists "admin lê funil" on public.eventos_funil;
create policy "admin lê funil"
  on public.eventos_funil for select
  using (public.is_admin());

revoke all on table public.eventos_funil from anon, authenticated;

-- ------------------------------------------------------------
-- GRAVAÇÃO
-- Única porta de entrada. Recusa etapa fora da lista em silêncio: medição nunca
-- pode virar erro na tela de quem está tentando agendar.
-- ------------------------------------------------------------
create or replace function public.registrar_etapa_funil(p_sessao text, p_etapa text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_sessao is null or length(p_sessao) < 1 or length(p_sessao) > 64 then
    return;
  end if;

  if p_etapa not in (
    'home',                  -- 1. abriu o site
    'busca',                 -- 2. abriu a lista de profissionais
    'busca_com_resultado',   --    a lista voltou com alguém
    'busca_sem_resultado',   --    a lista voltou vazia — aqui mora a falta de oferta
    'vaga_em_2h',            --    havia horário livre nas próximas 2h: a métrica-norte
    'perfil_medico',         -- 3. abriu o perfil de um profissional
    'horario_escolhido',     --    clicou num horário
    'cadastro_iniciado',     -- 4. abriu o formulário de criar conta
    'cadastro_concluido',    --    criou a conta
    'checkout',              -- 5. chegou na tela de confirmar
    'guia_criada'            -- 6. gerou a guia; o pagamento em si vem do asaas-webhook
  ) then
    return;
  end if;

  insert into public.eventos_funil (sessao, etapa) values (p_sessao, p_etapa);
end;
$$;

revoke all on function public.registrar_etapa_funil(text, text) from public;
grant execute on function public.registrar_etapa_funil(text, text) to anon, authenticated;

-- ------------------------------------------------------------
-- LEITURA
-- O funil em uma consulta só: sessões distintas por etapa, na ordem em que a
-- pessoa passa por elas, com a queda em relação ao passo anterior.
-- ------------------------------------------------------------
create or replace function public.funil_resumo(dias int default 30)
returns table (passo int, etapa text, sessoes bigint, queda_pct numeric)
language sql
security definer
set search_path = public
as $$
  with ordem(passo, nome) as (
    values (1, 'home'), (2, 'busca'), (3, 'busca_com_resultado'),
           (4, 'perfil_medico'), (5, 'horario_escolhido'),
           (6, 'cadastro_iniciado'), (7, 'cadastro_concluido'),
           (8, 'checkout'), (9, 'guia_criada')
  ),
  contagem as (
    select o.passo,
           o.nome as etapa,
           count(distinct e.sessao) as sessoes
      from ordem o
      left join public.eventos_funil e
        on e.etapa = o.nome
       and e.criado_em > now() - (dias || ' days')::interval
     group by o.passo, o.nome
  )
  select c.passo,
         c.etapa,
         c.sessoes,
         case
           when lag(c.sessoes) over (order by c.passo) > 0
           then round(100.0 * (lag(c.sessoes) over (order by c.passo) - c.sessoes)
                      / lag(c.sessoes) over (order by c.passo), 1)
         end as queda_pct
    from contagem c
   order by c.passo;
$$;

revoke all on function public.funil_resumo(int) from public, anon, authenticated;
-- Admin lê pelo painel; para consulta manual, rode `select * from funil_resumo(30);`
-- logado como service_role no SQL Editor.

-- ------------------------------------------------------------
-- LIQUIDEZ — a métrica-norte
-- De cada cem pessoas que abriram a lista de profissionais, quantas viram
-- horário livre nas próximas duas horas. Abaixo de 70%, o problema é oferta de
-- médico, não página: nenhuma otimização de texto ou botão conserta ausência de
-- vaga, e mídia paga em cima disso só acelera a perda.
-- ------------------------------------------------------------
create or replace function public.liquidez(dias int default 30)
returns table (buscas bigint, com_vaga_2h bigint, pct numeric)
language sql
security definer
set search_path = public
as $$
  with janela as (
    select sessao, etapa
      from public.eventos_funil
     where criado_em > now() - (dias || ' days')::interval
  ),
  b as (select count(distinct sessao) n from janela where etapa = 'busca'),
  v as (select count(distinct sessao) n from janela where etapa = 'vaga_em_2h')
  select b.n,
         v.n,
         case when b.n > 0 then round(100.0 * v.n / b.n, 1) end
    from b, v;
$$;

revoke all on function public.liquidez(int) from public, anon, authenticated;

-- ------------------------------------------------------------
-- TETO DE VOLUME
-- Uma linha por passo por sessão cresce rápido. Noventa dias é bastante para
-- comparar antes e depois de uma mudança; o resto é peso morto.
-- ------------------------------------------------------------
create or replace function public.limpar_eventos_funil(dias int default 90)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare apagados integer;
begin
  delete from public.eventos_funil where criado_em < now() - (dias || ' days')::interval;
  get diagnostics apagados = row_count;
  return apagados;
end;
$$;

revoke all on function public.limpar_eventos_funil(int) from public, anon, authenticated;

-- ------------------------------------------------------------
-- COMO LER
--   select * from funil_resumo(30);   -- onde o funil perde gente
--   select * from liquidez(30);       -- % de buscas que acharam vaga em 2h
-- Rodar no SQL Editor do Supabase, que executa como service_role.
--
-- O QUE NÃO ESTÁ AQUI
-- A compra. Ela é gravada pelo asaas-webhook, porque o Pix pode ser pago horas
-- depois e de outro aparelho — o navegador nunca volta para contar. Para fechar
-- o funil de ponta a ponta, cruze 'guia_criada' com os agendamentos pagos no
-- mesmo período.
-- ------------------------------------------------------------
