import { useEffect, useState } from 'react'
import Layout from '../components/Layout.jsx'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'
import { useI18n } from '../lib/i18n.jsx'
import { niceDate, today } from '../lib/dates.js'
import { downloadCertificate, CERT_TITLE } from '../lib/certificatePdf.js'

const input = 'border border-line rounded-md px-3 py-2 bg-white w-full mt-1'
const TYPES = ['bonafide', 'character', 'transfer', 'experience']

function academicYear() {
  const d = new Date(), y = d.getFullYear()
  const start = d.getMonth() >= 5 ? y : y - 1
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`
}

export default function Certificates() {
  const { profile } = useAuth()
  const { t } = useI18n()
  const allowed = !!profile && ['admin', 'principal'].includes(profile.role)
  const school = profile?.ss_schools?.name || 'School'
  const [students, setStudents] = useState([])
  const [staff, setStaff] = useState([])
  const [register, setRegister] = useState(null)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')

  // form
  const [type, setType] = useState('bonafide')
  const [studentId, setStudentId] = useState('')
  const [personName, setPersonName] = useState('')
  const [f, setF] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (k, v) => setF((cur) => ({ ...cur, [k]: v }))

  async function load() {
    const [st, tc, reg] = await Promise.all([
      supabase.from('ss_students').select('id, full_name, admission_no, dob, status, ss_sections(name, ss_classes(name))').order('full_name').limit(5000),
      supabase.from('ss_profiles').select('full_name').in('role', ['teacher', 'accountant']).order('full_name'),
      supabase.from('ss_certificates').select('*').order('created_at', { ascending: false }).limit(500),
    ])
    if (reg.error) {
      setError(reg.error.message.includes('does not exist') || reg.error.message.includes('schema cache')
        ? 'Certificates are not set up yet. Run 020_hall_tickets_certificates.sql in Supabase.' : reg.error.message)
      setRegister([]); return
    }
    setError(''); setStudents(st.data || []); setStaff(tc.data || []); setRegister(reg.data || [])
  }
  useEffect(() => { if (allowed) load() }, [allowed])
  useEffect(() => { setF({ academicYear: academicYear(), conduct: 'Good', promoted: 'Yes', leavingDate: today() }) }, [type])

  const student = students.find((s) => s.id === studentId)
  const classLabel = student ? `${student.ss_sections?.ss_classes?.name || ''} ${student.ss_sections?.name || ''}`.trim() : ''

  async function issue(e) {
    e.preventDefault()
    setError('')
    let name, details
    if (type === 'experience') {
      name = personName.trim()
      if (!name) return setError(t('Enter the name.'))
      if (!f.fromDate || !f.toDate) return setError(t('Enter the from and to dates.'))
      if (f.toDate < f.fromDate) return setError(t('End date cannot be before the start date.'))
      details = { designation: f.designation || '', fromDate: f.fromDate, toDate: f.toDate, note: f.note || '' }
    } else {
      if (!student) return setError(t('Select a student.'))
      name = student.full_name
      const base = { admissionNo: student.admission_no, className: classLabel }
      if (type === 'bonafide') details = { ...base, academicYear: f.academicYear || '', purpose: f.purpose || '' }
      else if (type === 'character') details = { ...base, fromYear: f.fromYear || '', toYear: f.toYear || '', conduct: f.conduct || 'Good' }
      else details = { ...base, dob: student.dob || '', admissionDate: f.admissionDate || '', leavingDate: f.leavingDate || '', reason: f.reason || '', conduct: f.conduct || 'Good', promoted: f.promoted || 'Yes' }
    }
    setBusy(true)
    const { data, error } = await supabase.rpc('ss_issue_certificate', { p_type: type, p_student: type === 'experience' ? null : studentId, p_name: name, p_details: details })
    setBusy(false)
    if (error) return setError(error.message)
    try { await downloadCertificate(data, school) } catch { setError(t('Certificate saved in the register, but the PDF could not be created. Use Download again.')) }
    setStudentId(''); setPersonName(''); setF({ academicYear: academicYear(), conduct: 'Good', promoted: 'Yes', leavingDate: today() })
    load()
  }

  if (profile && !allowed) return <Layout title="Certificates"><p className="text-muted">{t('Only the admin and principal can open this page.')}</p></Layout>

  const shown = (register || []).filter((r) => !q.trim() || `${r.cert_no} ${r.person_name}`.toLowerCase().includes(q.trim().toLowerCase()))

  return (
    <Layout title="Certificates">
      {error && <p className="text-mark text-sm mb-4">{error}</p>}
      <form onSubmit={issue} className="bg-white border border-line rounded-md p-4 max-w-xl space-y-3 mb-8">
        <h2 className="font-display text-lg font-semibold">{t('Issue a certificate')}</h2>
        <label className="block text-sm">{t('Certificate type')}
          <select value={type} onChange={(e) => { setType(e.target.value); setStudentId('') }} className={input}>
            {TYPES.map((k) => <option key={k} value={k}>{t(CERT_TITLE[k])}</option>)}
          </select>
        </label>

        {type === 'experience' ? (
          <>
            <label className="block text-sm">{t('Name')}
              <input list="staff-names" value={personName} onChange={(e) => setPersonName(e.target.value)} className={input} />
              <datalist id="staff-names">{staff.map((x) => <option key={x.full_name} value={x.full_name} />)}</datalist>
            </label>
            <label className="block text-sm">{t('Designation')}<input value={f.designation || ''} onChange={(e) => set('designation', e.target.value)} placeholder="Mathematics teacher" className={input} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">{t('From')}<input type="date" value={f.fromDate || ''} onChange={(e) => set('fromDate', e.target.value)} className={input} /></label>
              <label className="block text-sm">{t('To')}<input type="date" value={f.toDate || ''} onChange={(e) => set('toDate', e.target.value)} className={input} /></label>
            </div>
            <label className="block text-sm">{t('Note (optional)')}<textarea value={f.note || ''} onChange={(e) => set('note', e.target.value)} rows={2} className={input} /></label>
          </>
        ) : (
          <>
            <label className="block text-sm">{t('Student')}
              <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className={input}>
                <option value="">{t('Select a student.')}</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.full_name} ({s.admission_no}){s.status && s.status !== 'active' ? ` · ${s.status}` : ''}</option>)}
              </select>
            </label>
            {student && <p className="text-xs text-muted">{t('Class')}: {classLabel || '-'}</p>}
            {type === 'bonafide' && (
              <>
                <label className="block text-sm">{t('Academic year')}<input value={f.academicYear || ''} onChange={(e) => set('academicYear', e.target.value)} className={input} /></label>
                <label className="block text-sm">{t('Purpose (optional)')}<input value={f.purpose || ''} onChange={(e) => set('purpose', e.target.value)} placeholder="opening a bank account" className={input} /></label>
              </>
            )}
            {type === 'character' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm">{t('Studied from (year)')}<input value={f.fromYear || ''} onChange={(e) => set('fromYear', e.target.value)} placeholder="2021" className={input} /></label>
                  <label className="block text-sm">{t('Studied to (year)')}<input value={f.toYear || ''} onChange={(e) => set('toYear', e.target.value)} placeholder="2026" className={input} /></label>
                </div>
                <label className="block text-sm">{t('Conduct')}<input value={f.conduct || ''} onChange={(e) => set('conduct', e.target.value)} className={input} /></label>
              </>
            )}
            {type === 'transfer' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm">{t('Date of admission')}<input type="date" value={f.admissionDate || ''} onChange={(e) => set('admissionDate', e.target.value)} className={input} /></label>
                  <label className="block text-sm">{t('Date of leaving')}<input type="date" value={f.leavingDate || ''} onChange={(e) => set('leavingDate', e.target.value)} className={input} /></label>
                </div>
                <label className="block text-sm">{t('Reason for leaving')}<input value={f.reason || ''} onChange={(e) => set('reason', e.target.value)} placeholder="Parent transfer" className={input} /></label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm">{t('Conduct')}<input value={f.conduct || ''} onChange={(e) => set('conduct', e.target.value)} className={input} /></label>
                  <label className="block text-sm">{t('Eligible for promotion')}
                    <select value={f.promoted || 'Yes'} onChange={(e) => set('promoted', e.target.value)} className={input}><option>Yes</option><option>No</option></select>
                  </label>
                </div>
              </>
            )}
          </>
        )}
        <button disabled={busy} className="bg-board hover:bg-board-dark text-chalk rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60">
          {busy ? t('Please wait…') : t('Issue and download PDF')}
        </button>
        <p className="text-xs text-muted">{t('Each certificate gets the next number automatically (for example TC/2026/0001) and is saved in the register.')}</p>
      </form>

      <h2 className="font-display text-xl font-semibold mb-2">{t('Certificate register')}</h2>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Search by name or number')} aria-label={t('Search by name or number')} className="border border-line rounded-md px-3 py-2 bg-white w-full max-w-sm mb-3" />
      {!register && <p className="text-muted">{t('Loading…')}</p>}
      <ul className="space-y-2">
        {shown.map((r) => (
          <li key={r.id} className="bg-white border border-line rounded-md p-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span><span className="font-medium">{r.cert_no}</span> · {r.person_name} · {t(CERT_TITLE[r.cert_type])} · {niceDate(r.issued_on)}</span>
            <button onClick={() => downloadCertificate(r, school)} className="border border-board text-board rounded-md px-3 py-1.5 text-xs">{t('Download again')}</button>
          </li>
        ))}
        {register && shown.length === 0 && <li className="text-muted text-sm">{t('No certificates issued yet.')}</li>}
      </ul>
    </Layout>
  )
}
