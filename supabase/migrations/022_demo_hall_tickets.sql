-- Optional demo exam schedule for hall tickets (run after 020). Safe to re-run.
do $$
declare sch uuid; c record; sub record; i int;
begin
  select school_id into sch from ss_profiles where role = 'admin' limit 1;
  if sch is null then raise exception 'Create the admin profile first (002_first_admin.sql)'; end if;
  for c in select id from ss_classes where school_id = sch loop
    i := 0;
    for sub in select id from ss_subjects where school_id = sch order by name limit 6 loop
      insert into ss_exam_schedule (school_id, title, class_id, subject_id, exam_date, start_time, end_time)
      values (sch, 'Unit Test 1', c.id, sub.id, current_date + 18 + i, '10:00', '12:00')
      on conflict do nothing;
      i := i + 1;
    end loop;
  end loop;
end $$;
