import { inr } from './fees.js'
import { niceDate } from './dates.js'

// Indian mobile numbers: 10 digits (optionally with 91 / +91 / 0 in front). Returns '91XXXXXXXXXX' or null.
export function waNumber(phone) {
  let d = String(phone || '').replace(/\D/g, '')
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1)
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2)
  return /^[6-9]\d{9}$/.test(d) ? '91' + d : null
}

export function reminderText({ school, parentName, studentName, className, fee, balance, dueDate }) {
  return [
    `Dear ${parentName || 'Parent'},`,
    `This is a gentle reminder from ${school || 'the school'}: the fee "${fee}" of ${studentName}${className ? ` (${className})` : ''} `
      + `has a pending balance of ${inr(balance)}, which was due on ${niceDate(dueDate)}.`,
    'Kindly pay at the school office at the earliest. Please ignore this message if you have already paid.',
    'Thank you.',
  ].join('\n\n')
}

export const waLink = (number, text) => `https://wa.me/${number}?text=${encodeURIComponent(text)}`
