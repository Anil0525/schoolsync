import { useMemo, useState } from 'react'
import Modal from './Modal.jsx'
import { createUser, genPassword } from '../lib/adminApi.js'

const input = 'border border-line rounded-md px-3 py-2 bg-white w-full mt-1'
const ROLE_LABEL = { teacher: 'Teacher', accountant: 'Accountant', student: 'Student', parent: 'Parent' }
const classLabel = (s) => `${s?.ss_sections?.ss_classes?.name || ''} ${s?.ss_sections?.name || ''}`.trim()

// fixedRole: lock the role (Teachers page). students: all students with user_id, for linking.
export default function CreateUserModal({ fixedRole, students = [], onClose, onDone }) {
  const [role, setRole] = useState(fixedRole || 'teacher')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState(genPassword())
  const [studentId, setStudentId] = useState('')
  const [picked, setPicked] = useState([])
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState(null)

  const free = useMemo(() => students.filter((s) => !s.user_id), [students])
  const matches = useMemo(() => {
    const q = search.trim().toLowerCase()
    return students.filter((s) => !q || s.full_name.toLowerCase().includes(q) || s.admission_no.toLowerCase().includes(q)).slice(0, 30)
  }, [students, search])

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const r = await createUser({
        role, full_name: name, email, phone, password,
        student_id: role === 'student' ? studentId || null : undefined,
        student_ids: role === 'parent' ? picked : undefined,
      })
      setCreated({ email: r.email, password })
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }

  if (created) {
    const text = `SchoolSync login\nEmail: ${created.email}\nPassword: ${created.password}`
    return (
      <Modal title="User created" onClose={() => { onDone(); onClose() }}>
        <p className="text-sm mb-3">Share these login details privately. The password is shown only now.</p>
        <pre className="border border-line rounded-md p-3 text-sm bg-white whitespace-pre-wrap">{text}</pre>
        <div className="flex gap-3 mt-4">
          <button onClick={() => navigator.clipboard?.writeText(text)} className="border border-board text-board rounded-md px-4 py-2 text-sm">Copy</button>
          <button onClick={() => { onDone(); onClose() }} className="bg-board hover:bg-board-dark text-chalk rounded-md px-4 py-2 text-sm">Done</button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title={fixedRole ? `Add ${ROLE_LABEL[fixedRole].toLowerCase()}` : 'Add user'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        {!fixedRole && (
          <label className="block text-sm">Role
            <select value={role} onChange={(e) => setRole(e.target.value)} className={input}>
              {Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
        )}
        <label className="block text-sm">Full name<input required value={name} onChange={(e) => setName(e.target.value)} className={input} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">Email (login)<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} /></label>
          <label className="block text-sm">Phone (optional)<input value={phone} onChange={(e) => setPhone(e.target.value)} className={input} /></label>
        </div>
        <label className="block text-sm">Password (min 8 characters)
          <div className="flex gap-2">
            <input required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
            <button type="button" onClick={() => setPassword(genPassword())} className="border border-line rounded-md px-3 mt-1 text-sm whitespace-nowrap">New</button>
          </div>
        </label>

        {role === 'student' && (
          <label className="block text-sm">Link to student record (optional)
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className={input}>
              <option value="">Not linked</option>
              {free.map((s) => <option key={s.id} value={s.id}>{s.full_name} ({s.admission_no}) {classLabel(s)}</option>)}
            </select>
            <span className="text-xs text-muted">Only students without an account are listed.</span>
          </label>
        )}

        {role === 'parent' && (
          <div className="text-sm">
            <p>Children of this parent (optional, can be changed later)</p>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or admission no" aria-label="Search students" className={input} />
            <ul className="mt-2 max-h-40 overflow-y-auto border border-line rounded-md divide-y divide-line bg-white">
              {matches.map((s) => (
                <li key={s.id}>
                  <label className="flex items-center gap-2 px-3 py-1.5">
                    <input type="checkbox" checked={picked.includes(s.id)}
                      onChange={(e) => setPicked(e.target.checked ? [...picked, s.id] : picked.filter((x) => x !== s.id))} />
                    {s.full_name} <span className="text-muted">({s.admission_no}) {classLabel(s)}</span>
                  </label>
                </li>
              ))}
              {matches.length === 0 && <li className="px-3 py-2 text-muted">No students found</li>}
            </ul>
            <p className="text-xs text-muted mt-1">{picked.length} selected</p>
          </div>
        )}

        {error && <p className="text-mark text-sm">{error}</p>}
        <button disabled={busy} className="w-full bg-board hover:bg-board-dark text-chalk rounded-md py-2.5 font-medium disabled:opacity-60">
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>
    </Modal>
  )
}
