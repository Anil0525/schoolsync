import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import CreateUserModal from '../components/CreateUserModal.jsx'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'

export default function Teachers() {
  const { profile } = useAuth()
  const allowed = profile?.role === 'admin'
  const [teachers, setTeachers] = useState([])
  const [sections, setSections] = useState([])
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const [t, s] = await Promise.all([
      supabase.from('ss_profiles').select('id, full_name, email, phone').eq('role', 'teacher').order('full_name'),
      supabase.from('ss_sections').select('id, name, class_teacher_id, ss_classes(name, sort_order)').order('name'),
    ])
    const err = t.error || s.error
    if (err) { setError(err.message); return }
    setTeachers(t.data || [])
    setSections((s.data || []).sort((a, b) =>
      (a.ss_classes?.sort_order ?? 0) - (b.ss_classes?.sort_order ?? 0) ||
      (a.ss_classes?.name || '').localeCompare(b.ss_classes?.name || '') || a.name.localeCompare(b.name)))
  }
  useEffect(() => { if (allowed) load() }, [allowed])
  if (profile && !allowed) return <Navigate to="/" replace />

  async function assign(sectionId, teacherId) {
    setError('')
    const { error } = await supabase.from('ss_sections').update({ class_teacher_id: teacherId || null }).eq('id', sectionId)
    if (error) setError(error.message); else load()
  }

  return (
    <Layout title="Teachers">
      {error && <p className="text-mark text-sm mb-4">{error}</p>}
      <div className="grid md:grid-cols-2 gap-6">
        <section className="bg-white border border-line rounded-md p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-xl font-semibold">Teachers</h2>
            <button onClick={() => setOpen(true)} className="bg-board hover:bg-board-dark text-chalk rounded-md px-4 py-2 text-sm">Add teacher</button>
          </div>
          <ul className="divide-y divide-line text-sm">
            {teachers.map((t) => (
              <li key={t.id} className="py-2">
                {t.full_name || '(no name)'}
                <span className="block text-xs text-muted">{[t.email, t.phone].filter(Boolean).join(' · ')}</span>
              </li>
            ))}
            {teachers.length === 0 && <li className="py-2 text-muted">No teachers yet</li>}
          </ul>
        </section>

        <section className="bg-white border border-line rounded-md p-5">
          <h2 className="font-display text-xl font-semibold mb-3">Class teachers</h2>
          <ul className="divide-y divide-line text-sm">
            {sections.map((s) => (
              <li key={s.id} className="py-2 flex items-center justify-between gap-3">
                <span>{`${s.ss_classes?.name || ''} ${s.name}`.trim()}</span>
                <select value={s.class_teacher_id || ''} onChange={(e) => assign(s.id, e.target.value)}
                  aria-label={`Class teacher of ${s.ss_classes?.name || ''} ${s.name}`}
                  className="border border-line rounded-md px-2 py-1 bg-white">
                  <option value="">Not assigned</option>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name || t.email}</option>)}
                </select>
              </li>
            ))}
            {sections.length === 0 && <li className="py-2 text-muted">Create classes and sections first</li>}
          </ul>
        </section>
      </div>

      {open && <CreateUserModal fixedRole="teacher" onClose={() => setOpen(false)} onDone={load} />}
    </Layout>
  )
}
