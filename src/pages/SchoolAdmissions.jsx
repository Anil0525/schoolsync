import { useState } from 'react'
import { Link } from 'react-router-dom'
import PublicLayout from '../components/PublicLayout.jsx'
import { useI18n } from '../lib/i18n.jsx'
import { submitEnquiry } from '../lib/site.js'

const input = 'border border-line rounded-md px-3 py-2 bg-white w-full mt-1'
const EMPTY = { child: '', cls: '', parent: '', phone: '', email: '', message: '' }

function Form({ site }) {
  const { t } = useI18n()
  const [f, setF] = useState(EMPTY)
  const [trap, setTrap] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const set = (k, v) => setF((cur) => ({ ...cur, [k]: v }))
  const classes = site.classes || []

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (f.child.trim().length < 2) return setError(t('Enter the child’s name.'))
    if (!f.cls) return setError(t('Choose the class.'))
    if (f.parent.trim().length < 2) return setError(t('Enter the parent’s name.'))
    if (!/^(\+?91|0)?[6-9]\d{9}$/.test(f.phone.replace(/[\s-]/g, ''))) return setError(t('Enter a valid 10 digit mobile number.'))
    if (trap) { setDone(f.phone); return }   // bots fill the hidden field; they get a fake success and nothing is saved
    setBusy(true)
    const err = await submitEnquiry(f)
    setBusy(false)
    if (err) setError(err); else { setDone(f.phone); setF(EMPTY) }
  }

  if (done) {
    return (
      <div role="status" className="max-w-xl">
        <h2 className="font-display text-2xl font-semibold text-board">{t('Thank you. We have your enquiry.')}</h2>
        <p className="ruled-body mt-2">{t('The school will call you on')} {done} {t('soon.')}</p>
        <Link to="/school" className="inline-block mt-4 underline underline-offset-4 text-board">{t('Back to home')}</Link>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="max-w-xl space-y-4" noValidate>
      <div className="hidden" aria-hidden="true">
        <label>Website<input tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} /></label>
      </div>
      <label className="block text-sm">{t('Child’s name')}<input required value={f.child} onChange={(e) => set('child', e.target.value)} autoComplete="off" className={input} /></label>
      <label className="block text-sm">{t('Class applying for')}
        {classes.length > 0 ? (
          <select required value={f.cls} onChange={(e) => set('cls', e.target.value)} className={input}>
            <option value="">{t('Select a class')}</option>
            {classes.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        ) : <input required value={f.cls} onChange={(e) => set('cls', e.target.value)} placeholder="Class 1" className={input} />}
      </label>
      <label className="block text-sm">{t('Parent’s name')}<input required value={f.parent} onChange={(e) => set('parent', e.target.value)} autoComplete="name" className={input} /></label>
      <label className="block text-sm">{t('Mobile number')}<input required type="tel" inputMode="numeric" value={f.phone} onChange={(e) => set('phone', e.target.value)} autoComplete="tel" placeholder="98765 43210" className={input} /></label>
      <label className="block text-sm">{t('Email (optional)')}<input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" className={input} /></label>
      <label className="block text-sm">{t('Message (optional)')}<textarea rows={3} maxLength={1000} value={f.message} onChange={(e) => set('message', e.target.value)} className={input} /></label>
      {error && <p role="alert" className="text-mark text-sm">{error}</p>}
      <button disabled={busy} className="bg-board hover:bg-board-dark text-chalk rounded-md px-6 py-3 font-medium disabled:opacity-60">
        {busy ? t('Sending…') : t('Send enquiry')}
      </button>
    </form>
  )
}

export default function SchoolAdmissions() {
  const { t } = useI18n()
  return (
    <PublicLayout>
      {(site) => (
        <div className="ruled">
          <div className="max-w-5xl mx-auto py-12 pr-5 pl-[3.75rem] md:pl-[7rem]">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-board mb-4">{t('Admissions')}</h1>
            {site.admissions_note && <p className="ruled-body max-w-xl mb-6">{site.admissions_note}</p>}
            {site.admissions_open
              ? <Form site={site} />
              : <p className="ruled-body max-w-xl">{t('Admissions are closed right now')}. {site.phone ? `${t('Call')} ${site.phone}.` : ''}</p>}
          </div>
        </div>
      )}
    </PublicLayout>
  )
}
