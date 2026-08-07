-- Onde o atendimento aconteceu
-- ============================
--
-- A avaliação aberta aceita relato de consulta que não passou pela plataforma —
-- e aí "teleconsulta" e "presencial" são experiências diferentes o bastante para
-- que a nota signifique coisas diferentes. Quem lê precisa saber de qual se
-- trata; sem isso, uma nota baixa por sala de espera cheia se confunde com uma
-- nota baixa por chamada que caiu.
--
-- Nulo em avaliação vinda de agendamento nosso: ali sempre foi teleconsulta, e
-- perguntar seria pedir à pessoa que confirmasse algo que já sabemos.

alter table public.avaliacoes
  add column if not exists local_atendimento text
    check (local_atendimento in ('teleconsulta', 'presencial'));

comment on column public.avaliacoes.local_atendimento is
  'Só para avaliação de origem "aberta": onde a pessoa foi atendida. Nulo quando veio de agendamento da plataforma (sempre teleconsulta).';
