-- Demo subjects, one published exam and marks for the demo students (D101 to D105). Safe to re-run.
do $$
declare sch uuid; ex uuid;
begin
  select school_id into sch from ss_profiles where role = 'admin' limit 1;
  if sch is null then raise exception 'Create the admin profile first'; end if;

  insert into ss_subjects (school_id, name)
  values (sch,'Telugu'),(sch,'English'),(sch,'Maths'),(sch,'Science'),(sch,'Social')
  on conflict (school_id, name) do nothing;

  insert into ss_exams (school_id, name, max_marks, published)
  values (sch, 'Unit Test 1', 100, true)
  on conflict (school_id, name) do nothing;
  select id into ex from ss_exams where school_id = sch and name = 'Unit Test 1';

  insert into ss_marks (school_id, exam_id, student_id, subject_id, marks)
  select sch, ex, st.id, sb.id,
         45 + ((length(st.full_name) * 7 + length(sb.name) * 11 + extract(day from current_date)::int) % 52)
  from ss_students st
  cross join ss_subjects sb
  where st.school_id = sch and st.admission_no like 'D10%' and sb.school_id = sch
  on conflict (exam_id, student_id, subject_id) do nothing;
end $$;
