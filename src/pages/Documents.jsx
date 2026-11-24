import { useEffect, useState } from 'react'
import Layout from '../components/Layout.jsx'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'
import { useI18n } from '../lib/i18n.jsx'
import { niceDate } from '../lib/dates.js'

const input = 'border border-line rounded-md px-3 py-2 bg-white w-full mt-1'
const CATEGORIES = ['Circular', 'Forms', 'Syllabus', 'Timetable', 'Notice', 'Other']
const AUDIENCES = [['all', 'Everyone'], ['staff', 'Staff only'], ['parents', 'Parents'], ['students', 'Students']]
const MAX = 10 * 1024 * 1024
const size = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

export default function Documents() {
  const { profile } = useAuth()
  const { t } = useI18n()
  const canManage = ['admin', 'principal'].includes(profile?.role)
  const [docs, setDocs] = useState(null)
  const [cat, setCat] = useState('all')
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)

  async function load() {
    const { data, error } = await supabase.from('ss_documents').select('*').order('created_at', { ascending: false }).limit(500)
    if (error) {
      setError(error.message.includes('does not exist') || error.message.includes('schema cache')
        ? 'Documents are not set up yet. Run 021_documents.sql in Supabase.' : error.message)
      setDocs([]); return
    }
    setError(''); setDocs(data || [])
  }
  useEffect(() => { if (profile) load() }, [profile])

  async function download(d) {
    setError('')
    const { data, error } = await supabase.storage.from('ss-documents').createSignedUrl(d.file_path, 60, { download: d.file_name })
    if (error) return setError(error.message)
    window.open(data.signedUrl, '_blank', 'noopener')
  }
  async function remove(d) {
    if (!confirm(`${t('Delete')} "${d.title}"?`)) return
    const rm = await supabase.storage.from('ss-documents').remove([d.file_path])
    if (rm.error) return setError(rm.error.message)
    const { error } = await supabase.from('ss_documents').delete().eq('id', d.id)
    if (error) setError(error.message); else load()
  }

  const shown = (docs || []).filter((d) => cat === 'all' || d.category === cat)
  const audLabel = Object.fromEntries(AUDIENCES)

  return (
    <Layout title="Documents">
      {error && <p className="text-mark text-sm mb-4">{error}</p>}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label={t('Category')} className="border border-line rounded-md px-3 py-2 bg-white">
          <option value="all">{t('All categories')}</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{t(c)}</option>)}
        </select>
        {canManage && <button onClick={() => setOpen(true)} className="ml-auto bg-board hover:bg-board-dark text-chalk rounded-md px-4 py-2 text-sm font-medium">{t('Upload document')}</button>}
      </div>
      {!docs && <p className="text-muted">{t('Loading…')}</p>}
      <ul className="space-y-3">
        {shown.map((d) => (
          <li key={d.id} className="bg-white border border-line rounded-md p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">{d.title}</p>
              <p className="text-xs text-muted">{[t(d.category), d.file_name, d.file_size ? size(d.file_size) : '', niceDate(d.created_at.slice(0, 10)), canManage ? `${t('Visible to')}: ${t(audLabel[d.audience])}` : ''].filter(Boolean).join(' · ')}</p>
            </div>
            <div className="flex gap-3 text-sm">
              <button onClick={() => download(d)} className="border border-board text-board rounded-md px-3 py-1.5">{t('Download')}</button>
              {canManage && <button onClick={() => remove(d)} className="text-mark underline underline-offset-4 text-xs">{t('Delete')}</button>}
            </div>
          </li>
        ))}
        {docs && shown.length === 0 && <li className="text-muted text-sm">{t('No documents yet.')}</li>}
      </ul>
      {open && <UploadModal schoolId={profile.school_id} onClose={() => setOpen(false)} onDone={() => { setOpen(false); load() }} />}
    </Layout>
  )
}

function UploadModal({ schoolId, onClose, onDone }) {
  const { t } = useI18n()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Circular')
  const [audience, setAudience] = useState('all')
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!title.trim()) return setError(t('Enter a title.'))
    if (!file) return setError(t('Choose a file.'))
    if (file.size > MAX) return setError(t('File is larger than 10 MB.'))
    setBusy(true)
    const safe = file.name.replace(/[^A-Za-z0-9._-]+/g, '_')
    const path = `${schoolId}/${crypto.randomUUID()}-${safe}`
    const up = await supabase.storage.from('ss-documents').upload(path, file, { contentType: file.type || undefined })
    if (up.error) { setBusy(false); return setError(up.error.message) }
    const { error } = await supabase.from('ss_documents').insert({
      school_id: schoolId, title: title.trim(), category, audience, file_path: path, file_name: file.name, file_size: file.size,
    })
    if (error) { await supabase.storage.from('ss-documents').remove([path]); setBusy(false); return setError(error.message) }
    setBusy(false); onDone()
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-start justify-center overflow-y-auto p-4 z-20" onClick={onClose}>
      <div className="bg-chalk rounded-md w-full max-w-lg mt-10 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold">{t('Upload document')}</h2>
          <button onClick={onClose} className="text-muted underline underline-offset-4 text-sm">{t('Close')}</button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm">{t('Title')}<input value={title} onChange={(e) => setTitle(e.target.value)} className={input} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">{t('Category')}
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={input}>{CATEGORIES.map((c) => <option key={c} value={c}>{t(c)}</option>)}</select>
            </label>
            <label className="block text-sm">{t('Visible to')}
              <select value={audience} onChange={(e) => setAudience(e.target.value)} className={input}>{AUDIENCES.map(([k, l]) => <option key={k} value={k}>{t(l)}</option>)}</select>
            </label>
          </div>
          <label className="block text-sm">{t('File (max 10 MB)')}<input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className={input} /></label>
          {error && <p className="text-mark text-sm">{error}</p>}
          <button disabled={busy} className="w-full bg-board hover:bg-board-dark text-chalk rounded-md py-2.5 font-medium disabled:opacity-60">{busy ? t('Uploading…') : t('Upload document')}</button>
        </form>
      </div>
    </div>
  )
}
