import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import Modal from '../components/Modal.jsx'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'
import { today, niceDate } from '../lib/dates.js'
import { inr, METHODS, METHOD_LABEL, STATUS, summarize, classLabel, receiptData } from '../lib/fees.js'
import { downloadReceipt } from '../lib/receiptPdf.js'
import { waNumber, reminderText, waLink } from '../lib/reminder.js'

const input = 'border border-line rounded-md px-3 py-2 bg-white'
const btn = 'bg-board hover:bg-board-dark text-chalk rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60'

export default function Fees() {
  const { profile } = useAuth()
  const allowed = profile && ['admin', 'accountant'].includes(profile.role)
  const isAdmin = profile?.role === 'admin'
  const [students, setStudents] = useState([])
  const [fees, setFees] = useState([])
  const [payments, setPayments] = useState([])
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sectionFilter, setSectionFilter] = useState('all')
  const [addOpen, setAddOpen] = useState(false)
  const [collectId, setCollectId] = useState(null)
  const [parents, setParents] = useState({}) // student_id -> [{ full_name, phone }]
  const [remindId, setRemindId] = useState(null)

  async function load() {
    const [s, f, p] = await Promise.all([
      supabase.from('ss_students').select('id, full_name, admission_no, section_id, ss_sections(name, ss_classes(name))')
        .eq('status', 'active').order('full_name'),
      supabase.from('ss_fees').select('*').order('created_at', { ascending: false }),
      supabase.from('ss_fee_payments').select('*'),
    ])
    const err = s.error || f.error || p.error
    if (err) {
      setError(err.message.includes('does not exist') || err.message.includes('schema cache')
        ? 'Fees tables not found. Run 008_fees.sql in Supabase first.' : err.message)
      return
    }
    setError('')
    setStudents(s.data || []); setFees(f.data || []); setPayments(p.data || [])
    loadParents()
  }
  // parent phones for reminders; if 014 is not run yet this just stays empty and reminders can still be copied
  async function loadParents() {
    const { data: links, error: e1 } = await supabase.from('ss_parent_student').select('student_id, parent_id')
    if (e1 || !links?.length) { setParents({}); return }
    const ids = [...new Set(links.map((l) => l.parent_id))]
    const { data: profs } = await supabase.from('ss_profiles').select('id, full_name, phone').in('id', ids)
    const byProfile = Object.fromEntries((profs || []).map((x) => [x.id, x]))
    const map = {}
    links.forEach((l) => { if (byProfile[l.parent_id]) (map[l.student_id] ||= []).push(byProfile[l.parent_id]) })
    setParents(map)
  }
  useEffect(() => { if (allowed) load() }, [allowed])
  const byId = useMemo(() => Object.fromEntries(students.map((s) => [s.id, s])), [students])
  const sections = useMemo(() => {
    const m = new Map()
    students.forEach((s) => { if (s.section_id && !m.has(s.section_id)) m.set(s.section_id, classLabel(s)) })
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [students])

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    return fees
      .map((fee) => ({ fee, student: byId[fee.student_id], ...summarize(fee, payments) }))
      .filter((r) => r.student)
      .filter((r) => statusFilter === 'all' || r.status === statusFilter)
      .filter((r) => sectionFilter === 'all' || r.student.section_id === sectionFilter)
      .filter((r) => !term || r.student.full_name.toLowerCase().includes(term) || r.student.admission_no.toLowerCase().includes(term))
  }, [fees, payments, byId, q, statusFilter, sectionFilter])

  const billed = rows.reduce((s, r) => s + Number(r.fee.amount), 0)
  const collected = rows.reduce((s, r) => s + r.paid, 0)
  const overdue = rows.filter((r) => r.status === 'overdue').reduce((s, r) => s + r.balance, 0)
  const collectFee = fees.find((f) => f.id === collectId)
  const collectRow = collectFee && byId[collectFee.student_id]
    ? { fee: collectFee, student: byId[collectFee.student_id], ...summarize(collectFee, payments) } : null

  const remindFee = fees.find((f) => f.id === remindId)
  const remindRow = remindFee && byId[remindFee.student_id]
    ? { fee: remindFee, student: byId[remindFee.student_id], ...summarize(remindFee, payments) } : null

  async function removeFee(r) {
    if (r.payments.length) { setError('This fee already has payments, so it cannot be deleted.'); return }
    if (!confirm(`Delete "${r.fee.title}" for ${r.student.full_name}?`)) return
    const { error } = await supabase.from('ss_fees').delete().eq('id', r.fee.id)
    if (error) setError(error.message); else load()
  }

  if (profile && !allowed) return <Navigate to="/" replace />

  return (
    <Layout title="Fees & collection">
      {error && <p className="text-mark text-sm mb-4">{error}</p>}

      <div className="grid sm:grid-cols-4 gap-3 mb-6">
        {[['Billed', inr(billed)], ['Collected', inr(collected)], ['Outstanding', inr(billed - collected)], ['Overdue', inr(overdue)]].map(([k, v]) => (
          <div key={k} className="bg-white border border-line rounded-md p-4">
            <p className="text-sm text-muted">{k}</p>
            <p className={`font-display text-2xl font-semibold ${k === 'Overdue' && overdue > 0 ? 'text-mark' : ''}`}>{v}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or admission no" aria-label="Search" className={`${input} w-56`} />
        <select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)} aria-label="Class filter" className={input}>
          <option value="all">All classes</option>
          {sections.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Status filter" className={input}>
          <option value="all">All status</option>
          {Object.entries(STATUS).map(([k, [label]]) => <option key={k} value={k}>{label}</option>)}
        </select>
        <button onClick={() => setAddOpen(true)} className={`${btn} ml-auto`}>Add fee</button>
      </div>

      <div className="bg-white border border-line rounded-md overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted border-b border-line">
            <tr>
              <th className="p-3 font-medium">Student</th>
              <th className="p-3 font-medium">Fee</th>
              <th className="p-3 font-medium text-right">Amount</th>
              <th className="p-3 font-medium text-right">Paid</th>
              <th className="p-3 font-medium text-right">Balance</th>
              <th className="p-3 font-medium">Due</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.fee.id}>
                <td className="p-3">
                  {r.student.full_name}
                  <span className="block text-xs text-muted">{r.student.admission_no} · {classLabel(r.student)}</span>
                </td>
                <td className="p-3">{r.fee.title}</td>
                <td className="p-3 text-right">{inr(r.fee.amount)}</td>
                <td className="p-3 text-right">{inr(r.paid)}</td>
                <td className="p-3 text-right">{inr(r.balance)}</td>
                <td className="p-3 whitespace-nowrap">{niceDate(r.fee.due_date)}</td>
                <td className="p-3">
                  <span className={`border rounded-full px-2 py-0.5 text-xs ${STATUS[r.status][1]}`}>{STATUS[r.status][0]}</span>
                </td>
                <td className="p-3 whitespace-nowrap text-right">
                  <button onClick={() => setCollectId(r.fee.id)} className="text-board underline underline-offset-4">
                    {r.balance > 0 ? 'Collect' : 'Receipts'}
                  </button>
                  {r.status === 'overdue' && (
                    <button onClick={() => setRemindId(r.fee.id)} className="text-mark underline underline-offset-4 ml-3">Remind</button>
                  )}
                  {isAdmin && !r.payments.length && (
                    <button onClick={() => removeFee(r)} className="text-mark underline underline-offset-4 ml-3">Delete</button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan="8" className="p-4 text-muted">No fees found. Use "Add fee" to create one.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted mt-3">Fees are set per student. Use "Add fee" with "Whole class" to give the same fee to every student in a class.</p>

      {addOpen && (
        <AddFeeModal students={students} sections={sections} schoolId={profile.school_id}
          onClose={() => setAddOpen(false)} onDone={() => { setAddOpen(false); load() }} />
      )}
      {remindRow && (
        <RemindModal row={remindRow} parents={parents[remindRow.student.id] || []} school={profile.ss_schools?.name}
          onClose={() => setRemindId(null)} />
      )}
      {collectRow && (
        <CollectModal row={collectRow} payments={payments} school={profile.ss_schools?.name} schoolId={profile.school_id}
          onClose={() => setCollectId(null)} onDone={() => { setCollectId(null); load() }} />
      )}
    </Layout>
  )
}

function AddFeeModal({ students, sections, schoolId, onClose, onDone }) {
  const [mode, setMode] = useState('one')
  const [studentId, setStudentId] = useState(students[0]?.id || '')
  const [sectionId, setSectionId] = useState(sections[0]?.[0] || '')
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [due, setDue] = useState(today())
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    const amt = Number(amount)
    const targets = mode === 'one' ? (studentId ? [studentId] : []) : students.filter((s) => s.section_id === sectionId).map((s) => s.id)
    if (!title.trim()) return setError('Enter a fee title.')
    if (!(amt > 0)) return setError('Amount must be more than 0.')
    if (!targets.length) return setError('No students found for this selection.')
    if (mode === 'section' && !confirm(`Add "${title.trim()}" (${inr(amt)}) for ${targets.length} students?`)) return
    setBusy(true)
    const { error } = await supabase.from('ss_fees').insert(
      targets.map((id) => ({ school_id: schoolId, student_id: id, title: title.trim(), amount: amt, due_date: due })))
    setBusy(false)
    if (error) setError(error.message); else onDone()
  }

  return (
    <Modal title="Add fee" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="radio" checked={mode === 'one'} onChange={() => setMode('one')} /> One student</label>
          <label className="flex items-center gap-2"><input type="radio" checked={mode === 'section'} onChange={() => setMode('section')} /> Whole class</label>
        </div>
        {mode === 'one' ? (
          <label className="block text-sm">Student
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className={`${input} w-full mt-1`}>
              {students.map((s) => <option key={s.id} value={s.id}>{s.full_name} ({s.admission_no}) {classLabel(s)}</option>)}
            </select>
          </label>
        ) : (
          <label className="block text-sm">Class
            <select value={sectionId} onChange={(e) => setSectionId(e.target.value)} className={`${input} w-full mt-1`}>
              {sections.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </label>
        )}
        <label className="block text-sm">Fee title
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Term 1 tuition fee" className={`${input} w-full mt-1`} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">Amount (₹)
            <input type="number" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${input} w-full mt-1`} />
          </label>
          <label className="block text-sm">Due date
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={`${input} w-full mt-1`} />
          </label>
        </div>
        {error && <p className="text-mark text-sm">{error}</p>}
        <button disabled={busy} className={btn}>{busy ? 'Saving…' : 'Add fee'}</button>
      </form>
    </Modal>
  )
}

function CollectModal({ row, payments, school, schoolId, onClose, onDone }) {
  const { fee, student } = row
  const [amount, setAmount] = useState(row.balance > 0 ? String(row.balance) : '')
  const [method, setMethod] = useState('cash')
  const [reference, setReference] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const receipt = (p, all) => downloadReceipt(receiptData({ school, student, fee, payment: p, payments: all }))

  async function submit(e) {
    e.preventDefault()
    setError('')
    const amt = Number(amount)
    if (!(amt > 0)) return setError('Enter an amount.')
    if (amt > row.balance) return setError(`Amount is more than the balance (${inr(row.balance)}).`)
    setBusy(true)
    const { data, error } = await supabase.from('ss_fee_payments')
      .insert({ school_id: schoolId, fee_id: fee.id, amount: amt, method, reference: reference.trim() || null })
      .select().single()
    setBusy(false)
    if (error) return setError(error.message)
    receipt(data, [...payments, data])
    onDone()
  }

  return (
    <Modal title={`${fee.title}: ${student.full_name}`} onClose={onClose}>
      <p className="text-sm text-muted mb-4">
        Amount {inr(fee.amount)} · Paid {inr(row.paid)} · Balance <span className="text-ink font-medium">{inr(row.balance)}</span>
      </p>

      {row.balance > 0 && (
        <form onSubmit={submit} className="space-y-3 mb-6">
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">Amount (₹)
              <input type="number" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${input} w-full mt-1`} />
            </label>
            <label className="block text-sm">Mode
              <select value={method} onChange={(e) => setMethod(e.target.value)} className={`${input} w-full mt-1`}>
                {METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          </div>
          <label className="block text-sm">Reference (UPI id, cheque no, optional)
            <input value={reference} onChange={(e) => setReference(e.target.value)} className={`${input} w-full mt-1`} />
          </label>
          {error && <p className="text-mark text-sm">{error}</p>}
          <button disabled={busy} className={btn}>{busy ? 'Saving…' : 'Record payment and download receipt'}</button>
        </form>
      )}

      <h3 className="font-medium text-sm mb-2">Payments</h3>
      <ul className="divide-y divide-line text-sm">
        {row.payments.map((p) => (
          <li key={p.id} className="py-2 flex items-center justify-between gap-3">
            <span>
              {inr(p.amount)} · {METHOD_LABEL[p.method] || p.method}
              <span className="block text-xs text-muted">{p.receipt_no} · {new Date(p.paid_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </span>
            <button onClick={() => receipt(p, payments)} className="text-board underline underline-offset-4">Receipt PDF</button>
          </li>
        ))}
        {row.payments.length === 0 && <li className="py-2 text-muted">No payments yet</li>}
      </ul>
    </Modal>
  )
}

function RemindModal({ row, parents, school, onClose }) {
  const [pi, setPi] = useState(0)
  const parent = parents[pi]
  const number = waNumber(parent?.phone)
  const initial = reminderText({
    school, parentName: parent?.full_name, studentName: row.student.full_name, className: classLabel(row.student),
    fee: row.fee.title, balance: row.balance, dueDate: row.fee.due_date,
  })
  const [text, setText] = useState(initial)
  const [copied, setCopied] = useState(false)

  function pick(i) {
    setPi(i); setCopied(false)
    setText(reminderText({
      school, parentName: parents[i]?.full_name, studentName: row.student.full_name, className: classLabel(row.student),
      fee: row.fee.title, balance: row.balance, dueDate: row.fee.due_date,
    }))
  }
  async function copy() {
    try { await navigator.clipboard.writeText(text); setCopied(true) } catch { setCopied(false) }
  }

  return (
    <Modal title="Fee reminder" onClose={onClose}>
      <p className="text-sm text-muted mb-3">{row.student.full_name} · {row.fee.title} · balance {inr(row.balance)}</p>
      {parents.length === 0 && (
        <p className="text-sm text-mark mb-3">No parent account is linked to this student, so there is no phone number. You can still copy the message.</p>
      )}
      {parents.length > 1 && (
        <select value={pi} onChange={(e) => pick(Number(e.target.value))} aria-label="Parent" className={`${input} w-full mb-3`}>
          {parents.map((p, i) => <option key={i} value={i}>{p.full_name}{p.phone ? ` (${p.phone})` : ''}</option>)}
        </select>
      )}
      {parent && !number && (
        <p className="text-sm text-mark mb-3">{parent.full_name} has {parent.phone ? 'an invalid' : 'no'} phone number saved. Add a 10-digit mobile number to the parent account to use WhatsApp.</p>
      )}
      <label className="block text-sm mb-1" htmlFor="remind-text">Message</label>
      <textarea id="remind-text" value={text} onChange={(e) => setText(e.target.value)} rows={8} className={`${input} w-full text-sm`} />
      <div className="flex flex-wrap gap-2 mt-4">
        {number && (
          <a href={waLink(number, text)} target="_blank" rel="noreferrer" className={btn}>Open WhatsApp</a>
        )}
        <button onClick={copy} className="border border-board text-board rounded-md px-4 py-2 text-sm">{copied ? 'Copied' : 'Copy message'}</button>
      </div>
    </Modal>
  )
}
