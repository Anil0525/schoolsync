-- BEFORE: create auth user admin@schoolsync-demo.com (Auto Confirm User, password Demo@2026).
-- Adds a demo admin, and links the demo parent to a second child so parent and student views differ.
-- Safe to run more than once.
insert into ss_profiles (id, school_id, role, full_name)
select u.id, (select school_id from ss_profiles where role = 'admin' limit 1), 'admin', 'Demo Principal'
from auth.users u
where u.email = 'admin@schoolsync-demo.com'
on conflict (id) do update set role = 'admin', school_id = excluded.school_id, full_name = excluded.full_name;

insert into ss_parent_student (parent_id, student_id)
select p.id, s.id
from auth.users p, ss_students s
where p.email = 'parent@schoolsync-demo.com' and s.admission_no in ('D101', 'D102')
on conflict do nothing;
