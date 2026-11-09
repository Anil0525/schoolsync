-- Demo fees for the demo students (D101 to D105). Safe to re-run: it also clears test online payments (MOCK-...) so the demo resets.
do $$
declare sch uuid;
begin
  select school_id into sch from ss_profiles where role = 'admin' limit 1;
  if sch is null then raise exception 'Create the admin profile first'; end if;

  delete from ss_fee_payments where reference like 'MOCK-%';

  insert into ss_fees (school_id, student_id, title, amount, due_date)
  select sch, st.id, x.title, x.amount, x.due
  from ss_students st
  cross join (values
    ('Term 1 tuition fee', 12000::numeric, current_date - 30),
    ('Bus fee (Term 1)',   3000::numeric,  current_date - 10),
    ('Term 2 tuition fee', 12000::numeric, current_date + 30)
  ) as x(title, amount, due)
  where st.school_id = sch and st.admission_no like 'D10%'
    and not exists (select 1 from ss_fees f where f.student_id = st.id and f.title = x.title);

  -- Term 1 tuition: D101 and D102 paid in full, D103 partly paid, D104 and D105 unpaid (overdue)
  insert into ss_fee_payments (school_id, fee_id, amount, method, reference, paid_at)
  select sch, f.id,
         case when st.admission_no = 'D103' then 5000 else f.amount end,
         case when st.admission_no = 'D101' then 'upi' else 'cash' end,
         case when st.admission_no = 'D101' then 'UPI-DEMO-1001' else null end,
         now() - interval '20 days'
  from ss_fees f
  join ss_students st on st.id = f.student_id
  where f.school_id = sch and f.title = 'Term 1 tuition fee'
    and st.admission_no in ('D101', 'D102', 'D103')
    and not exists (select 1 from ss_fee_payments p where p.fee_id = f.id);
end $$;
