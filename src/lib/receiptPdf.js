import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { METHOD_LABEL } from './fees.js'

// The default PDF font has no rupee sign, so receipts use "Rs."
const rs = (n) => 'Rs. ' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function downloadReceipt(d) {
  const doc = new jsPDF()
  const w = doc.internal.pageSize.getWidth()
  doc.setFont('helvetica', 'bold').setFontSize(20).text(d.school || 'School', w / 2, 22, { align: 'center' })
  doc.setFontSize(13).text('Fee Receipt', w / 2, 31, { align: 'center' })
  doc.setDrawColor(31, 77, 63).setLineWidth(0.6).line(15, 35, w - 15, 35)

  const date = new Date(d.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  doc.setFont('helvetica', 'normal').setFontSize(11)
  doc.text(`Receipt no: ${d.receiptNo}`, 15, 45)
  doc.text(`Date: ${date}`, w - 15, 45, { align: 'right' })
  doc.text(`Student: ${d.name}`, 15, 52)
  doc.text(`Class: ${d.className || '-'}`, w - 15, 52, { align: 'right' })
  doc.text(`Admission no: ${d.admissionNo}`, 15, 59)

  const mode = (METHOD_LABEL[d.method] || d.method) + (d.reference ? ` (${d.reference})` : '')
  autoTable(doc, {
    startY: 68,
    head: [['Description', 'Mode', 'Amount']],
    body: [[d.title, mode, rs(d.amount)]],
    theme: 'grid',
    headStyles: { fillColor: [31, 77, 63] },
    styles: { fontSize: 11 },
    columnStyles: { 2: { halign: 'right' } },
  })

  let y = doc.lastAutoTable.finalY + 12
  doc.setFont('helvetica', 'normal').setFontSize(11)
  doc.text('Fee total', 120, y); doc.text(rs(d.feeTotal), w - 15, y, { align: 'right' })
  y += 7
  doc.text('Paid till this receipt', 120, y); doc.text(rs(d.paidTillNow), w - 15, y, { align: 'right' })
  y += 7
  doc.setFont('helvetica', 'bold')
  doc.text('Balance due', 120, y); doc.text(rs(d.balance), w - 15, y, { align: 'right' })

  y = doc.internal.pageSize.getHeight() - 30
  doc.setFont('helvetica', 'normal').setFontSize(10)
  doc.text('This is a computer generated receipt.', 15, y)
  doc.text('Accountant', w - 15, y, { align: 'right' })
  doc.line(w - 55, y - 6, w - 15, y - 6)
  doc.save(`receipt-${d.receiptNo}.pdf`)
}
