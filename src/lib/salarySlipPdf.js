import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { hasTelugu, registerTeluguFont, put, teluguCellHook } from './pdfFont.js'
import { monthName, rupeesInWords } from './payroll.js'

const rs = (n) => 'Rs. ' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// slip: ss_payslips row; person: {full_name, role}
export async function downloadSalarySlip(slip, person, school) {
  const doc = new jsPDF()
  if (hasTelugu(JSON.stringify([person, school]))) await registerTeluguFont(doc)
  const w = doc.internal.pageSize.getWidth()
  doc.setFontSize(20); put(doc, school || 'School', w / 2, 22, { align: 'center' }, 'bold')
  doc.setFontSize(13); put(doc, `Salary Slip: ${monthName(slip.month)}`, w / 2, 31, { align: 'center' }, 'bold')
  doc.setDrawColor(31, 77, 63).setLineWidth(0.6).line(15, 35, w - 15, 35)

  doc.setFontSize(11)
  put(doc, `Name: ${person.full_name || '-'}`, 15, 45)
  put(doc, `Designation: ${person.role ? person.role.charAt(0).toUpperCase() + person.role.slice(1) : '-'}`, w - 15, 45, { align: 'right' })
  put(doc, `Pay period: ${monthName(slip.month)}`, 15, 52)
  put(doc, `Status: ${slip.status === 'paid' ? 'Paid' + (slip.paid_on ? ' on ' + new Date(slip.paid_on + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '') : 'Draft'}`, w - 15, 52, { align: 'right' })

  const earnings = [['Basic', slip.basic], ['HRA', slip.hra], ['Allowances', slip.allowances]]
  if (Number(slip.bonus) > 0) earnings.push(['Bonus', slip.bonus])
  const deductions = [['PF', slip.pf], ['Other deductions', slip.other_deductions]]
  if (Number(slip.lop_amount) > 0) deductions.push([`Loss of pay (${Number(slip.lop_days)} days)`, slip.lop_amount])
  const n = Math.max(earnings.length, deductions.length)
  const body = Array.from({ length: n }, (_, i) => [
    earnings[i]?.[0] || '', earnings[i] ? rs(earnings[i][1]) : '',
    deductions[i]?.[0] || '', deductions[i] ? rs(deductions[i][1]) : '',
  ])
  const totalEarn = earnings.reduce((s, r) => s + Number(r[1]), 0)
  const totalDed = deductions.reduce((s, r) => s + Number(r[1]), 0)
  autoTable(doc, {
    startY: 60,
    head: [['Earnings', 'Amount', 'Deductions', 'Amount']],
    body,
    foot: [['Total earnings', rs(totalEarn), 'Total deductions', rs(totalDed)]],
    theme: 'grid',
    headStyles: { fillColor: [31, 77, 63] },
    footStyles: { fillColor: [235, 238, 233], textColor: 20, fontStyle: 'bold' },
    styles: { fontSize: 10 },
    columnStyles: { 1: { halign: 'right' }, 3: { halign: 'right' } },
    didParseCell: (d) => {
      teluguCellHook(d)
      if (d.section !== 'body' && (d.column.index === 1 || d.column.index === 3)) d.cell.styles.halign = 'right'
    },
  })

  let y = doc.lastAutoTable.finalY + 12
  doc.setFontSize(13); put(doc, 'Net pay', 15, y, undefined, 'bold'); put(doc, rs(slip.net), w - 15, y, { align: 'right' }, 'bold')
  y += 8
  doc.setFontSize(10); put(doc, rupeesInWords(slip.net), 15, y)
  y += 5
  put(doc, 'Net pay = total earnings (after loss of pay) minus deductions.', 15, y)

  y = doc.internal.pageSize.getHeight() - 30
  doc.setFontSize(10)
  put(doc, 'This is a computer generated salary slip.', 15, y)
  doc.line(w - 55, y - 6, w - 15, y - 6); put(doc, 'Principal', w - 15, y, { align: 'right' })
  doc.save(`salary-slip-${slip.month}-${(person.full_name || 'staff').replace(/\s+/g, '-')}.pdf`)
}
