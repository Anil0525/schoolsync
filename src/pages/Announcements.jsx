import { useEffect, useState } from 'react'
import Layout from '../components/Layout.jsx'
import Modal from '../components/Modal.jsx'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'
import { useI18n } from '../lib/i18n.jsx'

const input = 'border border-line rounded-md px-3 py-2 bg-white w-full mt-1'
const AUDIENCE = { all: 'Everyone', students: 'Students', parents: 'Parents', teachers: 'Teachers only' }
const secLabel = (s) => `${s?.ss_classes?.name || ''} ${s?.name || ''}`.trim()
const when = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

export default function Announcements() {
  const { profile } = useAuth()
  const { t } = useI18n()
  const canPost = ['admin', 'teacher'].includes(profile?.role)
  const [items, setItems] = useState(null)
  const [sections, setSections] = useState([])
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const [a, s] = await Promise.all([
      supabase.from('ss_announcements').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('ss_sections').select('id, name, ss_classes(name)').order('name'),
    ])
    const err = a.error || s.error
    if (err) {
      setError(err.message.includes('does not exist') || err.message.includes('schema cache')
        ? 'Announcements are not set up yet. Run 012_announcements_homework.sql in Supabase.' : err.message)
      setItems([])
      return
    }
    setError(''); setItems(a.data || []); setSections(s.data || [])
  }
  useEffect(() => { load() }, [])

  const secById = Object.fromEntries(sections.map((s) => [s.id, s]))
  const canDelete = (a) => profile?.role === 'admin' || (profile?.role === 'teacher' && a.created_by === profile.id)

  async function remove(a) {
    if (!confirm(`Delete "${a.title}"?`)) return
    const { error } = await supabase.from('ss_announcements').delete().eq('id', a.id)
    if (error) setError(error.message); else load()
  }

  return (
    <Layout title="Announcements">
      {error && <p className="text-mark text-sm mb-4">{error}</p>}
      {canPost && (
        <div className="mb-5 flex justify-end">
          <button onClick={() => setOpen(true)} className="bg-board hover:bg-board-dark text-chalk rounded-md px-4 py-2 text-sm font-medium">{t('New announcement')}</button>
        </div>
      )}
      {!items && <p className="text-muted">{t('Loading…')}</p>}
      <ul className="space-y-3">
        {items?.map((a) => (
          <li key={a.id} className="bg-white border border-line rounded-md p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="font-display text-lg font-semibold">{a.title}</h2>
              <span className="text-xs text-muted">{when(a.created_at)}</span>
            </div>
            <p className="text-sm mt-2 whitespace-pre-wrap">{a.body}</p>
            <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
              <span className="border border-line rounded-full px-2 py-0.5 text-muted">{t(AUDIENCE[a.audience])}</span>
              <span className="border border-line rounded-full px-2 py-0.5 text-muted">{a.section_id ? secLabel(secById[a.section_id]) || t('One class') : t('Whole school')}</span>
              {canDelete(a) && <button onClick={() => remove(a)} className="text-mark underline underline-offset-4 ml-auto">{t('Delete')}</button>}
            </div>
          </li>
        ))}
        {items && items.length === 0 && !error && <li className="text-muted">{t('No announcements yet.')}</li>}
      </ul>
      {open && <NewModal sections={sections} schoolId={profile.school_id} onClose={() => setOpen(false)} onDone={() => { setOpen(false); load() }} />}
    </Layout>
  )
}

function NewModal({ sections, schoolId, onClose, onDone }) {
  const { t } = useI18n()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState('all')
  const [sectionId, setSectionId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!title.trim() || !body.trim()) return setError('Enter a title and a message.')
    setBusy(true)
    const { error } = await supabase.from('ss_announcements').insert({
      school_id: schoolId, title: title.trim(), body: body.trim(), audience,
      section_id: audience === 'teachers' ? null : sectionId || null,
    })
    setBusy(false)
    if (error) setError(error.message); else onDone()
  }

  return (
    <Modal title={t('New announcement')} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm">{t('Title')}<input value={title} onChange={(e) => setTitle(e.target.value)} className={input} /></label>
        <label className="block text-sm">{t('Message')}<textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} className={input} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">{t('For')}
            <select value={audience} onChange={(e) => setAudience(e.target.value)} className={input}>
              {Object.entries(AUDIENCE).map(([v, l]) => <option key={v} value={v}>{t(l)}</option>)}
            </select>
          </label>
          <label className="block text-sm">{t('Class')}
            <select value={sectionId} onChange={(e) => setSectionId(e.target.value)} disabled={audience === 'teachers'} className={input}>
              <option value="">{t('Whole school')}</option>
              {sections.map((s) => <option key={s.id} value={s.id}>{secLabel(s)}</option>)}
            </select>
          </label>
        </div>
        {error && <p className="text-mark text-sm">{error}</p>}
        <button disabled={busy} className="w-full bg-board hover:bg-board-dark text-chalk rounded-md py-2.5 font-medium disabled:opacity-60">
          {busy ? t('Posting…') : t('Post announcement')}
        </button>
      </form>
    </Modal>
  )
}
