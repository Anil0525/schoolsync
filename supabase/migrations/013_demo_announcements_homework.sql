-- Demo announcements and homework for Class 5 A. Safe to re-run (replaces the demo rows).
do $$
declare sch uuid; sec uuid; tch uuid; maths uuid; eng uuid;
begin
  select school_id into sch from ss_profiles where role = 'admin' limit 1;
  select p.id into tch from ss_profiles p join auth.users u on u.id = p.id where u.email = 'teacher@schoolsync-demo.com';
  select s.id into sec from ss_sections s join ss_classes c on c.id = s.class_id
    where s.school_id = sch and c.name = 'Class 5' and s.name = 'A' limit 1;
  if sch is null or tch is null or sec is null then raise exception 'Demo school, teacher or Class 5 A not found'; end if;

  insert into ss_subjects (school_id, name) values (sch, 'Maths'), (sch, 'English') on conflict (school_id, name) do nothing;
  select id into maths from ss_subjects where school_id = sch and name = 'Maths';
  select id into eng from ss_subjects where school_id = sch and name = 'English';

  delete from ss_announcements where school_id = sch and title in
    ('Annual Day on 20 December', 'Parent-teacher meeting this Saturday', 'Class 5 A: bring art supplies', 'Staff meeting on Friday');
  insert into ss_announcements (school_id, title, body, audience, section_id, created_by, created_at) values
    (sch, 'Annual Day on 20 December', 'Our Annual Day will be held on 20 December at 10 AM in the school hall. Students should wear the school uniform.', 'all', null, tch, now() - interval '1 day'),
    (sch, 'Parent-teacher meeting this Saturday', 'The parent-teacher meeting is on Saturday from 10 AM to 1 PM. Please meet the class teacher to discuss the Unit Test 1 results.', 'parents', null, tch, now() - interval '2 days'),
    (sch, 'Class 5 A: bring art supplies', 'Please bring colour pencils and a drawing book on Monday for the art activity.', 'students', sec, tch, now() - interval '3 hours'),
    (sch, 'Staff meeting on Friday', 'Staff meeting on Friday at 4 PM in the staff room to plan the Annual Day duties.', 'teachers', null, tch, now() - interval '5 hours');

  delete from ss_homework where school_id = sch and title in
    ('Chapter 4 exercise 4.1', 'Write 10 sentences about your village', 'Revise tables 11 to 15');
  insert into ss_homework (school_id, section_id, subject_id, title, details, due_date, created_by) values
    (sch, sec, maths, 'Chapter 4 exercise 4.1', 'Solve questions 1 to 10 in your notebook.', current_date + 2, tch),
    (sch, sec, eng, 'Write 10 sentences about your village', 'Use simple present tense. Neat handwriting please.', current_date + 4, tch),
    (sch, sec, maths, 'Revise tables 11 to 15', 'Oral test tomorrow.', current_date - 1, tch);
end $$;
