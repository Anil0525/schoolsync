-- SchoolSync: core schema + RLS (run in Supabase SQL Editor)
create extension if not exists pgcrypto;

create type user_role as enum ('admin','teacher','accountant','student','parent');

create table schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  udise_code text,
  address text,
  created_at timestamptz default now()
);

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  school_id uuid references schools(id),
  role user_role not null default 'student',
  full_name text,
  phone text,
  created_at timestamptz default now()
);

create table academic_years (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id),
  name text not null,
  start_date date, end_date date,
  is_current boolean default false
);

create table classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id),
  name text not null,
  sort_order int default 0
);

create table sections (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id),
  class_id uuid not null references classes(id) on delete cascade,
  name text not null,
  class_teacher_id uuid references profiles(id)
);

create table students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id),
  user_id uuid references profiles(id),
  admission_no text not null,
  full_name text not null,
  dob date,
  gender text,
  section_id uuid references sections(id),
  -- UDISE+ fields (finalize against the official template)
  social_category text,
  minority boolean default false,
  cwsn boolean default false,
  status text default 'active',
  created_at timestamptz default now(),
  unique (school_id, admission_no)
);

create table parent_student (
  parent_id uuid references profiles(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  primary key (parent_id, student_id)
);

create table attendance (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id),
  student_id uuid not null references students(id) on delete cascade,
  date date not null,
  status text not null check (status in ('present','absent','late','leave')),
  marked_by uuid references profiles(id),
  unique (student_id, date)
);

-- helpers
create or replace function current_school_id() returns uuid
language sql stable security definer set search_path = public
as $$ select school_id from profiles where id = auth.uid() $$;

create or replace function current_user_role() returns user_role
language sql stable security definer set search_path = public
as $$ select role from profiles where id = auth.uid() $$;

alter table schools enable row level security;
alter table profiles enable row level security;
alter table academic_years enable row level security;
alter table classes enable row level security;
alter table sections enable row level security;
alter table students enable row level security;
alter table parent_student enable row level security;
alter table attendance enable row level security;

create policy "own school" on schools for select using (id = current_school_id());
-- a user can always read their own profile; staff see the school's profiles
create policy "read profiles" on profiles for select
  using (id = auth.uid() or school_id = current_school_id());

do $$
declare t text;
begin
  foreach t in array array['academic_years','classes','sections'] loop
    execute format('create policy "read %1$s" on %1$s for select using (school_id = current_school_id())', t);
    execute format('create policy "admin write %1$s" on %1$s for all
      using (school_id = current_school_id() and current_user_role() = ''admin'')
      with check (school_id = current_school_id() and current_user_role() = ''admin'')', t);
  end loop;
end $$;

create policy "read students" on students for select using (
  school_id = current_school_id() and (
    current_user_role() in ('admin','teacher','accountant')
    or user_id = auth.uid()
    or id in (select student_id from parent_student where parent_id = auth.uid())
  )
);
create policy "admin write students" on students for all
  using (school_id = current_school_id() and current_user_role() = 'admin')
  with check (school_id = current_school_id() and current_user_role() = 'admin');

create policy "read parent_student" on parent_student for select
  using (parent_id = auth.uid() or current_user_role() in ('admin','teacher'));

create policy "read attendance" on attendance for select using (
  school_id = current_school_id() and (
    current_user_role() in ('admin','teacher')
    or student_id in (select id from students where user_id = auth.uid())
    or student_id in (select student_id from parent_student where parent_id = auth.uid())
  )
);
create policy "staff write attendance" on attendance for all
  using (school_id = current_school_id() and current_user_role() in ('admin','teacher'))
  with check (school_id = current_school_id() and current_user_role() in ('admin','teacher'));
