import { useEffect, useState } from 'react'
import Layout from '../components/Layout.jsx'
import Modal from '../components/Modal.jsx'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'
import { today, niceDate } from '../lib/dates.js'
import { useI18n } from '../lib/i18n.jsx'

const input = 'border border-line rounded-md px-3 py-2 bg-white w-full mt-1'
const secLabel = (s) => `${s?.ss_classes?.name || ''} ${s?.name || ''}`.trim()

export default function Homework() {
  const { profile } = useAuth()
  const { t } = useI18n()
  const canPost = ['admin', 'teacher'].includes(profile?.role)
  const [items, setItems] = useState(null)
  const [sections, setSections] = useState([])
  const [subjects, setSubjects] = useState([])
  const [sectionFilter, setSectionFilter] = useState('all')
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const [h, s, sub] = await Promise.all([
      supabase.from('ss_homework').select('*').order('due_date', { ascending: false }).limit(200),
      supabase.from('ss_sections').select('id, name, ss_classes(name)').order('name'),
      supabase.from('ss_subjects').select('id, name').order('name'),
    ])
    const err = h.error || s.error
    if (err) {
      setError(err.message.includes('does not exist') || err.message.includes('schema cache')
        ? 'Homework is not set up yet. Run 012_announcements_homework.sql in Supabase.' : err.message)
      setItems([])
      return
    }
    setError(''); setItems(h.data || []); setSections(s.data || []); setSubjects(sub.data || [])
  }
  useEffect(() => { load() }, [])

  const secById = Object.fromEntries(sections.map((s) => [s.id, s]))
  const subById = Object.fromEntries(subjects.map((s) => [s.id, s.name]))
  const canDelete = (h) => profile?.role === 'admin' || (profile?.role === 'teacher' && h.created_by === profile.id)
  const shown = (items || []).filter((h) => sectionFilter === 'all' || h.section_id === sectionFilter)
  const upcoming = shown.filter((h) => h.due_date >= today()).sort((a, b) => a.due_date.localeCompare(b.due_date))
  const past = shown.filter((h) => h.due_date < today())

  async function remove(h) {
    if (!confirm(`Delete "${h.title}"?`)) return
    const { error } = await supabase.from('ss_homework').delete().eq('id', h.id)
    if (error) setError(error.message); else load()
  }

  const card = (h, isPast) => (
    <li key={h.id} className="bg-white border border-line rounded-md p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{h.title}</p>
          <p className="text-xs text-muted">{[subById[h.subject_id], secLabel(secById[h.section_id])].filter(Boolean).join(' · ')}</p>
        </div>
        <span className={`border rounded-full px-2 py-0.5 text-xs ${isPast ? 'text-muted border-line' : h.due_date === today() ? 'text-mark border-mark' : 'text-board border-board'}`}>
          {h.due_date === today() ? t('Due today') : `${t(isPast ? 'Was due' : 'Due')} ${niceDate(h.due_date)}`}
        </span>
      </div>
      {h.details && <p className="text-sm mt-2 whitespace-pre-wrap">{h.details}</p>}
      {canDelete(h) && <button onClick={() => remove(h)} className="text-mark underline underline-offset-4 text-xs mt-2">{t('Delete')}</button>}
    </li>
  )

  return (
    <Layout title="Homework">
      {error && <p className="text-mark text-sm mb-4">{error}</p>}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {sections.length > 1 && (
          <select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)} aria-label="Class filter" className="border border-line rounded-md px-3 py-2 bg-white">
            <option value="all">{t('All classes')}</option>
            {sections.map((s) => <option key={s.id} value={s.id}>{secLabel(s)}</option>)}
          </select>
        )}
        {canPost && (
          <button onClick={() => setOpen(true)} className="ml-auto bg-board hover:bg-board-dark text-chalk rounded-md px-4 py-2 text-sm font-medium">{t('Add homework')}</button>
        )}
      </div>
      {!items && <p className="text-muted">{t('Loading…')}</p>}

      {items && (
        <div className="space-y-6">
          <section>
            <h2 className="font-display text-xl font-semibold mb-2">{t('Upcoming')}</h2>
            <ul className="space-y-3">
              {upcoming.map((h) => card(h, false))}
              {upcoming.length === 0 && <li className="text-muted text-sm">{t('No homework due. Enjoy!')}</li>}
            </ul>
          </section>
          {past.length > 0 && (
            <section>
              <h2 className="font-display text-xl font-semibold mb-2">{t('Earlier')}</h2>
              <ul className="space-y-3">{past.map((h) => card(h, true))}</ul>
            </section>
          )}
        </div>
      )}
      {open && <NewModal sections={sections} subjects={subjects} schoolId={profile.school_id} onClose={() => setOpen(false)} onDone={() => { setOpen(false); load() }} />}
    </Layout>
  )
}

function NewModal({ sections, subjects, schoolId, onClose, onDone }) {
  const { t } = useI18n()
  const [sectionId, setSectionId] = useState(sections[0]?.id || '')
  const [subjectId, setSubjectId] = useState('')
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const [due, setDue] = useState(today())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!sectionId) return setError('Select a class.')
    if (!title.trim()) return setError('Enter a title.')
    setBusy(true)
    const { error } = await supabase.from('ss_homework').insert({
      school_id: schoolId, section_id: sectionId, subject_id: subjectId || null,
      title: title.trim(), details: details.trim() || null, due_date: due,
    })
    setBusy(false)
    if (error) setError(error.message); else onDone()
  }

  return (
    <Modal title={t('Add homework')} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">{t('Class')}
            <select value={sectionId} onChange={(e) => setSectionId(e.target.value)} className={input}>
              {sections.map((s) => <option key={s.id} value={s.id}>{secLabel(s)}</option>)}
            </select>
          </label>
          <label className="block text-sm">{t('Subject (optional)')}
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={input}>
              <option value="">{t('None')}</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        </div>
        <label className="block text-sm">{t('Title')}<input value={title} onChange={(e) => setTitle(e.target.value)} className={input} /></label>
        <label className="block text-sm">{t('Details (optional)')}<textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={4} className={input} /></label>
        <label className="block text-sm">{t('Due date')}<input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={input} /></label>
        {error && <p className="text-mark text-sm">{error}</p>}
        <button disabled={busy} className="w-full bg-board hover:bg-board-dark text-chalk rounded-md py-2.5 font-medium disabled:opacity-60">
          {busy ? t('Saving…') : t('Add homework')}
        </button>
      </form>
    </Modal>
  )
}
