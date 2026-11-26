-- Optional demo data for Batch 3 (run after 023, 024, 025). Safe to re-run.
do $$
declare sch uuid; fy int; p record; m text;
begin
  select school_id into sch from ss_profiles where role = 'admin' limit 1;
  if sch is null then raise exception 'Create the admin profile first (002_first_admin.sql)'; end if;
  fy := case when extract(month from current_date) >= 4 then extract(year from current_date)::int else extract(year from current_date)::int - 1 end;

  insert into ss_late_fee_settings (school_id, enabled, mode, rate, grace_days, max_amount)
  values (sch, true, 'per_day', 5, 3, 500) on conflict (school_id) do nothing;

  insert into ss_budgets (school_id, fy, category, amount)
  select sch, fy, v.c, v.a from (values ('Salaries', 900000), ('Utilities', 120000), ('Maintenance', 80000),
    ('Stationery', 50000), ('Events', 60000), ('Transport', 100000), ('Other', 30000)) as v(c, a)
  on conflict (school_id, fy, category) do nothing;

  if not exists (select 1 from ss_expenses where school_id = sch) then
    insert into ss_expenses (school_id, spent_on, category, description, paid_to, amount) values
      (sch, current_date - 40, 'Utilities',   'Electricity bill',        'TSSPDCL',        8200),
      (sch, current_date - 33, 'Stationery',  'Registers and chalk',     'Sri Book Depot', 6400),
      (sch, current_date - 21, 'Maintenance', 'Classroom fan repair',    'Local electrician', 3500),
      (sch, current_date - 12, 'Events',      'Independence Day sweets', 'Bakery',         2800),
      (sch, current_date - 4,  'Utilities',   'Water and internet',      'Provider',       4100);
  end if;

  -- salary structures for teachers and accountants
  for p in select id from ss_profiles where school_id = sch and role::text in ('teacher','accountant') loop
    insert into ss_salary_structures (profile_id, school_id, basic, hra, allowances, pf, other_deductions)
    values (p.id, sch, 25000, 5000, 2000, 1800, 200) on conflict (profile_id) do nothing;
    m := to_char(date_trunc('month', current_date) - interval '1 month', 'YYYY-MM');
    insert into ss_payslips (school_id, profile_id, month, basic, hra, allowances, pf, other_deductions, gross, net, status, paid_on)
    values (sch, p.id, m, 25000, 5000, 2000, 1800, 200, 32000, 30000, 'paid', date_trunc('month', current_date)::date + 1)
    on conflict (profile_id, month) do nothing;
  end loop;

  -- one overdue fee so the late fee page has something to show
  insert into ss_fees (school_id, student_id, title, amount, due_date)
  select sch, s.id, 'Term 1 tuition fee (demo overdue)', 3000, current_date - 20
  from ss_students s where s.school_id = sch and s.status = 'active'
    and not exists (select 1 from ss_fees f where f.student_id = s.id and f.title = 'Term 1 tuition fee (demo overdue)')
  order by s.admission_no limit 2;
end $$;
