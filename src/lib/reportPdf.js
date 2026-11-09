import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { hasTelugu, registerTeluguFont, put, teluguCellHook } from './pdfFont.js'

function drawCard(doc, d) {
  const w = doc.internal.pageSize.getWidth()
  doc.setFontSize(20); put(doc, d.school || 'School', w / 2, 22, { align: 'center' }, 'bold')
  doc.setFontSize(13); put(doc, `Progress Report: ${d.exam}`, w / 2, 31, { align: 'center' }, 'bold')
  doc.setDrawColor(31, 77, 63).setLineWidth(0.6).line(15, 35, w - 15, 35)

  doc.setFontSize(11)
  put(doc, `Name: ${d.name}`, 15, 45)
  put(doc, `Admission no: ${d.admissionNo}`, 15, 52)
  put(doc, `Class: ${d.className || '-'}`, w - 15, 45, { align: 'right' })
  put(doc, `Attendance: ${d.attendancePct === null ? '-' : d.attendancePct + '%'}`, w - 15, 52, { align: 'right' })

  autoTable(doc, {
    startY: 60,
    head: [['Subject', 'Marks obtained', 'Maximum']],
    body: d.rows.map((r) => [r.subject, r.marks === null ? 'AB' : String(r.marks), String(r.max)]),
    foot: [['Total', String(d.total), String(d.maxTotal)]],
    theme: 'grid',
    headStyles: { fillColor: [31, 77, 63] },
    footStyles: { fillColor: [235, 238, 233], textColor: 20, fontStyle: 'bold' },
    styles: { fontSize: 11 },
    didParseCell: teluguCellHook,
  })

  let y = doc.lastAutoTable.finalY + 12
  doc.setFontSize(12)
  put(doc, `Percentage: ${d.pct}%`, 15, y, undefined, 'bold')
  put(doc, `Grade: ${d.grade}`, 80, y, undefined, 'bold')
  if (d.rank) put(doc, `Rank: ${d.rank}${d.size ? ' of ' + d.size : ''}`, 130, y, undefined, 'bold')

  y = doc.internal.pageSize.getHeight() - 30
  doc.setFontSize(10)
  put(doc, 'Class teacher', 15, y)
  put(doc, 'Principal', w - 15, y, { align: 'right' })
  doc.line(15, y - 6, 55, y - 6)
  doc.line(w - 55, y - 6, w - 15, y - 6)
}

// cards: array of {school, exam, name, admissionNo, className, attendancePct, rows, total, maxTotal, pct, grade, rank, size}
export async function downloadReportCards(cards, filename) {
  const doc = new jsPDF()
  if (cards.some((c) => hasTelugu(JSON.stringify(c)))) await registerTeluguFont(doc)
  cards.forEach((c, i) => {
    if (i > 0) doc.addPage()
    drawCard(doc, c)
  })
  doc.save(filename)
}
