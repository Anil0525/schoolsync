import { useEffect, useState } from 'react'
import Layout from '../components/Layout.jsx'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'
import { useI18n } from '../lib/i18n.jsx'
import { inr } from '../lib/fees.js'
import { monthName } from '../lib/payroll.js'
import { downloadSalarySlip } from '../lib/salarySlipPdf.js'

export default function MySalary() {
  const { profile } = useAuth()
  const { t, lang } = useI18n()
  const [slips, setSlips] = useState(null)
  const [error, setError] = useState('')
  const school = profile?.ss_schools?.name || 'School'

  useEffect(() => {
    if (!profile) return
    supabase.from('ss_payslips').select('*').eq('profile_id', profile.id).eq('status', 'paid').order('month', { ascending: false }).limit(60)
      .then(({ data, error }) => {
        if (error) {
          setError(/does not exist|schema cache|Could not find/.test(error.message) ? 'Salary slips are not set up yet. Run 025_payroll.sql in Supabase.' : error.message)
          setSlips([])
        } else setSlips(data || [])
      })
  }, [profile])

  return (
    <Layout title="My salary slips">
      {error && <p className="text-mark text-sm mb-4">{error}</p>}
      {!slips && <p className="text-muted">{t('Loading…')}</p>}
      <ul className="space-y-2">
        {(slips || []).map((s) => (
          <li key={s.id} className="bg-white border border-line rounded-md p-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span><span className="font-medium">{monthName(s.month, lang === 'te' ? 'te-IN' : 'en-IN')}</span> · {t('Net pay')} {inr(s.net)}</span>
            <button onClick={() => downloadSalarySlip(s, profile, school)} className="border border-board text-board rounded-md px-3 py-1.5 text-xs">{t('Download')}</button>
          </li>
        ))}
        {slips && slips.length === 0 && <li className="text-muted text-sm">{t('No salary slips yet.')}</li>}
      </ul>
    </Layout>
  )
}
