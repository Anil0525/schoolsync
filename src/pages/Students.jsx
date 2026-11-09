import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import Modal from '../components/Modal.jsx'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'
import { parseCsv, toCsv, downloadText } from '../lib/csv.js'

const GENDERS = ['Male', 'Female', 'Other']
const CATEGORIES = ['General', 'SC', 'ST', 'OBC']
const STATUSES = ['active', 'transferred', 'passed_out']
const EMPTY = {
  admission_no: '', full_name: '', dob: '', gender: '', section_id: '', social_category: '', minority: false, cwsn: false, status: 'active',
  pen: '', apaar_id: '', father_name: '', mother_name: '', minority_group: '', impairment_type: '', bpl: false, is_repeater: false,
}
const TEXT_COLS = ['pen', 'apaar_id', 'father_name', 'mother_name', 'minority_group', 'impairment_type']
const BOOL_COLS = ['bpl', 'is_repeater']
const TEMPLATE_HEAD = ['admission_no', 'full_name', 'dob', 'gender', 'class', 'section', 'social_category', 'minority', 'cwsn',
  'father_name', 'mother_name', 'pen', 'apaar_id', 'minority_group', 'bpl', 'impairment_type', 'is_repeater']
const yes = (v) => ['yes', 'y', 'true', '1'].includes(String(v).trim().toLowerCase())
const pick = (list, v) => list.find((x) => x.toLowerCase() === String(v).trim().toLowerCase())

const field = 'mt-1 w-full border border-line rounded-md px-3 py-2 bg-white'

