import { round2 } from './fees.js'

export const daysInMonth = (ym) => new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0).getDate()
export const monthName = (ym, locale = 'en-IN') => new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
export const thisMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }

// One payslip from a salary structure. Loss of pay is deducted from basic + HRA + allowances, per day of the month.
export function computeSlip(st, ym, lopDays = 0, bonus = 0) {
  const basic = Number(st.basic) || 0, hra = Number(st.hra) || 0, allowances = Number(st.allowances) || 0
  const pf = Number(st.pf) || 0, other = Number(st.other_deductions) || 0
  const bonusN = Number(bonus) || 0, lop = Number(lopDays) || 0
  const earnings = basic + hra + allowances
  const lopAmount = round2((earnings / daysInMonth(ym)) * lop)
  const gross = round2(earnings - lopAmount + bonusN)
  const net = round2(gross - pf - other)
  return { basic, hra, allowances, bonus: bonusN, lop_days: lop, lop_amount: lopAmount, pf, other_deductions: other, gross, net }
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
const below100 = (n) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : ''))
const below1000 = (n) => (n >= 100 ? ONES[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + below100(n % 100) : '') : below100(n))

// Indian numbering: crore, lakh, thousand
export function rupeesInWords(amount) {
  const total = Math.round(Number(amount) * 100)
  const rupees = Math.floor(total / 100), paise = total % 100
  if (rupees === 0 && paise === 0) return 'Zero rupees only'
  const parts = []
  let n = rupees
  const crore = Math.floor(n / 10000000); n %= 10000000
  const lakh = Math.floor(n / 100000); n %= 100000
  const thousand = Math.floor(n / 1000); n %= 1000
  if (crore) parts.push(below1000(crore) + ' Crore')
  if (lakh) parts.push(below100(lakh) + ' Lakh')
  if (thousand) parts.push(below100(thousand) + ' Thousand')
  if (n) parts.push(below1000(n))
  let out = (parts.join(' ') || 'Zero') + ' rupees'
  if (paise) out += ' and ' + below100(paise) + ' paise'
  return out + ' only'
}
