-- Ensure audio-memories bucket exists for storing uploaded audio
insert into storage.buckets (id, name, public)
values ('audio-memories', 'audio-memories', true)
on conflict (id) do nothing;

-- Allow public read access to audio files
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public read access for audio memories'
  ) then
    create policy "Public read access for audio memories"
      on storage.objects
      for select
      using (bucket_id = 'audio-memories');
  end if;
end $$;

-- Allow anyone to upload audio (anonymous exhibition use case)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public upload access for audio memories'
  ) then
    create policy "Public upload access for audio memories"
      on storage.objects
      for insert
      with check (bucket_id = 'audio-memories');
  end if;
end $$;

-- Allow updates to audio files (needed for upsert/rename scenarios)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public update access for audio memories'
  ) then
    create policy "Public update access for audio memories"
      on storage.objects
      for update
      using (bucket_id = 'audio-memories')
      with check (bucket_id = 'audio-memories');
  end if;
end $$;

-- Allow deletions (so memories can be removed cleanly)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public delete access for audio memories'
  ) then
    create policy "Public delete access for audio memories"
      on storage.objects
      for delete
      using (bucket_id = 'audio-memories');
  end if;
end $$;

