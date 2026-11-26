# SchoolSync progress and handoff (paste the "Handoff prompt" section into a new chat, and upload schoolsync.zip with it)

## Handoff prompt

Nenu Anil (Telugu/Tenglish lo matladatanu, short directive phrases). "SchoolSync" ane School Management System ni solo ga
build chestunnanu, portfolio kosam. Continue cheyyi, step by step, Tenglish lo. Ee chat lo schoolsync.zip upload chesanu:
adi latest code. Mundu zip chadivi, `npm install` + `npm run build` tho verify cheyyi.

HOW WE WORK: Nenu VS Code / terminal vaadanu. Nuvve files build chesi downloadable zip ivvali (schoolsync.zip, node_modules
lekunda). Nenu zip extract chesi GitHub web lo upload chesthanu, GitHub Actions auto build chesi GitHub Pages ki deploy
chestundi. SQL ni Supabase SQL Editor lo paste chesi run chesthanu (file peru kaadu, SQL content chat lo paste cheyyi).
Prathi step lo exact click-by-click steps ivvu. Error screenshots pampistanu, nuvvu fix cheppu. Output ivvadaniki mundu
`npm run build` tho verify cheyyi. Tenglish lo reply ivvu.

PROJECT: https://anil0525.github.io/schoolsync  |  repo: Anil0525/schoolsync
STACK: React 19 (Vite 7) + Tailwind v4 + react-router-dom (HashRouter, pages lazy loaded) + Supabase (Auth, Postgres, RLS,
Realtime, Edge Functions) + jsPDF/jspdf-autotable + write-excel-file. Vite base './'. Deploy: .github/workflows/deploy.yml
(repo secrets VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (publishable key)).
SUPABASE: separate project "schoolsync". All DB objects use ss_ prefix: ss_schools, ss_profiles (has email), ss_academic_years,
ss_classes, ss_sections (class_teacher_id), ss_students, ss_parent_student, ss_attendance, ss_subjects, ss_exams, ss_marks,
ss_fees, ss_fee_payments, ss_announcements, ss_homework; type ss_user_role (admin, teacher, accountant, student, parent);
functions ss_current_school_id(), ss_current_user_role(), ss_exam_rank(), ss_check_payment() (trigger), ss_mock_pay(fee, amount),
ss_student_school(student). Every table has school_id and role-based RLS. Roles never set from signup.
IMPORTANT RLS RULE: policies on ss_students and ss_parent_student must not reference each other directly (infinite recursion);
use security definer helpers like ss_student_school().
ss_students UDISE fields: social_category, minority, minority_group, cwsn, impairment_type, bpl, is_repeater, pen, apaar_id,
father_name, mother_name, status. Aadhaar is NOT stored on purpose.

