import { today } from './dates.js'

export const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })
export const round2 = (n) => Math.round(Number(n) * 100) / 100
export const METHODS = [['cash', 'Cash'], ['upi', 'UPI'], ['card', 'Card'], ['cheque', 'Cheque']]
export const METHOD_LABEL = { cash: 'Cash', upi: 'UPI', card: 'Card', cheque: 'Cheque', online: 'Online (test)' }

export const STATUS = {
  paid: ['Paid', 'text-board border-board'],
  partial: ['Part paid', 'text-ink border-line'],
  due: ['Due', 'text-muted border-line'],
  overdue: ['Overdue', 'text-mark border-mark'],
}

// paid / balance / status of one fee, given all payments
export function summarize(fee, payments) {
  const mine = payments.filter((p) => p.fee_id === fee.id)
    .sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at))
  const paid = round2(mine.reduce((s, p) => s + Number(p.amount), 0))
  const balance = Math.max(0, round2(Number(fee.amount) - paid))
  let status = 'due'
  if (balance <= 0) status = 'paid'
  else if (fee.due_date < today()) status = 'overdue'
  else if (paid > 0) status = 'partial'
  return { paid, balance, status, payments: mine }
}

export const classLabel = (s) => `${s?.ss_sections?.ss_classes?.name || ''} ${s?.ss_sections?.name || ''}`.trim()

// data for the receipt PDF; `payments` must include `payment`
export function receiptData({ school, student, fee, payment, payments }) {
  const upto = payments.filter((p) => p.fee_id === fee.id && new Date(p.paid_at) <= new Date(payment.paid_at))
  const paidTillNow = round2(upto.reduce((s, p) => s + Number(p.amount), 0))
  return {
    school,
    receiptNo: payment.receipt_no,
    paidAt: payment.paid_at,
    name: student?.full_name || '-',
    admissionNo: student?.admission_no || '-',
    className: classLabel(student),
    title: fee.title,
    amount: Number(payment.amount),
    method: payment.method,
    reference: payment.reference,
    feeTotal: Number(fee.amount),
    paidTillNow,
    balance: Math.max(0, round2(Number(fee.amount) - paidTillNow)),
  }
}
