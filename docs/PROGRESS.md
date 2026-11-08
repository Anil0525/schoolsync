# SchoolSync progress (keep this updated; paste into a new chat to continue)

Nenu Anil (Telugu/Tenglish, short directive phrases). SchoolSync ane School Management System
ni solo ga build chestunnanu (portfolio). Step by step, Tenglish lo continue cheyyi.

STACK: React (Vite) + Tailwind v4 + React Router + Supabase (Auth, Postgres, RLS, Realtime,
Storage, Edge Functions) + Razorpay + jsPDF + SheetJS + Recharts. Deploy: Vercel/Netlify.
GOAL: staff work minimum (automation) + UDISE+ one-click export (official bulk-upload Excel
format, validation, readiness %). Telugu + English UI. Multi-school ready (school_id + RLS).
ROLES: admin, teacher, accountant, student, parent.

SCOPE (solo): V1 Auth+roles, Students/Teachers/Classes, Attendance + parent alerts (Realtime),
Marks + Report card PDF, UDISE+ export. V2 Fees+Razorpay, Announcements, Homework.
V3 optional: Timetable, Certificates, Chat, Analytics. Skip: Library, Transport, AI bots.
Rule: one module complete, test, deploy, then next.

## DONE
- [x] Step 1: Project scaffold (Vite + Tailwind v4 + Supabase client + AuthContext + Login + role dashboard)
- [x] Step 2: SQL files in supabase/migrations (001 schema + RLS, 002 first admin)

## NEXT
- [ ] Step 3: Admin CRUD: classes, sections (then students + Excel bulk import)
- [ ] Step 4: Attendance marking UI + parent live notification
- [ ] Step 5: Marks + report card PDF
- [ ] Step 6: UDISE+ export (map columns from official student bulk-upload template first)

## First admin
Supabase: Authentication > Users > Add user. Then run supabase/migrations/002_first_admin.sql
with that user's UID. Signup must never set roles directly; users are created by admin (edge function, later).
