-- =========================================================
-- Log central de auditoria (imutável) + gatilhos + RPC unificada
-- =========================================================

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_id uuid,
  actor_role text,
  action text not null,
  entity_type text,
  entity_id text,
  dados jsonb not null default '{}'::jsonb
);
alter table public.audit_logs enable row level security;
-- Só admin lê. Ninguém insere/edita/apaga via API: writes só pelos gatilhos
-- SECURITY DEFINER (que ignoram RLS). Sem policy de INSERT/UPDATE/DELETE = imutável.
drop policy if exists "Admin ve audit_logs" on public.audit_logs;
create policy "Admin ve audit_logs" on public.audit_logs for select using (public.is_admin());
create index if not exists idx_audit_logs_created on public.audit_logs (created_at desc);
create index if not exists idx_audit_logs_entity on public.audit_logs (entity_type, created_at desc);

-- Gatilho genérico: registra mudanças sem vazar PII/bancário.
-- TG_ARGV[0] = rótulo da entidade; TG_ARGV[1] = campos cujos VALORES podem ser capturados
-- (para tabelas sensíveis, passar '' → registra só os NOMES dos campos alterados).
create or replace function public.audit_row_change()
returns trigger language plpgsql security definer set search_path to 'public' as $fn$
declare
  v_entity text := TG_ARGV[0];
  v_fields text[] := case when coalesce(TG_ARGV[1], '') = '' then array[]::text[] else string_to_array(TG_ARGV[1], ',') end;
  v_actor uuid := auth.uid();
  v_role text;
  v_newj jsonb;
  v_oldj jsonb;
  v_changed text[];
  v_vals jsonb := '{}'::jsonb;
  v_k text;
begin
  if v_actor is not null then
    select role into v_role from perfis_usuarios where id = v_actor;
  end if;

  if TG_OP = 'DELETE' then
    v_oldj := to_jsonb(OLD); v_newj := v_oldj;
  elsif TG_OP = 'INSERT' then
    v_newj := to_jsonb(NEW);
  else
    v_newj := to_jsonb(NEW); v_oldj := to_jsonb(OLD);
    select array_agg(k) into v_changed
    from jsonb_object_keys(v_newj) as k
    where (v_newj->k) is distinct from (v_oldj->k)
      and k not in ('updated_at', 'created_at');
    if v_changed is null then return NEW; end if;
  end if;

  foreach v_k in array v_fields loop
    if TG_OP = 'UPDATE' then
      if (v_newj->v_k) is distinct from (v_oldj->v_k) then
        v_vals := v_vals || jsonb_build_object(v_k, jsonb_build_object('de', v_oldj->v_k, 'para', v_newj->v_k));
      end if;
    elsif TG_OP = 'INSERT' then
      v_vals := v_vals || jsonb_build_object(v_k, v_newj->v_k);
    else
      v_vals := v_vals || jsonb_build_object(v_k, v_oldj->v_k);
    end if;
  end loop;

  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, dados)
  values (
    v_actor, v_role, v_entity || '.' || lower(TG_OP), v_entity,
    coalesce(v_newj->>'id', v_newj->>'user_id', v_oldj->>'id', v_oldj->>'user_id'),
    jsonb_build_object('op', lower(TG_OP), 'changed', coalesce(to_jsonb(v_changed), '[]'::jsonb), 'values', v_vals)
  );

  if TG_OP = 'DELETE' then return OLD; else return NEW; end if;
end; $fn$;

-- ---- Gatilhos nas tabelas sensíveis ----

-- Médicos: status/publicação/preço/especialidade/taxa
drop trigger if exists trg_audit_medicos on public.medicos;
create trigger trg_audit_medicos after update on public.medicos
for each row when (
  old.status is distinct from new.status
  or old.specialty is distinct from new.specialty
  or old.price_in_cents is distinct from new.price_in_cents
  or old.is_public is distinct from new.is_public
  or old.is_active is distinct from new.is_active
  or old.payment_settings is distinct from new.payment_settings)
execute function public.audit_row_change('medico', 'status,specialty,price_in_cents,is_public,is_active,payment_settings');

-- Perfis: mudança de papel (privilégio) — evento crítico
drop trigger if exists trg_audit_perfil_role on public.perfis_usuarios;
create trigger trg_audit_perfil_role after update on public.perfis_usuarios
for each row when (old.role is distinct from new.role)
execute function public.audit_row_change('perfil', 'role');

-- Saques: solicitação e mudança de status
drop trigger if exists trg_audit_saques_ins on public.saques;
create trigger trg_audit_saques_ins after insert on public.saques
for each row execute function public.audit_row_change('saque', 'status,valor,metodo_pagamento');
drop trigger if exists trg_audit_saques_upd on public.saques;
create trigger trg_audit_saques_upd after update on public.saques
for each row when (old.status is distinct from new.status)
execute function public.audit_row_change('saque', 'status,valor,metodo_pagamento');

-- Configurações da plataforma (taxa, manutenção, regras)
drop trigger if exists trg_audit_config on public.configuracoes_site;
create trigger trg_audit_config after update on public.configuracoes_site
for each row when (old.settings is distinct from new.settings)
execute function public.audit_row_change('configuracao', 'settings');

-- Documentos legais (versão/ativação)
drop trigger if exists trg_audit_legal_ins on public.platform_legal_documents;
create trigger trg_audit_legal_ins after insert on public.platform_legal_documents
for each row execute function public.audit_row_change('documento_legal', 'type,version,is_active,title');
drop trigger if exists trg_audit_legal_upd on public.platform_legal_documents;
create trigger trg_audit_legal_upd after update on public.platform_legal_documents
for each row execute function public.audit_row_change('documento_legal', 'type,version,is_active,title');

-- Dados bancários: SENSÍVEL — registra só os campos alterados, sem valores
drop trigger if exists trg_audit_bancarios_ins on public.medico_dados_bancarios;
create trigger trg_audit_bancarios_ins after insert on public.medico_dados_bancarios
for each row execute function public.audit_row_change('dados_bancarios', '');
drop trigger if exists trg_audit_bancarios_upd on public.medico_dados_bancarios;
create trigger trg_audit_bancarios_upd after update on public.medico_dados_bancarios
for each row execute function public.audit_row_change('dados_bancarios', '');

-- Procedimentos: preço/nome/principal
drop trigger if exists trg_audit_proc on public.procedimentos;
create trigger trg_audit_proc after update on public.procedimentos
for each row when (old.preco is distinct from new.preco or old.nome is distinct from new.nome or old.principal is distinct from new.principal)
execute function public.audit_row_change('procedimento', 'preco,nome,principal');

-- Especialidades: cadastro/edição/remoção
drop trigger if exists trg_audit_esp_ins on public.especialidades;
create trigger trg_audit_esp_ins after insert on public.especialidades
for each row execute function public.audit_row_change('especialidade', 'nome,ativo,ordem');
drop trigger if exists trg_audit_esp_upd on public.especialidades;
create trigger trg_audit_esp_upd after update on public.especialidades
for each row execute function public.audit_row_change('especialidade', 'nome,ativo,ordem');
drop trigger if exists trg_audit_esp_del on public.especialidades;
create trigger trg_audit_esp_del after delete on public.especialidades
for each row execute function public.audit_row_change('especialidade', 'nome,ativo,ordem');

-- ---- RPC unificada: agendamentos + plataforma + consentimentos ----
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
    select ('au_' || au.id::text), au.created_at, 'plataforma'::text,
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

grant execute on function public.admin_audit_feed(timestamptz, timestamptz, text, text, text, int, int) to authenticated;
