-- Live attendance alerts: lets the parent/student page receive changes instantly.
-- If you see "already member of publication", it is already on; ignore it.
alter publication supabase_realtime add table ss_attendance;
