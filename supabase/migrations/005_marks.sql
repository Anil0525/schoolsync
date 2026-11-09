-- Marks module: subjects, exams, marks + rank function (run in Supabase SQL Editor)
create table ss_subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references ss_schools(id),
  name text not null,
  unique (school_id, name)
);

create table ss_exams (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references ss_schools(id),
  name text not null,
  max_marks int not null default 100 check (max_marks > 0),
  published boolean not null default false,
  created_at timestamptz default now(),
  unique (school_id, name)
);

create table ss_marks (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references ss_schools(id),
  exam_id uuid not null references ss_exams(id) on delete cascade,
  student_id uuid not null references ss_students(id) on delete cascade,
  subject_id uuid not null references ss_subjects(id) on delete cascade,
  marks numeric check (marks >= 0),
  updated_at timestamptz default now(),
  unique (exam_id, student_id, subject_id)
);

alter table ss_subjects enable row level security;
alter table ss_exams enable row level security;
alter table ss_marks enable row level security;

create policy "read ss_subjects" on ss_subjects for select using (school_id = ss_current_school_id());
create policy "admin write ss_subjects" on ss_subjects for all
  using (school_id = ss_current_school_id() and ss_current_user_role() = 'admin')
  with check (school_id = ss_current_school_id() and ss_current_user_role() = 'admin');

create policy "read ss_exams" on ss_exams for select using (
  school_id = ss_current_school_id() and (published or ss_current_user_role() in ('admin','teacher'))
);
create policy "admin write ss_exams" on ss_exams for all
  using (school_id = ss_current_school_id() and ss_current_user_role() = 'admin')
  with check (school_id = ss_current_school_id() and ss_current_user_role() = 'admin');

create policy "read ss_marks" on ss_marks for select using (
  school_id = ss_current_school_id() and (
    ss_current_user_role() in ('admin','teacher')
    or (
      exam_id in (select id from ss_exams where published)
      and (
        student_id in (select id from ss_students where user_id = auth.uid())
        or student_id in (select student_id from ss_parent_student where parent_id = auth.uid())
      )
    )
  )
);
create policy "staff write ss_marks" on ss_marks for all
  using (school_id = ss_current_school_id() and ss_current_user_role() in ('admin','teacher'))
  with check (school_id = ss_current_school_id() and ss_current_user_role() in ('admin','teacher'));

-- Rank of a student in their section for an exam. Students/parents can only ask about their own child.
create or replace function ss_exam_rank(p_exam uuid, p_student uuid)
returns table(rnk int, size int)
language sql stable security definer set search_path = public
as $$
  with me as (select school_id, section_id from ss_students where id = p_student),
  tot as (
    select m.student_id, sum(coalesce(m.marks, 0)) as t
    from ss_marks m
    join ss_students s on s.id = m.student_id
    join me on s.section_id = me.section_id and s.school_id = me.school_id
    where m.exam_id = p_exam
    group by m.student_id
  )
  select (1 + (select count(*) from tot where t > (select t from tot where student_id = p_student)))::int,
         (select count(*) from tot)::int
  where exists (select 1 from tot where student_id = p_student)
    and (
      ss_current_user_role() in ('admin','teacher')
      or exists (select 1 from ss_students where id = p_student and user_id = auth.uid())
      or exists (select 1 from ss_parent_student where student_id = p_student and parent_id = auth.uid())
    )
    and exists (select 1 from ss_exams e where e.id = p_exam and (e.published or ss_current_user_role() in ('admin','teacher')));
$$;
