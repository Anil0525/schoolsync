// Demo accounts shown on the login page (create these users in Supabase Auth, then run supabase/migrations/007_demo_admin_parent.sql)
export const DEMO_PASSWORD = 'Demo@2026'
export const DEMO_ACCOUNTS = [
  { label: 'Admin (principal)', email: 'admin@schoolsync-demo.com', wide: true },
  { label: 'Teacher', email: 'teacher@schoolsync-demo.com' },
  { label: 'Accountant', email: 'accountant@schoolsync-demo.com' },
  { label: 'Student', email: 'student@schoolsync-demo.com' },
  { label: 'Parent (2 children)', email: 'parent@schoolsync-demo.com' },
]
