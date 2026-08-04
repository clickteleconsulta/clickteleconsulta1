-- Corrige o horário que trava depois de uma tentativa de agendamento não paga.
--
-- SINTOMA
-- O paciente abria o checkout, não pagava, e depois o mesmo horário aparecia
-- livre na tela mas recusava o agendamento com "Este horário já está reservado".
--
-- CAUSA
-- O gatilho trg_agendamentos_buffer_time contava como ocupada qualquer linha do
-- mesmo médico e horário com `status <> 'cancelado'`. A rotina de expiração
-- marca as tentativas não pagas como **'expirado_pagamento'**, não como
-- 'cancelado' — então elas continuavam ocupando o horário para sempre.
--
-- A tela nunca concordou com isso: tanto getBookedSlots quanto a listagem de
-- médicos só contam como ocupado quem tem `pagamento_status = 'pago'`. Era um
-- desacordo entre o que o site mostrava e o que o banco aceitava.
--
-- REGRA CORRETA
-- Pendente não bloqueia — é decisão de produto, e está escrita em
-- AppointmentsContext.getBookedSlots. Quem disputa o horário ganha pagando, e a
-- corrida entre dois pagamentos é barrada pelo índice único
-- idx_agendamentos_slot_pago, que cobre exatamente esta condição:
--
--   UNIQUE (medico_id, horario_inicio)
--   WHERE pagamento_status = 'pago' AND status <> ALL ('{cancelado,expirado}')
--
-- O gatilho agora aplica a mesma regra, só que na inserção, para o paciente
-- receber um erro legível em vez da violação de índice.
--
-- Apesar do nome, o gatilho nunca implementou buffer entre consultas: compara
-- horario_inicio exato, sem intervalo. O nome foi mantido para não quebrar
-- referências.

create or replace function public.trg_agendamentos_buffer_time()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  ocupados int;
begin
  select count(*) into ocupados
  from public.agendamentos a
  where a.medico_id = new.medico_id
    and a.horario_inicio = new.horario_inicio
    and a.id is distinct from new.id
    and a.pagamento_status = 'pago'
    and a.status not in ('cancelado', 'expirado', 'expirado_pagamento');

  if ocupados > 0 then
    raise exception 'Este horario ja esta reservado. Escolha outro horario.';
  end if;

  return new;
end;
$fn$;

-- O gatilho em si não muda; fica aqui para o arquivo ser auto-suficiente.
-- CREATE TRIGGER trg_agendamentos_buffer_time
--   BEFORE INSERT OR UPDATE ON public.agendamentos
--   FOR EACH ROW EXECUTE FUNCTION trg_agendamentos_buffer_time();

-- CONFERÊNCIA (aplicada em 04/08/2026, com rollback ao fim de cada caso)
--   horário com tentativa não paga (expirado_pagamento) → inserção aceita
--   horário com consulta paga (atendido)                → recusada pelo gatilho
--   horário cancelado                                   → inserção aceita
