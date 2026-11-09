-- Admin user management: email on profiles (for the Users list) and admin control over parent-student links.
-- Safe to re-run. The policy uses a security definer helper so it does not loop with the ss_students policy.
alter table ss_profiles add column if not exists email text;
update ss_profiles p set email = u.email from auth.users u where u.id = p.id and p.email is null;

create or replace function ss_student_school(p_student uuid) returns uuid
language sql stable security definer set search_path = public
as $$ select school_id from ss_students where id = p_student $$;
revoke all on function ss_student_school(uuid) from public, anon;
grant execute on function ss_student_school(uuid) to authenticated;

drop policy if exists "admin write ss_parent_student" on ss_parent_student;
create policy "admin write ss_parent_student" on ss_parent_student for all
  using (ss_current_user_role() = 'admin' and ss_student_school(student_id) = ss_current_school_id())
  with check (ss_current_user_role() = 'admin' and ss_student_school(student_id) = ss_current_school_id());

notify pgrst, 'reload schema';
