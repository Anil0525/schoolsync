import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'
import { useI18n } from '../lib/i18n.jsx'
import { inr, summarize } from '../lib/fees.js'
import { today, niceDate } from '../lib/dates.js'

const label = (s) => `${s.ss_classes?.name || ''} ${s.name}`.trim()

// Read-only school overview for the principal (admins can open it too).
export default function Overview() {
  const { profile } = useAuth()
  const { t } = useI18n()
  const allowed = !!profile && ['principal', 'admin'].includes(profile.role)
  const [d, setD] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!allowed) return
    let live = true
    async function load() {
      const res = await Promise.all([
        supabase.from('ss_sections').select('id, name, ss_classes(name, sort_order)'),
        supabase.from('ss_students').select('id, section_id').eq('status', 'active').limit(5000),
        supabase.from('ss_attendance').select('student_id, status').eq('date', today()).limit(5000),
        supabase.from('ss_fees').select('id, amount, due_date').limit(5000),
        supabase.from('ss_fee_payments').select('fee_id, amount, paid_at').limit(20000),
        supabase.from('ss_announcements').select('id, title, audience, created_at').order('created_at', { ascending: false }).limit(5),
      ])
      const bad = res.find((r) => r.error)
      if (bad) { if (live) setError(bad.error.message); return }
      const [sec, stu, att, fee, pay, ann] = res.map((r) => r.data || [])

      const status = Object.fromEntries(att.map((a) => [a.student_id, a.status]))
      const rows = sec
        .sort((a, b) => (a.ss_classes?.sort_order ?? 0) - (b.ss_classes?.sort_order ?? 0) || label(a).localeCompare(label(b)))
        .map((s) => {
          const list = stu.filter((x) => x.section_id === s.id)
          const marked = list.filter((x) => status[x.id])
          const present = marked.filter((x) => ['present', 'late'].includes(status[x.id])).length
          const absent = marked.filter((x) => status[x.id] === 'absent').length
          return { id: s.id, name: label(s), total: list.length, marked: marked.length, present, absent }
        })
        .filter((r) => r.total > 0)

      const markedAll = rows.reduce((n, r) => n + r.marked, 0)
      const presentAll = rows.reduce((n, r) => n + r.present, 0)
      const payBy = {}
      pay.forEach((x) => { (payBy[x.fee_id] ||= []).push(x) })
      const money = fee.map((f) => ({ f, ...summarize(f, payBy[f.id] || []) }))
      const billed = money.reduce((n, m) => n + Number(m.f.amount), 0)
      const collected = money.reduce((n, m) => n + m.paid, 0)
      const overdueRows = money.filter((m) => m.status === 'overdue')

      if (live) setD({
        students: stu.length,
        pct: markedAll ? Math.round((presentAll / markedAll) * 100) : null,
        notMarked: rows.filter((r) => r.marked === 0),
        rows,
        billed, collected,
        overdue: overdueRows.reduce((n, m) => n + m.balance, 0),
        overdueCount: overdueRows.length,
        hasFees: fee.length > 0,
        ann,
      })
    }
    load()
    return () => { live = false }
  }, [allowed])

  if (profile && !allowed) return <Navigate to="/" replace />

  const card = (k, v, sub, bad) => (
    <div key={k} className="bg-white border border-line rounded-md p-4">
      <p className="text-sm text-muted">{t(k)}</p>
      <p className={`text-2xl font-semibold mt-1 ${bad ? 'text-mark' : ''}`}>{v}</p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  )

  return (
    <Layout title="Overview">
      {error && <p className="text-mark text-sm mb-4">{error}</p>}
      {!d && !error && <p className="text-muted">{t('Loading…')}</p>}
      {d && (
        <div className="space-y-8">
          <section aria-label={t('Today')}>
            <h2 className="font-display text-xl font-semibold mb-3">{t('Today')} · {niceDate(today())}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {card('Active students', d.students)}
              {card('Attendance today', d.pct === null ? '–' : `${d.pct}%`, d.pct === null ? t('Not marked yet') : t('of marked students present'), d.pct !== null && d.pct < 75)}
              {card('Absent today', d.rows.reduce((n, r) => n + r.absent, 0))}
              {card('Classes not marked', d.notMarked.length, d.notMarked.length ? d.notMarked.map((r) => r.name).join(', ') : t('All classes marked'), d.notMarked.length > 0)}
            </div>
          </section>

          <section aria-label={t('Attendance by class')}>
            <h2 className="font-display text-xl font-semibold mb-3">{t('Attendance by class')}</h2>
            <div className="bg-white border border-line rounded-md overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted border-b border-line">
                  <tr>
                    {['Class', 'Students', 'Present', 'Absent', 'Today'].map((h) => <th key={h} className="px-3 py-2 font-medium">{t(h)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {d.rows.length === 0 && <tr><td colSpan="5" className="px-3 py-3 text-muted">{t('No active students yet.')}</td></tr>}
                  {d.rows.map((r) => (
                    <tr key={r.id} className="border-b border-line last:border-0">
                      <td className="px-3 py-2">{r.name}</td>
                      <td className="px-3 py-2">{r.total}</td>
                      <td className="px-3 py-2">{r.marked ? r.present : '–'}</td>
                      <td className={`px-3 py-2 ${r.absent ? 'text-mark' : ''}`}>{r.marked ? r.absent : '–'}</td>
                      <td className={`px-3 py-2 ${r.marked === 0 ? 'text-mark' : r.marked < r.total ? 'text-mark' : 'text-board'}`}>
                        {r.marked === 0 ? t('Not marked yet') : r.marked < r.total ? `${t('Partly marked')} (${r.marked}/${r.total})` : t('Marked')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-label={t('Fees')}>
            <h2 className="font-display text-xl font-semibold mb-3">{t('Fees')}</h2>
            {!d.hasFees ? <p className="text-muted text-sm">{t('No fees created yet.')}</p> : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {card('Billed', inr(d.billed))}
                {card('Collected', inr(d.collected))}
                {card('Outstanding', inr(d.billed - d.collected))}
                {card('Overdue', inr(d.overdue), d.overdueCount ? `${d.overdueCount} ${t('fees overdue')}` : null, d.overdue > 0)}
              </div>
            )}
          </section>

          <section aria-label={t('Announcements')}>
            <h2 className="font-display text-xl font-semibold mb-3">{t('Recent announcements')}</h2>
            {d.ann.length === 0 ? <p className="text-muted text-sm">{t('No announcements yet.')}</p> : (
              <ul className="bg-white border border-line rounded-md divide-y divide-line text-sm">
                {d.ann.map((a) => (
                  <li key={a.id} className="px-3 py-2 flex items-center justify-between gap-3">
                    <span>{a.title}</span>
                    <span className="text-muted whitespace-nowrap">{niceDate(a.created_at.slice(0, 10))}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </Layout>
  )
}
