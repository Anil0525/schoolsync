# SchoolSync progress and handoff (paste the "Handoff prompt" section into a new chat, and upload schoolsync.zip with it)

## Handoff prompt

Nenu Anil (Telugu/Tenglish lo matladatanu, short directive phrases). "SchoolSync" ane School Management System ni solo ga
build chestunnanu, portfolio kosam. Continue cheyyi, step by step, Tenglish lo. Ee chat lo schoolsync.zip upload chesanu:
adi latest code. Mundu zip chadivi, `npm install` + `npm run build` tho verify cheyyi.

HOW WE WORK: Nenu VS Code / terminal vaadanu. Nuvve files build chesi downloadable zip ivvali (schoolsync.zip, node_modules
lekunda). Nenu zip extract chesi GitHub web lo upload chesthanu, GitHub Actions auto build chesi GitHub Pages ki deploy
chestundi. SQL ni Supabase SQL Editor lo paste chesi run chesthanu (file peru kaadu, SQL content chat lo paste cheyyi).
Prathi step lo exact click-by-click steps ivvu. Error screenshots pampistanu, nuvvu fix cheppu. Output ivvadaniki mundu
`npm run build` tho verify cheyyi. Telugu/Tenglish lo reply ivvu.

PROJECT: https://anil0525.github.io/schoolsync  |  repo: Anil0525/schoolsync
STACK: React 19 (Vite 7) + Tailwind v4 + react-router-dom (HashRouter) + Supabase (Auth, Postgres, RLS, Realtime, Edge
Functions) + jsPDF/jspdf-autotable + write-excel-file. Vite base './'. Deploy: .github/workflows/deploy.yml (repo secrets
VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (publishable key)).
SUPABASE: separate project "schoolsync" (not shared with Anil EduTech). All DB objects use ss_ prefix: ss_schools, ss_profiles
(has email column), ss_academic_years, ss_classes, ss_sections (class_teacher_id), ss_students, ss_parent_student,
ss_attendance, ss_subjects, ss_exams, ss_marks, ss_fees, ss_fee_payments, ss_announcements, ss_homework; type ss_user_role (admin, teacher, accountant,
student, parent); functions ss_current_school_id(), ss_current_user_role(), ss_exam_rank(exam, student), ss_check_payment()
(trigger), ss_mock_pay(fee, amount). Every table has school_id and role-based RLS. Roles never set from signup.
ss_students UDISE fields: social_category, minority, minority_group, cwsn, impairment_type, bpl, is_repeater, pen, apaar_id,
father_name, mother_name, status. Aadhaar is NOT stored on purpose.

CODE LAYOUT: src/lib (supabaseClient, csv, dates, results, reportPdf, receiptPdf, fees, udise, adminApi, demo),
src/hooks/useAuth.jsx, src/components (Layout, Modal, ProtectedRoute, CreateUserModal), src/pages (Login, Dashboard, Classes,
Students, Attendance, MyAttendance, Exams, MarksEntry, ReportCards, MyMarks, Fees, MyFees, Udise, Teachers, Users, Announcements, Homework), src/lib also i18n.jsx, te.js, pdfFont.js; src/components also LangToggle;
supabase/migrations 001 to 013, supabase/functions/admin-create-user/index.ts.
Login page has demo buttons (src/lib/demo.js). Demo users, password Demo@2026: admin@, teacher@, accountant@, student@,
parent@ schoolsync-demo.com. Real admin account exists separately (Anil's own). Demo data re-seed: re-run 004, 006, 007, 009, 010.

DONE AND WORKING (tested live): login + role dashboards; classes/sections CRUD; students CRUD + CSV import; attendance
(teacher/admin marking, student/parent view with Realtime); marks module (005, 006, 007 run; exams/subjects, marks entry,
report cards PDF, My marks with rank); admin demo login.
BUILT, USER STILL TO CONFIRM (ask which SQL he ran and test results):
 - Fees (SQL 008_fees.sql, 009_demo_fees.sql): per-student custom fees (one student or whole class), payments by
   admin/accountant (cash/UPI/card/cheque), receipt PDF ("Rs." used, PDF font has no rupee sign), student/parent MyFees with
   MOCK online payment via ss_mock_pay (no real money). Razorpay and due reminders skipped by his choice for now.
 - UDISE+ (SQL 010_udise_fields.sql): /udise page with readiness % (REQUIRED list in src/lib/udise.js is our assumption),
   missing-details list, Excel export in the column order of the SDMS "Students List". The file he gave was the SDMS
   Students List export (headers only), NOT the bulk-upload template. STILL NEED: official bulk-upload template headers from
   the UDISE+ portal (Student Module, bulk upload, download template) to make the export upload-ready.
 - Admin users (SQL 011_admin_users.sql + Edge Function admin-create-user deployed from Supabase dashboard with "Verify JWT"
   OFF; function checks the caller itself, only real admins, blocks @schoolsync-demo.com accounts, never creates admin role):
   /teachers (list, add, class teacher per section) and /users (all accounts, add teacher/accountant/student/parent, link
   children to parent). Passwords shown once at creation.

BUILT, USER STILL TO CONFIRM (2026-11-09): Announcements + Homework (SQL 012_announcements_homework.sql, 013_demo_announcements_homework.sql).
 /announcements (admin/teacher post to everyone/students/parents/teachers, whole school or one class; others read what RLS allows)
 and /homework (admin/teacher add per class + optional subject + due date; students see their class, parents their children's classes).
 Earlier confirmed by user: SQL 008, 009, 010, 011 are run (checked by query); Edge Function deploy and live tests were still pending.

BUILT, USER STILL TO CONFIRM (2026-11-09): Telugu/English toggle (src/lib/i18n.jsx, te.js: keys are the English strings, missing keys fall back
to English; translated: login, dashboard, page titles, announcements, homework, student/parent attendance, marks, fees), Telugu in PDFs
(public/fonts/NotoSansTelugu-Subset.ttf embedded only when text has Telugu; jsPDF cannot shape conjuncts, so some show in long form),
code splitting (React.lazy pages, first load about 500 kB), full README with mermaid architecture, docs/screenshots/README.md.
Screenshots are NOT in the repo yet: user adds PNGs to docs/screenshots and un-comments the Screenshots block in README.md.

GOAL: staff work minimum through automation, plus UDISE+ compliance in one click. Telugu + English UI later.
SCOPE (solo, realistic): one module complete, test, deploy, then next. Skip for now: Library, Transport, AI bots.

NEXT (in this order, ask which first):
1. Confirm fees, UDISE page, admin users work (which SQL run? any errors?). Get UDISE bulk-upload template headers and match
   the export exactly.
2. (done, confirm) Announcements, homework.
3. (done, confirm) Telugu/English toggle and Telugu PDF font. Possible later: translate admin screens, shape Telugu in PDFs via canvas images.
4. (done, confirm) README and code splitting. Remaining: user adds screenshots.
5. Later: Razorpay (replace ss_mock_pay with an Edge Function that verifies the signature server-side), due reminders.

KNOWN NOTES: Telugu text does not render in PDFs (default font); demo accounts are public so demo data can be re-seeded by
re-running the demo SQL (safe to re-run); school name shown is "Demo School"; Edge Functions need Verify JWT OFF because the
project uses the new key system.
