import { useEffect, useState } from 'react'
import Layout from '../components/Layout.jsx'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'
import { useI18n } from '../lib/i18n.jsx'
import { niceDate } from '../lib/dates.js'
import { birthdayList, wishText, wishCardBlob } from '../lib/birthday.js'

const classOf = (s) => `${s.ss_sections?.ss_classes?.name || ''} ${s.ss_sections?.name || ''}`.trim()

export default function Birthdays() {
  const { profile } = useAuth()
  const { t, lang } = useI18n()
  const allowed = !!profile && ['admin', 'teacher', 'principal'].includes(profile.role)
  const [list, setList] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const school = profile?.ss_schools?.name || 'SchoolSync'

  useEffect(() => {
    if (!allowed) return
    supabase.from('ss_students').select('id, full_name, dob, ss_sections(name, ss_classes(name))')
      .eq('status', 'active').not('dob', 'is', null).limit(5000)
      .then(({ data, error }) => {
        if (error) { setError(error.message); setList([]) } else setList(birthdayList(data || [], 30))
      })
  }, [allowed])

  async function card(s, cardLang) {
    setBusy(s.id + cardLang)
    try {
      const blob = await wishCardBlob({ name: s.full_name, classLabel: classOf(s), school, lang: cardLang })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `birthday-${s.full_name.replace(/\s+/g, '-')}-${cardLang}.png`
      a.click(); URL.revokeObjectURL(url)
    } catch { setError(t('Could not create the card.')) }
    setBusy('')
  }

  if (profile && !allowed) return <Layout title="Birthdays"><p className="text-muted">{t('Only staff can open this page.')}</p></Layout>

  const todays = (list || []).filter((s) => s.inDays === 0)
  const soon = (list || []).filter((s) => s.inDays > 0)

  const row = (s) => (
    <li key={s.id} className="bg-white border border-line rounded-md p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{s.full_name}</p>
          <p className="text-xs text-muted">{[classOf(s), `${t('Turns')} ${s.age}`, s.inDays === 0 ? t('Today') : `${niceDate(s.date)} (${s.inDays} ${t('days to go')})`].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <button disabled={!!busy} onClick={() => card(s, 'en')} className="border border-board text-board rounded-md px-3 py-1.5 disabled:opacity-60">{t('Card (English)')}</button>
          <button disabled={!!busy} onClick={() => card(s, 'te')} className="border border-board text-board rounded-md px-3 py-1.5 disabled:opacity-60">{t('Card (Telugu)')}</button>
          <a href={`https://wa.me/?text=${encodeURIComponent(wishText(s.full_name, school, lang))}`} target="_blank" rel="noreferrer" className="border border-line rounded-md px-3 py-1.5">{t('Share on WhatsApp')}</a>
        </div>
      </div>
    </li>
  )

  return (
    <Layout title="Birthdays">
      {error && <p className="text-mark text-sm mb-4">{error}</p>}
      {!list && <p className="text-muted">{t('Loading…')}</p>}
      {list && (
        <div className="space-y-6">
          <section>
            <h2 className="font-display text-xl font-semibold mb-2">{t('Birthdays today')}</h2>
            <ul className="space-y-3">
              {todays.map(row)}
              {todays.length === 0 && <li className="text-muted text-sm">{t('No birthdays today.')}</li>}
            </ul>
          </section>
          <section>
            <h2 className="font-display text-xl font-semibold mb-2">{t('Next 30 days')}</h2>
            <ul className="space-y-3">
              {soon.map(row)}
              {soon.length === 0 && <li className="text-muted text-sm">{t('No birthdays in the next 30 days.')}</li>}
            </ul>
            <p className="text-xs text-muted mt-3">{t('WhatsApp opens with the message ready. Pick the parent’s chat and send.')}</p>
          </section>
        </div>
      )}
    </Layout>
  )
}
