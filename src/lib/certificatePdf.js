import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { hasTelugu, registerTeluguFont, put, teluguCellHook } from './pdfFont.js'

export const CERT_TITLE = {
  bonafide: 'Bonafide Certificate',
  character: 'Character Certificate',
  transfer: 'Transfer Certificate',
  experience: 'Experience Certificate',
}
export const CERT_PREFIX = { transfer: 'TC', character: 'CC', bonafide: 'BC', experience: 'EC' }

const nice = (iso) => (iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '-')

function paragraph(doc, text, x, y, width, size = 12) {
  doc.setFontSize(size)
  doc.setFont(hasTelugu(text) && doc.getFontList().NotoTelugu ? 'NotoTelugu' : 'helvetica', 'normal')
  const lines = doc.splitTextToSize(text, width)
  // splitTextToSize measures with the current font, so set the right one before splitting
  lines.forEach((l, i) => put(doc, l, x, y + i * (size * 0.55 + 2.2)))
  return y + lines.length * (size * 0.55 + 2.2)
}

// c: certificate row {cert_type, cert_no, person_name, details, issued_on}; school: name
export async function downloadCertificate(c, school) {
  const doc = new jsPDF()
  if (hasTelugu(JSON.stringify(c)) || hasTelugu(school)) await registerTeluguFont(doc)
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()
  const d = c.details || {}
  doc.setDrawColor(31, 77, 63).setLineWidth(1).rect(8, 8, w - 16, h - 16)
  doc.setLineWidth(0.3).rect(11, 11, w - 22, h - 22)

  doc.setFontSize(22); put(doc, school || 'School', w / 2, 34, { align: 'center' }, 'bold')
  doc.setFontSize(16); put(doc, CERT_TITLE[c.cert_type], w / 2, 48, { align: 'center' }, 'bold')
  doc.setLineWidth(0.6).line(60, 52, w - 60, 52)
  doc.setFontSize(11)
  put(doc, `No: ${c.cert_no}`, 20, 64)
  put(doc, `Date: ${nice(c.issued_on)}`, w - 20, 64, { align: 'right' })

  let y = 80
  const W = w - 40
  const name = c.person_name
  if (c.cert_type === 'bonafide') {
    y = paragraph(doc, `This is to certify that ${name}, admission no ${d.admissionNo || '-'}, is a bonafide student of this school, studying in ${d.className || '-'} during the academic year ${d.academicYear || '-'}.`, 20, y, W)
    if (d.purpose) y = paragraph(doc, `This certificate is issued on request, for the purpose of ${d.purpose}.`, 20, y + 6, W)
  } else if (c.cert_type === 'character') {
    y = paragraph(doc, `This is to certify that ${name}, admission no ${d.admissionNo || '-'}, studied in this school in ${d.className || '-'}${d.fromYear ? ` from ${d.fromYear}` : ''}${d.toYear ? ` to ${d.toYear}` : ''}.`, 20, y, W)
    y = paragraph(doc, `Conduct and character during this period: ${d.conduct || 'Good'}.`, 20, y + 6, W)
    y = paragraph(doc, 'This certificate is issued on request.', 20, y + 6, W)
  } else if (c.cert_type === 'experience') {
    y = paragraph(doc, `This is to certify that ${name} worked in this school as ${d.designation || 'a staff member'} from ${nice(d.fromDate)} to ${nice(d.toDate)}.`, 20, y, W)
    if (d.note) y = paragraph(doc, d.note, 20, y + 6, W)
    y = paragraph(doc, 'We wish them every success in the future.', 20, y + 6, W)
  } else {
    autoTable(doc, {
      startY: y - 6,
      body: [
        ['Name of the student', name],
        ['Admission no', d.admissionNo || '-'],
        ['Date of birth', nice(d.dob)],
        ['Class last studied', d.className || '-'],
        ['Date of admission', nice(d.admissionDate)],
        ['Date of leaving', nice(d.leavingDate)],
        ['Reason for leaving', d.reason || '-'],
        ['Conduct', d.conduct || 'Good'],
        ['Eligible for promotion', d.promoted || 'Yes'],
      ],
      theme: 'grid',
      styles: { fontSize: 11, cellPadding: 3 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } },
      margin: { left: 20, right: 20 },
      didParseCell: teluguCellHook,
    })
    y = doc.lastAutoTable.finalY
  }

  const sy = h - 38
  doc.setFontSize(10)
  put(doc, '(School seal)', 20, sy)
  doc.line(w - 70, sy - 6, w - 20, sy - 6)
  put(doc, 'Principal', w - 20, sy, { align: 'right' })
  doc.save(`${CERT_PREFIX[c.cert_type]}-${c.cert_no.split('/').slice(1).join('-')}.pdf`)
}
