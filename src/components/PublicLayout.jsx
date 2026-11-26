import { Link, NavLink } from 'react-router-dom'
import { useI18n } from '../lib/i18n.jsx'
import { usePublicSite } from '../lib/site.js'
import LangToggle from './LangToggle.jsx'

const navCls = ({ isActive }) => `py-1 border-b-2 ${isActive ? 'border-board font-medium' : 'border-transparent hover:border-line'}`

export default function PublicLayout({ children }) {
  const { t } = useI18n()
  const { site, loading, error } = usePublicSite()
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-line bg-white">
        <div className="max-w-5xl mx-auto px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link to="/school" className="font-display text-xl font-bold text-board mr-auto">{site?.name || 'School'}</Link>
          <nav className="flex gap-5 text-sm" aria-label={t('Main')}>
            <NavLink to="/school" end className={navCls}>{t('Home')}</NavLink>
            <NavLink to="/school/about" className={navCls}>{t('About')}</NavLink>
            <NavLink to="/school/admissions" className={navCls}>{t('Admissions')}</NavLink>
          </nav>
          <div className="flex items-center gap-4 text-sm">
            <span className="[&_button]:bg-board [&_button]:text-chalk [&_button:hover]:bg-board-dark"><LangToggle /></span>
            <Link to="/login" className="text-muted underline underline-offset-4">{t('Staff and parent login')}</Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {loading && <p className="max-w-5xl mx-auto p-8 text-muted">{t('Loading…')}</p>}
        {!loading && error && <p className="max-w-5xl mx-auto p-8 text-mark">{error}</p>}
        {!loading && !error && !site && (
          <div className="max-w-5xl mx-auto p-8">
            <h1 className="font-display text-2xl font-semibold">{t('This website is not published yet.')}</h1>
            <p className="text-muted mt-2">{t('The school admin can publish it from Website settings after signing in.')}</p>
          </div>
        )}
        {site && children(site)}
      </main>

      {site && (
        <footer className="border-t border-line bg-white">
          <div className="max-w-5xl mx-auto px-5 py-6 text-sm text-muted grid gap-1">
            <p className="font-medium text-ink">{site.name}</p>
            {site.address && <p>{site.address}</p>}
            <p className="flex flex-wrap gap-x-5">
              {site.phone && <a href={`tel:${site.phone.replace(/[^+\d]/g, '')}`} className="underline underline-offset-4">{site.phone}</a>}
              {site.email && <a href={`mailto:${site.email}`} className="underline underline-offset-4">{site.email}</a>}
            </p>
          </div>
        </footer>
      )}
    </div>
  )
}
