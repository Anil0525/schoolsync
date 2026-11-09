import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'
import { useI18n } from '../lib/i18n.jsx'
import { today } from '../lib/dates.js'

const label = (s) => `${s.ss_classes?.name || ''} ${s.name}`.trim()

export default function MyClasses() {
  const { profile } = useAuth()
  const { t } = useI18n()
  const allowed = profile?.role === 'teacher'
  const [cards, setCards] = useState(null) // null = loading
  const [open, setOpen] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!allowed) return
    let live = true
    async function load() {
      const { data: secs, error: e1 } = await supabase.from('ss_sections')
        .select('id, name, ss_classes(name, sort_order)').eq('class_teacher_id', profile.id)
      if (e1) { if (live) setError(e1.message); return }
      const sections = (secs || []).sort((a, b) =>
        (a.ss_classes?.sort_order ?? 0) - (b.ss_classes?.sort_order ?? 0) || label(a).localeCompare(label(b)))
      if (!sections.length) { if (live) setCards([]); return }

      const ids = sections.map((s) => s.id)
      const { data: st, error: e2 } = await supabase.from('ss_students')
        .select('id, admission_no, full_name, section_id').in('section_id', ids).eq('status', 'active').order('full_name')
      if (e2) { if (live) setError(e2.message); return }
      const students = st || []

      let att = []
      if (students.length) {
        const { data, error: e3 } = await supabase.from('ss_attendance').select('student_id, status')
          .eq('date', today()).in('student_id', students.map((x) => x.id))
        if (e3) { if (live) setError(e3.message); return }
        att = data || []
      }
      const byStudent = Object.fromEntries(att.map((a) => [a.student_id, a.status]))
      const result = sections.map((s) => {
        const list = students.filter((x) => x.section_id === s.id)
        const marked = list.filter((x) => byStudent[x.id])
        const absent = marked.filter((x) => byStudent[x.id] === 'absent').length
        return { section: s, students: list, marked: marked.length, absent, status: byStudent }
      })
      if (live) setCards(result)
    }
    load()
    return () => { live = false }
  }, [allowed, profile?.id])

  if (profile && !allowed) return <Navigate to="/" replace />

  return (
    <Layout title="My classes">
      {error && <p className="text-mark text-sm mb-4">{error}</p>}
      {cards === null && !error && <p className="text-muted">{t('Loading…')}</p>}
      {cards && cards.length === 0 && (
        <p className="text-muted">{t('No class assigned to you yet. Ask the admin to assign you as class teacher (Teachers page).')}</p>
      )}

      <ul className="space-y-4">
        {(cards || []).map((c) => {
          const total = c.students.length
          const notMarked = total > 0 && c.marked === 0
          const partly = c.marked > 0 && c.marked < total
          return (
            <li key={c.section.id} className="bg-white border border-line rounded-md p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-semibold">{label(c.section)}</h2>
                  <p className="text-sm text-muted mt-1">{total} {t('students')}</p>
                  <p className={`text-sm mt-1 ${notMarked || partly ? 'text-mark' : 'text-board'}`}>
                    {total === 0
                      ? t('No active students in this section.')
                      : notMarked
                        ? t('Today: attendance not marked yet')
                        : partly
                          ? `${t('Today: attendance partly marked')} (${c.marked}/${total})`
                          : `${t('Today: attendance marked')} · ${c.absent} ${t('absent')}`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to={`/attendance?section=${c.section.id}`} className="bg-board hover:bg-board-dark text-chalk rounded-md px-4 py-2 text-sm">{t('Mark attendance')}</Link>
                  <Link to="/marks" className="border border-board text-board rounded-md px-4 py-2 text-sm">{t('Enter marks')}</Link>
                  <Link to="/homework" className="border border-board text-board rounded-md px-4 py-2 text-sm">{t('Homework')}</Link>
                </div>
              </div>

              {total > 0 && (
                <>
                  <button onClick={() => setOpen(open === c.section.id ? null : c.section.id)}
                    className="mt-4 text-sm text-board underline underline-offset-4" aria-expanded={open === c.section.id}>
                    {open === c.section.id ? t('Hide students') : t('Show students')}
                  </button>
                  {open === c.section.id && (
                    <ul className="mt-3 border border-line rounded-md divide-y divide-line text-sm">
                      {c.students.map((s) => (
                        <li key={s.id} className="px-3 py-2 flex items-center justify-between gap-3">
                          <span>{s.full_name} <span className="text-muted">({s.admission_no})</span></span>
                          <span className={c.status[s.id] === 'absent' ? 'text-mark' : 'text-muted'}>
                            {c.status[s.id] ? t(c.status[s.id]) : '–'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </li>
          )
        })}
      </ul>
    </Layout>
  )
}
