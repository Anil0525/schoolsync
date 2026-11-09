import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'
import { buildResults } from '../lib/results.js'
import { downloadReportCards } from '../lib/reportPdf.js'
import { useI18n } from '../lib/i18n.jsx'

export default function MyMarks() {
  const { profile } = useAuth()
  const { t } = useI18n()
  const allowed = profile && ['student', 'parent'].includes(profile.role)
  const [blocks, setBlocks] = useState(null)

  useEffect(() => {
    if (!allowed) return
    ;(async () => {
      const [k, ex, su] = await Promise.all([
        supabase.from('ss_students').select('id, full_name, admission_no, ss_sections(name, ss_classes(name))'),
        supabase.from('ss_exams').select('*').eq('published', true).order('created_at', { ascending: false }),
        supabase.from('ss_subjects').select('id, name').order('name'),
      ])
      const kids = k.data || [], exams = ex.data || [], subjects = su.data || []
      const ids = kids.map((x) => x.id)
      let marks = [], att = []
      if (ids.length) {
        const [m, a] = await Promise.all([
          supabase.from('ss_marks').select('student_id, exam_id, subject_id, marks').in('student_id', ids),
          supabase.from('ss_attendance').select('student_id, status').in('student_id', ids).limit(5000),
        ])
        marks = m.data || []; att = a.data || []
      }
      const out = []
      for (const kid of kids) {
        const mine = att.filter((r) => r.student_id === kid.id)
        const attendancePct = mine.length ? Math.round((mine.filter((r) => r.status === 'present' || r.status === 'late').length / mine.length) * 100) : null
        const className = `${kid.ss_sections?.ss_classes?.name || ''} ${kid.ss_sections?.name || ''}`.trim()
        const examBlocks = []
        for (const exam of exams) {
          const em = marks.filter((m) => m.exam_id === exam.id && m.student_id === kid.id)
          if (!em.length) continue
          const [res] = buildResults([kid], subjects, em, exam)
          const { data: rk } = await supabase.rpc('ss_exam_rank', { p_exam: exam.id, p_student: kid.id })
          const rank = rk?.[0]
          examBlocks.push({ exam, res, rank: rank?.rnk ?? null, size: rank?.size ?? null })
        }
        out.push({ kid, className, attendancePct, examBlocks })
      }
      setBlocks(out)
    })()
  }, [allowed])

  if (profile && !allowed) return <Navigate to="/" replace />

  return (
    <Layout title={profile?.role === 'parent' ? 'Child marks' : 'My marks'}>
      {blocks && blocks.length === 0 && <p className="text-muted">{t('No student is linked to this account yet.')}</p>}
      <div className="space-y-6">
        {(blocks || []).map(({ kid, className, attendancePct, examBlocks }) => (
          <section key={kid.id} className="bg-white border border-line rounded-md p-5">
            <h2 className="font-display text-xl font-semibold">{kid.full_name}</h2>
            <p className="text-sm text-muted">{className || t('Class not assigned')} · {t('Adm. no')} {kid.admission_no}</p>
            {examBlocks.length === 0 && <p className="mt-4 text-muted text-sm">{t('No results published yet.')}</p>}
            {examBlocks.map(({ exam, res, rank, size }) => (
              <div key={exam.id} className="mt-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-medium">{exam.name}</h3>
                  <button className="underline underline-offset-4 text-sm"
                    onClick={() => downloadReportCards([{ school: profile.ss_schools?.name, exam: exam.name, name: kid.full_name, admissionNo: kid.admission_no, className, attendancePct, rows: res.rows, total: res.total, maxTotal: res.maxTotal, pct: res.pct, grade: res.grade, rank, size }], `${kid.full_name.replace(/\W+/g, '_')}_${exam.name.replace(/\W+/g, '_')}.pdf`)}>
                    Download report card (PDF)
                  </button>
                </div>
                <table className="w-full text-sm mt-2">
                  <tbody className="divide-y divide-line">
                    {res.rows.map((r) => (
                      <tr key={r.subject}><td className="py-1.5">{r.subject}</td><td className="py-1.5 text-right">{r.marks === null ? 'AB' : r.marks} / {r.max}</td></tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-3 text-sm"><strong>{res.total} / {res.maxTotal}</strong> · {res.pct}% · Grade {res.grade}{rank ? ` · Rank ${rank} of ${size}` : ''}</p>
              </div>
            ))}
          </section>
        ))}
      </div>
    </Layout>
  )
}
