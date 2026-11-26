import { useEffect, useState } from 'react'
import Layout from '../components/Layout.jsx'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'
import { useI18n } from '../lib/i18n.jsx'

const input = 'border border-line rounded-md px-3 py-2 bg-white w-full mt-1'
const EMPTY = { published: false, tagline: '', about: '', principal_name: '', principal_message: '', facilities: '', address: '', phone: '', email: '', admissions_open: true, admissions_note: '' }

export default function SiteSettings() {
  const { profile } = useAuth()
  const { t } = useI18n()
  const isAdmin = profile?.role === 'admin'
  const [f, setF] = useState(null)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k, v) => setF((cur) => ({ ...cur, [k]: v }))
  const link = `${window.location.href.split('#')[0]}#/school`

  useEffect(() => {
    if (!profile) return
    supabase.from('ss_site_settings').select('*').maybeSingle().then(({ data, error }) => {
      if (error) {
        setError(/does not exist|schema cache|Could not find/.test(error.message) ? 'The website is not set up yet. Run 027_public_site.sql in Supabase.' : error.message)
        setF(EMPTY); return
      }
      setF(data ? Object.fromEntries(Object.keys(EMPTY).map((k) => [k, data[k] ?? EMPTY[k]])) : EMPTY)
    })
  }, [profile])

  async function save(e) {
    e.preventDefault()
    setError(''); setMsg('')
    if (f.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) return setError(t('Enter a valid email or leave it empty.'))
    setBusy(true)
    const row = { school_id: profile.school_id, updated_at: new Date().toISOString() }
    Object.keys(EMPTY).forEach((k) => { row[k] = typeof f[k] === 'string' ? (f[k].trim() || null) : f[k] })
    const { error } = await supabase.from('ss_site_settings').upsert(row)
    setBusy(false)
    if (error) setError(error.message); else setMsg(f.published ? t('Saved. The website is live.') : t('Saved. The website is hidden until you publish it.'))
  }

  const field = (k, label, props = {}) => (
    <label className="block text-sm">{t(label)}
      {props.rows
        ? <textarea rows={props.rows} value={f[k]} onChange={(e) => set(k, e.target.value)} disabled={!isAdmin} className={input} />
        : <input value={f[k]} onChange={(e) => set(k, e.target.value)} disabled={!isAdmin} className={input} {...props} />}
    </label>
  )

  if (profile && !['admin', 'principal'].includes(profile.role)) return <Layout title="School website"><p className="text-muted">{t('Only the admin and principal can open this page.')}</p></Layout>

  return (
    <Layout title="School website">
      {error && <p className="text-mark text-sm mb-4">{error}</p>}
      {msg && <p className="text-board text-sm mb-4">{msg}</p>}
      {!f && <p className="text-muted">{t('Loading…')}</p>}
      {f && (
        <form onSubmit={save} className="max-w-2xl space-y-4">
          <div className="bg-white border border-line rounded-md p-4 space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={f.published} disabled={!isAdmin} onChange={(e) => set('published', e.target.checked)} className="size-4 accent-[#1f4d3f]" />
              {t('Publish the website')}
            </label>
            <p className="text-sm text-muted">{t('Link to share with parents')}: <a href={link} target="_blank" rel="noreferrer" className="underline underline-offset-4 text-board break-all">{link}</a></p>
          </div>
          {field('tagline', 'Tagline (one line)', { placeholder: 'Learning with care, from Class 1 to Class 10' })}
          {field('about', 'About the school (one paragraph per line)', { rows: 5 })}
          {field('facilities', 'Facilities (one per line)', { rows: 5 })}
          <div className="grid sm:grid-cols-2 gap-4">
            {field('principal_name', 'Principal name')}
            {field('phone', 'Phone')}
          </div>
          {field('principal_message', 'Message from the principal (one paragraph per line)', { rows: 4 })}
          {field('address', 'Address', { rows: 2 })}
          {field('email', 'Email', { type: 'email' })}
          <div className="bg-white border border-line rounded-md p-4 space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={f.admissions_open} disabled={!isAdmin} onChange={(e) => set('admissions_open', e.target.checked)} className="size-4 accent-[#1f4d3f]" />
              {t('Admissions are open')}
            </label>
            {field('admissions_note', 'Admissions note', { placeholder: 'Admissions are open for 2027-28, Classes 1 to 9.' })}
          </div>
          {isAdmin && <button disabled={busy} className="bg-board hover:bg-board-dark text-chalk rounded-md px-5 py-2.5 font-medium disabled:opacity-60">{busy ? t('Saving…') : t('Save website')}</button>}
        </form>
      )}
    </Layout>
  )
}