CODE LAYOUT: src/lib (supabaseClient, csv, dates, results, reportPdf, receiptPdf, pdfFont, fees, udise, adminApi, demo, i18n.jsx,
te.js), src/hooks/useAuth.jsx, src/components (Layout, Modal, ProtectedRoute, CreateUserModal, LangToggle), src/pages (Login,
Dashboard, MyClasses, Classes, Students, Attendance, MyAttendance, Exams, MarksEntry, ReportCards, MyMarks, Fees, MyFees, Udise, Teachers,
Users, Announcements, Homework), supabase/migrations 001 to 013, supabase/functions/admin-create-user/index.ts,
public/fonts (Noto Sans Telugu subset for PDFs), README.md (full, with mermaid diagrams), docs/screenshots.
Demo users, password Demo@2026: admin@, principal@, teacher@, accountant@, parent@ schoolsync-demo.com (login page no longer shows student@; the
account can still exist). Real admin account exists
separately (Anil's own). Demo data re-seed: re-run 004, 006, 007, 009, 010, 013 (safe to re-run).

DONE AND WORKING (tested live): login + role dashboards; classes/sections; students CRUD + CSV; attendance + Realtime; marks module,
report cards, My marks; demo admin. SQL 008, 009, 010, 011, (012, 013 given) were run in Supabase.
BUILT, USER STILL TO CONFIRM (ask which SQL he ran and live test results):
 - SQL 011 was FIXED on 2026-11-09 (first version caused RLS recursion, so Report cards showed "No active students"). User must
   run the fixed version (ss_student_school function + policy). Then re-test Report cards, Fees, Attendance, My marks.
 - Fees (008, 009): per-student custom fees (one student or whole class), payments, receipt PDF, MOCK online payment (ss_mock_pay).
 - UDISE+ (010): /udise readiness % and Excel export. Export now uses the 23 exact SDMS headers he sent (2026-11-10); portal-filled and
   Aadhaar columns are empty; DOB is not in that sheet so it is no longer in the readiness list. Value formats (Yes/No, Male, class names)
   are still our guess until he confirms against a real sample row.
 - Admin users (011 + Edge Function admin-create-user deployed with "Verify JWT" OFF; blocks demo accounts): /teachers, /users.
 - Announcements + Homework (012, 013).
 - Telugu/English toggle (src/lib/te.js; translated: login, dashboard, titles, announcements, homework, student/parent attendance,
   marks, fees; other admin screens English) and Telugu glyphs in PDFs (jsPDF cannot shape conjuncts, some show in long form).
 - README done; screenshots NOT added yet: he must add 8 PNGs to docs/screenshots (names in docs/screenshots/README.md) and
   delete the two comment lines around the Screenshots block in README.md.

GOAL: staff work minimum through automation, plus UDISE+ compliance in one click.
SCOPE (solo, realistic): one module complete, test, deploy, then next. Skip for now: Library, Transport, AI bots.

NEXT (ask which first):
1. Confirm the fixed 011 and all pending modules work; fix bugs from his screenshots.
2. UDISE+ export: match official bulk-upload template (he will send headers).
3. Later: Razorpay (replace ss_mock_pay with an Edge Function that verifies the signature server-side), due reminders,
   translate remaining admin screens, shape Telugu in PDFs (canvas images), more polish for the portfolio.

MY CLASSES (teacher, /my-classes, no SQL needed): lists sections where ss_sections.class_teacher_id = teacher, student count,
today's attendance status, show/hide students, links to attendance (preselects section via ?section=), marks, homework.
USER TESTED OK (2026-11-09): fixed 011, Report cards, Fees, Announcements, Homework, Telugu toggle, UDISE+, Admin users.

FEE REMINDERS (needs SQL 014): Fees page shows Remind on overdue rows -> modal with editable message, Open WhatsApp (wa.me link, needs parent phone
in ss_profiles.phone, 10-digit Indian mobile) or Copy message. 014 lets the accountant read ss_parent_student. No server, no cost. NOT yet tested by user.
GUARDIAN MOBILE (needs SQL 015): ss_students.guardian_phone, field in Add/Edit student (10-digit validated), Mobile column in list,
guardian_phone in CSV import/template. Fee reminders use linked parent accounts first, then this number.
TELUGU (batch 2026-11-10): now also Attendance, Enter marks, Report cards, Classes, Exams, Teachers, Students, Fees (incl. modals; Modal Close
button) and the WhatsApp fee reminder text (Telugu when the toggle is Telugu). Still English: Users, UDISE+, CreateUserModal.
PRINCIPAL ROLE (016 + 017, 016 must be run ALONE first; create principal@schoolsync-demo.com in Supabase Auth before 017): read-only /overview (attendance
today, class-wise table, fees summary, recent announcements) plus can post/delete own announcements; Homework read-only. Edge Function ROLES now
includes principal (redeploy admin-create-user to create principals from the UI). Demo admin renamed Demo Admin.
PENDING SQL to run before using this batch: 014_fee_reminders.sql, 015_guardian_phone.sql, 016, 017. vite.config.js splits react + supabase into vendor chunks (500 kB warning gone).

KNOWN NOTES: demo accounts are public so demo data can be re-seeded; school name shown is "Demo School"; Edge Functions need
Verify JWT OFF because the project uses the new key system.

BATCH 1 (2026-11-24, rebuilt after a sandbox reset in the earlier chat; the zip had only up to SQL 017). Needs SQL 018 (run it) and optionally 019 (demo data):
 - School calendar /calendar: month grid (Mon first), holiday/event/exam with date ranges; admin + principal add/delete; everyone reads.
 - Class routine /routine: admin edits a section's weekly grid (Mon-Sat, 8 periods); DB blocks a teacher being in two sections in one period; teacher gets "My timetable"; student/parent see own class.
 - Syllabus /syllabus: class + subject topics, bulk add (one per line), admin/teacher tick done, progress %.
 - Birthdays /birthdays (admin, teacher, principal): today + next 30 days from ss_students.dob, wish card PNG (English/Telugu, canvas), WhatsApp share link (no number, user picks the chat).
 - Telugu keys added in te.js. NOT yet tested live by the user.
BATCH 1 TESTED OK by the user (2026-11-24).
BATCH 2 (2026-11-24, needs SQL 020, 021, optional 022; run 021 as its own query):
 - Hall tickets /hall-tickets: admin builds exam schedule per class (ss_exam_schedule, independent of ss_exams so unpublished exams work); admin/teacher/principal download one student or the whole class as one PDF; student/parent download their own.
 - Certificates /certificates (admin + principal): bonafide, character, transfer, experience. Numbered by function ss_issue_certificate (TC/CC/BC/EC/<year>/0001, advisory lock, no direct inserts), register with search and "Download again".
 - Documents /documents: private bucket ss-documents (10 MB), category, visibility (everyone/staff/parents/students) enforced by RLS on ss_documents and on storage.objects; signed URL (60 s) download; admin/principal upload and delete.
 - Telugu keys added. NOT yet tested live by the user.
BATCH 2 assumed OK by the user ("OK", 2026-11-24).
BATCH 3 (2026-11-24, needs SQL 023, 024, 025, optional 026). SQL was run against real Postgres (pglite) and RLS/behaviour tested:
 - Late fees /late-fees (admin/accountant apply, principal view, admin edits rules): per day or % per month, grace days, cap. Amount computed ONLY in SQL (ss_late_fee_preview), applied once per fee by ss_apply_late_fee which creates a normal fee "Late fee: <title>" (due in 7 days) so parents see/pay it in Fees.
 - Expenses & budget /expenses: financial year Apr-Mar, 7 fixed categories, budget per category (admin), expenses (admin/accountant add, admin delete), fees collected vs expenses.
 - Payroll /payroll (admin/accountant run, principal view): salary structure per staff (admin), month grid with loss-of-pay days and bonus, generate drafts, mark paid (paid slips are immutable by RLS), salary slip PDF with amount in words. Staff see their own PAID slips at /my-salary.
 - Telugu keys added. NOT yet tested live by the user.
BATCH 3 assumed OK by the user (2026-11-25).
BATCH 5a FRONT END (2026-11-25, user asked for "front end" = public school website). Needs SQL 027, optional 028:
 - Public pages (no login): #/school (home), #/school/about, #/school/admissions. Notebook look (ruled lines + red margin, class .ruled in index.css). Content comes from ss_public_site() (only when published). Telugu toggle works for the UI labels; the school's own text stays as the admin typed it.
 - Admission form -> ss_submit_enquiry(): validates, phone normalised to 10 digits, max 3 enquiries per phone per day, 100 per hour per school, hidden honeypot field. Tables are private to anon.
 - Admin: /site-settings (admin edits, principal views; publish switch, admissions open/closed) and /enquiries (admin + principal: status new/contacted/visited/admitted/closed, notes, call + WhatsApp links; admin deletes). Login page links to the website.
 - Tested: SQL in pglite (anon/teacher/admin cases), UI in headless Chromium with mocked API (home desktop+mobile, form validation, submit payload). Hosting note: HashRouter, so the public link is <site>/#/school; it is client-rendered, so Google sees little of it (a later improvement if SEO matters).
 - NOT yet tested live by the user.
NEXT options: Batch 4 (staff attendance + geo-fence, gate log, RFID, face), rest of Batch 5 (inventory & sales; admissions enquiry -> student conversion), Batch 6 (notification center, PWA, bus tracking, report-card analysis, parent feedback), UI polish of login/dashboard.
