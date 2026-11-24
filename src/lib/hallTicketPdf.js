import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { hasTelugu, registerTeluguFont, put, teluguCellHook } from './pdfFont.js'

const INSTRUCTIONS = [
  'Bring this hall ticket to every exam. Entry is not allowed without it.',
  'Reach the exam hall 15 minutes before the start time.',
  'Bring your own pen, pencil and other stationery. Sharing is not allowed.',
  'Mobile phones and smart watches are not allowed in the exam hall.',
]

function drawTicket(doc, d) {
  const w = doc.internal.pageSize.getWidth()
  doc.setDrawColor(31, 77, 63).setLineWidth(0.8).rect(8, 8, w - 16, 150)
  doc.setFontSize(20); put(doc, d.school || 'School', w / 2, 22, { align: 'center' }, 'bold')
  doc.setFontSize(14); put(doc, 'HALL TICKET', w / 2, 31, { align: 'center' }, 'bold')
  doc.setFontSize(12); put(doc, d.exam, w / 2, 38, { align: 'center' })
  doc.setLineWidth(0.5).line(15, 42, w - 15, 42)

  doc.setFontSize(11)
  put(doc, `Name: ${d.name}`, 15, 51)
  put(doc, `Admission no: ${d.admissionNo}`, w - 15, 51, { align: 'right' })
  put(doc, `Class: ${d.className || '-'}`, 15, 58)
  put(doc, `Date of birth: ${d.dob || '-'}`, w - 15, 58, { align: 'right' })

  autoTable(doc, {
    startY: 65,
    head: [['Date', 'Day', 'Subject', 'Time']],
    body: d.rows.map((r) => [r.date, r.day, r.subject, r.time]),
    theme: 'grid',
    headStyles: { fillColor: [31, 77, 63] },
    styles: { fontSize: 10 },
    margin: { left: 15, right: 15 },
    didParseCell: teluguCellHook,
  })

  let y = doc.lastAutoTable.finalY + 8
  doc.setFontSize(9)
  put(doc, 'Instructions', 15, y, undefined, 'bold')
  INSTRUCTIONS.forEach((t, i) => { y += 5; put(doc, `${i + 1}. ${t}`, 15, y) })

  const sy = 150
  doc.setFontSize(10)
  doc.line(15, sy - 6, 55, sy - 6); put(doc, 'Class teacher', 15, sy)
  doc.line(w - 55, sy - 6, w - 15, sy - 6); put(doc, 'Principal', w - 15, sy, { align: 'right' })
}

// tickets: array of {school, exam, name, admissionNo, className, dob, rows:[{date, day, subject, time}]}
export async function downloadHallTickets(tickets, filename) {
  const doc = new jsPDF()
  if (tickets.some((t) => hasTelugu(JSON.stringify(t)))) await registerTeluguFont(doc)
  tickets.forEach((t, i) => {
    // two tickets per page would be tight with long schedules, so one per page
    if (i > 0) doc.addPage()
    drawTicket(doc, t)
  })
  doc.save(filename)
}
