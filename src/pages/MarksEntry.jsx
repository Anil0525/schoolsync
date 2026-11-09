import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'
import { parseCsv } from '../lib/csv.js'

const sel = 'border border-line rounded-md px-3 py-2 bg-white'

export default function MarksEntry() {
  const { profile } = useAuth()
  const allowed = profile && ['admin', 'teacher'].includes(profile.role)
  const [exams, setExams] = useState([])
  const [sections, setSections] = useState([])
  const [subjects, setSubjects] = useState([])
  const [examId, setExamId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [students, setStudents] = useState([])
  const [vals, setVals] = useState({})
  const [msg, setMsg] = useState({ text: '', bad: false })
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)
  const exam = exams.find((e) => e.id === examId)

  useEffect(() => {
    if (!allowed) return
    Promise.all([
      supabase.from('ss_exams').select('*').order('created_at', { ascending: false }),
      supabase.from('ss_sections').select('id, name, ss_classes(name)').order('name'),
      supabase.from('ss_subjects').select('*').order('name'),
    ]).then(([e, se, su]) => {
      setExams(e.data || []); setExamId((e.data || [])[0]?.id || '')
      const sl = (se.data || []).sort((a, b) => (a.ss_classes?.name || '').localeCompare(b.ss_classes?.name || '') || a.name.localeCompare(b.name))
      setSections(sl); setSectionId(sl[0]?.id || '')
      setSubjects(su.data || []); setSubjectId((su.data || [])[0]?.id || '')
    })
  }, [allowed])

  useEffect(() => {
    if (!allowed || !examId || !sectionId || !subjectId) return
    let live = true
    ;(async () => {
      setMsg({ text: '', bad: false })
      const { data: st } = await supabase.from('ss_students').select('id, admission_no, full_name')
        .eq('section_id', sectionId).eq('status', 'active').order('full_name')
      const list = st || []
      let existing = []
      if (list.length) {
        const r = await supabase.from('ss_marks').select('student_id, marks')
          .eq('exam_id', examId).eq('subject_id', subjectId).in('student_id', list.map((s) => s.id))
        existing = r.data || []
      }
      if (!live) return
      setStudents(list)
      setVals(Object.fromEntries(existing.map((m) => [m.student_id, m.marks === null ? '' : String(m.marks)])))
    })()
    return () => { live = false }
  }, [allowed, examId, sectionId, subjectId])

  if (profile && !allowed) return <Navigate to="/" replace />

  async function save() {
    const max = exam.max_marks
    for (const s of students) {
      const v = vals[s.id]
      if (v !== undefined && v !== '' && (isNaN(Number(v)) || Number(v) < 0 || Number(v) > max)) {
        return setMsg({ text: `${s.full_name}: marks must be between 0 and ${max}.`, bad: true })
      }
    }
    setBusy(true)
    const rows = students.filter((s) => vals[s.id] !== undefined && vals[s.id] !== '').map((s) => ({
      school_id: profile.school_id, exam_id: examId, subject_id: subjectId, student_id: s.id, marks: Number(vals[s.id]),
    }))
    const { error } = rows.length
      ? await supabase.from('ss_marks').upsert(rows, { onConflict: 'exam_id,student_id,subject_id' })
      : { error: null }
    setBusy(false)
    setMsg(error ? { text: error.message, bad: true } : { text: `Saved marks for ${rows.length} students.`, bad: false })
  }

  async function onCsv(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const rows = parseCsv(await file.text())
    const byNo = new Map(students.map((s) => [s.admission_no, s.id]))
    const next = { ...vals }
    let ok = 0; const bad = []
    rows.forEach((r) => {
      const id = byNo.get(r.admission_no)
      if (!id) bad.push(r.admission_no || '(blank)')
      else { next[id] = r.marks ?? ''; ok++ }
    })
    setVals(next)
    setMsg({ text: `${ok} rows filled from CSV. ${bad.length ? 'Not in this class: ' + bad.slice(0, 10).join(', ') + '. ' : ''}Check and press Save.`, bad: bad.length > 0 })
  }

  const missing = exams.length === 0 || sections.length === 0 || subjects.length === 0

  return (
    <Layout title="Enter marks">
      {missing && <p className="text-muted mb-4">Create at least one exam, subject, class and section first (Exams & subjects, Classes & sections).</p>}
      <div className="flex flex-wrap gap-3 mb-5">
        <select value={examId} onChange={(e) => setExamId(e.target.value)} className={sel} aria-label="Exam">{exams.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        <select value={sectionId} onChange={(e) => setSectionId(e.target.value)} className={sel} aria-label="Class">{sections.map((s) => <option key={s.id} value={s.id}>{`${s.ss_classes?.name || ''} ${s.name}`.trim()}</option>)}</select>
        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={sel} aria-label="Subject">{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <button onClick={() => fileRef.current.click()} className="border border-board text-board rounded-md px-4 py-2">Fill from CSV</button>
        <input ref={fileRef} type="file" accept=".csv" onChange={onCsv} className="hidden" />
      </div>
      {exam && <p className="text-sm text-muted mb-3">Maximum marks: {exam.max_marks}. CSV columns: admission_no, marks. Leave blank if absent.</p>}

      {students.length > 0 && (
        <>
          <ul className="bg-white border border-line rounded-md divide-y divide-line">
            {students.map((s) => (
              <li key={s.id} className="p-3 flex items-center justify-between gap-3">
                <div><p className="font-medium">{s.full_name}</p><p className="text-xs text-muted">Adm. no {s.admission_no}</p></div>
                <input type="number" min="0" max={exam?.max_marks} step="0.5" value={vals[s.id] ?? ''} aria-label={`Marks for ${s.full_name}`}
                  onChange={(e) => setVals({ ...vals, [s.id]: e.target.value })} className="border border-line rounded-md px-3 py-1.5 w-24 text-right bg-white" />
              </li>
            ))}
          </ul>
          {msg.text && <p className={`mt-4 text-sm ${msg.bad ? 'text-mark' : 'text-board'}`}>{msg.text}</p>}
          <button onClick={save} disabled={busy} className="mt-4 bg-board hover:bg-board-dark text-chalk rounded-md px-6 py-2.5 font-medium disabled:opacity-60">{busy ? 'Saving...' : 'Save marks'}</button>
        </>
      )}
      {!missing && students.length === 0 && <p className="text-muted">No active students in this class.</p>}
    </Layout>
  )
}
