drop policy if exists "memory book demo admin read" on storage.objects;
create policy "memory book demo admin read" on storage.objects
  for select to authenticated
  using (bucket_id = 'memory-book-demo' and public.is_admin(auth.uid()));

drop policy if exists "memory book demo admin write" on storage.objects;
create policy "memory book demo admin write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'memory-book-demo' and public.is_admin(auth.uid()));

drop policy if exists "memory book demo admin update" on storage.objects;
create policy "memory book demo admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'memory-book-demo' and public.is_admin(auth.uid()));

drop policy if exists "memory book demo admin delete" on storage.objects;
create policy "memory book demo admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'memory-book-demo' and public.is_admin(auth.uid()));