import { useEffect, useState } from 'react'
import Layout from '../components/Layout.jsx'
import Modal from '../components/Modal.jsx'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'
import { useI18n } from '../lib/i18n.jsx'
import { niceDate, today } from '../lib/dates.js'
import { monthWeeks, eventsOn, DAYS } from '../lib/cal.js'

const input = 'border border-line rounded-md px-3 py-2 bg-white w-full mt-1'
const KINDS = ['holiday', 'event', 'exam']
const kindStyle = { holiday: 'border-mark text-mark', event: 'border-board text-board', exam: 'border-ink text-ink' }
const kindLabel = { holiday: 'Holiday', event: 'Event', exam: 'Exam' }

export default function Calendar() {
  const { profile } = useAuth()
  const { t, lang } = useI18n()
  const canEdit = ['admin', 'principal'].includes(profile?.role)
  const [cur, setCur] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [events, setEvents] = useState(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const { data, error } = await supabase.from('ss_calendar_events').select('*').order('start_date').limit(1000)
    if (error) {
      setError(error.message.includes('does not exist') || error.message.includes('schema cache')
        ? 'Calendar is not set up yet. Run 018_school_life.sql in Supabase.' : error.message)
      setEvents([]); return
    }
    setError(''); setEvents(data || [])
  }
  useEffect(() => { load() }, [])

  const y = cur.getFullYear(), m = cur.getMonth()
  const weeks = monthWeeks(y, m)
  const first = weeks[0].find(Boolean), last = [...weeks[weeks.length - 1]].reverse().find(Boolean)
  const inMonth = (events || []).filter((e) => e.start_date <= last && e.end_date >= first)
  const monthName = cur.toLocaleDateString(lang === 'te' ? 'te-IN' : 'en-IN', { month: 'long', year: 'numeric' })
  const move = (n) => setCur(new Date(y, m + n, 1))

  async function remove(e) {
    if (!confirm(t('Delete this event?'))) return
    const { error } = await supabase.from('ss_calendar_events').delete().eq('id', e.id)
    if (error) setError(error.message); else load()
  }

  return (
    <Layout title="School calendar">
      {error && <p className="text-mark text-sm mb-4">{error}</p>}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button onClick={() => move(-1)} className="border border-line rounded-md px-3 py-2 bg-white text-sm">{t('Previous month')}</button>
        <h2 className="font-display text-xl font-semibold min-w-40 text-center">{monthName}</h2>
        <button onClick={() => move(1)} className="border border-line rounded-md px-3 py-2 bg-white text-sm">{t('Next month')}</button>
        {canEdit && <button onClick={() => setOpen(true)} className="ml-auto bg-board hover:bg-board-dark text-chalk rounded-md px-4 py-2 text-sm font-medium">{t('Add event')}</button>}
      </div>
      {!events && <p className="text-muted">{t('Loading…')}</p>}
      {events && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse table-fixed text-sm">
              <thead>
                <tr>{[...DAYS, 'Sun'].map((d) => <th key={d} className="border border-line bg-white py-1.5 font-medium">{t(d)}</th>)}</tr>
              </thead>
              <tbody>
                {weeks.map((w, i) => (
                  <tr key={i}>
                    {w.map((iso, j) => {
                      const ev = iso ? eventsOn(events, iso) : []
                      return (
                        <td key={j} className={`border border-line align-top h-24 p-1 ${iso ? 'bg-white' : 'bg-chalk'} ${iso === today() ? 'outline outline-2 -outline-offset-2 outline-board' : ''}`}>
                          {iso && <div className={`text-xs ${j === 6 ? 'text-mark' : 'text-muted'}`}>{Number(iso.slice(8))}</div>}
                          {ev.slice(0, 2).map((e) => (
                            <div key={e.id} className={`border rounded px-1 mt-0.5 text-[11px] leading-tight truncate ${kindStyle[e.kind]}`} title={e.title}>{e.title}</div>
                          ))}
                          {ev.length > 2 && <div className="text-[11px] text-muted mt-0.5">+{ev.length - 2}</div>}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="font-display text-xl font-semibold mt-8 mb-2">{t('This month')}</h2>
          <ul className="space-y-2">
            {inMonth.map((e) => (
              <li key={e.id} className="bg-white border border-line rounded-md p-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{e.title} <span className={`border rounded-full px-2 py-0.5 text-xs ml-1 ${kindStyle[e.kind]}`}>{t(kindLabel[e.kind])}</span></p>
                  <p className="text-xs text-muted">{e.start_date === e.end_date ? niceDate(e.start_date) : `${niceDate(e.start_date)} – ${niceDate(e.end_date)}`}</p>
                  {e.note && <p className="text-sm mt-1">{e.note}</p>}
                </div>
                {canEdit && <button onClick={() => remove(e)} className="text-mark underline underline-offset-4 text-xs">{t('Delete')}</button>}
              </li>
            ))}
            {inMonth.length === 0 && <li className="text-muted text-sm">{t('Nothing scheduled this month.')}</li>}
          </ul>
        </>
      )}
      {open && <NewModal schoolId={profile.school_id} onClose={() => setOpen(false)} onDone={() => { setOpen(false); load() }} />}
    </Layout>
  )
}

function NewModal({ schoolId, onClose, onDone }) {
  const { t } = useI18n()
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState('holiday')
  const [start, setStart] = useState(today())
  const [end, setEnd] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!title.trim()) return setError(t('Enter a title.'))
    if (end && end < start) return setError(t('End date cannot be before the start date.'))
    setBusy(true)
    const { error } = await supabase.from('ss_calendar_events').insert({
      school_id: schoolId, title: title.trim(), kind, start_date: start, end_date: end || start, note: note.trim() || null,
    })
    setBusy(false)
    if (error) setError(error.message); else onDone()
  }

  return (
    <Modal title="Add event" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm">{t('Title')}<input value={title} onChange={(e) => setTitle(e.target.value)} className={input} /></label>
        <label className="block text-sm">{t('Type')}
          <select value={kind} onChange={(e) => setKind(e.target.value)} className={input}>
            {KINDS.map((k) => <option key={k} value={k}>{t(kindLabel[k])}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">{t('Start date')}<input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={input} /></label>
          <label className="block text-sm">{t('End date (optional)')}<input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} className={input} /></label>
        </div>
        <label className="block text-sm">{t('Note (optional)')}<textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={input} /></label>
        {error && <p className="text-mark text-sm">{error}</p>}
        <button disabled={busy} className="w-full bg-board hover:bg-board-dark text-chalk rounded-md py-2.5 font-medium disabled:opacity-60">
          {busy ? t('Saving…') : t('Add event')}
        </button>
      </form>
    </Modal>
  )
}
