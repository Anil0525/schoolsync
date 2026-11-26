import { useEffect, useMemo, useState } from 'react'
import Layout from '../components/Layout.jsx'
import Modal from '../components/Modal.jsx'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'
import { useI18n } from '../lib/i18n.jsx'
import { niceDate, today } from '../lib/dates.js'
import { inr } from '../lib/fees.js'

const input = 'border border-line rounded-md px-3 py-2 bg-white w-full mt-1'
export const CATEGORIES = ['Salaries', 'Utilities', 'Maintenance', 'Stationery', 'Events', 'Transport', 'Other']
const fyOf = (d = new Date()) => (d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1)

export default function Expenses() {
  const { profile } = useAuth()
  const { t } = useI18n()
  const role = profile?.role
  const allowed = !!profile && ['admin', 'accountant', 'principal'].includes(role)
  const canAdd = ['admin', 'accountant'].includes(role)
  const isAdmin = role === 'admin'
  const [fy, setFy] = useState(fyOf())
  const [expenses, setExpenses] = useState(null)
  const [budgets, setBudgets] = useState({})
  const [draft, setDraft] = useState({})
  const [collected, setCollected] = useState(0)
  const [cat, setCat] = useState('all')
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const from = `${fy}-04-01`, to = `${fy + 1}-03-31`
    const [e, b, p] = await Promise.all([
      supabase.from('ss_expenses').select('*').gte('spent_on', from).lte('spent_on', to).order('spent_on', { ascending: false }).limit(5000),
      supabase.from('ss_budgets').select('category, amount').eq('fy', fy),
      supabase.from('ss_fee_payments').select('amount').gte('paid_at', `${from}T00:00:00+05:30`).lte('paid_at', `${to}T23:59:59+05:30`).limit(50000),
    ])
    const err = e.error || b.error
    if (err) {
      setError(/does not exist|schema cache|Could not find/.test(err.message)
        ? 'Expenses are not set up yet. Run 024_expenses_budget.sql in Supabase.' : err.message)
      setExpenses([]); return
    }
    setError('')
    const map = Object.fromEntries((b.data || []).map((x) => [x.category, Number(x.amount)]))
    setExpenses(e.data || []); setBudgets(map)
    setDraft(Object.fromEntries(CATEGORIES.map((c) => [c, map[c] ?? ''])))
    setCollected((p.data || []).reduce((s, x) => s + Number(x.amount), 0))
  }
  useEffect(() => { setExpenses(null); if (allowed) load() }, [allowed, fy])

  const spentBy = useMemo(() => {
    const m = {}
    ;(expenses || []).forEach((x) => { m[x.category] = (m[x.category] || 0) + Number(x.amount) })
    return m
  }, [expenses])
  const cats = [...new Set([...CATEGORIES, ...Object.keys(spentBy)])]
  const totalBudget = cats.reduce((s, c) => s + (budgets[c] || 0), 0)
  const totalSpent = cats.reduce((s, c) => s + (spentBy[c] || 0), 0)
  const shown = (expenses || []).filter((x) => cat === 'all' || x.category === cat)

  async function saveBudgets() {
    setBusy(true); setError('')
    const rows = CATEGORIES.filter((c) => draft[c] !== '' && Number(draft[c]) >= 0).map((c) => ({ school_id: profile.school_id, fy, category: c, amount: Number(draft[c]) }))
    const { error } = await supabase.from('ss_budgets').upsert(rows, { onConflict: 'school_id,fy,category' })
    setBusy(false)
    if (error) setError(error.message); else load()
  }
  async function remove(x) {
    if (!confirm(`${t('Delete')} "${x.description || x.category}"?`)) return
    const { error } = await supabase.from('ss_expenses').delete().eq('id', x.id)
    if (error) setError(error.message); else load()
  }

  if (profile && !allowed) return <Layout title="Expenses & budget"><p className="text-muted">{t('Only the admin, accountant and principal can open this page.')}</p></Layout>

  const years = [fyOf() - 2, fyOf() - 1, fyOf(), fyOf() + 1]
  const net = collected - totalSpent

  return (
    <Layout title="Expenses & budget">
      {error && <p className="text-mark text-sm mb-4">{error}</p>}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <select value={fy} onChange={(e) => setFy(Number(e.target.value))} aria-label={t('Financial year')} className="border border-line rounded-md px-3 py-2 bg-white">
          {years.map((y) => <option key={y} value={y}>{t('FY')} {y}-{String((y + 1) % 100).padStart(2, '0')} ({t('Apr to Mar')})</option>)}
        </select>
        {canAdd && <button onClick={() => setOpen(true)} className="ml-auto bg-board hover:bg-board-dark text-chalk rounded-md px-4 py-2 text-sm font-medium">{t('Add expense')}</button>}
      </div>
      {!expenses && <p className="text-muted">{t('Loading…')}</p>}
      {expenses && (
        <>
          <div className="grid sm:grid-cols-3 gap-3 mb-6">
            <div className="bg-white border border-line rounded-md p-4"><p className="text-xs text-muted">{t('Fees collected')}</p><p className="text-xl font-semibold">{inr(collected)}</p></div>
            <div className="bg-white border border-line rounded-md p-4"><p className="text-xs text-muted">{t('Expenses')}{totalBudget ? ` (${t('budget')} ${inr(totalBudget)})` : ''}</p><p className="text-xl font-semibold">{inr(totalSpent)}</p></div>
            <div className="bg-white border border-line rounded-md p-4"><p className="text-xs text-muted">{t('Collected minus expenses')}</p><p className={`text-xl font-semibold ${net < 0 ? 'text-mark' : ''}`}>{inr(net)}</p></div>
          </div>

          <h2 className="font-display text-xl font-semibold mb-2">{t('Budget by category')}</h2>
          <div className="overflow-x-auto mb-2">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead><tr>{['Category', 'Budget (₹)', 'Spent', 'Remaining', 'Used'].map((h) => <th key={h} className="border border-line bg-white py-2 px-2 text-left font-medium">{t(h)}</th>)}</tr></thead>
              <tbody>
                {cats.map((c) => {
                  const b = budgets[c] || 0, sp = spentBy[c] || 0
                  const pct = b > 0 ? Math.round((sp / b) * 100) : null
                  return (
                    <tr key={c}>
                      <td className="border border-line bg-white px-2 py-1.5">{t(c)}</td>
                      <td className="border border-line bg-white px-2 py-1.5">
                        {isAdmin && CATEGORIES.includes(c)
                          ? <input type="number" min="0" aria-label={`${t('Budget (₹)')} ${t(c)}`} value={draft[c] ?? ''} onChange={(e) => setDraft({ ...draft, [c]: e.target.value })} className="border border-line rounded px-2 py-1 w-28" />
                          : inr(b)}
                      </td>
                      <td className="border border-line bg-white px-2 py-1.5">{inr(sp)}</td>
                      <td className={`border border-line bg-white px-2 py-1.5 ${b && sp > b ? 'text-mark' : ''}`}>{b ? inr(b - sp) : '-'}</td>
                      <td className="border border-line bg-white px-2 py-1.5">{pct === null ? '-' : <span className={pct > 100 ? 'text-mark font-medium' : ''}>{pct}%{pct > 100 ? ` (${t('over budget')})` : ''}</span>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {isAdmin && <button disabled={busy} onClick={saveBudgets} className="mb-8 border border-board text-board rounded-md px-4 py-2 text-sm disabled:opacity-60">{t('Save budgets')}</button>}

          <div className="flex flex-wrap items-center gap-3 mb-3 mt-4">
            <h2 className="font-display text-xl font-semibold">{t('Expenses')}</h2>
            <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label={t('Category')} className="border border-line rounded-md px-3 py-2 bg-white text-sm">
              <option value="all">{t('All categories')}</option>
              {cats.map((c) => <option key={c} value={c}>{t(c)}</option>)}
            </select>
          </div>
          <ul className="space-y-2">
            {shown.map((x) => (
              <li key={x.id} className="bg-white border border-line rounded-md p-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <div>
                  <p className="font-medium">{x.description || t(x.category)}</p>
                  <p className="text-xs text-muted">{[t(x.category), x.paid_to, niceDate(x.spent_on)].filter(Boolean).join(' · ')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">{inr(x.amount)}</span>
                  {isAdmin && <button onClick={() => remove(x)} className="text-mark underline underline-offset-4 text-xs">{t('Delete')}</button>}
                </div>
              </li>
            ))}
            {shown.length === 0 && <li className="text-muted text-sm">{t('No expenses recorded.')}</li>}
          </ul>
        </>
      )}
      {open && <AddModal schoolId={profile.school_id} onClose={() => setOpen(false)} onDone={() => { setOpen(false); load() }} />}
    </Layout>
  )
}

function AddModal({ schoolId, onClose, onDone }) {
  const { t } = useI18n()
  const [category, setCategory] = useState('Utilities')
  const [description, setDescription] = useState('')
  const [paidTo, setPaidTo] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    const amt = Number(amount)
    if (!(amt > 0)) return setError(t('Amount must be more than 0.'))
    setBusy(true)
    const { error } = await supabase.from('ss_expenses').insert({
      school_id: schoolId, spent_on: date, category, description: description.trim() || null, paid_to: paidTo.trim() || null, amount: amt,
    })
    setBusy(false)
    if (error) setError(error.message); else onDone()
  }

  return (
    <Modal title="Add expense" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">{t('Category')}
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={input}>{CATEGORIES.map((c) => <option key={c} value={c}>{t(c)}</option>)}</select>
          </label>
          <label className="block text-sm">{t('Date')}<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={input} /></label>
        </div>
        <label className="block text-sm">{t('Description')}<input value={description} onChange={(e) => setDescription(e.target.value)} className={input} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">{t('Paid to (optional)')}<input value={paidTo} onChange={(e) => setPaidTo(e.target.value)} className={input} /></label>
          <label className="block text-sm">{t('Amount (₹)')}<input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={input} /></label>
        </div>
        {error && <p className="text-mark text-sm">{error}</p>}
        <button disabled={busy} className="w-full bg-board hover:bg-board-dark text-chalk rounded-md py-2.5 font-medium disabled:opacity-60">{busy ? t('Saving…') : t('Add expense')}</button>
      </form>
    </Modal>
  )
}
