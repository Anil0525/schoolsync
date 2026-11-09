import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import writeExcelFile from 'write-excel-file/browser'
import Layout from '../components/Layout.jsx'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'
import { today } from '../lib/dates.js'
import { REQUIRED, EXPORT_HEAD, missingFields, exportRow } from '../lib/udise.js'

const input = 'border border-line rounded-md px-3 py-2 bg-white'
const classLabel = (s) => `${s?.ss_sections?.ss_classes?.name || ''} ${s?.ss_sections?.name || ''}`.trim()

export default function Udise() {
  const { profile } = useAuth()
  const allowed = profile?.role === 'admin'
  const [students, setStudents] = useState(null)
  const [error, setError] = useState('')
  const [sectionFilter, setSectionFilter] = useState('all')
  const [onlyReady, setOnlyReady] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!allowed) return
    supabase.from('ss_students').select('*, ss_sections(name, ss_classes(name))').eq('status', 'active')
      .order('full_name').limit(5000)
      .then(({ data, error }) => {
        if (error) setError(error.message); else setStudents(data || [])
      })
  }, [allowed])

  const rows = useMemo(() => (students || []).map((s) => ({ s, missing: missingFields(s) })), [students])
  const sections = useMemo(() => {
    const m = new Map()
    rows.forEach(({ s }) => { if (s.section_id && !m.has(s.section_id)) m.set(s.section_id, classLabel(s)) })
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [rows])

  const scoped = rows.filter((r) => sectionFilter === 'all' || r.s.section_id === sectionFilter)
  const ready = scoped.filter((r) => r.missing.length === 0).length
  const pct = scoped.length ? Math.round((ready / scoped.length) * 100) : 0
  const incomplete = scoped.filter((r) => r.missing.length > 0)

  // how many students miss each field
  const byField = {}
  scoped.forEach((r) => r.missing.forEach((m) => { byField[m] = (byField[m] || 0) + 1 }))
  const fieldList = Object.entries(byField).sort((a, b) => b[1] - a[1])

  async function download() {
    const list = scoped.filter((r) => !onlyReady || r.missing.length === 0)
    if (!list.length) return setError('No students to export.')
    setError(''); setBusy(true)
    try {
      const head = EXPORT_HEAD.map((h) => ({ value: h, fontWeight: 'bold' }))
      await writeExcelFile([head, ...list.map((r) => exportRow(r.s))]).toFile(`udise-students-${today()}.xlsx`)
    } catch (e) {
      setError(e.message || 'Could not create the Excel file.')
    }
    setBusy(false)
  }

  if (profile && !allowed) return <Navigate to="/" replace />

  return (
    <Layout title="UDISE+ export">
      {error && <p className="text-mark text-sm mb-4">{error}</p>}
      {!students && !error && <p className="text-muted">Loading…</p>}

      {students && (
        <>
          <div className="grid sm:grid-cols-3 gap-3 mb-6">
            <div className="bg-white border border-line rounded-md p-4">
              <p className="text-sm text-muted">UDISE+ readiness</p>
              <p className={`font-display text-3xl font-semibold ${pct === 100 ? 'text-board' : ''}`}>{pct}%</p>
              <div className="h-2 bg-line rounded mt-2" aria-hidden="true"><div className="h-2 bg-board rounded" style={{ width: `${pct}%` }} /></div>
            </div>
            <div className="bg-white border border-line rounded-md p-4">
              <p className="text-sm text-muted">Students ready</p>
              <p className="font-display text-3xl font-semibold">{ready} <span className="text-base text-muted font-sans">of {scoped.length}</span></p>
            </div>
            <div className="bg-white border border-line rounded-md p-4">
              <p className="text-sm text-muted">Need more details</p>
              <p className={`font-display text-3xl font-semibold ${incomplete.length ? 'text-mark' : ''}`}>{incomplete.length}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-6">
            <select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)} aria-label="Class filter" className={input}>
              <option value="all">All classes</option>
              {sections.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={onlyReady} onChange={(e) => setOnlyReady(e.target.checked)} /> Only students with all details
            </label>
            <button onClick={download} disabled={busy || scoped.length === 0}
              className="ml-auto bg-board hover:bg-board-dark text-chalk rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60">
              {busy ? 'Creating…' : 'Download Excel'}
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <section className="bg-white border border-line rounded-md p-5">
              <h2 className="font-display text-xl font-semibold mb-3">Missing details</h2>
              <ul className="divide-y divide-line text-sm">
                {fieldList.map(([label, n]) => (
                  <li key={label} className="py-2 flex justify-between"><span>{label}</span><span className="text-mark">{n} students</span></li>
                ))}
                {fieldList.length === 0 && <li className="py-2 text-board">Nothing missing. All students are ready.</li>}
              </ul>
              <p className="text-xs text-muted mt-3">
                Checked fields: {REQUIRED.map(([, l]) => l).join(', ')}. Minority group is checked for minority students, and type of impairment for CWSN students.
              </p>
            </section>

            <section className="bg-white border border-line rounded-md p-5">
              <h2 className="font-display text-xl font-semibold mb-3">Students to fix</h2>
              <ul className="divide-y divide-line text-sm max-h-96 overflow-y-auto">
                {incomplete.map(({ s, missing }) => (
                  <li key={s.id} className="py-2">
                    {s.full_name} <span className="text-muted">{classLabel(s)}</span>
                    <span className="block text-xs text-mark">{missing.join(', ')}</span>
                  </li>
                ))}
                {incomplete.length === 0 && <li className="py-2 text-muted">No students to fix.</li>}
              </ul>
              <p className="text-xs text-muted mt-3">Fix these in <Link to="/students" className="underline underline-offset-4">Students</Link> (Edit, or Import CSV with the new columns).</p>
            </section>
          </div>

          <p className="text-xs text-muted mt-6">
            The Excel columns follow the UDISE+ SDMS Students List. Aadhaar numbers are not stored in SchoolSync, so enter them directly on the portal.
            Check the file against the portal's official bulk-upload template before uploading.
          </p>
        </>
      )}
    </Layout>
  )
}
