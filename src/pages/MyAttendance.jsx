import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'
import { niceDate } from '../lib/dates.js'

const TONE = { present: 'text-board', absent: 'text-mark', late: 'text-amber-700', leave: 'text-muted' }

export default function MyAttendance() {
  const { profile } = useAuth()
  const [kids, setKids] = useState([])
  const [records, setRecords] = useState([])
  const [alerts, setAlerts] = useState([])
  const kidsRef = useRef([])
  const allowed = profile && ['student', 'parent'].includes(profile.role)

  async function loadRecords(ids) {
    if (!ids.length) return setRecords([])
    const { data } = await supabase.from('ss_attendance').select('student_id, date, status')
      .in('student_id', ids).order('date', { ascending: false }).limit(1000)
    setRecords(data || [])
  }

  useEffect(() => {
    if (!allowed) return
    let channel
    supabase.from('ss_students').select('id, full_name, admission_no, ss_sections(name, ss_classes(name))').then(({ data }) => {
      const list = data || []
      setKids(list)
      kidsRef.current = list
      loadRecords(list.map((k) => k.id))
      channel = supabase.channel('attendance-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ss_attendance' }, (payload) => {
          const row = payload.new
          const kid = kidsRef.current.find((k) => k.id === row?.student_id)
          if (!kid) return
          setAlerts((a) => [{ id: `${row.id}-${row.status}`, text: `${kid.full_name} was marked ${row.status} on ${niceDate(row.date)}.` }, ...a].slice(0, 3))
          loadRecords(kidsRef.current.map((k) => k.id))
        })
        .subscribe()
    })
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [allowed])

  if (profile && !allowed) return <Navigate to="/" replace />

  return (
    <Layout title={profile?.role === 'parent' ? 'Child attendance' : 'My attendance'}>
      {alerts.map((a) => (
        <p key={a.id} role="status" className="border border-board bg-white rounded-md p-3 mb-3 text-sm">Just now: {a.text}</p>
      ))}

      {kids.length === 0 && <p className="text-muted">No student is linked to this account yet. Ask the school office to link one.</p>}

      <div className="space-y-6">
        {kids.map((k) => {
          const mine = records.filter((r) => r.student_id === k.id)
          const attended = mine.filter((r) => r.status === 'present' || r.status === 'late').length
          const pct = mine.length ? Math.round((attended / mine.length) * 100) : null
          return (
            <section key={k.id} className="bg-white border border-line rounded-md p-5">
              <h2 className="font-display text-xl font-semibold">{k.full_name}</h2>
              <p className="text-sm text-muted">
                {`${k.ss_sections?.ss_classes?.name || ''} ${k.ss_sections?.name || ''}`.trim() || 'Class not assigned'} · Adm. no {k.admission_no}
              </p>
              <p className="mt-4 text-3xl font-display font-semibold">{pct === null ? 'No records yet' : `${pct}%`}</p>
              {pct !== null && <p className="text-sm text-muted">{attended} of {mine.length} days attended (present or late)</p>}
              {mine.length > 0 && (
                <ul className="mt-4 divide-y divide-line text-sm max-h-72 overflow-y-auto">
                  {mine.slice(0, 30).map((r) => (
                    <li key={r.date} className="py-2 flex justify-between">
                      <span>{niceDate(r.date)}</span>
                      <span className={`font-medium ${TONE[r.status]}`}>{r.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>
    </Layout>
  )
}
