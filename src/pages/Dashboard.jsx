import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { useI18n } from '../lib/i18n.jsx'
import LangToggle from '../components/LangToggle.jsx'

const MODULES = {
  admin: ['Students', 'Teachers', 'User accounts', 'Classes & sections', 'Attendance', 'Exams & subjects', 'Enter marks', 'Report cards', 'Fees & collection', 'Announcements', 'Homework', 'UDISE+ export'],
  teacher: ['My classes', 'Mark attendance', 'Enter marks', 'Report cards', 'Announcements', 'Homework'],
  accountant: ['Fees & collection', 'Announcements'],
  student: ['My attendance', 'My marks', 'My fees', 'Homework', 'Announcements'],
  parent: ['Child attendance', 'Child marks', 'Fees & receipts', 'Homework', 'Announcements'],
}

const LINKS = {
  Students: '/students',
  'Classes & sections': '/classes',
  Attendance: '/attendance',
  'Mark attendance': '/attendance',
  'My attendance': '/my-attendance',
  'Child attendance': '/my-attendance',
  'Exams & subjects': '/exams',
  'Enter marks': '/marks',
  'Report cards': '/report-cards',
  'My marks': '/my-marks',
  'Child marks': '/my-marks',
  'Fees & collection': '/fees',
  'UDISE+ export': '/udise',
  Teachers: '/teachers',
  'User accounts': '/users',
  'My fees': '/my-fees',
  Announcements: '/announcements',
  Homework: '/homework',
  'Fees & receipts': '/my-fees',
}

export default function Dashboard() {
  const { profile, signOut } = useAuth()
  const { t } = useI18n()

  return (
    <div className="min-h-screen">
      <header className="bg-board text-chalk px-6 py-4 flex items-center justify-between">
        <span className="font-display text-xl font-bold">SchoolSync</span>
        <div className="flex items-center gap-4 text-sm">
          <LangToggle />
          <span>{profile?.full_name || t('User')}{profile?.role ? ` (${t(profile.role)})` : ''}</span>
          <button onClick={signOut} className="underline underline-offset-4">{t('Sign out')}</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 md:p-10">
        {!profile ? (
          <div className="border border-mark rounded-md p-5">
            <h2 className="font-semibold text-mark">{t('No profile found for this account')}</h2>
            <p className="text-sm mt-1 text-muted">
              Add a row for this user in the ss_profiles table (see docs/PROGRESS.md, "First admin"), then refresh.
            </p>
          </div>
        ) : (
          <>
            <h1 className="font-display text-3xl font-semibold">
              {profile.ss_schools?.name || t('Your school')}
            </h1>
            <p className="text-muted mt-1">{t('Your modules')}</p>

            <ul className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(MODULES[profile.role] || []).map((m) => (
                <li key={m}>
                  {LINKS[m] ? (
                    <Link to={LINKS[m]} className="block bg-white border border-line hover:border-board rounded-md p-5">
                      <h3 className="font-medium">{t(m)}</h3>
                      <p className="text-sm text-board mt-1">{t('Open')}</p>
                    </Link>
                  ) : (
                    <div className="bg-white border border-line rounded-md p-5">
                      <h3 className="font-medium">{t(m)}</h3>
                      <p className="text-sm text-muted mt-1">{t('Coming soon')}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </div>
  )
}