export default function Students() {
  const { profile } = useAuth()
  const [students, setStudents] = useState([])
  const [sections, setSections] = useState([])
  const [search, setSearch] = useState('')
  const [sectionFilter, setSectionFilter] = useState('')
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')
  const [importState, setImportState] = useState(null)
  const fileRef = useRef(null)

  async function load() {
    const [st, se] = await Promise.all([
      supabase.from('ss_students').select('*, ss_sections(name, ss_classes(name))').order('full_name').limit(5000),
      supabase.from('ss_sections').select('id, name, ss_classes(name)').order('name'),
    ])
    setStudents(st.data || [])
    setSections(se.data || [])
  }
  useEffect(() => { if (profile?.role === 'admin') load() }, [profile])

  const label = (s) => (s ? `${s.ss_classes?.name || ''} ${s.name}`.trim() : '')
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return students.filter((s) =>
      (!sectionFilter || s.section_id === sectionFilter) &&
      (!q || s.full_name.toLowerCase().includes(q) || s.admission_no.toLowerCase().includes(q)))
  }, [students, search, sectionFilter])

  if (profile && profile.role !== 'admin') return <Navigate to="/" replace />

  async function save(e) {
    e.preventDefault()
    setError('')
    const payload = {
      admission_no: form.admission_no.trim(),
      full_name: form.full_name.trim(),
      dob: form.dob || null,
      gender: form.gender || null,
      section_id: form.section_id || null,
      social_category: form.social_category || null,
      minority: form.minority,
      cwsn: form.cwsn,
      status: form.status,
      bpl: !!form.bpl,
      is_repeater: !!form.is_repeater,
      ...Object.fromEntries(TEXT_COLS.map((k) => [k, (form[k] || '').trim() || null])),
    }
    const q = form.id
      ? supabase.from('ss_students').update(payload).eq('id', form.id)
      : supabase.from('ss_students').insert({ ...payload, school_id: profile.school_id })
    const { error } = await q
    if (error) setError(error.message.includes('duplicate') ? 'This admission number already exists.' : error.message)
    else { setForm(null); load() }
  }

  async function remove(s) {
    if (!confirm(`Delete ${s.full_name}?`)) return
    const { error } = await supabase.from('ss_students').delete().eq('id', s.id)
    if (error) alert(error.message); else load()
  }

  function downloadTemplate() {
    downloadText('students_template.csv', toCsv(TEMPLATE_HEAD, [['1001', 'Ravi Kumar', '2014-06-15', 'Male', 'Class 5', 'A', 'General', 'no', 'no', 'Suresh Kumar', 'Lakshmi', '', '', '', 'no', '', 'no']]))
  }

  async function onFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const rows = parseCsv(await file.text())
    const secMap = new Map(sections.map((s) => [`${(s.ss_classes?.name || '').toLowerCase()}|${s.name.toLowerCase()}`, s.id]))
    const seen = new Set()
    const valid = [], errors = []
    const has = (c) => rows.length > 0 && c in rows[0]
    rows.forEach((r, i) => {
      const n = i + 2
      const problems = []
      if (!r.admission_no) problems.push('admission_no missing')
      if (!r.full_name) problems.push('full_name missing')
      if (r.admission_no && seen.has(r.admission_no)) problems.push('duplicate admission_no in file')
      if (r.dob && !/^\d{4}-\d{2}-\d{2}$/.test(r.dob)) problems.push('dob must be YYYY-MM-DD')
      const gender = r.gender ? pick(GENDERS, r.gender) : null
      if (r.gender && !gender) problems.push('gender must be Male, Female or Other')
      const cat = r.social_category ? pick(CATEGORIES, r.social_category) : null
      if (r.social_category && !cat) problems.push('social_category must be General, SC, ST or OBC')
      let section_id = null
      if (r.class || r.section) {
        section_id = secMap.get(`${(r.class || '').toLowerCase()}|${(r.section || '').toLowerCase()}`)
        if (!section_id) problems.push(`class/section "${r.class} ${r.section}" not found`)
      }
      if (r.admission_no) seen.add(r.admission_no)
      if (problems.length) errors.push(`Row ${n}: ${problems.join(', ')}`)
      else valid.push({
        school_id: profile.school_id, admission_no: r.admission_no, full_name: r.full_name,
        dob: r.dob || null, gender, section_id, social_category: cat,
        minority: yes(r.minority), cwsn: yes(r.cwsn), status: 'active',
        ...Object.fromEntries(TEXT_COLS.filter(has).map((k) => [k, r[k] || null])),
        ...Object.fromEntries(BOOL_COLS.filter(has).map((k) => [k, yes(r[k])])),
      })
    })
    setImportState({ valid, errors, total: rows.length, done: false, message: '' })
  }

  async function runImport() {
    setImportState((s) => ({ ...s, busy: true }))
    for (let i = 0; i < importState.valid.length; i += 200) {
      const { error } = await supabase.from('ss_students')
        .upsert(importState.valid.slice(i, i + 200), { onConflict: 'school_id,admission_no' })
      if (error) { setImportState((s) => ({ ...s, busy: false, message: error.message })); return }
    }
    setImportState((s) => ({ ...s, busy: false, done: true, message: `${s.valid.length} students imported.` }))
    load()
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  return (
    <Layout title="Students">
      <div className="flex flex-wrap gap-3 mb-5">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or admission no"
          className="border border-line rounded-md px-3 py-2 bg-white flex-1 min-w-48" />
        <select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)} className="border border-line rounded-md px-3 py-2 bg-white">
          <option value="">All classes</option>
          {sections.map((s) => <option key={s.id} value={s.id}>{label(s)}</option>)}
        </select>
        <button onClick={() => { setError(''); setForm({ ...EMPTY }) }} className="bg-board hover:bg-board-dark text-chalk rounded-md px-4 py-2">Add student</button>
        <button onClick={() => fileRef.current.click()} className="border border-board text-board rounded-md px-4 py-2">Import CSV</button>
        <input ref={fileRef} type="file" accept=".csv" onChange={onFile} className="hidden" />
      </div>

      <p className="text-sm text-muted mb-3">
        {filtered.length} of {students.length} students.{' '}
        <button onClick={downloadTemplate} className="underline underline-offset-4">Download CSV template</button>
        {' '}(In Excel, use Save As, CSV.)
      </p>

      {students.length === 0 ? (
        <p className="text-muted">No students yet. Add one, or import a CSV. Create classes and sections first if you want to assign them.</p>
      ) : (
        <div className="overflow-x-auto bg-white border border-line rounded-md">
          <table className="w-full text-sm">
            <thead className="text-left text-muted border-b border-line">
              <tr>{['Adm. no', 'Name', 'Class', 'Gender', 'Category', 'Status', ''].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-line last:border-0">
                  <td className="px-3 py-2">{s.admission_no}</td>
                  <td className="px-3 py-2">{s.full_name}</td>
                  <td className="px-3 py-2">{label(s.ss_sections)}</td>
                  <td className="px-3 py-2">{s.gender}</td>
                  <td className="px-3 py-2">{s.social_category}</td>
                  <td className="px-3 py-2">{s.status}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <button onClick={() => { setError(''); setForm({ ...EMPTY, ...s, dob: s.dob || '', gender: s.gender || '', section_id: s.section_id || '', social_category: s.social_category || '', ...Object.fromEntries(TEXT_COLS.map((k) => [k, s[k] || ''])), bpl: !!s.bpl, is_repeater: !!s.is_repeater }) }} className="underline underline-offset-4 mr-3">Edit</button>
                    <button onClick={() => remove(s)} className="text-mark underline underline-offset-4">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <Modal title={form.id ? 'Edit student' : 'Add student'} onClose={() => setForm(null)}>
          <form onSubmit={save} className="space-y-3">
            <label className="block text-sm">Admission number<input required value={form.admission_no} onChange={set('admission_no')} className={field} /></label>
            <label className="block text-sm">Full name<input required value={form.full_name} onChange={set('full_name')} className={field} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">Date of birth<input type="date" value={form.dob} onChange={set('dob')} className={field} /></label>
              <label className="block text-sm">Gender
                <select value={form.gender} onChange={set('gender')} className={field}><option value="">Select</option>{GENDERS.map((g) => <option key={g}>{g}</option>)}</select>
              </label>
            </div>
            <label className="block text-sm">Class and section
              <select value={form.section_id} onChange={set('section_id')} className={field}><option value="">Not assigned</option>{sections.map((s) => <option key={s.id} value={s.id}>{label(s)}</option>)}</select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">Social category
                <select value={form.social_category} onChange={set('social_category')} className={field}><option value="">Select</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
              </label>
              <label className="block text-sm">Status
                <select value={form.status} onChange={set('status')} className={field}>{STATUSES.map((c) => <option key={c}>{c}</option>)}</select>
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.minority} onChange={set('minority')} /> Minority</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.cwsn} onChange={set('cwsn')} /> Child with special needs (CWSN)</label>
            <div className="border-t border-line pt-3 mt-1">
              <p className="text-sm font-medium mb-2">UDISE+ details</p>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">Father's name<input value={form.father_name} onChange={set('father_name')} className={field} /></label>
                <label className="block text-sm">Mother's name<input value={form.mother_name} onChange={set('mother_name')} className={field} /></label>
                <label className="block text-sm">Student PEN<input value={form.pen} onChange={set('pen')} className={field} /></label>
                <label className="block text-sm">APAAR ID<input value={form.apaar_id} onChange={set('apaar_id')} className={field} /></label>
              </div>
              {form.minority && (
                <label className="block text-sm mt-3">Minority group<input value={form.minority_group} onChange={set('minority_group')} className={field} /></label>
              )}
              {form.cwsn && (
                <label className="block text-sm mt-3">Type of impairment<input value={form.impairment_type} onChange={set('impairment_type')} className={field} /></label>
              )}
              <div className="flex gap-6 mt-3">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.bpl} onChange={set('bpl')} /> BPL beneficiary</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.is_repeater} onChange={set('is_repeater')} /> Repeater</label>
              </div>
            </div>
            {error && <p className="text-mark text-sm">{error}</p>}
            <button className="w-full bg-board hover:bg-board-dark text-chalk rounded-md py-2.5 font-medium">{form.id ? 'Save changes' : 'Add student'}</button>
          </form>
        </Modal>
      )}

      {importState && (
        <Modal title="Import students" onClose={() => setImportState(null)}>
          <p className="text-sm">{importState.total} rows read: <strong>{importState.valid.length} ready</strong>, {importState.errors.length} with errors.</p>
          {importState.errors.length > 0 && (
            <ul className="mt-3 max-h-48 overflow-y-auto text-sm text-mark space-y-1">
              {importState.errors.slice(0, 50).map((m) => <li key={m}>{m}</li>)}
            </ul>
          )}
          {importState.message && <p className={`mt-3 text-sm ${importState.done ? 'text-board' : 'text-mark'}`}>{importState.message}</p>}
          {!importState.done && importState.valid.length > 0 && (
            <button onClick={runImport} disabled={importState.busy} className="mt-4 w-full bg-board hover:bg-board-dark text-chalk rounded-md py-2.5 font-medium disabled:opacity-60">
              {importState.busy ? 'Importing...' : `Import ${importState.valid.length} students`}
            </button>
          )}
          <p className="mt-3 text-xs text-muted">Existing admission numbers are updated, new ones are added. Rows with errors are skipped.</p>
        </Modal>
      )}
    </Layout>
  )
}
