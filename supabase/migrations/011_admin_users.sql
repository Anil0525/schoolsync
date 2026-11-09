-- Admin user management: email on profiles (for the Users list) and admin control over parent-student links.
-- Safe to re-run except the policy line (it errors with "already exists" the second time, which is fine).
alter table ss_profiles add column if not exists email text;
update ss_profiles p set email = u.email from auth.users u where u.id = p.id and p.email is null;

create policy "admin write ss_parent_student" on ss_parent_student for all
  using (
    ss_current_user_role() = 'admin'
    and student_id in (select id from ss_students where school_id = ss_current_school_id())
  )
  with check (
    ss_current_user_role() = 'admin'
    and student_id in (select id from ss_students where school_id = ss_current_school_id())
  );

notify pgrst, 'reload schema';
