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
Demo users, password Demo@2026: admin@, teacher@, accountant@, student@, parent@ schoolsync-demo.com. Real admin account exists
separately (Anil's own). Demo data re-seed: re-run 004, 006, 007, 009, 010, 013 (safe to re-run).

DONE AND WORKING (tested live): login + role dashboards; classes/sections; students CRUD + CSV; attendance + Realtime; marks module,
report cards, My marks; demo admin. SQL 008, 009, 010, 011, (012, 013 given) were run in Supabase.
BUILT, USER STILL TO CONFIRM (ask which SQL he ran and live test results):
 - SQL 011 was FIXED on 2026-11-09 (first version caused RLS recursion, so Report cards showed "No active students"). User must
   run the fixed version (ss_student_school function + policy). Then re-test Report cards, Fees, Attendance, My marks.
 - Fees (008, 009): per-student custom fees (one student or whole class), payments, receipt PDF, MOCK online payment (ss_mock_pay).
 - UDISE+ (010): /udise readiness % and Excel export (columns follow SDMS Students List). Still need the official bulk-upload
   template headers from him to match the export exactly.
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
UDISE+ export: still waiting for official bulk-upload template headers from user.

KNOWN NOTES: demo accounts are public so demo data can be re-seeded; school name shown is "Demo School"; Edge Functions need
Verify JWT OFF because the project uses the new key system.
