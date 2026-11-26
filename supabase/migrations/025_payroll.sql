-- Batch 3c: staff salary structures and monthly payslips (safe to re-run).
create table if not exists ss_salary_structures (
  profile_id uuid primary key references ss_profiles(id) on delete cascade,
  school_id uuid not null references ss_schools(id),
  basic numeric(10,2) not null default 0 check (basic >= 0),
  hra numeric(10,2) not null default 0 check (hra >= 0),
  allowances numeric(10,2) not null default 0 check (allowances >= 0),
  pf numeric(10,2) not null default 0 check (pf >= 0),
  other_deductions numeric(10,2) not null default 0 check (other_deductions >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists ss_payslips (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references ss_schools(id),
  profile_id uuid not null references ss_profiles(id) on delete cascade,
  month text not null check (month ~ '^[0-9]{4}-[0-9]{2}$'),     -- 2026-11
  basic numeric(10,2) not null default 0,
  hra numeric(10,2) not null default 0,
  allowances numeric(10,2) not null default 0,
  bonus numeric(10,2) not null default 0,
  lop_days numeric(4,1) not null default 0 check (lop_days >= 0),
  lop_amount numeric(10,2) not null default 0,
  pf numeric(10,2) not null default 0,
  other_deductions numeric(10,2) not null default 0,
  gross numeric(10,2) not null default 0,
  net numeric(10,2) not null default 0 check (net >= 0),
  status text not null default 'draft' check (status in ('draft','paid')),
  paid_on date,
  created_at timestamptz not null default now(),
  unique (profile_id, month)
);
create index if not exists ss_payslips_idx on ss_payslips(school_id, month);

alter table ss_salary_structures enable row level security;
alter table ss_payslips enable row level security;

drop policy if exists "read ss_salary_structures" on ss_salary_structures;
create policy "read ss_salary_structures" on ss_salary_structures for select
  using (school_id = ss_current_school_id() and ss_current_user_role()::text in ('admin','accountant','principal'));
drop policy if exists "admin write ss_salary_structures" on ss_salary_structures;
create policy "admin write ss_salary_structures" on ss_salary_structures for all
  using (school_id = ss_current_school_id() and ss_current_user_role()::text = 'admin')
  with check (school_id = ss_current_school_id() and ss_current_user_role()::text = 'admin');

-- payslips: admin, accountant and principal read all; each staff member reads their own PAID slips
drop policy if exists "read ss_payslips" on ss_payslips;
create policy "read ss_payslips" on ss_payslips for select using (
  school_id = ss_current_school_id() and (
    ss_current_user_role()::text in ('admin','accountant','principal')
    or (profile_id = auth.uid() and status = 'paid')
  )
);
drop policy if exists "staff insert ss_payslips" on ss_payslips;
create policy "staff insert ss_payslips" on ss_payslips for insert
  with check (school_id = ss_current_school_id() and ss_current_user_role()::text in ('admin','accountant'));
-- only drafts can be changed, so a paid slip never changes
drop policy if exists "staff update ss_payslips" on ss_payslips;
create policy "staff update ss_payslips" on ss_payslips for update
  using (school_id = ss_current_school_id() and ss_current_user_role()::text in ('admin','accountant') and status = 'draft')
  with check (school_id = ss_current_school_id() and ss_current_user_role()::text in ('admin','accountant'));
drop policy if exists "admin delete ss_payslips" on ss_payslips;
create policy "admin delete ss_payslips" on ss_payslips for delete
  using (school_id = ss_current_school_id() and ss_current_user_role()::text = 'admin' and status = 'draft');

notify pgrst, 'reload schema';
