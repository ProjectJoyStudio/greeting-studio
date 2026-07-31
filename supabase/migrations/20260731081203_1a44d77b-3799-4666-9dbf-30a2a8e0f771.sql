alter table public.live_card_animations
  add column if not exists final_bucket text,
  add column if not exists final_path text,
  add column if not exists final_mime text,
  add column if not exists final_has_text boolean not null default false,
  add column if not exists finalized_at timestamptz;

create policy "Users read own live card videos"
on storage.objects for select to authenticated
using (bucket_id = 'live-greeting-card-videos'
  and (((auth.uid())::text = (storage.foldername(name))[1]) or is_admin(auth.uid())));

create policy "Users write own live card videos"
on storage.objects for insert to authenticated
with check (bucket_id = 'live-greeting-card-videos'
  and ((auth.uid())::text = (storage.foldername(name))[1]));

create policy "Users update own live card videos"
on storage.objects for update to authenticated
using (bucket_id = 'live-greeting-card-videos'
  and ((auth.uid())::text = (storage.foldername(name))[1]))
with check (bucket_id = 'live-greeting-card-videos'
  and ((auth.uid())::text = (storage.foldername(name))[1]));