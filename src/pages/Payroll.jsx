import { useEffect, useMemo, useState } from 'react'
import Layout from '../components/Layout.jsx'
import Modal from '../components/Modal.jsx'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'
import { useI18n } from '../lib/i18n.jsx'
import { today } from '../lib/dates.js'
import { inr } from '../lib/fees.js'
import { computeSlip, thisMonth, monthName } from '../lib/payroll.js'
import { downloadSalarySlip } from '../lib/salarySlipPdf.js'

const input = 'border border-line rounded-md px-3 py-2 bg-white w-full mt-1'
const small = 'border border-line rounded px-2 py-1 w-20'

export default function Payroll() {
  const { profile } = useAuth()
  const { t } = useI18n()
  const role = profile?.role
  const allowed = !!profile && ['admin', 'accountant', 'principal'].includes(role)
  const canRun = ['admin', 'accountant'].includes(role)
  const isAdmin = role === 'admin'
  const school = profile?.ss_schools?.name || 'School'
  const [month, setMonth] = useState(thisMonth())
  const [staff, setStaff] = useState(null)
  const [structures, setStructures] = useState({})
  const [slips, setSlips] = useState({})
  const [inputs, setInputs] = useState({})   // profile_id -> {lop, bonus}
  const [edit, setEdit] = useState(null)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const [p, s, sl] = await Promise.all([
      supabase.from('ss_profiles').select('id, full_name, role').not('role', 'in', '(student,parent)').order('full_name'),
      supabase.from('ss_salary_structures').select('*'),
      supabase.from('ss_payslips').select('*').eq('month', month),
    ])
    const err = p.error || s.error || sl.error
    if (err) {
      setError(/does not exist|schema cache|Could not find/.test(err.message)
        ? 'Payroll is not set up yet. Run 025_payroll.sql in Supabase.' : err.message)
      setStaff([]); return
    }
    setError('')
    const sm = Object.fromEntries((s.data || []).map((x) => [x.profile_id, x]))
    const slm = Object.fromEntries((sl.data || []).map((x) => [x.profile_id, x]))
    setStaff(p.data || []); setStructures(sm); setSlips(slm)
    setInputs((cur) => {
      const next = {}
      ;(p.data || []).forEach((x) => {
        const sl2 = slm[x.id]
        next[x.id] = cur[x.id] && !sl2 ? cur[x.id] : { lop: sl2 ? String(sl2.lop_days) : '0', bonus: sl2 ? String(sl2.bonus) : '0' }
      })
      return next
    })
  }
  useEffect(() => { setStaff(null); setMsg(''); if (allowed) load() }, [allowed, month])

  const rows = useMemo(() => (staff || []).map((x) => {
    const st = structures[x.id], slip = slips[x.id], inp = inputs[x.id] || { lop: '0', bonus: '0' }
    const calc = st ? computeSlip(st, month, inp.lop, inp.bonus) : null
    return { person: x, st, slip, inp, calc }
  }), [staff, structures, slips, inputs, month])

  const lopInvalid = (inp) => !(Number(inp.lop) >= 0) || !(Number(inp.bonus) >= 0)
  const setInp = (id, k, v) => setInputs((cur) => ({ ...cur, [id]: { ...cur[id], [k]: v } }))
  const payable = rows.filter((r) => r.st && r.calc && (!r.slip || r.slip.status === 'draft'))
  const totalNet = rows.reduce((s, r) => s + (r.slip ? Number(r.slip.net) : r.calc ? r.calc.net : 0), 0)

  async function generate() {
    setError(''); setMsg('')
    const bad = payable.find((r) => lopInvalid(r.inp) || r.calc.net < 0 || r.calc.lop_days > 31)
    if (bad) return setError(`${bad.person.full_name}: ${t('check loss of pay days and bonus. Net pay cannot be negative.')}`)
    if (payable.length === 0) return setMsg(t('Nothing to generate. Set salary structures first, or all slips are already paid.'))
    setBusy(true)
    const { error } = await supabase.from('ss_payslips').upsert(
      payable.map((r) => ({ school_id: profile.school_id, profile_id: r.person.id, month, ...r.calc, status: 'draft' })),
      { onConflict: 'profile_id,month' })
    setBusy(false)
    if (error) setError(error.message); else { setMsg(`${payable.length} ${t('payslips saved as draft.')}`); load() }
  }
  async function markPaid(list) {
    const drafts = list.filter((r) => r.slip?.status === 'draft')
    if (drafts.length === 0) return setMsg(t('Generate the payslips first. Only draft payslips can be marked paid.'))
    if (!confirm(`${t('Mark as paid')}: ${drafts.length}. ${t('Paid payslips cannot be changed.')}`)) return
    setBusy(true); setError('')
    const { error } = await supabase.from('ss_payslips').update({ status: 'paid', paid_on: today() }).in('id', drafts.map((r) => r.slip.id))
    setBusy(false)
    if (error) setError(error.message); else { setMsg(`${drafts.length} ${t('payslips marked paid.')}`); load() }
  }
  async function removeDraft(r) {
    if (!confirm(t('Delete this draft payslip?'))) return
    const { error } = await supabase.from('ss_payslips').delete().eq('id', r.slip.id)
    if (error) setError(error.message); else load()
  }

  if (profile && !allowed) return <Layout title="Payroll"><p className="text-muted">{t('Only the admin, accountant and principal can open this page.')}</p></Layout>

  return (
    <Layout title="Payroll">
      {error && <p className="text-mark text-sm mb-4">{error}</p>}
      {msg && <p className="text-board text-sm mb-4">{msg}</p>}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <label className="text-sm">{t('Month')} <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="border border-line rounded-md px-3 py-2 bg-white ml-1" /></label>
        <span className="text-sm text-muted">{monthName(month)} · {t('Total net pay')}: {inr(totalNet)}</span>
        {canRun && (
          <div className="ml-auto flex gap-2">
            <button disabled={busy} onClick={generate} className="bg-board hover:bg-board-dark text-chalk rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60">{t('Generate payslips')}</button>
            <button disabled={busy} onClick={() => markPaid(rows)} className="border border-board text-board rounded-md px-4 py-2 text-sm disabled:opacity-60">{t('Mark all paid')}</button>
          </div>
        )}
      </div>
      {!staff && <p className="text-muted">{t('Loading…')}</p>}
      {staff && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr>{['Staff', 'Gross structure', 'Loss of pay days', 'Bonus (₹)', 'Net pay', 'Payslip'].map((h) => <th key={h} className="border border-line bg-white py-2 px-2 text-left font-medium">{t(h)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map(({ person, st, slip, inp, calc }) => {
                const locked = slip?.status === 'paid'
                return (
                  <tr key={person.id}>
                    <td className="border border-line bg-white px-2 py-1.5">
                      <p className="font-medium">{person.full_name}</p>
                      <p className="text-xs text-muted">{t(person.role.charAt(0).toUpperCase() + person.role.slice(1))}</p>
                    </td>
                    <td className="border border-line bg-white px-2 py-1.5">
                      {st ? inr(Number(st.basic) + Number(st.hra) + Number(st.allowances)) : <span className="text-muted">{t('Not set')}</span>}
                      {isAdmin && <button onClick={() => setEdit(person)} className="block text-xs underline underline-offset-4 text-board mt-0.5">{st ? t('Edit') : t('Set salary')}</button>}
                    </td>
                    <td className="border border-line bg-white px-2 py-1.5">
                      {st && canRun && !locked ? <input type="number" min="0" max="31" step="0.5" aria-label={`${t('Loss of pay days')} ${person.full_name}`} value={inp.lop} onChange={(e) => setInp(person.id, 'lop', e.target.value)} className={small} /> : slip ? Number(slip.lop_days) : '-'}
                    </td>
                    <td className="border border-line bg-white px-2 py-1.5">
                      {st && canRun && !locked ? <input type="number" min="0" step="1" aria-label={`${t('Bonus (₹)')} ${person.full_name}`} value={inp.bonus} onChange={(e) => setInp(person.id, 'bonus', e.target.value)} className={small} /> : slip ? inr(slip.bonus) : '-'}
                    </td>
                    <td className={`border border-line bg-white px-2 py-1.5 ${!slip && calc && calc.net < 0 ? 'text-mark' : ''}`}>{slip && locked ? inr(slip.net) : calc ? inr(calc.net) : '-'}</td>
                    <td className="border border-line bg-white px-2 py-1.5">
                      {slip ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`border rounded-full px-2 py-0.5 text-xs ${locked ? 'text-board border-board' : 'text-muted border-line'}`}>{locked ? t('Paid') : t('Draft')}</span>
                          <button onClick={() => downloadSalarySlip(slip, person, school)} className="text-xs underline underline-offset-4 text-board">{t('Download')}</button>
                          {canRun && !locked && <button disabled={busy} onClick={() => markPaid([{ slip }])} className="text-xs underline underline-offset-4">{t('Mark paid')}</button>}
                          {isAdmin && !locked && <button onClick={() => removeDraft({ slip })} className="text-xs underline underline-offset-4 text-mark">{t('Delete')}</button>}
                        </div>
                      ) : <span className="text-muted text-xs">{t('Not generated')}</span>}
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && <tr><td colSpan={6} className="border border-line bg-white px-2 py-3 text-muted">{t('No staff found.')}</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted mt-3">{t('Loss of pay is deducted per day from basic, HRA and allowances. Paid payslips cannot be changed.')}</p>
      {edit && <StructureModal person={edit} st={structures[edit.id]} schoolId={profile.school_id} onClose={() => setEdit(null)} onDone={() => { setEdit(null); load() }} />}
    </Layout>
  )
}

function StructureModal({ person, st, schoolId, onClose, onDone }) {
  const { t } = useI18n()
  const [f, setF] = useState({
    basic: st?.basic ?? '', hra: st?.hra ?? 0, allowances: st?.allowances ?? 0, pf: st?.pf ?? 0, other_deductions: st?.other_deductions ?? 0,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setF((cur) => ({ ...cur, [k]: v }))

  async function save(e) {
    e.preventDefault()
    setError('')
    const nums = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, Number(v)]))
    if (f.basic === '' || Object.values(nums).some((n) => !(n >= 0))) return setError(t('Enter valid amounts. Basic is required.'))
    setBusy(true)
    const { error } = await supabase.from('ss_salary_structures').upsert({ profile_id: person.id, school_id: schoolId, ...nums, updated_at: new Date().toISOString() })
    setBusy(false)
    if (error) setError(error.message); else onDone()
  }
  const field = (k, label) => (
    <label className="block text-sm">{t(label)}<input type="number" min="0" step="0.01" value={f[k]} onChange={(e) => set(k, e.target.value)} className={input} /></label>
  )
  return (
    <Modal title="Salary structure" onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <p className="text-sm text-muted">{person.full_name}</p>
        <div className="grid grid-cols-2 gap-3">
          {field('basic', 'Basic (₹)')}{field('hra', 'HRA (₹)')}{field('allowances', 'Allowances (₹)')}{field('pf', 'PF deduction (₹)')}{field('other_deductions', 'Other deductions (₹)')}
        </div>
        {error && <p className="text-mark text-sm">{error}</p>}
        <button disabled={busy} className="w-full bg-board hover:bg-board-dark text-chalk rounded-md py-2.5 font-medium disabled:opacity-60">{busy ? t('Saving…') : t('Save')}</button>
      </form>
    </Modal>
  )
}
