insert into storage.buckets (id, name, public) values ('social','social', true)
on conflict (id) do update set public = true;

drop policy if exists "social leitura publica" on storage.objects;
create policy "social leitura publica" on storage.objects for select using (bucket_id = 'social');

drop policy if exists "social admin escreve" on storage.objects;
create policy "social admin escreve" on storage.objects for insert to authenticated with check (bucket_id = 'social' and public.is_admin());

drop policy if exists "social admin apaga" on storage.objects;
create policy "social admin apaga" on storage.objects for delete to authenticated using (bucket_id = 'social' and public.is_admin());
