import PublicLayout from '../components/PublicLayout.jsx'
import { useI18n } from '../lib/i18n.jsx'
import { lines } from '../lib/site.js'

export default function SchoolAbout() {
  const { t } = useI18n()
  return (
    <PublicLayout>
      {(site) => (
        <div className="ruled">
          <div className="max-w-5xl mx-auto py-12 pr-5 pl-[3.75rem] md:pl-[7rem]">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-board mb-6">{t('About')} {site.name}</h1>
            <div className="ruled-body max-w-xl">
              {lines(site.about).map((l, i) => <p key={i}>{l}</p>)}
              {lines(site.about).length === 0 && <p className="text-muted">{t('The school has not added this yet.')}</p>}
            </div>

            {lines(site.facilities).length > 0 && (
              <>
                <h2 className="font-display text-2xl font-semibold mt-10 mb-2">{t('Facilities')}</h2>
                <ul className="ruled-body max-w-xl list-disc pl-5">{lines(site.facilities).map((f, i) => <li key={i}>{f}</li>)}</ul>
              </>
            )}

            {site.principal_message && (
              <>
                <h2 className="font-display text-2xl font-semibold mt-10 mb-2">{t('From the principal')}</h2>
                <div className="ruled-body max-w-xl">{lines(site.principal_message).map((l, i) => <p key={i}>{l}</p>)}</div>
                {site.principal_name && <p className="mt-2 font-medium">{site.principal_name}</p>}
              </>
            )}

            <h2 className="font-display text-2xl font-semibold mt-10 mb-2">{t('Visit us')}</h2>
            <div className="ruled-body max-w-xl">
              {site.address && <p>{site.address}</p>}
              {site.phone && <p><a href={`tel:${site.phone.replace(/[^+\d]/g, '')}`} className="underline underline-offset-4">{site.phone}</a></p>}
              {site.email && <p><a href={`mailto:${site.email}`} className="underline underline-offset-4">{site.email}</a></p>}
            </div>
          </div>
        </div>
      )}
    </PublicLayout>
  )
}
