import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { isConfigured } from '../lib/supabaseClient'

export default function Login() {
  const { session, signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (session) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error } = await signIn(email, password)
    setBusy(false)
    if (error) setError(error.message)
    else navigate('/')
  }

  return (
    <main className="min-h-screen grid md:grid-cols-2">
      <section className="bg-board text-chalk p-10 md:p-16 flex flex-col justify-between">
        <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight">SchoolSync</h1>
        <p className="text-lg max-w-sm text-chalk/85 mt-10 md:mt-0">
          Attendance, marks, fees and UDISE+ data in one place, so staff spend their time teaching.
        </p>
      </section>

      <section className="p-8 md:p-16 flex items-center">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
          <h2 className="font-display text-2xl font-semibold">Sign in</h2>

          {!isConfigured && (
            <p className="border border-mark text-mark rounded-md p-3 text-sm">
              Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file and restart.
            </p>
          )}

          <label className="block">
            <span className="text-sm text-muted">Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full border border-line rounded-md px-3 py-2 bg-white" />
          </label>

          <label className="block">
            <span className="text-sm text-muted">Password</span>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full border border-line rounded-md px-3 py-2 bg-white" />
          </label>

          {error && <p className="text-mark text-sm">{error}</p>}

          <button disabled={busy}
            className="w-full bg-board hover:bg-board-dark text-chalk rounded-md py-2.5 font-medium disabled:opacity-60">
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  )
}
