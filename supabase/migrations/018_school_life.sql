-- Batch 1: school calendar, class routine (timetable), syllabus (run in Supabase SQL Editor, safe to re-run)
-- Needs 001 to 013 already run. It does NOT need 016 (principal is matched as text, so this works before or after it).

create table if not exists ss_calendar_events (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references ss_schools(id),
  title text not null,
  kind text not null default 'event' check (kind in ('holiday','event','exam')),
  start_date date not null,
  end_date date not null,
  note text,
  created_by uuid references ss_profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table if not exists ss_timetable (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references ss_schools(id),
  section_id uuid not null references ss_sections(id) on delete cascade,
  day_of_week int not null check (day_of_week between 1 and 6),   -- 1 = Monday ... 6 = Saturday
  period_no int not null check (period_no between 1 and 8),
  subject_id uuid references ss_subjects(id) on delete set null,
  teacher_id uuid references ss_profiles(id) on delete set null,
  unique (section_id, day_of_week, period_no)
);
-- one teacher cannot be in two sections in the same period
create unique index if not exists ss_timetable_teacher_slot
  on ss_timetable (school_id, teacher_id, day_of_week, period_no) where teacher_id is not null;

create table if not exists ss_syllabus (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references ss_schools(id),
  class_id uuid not null references ss_classes(id) on delete cascade,
  subject_id uuid not null references ss_subjects(id) on delete cascade,
  topic text not null,
  sort_order int not null default 0,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists ss_calendar_school_idx on ss_calendar_events(school_id, start_date);
create index if not exists ss_timetable_section_idx on ss_timetable(section_id);
create index if not exists ss_syllabus_class_idx on ss_syllabus(class_id, subject_id, sort_order);

alter table ss_calendar_events enable row level security;
alter table ss_timetable enable row level security;
alter table ss_syllabus enable row level security;

-- everyone in the school can read all three (none of it is private)
drop policy if exists "read ss_calendar_events" on ss_calendar_events;
create policy "read ss_calendar_events" on ss_calendar_events for select using (school_id = ss_current_school_id());
drop policy if exists "read ss_timetable" on ss_timetable;
create policy "read ss_timetable" on ss_timetable for select using (school_id = ss_current_school_id());
drop policy if exists "read ss_syllabus" on ss_syllabus;
create policy "read ss_syllabus" on ss_syllabus for select using (school_id = ss_current_school_id());

-- calendar: admin and principal manage it
drop policy if exists "write ss_calendar_events" on ss_calendar_events;
create policy "write ss_calendar_events" on ss_calendar_events for all
  using (school_id = ss_current_school_id() and ss_current_user_role()::text in ('admin','principal'))
  with check (school_id = ss_current_school_id() and ss_current_user_role()::text in ('admin','principal'));

-- timetable: admin only
drop policy if exists "admin write ss_timetable" on ss_timetable;
create policy "admin write ss_timetable" on ss_timetable for all
  using (school_id = ss_current_school_id() and ss_current_user_role()::text = 'admin')
  with check (school_id = ss_current_school_id() and ss_current_user_role()::text = 'admin');

-- syllabus: admin and teachers add, tick done and delete topics
drop policy if exists "staff write ss_syllabus" on ss_syllabus;
create policy "staff write ss_syllabus" on ss_syllabus for all
  using (school_id = ss_current_school_id() and ss_current_user_role()::text in ('admin','teacher'))
  with check (school_id = ss_current_school_id() and ss_current_user_role()::text in ('admin','teacher'));

notify pgrst, 'reload schema';
