# SchoolSync progress and handoff (paste the "Handoff prompt" section into a new chat to continue)

## Handoff prompt

Nenu Anil (Telugu/Tenglish lo matladatanu, short directive phrases). "SchoolSync" ane School Management
System ni solo ga build chestunnanu, portfolio kosam. Continue cheyyi, step by step, Tenglish lo.

HOW WE WORK: Nenu VS Code / terminal vaadanu. Nuvve files build chesi downloadable zip ivvali
(schoolsync.zip, node_modules lekunda). Nenu zip extract chesi GitHub web lo upload chesthanu, GitHub Actions auto
build chesi GitHub Pages ki deploy chestundi. SQL ni Supabase SQL Editor lo paste chesi run chesthanu
(file peru kaadu, content ivvu, chat lo kuda paste cheyyi). Prathi step lo exact click-by-click steps ivvu.
Error screenshots pampistanu, nuvvu fix cheppu. Output ivvadaniki mundu `npm run build` tho verify cheyyi.

PROJECT: https://anil0525.github.io/schoolsync  |  repo: Anil0525/schoolsync
STACK: React 19 (Vite 7) + Tailwind v4 + react-router-dom (HashRouter, GitHub Pages kosam) + Supabase
(Auth, Postgres, RLS, Realtime) + jsPDF/jspdf-autotable. Vite base './'. Deploy: .github/workflows/deploy.yml
(GitHub Actions, repo secrets VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (publishable key)).
SUPABASE: separate project "schoolsync" (free plan allows 2 projects, so not shared with Anil EduTech).
All DB objects use ss_ prefix: ss_schools, ss_profiles, ss_academic_years, ss_classes, ss_sections,
ss_students, ss_parent_student, ss_attendance, ss_subjects, ss_exams, ss_marks, ss_fees, ss_fee_payments; type ss_user_role
(admin, teacher, accountant, student, parent); functions ss_current_school_id(), ss_current_user_role(),
ss_exam_rank(exam, student), ss_mock_pay(fee, amount). Every table has school_id and role-based RLS. Roles never set from signup.

CODE LAYOUT: src/lib (supabaseClient, csv, dates, results (grades, ranks), reportPdf, demo), src/hooks/useAuth.jsx,
src/components (Layout, Modal, ProtectedRoute), src/pages (Login, Dashboard, Classes, Students, Attendance,
MyAttendance, Exams, MarksEntry, ReportCards, MyMarks, Fees, MyFees), src/lib also fees.js and receiptPdf.js, supabase/migrations 001 to 009.
Login page has demo buttons (src/lib/demo.js). Demo users, password Demo@2026:
admin@, teacher@, accountant@, student@, parent@ schoolsync-demo.com (auth users created in Supabase dashboard,
profiles via 004 and 007 SQL). Real admin account exists separately (Anil's own).

DONE AND WORKING (tested live): login + role dashboards; classes/sections CRUD; students CRUD + CSV import
(preview and validation); attendance marking (teacher/admin) and student/parent view with live Realtime alerts;
demo data (Class 5 A, 5 students, 4 weeks of attendance).
Marks module (SQL 005, 006, exams/subjects, marks entry + CSV, report cards PDF, My marks with rank) and 007 (demo admin +
demo parent) were run on 2026-11-09; user moved on to fees after that.
BUILT, USER STILL TO CONFIRM: Fees module (SQL 008_fees.sql, 009_demo_fees.sql): per-student custom fees (one student or
whole class), payments (cash/UPI/card/cheque by admin/accountant), receipt PDF (uses "Rs." since the PDF font has no rupee
sign), student/parent MyFees with MOCK online payment via ss_mock_pay() (no real money). Razorpay and due reminders skipped
for now by choice.

GOAL: staff work minimum through automation, plus UDISE+ compliance in one click. Telugu + English UI later.
SCOPE (solo, realistic): one module complete, test, deploy, then next. Skip for now: Library, Transport, AI bots.

NEXT (in this order, ask which first):
1. Confirm marks module works (Teacher: Report cards; Parent: Child marks; PDF download).
2. Fees: confirm 008/009 and the Fees page work. LATER: Razorpay (replace ss_mock_pay with a Supabase Edge Function that
   verifies the signature server-side) and due reminders.
3. UDISE+ export: first get the official student bulk-upload Excel template columns from me, map them to
   ss_students fields (current UDISE fields: social_category, minority, cwsn, status), validate, readiness %.
4. Admin: add Teacher/Student/Parent users from the UI (Edge Function), Teachers module, link parent to student.
5. Announcements, homework, Telugu/English toggle, README with screenshots and architecture for the portfolio.

KNOWN NOTES: Telugu text does not render in PDFs (default font); demo accounts are public so demo data can be
re-seeded by re-running 004, 006, 007 (safe to re-run); school name shown is "Demo School".
