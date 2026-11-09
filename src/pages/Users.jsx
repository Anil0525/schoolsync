import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import Modal from '../components/Modal.jsx'
import CreateUserModal from '../components/CreateUserModal.jsx'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'

const input = 'border border-line rounded-md px-3 py-2 bg-white'
const classLabel = (s) => `${s?.ss_sections?.ss_classes?.name || ''} ${s?.ss_sections?.name || ''}`.trim()

export default function Users() {
  const { profile } = useAuth()
  const allowed = profile?.role === 'admin'
  const [people, setPeople] = useState([])
  const [students, setStudents] = useState([])
  const [links, setLinks] = useState([])
  const [roleFilter, setRoleFilter] = useState('all')
  const [addOpen, setAddOpen] = useState(false)
  const [linkFor, setLinkFor] = useState(null)
  const [error, setError] = useState('')

  async function load() {
    const [p, s, l] = await Promise.all([
      supabase.from('ss_profiles').select('id, role, full_name, email, phone').order('full_name').limit(2000),
      supabase.from('ss_students').select('id, full_name, admission_no, user_id, ss_sections(name, ss_classes(name))').order('full_name').limit(5000),
      supabase.from('ss_parent_student').select('parent_id, student_id'),
    ])
    const err = p.error || s.error || l.error
    if (err) { setError(err.message); return }
    setError('')
    setPeople(p.data || []); setStudents(s.data || []); setLinks(l.data || [])
  }
  useEffect(() => { if (allowed) load() }, [allowed])

  const byStudent = useMemo(() => Object.fromEntries(students.map((s) => [s.id, s])), [students])
  const shown = people.filter((p) => roleFilter === 'all' || p.role === roleFilter)
  if (profile && !allowed) return <Navigate to="/" replace />

  const childrenOf = (id) => links.filter((l) => l.parent_id === id).map((l) => byStudent[l.student_id]).filter(Boolean)
  const studentOf = (id) => students.find((s) => s.user_id === id)

  return (
    <Layout title="User accounts">
      {error && <p className="text-mark text-sm mb-4">{error}</p>}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Role filter" className={input}>
          <option value="all">All roles</option>
          {['admin', 'teacher', 'accountant', 'student', 'parent'].map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <button onClick={() => setAddOpen(true)} className="ml-auto bg-board hover:bg-board-dark text-chalk rounded-md px-4 py-2 text-sm">Add user</button>
      </div>

      <div className="bg-white border border-line rounded-md overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted border-b border-line">
            <tr>{['Name', 'Role', 'Email', 'Linked to', ''].map((h) => <th key={h} className="p-3 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {shown.map((p) => {
              const kids = p.role === 'parent' ? childrenOf(p.id) : []
              const stu = p.role === 'student' ? studentOf(p.id) : null
              return (
                <tr key={p.id}>
                  <td className="p-3">{p.full_name || '(no name)'}</td>
                  <td className="p-3">{p.role}</td>
                  <td className="p-3">{p.email || ''}</td>
                  <td className="p-3">
                    {p.role === 'parent' && (kids.length ? kids.map((k) => k.full_name).join(', ') : <span className="text-muted">No children linked</span>)}
                    {p.role === 'student' && (stu ? `${stu.full_name} (${stu.admission_no})` : <span className="text-muted">No student record</span>)}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {p.role === 'parent' && (
                      <button onClick={() => setLinkFor(p)} className="text-board underline underline-offset-4">Link children</button>
                    )}
                  </td>
                </tr>
              )
            })}
            {shown.length === 0 && <tr><td colSpan="5" className="p-4 text-muted">No users</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted mt-3">Admin accounts are not created here. Passwords are shown only once, when the account is created.</p>

      {addOpen && <CreateUserModal students={students} onClose={() => setAddOpen(false)} onDone={load} />}
      {linkFor && (
        <LinkModal parent={linkFor} students={students} current={childrenOf(linkFor.id).map((k) => k.id)}
          onClose={() => setLinkFor(null)} onDone={() => { setLinkFor(null); load() }} />
      )}
    </Layout>
  )
}

function LinkModal({ parent, students, current, onClose, onDone }) {
  const [picked, setPicked] = useState(current)
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const q = search.trim().toLowerCase()
  const list = students.filter((s) => !q || s.full_name.toLowerCase().includes(q) || s.admission_no.toLowerCase().includes(q) || picked.includes(s.id)).slice(0, 40)

  async function save() {
    setBusy(true); setError('')
    const add = picked.filter((id) => !current.includes(id))
    const remove = current.filter((id) => !picked.includes(id))
    if (remove.length) {
      const { error } = await supabase.from('ss_parent_student').delete().eq('parent_id', parent.id).in('student_id', remove)
      if (error) { setBusy(false); return setError(error.message) }
    }
    if (add.length) {
      const { error } = await supabase.from('ss_parent_student').insert(add.map((student_id) => ({ parent_id: parent.id, student_id })))
      if (error) { setBusy(false); return setError(error.message) }
    }
    setBusy(false)
    onDone()
  }

  return (
    <Modal title={`Children of ${parent.full_name || 'parent'}`} onClose={onClose}>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or admission no" aria-label="Search students" className={`${input} w-full`} />
      <ul className="mt-3 max-h-64 overflow-y-auto border border-line rounded-md divide-y divide-line bg-white text-sm">
        {list.map((s) => (
          <li key={s.id}>
            <label className="flex items-center gap-2 px-3 py-1.5">
              <input type="checkbox" checked={picked.includes(s.id)}
                onChange={(e) => setPicked(e.target.checked ? [...picked, s.id] : picked.filter((x) => x !== s.id))} />
              {s.full_name} <span className="text-muted">({s.admission_no}) {classLabel(s)}</span>
            </label>
          </li>
        ))}
        {list.length === 0 && <li className="px-3 py-2 text-muted">No students found</li>}
      </ul>
      {error && <p className="text-mark text-sm mt-3">{error}</p>}
      <button onClick={save} disabled={busy} className="mt-4 w-full bg-board hover:bg-board-dark text-chalk rounded-md py-2.5 font-medium disabled:opacity-60">
        {busy ? 'Saving…' : 'Save links'}
      </button>
    </Modal>
  )
}
