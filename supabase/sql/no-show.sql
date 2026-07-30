create or replace function public.medico_marcar_nao_comparecimento(p_agendamento_id uuid)
returns table(success boolean, message text) language plpgsql security definer set search_path to 'public','extensions' as $fn$
declare v_ag record; v_med uuid; v_ts timestamptz;
begin
  select m.id into v_med from medicos m where m.user_id = auth.uid();
  if v_med is null then return query select false, 'Acesso negado: usuario nao e medico'; return; end if;
  select * into v_ag from agendamentos a where a.id = p_agendamento_id and a.medico_id = v_med;
  if v_ag is null then return query select false, 'Agendamento nao encontrado'; return; end if;
  if v_ag.status in ('realizado','atendido','concluida') then return query select false, 'Consulta ja consta como realizada'; return; end if;
  if v_ag.status in ('cancelado','expirado','nao_compareceu') then return query select false, 'Nao aplicavel a este agendamento'; return; end if;
  if v_ag.pagamento_status <> 'pago' then return query select false, 'So agendamentos pagos podem ser marcados como nao comparecimento'; return; end if;
  v_ts := coalesce(v_ag.horario_inicio, v_ag.data_hora);
  if v_ts is null or now() < v_ts then return query select false, 'So e possivel marcar apos o horario da consulta'; return; end if;

  update agendamentos set status='nao_compareceu', refund_percent=0, updated_at=now() where id=p_agendamento_id;
  insert into agendamento_logs (agendamento_id, acao, dados, usuario_id)
  values (p_agendamento_id, 'medico_marcou_nao_comparecimento',
    jsonb_build_object('status_anterior', v_ag.status, 'horario', v_ts), auth.uid());
  if v_ag.patient_id is not null then
    insert into notifications (user_id, title, body, tipo, data)
    values (v_ag.patient_id, 'Consulta registrada como não comparecimento',
      'O médico registrou a sua ausência no horário agendado. Conforme a Política de Cancelamento, não há reembolso em caso de não comparecimento.',
      'no_show', jsonb_build_object('agendamento_id', p_agendamento_id));
  end if;
  return query select true, 'Nao comparecimento registrado';
end; $fn$;
