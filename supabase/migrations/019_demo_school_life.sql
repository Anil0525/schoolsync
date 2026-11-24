-- Optional demo data for Batch 1 (run after 018). Safe to re-run.
do $$
declare
  sch uuid;
  subs uuid[];
  n int;
  sec record;
  d int; p int;
  sub record;
  c record;
  i int;
begin
  select school_id into sch from ss_profiles where role = 'admin' limit 1;
  if sch is null then raise exception 'Create the admin profile first (002_first_admin.sql)'; end if;

  -- calendar (dates are relative to today so the demo always looks current)
  insert into ss_calendar_events (school_id, title, kind, start_date, end_date, note)
  select sch, v.title, v.kind, current_date + v.s, current_date + v.e, v.note
  from (values
    ('Parent-teacher meeting', 'event',   3, 3,  'All classes, 10 AM to 1 PM'),
    ('Dasara holidays',        'holiday', 10, 12, null),
    ('Unit test 1',            'exam',    18, 21, 'Syllabus: first 3 chapters'),
    ('Annual Day',             'event',   35, 35, 'Rehearsals start two weeks before')
  ) as v(title, kind, s, e, note)
  where not exists (select 1 from ss_calendar_events x where x.school_id = sch and x.title = v.title);

  select array_agg(id order by name) into subs from ss_subjects where school_id = sch;
  n := coalesce(array_length(subs, 1), 0);

  -- timetable: rotate the school's subjects through Mon-Sat, 6 periods
  if n > 0 then
    for sec in select s.id, s.class_teacher_id from ss_sections s where s.school_id = sch loop
      for d in 1..6 loop
        for p in 1..6 loop
          insert into ss_timetable (school_id, section_id, day_of_week, period_no, subject_id, teacher_id)
          values (sch, sec.id, d, p, subs[1 + ((d + p) % n)], sec.class_teacher_id)
          on conflict do nothing;
        end loop;
      end loop;
    end loop;

    -- syllabus: 4 chapters per class and subject, first two marked done
    for c in select id from ss_classes where school_id = sch loop
      for sub in select id from ss_subjects where school_id = sch loop
        if not exists (select 1 from ss_syllabus where class_id = c.id and subject_id = sub.id) then
          for i in 1..4 loop
            insert into ss_syllabus (school_id, class_id, subject_id, topic, sort_order, done)
            values (sch, c.id, sub.id, 'Chapter ' || i, i, i <= 2);
          end loop;
        end if;
      end loop;
    end loop;
  end if;
end $$;
