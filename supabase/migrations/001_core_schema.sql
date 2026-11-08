-- SchoolSync: core schema + RLS (all objects prefixed ss_ so it can share a Supabase project) (run in Supabase SQL Editor)
create extension if not exists pgcrypto;

create type ss_user_role as enum ('admin','teacher','accountant','student','parent');

create table ss_schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  udise_code text,
  address text,
  created_at timestamptz default now()
);

create table ss_profiles (
  id uuid primary key references auth.users on delete cascade,
  school_id uuid references ss_schools(id),
  role ss_user_role not null default 'student',
  full_name text,
  phone text,
  created_at timestamptz default now()
);

create table ss_academic_years (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references ss_schools(id),
  name text not null,
  start_date date, end_date date,
  is_current boolean default false
);

create table ss_classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references ss_schools(id),
  name text not null,
  sort_order int default 0
);

create table ss_sections (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references ss_schools(id),
  class_id uuid not null references ss_classes(id) on delete cascade,
  name text not null,
  class_teacher_id uuid references ss_profiles(id)
);

create table ss_students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references ss_schools(id),
  user_id uuid references ss_profiles(id),
  admission_no text not null,
  full_name text not null,
  dob date,
  gender text,
  section_id uuid references ss_sections(id),
  -- UDISE+ fields (finalize against the official template)
  social_category text,
  minority boolean default false,
  cwsn boolean default false,
  status text default 'active',
  created_at timestamptz default now(),
  unique (school_id, admission_no)
);

create table ss_parent_student (
  parent_id uuid references ss_profiles(id) on delete cascade,
  student_id uuid references ss_students(id) on delete cascade,
  primary key (parent_id, student_id)
);

create table ss_attendance (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references ss_schools(id),
  student_id uuid not null references ss_students(id) on delete cascade,
  date date not null,
  status text not null check (status in ('present','absent','late','leave')),
  marked_by uuid references ss_profiles(id),
  unique (student_id, date)
);

-- helpers
create or replace function ss_current_school_id() returns uuid
language sql stable security definer set search_path = public
as $$ select school_id from ss_profiles where id = auth.uid() $$;

create or replace function ss_current_user_role() returns ss_user_role
language sql stable security definer set search_path = public
as $$ select role from ss_profiles where id = auth.uid() $$;

alter table ss_schools enable row level security;
alter table ss_profiles enable row level security;
alter table ss_academic_years enable row level security;
alter table ss_classes enable row level security;
alter table ss_sections enable row level security;
alter table ss_students enable row level security;
alter table ss_parent_student enable row level security;
alter table ss_attendance enable row level security;

create policy "own school" on ss_schools for select using (id = ss_current_school_id());
-- a user can always read their own profile; staff see the school's ss_profiles
create policy "read ss_profiles" on ss_profiles for select
  using (id = auth.uid() or school_id = ss_current_school_id());

do $$
declare t text;
begin
  foreach t in array array['ss_academic_years','ss_classes','ss_sections'] loop
    execute format('create policy "read %1$s" on %1$s for select using (school_id = ss_current_school_id())', t);
    execute format('create policy "admin write %1$s" on %1$s for all
      using (school_id = ss_current_school_id() and ss_current_user_role() = ''admin'')
      with check (school_id = ss_current_school_id() and ss_current_user_role() = ''admin'')', t);
  end loop;
end $$;

create policy "read ss_students" on ss_students for select using (
  school_id = ss_current_school_id() and (
    ss_current_user_role() in ('admin','teacher','accountant')
    or user_id = auth.uid()
    or id in (select student_id from ss_parent_student where parent_id = auth.uid())
  )
);
create policy "admin write ss_students" on ss_students for all
  using (school_id = ss_current_school_id() and ss_current_user_role() = 'admin')
  with check (school_id = ss_current_school_id() and ss_current_user_role() = 'admin');

create policy "read ss_parent_student" on ss_parent_student for select
  using (parent_id = auth.uid() or ss_current_user_role() in ('admin','teacher'));

create policy "read ss_attendance" on ss_attendance for select using (
  school_id = ss_current_school_id() and (
    ss_current_user_role() in ('admin','teacher')
    or student_id in (select id from ss_students where user_id = auth.uid())
    or student_id in (select student_id from ss_parent_student where parent_id = auth.uid())
  )
);
create policy "staff write ss_attendance" on ss_attendance for all
  using (school_id = ss_current_school_id() and ss_current_user_role() in ('admin','teacher'))
  with check (school_id = ss_current_school_id() and ss_current_user_role() in ('admin','teacher'));
