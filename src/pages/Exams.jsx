import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'

const input = 'border border-line rounded-md px-3 py-2 bg-white'

export default function Exams() {
  const { profile } = useAuth()
  const [subjects, setSubjects] = useState([])
  const [exams, setExams] = useState([])
  const [subject, setSubject] = useState('')
  const [exam, setExam] = useState({ name: '', max_marks: 100 })
  const [error, setError] = useState('')

  async function load() {
    const [s, e] = await Promise.all([
      supabase.from('ss_subjects').select('*').order('name'),
      supabase.from('ss_exams').select('*').order('created_at', { ascending: false }),
    ])
    setSubjects(s.data || [])
    setExams(e.data || [])
  }
  useEffect(() => { if (profile?.role === 'admin') load() }, [profile])
  if (profile && profile.role !== 'admin') return <Navigate to="/" replace />

  async function run(p) {
    setError('')
    const { error } = await p
    if (error) setError(error.message.includes('duplicate') ? 'That name already exists.' : error.message)
    else load()
  }

  return (
    <Layout title="Exams & subjects">
      {error && <p className="text-mark text-sm mb-4">{error}</p>}
      <div className="grid md:grid-cols-2 gap-6">
        <section className="bg-white border border-line rounded-md p-5">
          <h2 className="font-display text-xl font-semibold mb-3">Subjects</h2>
          <form className="flex gap-2 mb-4" onSubmit={(e) => { e.preventDefault(); if (subject.trim()) { run(supabase.from('ss_subjects').insert({ school_id: profile.school_id, name: subject.trim() })); setSubject('') } }}>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Maths" className={`${input} flex-1`} />
            <button className="bg-board text-chalk rounded-md px-4">Add</button>
          </form>
          <ul className="flex flex-wrap gap-2">
            {subjects.map((s) => (
              <li key={s.id} className="border border-line rounded-md pl-3 pr-2 py-1 text-sm flex items-center gap-2">
                {s.name}
                <button aria-label={`Delete ${s.name}`} className="text-mark" onClick={() => confirm(`Delete ${s.name} and its marks?`) && run(supabase.from('ss_subjects').delete().eq('id', s.id))}>x</button>
              </li>
            ))}
            {subjects.length === 0 && <li className="text-sm text-muted">No subjects yet</li>}
          </ul>
        </section>

        <section className="bg-white border border-line rounded-md p-5">
          <h2 className="font-display text-xl font-semibold mb-3">Exams</h2>
          <form className="flex flex-wrap gap-2 mb-4" onSubmit={(e) => { e.preventDefault(); if (exam.name.trim()) { run(supabase.from('ss_exams').insert({ school_id: profile.school_id, name: exam.name.trim(), max_marks: Number(exam.max_marks) || 100 })); setExam({ name: '', max_marks: 100 }) } }}>
            <input value={exam.name} onChange={(e) => setExam({ ...exam, name: e.target.value })} placeholder="e.g. Half-Yearly" className={`${input} flex-1 min-w-32`} />
            <input type="number" min="1" value={exam.max_marks} onChange={(e) => setExam({ ...exam, max_marks: e.target.value })} aria-label="Maximum marks per subject" className={`${input} w-24`} />
            <button className="bg-board text-chalk rounded-md px-4">Add</button>
          </form>
          <p className="text-xs text-muted mb-3">The number is the maximum marks per subject.</p>
          <ul className="divide-y divide-line">
            {exams.map((x) => (
              <li key={x.id} className="py-2 flex items-center justify-between gap-2 text-sm">
                <span>{x.name} <span className="text-muted">(out of {x.max_marks})</span></span>
                <span className="flex items-center gap-3">
                  <button onClick={() => run(supabase.from('ss_exams').update({ published: !x.published }).eq('id', x.id))}
                    className={`underline underline-offset-4 ${x.published ? 'text-board' : 'text-muted'}`}>
                    {x.published ? 'Published' : 'Hidden'}
                  </button>
                  <button className="text-mark underline underline-offset-4" onClick={() => confirm(`Delete ${x.name} and all its marks?`) && run(supabase.from('ss_exams').delete().eq('id', x.id))}>Delete</button>
                </span>
              </li>
            ))}
            {exams.length === 0 && <li className="text-sm text-muted py-2">No exams yet</li>}
          </ul>
          <p className="text-xs text-muted mt-3">Students and parents see an exam only after you publish it.</p>
        </section>
      </div>
    </Layout>
  )
}
