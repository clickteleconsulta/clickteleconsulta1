-- =========================================================
-- Auditoria de eventos de autenticação (login, senha, e-mail, 2FA)
-- Gatilhos em auth.users / auth.mfa_factors — BLINDADOS (exception -> null)
-- para NUNCA quebrar a operação de autenticação.
-- =========================================================

create or replace function public.audit_auth_event()
returns trigger language plpgsql security definer set search_path to 'public' as $fn$
declare v_role text;
begin
  begin
    select role into v_role from perfis_usuarios where id = NEW.id;

    if NEW.last_sign_in_at is distinct from OLD.last_sign_in_at and NEW.last_sign_in_at is not null then
      insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, dados)
      values (NEW.id, v_role, 'auth.login', 'acesso', NEW.id::text, jsonb_build_object('em', NEW.last_sign_in_at));
    end if;

    if NEW.encrypted_password is distinct from OLD.encrypted_password then
      insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, dados)
      values (NEW.id, v_role, 'auth.senha_alterada', 'acesso', NEW.id::text, '{}'::jsonb);
    end if;

    if NEW.email is distinct from OLD.email then
      insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, dados)
      values (NEW.id, v_role, 'auth.email_alterado', 'acesso', NEW.id::text,
        jsonb_build_object('values', jsonb_build_object('email', jsonb_build_object('de', OLD.email, 'para', NEW.email))));
    end if;
  exception when others then
    null; -- auditoria nunca bloqueia o auth
  end;
  return NEW;
end; $fn$;

drop trigger if exists trg_audit_auth_user on auth.users;
create trigger trg_audit_auth_user after update on auth.users
for each row execute function public.audit_auth_event();

-- 2FA (MFA): ativação (fator verificado) e remoção
create or replace function public.audit_mfa_event()
returns trigger language plpgsql security definer set search_path to 'public' as $fn$
declare v_uid uuid; v_action text; v_factor text; v_role text;
begin
  begin
    if TG_OP = 'DELETE' then
      v_uid := OLD.user_id; v_action := 'auth.2fa_removido'; v_factor := OLD.factor_type::text;
    elsif TG_OP = 'UPDATE' and NEW.status::text = 'verified' and OLD.status::text is distinct from 'verified' then
      v_uid := NEW.user_id; v_action := 'auth.2fa_ativado'; v_factor := NEW.factor_type::text;
    else
      return coalesce(NEW, OLD);
    end if;
    select role into v_role from perfis_usuarios where id = v_uid;
    insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, dados)
    values (v_uid, v_role, v_action, 'acesso', v_uid::text, jsonb_build_object('fator', v_factor));
  exception when others then
    null;
  end;
  return coalesce(NEW, OLD);
end; $fn$;

drop trigger if exists trg_audit_mfa_upd on auth.mfa_factors;
create trigger trg_audit_mfa_upd after update on auth.mfa_factors
for each row execute function public.audit_mfa_event();
drop trigger if exists trg_audit_mfa_del on auth.mfa_factors;
create trigger trg_audit_mfa_del after delete on auth.mfa_factors
for each row execute function public.audit_mfa_event();

-- ---- RPC: separa a categoria 'acesso' (auth) de 'plataforma' ----
create or replace function public.admin_audit_feed(
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_action text default null,
  p_category text default 'all',
  p_search text default null,
  p_limit int default 50,
  p_offset int default 0
) returns table (
  id text, created_at timestamptz, category text, action text,
  actor_id uuid, actor_name text, actor_role text,
  entity_type text, entity_ref text, dados jsonb, total bigint
) language plpgsql security definer set search_path to 'public' as $fn$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
  with feed as (
    select ('ag_' || al.id::text) as id, al.created_at, 'agendamento'::text as category,
           al.acao as action, al.usuario_id as actor_id,
           'agendamento'::text as entity_type, ag.protocolo as entity_ref, al.dados
    from agendamento_logs al
    left join agendamentos ag on ag.id = al.agendamento_id
    union all
    select ('au_' || au.id::text), au.created_at,
           case when au.entity_type = 'acesso' then 'acesso' else 'plataforma' end,
           au.action, au.actor_id, au.entity_type, au.entity_id, au.dados
    from audit_logs au
    union all
    select ('ac_' || ac.id::text), ac.accepted_at, 'consentimento'::text,
           'aceite_' || ac.doc_type, ac.user_id, 'documento_legal'::text,
           ac.doc_title || ' v' || ac.doc_version,
           jsonb_build_object('ip', ac.ip_address, 'user_agent', ac.user_agent, 'versao', ac.doc_version)
    from aceites_legais ac
  ), filtered as (
    select f.*, coalesce(pu.full_name, '—') as actor_name, pu.role as actor_role
    from feed f
    left join perfis_usuarios pu on pu.id = f.actor_id
    where (p_from is null or f.created_at >= p_from)
      and (p_to is null or f.created_at <= p_to)
      and (p_category = 'all' or f.category = p_category)
      and (coalesce(p_action, '') = '' or f.action = p_action)
      and (coalesce(p_search, '') = '' or
           coalesce(pu.full_name, '') ilike '%' || p_search || '%' or
           coalesce(f.entity_ref, '') ilike '%' || p_search || '%' or
           f.action ilike '%' || p_search || '%')
  )
  select fi.id, fi.created_at, fi.category, fi.action, fi.actor_id,
         fi.actor_name, fi.actor_role, fi.entity_type, fi.entity_ref, fi.dados,
         count(*) over() as total
  from filtered fi
  order by fi.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 500)) offset greatest(0, coalesce(p_offset, 0));
end; $fn$;
