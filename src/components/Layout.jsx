import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'

export default function Layout({ title, children }) {
  const { profile, signOut } = useAuth()
  return (
    <div className="min-h-screen">
      <header className="bg-board text-chalk px-6 py-4 flex items-center justify-between">
        <Link to="/" className="font-display text-xl font-bold">SchoolSync</Link>
        <div className="flex items-center gap-4 text-sm">
          <span>{profile?.full_name || 'User'}{profile?.role ? ` (${profile.role})` : ''}</span>
          <button onClick={signOut} className="underline underline-offset-4">Sign out</button>
        </div>
      </header>
      <main className="max-w-5xl mx-auto p-6 md:p-10">
        <Link to="/" className="text-sm text-muted underline underline-offset-4">Back to dashboard</Link>
        <h1 className="font-display text-3xl font-semibold mt-2 mb-6">{title}</h1>
        {children}
      </main>
    </div>
  )
}
