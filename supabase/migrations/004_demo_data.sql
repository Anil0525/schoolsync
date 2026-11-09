-- Demo data for portfolio/demo logins.
-- BEFORE running: Supabase > Authentication > Users > Add user (tick Auto Confirm User), password Demo@2026, for:
--   teacher@schoolsync-demo.com, accountant@schoolsync-demo.com, student@schoolsync-demo.com, parent@schoolsync-demo.com
-- Safe to run more than once.
do $$
declare
  sch uuid;
  cls uuid;
  sec uuid;
  stu uuid;
begin
  select school_id into sch from ss_profiles where role = 'admin' limit 1;
  if sch is null then raise exception 'Create the admin profile first (002_first_admin.sql)'; end if;

  insert into ss_profiles (id, school_id, role, full_name)
  select u.id, sch, v.role::ss_user_role, v.name
  from (values
    ('teacher@schoolsync-demo.com',    'teacher',    'Demo Teacher'),
    ('accountant@schoolsync-demo.com', 'accountant', 'Demo Accountant'),
    ('student@schoolsync-demo.com',    'student',    'Demo Student'),
    ('parent@schoolsync-demo.com',     'parent',     'Demo Parent')
  ) as v(email, role, name)
  join auth.users u on u.email = v.email
  on conflict (id) do update
    set role = excluded.role, school_id = excluded.school_id, full_name = excluded.full_name;

  select id into cls from ss_classes where school_id = sch and name = 'Class 5' limit 1;
  if cls is null then
    insert into ss_classes (school_id, name, sort_order) values (sch, 'Class 5', 5) returning id into cls;
  end if;
  select id into sec from ss_sections where class_id = cls and name = 'A' limit 1;
  if sec is null then
    insert into ss_sections (school_id, class_id, name) values (sch, cls, 'A') returning id into sec;
  end if;

  insert into ss_students (school_id, admission_no, full_name, gender, section_id, social_category)
  values
    (sch, 'D102', 'Ananya Reddy',  'Female', sec, 'General'),
    (sch, 'D103', 'Karthik Goud',  'Male',   sec, 'OBC'),
    (sch, 'D104', 'Lakshmi Devi',  'Female', sec, 'SC'),
    (sch, 'D105', 'Rahul Naik',    'Male',   sec, 'ST')
  on conflict (school_id, admission_no) do nothing;

  insert into ss_students (school_id, admission_no, full_name, gender, section_id, social_category, user_id)
  select sch, 'D101', 'Demo Student', 'Male', sec, 'General', u.id
  from (select 1) x
  left join auth.users u on u.email = 'student@schoolsync-demo.com'
  on conflict (school_id, admission_no) do update set user_id = excluded.user_id;

  select id into stu from ss_students where school_id = sch and admission_no = 'D101';
  insert into ss_parent_student (parent_id, student_id)
  select u.id, stu from auth.users u where u.email = 'parent@schoolsync-demo.com'
  on conflict do nothing;

  -- four weeks of weekday attendance history for the demo students
  insert into ss_attendance (school_id, student_id, date, status)
  select sch, s.id, d::date,
    case when (extract(day from d)::int + length(s.full_name)) % 9 = 0 then 'absent'
         when (extract(day from d)::int + length(s.full_name)) % 13 = 0 then 'late'
         else 'present' end
  from ss_students s,
       generate_series(current_date - 28, current_date - 1, interval '1 day') d
  where s.school_id = sch and s.admission_no like 'D10%' and extract(isodow from d) < 6
  on conflict (student_id, date) do nothing;
end $$;
