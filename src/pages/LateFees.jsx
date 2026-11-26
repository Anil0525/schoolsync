import { useEffect, useMemo, useState } from 'react'
import Layout from '../components/Layout.jsx'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'
import { useI18n } from '../lib/i18n.jsx'
import { niceDate } from '../lib/dates.js'
import { inr, classLabel } from '../lib/fees.js'

const input = 'border border-line rounded-md px-3 py-2 bg-white w-full mt-1'
const DEFAULTS = { enabled: true, mode: 'per_day', rate: 5, grace_days: 0, max_amount: '' }

export default function LateFees() {
  const { profile } = useAuth()
  const { t } = useI18n()
  const role = profile?.role
  const allowed = !!profile && ['admin', 'accountant', 'principal'].includes(role)
  const canApply = ['admin', 'accountant'].includes(role)
  const isAdmin = role === 'admin'
  const [cfg, setCfg] = useState(DEFAULTS)
  const [hasCfg, setHasCfg] = useState(false)
  const [preview, setPreview] = useState(null)
  const [fees, setFees] = useState([])
  const [students, setStudents] = useState([])
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const [c, pv, f, s] = await Promise.all([
      supabase.from('ss_late_fee_settings').select('*').maybeSingle(),
      supabase.rpc('ss_late_fee_preview'),
      supabase.from('ss_fees').select('id, student_id, title, due_date').limit(5000),
      supabase.from('ss_students').select('id, full_name, admission_no, ss_sections(name, ss_classes(name))').limit(5000),
    ])
    const err = c.error || pv.error
    if (err) {
      setError(/does not exist|schema cache|Could not find/.test(err.message)
        ? 'Late fees are not set up yet. Run 023_late_fees.sql in Supabase.' : err.message)
      setPreview([]); return
    }
    setError('')
    setHasCfg(!!c.data)
    if (c.data) setCfg({ ...c.data, max_amount: c.data.max_amount ?? '' })
    setPreview(pv.data || []); setFees(f.data || []); setStudents(s.data || [])
  }
  useEffect(() => { if (allowed) load() }, [allowed])

  const feeById = useMemo(() => Object.fromEntries(fees.map((x) => [x.id, x])), [fees])
  const stuById = useMemo(() => Object.fromEntries(students.map((x) => [x.id, x])), [students])
  const rows = (preview || [])
    .map((p) => ({ ...p, fee: feeById[p.fee_id], student: stuById[feeById[p.fee_id]?.student_id] }))
    .filter((r) => r.fee && r.student && Number(r.late_fee) > 0)
    .sort((a, b) => b.days_late - a.days_late)
  const total = rows.reduce((s, r) => s + Number(r.late_fee), 0)

  async function saveCfg(e) {
    e.preventDefault()
    setError(''); setMsg('')
    const rate = Number(cfg.rate), grace = Number(cfg.grace_days)
    if (!(rate >= 0)) return setError(t('Enter a valid rate.'))
    if (!Number.isInteger(grace) || grace < 0) return setError(t('Grace days must be 0 or more.'))
    const max = cfg.max_amount === '' ? null : Number(cfg.max_amount)
    if (max !== null && !(max >= 0)) return setError(t('Enter a valid maximum.'))
    setBusy(true)
    const { error } = await supabase.from('ss_late_fee_settings').upsert({
      school_id: profile.school_id, enabled: cfg.enabled, mode: cfg.mode, rate, grace_days: grace, max_amount: max, updated_at: new Date().toISOString(),
    })
    setBusy(false)
    if (error) setError(error.message); else { setMsg(t('Rules saved.')); load() }
  }

  async function apply(list) {
    if (list.length === 0) return
    if (!confirm(`${t('Add late fees to')} ${list.length} ${t('fees')}?`)) return
    setBusy(true); setError(''); setMsg('')
    let done = 0
    for (const r of list) {
      const { error } = await supabase.rpc('ss_apply_late_fee', { p_fee: r.fee_id })
      if (error) { setError(error.message); break }
      done++
    }
    setBusy(false)
    if (done) setMsg(`${done} ${t('late fees added. Parents can see them under Fees.')}`)
    load()
  }

  if (profile && !allowed) return <Layout title="Late fees"><p className="text-muted">{t('Only the admin, accountant and principal can open this page.')}</p></Layout>

  return (
    <Layout title="Late fees">
      {error && <p className="text-mark text-sm mb-4">{error}</p>}
      {msg && <p className="text-board text-sm mb-4">{msg}</p>}

      <form onSubmit={saveCfg} className="bg-white border border-line rounded-md p-4 max-w-xl mb-8 space-y-3">
        <h2 className="font-display text-lg font-semibold">{t('Late fee rules')}</h2>
        {!hasCfg && <p className="text-sm text-muted">{t('No rules saved yet. Late fees stay off until the admin saves the rules.')}</p>}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={cfg.enabled} disabled={!isAdmin} onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })} className="size-4 accent-[#1f4d3f]" />
          {t('Charge late fees')}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">{t('Method')}
            <select value={cfg.mode} disabled={!isAdmin} onChange={(e) => setCfg({ ...cfg, mode: e.target.value })} className={input}>
              <option value="per_day">{t('Rs per day late')}</option>
              <option value="percent_per_month">{t('% of balance per month')}</option>
            </select>
          </label>
          <label className="block text-sm">{cfg.mode === 'per_day' ? t('Rs per day') : t('Percent per month')}
            <input type="number" min="0" step="0.01" value={cfg.rate} disabled={!isAdmin} onChange={(e) => setCfg({ ...cfg, rate: e.target.value })} className={input} />
          </label>
          <label className="block text-sm">{t('Grace days')}
            <input type="number" min="0" step="1" value={cfg.grace_days} disabled={!isAdmin} onChange={(e) => setCfg({ ...cfg, grace_days: e.target.value })} className={input} />
          </label>
          <label className="block text-sm">{t('Maximum late fee per fee (₹, optional)')}
            <input type="number" min="0" step="1" value={cfg.max_amount} disabled={!isAdmin} onChange={(e) => setCfg({ ...cfg, max_amount: e.target.value })} className={input} />
          </label>
        </div>
        <p className="text-xs text-muted">{t('The late fee is charged once per fee, on the balance still unpaid. Percent mode counts every started 30 days as one month.')}</p>
        {isAdmin && <button disabled={busy} className="bg-board hover:bg-board-dark text-chalk rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60">{t('Save rules')}</button>}
      </form>

      <div className="flex flex-wrap items-center gap-3 mb-3">
        <h2 className="font-display text-xl font-semibold">{t('Overdue fees with a late fee')}</h2>
        {rows.length > 0 && <span className="text-sm text-muted">{rows.length} · {inr(total)}</span>}
        {canApply && rows.length > 0 && (
          <button disabled={busy} onClick={() => apply(rows)} className="ml-auto bg-board hover:bg-board-dark text-chalk rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60">
            {busy ? t('Please wait…') : t('Add late fee to all')}
          </button>
        )}
      </div>
      {!preview && <p className="text-muted">{t('Loading…')}</p>}
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.fee_id} className="bg-white border border-line rounded-md p-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <div>
              <p className="font-medium">{r.student.full_name} <span className="text-xs text-muted">({classLabel(r.student)})</span></p>
              <p className="text-xs text-muted">{r.fee.title} · {t('Due')} {niceDate(r.fee.due_date)} · {t('Balance')} {inr(r.balance)} · {r.days_late} {t('days late')}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-medium text-mark">{inr(r.late_fee)}</span>
              {canApply && <button disabled={busy} onClick={() => apply([r])} className="border border-board text-board rounded-md px-3 py-1.5 text-xs disabled:opacity-60">{t('Add late fee')}</button>}
            </div>
          </li>
        ))}
        {preview && rows.length === 0 && <li className="text-muted text-sm">{hasCfg && cfg.enabled ? t('No overdue fees need a late fee right now.') : t('Late fees are off.')}</li>}
      </ul>
    </Layout>
  )
}
