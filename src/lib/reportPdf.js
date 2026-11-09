import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

function drawCard(doc, d) {
  const w = doc.internal.pageSize.getWidth()
  doc.setFont('helvetica', 'bold').setFontSize(20).text(d.school || 'School', w / 2, 22, { align: 'center' })
  doc.setFontSize(13).text(`Progress Report: ${d.exam}`, w / 2, 31, { align: 'center' })
  doc.setDrawColor(31, 77, 63).setLineWidth(0.6).line(15, 35, w - 15, 35)

  doc.setFont('helvetica', 'normal').setFontSize(11)
  doc.text(`Name: ${d.name}`, 15, 45)
  doc.text(`Admission no: ${d.admissionNo}`, 15, 52)
  doc.text(`Class: ${d.className || '-'}`, w - 15, 45, { align: 'right' })
  doc.text(`Attendance: ${d.attendancePct === null ? '-' : d.attendancePct + '%'}`, w - 15, 52, { align: 'right' })

  autoTable(doc, {
    startY: 60,
    head: [['Subject', 'Marks obtained', 'Maximum']],
    body: d.rows.map((r) => [r.subject, r.marks === null ? 'AB' : String(r.marks), String(r.max)]),
    foot: [['Total', String(d.total), String(d.maxTotal)]],
    theme: 'grid',
    headStyles: { fillColor: [31, 77, 63] },
    footStyles: { fillColor: [235, 238, 233], textColor: 20, fontStyle: 'bold' },
    styles: { fontSize: 11 },
  })

  let y = doc.lastAutoTable.finalY + 12
  doc.setFont('helvetica', 'bold').setFontSize(12)
  doc.text(`Percentage: ${d.pct}%`, 15, y)
  doc.text(`Grade: ${d.grade}`, 80, y)
  if (d.rank) doc.text(`Rank: ${d.rank}${d.size ? ' of ' + d.size : ''}`, 130, y)

  y = doc.internal.pageSize.getHeight() - 30
  doc.setFont('helvetica', 'normal').setFontSize(10)
  doc.text('Class teacher', 15, y)
  doc.text('Principal', w - 15, y, { align: 'right' })
  doc.line(15, y - 6, 55, y - 6)
  doc.line(w - 55, y - 6, w - 15, y - 6)
}

// cards: array of {school, exam, name, admissionNo, className, attendancePct, rows, total, maxTotal, pct, grade, rank, size}
export function downloadReportCards(cards, filename) {
  const doc = new jsPDF()
  cards.forEach((c, i) => {
    if (i > 0) doc.addPage()
    drawCard(doc, c)
  })
  doc.save(filename)
}
