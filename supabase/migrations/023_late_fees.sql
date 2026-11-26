-- Batch 3a: late fee rules and one-click late fee charges (safe to re-run). Needs 008 (fees).
-- Works with or without the principal role (matched as text).
create table if not exists ss_late_fee_settings (
  school_id uuid primary key references ss_schools(id),
  enabled boolean not null default true,
  mode text not null default 'per_day' check (mode in ('per_day','percent_per_month')),
  rate numeric(8,2) not null default 5 check (rate >= 0),     -- Rs per day, or % of balance per month
  grace_days int not null default 0 check (grace_days >= 0),
  max_amount numeric(10,2) check (max_amount is null or max_amount >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists ss_late_fee_charges (
  fee_id uuid primary key references ss_fees(id) on delete cascade,        -- the overdue fee (charged once)
  school_id uuid not null references ss_schools(id),
  charge_fee_id uuid not null references ss_fees(id) on delete cascade,    -- the new fee row that holds the late fee
  amount numeric(10,2) not null,
  days_late int not null,
  charged_on date not null default current_date,
  charged_by uuid references ss_profiles(id) default auth.uid()
);

alter table ss_late_fee_settings enable row level security;
alter table ss_late_fee_charges enable row level security;

drop policy if exists "read ss_late_fee_settings" on ss_late_fee_settings;
create policy "read ss_late_fee_settings" on ss_late_fee_settings for select
  using (school_id = ss_current_school_id() and ss_current_user_role()::text in ('admin','accountant','principal'));
drop policy if exists "admin write ss_late_fee_settings" on ss_late_fee_settings;
create policy "admin write ss_late_fee_settings" on ss_late_fee_settings for all
  using (school_id = ss_current_school_id() and ss_current_user_role()::text = 'admin')
  with check (school_id = ss_current_school_id() and ss_current_user_role()::text = 'admin');
drop policy if exists "read ss_late_fee_charges" on ss_late_fee_charges;
create policy "read ss_late_fee_charges" on ss_late_fee_charges for select
  using (school_id = ss_current_school_id() and ss_current_user_role()::text in ('admin','accountant','principal'));

-- The single source of truth for the amount: overdue fees with a balance, not yet charged
create or replace function ss_late_fee_preview()
returns table (fee_id uuid, balance numeric, days_late int, late_fee numeric)
language plpgsql stable security definer set search_path = public
as $$
declare
  sch uuid := ss_current_school_id();
  s ss_late_fee_settings;
begin
  if sch is null or ss_current_user_role()::text not in ('admin','accountant','principal') then
    raise exception 'Not allowed';
  end if;
  select * into s from ss_late_fee_settings where school_id = sch;
  if s.school_id is null or not s.enabled then return; end if;
  return query
  select x.id, x.bal, x.late,
    least(coalesce(s.max_amount, 1000000000), round(
      case when s.mode = 'per_day' then s.rate * x.late
           else x.bal * s.rate / 100 * ceil(x.late / 30.0) end, 2))
  from (
    select f.id,
      (f.amount - coalesce((select sum(p.amount) from ss_fee_payments p where p.fee_id = f.id), 0)) as bal,
      (current_date - f.due_date - s.grace_days) as late
    from ss_fees f
    where f.school_id = sch
      and not exists (select 1 from ss_late_fee_charges c where c.fee_id = f.id)
      and not exists (select 1 from ss_late_fee_charges c2 where c2.charge_fee_id = f.id)
  ) x
  where x.bal > 0 and x.late > 0;
end $$;
revoke all on function ss_late_fee_preview() from public, anon;
grant execute on function ss_late_fee_preview() to authenticated;

-- Creates the late fee as a normal fee on the student (so parents see and pay it like any other fee)
create or replace function ss_apply_late_fee(p_fee uuid)
returns numeric
language plpgsql security definer set search_path = public
as $$
declare
  sch uuid := ss_current_school_id();
  f ss_fees;
  pr record;
  new_id uuid;
begin
  if sch is null or ss_current_user_role()::text not in ('admin','accountant') then raise exception 'Not allowed'; end if;
  select * into f from ss_fees where id = p_fee and school_id = sch;
  if f.id is null then raise exception 'Fee not found'; end if;
  select * into pr from ss_late_fee_preview() p where p.fee_id = p_fee;
  if pr.fee_id is null or pr.late_fee <= 0 then raise exception 'No late fee applies to this fee'; end if;
  insert into ss_fees (school_id, student_id, title, amount, due_date)
  values (sch, f.student_id, 'Late fee: ' || f.title, pr.late_fee, current_date + 7)
  returning id into new_id;
  insert into ss_late_fee_charges (fee_id, school_id, charge_fee_id, amount, days_late)
  values (p_fee, sch, new_id, pr.late_fee, pr.days_late);
  return pr.late_fee;
end $$;
revoke all on function ss_apply_late_fee(uuid) from public, anon;
grant execute on function ss_apply_late_fee(uuid) to authenticated;

notify pgrst, 'reload schema';
