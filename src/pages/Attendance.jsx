import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'
import { today } from '../lib/dates.js'

const STATUSES = [
  { key: 'present', label: 'Present', on: 'bg-board text-chalk border-board' },
  { key: 'absent', label: 'Absent', on: 'bg-mark text-white border-mark' },
  { key: 'late', label: 'Late', on: 'bg-amber-600 text-white border-amber-600' },
  { key: 'leave', label: 'Leave', on: 'bg-muted text-white border-muted' },
]

export default function Attendance() {
  const { profile } = useAuth()
  const [sections, setSections] = useState([])
  const [sectionId, setSectionId] = useState('')
  const [date, setDate] = useState(today())
  const [students, setStudents] = useState([])
  const [marks, setMarks] = useState({})
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState({ text: '', bad: false })
  const allowed = profile && ['admin', 'teacher'].includes(profile.role)

  useEffect(() => {
    if (!allowed) return
    supabase.from('ss_sections').select('id, name, ss_classes(name)').order('name').then(({ data }) => {
      const list = (data || []).sort((a, b) => (a.ss_classes?.name || '').localeCompare(b.ss_classes?.name || '') || a.name.localeCompare(b.name))
      setSections(list)
      if (list[0]) setSectionId((cur) => cur || list[0].id)
    })
  }, [allowed])

  useEffect(() => {
    if (!allowed || !sectionId) return
    let live = true
    async function load() {
      setMsg({ text: '', bad: false })
      const { data: st } = await supabase.from('ss_students').select('id, admission_no, full_name')
        .eq('section_id', sectionId).eq('status', 'active').order('full_name')
      const list = st || []
      let existing = []
      if (list.length) {
        const { data } = await supabase.from('ss_attendance').select('student_id, status')
          .eq('date', date).in('student_id', list.map((s) => s.id))
        existing = data || []
      }
      if (!live) return
      const map = Object.fromEntries(list.map((s) => [s.id, 'present']))
      existing.forEach((r) => { map[r.student_id] = r.status })
      setStudents(list)
      setMarks(map)
      if (existing.length) setMsg({ text: 'Attendance for this date was already saved. You can edit and save again.', bad: false })
    }
    load()
    return () => { live = false }
  }, [allowed, sectionId, date])

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, leave: 0 }
    Object.values(marks).forEach((v) => { c[v] = (c[v] || 0) + 1 })
    return c
  }, [marks])

  if (profile && !allowed) return <Navigate to="/" replace />

  async function save() {
    setBusy(true)
    const rows = students.map((s) => ({
      school_id: profile.school_id, student_id: s.id, date, status: marks[s.id], marked_by: profile.id,
    }))
    const { error } = await supabase.from('ss_attendance').upsert(rows, { onConflict: 'student_id,date' })
    setBusy(false)
    setMsg(error ? { text: error.message, bad: true } : { text: `Saved. Parents can see this now (${counts.absent} absent).`, bad: false })
  }

  return (
    <Layout title="Mark attendance">
      <div className="flex flex-wrap gap-3 mb-5">
        <select value={sectionId} onChange={(e) => setSectionId(e.target.value)} className="border border-line rounded-md px-3 py-2 bg-white">
          {sections.length === 0 && <option value="">No sections yet</option>}
          {sections.map((s) => <option key={s.id} value={s.id}>{`${s.ss_classes?.name || ''} ${s.name}`.trim()}</option>)}
        </select>
        <input type="date" value={date} max={today()} onChange={(e) => e.target.value && setDate(e.target.value)}
          className="border border-line rounded-md px-3 py-2 bg-white" />
        <button onClick={() => setMarks(Object.fromEntries(students.map((s) => [s.id, 'present'])))}
          className="border border-board text-board rounded-md px-4 py-2">Mark all present</button>
      </div>

      {sections.length === 0 && <p className="text-muted">Create classes and sections first (Classes & sections), then add students.</p>}
      {sectionId && students.length === 0 && <p className="text-muted">No active students in this section.</p>}

      {students.length > 0 && (
        <>
          <p className="text-sm text-muted mb-3">
            {students.length} students: {counts.present} present, {counts.absent} absent, {counts.late} late, {counts.leave} on leave
          </p>
          <ul className="bg-white border border-line rounded-md divide-y divide-line">
            {students.map((s) => (
              <li key={s.id} className="p-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{s.full_name}</p>
                  <p className="text-xs text-muted">Adm. no {s.admission_no}</p>
                </div>
                <div className="flex gap-1.5">
                  {STATUSES.map((st) => (
                    <button key={st.key} onClick={() => setMarks({ ...marks, [s.id]: st.key })}
                      aria-pressed={marks[s.id] === st.key}
                      className={`px-3 py-1.5 rounded-md border text-sm ${marks[s.id] === st.key ? st.on : 'bg-white border-line text-ink'}`}>
                      {st.label}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          {msg.text && <p className={`mt-4 text-sm ${msg.bad ? 'text-mark' : 'text-board'}`}>{msg.text}</p>}
          <button onClick={save} disabled={busy} className="mt-4 bg-board hover:bg-board-dark text-chalk rounded-md px-6 py-2.5 font-medium disabled:opacity-60">
            {busy ? 'Saving...' : 'Save attendance'}
          </button>
        </>
      )}
    </Layout>
  )
}
