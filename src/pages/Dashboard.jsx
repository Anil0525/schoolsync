import { useAuth } from '../hooks/useAuth.jsx'

const MODULES = {
  admin: ['Students', 'Teachers', 'Classes & sections', 'Attendance', 'Marks & report cards', 'UDISE+ export'],
  teacher: ['My classes', 'Mark attendance', 'Enter marks'],
  accountant: ['Fee structure', 'Collect fees', 'Dues'],
  student: ['My attendance', 'My marks', 'Homework'],
  parent: ['Child attendance', 'Child marks', 'Fees & receipts'],
}

export default function Dashboard() {
  const { profile, signOut } = useAuth()

  return (
    <div className="min-h-screen">
      <header className="bg-board text-chalk px-6 py-4 flex items-center justify-between">
        <span className="font-display text-xl font-bold">SchoolSync</span>
        <div className="flex items-center gap-4 text-sm">
          <span>{profile?.full_name || 'User'}{profile?.role ? ` (${profile.role})` : ''}</span>
          <button onClick={signOut} className="underline underline-offset-4">Sign out</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 md:p-10">
        {!profile ? (
          <div className="border border-mark rounded-md p-5">
            <h2 className="font-semibold text-mark">No profile found for this account</h2>
            <p className="text-sm mt-1 text-muted">
              Add a row for this user in the ss_profiles table (see docs/PROGRESS.md, "First admin"), then refresh.
            </p>
          </div>
        ) : (
          <>
            <h1 className="font-display text-3xl font-semibold">
              {profile.ss_schools?.name || 'Your school'}
            </h1>
            <p className="text-muted mt-1">Modules for your role. Each one is built in the order listed in docs/PROGRESS.md.</p>

            <ul className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(MODULES[profile.role] || []).map((m) => (
                <li key={m} className="bg-white border border-line rounded-md p-5">
                  <h3 className="font-medium">{m}</h3>
                  <p className="text-sm text-muted mt-1">Coming soon</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </div>
  )
}
