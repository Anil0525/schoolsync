import { useEffect, useState } from 'react'
import Layout from '../components/Layout.jsx'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'
import { useI18n } from '../lib/i18n.jsx'

const input = 'border border-line rounded-md px-3 py-2 bg-white w-full mt-1'

export default function Syllabus() {
  const { profile } = useAuth()
  const { t } = useI18n()
  const canEdit = ['admin', 'teacher'].includes(profile?.role)
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [classId, setClassId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [topics, setTopics] = useState(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!profile) return
    async function init() {
      const [c, s] = await Promise.all([
        supabase.from('ss_classes').select('id, name').order('sort_order').order('name'),
        supabase.from('ss_subjects').select('id, name').order('name'),
      ])
      const cls = c.data || [], subs = s.data || []
      let pick = cls[0]?.id || ''
      if (['student', 'parent'].includes(profile.role)) {
        const { data: kids } = await supabase.from('ss_students').select('ss_sections(class_id)').limit(1)
        pick = kids?.[0]?.ss_sections?.class_id || pick
      }
      setClasses(cls); setSubjects(subs); setClassId(pick); setSubjectId(subs[0]?.id || '')
    }
    init()
  }, [profile])

  async function load() {
    if (!classId || !subjectId) { setTopics([]); return }
    const { data, error } = await supabase.from('ss_syllabus').select('*').eq('class_id', classId).eq('subject_id', subjectId).order('sort_order').order('created_at')
    if (error) {
      setError(error.message.includes('does not exist') || error.message.includes('schema cache')
        ? 'Syllabus is not set up yet. Run 018_school_life.sql in Supabase.' : error.message)
      setTopics([]); return
    }
    setError(''); setTopics(data || [])
  }
  useEffect(() => { setTopics(null); load() }, [classId, subjectId])

  async function add(e) {
    e.preventDefault()
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
    if (lines.length === 0) return setError(t('Enter at least one topic.'))
    setBusy(true); setError('')
    const start = Math.max(0, ...(topics || []).map((x) => x.sort_order))
    const { error } = await supabase.from('ss_syllabus').insert(lines.map((topic, i) => ({
      school_id: profile.school_id, class_id: classId, subject_id: subjectId, topic, sort_order: start + i + 1,
    })))
    setBusy(false)
    if (error) setError(error.message); else { setText(''); load() }
  }
  async function toggle(x) {
    const { error } = await supabase.from('ss_syllabus').update({ done: !x.done }).eq('id', x.id)
    if (error) setError(error.message); else setTopics((cur) => cur.map((y) => (y.id === x.id ? { ...y, done: !x.done } : y)))
  }
  async function remove(x) {
    if (!confirm(t('Delete this topic?'))) return
    const { error } = await supabase.from('ss_syllabus').delete().eq('id', x.id)
    if (error) setError(error.message); else load()
  }

  const done = (topics || []).filter((x) => x.done).length
  const pct = topics?.length ? Math.round((done / topics.length) * 100) : 0

  return (
    <Layout title="Syllabus">
      {error && <p className="text-mark text-sm mb-4">{error}</p>}
      <div className="flex flex-wrap gap-3 mb-5">
        <select value={classId} onChange={(e) => setClassId(e.target.value)} aria-label={t('Class')} className="border border-line rounded-md px-3 py-2 bg-white">
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} aria-label={t('Subject')} className="border border-line rounded-md px-3 py-2 bg-white">
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      {!topics && <p className="text-muted">{t('Loading…')}</p>}
      {topics && (
        <>
          {topics.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-muted">{done} / {topics.length} {t('topics completed')} ({pct}%)</p>
              <div className="h-2 bg-line rounded-full mt-1" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-2 bg-board rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}
          <ul className="space-y-2">
            {topics.map((x) => (
              <li key={x.id} className="bg-white border border-line rounded-md p-3 flex items-center gap-3">
                <input type="checkbox" checked={x.done} disabled={!canEdit} onChange={() => toggle(x)} aria-label={x.topic} className="size-4 accent-[#1f4d3f]" />
                <span className={`flex-1 ${x.done ? 'text-muted line-through' : ''}`}>{x.topic}</span>
                <span className="text-xs text-muted">{x.done ? t('Completed') : t('Pending')}</span>
                {canEdit && <button onClick={() => remove(x)} className="text-mark underline underline-offset-4 text-xs">{t('Delete')}</button>}
              </li>
            ))}
            {topics.length === 0 && <li className="text-muted text-sm">{t('No topics added yet.')}</li>}
          </ul>
          {canEdit && classId && subjectId && (
            <form onSubmit={add} className="mt-6 max-w-lg">
              <label className="block text-sm">{t('Add topics (one per line)')}
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} className={input} />
              </label>
              <button disabled={busy} className="mt-3 bg-board hover:bg-board-dark text-chalk rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60">
                {busy ? t('Saving…') : t('Add topics')}
              </button>
            </form>
          )}
        </>
      )}
    </Layout>
  )
}
