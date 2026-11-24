-- Batch 2b: document library with a private storage bucket (10 MB per file). Safe to re-run.
create table if not exists ss_documents (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references ss_schools(id),
  title text not null,
  category text not null default 'Other',
  audience text not null default 'all' check (audience in ('all','staff','parents','students')),
  file_path text not null unique,
  file_name text not null,
  file_size bigint,
  created_by uuid references ss_profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists ss_documents_idx on ss_documents(school_id, created_at desc);
alter table ss_documents enable row level security;

drop policy if exists "read ss_documents" on ss_documents;
create policy "read ss_documents" on ss_documents for select using (
  school_id = ss_current_school_id() and (
    ss_current_user_role()::text in ('admin','principal')
    or audience = 'all'
    or (audience = 'staff' and ss_current_user_role()::text in ('teacher','accountant'))
    or (audience = 'parents' and ss_current_user_role()::text = 'parent')
    or (audience = 'students' and ss_current_user_role()::text = 'student')
  )
);
drop policy if exists "write ss_documents" on ss_documents;
create policy "write ss_documents" on ss_documents for all
  using (school_id = ss_current_school_id() and ss_current_user_role()::text in ('admin','principal'))
  with check (school_id = ss_current_school_id() and ss_current_user_role()::text in ('admin','principal'));

-- private bucket, 10 MB limit
insert into storage.buckets (id, name, public, file_size_limit)
values ('ss-documents', 'ss-documents', false, 10485760)
on conflict (id) do update set public = false, file_size_limit = 10485760;

-- files live under <school_id>/..., a file can be read only if its ss_documents row is visible to the caller
drop policy if exists "ss_documents read files" on storage.objects;
create policy "ss_documents read files" on storage.objects for select to authenticated
  using (bucket_id = 'ss-documents' and exists (select 1 from ss_documents d where d.file_path = storage.objects.name));

drop policy if exists "ss_documents upload files" on storage.objects;
create policy "ss_documents upload files" on storage.objects for insert to authenticated
  with check (bucket_id = 'ss-documents' and ss_current_user_role()::text in ('admin','principal')
              and (storage.foldername(name))[1] = ss_current_school_id()::text);

drop policy if exists "ss_documents delete files" on storage.objects;
create policy "ss_documents delete files" on storage.objects for delete to authenticated
  using (bucket_id = 'ss-documents' and ss_current_user_role()::text in ('admin','principal')
         and (storage.foldername(name))[1] = ss_current_school_id()::text);

notify pgrst, 'reload schema';
