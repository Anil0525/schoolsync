-- Announcements and homework (run in Supabase SQL Editor)
create table ss_announcements (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references ss_schools(id),
  title text not null,
  body text not null,
  audience text not null default 'all' check (audience in ('all','students','parents','teachers')),
  section_id uuid references ss_sections(id) on delete cascade, -- null = whole school
  created_by uuid references ss_profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table ss_homework (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references ss_schools(id),
  section_id uuid not null references ss_sections(id) on delete cascade,
  subject_id uuid references ss_subjects(id) on delete set null,
  title text not null,
  details text,
  due_date date not null,
  created_by uuid references ss_profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create index ss_announcements_school_idx on ss_announcements(school_id, created_at desc);
create index ss_homework_section_idx on ss_homework(section_id, due_date);

alter table ss_announcements enable row level security;
alter table ss_homework enable row level security;

-- Announcements: staff see all; students/parents see their audience, for the whole school or their own class
create policy "read ss_announcements" on ss_announcements for select using (
  school_id = ss_current_school_id() and (
    ss_current_user_role() in ('admin','teacher','accountant')
    or (ss_current_user_role() = 'student' and audience in ('all','students')
        and (section_id is null or section_id in (select section_id from ss_students where user_id = auth.uid())))
    or (ss_current_user_role() = 'parent' and audience in ('all','parents')
        and (section_id is null or section_id in (
          select s.section_id from ss_students s join ss_parent_student ps on ps.student_id = s.id where ps.parent_id = auth.uid())))
  )
);
create policy "staff insert ss_announcements" on ss_announcements for insert
  with check (school_id = ss_current_school_id() and ss_current_user_role() in ('admin','teacher') and created_by = auth.uid());
create policy "delete ss_announcements" on ss_announcements for delete using (
  school_id = ss_current_school_id() and (ss_current_user_role() = 'admin' or (ss_current_user_role() = 'teacher' and created_by = auth.uid()))
);

-- Homework: staff see all; students see their class; parents see their children's classes
create policy "read ss_homework" on ss_homework for select using (
  school_id = ss_current_school_id() and (
    ss_current_user_role() in ('admin','teacher')
    or section_id in (select section_id from ss_students where user_id = auth.uid())
    or section_id in (
      select s.section_id from ss_students s join ss_parent_student ps on ps.student_id = s.id where ps.parent_id = auth.uid())
  )
);
create policy "staff insert ss_homework" on ss_homework for insert
  with check (school_id = ss_current_school_id() and ss_current_user_role() in ('admin','teacher') and created_by = auth.uid());
create policy "delete ss_homework" on ss_homework for delete using (
  school_id = ss_current_school_id() and (ss_current_user_role() = 'admin' or (ss_current_user_role() = 'teacher' and created_by = auth.uid()))
);

notify pgrst, 'reload schema';
