-- Batch 2a: exam schedule (for hall tickets) and certificates with a numbered register (safe to re-run)
-- Needs 011 (ss_student_school). Works with or without the principal role (matched as text).

create table if not exists ss_exam_schedule (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references ss_schools(id),
  title text not null,                       -- e.g. "Unit Test 1"
  class_id uuid not null references ss_classes(id) on delete cascade,
  subject_id uuid not null references ss_subjects(id) on delete cascade,
  exam_date date not null,
  start_time text,                           -- "10:00"
  end_time text,                             -- "12:00"
  created_at timestamptz not null default now(),
  unique (school_id, title, class_id, subject_id)
);
create index if not exists ss_exam_schedule_idx on ss_exam_schedule(school_id, class_id, title);

create table if not exists ss_certificates (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references ss_schools(id),
  cert_type text not null check (cert_type in ('transfer','character','bonafide','experience')),
  cert_no text not null,
  student_id uuid references ss_students(id) on delete set null,
  person_name text not null,
  details jsonb not null default '{}'::jsonb,
  issued_on date not null default current_date,
  issued_by uuid references ss_profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  unique (school_id, cert_no)
);
create index if not exists ss_certificates_idx on ss_certificates(school_id, created_at desc);

alter table ss_exam_schedule enable row level security;
alter table ss_certificates enable row level security;

drop policy if exists "read ss_exam_schedule" on ss_exam_schedule;
create policy "read ss_exam_schedule" on ss_exam_schedule for select using (school_id = ss_current_school_id());
drop policy if exists "admin write ss_exam_schedule" on ss_exam_schedule;
create policy "admin write ss_exam_schedule" on ss_exam_schedule for all
  using (school_id = ss_current_school_id() and ss_current_user_role()::text = 'admin')
  with check (school_id = ss_current_school_id() and ss_current_user_role()::text = 'admin');

-- certificates: admin and principal can read; nobody inserts directly (the function below numbers them)
drop policy if exists "read ss_certificates" on ss_certificates;
create policy "read ss_certificates" on ss_certificates for select
  using (school_id = ss_current_school_id() and ss_current_user_role()::text in ('admin','principal'));

create or replace function ss_issue_certificate(p_type text, p_student uuid, p_name text, p_details jsonb)
returns ss_certificates
language plpgsql security definer set search_path = public
as $$
declare
  sch uuid := ss_current_school_id();
  prefix text;
  yr text := to_char(current_date, 'YYYY');
  n int;
  rec ss_certificates;
begin
  if sch is null or ss_current_user_role()::text not in ('admin','principal') then
    raise exception 'Not allowed';
  end if;
  if p_type not in ('transfer','character','bonafide','experience') then
    raise exception 'Unknown certificate type';
  end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Name is required'; end if;
  if p_student is not null and ss_student_school(p_student) is distinct from sch then
    raise exception 'Student is not in your school';
  end if;
  prefix := case p_type when 'transfer' then 'TC' when 'character' then 'CC' when 'bonafide' then 'BC' else 'EC' end;
  perform pg_advisory_xact_lock(hashtext(sch::text || prefix || yr));
  select count(*) + 1 into n from ss_certificates where school_id = sch and cert_no like prefix || '/' || yr || '/%';
  insert into ss_certificates (school_id, cert_type, cert_no, student_id, person_name, details)
  values (sch, p_type, prefix || '/' || yr || '/' || lpad(n::text, 4, '0'), p_student, trim(p_name), coalesce(p_details, '{}'::jsonb))
  returning * into rec;
  return rec;
end $$;
revoke all on function ss_issue_certificate(text, uuid, text, jsonb) from public, anon;
grant execute on function ss_issue_certificate(text, uuid, text, jsonb) to authenticated;

notify pgrst, 'reload schema';
