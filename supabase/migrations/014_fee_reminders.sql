-- Fee due reminders: the accountant needs to see which parent is linked to which student (to find the phone number).
-- Safe to re-run. Reuses ss_student_school() from 011.
create or replace function ss_student_school(p_student uuid) returns uuid
language sql stable security definer set search_path = public
as $$ select school_id from ss_students where id = p_student $$;
revoke all on function ss_student_school(uuid) from public, anon;
grant execute on function ss_student_school(uuid) to authenticated;

drop policy if exists "accountant read ss_parent_student" on ss_parent_student;
create policy "accountant read ss_parent_student" on ss_parent_student for select
  using (ss_current_user_role() = 'accountant' and ss_student_school(student_id) = ss_current_school_id());

notify pgrst, 'reload schema';
