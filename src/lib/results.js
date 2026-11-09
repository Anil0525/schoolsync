export function gradeOf(pct) {
  if (pct >= 90) return 'A+'
  if (pct >= 80) return 'A'
  if (pct >= 70) return 'B+'
  if (pct >= 60) return 'B'
  if (pct >= 50) return 'C'
  if (pct >= 40) return 'D'
  return 'F'
}

// students: [{id, full_name, admission_no}], subjects: [{id, name}], marks: [{student_id, subject_id, marks}]
export function buildResults(students, subjects, marks, exam) {
  const byKey = new Map(marks.map((m) => [`${m.student_id}|${m.subject_id}`, m.marks]))
  const list = students.map((s) => {
    const rows = subjects.map((sb) => {
      const v = byKey.get(`${s.id}|${sb.id}`)
      return { subject: sb.name, marks: v === undefined || v === null ? null : Number(v), max: exam.max_marks }
    })
    const entered = rows.filter((r) => r.marks !== null)
    const total = entered.reduce((a, r) => a + r.marks, 0)
    const maxTotal = rows.length * exam.max_marks
    const pct = maxTotal ? Math.round((total / maxTotal) * 1000) / 10 : 0
    return { student: s, rows, total, maxTotal, pct, grade: entered.length ? gradeOf(pct) : '-', hasMarks: entered.length > 0 }
  })
  const ranked = list.filter((r) => r.hasMarks)
  list.forEach((r) => { r.rank = r.hasMarks ? 1 + ranked.filter((o) => o.total > r.total).length : null })
  return list
}
