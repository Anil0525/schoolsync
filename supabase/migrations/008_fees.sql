-- Fees module: custom per-student fees, payments, receipts, mock online payment (run in Supabase SQL Editor)
-- Razorpay later: replace ss_mock_pay() with an Edge Function that verifies the Razorpay signature and inserts the payment.
create sequence if not exists ss_receipt_seq;

create table ss_fees (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references ss_schools(id),
  student_id uuid not null references ss_students(id) on delete cascade,
  title text not null,
  amount numeric(10,2) not null check (amount > 0),
  due_date date not null,
  created_by uuid references ss_profiles(id) default auth.uid(),
  created_at timestamptz default now()
);

create table ss_fee_payments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references ss_schools(id),
  fee_id uuid not null references ss_fees(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  method text not null check (method in ('cash','upi','card','cheque','online')),
  reference text,
  receipt_no text not null unique default ('RCPT-' || lpad(nextval('ss_receipt_seq')::text, 6, '0')),
  paid_at timestamptz not null default now(),
  received_by uuid references ss_profiles(id) default auth.uid()
);

create index ss_fees_student_idx on ss_fees(student_id);
create index ss_fee_payments_fee_idx on ss_fee_payments(fee_id);

alter table ss_fees enable row level security;
alter table ss_fee_payments enable row level security;

-- Who can see a fee: school staff (admin, accountant) or the student / their parents
create policy "read ss_fees" on ss_fees for select using (
  school_id = ss_current_school_id() and (
    ss_current_user_role() in ('admin','accountant')
    or student_id in (select id from ss_students where user_id = auth.uid())
    or student_id in (select student_id from ss_parent_student where parent_id = auth.uid())
  )
);
create policy "staff insert ss_fees" on ss_fees for insert
  with check (school_id = ss_current_school_id() and ss_current_user_role() in ('admin','accountant'));
create policy "staff update ss_fees" on ss_fees for update
  using (school_id = ss_current_school_id() and ss_current_user_role() in ('admin','accountant'))
  with check (school_id = ss_current_school_id() and ss_current_user_role() in ('admin','accountant'));
create policy "admin delete ss_fees" on ss_fees for delete
  using (school_id = ss_current_school_id() and ss_current_user_role() = 'admin');

-- A payment is visible when its fee is visible (ss_fees RLS applies inside the subquery)
create policy "read ss_fee_payments" on ss_fee_payments for select using (
  school_id = ss_current_school_id() and fee_id in (select id from ss_fees)
);
create policy "staff insert ss_fee_payments" on ss_fee_payments for insert
  with check (school_id = ss_current_school_id() and ss_current_user_role() in ('admin','accountant'));
create policy "admin delete ss_fee_payments" on ss_fee_payments for delete
  using (school_id = ss_current_school_id() and ss_current_user_role() = 'admin');

-- Never accept more than the balance due; always copy school_id from the fee
create or replace function ss_check_payment() returns trigger
language plpgsql as $$
declare f ss_fees; paid numeric;
begin
  select * into f from ss_fees where id = new.fee_id for update;
  if f.id is null then raise exception 'Fee not found'; end if;
  new.school_id := f.school_id;
  select coalesce(sum(amount), 0) into paid from ss_fee_payments where fee_id = new.fee_id;
  if paid + new.amount > f.amount then raise exception 'Payment is more than the balance due'; end if;
  return new;
end $$;

create trigger ss_fee_payments_check before insert on ss_fee_payments
for each row execute function ss_check_payment();

-- Mock online payment for the demo: a student or parent pays their own child's fee (no real money)
create or replace function ss_mock_pay(p_fee uuid, p_amount numeric)
returns text
language plpgsql security definer set search_path = public
as $$
declare f ss_fees; rno text;
begin
  select * into f from ss_fees where id = p_fee;
  if f.id is null then raise exception 'Fee not found'; end if;
  if not (
    exists (select 1 from ss_students where id = f.student_id and user_id = auth.uid())
    or exists (select 1 from ss_parent_student where student_id = f.student_id and parent_id = auth.uid())
  ) then raise exception 'Not allowed'; end if;
  insert into ss_fee_payments (school_id, fee_id, amount, method, reference, received_by)
  values (f.school_id, f.id, p_amount, 'online', 'MOCK-' || upper(substr(md5(random()::text), 1, 10)), auth.uid())
  returning receipt_no into rno;
  return rno;
end $$;

revoke all on function ss_mock_pay(uuid, numeric) from public, anon;
grant execute on function ss_mock_pay(uuid, numeric) to authenticated;
