create or replace function public.notify_appointment_email()
returns trigger language plpgsql security definer set search_path to 'public','extensions' as $fn$
declare
  v_url text := 'https://fnzvopspcoefzybtmwlg.supabase.co/functions/v1/send-appointment-email';
  v_hdr jsonb := jsonb_build_object('Content-Type','application/json','x-email-token','2c34bb1be0a9b0382c73cdd82fb82f92ffc6c75cac8f723b');
begin
  if NEW.pagamento_status = 'pago' and OLD.pagamento_status is distinct from 'pago' then
    perform net.http_post(url:=v_url, headers:=v_hdr, body:=jsonb_build_object('appointmentId', NEW.id, 'event','confirmado'));
  end if;
  if NEW.status = 'cancelado' and OLD.status is distinct from 'cancelado' then
    perform net.http_post(url:=v_url, headers:=v_hdr, body:=jsonb_build_object('appointmentId', NEW.id, 'event','cancelado'));
  end if;
  if NEW.pagamento_status = 'reembolsado' and OLD.pagamento_status is distinct from 'reembolsado' then
    perform net.http_post(url:=v_url, headers:=v_hdr, body:=jsonb_build_object('appointmentId', NEW.id, 'event','reembolsado'));
  end if;
  return NEW;
exception when others then
  return NEW;
end; $fn$;

drop trigger if exists trg_notify_appointment_email on public.agendamentos;
create trigger trg_notify_appointment_email after update on public.agendamentos
for each row execute function public.notify_appointment_email();
