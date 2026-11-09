import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import Modal from '../components/Modal.jsx'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'
import { niceDate } from '../lib/dates.js'
import { inr, METHOD_LABEL, STATUS, summarize, classLabel, receiptData } from '../lib/fees.js'
import { downloadReceipt } from '../lib/receiptPdf.js'

const input = 'border border-line rounded-md px-3 py-2 bg-white'
const btn = 'bg-board hover:bg-board-dark text-chalk rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60'

export default function MyFees() {
  const { profile } = useAuth()
  const allowed = profile && ['student', 'parent'].includes(profile.role)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [pay, setPay] = useState(null)

  async function load() {
    const [k, f, p] = await Promise.all([
      supabase.from('ss_students').select('id, full_name, admission_no, ss_sections(name, ss_classes(name))').order('full_name'),
      supabase.from('ss_fees').select('*').order('due_date'),
      supabase.from('ss_fee_payments').select('*'),
    ])
    const err = k.error || f.error || p.error
    if (err) {
      setError(err.message.includes('does not exist') || err.message.includes('schema cache')
        ? 'Fees are not set up yet. Ask the school to run 008_fees.sql.' : err.message)
      setData({ kids: [], fees: [], payments: [] })
      return null
    }
    const d = { kids: k.data || [], fees: f.data || [], payments: p.data || [] }
    setError(''); setData(d)
    return d
  }
  useEffect(() => { if (allowed) load() }, [allowed])
  if (profile && !allowed) return <Navigate to="/" replace />

  const school = profile?.ss_schools?.name
  const receipt = (kid, fee, payment, payments) =>
    downloadReceipt(receiptData({ school, student: kid, fee, payment, payments }))

  async function afterPaid(row, receiptNo) {
    setPay(null)
    const d = await load()
    const p = d?.payments.find((x) => x.receipt_no === receiptNo)
    if (p) receipt(row.kid, row.fee, p, d.payments)
  }

  return (
    <Layout title={profile?.role === 'parent' ? 'Fees & receipts' : 'My fees'}>
      {error && <p className="text-mark text-sm mb-4">{error}</p>}
      {!data && <p className="text-muted">Loading…</p>}
      {data && data.kids.length === 0 && !error && <p className="text-muted">No student is linked to this account.</p>}

      <div className="space-y-8">
        {data?.kids.map((kid) => {
          const rows = data.fees.filter((f) => f.student_id === kid.id).map((fee) => ({ kid, fee, ...summarize(fee, data.payments) }))
          const due = rows.reduce((s, r) => s + r.balance, 0)
          return (
            <section key={kid.id} className="bg-white border border-line rounded-md p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
                <h2 className="font-display text-xl font-semibold">
                  {kid.full_name} <span className="text-sm text-muted font-sans">{classLabel(kid)}</span>
                </h2>
                <p className="text-sm text-muted">Total due <span className={`font-medium ${due > 0 ? 'text-mark' : 'text-board'}`}>{inr(due)}</span></p>
              </div>

              <ul className="divide-y divide-line">
                {rows.map((r) => (
                  <li key={r.fee.id} className="py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{r.fee.title}</p>
                        <p className="text-sm text-muted">{inr(r.fee.amount)} · due {niceDate(r.fee.due_date)} · paid {inr(r.paid)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`border rounded-full px-2 py-0.5 text-xs ${STATUS[r.status][1]}`}>{STATUS[r.status][0]}</span>
                        {r.balance > 0 && <button onClick={() => setPay(r)} className={btn}>Pay {inr(r.balance)}</button>}
                      </div>
                    </div>
                    {r.payments.length > 0 && (
                      <ul className="mt-2 text-sm text-muted space-y-1">
                        {r.payments.map((p) => (
                          <li key={p.id} className="flex flex-wrap items-center gap-3">
                            <span>{inr(p.amount)} · {METHOD_LABEL[p.method] || p.method} · {new Date(p.paid_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {p.receipt_no}</span>
                            <button onClick={() => receipt(kid, r.fee, p, data.payments)} className="text-board underline underline-offset-4">Receipt PDF</button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
                {rows.length === 0 && <li className="py-3 text-sm text-muted">No fees have been added yet.</li>}
              </ul>
            </section>
          )
        })}
      </div>

      {pay && <PayModal row={pay} onClose={() => setPay(null)} onPaid={(no) => afterPaid(pay, no)} />}
    </Layout>
  )
}

// Test-mode checkout. Razorpay Checkout replaces this step later; the server still records the payment.
function PayModal({ row, onClose, onPaid }) {
  const [amount, setAmount] = useState(String(row.balance))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    const amt = Number(amount)
    if (!(amt > 0)) return setError('Enter an amount.')
    if (amt > row.balance) return setError(`Amount is more than the balance (${inr(row.balance)}).`)
    setBusy(true)
    await new Promise((r) => setTimeout(r, 900))
    const { data, error } = await supabase.rpc('ss_mock_pay', { p_fee: row.fee.id, p_amount: amt })
    setBusy(false)
    if (error) setError(error.message); else onPaid(data)
  }

  return (
    <Modal title={`Pay: ${row.fee.title}`} onClose={busy ? () => {} : onClose}>
      <p className="border border-line rounded-md p-3 text-sm text-muted mb-4">
        Test mode. No real money is charged. This screen will be replaced by Razorpay checkout.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm">{row.kid.full_name} · balance {inr(row.balance)}</p>
        <label className="block text-sm">Amount to pay (₹)
          <input type="number" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${input} w-full mt-1`} />
        </label>
        {error && <p className="text-mark text-sm">{error}</p>}
        <button disabled={busy} className={btn}>{busy ? 'Processing payment…' : `Pay ${inr(Number(amount) || 0)}`}</button>
      </form>
    </Modal>
  )
}
