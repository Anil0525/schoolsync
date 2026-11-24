import { useEffect, useMemo, useState } from 'react'
import Layout from '../components/Layout.jsx'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'
import { useI18n } from '../lib/i18n.jsx'
import { niceDate, today } from '../lib/dates.js'
import { downloadHallTickets } from '../lib/hallTicketPdf.js'

const input = 'border border-line rounded-md px-3 py-2 bg-white w-full mt-1'
const fmtTime = (hhmm) => {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}
const dayName = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' })

export default function HallTickets() {
  const { profile } = useAuth()
  const { t } = useI18n()
  const role = profile?.role
  const isAdmin = role === 'admin'
  const isStaff = ['admin', 'teacher', 'principal'].includes(role)
  const school = profile?.ss_schools?.name || 'School'
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [schedule, setSchedule] = useState(null)
  const [students, setStudents] = useState([])
  const [classId, setClassId] = useState('')
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const [c, s, sch, st] = await Promise.all([
      supabase.from('ss_classes').select('id, name').order('sort_order').order('name'),
      supabase.from('ss_subjects').select('id, name').order('name'),
      supabase.from('ss_exam_schedule').select('*').order('exam_date').limit(2000),
      supabase.from('ss_students').select('id, full_name, admission_no, dob, status, ss_sections(name, class_id, ss_classes(name))').order('full_name').limit(5000),
    ])
    if (sch.error) {
      setError(sch.error.message.includes('does not exist') || sch.error.message.includes('schema cache')
        ? 'Hall tickets are not set up yet. Run 020_hall_tickets_certificates.sql in Supabase.' : sch.error.message)
      setSchedule([]); return
    }
    setError('')
    setClasses(c.data || []); setSubjects(s.data || []); setSchedule(sch.data || [])
    setStudents((st.data || []).filter((x) => !isStaff || x.status === 'active'))
    setClassId((cur) => cur || (c.data || [])[0]?.id || '')
  }
  useEffect(() => { if (profile) load() }, [profile])

  const subById = useMemo(() => Object.fromEntries(subjects.map((s) => [s.id, s.name])), [subjects])
  const titlesFor = (cid) => [...new Set((schedule || []).filter((r) => r.class_id === cid).map((r) => r.title))]
  const rowsFor = (cid, ttl) => (schedule || []).filter((r) => r.class_id === cid && r.title === ttl)
  const classStudents = students.filter((s) => s.ss_sections?.class_id === classId)

  const ticketOf = (s, ttl) => ({
    school, exam: ttl, name: s.full_name, admissionNo: s.admission_no,
    className: `${s.ss_sections?.ss_classes?.name || ''} ${s.ss_sections?.name || ''}`.trim(),
    dob: s.dob ? niceDate(s.dob) : '',
    rows: rowsFor(s.ss_sections?.class_id, ttl).map((r) => ({
      date: niceDate(r.exam_date), day: dayName(r.exam_date), subject: subById[r.subject_id] || '-',
      time: [fmtTime(r.start_time), fmtTime(r.end_time)].filter(Boolean).join(' - '),
    })),
  })

  async function download(list, ttl, filename) {
    if (list.length === 0) return setError(t('No students found for this selection.'))
    setBusy(true); setError('')
    try { await downloadHallTickets(list.map((s) => ticketOf(s, ttl)), filename) } catch { setError(t('Could not create the PDF.')) }
    setBusy(false)
  }

  async function remove(r) {
    if (!confirm(t('Delete this exam entry?'))) return
    const { error } = await supabase.from('ss_exam_schedule').delete().eq('id', r.id)
    if (error) setError(error.message); else load()
  }

  const titles = titlesFor(classId)
  const activeTitle = titles.includes(title) ? title : titles[0] || ''

  return (
    <Layout title="Hall tickets">
      {error && <p className="text-mark text-sm mb-4">{error}</p>}
      {!schedule && <p className="text-muted">{t('Loading…')}</p>}

      {schedule && !isStaff && (
        <div className="space-y-4">
          {students.length === 0 && <p className="text-muted text-sm">{t('No students found for this selection.')}</p>}
          {students.map((s) => {
            const ttls = titlesFor(s.ss_sections?.class_id)
            return (
              <div key={s.id} className="bg-white border border-line rounded-md p-4">
                <p className="font-medium">{s.full_name}</p>
                <p className="text-xs text-muted mb-2">{`${s.ss_sections?.ss_classes?.name || ''} ${s.ss_sections?.name || ''}`.trim()}</p>
                {ttls.length === 0 && <p className="text-sm text-muted">{t('No exam schedule has been published yet.')}</p>}
                <div className="flex flex-wrap gap-2">
                  {ttls.map((ttl) => (
                    <button key={ttl} disabled={busy} onClick={() => download([s], ttl, `hall-ticket-${s.admission_no}.pdf`)}
                      className="border border-board text-board rounded-md px-3 py-1.5 text-sm disabled:opacity-60">{t('Download')}: {ttl}</button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {schedule && isStaff && (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <select value={classId} onChange={(e) => setClassId(e.target.value)} aria-label={t('Class')} className="border border-line rounded-md px-3 py-2 bg-white">
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {titles.length > 0 && (
              <select value={activeTitle} onChange={(e) => setTitle(e.target.value)} aria-label={t('Exam')} className="border border-line rounded-md px-3 py-2 bg-white">
                {titles.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            )}
            {activeTitle && (
              <button disabled={busy} onClick={() => download(classStudents, activeTitle, `hall-tickets-${activeTitle.replace(/\s+/g, '-')}.pdf`)}
                className="ml-auto bg-board hover:bg-board-dark text-chalk rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60">
                {busy ? t('Please wait…') : t('Download whole class (one PDF)')}
              </button>
            )}
          </div>

          {titles.length === 0 && <p className="text-muted text-sm mb-5">{t('No exam schedule for this class yet.')}</p>}

          {activeTitle && (
            <section className="mb-6">
              <h2 className="font-display text-xl font-semibold mb-2">{t('Exam schedule')}: {activeTitle}</h2>
              <ul className="space-y-2">
                {rowsFor(classId, activeTitle).map((r) => (
                  <li key={r.id} className="bg-white border border-line rounded-md p-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span><span className="font-medium">{subById[r.subject_id]}</span> · {niceDate(r.exam_date)} ({dayName(r.exam_date)}) · {[fmtTime(r.start_time), fmtTime(r.end_time)].filter(Boolean).join(' - ')}</span>
                    {isAdmin && <button onClick={() => remove(r)} className="text-mark underline underline-offset-4 text-xs">{t('Delete')}</button>}
                  </li>
                ))}
              </ul>
              <h2 className="font-display text-xl font-semibold mt-6 mb-2">{t('Students')}</h2>
              <ul className="space-y-2">
                {classStudents.map((s) => (
                  <li key={s.id} className="bg-white border border-line rounded-md p-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span>{s.full_name} <span className="text-muted text-xs">({s.admission_no})</span></span>
                    <button disabled={busy} onClick={() => download([s], activeTitle, `hall-ticket-${s.admission_no}.pdf`)} className="border border-board text-board rounded-md px-3 py-1.5 text-xs disabled:opacity-60">{t('Download')}</button>
                  </li>
                ))}
                {classStudents.length === 0 && <li className="text-muted text-sm">{t('No students found for this selection.')}</li>}
              </ul>
            </section>
          )}

          {isAdmin && classId && <AddRow classId={classId} schoolId={profile.school_id} subjects={subjects} titles={titles} defaultTitle={activeTitle} onDone={load} />}
        </>
      )}
    </Layout>
  )
}

function AddRow({ classId, schoolId, subjects, titles, defaultTitle, onDone }) {
  const { t } = useI18n()
  const [ttl, setTtl] = useState(defaultTitle || '')
  const [subjectId, setSubjectId] = useState('')
  const [date, setDate] = useState(today())
  const [start, setStart] = useState('10:00')
  const [end, setEnd] = useState('12:00')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { if (defaultTitle) setTtl((cur) => cur || defaultTitle) }, [defaultTitle])

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!ttl.trim()) return setError(t('Enter the exam name.'))
    if (!subjectId) return setError(t('Select a subject.'))
    if (end && start && end <= start) return setError(t('End time must be after the start time.'))
    setBusy(true)
    const { error } = await supabase.from('ss_exam_schedule').upsert({
      school_id: schoolId, title: ttl.trim(), class_id: classId, subject_id: subjectId, exam_date: date, start_time: start || null, end_time: end || null,
    }, { onConflict: 'school_id,title,class_id,subject_id' })
    setBusy(false)
    if (error) setError(error.message); else { setSubjectId(''); onDone() }
  }

  return (
    <form onSubmit={submit} className="bg-white border border-line rounded-md p-4 max-w-xl space-y-3">
      <h2 className="font-display text-lg font-semibold">{t('Add to exam schedule')}</h2>
      <label className="block text-sm">{t('Exam name')}
        <input list="exam-titles" value={ttl} onChange={(e) => setTtl(e.target.value)} placeholder="Unit Test 1" className={input} />
        <datalist id="exam-titles">{titles.map((x) => <option key={x} value={x} />)}</datalist>
      </label>
      <label className="block text-sm">{t('Subject')}
        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={input}>
          <option value="">{t('None')}</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-3 gap-3">
        <label className="block text-sm">{t('Date')}<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={input} /></label>
        <label className="block text-sm">{t('Start time')}<input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={input} /></label>
        <label className="block text-sm">{t('End time')}<input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={input} /></label>
      </div>
      <p className="text-xs text-muted">{t('Adding the same subject again for this exam updates its date and time.')}</p>
      {error && <p className="text-mark text-sm">{error}</p>}
      <button disabled={busy} className="bg-board hover:bg-board-dark text-chalk rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60">{busy ? t('Saving…') : t('Add')}</button>
    </form>
  )
}
