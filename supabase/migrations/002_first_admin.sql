-- 1) Supabase Dashboard > Authentication > Users > Add user (email + password)
-- 2) Copy that user's UID and replace <AUTH_USER_ID> below, then run.
with s as (
  insert into ss_schools (name) values ('Demo School') returning id
)
insert into ss_profiles (id, school_id, role, full_name)
select '<AUTH_USER_ID>'::uuid, s.id, 'admin', 'Admin' from s;
