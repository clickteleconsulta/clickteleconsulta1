create table if not exists public.bloqueios_agenda (
  id uuid primary key default gen_random_uuid(),
  medico_id uuid not null references public.medicos(id) on delete cascade,
  inicio timestamptz not null,
  fim timestamptz not null,
  dia_inteiro boolean not null default true,
  motivo text,
  created_at timestamptz not null default now()
);
create index if not exists idx_bloqueios_medico on public.bloqueios_agenda (medico_id, inicio);
alter table public.bloqueios_agenda enable row level security;

-- Leitura pública: o booking (inclusive visitante) precisa esconder os horários bloqueados.
drop policy if exists "Bloqueios visiveis para agendamento" on public.bloqueios_agenda;
create policy "Bloqueios visiveis para agendamento" on public.bloqueios_agenda for select using (true);

-- Médico dono gerencia os próprios bloqueios.
drop policy if exists "Medico gerencia seus bloqueios" on public.bloqueios_agenda;
create policy "Medico gerencia seus bloqueios" on public.bloqueios_agenda for all
  using (exists (select 1 from medicos m where m.id = bloqueios_agenda.medico_id and m.user_id = auth.uid()))
  with check (exists (select 1 from medicos m where m.id = bloqueios_agenda.medico_id and m.user_id = auth.uid()));
