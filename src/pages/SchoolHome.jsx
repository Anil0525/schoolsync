import { Link } from 'react-router-dom'
import PublicLayout from '../components/PublicLayout.jsx'
import { useI18n } from '../lib/i18n.jsx'
import { lines } from '../lib/site.js'

export default function SchoolHome() {
  const { t } = useI18n()
  return (
    <PublicLayout>
      {(site) => {
        const facilities = lines(site.facilities)
        const about = lines(site.about)
        return (
          <>
            <section className="ruled border-b border-line">
              <div className="max-w-5xl mx-auto py-16 md:py-24 pr-5 pl-[3.75rem] md:pl-[7rem]">
                <h1 className="font-display text-4xl md:text-6xl font-bold text-board leading-[1.15]">{site.name}</h1>
                {site.tagline && <p className="ruled-body text-lg md:text-xl mt-6 max-w-xl">{site.tagline}</p>}
                <div className="flex flex-wrap gap-3 mt-8">
                  {site.admissions_open
                    ? <Link to="/school/admissions" className="bg-board hover:bg-board-dark text-chalk rounded-md px-5 py-3 font-medium">{t('Apply for admission')}</Link>
                    : <span className="border border-line bg-white rounded-md px-5 py-3 text-muted">{t('Admissions are closed right now')}</span>}
                  {site.phone && <a href={`tel:${site.phone.replace(/[^+\d]/g, '')}`} className="border border-board text-board bg-white rounded-md px-5 py-3 font-medium">{t('Call')} {site.phone}</a>}
                </div>
                {site.admissions_note && <p className="ruled-body mt-6 max-w-xl text-muted">{site.admissions_note}</p>}
              </div>
            </section>

            {about.length > 0 && (
              <section className="max-w-5xl mx-auto px-5 py-12 grid md:grid-cols-[1fr_2fr] gap-6">
                <h2 className="font-display text-2xl font-semibold">{t('About')}</h2>
                <div className="space-y-3 max-w-xl">
                  {about.slice(0, 3).map((l, i) => <p key={i}>{l}</p>)}
                  <Link to="/school/about" className="inline-block underline underline-offset-4 text-board">{t('Read more about the school')}</Link>
                </div>
              </section>
            )}

            {facilities.length > 0 && (
              <section className="max-w-5xl mx-auto px-5 pb-12 grid md:grid-cols-[1fr_2fr] gap-6">
                <h2 className="font-display text-2xl font-semibold">{t('Facilities')}</h2>
                <ul className="max-w-xl border-t border-line">
                  {facilities.map((f, i) => <li key={i} className="border-b border-line py-2.5">{f}</li>)}
                </ul>
              </section>
            )}

            {site.principal_message && (
              <section className="max-w-5xl mx-auto px-5 pb-14 grid md:grid-cols-[1fr_2fr] gap-6">
                <h2 className="font-display text-2xl font-semibold">{t('From the principal')}</h2>
                <figure className="max-w-xl border-l-4 border-mark pl-5">
                  <blockquote className="space-y-3">{lines(site.principal_message).map((l, i) => <p key={i}>{l}</p>)}</blockquote>
                  {site.principal_name && <figcaption className="mt-3 text-sm text-muted">{site.principal_name}</figcaption>}
                </figure>
              </section>
            )}
          </>
        )
      }}
    </PublicLayout>
  )
}
