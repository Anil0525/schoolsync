-- Parent / guardian mobile number on the student record (used for fee due reminders). Safe to re-run.
alter table ss_students add column if not exists guardian_phone text;
notify pgrst, 'reload schema';
