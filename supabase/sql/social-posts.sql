create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  plataforma text not null default 'ambos' check (plataforma in ('instagram','facebook','ambos')),
  tipo text not null default 'feed' check (tipo in ('feed','story')),
  image_url text not null,
  caption text,
  scheduled_at timestamptz not null default now(),
  status text not null default 'agendado' check (status in ('agendado','publicado','erro','pausado')),
  published_at timestamptz,
  ig_media_id text,
  fb_post_id text,
  erro text,
  tentativas int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.social_posts enable row level security;
drop policy if exists "Admin gerencia social_posts" on public.social_posts;
create policy "Admin gerencia social_posts" on public.social_posts for all using (public.is_admin()) with check (public.is_admin());
create index if not exists idx_social_posts_fila on public.social_posts (status, scheduled_at);
