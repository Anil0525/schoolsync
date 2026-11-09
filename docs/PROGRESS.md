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
- [x] Step 3: Login + role dashboards (live on GitHub Pages)
- [x] Step 4: Admin CRUD: classes, sections, students + CSV bulk import (preview + validation)
- [x] Step 5: Attendance: teacher/admin marking page, student/parent view with live (Realtime) alerts, demo login buttons (SQL 003, 004 to run)
- [x] Step 6: Marks + report card PDF: exams/subjects, marks entry (+CSV), ranks, report card PDF (single + whole class), student/parent view (SQL 005, 006)
- [ ] Step 7: Fees + Razorpay, then UDISE+ export (map columns from official student bulk-upload template first)

## Demo accounts
Login page has demo buttons (src/lib/demo.js). Users teacher/accountant/student/parent @schoolsync-demo.com, password Demo@2026, created in Supabase Auth; 004_demo_data.sql links them.

## Note
All tables, type and functions use the ss_ prefix (shared Supabase project, free plan allows 2 projects).

## First admin
Supabase: Authentication > Users > Add user. Then run supabase/migrations/002_first_admin.sql
with that user's UID. Signup must never set roles directly; users are created by admin (edge function, later).
