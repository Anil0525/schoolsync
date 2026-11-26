import { useEffect, useState } from 'react'
import Layout from '../components/Layout.jsx'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'
import { useI18n } from '../lib/i18n.jsx'

const STATUSES = ['new', 'contacted', 'visited', 'admitted', 'closed']
const LABEL = { new: 'New', contacted: 'Contacted', visited: 'Visited school', admitted: 'Admitted', closed: 'Closed' }
const when = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

export default function Enquiries() {
  const { profile } = useAuth()
  const { t } = useI18n()
  const isAdmin = profile?.role === 'admin'
  const [rows, setRows] = useState(null)
  const [filter, setFilter] = useState('all')
  const [notes, setNotes] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  async function load() {
    const { data, error } = await supabase.from('ss_enquiries').select('*').order('created_at', { ascending: false }).limit(1000)
    if (error) {
      setError(/does not exist|schema cache|Could not find/.test(error.message) ? 'Enquiries are not set up yet. Run 027_public_site.sql in Supabase.' : error.message)
      setRows([]); return
    }
    setError(''); setRows(data || [])
    setNotes(Object.fromEntries((data || []).map((x) => [x.id, x.notes || ''])))
  }
  useEffect(() => { if (profile) load() }, [profile])

  async function update(id, patch) {
    setBusy(id); setError('')
    const { error } = await supabase.from('ss_enquiries').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
    setBusy('')
    if (error) setError(error.message); else load()
  }
  async function remove(x) {
    if (!confirm(`${t('Delete')} ${x.child_name}?`)) return
    const { error } = await supabase.from('ss_enquiries').delete().eq('id', x.id)
    if (error) setError(error.message); else load()
  }

  if (profile && !['admin', 'principal'].includes(profile.role)) return <Layout title="Admission enquiries"><p className="text-muted">{t('Only the admin and principal can open this page.')}</p></Layout>

  const count = (s) => (rows || []).filter((x) => x.status === s).length
  const shown = (rows || []).filter((x) => filter === 'all' || x.status === filter)

  return (
    <Layout title="Admission enquiries">
      {error && <p className="text-mark text-sm mb-4">{error}</p>}
      <div className="flex flex-wrap gap-2 mb-5" role="group" aria-label={t('Filter by status')}>
        {['all', ...STATUSES].map((s) => (
          <button key={s} onClick={() => setFilter(s)} aria-pressed={filter === s}
            className={`border rounded-md px-3 py-1.5 text-sm ${filter === s ? 'bg-board text-chalk border-board' : 'bg-white border-line'}`}>
            {s === 'all' ? `${t('All')} (${(rows || []).length})` : `${t(LABEL[s])} (${count(s)})`}
          </button>
        ))}
      </div>
      {!rows && <p className="text-muted">{t('Loading…')}</p>}
      <ul className="space-y-3">
        {shown.map((x) => {
          const wa = `https://wa.me/${x.phone.length === 10 ? '91' + x.phone : x.phone}`
          return (
            <li key={x.id} className="bg-white border border-line rounded-md p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{x.child_name} <span className="text-sm text-muted">· {x.class_applying}</span></p>
                  <p className="text-sm">{t('Parent')}: {x.parent_name}</p>
                  <p className="text-sm flex flex-wrap gap-x-4">
                    <a href={`tel:+91${x.phone}`} className="underline underline-offset-4 text-board">{x.phone}</a>
                    <a href={wa} target="_blank" rel="noreferrer" className="underline underline-offset-4">WhatsApp</a>
                    {x.email && <a href={`mailto:${x.email}`} className="underline underline-offset-4">{x.email}</a>}
                  </p>
                  {x.message && <p className="text-sm mt-1">{x.message}</p>}
                  <p className="text-xs text-muted mt-1">{t('Received')} {when(x.created_at)}</p>
                </div>
                <label className="text-sm">{t('Status')}
                  <select value={x.status} disabled={busy === x.id} onChange={(e) => update(x.id, { status: e.target.value })} className="border border-line rounded-md px-3 py-2 bg-white block mt-1">
                    {STATUSES.map((s) => <option key={s} value={s}>{t(LABEL[s])}</option>)}
                  </select>
                </label>
              </div>
              <div className="flex flex-wrap gap-2 items-end">
                <label className="text-sm flex-1 min-w-52">{t('Notes')}
                  <input value={notes[x.id] ?? ''} onChange={(e) => setNotes({ ...notes, [x.id]: e.target.value })} className="border border-line rounded-md px-3 py-2 bg-white w-full mt-1" />
                </label>
                <button disabled={busy === x.id || (notes[x.id] ?? '') === (x.notes || '')} onClick={() => update(x.id, { notes: (notes[x.id] || '').trim() || null })} className="border border-board text-board rounded-md px-3 py-2 text-sm disabled:opacity-50">{t('Save note')}</button>
                {isAdmin && <button onClick={() => remove(x)} className="text-mark underline underline-offset-4 text-xs pb-2">{t('Delete')}</button>}
              </div>
            </li>
          )
        })}
        {rows && shown.length === 0 && <li className="text-muted text-sm">{t('No enquiries here yet.')}</li>}
      </ul>
    </Layout>
  )
}
