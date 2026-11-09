-- UDISE+ student fields (from the SDMS "Students List" columns). Safe to re-run.
-- Aadhaar numbers are deliberately NOT stored here: enter them directly on the UDISE+ portal.
alter table ss_students
  add column if not exists pen text,
  add column if not exists apaar_id text,
  add column if not exists father_name text,
  add column if not exists mother_name text,
  add column if not exists minority_group text,
  add column if not exists bpl boolean default false,
  add column if not exists impairment_type text,
  add column if not exists is_repeater boolean default false;

-- Demo students: fill a few fields so the readiness report shows a mix of ready and incomplete
update ss_students set
  father_name = coalesce(father_name, 'Demo Father'),
  mother_name = coalesce(mother_name, 'Demo Mother')
where admission_no in ('D101', 'D102', 'D103');

update ss_students set pen = coalesce(pen, 'DEMOPEN' || admission_no), apaar_id = coalesce(apaar_id, '1000000000' || right(admission_no, 2))
where admission_no in ('D101', 'D102');
