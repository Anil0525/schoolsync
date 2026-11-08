import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'

function SectionAdder({ onAdd }) {
  const [name, setName] = useState('')
  return (
    <form
      className="flex gap-2 mt-3"
      onSubmit={(e) => { e.preventDefault(); if (name.trim()) { onAdd(name.trim()); setName('') } }}
    >
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New section, e.g. A"
        className="border border-line rounded-md px-3 py-1.5 bg-white text-sm flex-1" />
      <button className="bg-board text-chalk rounded-md px-3 py-1.5 text-sm">Add section</button>
    </form>
  )
}

export default function Classes() {
  const { profile } = useAuth()
  const [classes, setClasses] = useState([])
  const [sections, setSections] = useState([])
  const [newClass, setNewClass] = useState('')
  const [error, setError] = useState('')

  async function load() {
    const [c, s] = await Promise.all([
      supabase.from('ss_classes').select('*').order('sort_order').order('name'),
      supabase.from('ss_sections').select('*').order('name'),
    ])
    setClasses(c.data || [])
    setSections(s.data || [])
  }
  useEffect(() => { if (profile?.role === 'admin') load() }, [profile])

  if (profile && profile.role !== 'admin') return <Navigate to="/" replace />

  async function run(promise) {
    setError('')
    const { error } = await promise
    if (error) setError(error.message)
    else load()
  }

  const addClass = (e) => {
    e.preventDefault()
    if (!newClass.trim()) return
    run(supabase.from('ss_classes').insert({ school_id: profile.school_id, name: newClass.trim(), sort_order: classes.length }))
    setNewClass('')
  }
  const addSection = (classId, name) =>
    run(supabase.from('ss_sections').insert({ school_id: profile.school_id, class_id: classId, name }))
  const delSection = (id) => confirm('Delete this section?') && run(supabase.from('ss_sections').delete().eq('id', id))
  const delClass = (id) => confirm('Delete this class and its sections?') && run(supabase.from('ss_classes').delete().eq('id', id))

  return (
    <Layout title="Classes & sections">
      <form onSubmit={addClass} className="flex gap-2 mb-6 max-w-md">
        <input value={newClass} onChange={(e) => setNewClass(e.target.value)} placeholder="New class, e.g. Class 5"
          className="border border-line rounded-md px-3 py-2 bg-white flex-1" />
        <button className="bg-board hover:bg-board-dark text-chalk rounded-md px-4 py-2">Add class</button>
      </form>

      {error && <p className="text-mark text-sm mb-4">{error}</p>}

      {classes.length === 0 && <p className="text-muted">No classes yet. Add your first class above.</p>}

      <ul className="grid sm:grid-cols-2 gap-4">
        {classes.map((c) => (
          <li key={c.id} className="bg-white border border-line rounded-md p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{c.name}</h3>
              <button onClick={() => delClass(c.id)} className="text-mark text-sm underline underline-offset-4">Delete</button>
            </div>
            <ul className="mt-3 flex flex-wrap gap-2">
              {sections.filter((s) => s.class_id === c.id).map((s) => (
                <li key={s.id} className="border border-line rounded-md pl-3 pr-2 py-1 text-sm flex items-center gap-2">
                  {s.name}
                  <button onClick={() => delSection(s.id)} aria-label={`Delete section ${s.name}`} className="text-mark">x</button>
                </li>
              ))}
              {sections.filter((s) => s.class_id === c.id).length === 0 && <li className="text-sm text-muted">No sections</li>}
            </ul>
            <SectionAdder onAdd={(name) => addSection(c.id, name)} />
          </li>
        ))}
      </ul>
    </Layout>
  )
}
