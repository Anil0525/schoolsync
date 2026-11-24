import { useEffect, useMemo, useState } from 'react'
import Layout from '../components/Layout.jsx'
import Modal from '../components/Modal.jsx'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'
import { useI18n } from '../lib/i18n.jsx'
import { DAYS } from '../lib/cal.js'

const input = 'border border-line rounded-md px-3 py-2 bg-white w-full mt-1'
const MAX_PERIODS = 8
const secLabel = (s) => `${s?.ss_classes?.name || ''} ${s?.name || ''}`.trim()

export default function Routine() {
  const { profile } = useAuth()
  const { t } = useI18n()
  const role = profile?.role
  const isAdmin = role === 'admin'
  const isTeacher = role === 'teacher'
  const [view, setView] = useState(isTeacher ? 'mine' : 'class')
  const [sections, setSections] = useState([])
  const [subjects, setSubjects] = useState([])
  const [teachers, setTeachers] = useState([])
  const [sectionId, setSectionId] = useState('')
  const [rows, setRows] = useState(null)
  const [edit, setEdit] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!profile) return
    async function init() {
      const [s, sub, tch] = await Promise.all([
        supabase.from('ss_sections').select('id, name, ss_classes(name, sort_order)').order('name'),
        supabase.from('ss_subjects').select('id, name').order('name'),
        supabase.from('ss_profiles').select('id, full_name').eq('role', 'teacher').order('full_name'),
      ])
      let secs = s.data || []
      if (['student', 'parent'].includes(role)) {
        // RLS only returns the student's own record, or the parent's children
        const { data: kids } = await supabase.from('ss_students').select('section_id')
        const mine = new Set((kids || []).map((k) => k.section_id))
        secs = secs.filter((x) => mine.has(x.id))
      }
      secs.sort((a, b) => (a.ss_classes?.sort_order ?? 0) - (b.ss_classes?.sort_order ?? 0) || a.name.localeCompare(b.name))
      setSections(secs); setSubjects(sub.data || []); setTeachers(tch.data || [])
      setSectionId((cur) => cur || secs[0]?.id || '')
    }
    init()
  }, [profile, role])

  async function load() {
    const { data, error } = await supabase.from('ss_timetable').select('id, section_id, day_of_week, period_no, subject_id, teacher_id').limit(2000)
    if (error) {
      setError(error.message.includes('does not exist') || error.message.includes('schema cache')
        ? 'Class routine is not set up yet. Run 018_school_life.sql in Supabase.' : error.message)
      setRows([]); return
    }
    setError(''); setRows(data || [])
  }
  useEffect(() => { load() }, [])

  const subById = useMemo(() => Object.fromEntries(subjects.map((s) => [s.id, s.name])), [subjects])
  const tchById = useMemo(() => Object.fromEntries(teachers.map((x) => [x.id, x.full_name])), [teachers])
  const secById = useMemo(() => Object.fromEntries(sections.map((s) => [s.id, s])), [sections])

  const shown = (rows || []).filter((r) => (view === 'mine' ? r.teacher_id === profile.id : r.section_id === sectionId))
  const cell = (d, p) => shown.find((r) => r.day_of_week === d && r.period_no === p)
  const usedMax = Math.max(0, ...shown.map((r) => r.period_no))
  const periods = isAdmin && view === 'class' ? MAX_PERIODS : Math.max(usedMax, 6)

  return (
    <Layout title={view === 'mine' ? 'My timetable' : 'Class routine'}>
      {error && <p className="text-mark text-sm mb-4">{error}</p>}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {isTeacher && (
          <div className="flex border border-line rounded-md overflow-hidden text-sm">
            {[['mine', 'My timetable'], ['class', 'Class routine']].map(([k, label]) => (
              <button key={k} onClick={() => setView(k)} aria-pressed={view === k}
                className={`px-3 py-2 ${view === k ? 'bg-board text-chalk' : 'bg-white'}`}>{t(label)}</button>
            ))}
          </div>
        )}
        {view === 'class' && sections.length > 0 && (
          <select value={sectionId} onChange={(e) => setSectionId(e.target.value)} aria-label={t('Select class')} className="border border-line rounded-md px-3 py-2 bg-white">
            {sections.map((s) => <option key={s.id} value={s.id}>{secLabel(s)}</option>)}
          </select>
        )}
      </div>
      {!rows && <p className="text-muted">{t('Loading…')}</p>}
      {rows && view === 'class' && sections.length === 0 && <p className="text-muted text-sm">{t('No classes found.')}</p>}
      {rows && (view === 'mine' || sectionId) && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-line bg-white py-2 w-16">{t('Period')}</th>
                {DAYS.map((d) => <th key={d} className="border border-line bg-white py-2 font-medium">{t(d)}</th>)}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: periods }, (_, i) => i + 1).map((p) => (
                <tr key={p}>
                  <th className="border border-line bg-white py-2 font-medium">{p}</th>
                  {DAYS.map((_, di) => {
                    const r = cell(di + 1, p)
                    const body = r ? (
                      <>
                        <span className="font-medium">{subById[r.subject_id] || '—'}</span>
                        <span className="block text-xs text-muted">
                          {view === 'mine' ? secLabel(secById[r.section_id]) : tchById[r.teacher_id] || ''}
                        </span>
                      </>
                    ) : <span className="text-muted text-xs">{isAdmin && view === 'class' ? '+' : t('Free')}</span>
                    return (
                      <td key={di} className="border border-line bg-white p-0 h-14 text-center">
                        {isAdmin && view === 'class' ? (
                          <button onClick={() => setEdit({ day: di + 1, period: p, row: r })} className="w-full h-full px-1 hover:bg-chalk" aria-label={`${t(DAYS[di])} ${t('Period')} ${p}`}>{body}</button>
                        ) : <div className="px-1">{body}</div>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {edit && <EditModal edit={edit} sectionId={sectionId} schoolId={profile.school_id} subjects={subjects} teachers={teachers}
        onClose={() => setEdit(null)} onDone={() => { setEdit(null); load() }} />}
    </Layout>
  )
}

function EditModal({ edit, sectionId, schoolId, subjects, teachers, onClose, onDone }) {
  const { t } = useI18n()
  const [subjectId, setSubjectId] = useState(edit.row?.subject_id || '')
  const [teacherId, setTeacherId] = useState(edit.row?.teacher_id || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save(e) {
    e.preventDefault()
    setError('')
    if (!subjectId) return setError(t('Select a subject.'))
    setBusy(true)
    const { error } = await supabase.from('ss_timetable').upsert({
      school_id: schoolId, section_id: sectionId, day_of_week: edit.day, period_no: edit.period,
      subject_id: subjectId, teacher_id: teacherId || null,
    }, { onConflict: 'section_id,day_of_week,period_no' })
    setBusy(false)
    if (!error) return onDone()
    setError(error.code === '23505' || error.message.includes('ss_timetable_teacher_slot')
      ? t('This teacher already has a class in that period.') : error.message)
  }
  async function clear() {
    setBusy(true)
    const { error } = await supabase.from('ss_timetable').delete().eq('id', edit.row.id)
    setBusy(false)
    if (error) setError(error.message); else onDone()
  }

  return (
    <Modal title="Edit period" onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <p className="text-sm text-muted">{t(DAYS[edit.day - 1])} · {t('Period')} {edit.period}</p>
        <label className="block text-sm">{t('Subject')}
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={input}>
            <option value="">{t('None')}</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="block text-sm">{t('Teacher')}
          <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className={input}>
            <option value="">{t('None')}</option>
            {teachers.map((x) => <option key={x.id} value={x.id}>{x.full_name}</option>)}
          </select>
        </label>
        {error && <p className="text-mark text-sm">{error}</p>}
        <div className="flex gap-3">
          <button disabled={busy} className="flex-1 bg-board hover:bg-board-dark text-chalk rounded-md py-2.5 font-medium disabled:opacity-60">{busy ? t('Saving…') : t('Save')}</button>
          {edit.row && <button type="button" disabled={busy} onClick={clear} className="border border-mark text-mark rounded-md px-4 py-2.5 disabled:opacity-60">{t('Clear')}</button>}
        </div>
      </form>
    </Modal>
  )
}
