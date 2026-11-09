import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { useI18n } from '../lib/i18n.jsx'
import LangToggle from './LangToggle.jsx'

export default function Layout({ title, children }) {
  const { profile, signOut } = useAuth()
  const { t } = useI18n()
  return (
    <div className="min-h-screen">
      <header className="bg-board text-chalk px-6 py-4 flex items-center justify-between">
        <Link to="/" className="font-display text-xl font-bold">SchoolSync</Link>
        <div className="flex items-center gap-4 text-sm">
          <LangToggle />
          <span>{profile?.full_name || t('User')}{profile?.role ? ` (${t(profile.role)})` : ''}</span>
          <button onClick={signOut} className="underline underline-offset-4">{t('Sign out')}</button>
        </div>
      </header>
      <main className="max-w-5xl mx-auto p-6 md:p-10">
        <Link to="/" className="text-sm text-muted underline underline-offset-4">{t('Back to dashboard')}</Link>
        <h1 className="font-display text-3xl font-semibold mt-2 mb-6">{t(title)}</h1>
        {children}
      </main>
    </div>
  )
}
