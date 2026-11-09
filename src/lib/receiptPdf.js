import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { METHOD_LABEL } from './fees.js'
import { hasTelugu, registerTeluguFont, put, teluguCellHook } from './pdfFont.js'

// The default PDF font has no rupee sign, so receipts use "Rs."
const rs = (n) => 'Rs. ' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export async function downloadReceipt(d) {
  const doc = new jsPDF()
  if (hasTelugu(JSON.stringify(d))) await registerTeluguFont(doc)
  const w = doc.internal.pageSize.getWidth()
  doc.setFontSize(20); put(doc, d.school || 'School', w / 2, 22, { align: 'center' }, 'bold')
  doc.setFontSize(13); put(doc, 'Fee Receipt', w / 2, 31, { align: 'center' }, 'bold')
  doc.setDrawColor(31, 77, 63).setLineWidth(0.6).line(15, 35, w - 15, 35)

  const date = new Date(d.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  doc.setFontSize(11)
  put(doc, `Receipt no: ${d.receiptNo}`, 15, 45)
  put(doc, `Date: ${date}`, w - 15, 45, { align: 'right' })
  put(doc, `Student: ${d.name}`, 15, 52)
  put(doc, `Class: ${d.className || '-'}`, w - 15, 52, { align: 'right' })
  put(doc, `Admission no: ${d.admissionNo}`, 15, 59)

  const mode = (METHOD_LABEL[d.method] || d.method) + (d.reference ? ` (${d.reference})` : '')
  autoTable(doc, {
    startY: 68,
    head: [['Description', 'Mode', 'Amount']],
    body: [[d.title, mode, rs(d.amount)]],
    theme: 'grid',
    headStyles: { fillColor: [31, 77, 63] },
    styles: { fontSize: 11 },
    columnStyles: { 2: { halign: 'right' } },
    didParseCell: teluguCellHook,
  })

  let y = doc.lastAutoTable.finalY + 12
  doc.setFontSize(11)
  put(doc, 'Fee total', 120, y); put(doc, rs(d.feeTotal), w - 15, y, { align: 'right' })
  y += 7
  put(doc, 'Paid till this receipt', 120, y); put(doc, rs(d.paidTillNow), w - 15, y, { align: 'right' })
  y += 7
  put(doc, 'Balance due', 120, y, undefined, 'bold'); put(doc, rs(d.balance), w - 15, y, { align: 'right' }, 'bold')

  y = doc.internal.pageSize.getHeight() - 30
  doc.setFontSize(10)
  put(doc, 'This is a computer generated receipt.', 15, y)
  put(doc, 'Accountant', w - 15, y, { align: 'right' })
  doc.line(w - 55, y - 6, w - 15, y - 6)
  doc.save(`receipt-${d.receiptNo}.pdf`)
}
