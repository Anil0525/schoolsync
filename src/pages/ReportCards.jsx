import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'
import { buildResults } from '../lib/results.js'
import { downloadReportCards } from '../lib/reportPdf.js'

const sel = 'border border-line rounded-md px-3 py-2 bg-white'

export default function ReportCards() {
  const { profile } = useAuth()
  const allowed = profile && ['admin', 'teacher'].includes(profile.role)
  const [exams, setExams] = useState([])
  const [sections, setSections] = useState([])
  const [examId, setExamId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [results, setResults] = useState([])
  const [attendance, setAttendance] = useState({})
  const exam = exams.find((e) => e.id === examId)
  const section = sections.find((s) => s.id === sectionId)
  const className = section ? `${section.ss_classes?.name || ''} ${section.name}`.trim() : ''

  useEffect(() => {
    if (!allowed) return
    Promise.all([
      supabase.from('ss_exams').select('*').order('created_at', { ascending: false }),
      supabase.from('ss_sections').select('id, name, ss_classes(name)').order('name'),
    ]).then(([e, s]) => {
      setExams(e.data || []); setExamId((e.data || [])[0]?.id || '')
      const sl = (s.data || []).sort((a, b) => (a.ss_classes?.name || '').localeCompare(b.ss_classes?.name || '') || a.name.localeCompare(b.name))
      setSections(sl); setSectionId(sl[0]?.id || '')
    })
  }, [allowed])

  useEffect(() => {
    if (!allowed || !exam || !sectionId) return
    let live = true
    ;(async () => {
      const [st, su] = await Promise.all([
        supabase.from('ss_students').select('id, admission_no, full_name').eq('section_id', sectionId).eq('status', 'active').order('full_name'),
        supabase.from('ss_subjects').select('id, name').order('name'),
      ])
      const students = st.data || []
      const ids = students.map((s) => s.id)
      let marks = [], att = []
      if (ids.length) {
        const [m, a] = await Promise.all([
          supabase.from('ss_marks').select('student_id, subject_id, marks').eq('exam_id', exam.id).in('student_id', ids),
          supabase.from('ss_attendance').select('student_id, status').in('student_id', ids).limit(20000),
        ])
        marks = m.data || []; att = a.data || []
      }
      if (!live) return
      const pct = {}
      ids.forEach((id) => {
        const mine = att.filter((r) => r.student_id === id)
        pct[id] = mine.length ? Math.round((mine.filter((r) => r.status === 'present' || r.status === 'late').length / mine.length) * 100) : null
      })
      setAttendance(pct)
      setResults(buildResults(students, su.data || [], marks, exam))
    })()
    return () => { live = false }
  }, [allowed, exam, sectionId])

  if (profile && !allowed) return <Navigate to="/" replace />

  const card = (r) => ({
    school: profile.ss_schools?.name, exam: exam.name, name: r.student.full_name, admissionNo: r.student.admission_no,
    className, attendancePct: attendance[r.student.id] ?? null, rows: r.rows, total: r.total, maxTotal: r.maxTotal,
    pct: r.pct, grade: r.grade, rank: r.rank, size: results.filter((x) => x.hasMarks).length,
  })
  const safe = (s) => s.replace(/[^a-z0-9]+/gi, '_')

  return (
    <Layout title="Report cards">
      <div className="flex flex-wrap gap-3 mb-5">
        <select value={examId} onChange={(e) => setExamId(e.target.value)} className={sel} aria-label="Exam">{exams.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        <select value={sectionId} onChange={(e) => setSectionId(e.target.value)} className={sel} aria-label="Class">{sections.map((s) => <option key={s.id} value={s.id}>{`${s.ss_classes?.name || ''} ${s.name}`.trim()}</option>)}</select>
        <button disabled={!results.some((r) => r.hasMarks)}
          onClick={() => downloadReportCards(results.filter((r) => r.hasMarks).map(card), `${safe(className)}_${safe(exam.name)}_report_cards.pdf`)}
          className="bg-board hover:bg-board-dark text-chalk rounded-md px-4 py-2 disabled:opacity-50">Download all (one PDF)</button>
      </div>

      {exams.length === 0 && <p className="text-muted">Create an exam first (Exams & subjects).</p>}
      {exam && results.length === 0 && <p className="text-muted">No active students in this class.</p>}

      {results.length > 0 && (
        <div className="overflow-x-auto bg-white border border-line rounded-md">
          <table className="w-full text-sm">
            <thead className="text-left text-muted border-b border-line">
              <tr>{['Rank', 'Name', 'Total', '%', 'Grade', 'Attendance', ''].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {[...results].sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9)).map((r) => (
                <tr key={r.student.id} className="border-b border-line last:border-0">
                  <td className="px-3 py-2">{r.rank ?? '-'}</td>
                  <td className="px-3 py-2">{r.student.full_name}</td>
                  <td className="px-3 py-2">{r.hasMarks ? `${r.total} / ${r.maxTotal}` : 'No marks'}</td>
                  <td className="px-3 py-2">{r.hasMarks ? r.pct : '-'}</td>
                  <td className="px-3 py-2">{r.grade}</td>
                  <td className="px-3 py-2">{attendance[r.student.id] == null ? '-' : `${attendance[r.student.id]}%`}</td>
                  <td className="px-3 py-2">
                    {r.hasMarks && <button className="underline underline-offset-4" onClick={() => downloadReportCards([card(r)], `${safe(r.student.full_name)}_${safe(exam.name)}.pdf`)}>PDF</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  )
}
