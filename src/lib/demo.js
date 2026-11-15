// Demo accounts shown on the login page (create these users in Supabase Auth, then run supabase/migrations/007_demo_admin_parent.sql, 016 and 017 for the principal)
export const DEMO_PASSWORD = 'Demo@2026'
export const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@schoolsync-demo.com' },
  { label: 'Principal', email: 'principal@schoolsync-demo.com' },
  { label: 'Teacher', email: 'teacher@schoolsync-demo.com' },
  { label: 'Accountant', email: 'accountant@schoolsync-demo.com' },
  { label: 'Parent (2 children)', email: 'parent@schoolsync-demo.com', wide: true },
]
