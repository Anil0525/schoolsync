-- Batch 3b: school expenses and yearly budget per category (financial year starts in April). Safe to re-run.
create table if not exists ss_expenses (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references ss_schools(id),
  spent_on date not null default current_date,
  category text not null,
  description text,
  paid_to text,
  amount numeric(12,2) not null check (amount > 0),
  created_by uuid references ss_profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists ss_expenses_idx on ss_expenses(school_id, spent_on);

create table if not exists ss_budgets (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references ss_schools(id),
  fy int not null,                       -- starting year, 2026 means April 2026 to March 2027
  category text not null,
  amount numeric(12,2) not null check (amount >= 0),
  unique (school_id, fy, category)
);

alter table ss_expenses enable row level security;
alter table ss_budgets enable row level security;

drop policy if exists "read ss_expenses" on ss_expenses;
create policy "read ss_expenses" on ss_expenses for select
  using (school_id = ss_current_school_id() and ss_current_user_role()::text in ('admin','accountant','principal'));
drop policy if exists "insert ss_expenses" on ss_expenses;
create policy "insert ss_expenses" on ss_expenses for insert
  with check (school_id = ss_current_school_id() and ss_current_user_role()::text in ('admin','accountant') and created_by = auth.uid());
drop policy if exists "delete ss_expenses" on ss_expenses;
create policy "delete ss_expenses" on ss_expenses for delete
  using (school_id = ss_current_school_id() and ss_current_user_role()::text = 'admin');

drop policy if exists "read ss_budgets" on ss_budgets;
create policy "read ss_budgets" on ss_budgets for select
  using (school_id = ss_current_school_id() and ss_current_user_role()::text in ('admin','accountant','principal'));
drop policy if exists "admin write ss_budgets" on ss_budgets;
create policy "admin write ss_budgets" on ss_budgets for all
  using (school_id = ss_current_school_id() and ss_current_user_role()::text = 'admin')
  with check (school_id = ss_current_school_id() and ss_current_user_role()::text = 'admin');

notify pgrst, 'reload schema';
