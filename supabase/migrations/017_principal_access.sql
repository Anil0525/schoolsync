-- Step 2 of 2 for the Principal role (run after 016). Safe to re-run.
-- BEFORE: in Supabase > Authentication > Users > Add user, create principal@schoolsync-demo.com
--         (password Demo@2026, tick Auto Confirm User). The demo admin is renamed "Demo Admin" below.
--
-- The principal can READ the whole school (students, attendance, fees, announcements, homework) and
-- post / delete their own announcements. They cannot change students, fees, marks or attendance.

drop policy if exists "principal read ss_students" on ss_students;
create policy "principal read ss_students" on ss_students for select
  using (school_id = ss_current_school_id() and ss_current_user_role() = 'principal');

drop policy if exists "principal read ss_attendance" on ss_attendance;
create policy "principal read ss_attendance" on ss_attendance for select
  using (school_id = ss_current_school_id() and ss_current_user_role() = 'principal');

drop policy if exists "principal read ss_fees" on ss_fees;
create policy "principal read ss_fees" on ss_fees for select
  using (school_id = ss_current_school_id() and ss_current_user_role() = 'principal');

drop policy if exists "principal read ss_homework" on ss_homework;
create policy "principal read ss_homework" on ss_homework for select
  using (school_id = ss_current_school_id() and ss_current_user_role() = 'principal');

drop policy if exists "principal read ss_announcements" on ss_announcements;
create policy "principal read ss_announcements" on ss_announcements for select
  using (school_id = ss_current_school_id() and ss_current_user_role() = 'principal');

drop policy if exists "principal insert ss_announcements" on ss_announcements;
create policy "principal insert ss_announcements" on ss_announcements for insert
  with check (school_id = ss_current_school_id() and ss_current_user_role() = 'principal' and created_by = auth.uid());

drop policy if exists "principal delete ss_announcements" on ss_announcements;
create policy "principal delete ss_announcements" on ss_announcements for delete
  using (school_id = ss_current_school_id() and ss_current_user_role() = 'principal' and created_by = auth.uid());

-- The old demo "principal" was really the admin account: rename it, then add the real Principal demo user.
update ss_profiles set full_name = 'Demo Admin'
where id in (select id from auth.users where email = 'admin@schoolsync-demo.com');

insert into ss_profiles (id, school_id, role, full_name, email)
select u.id, (select school_id from ss_profiles where role = 'admin' limit 1), 'principal', 'Demo Principal', u.email
from auth.users u
where u.email = 'principal@schoolsync-demo.com'
on conflict (id) do update set role = 'principal', school_id = excluded.school_id, full_name = excluded.full_name, email = excluded.email;

notify pgrst, 'reload schema';
