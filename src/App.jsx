import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

// pages load on demand, so the first screen stays small
const Classes = lazy(() => import('./pages/Classes.jsx'))
const Students = lazy(() => import('./pages/Students.jsx'))
const Attendance = lazy(() => import('./pages/Attendance.jsx'))
const MyAttendance = lazy(() => import('./pages/MyAttendance.jsx'))
const Exams = lazy(() => import('./pages/Exams.jsx'))
const MarksEntry = lazy(() => import('./pages/MarksEntry.jsx'))
const ReportCards = lazy(() => import('./pages/ReportCards.jsx'))
const MyMarks = lazy(() => import('./pages/MyMarks.jsx'))
const Fees = lazy(() => import('./pages/Fees.jsx'))
const MyFees = lazy(() => import('./pages/MyFees.jsx'))
const Udise = lazy(() => import('./pages/Udise.jsx'))
const Teachers = lazy(() => import('./pages/Teachers.jsx'))
const Users = lazy(() => import('./pages/Users.jsx'))
const Announcements = lazy(() => import('./pages/Announcements.jsx'))
const Homework = lazy(() => import('./pages/Homework.jsx'))
const MyClasses = lazy(() => import('./pages/MyClasses.jsx'))
const Overview = lazy(() => import('./pages/Overview.jsx'))
const Calendar = lazy(() => import('./pages/Calendar.jsx'))
const Routine = lazy(() => import('./pages/Routine.jsx'))
const Syllabus = lazy(() => import('./pages/Syllabus.jsx'))
const Birthdays = lazy(() => import('./pages/Birthdays.jsx'))
const HallTickets = lazy(() => import('./pages/HallTickets.jsx'))
const Certificates = lazy(() => import('./pages/Certificates.jsx'))
const Documents = lazy(() => import('./pages/Documents.jsx'))
const LateFees = lazy(() => import('./pages/LateFees.jsx'))
const Expenses = lazy(() => import('./pages/Expenses.jsx'))
const Payroll = lazy(() => import('./pages/Payroll.jsx'))
const MySalary = lazy(() => import('./pages/MySalary.jsx'))

export default function App() {
  return (
    <Suspense fallback={<p className="p-10 text-muted">…</p>}>
      <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/classes" element={<ProtectedRoute><Classes /></ProtectedRoute>} />
      <Route path="/students" element={<ProtectedRoute><Students /></ProtectedRoute>} />
      <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
      <Route path="/my-attendance" element={<ProtectedRoute><MyAttendance /></ProtectedRoute>} />
      <Route path="/exams" element={<ProtectedRoute><Exams /></ProtectedRoute>} />
      <Route path="/marks" element={<ProtectedRoute><MarksEntry /></ProtectedRoute>} />
      <Route path="/report-cards" element={<ProtectedRoute><ReportCards /></ProtectedRoute>} />
      <Route path="/my-marks" element={<ProtectedRoute><MyMarks /></ProtectedRoute>} />
      <Route path="/fees" element={<ProtectedRoute><Fees /></ProtectedRoute>} />
      <Route path="/my-fees" element={<ProtectedRoute><MyFees /></ProtectedRoute>} />
      <Route path="/udise" element={<ProtectedRoute><Udise /></ProtectedRoute>} />
      <Route path="/teachers" element={<ProtectedRoute><Teachers /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
      <Route path="/announcements" element={<ProtectedRoute><Announcements /></ProtectedRoute>} />
      <Route path="/homework" element={<ProtectedRoute><Homework /></ProtectedRoute>} />
      <Route path="/overview" element={<ProtectedRoute><Overview /></ProtectedRoute>} />
      <Route path="/my-classes" element={<ProtectedRoute><MyClasses /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
      <Route path="/routine" element={<ProtectedRoute><Routine /></ProtectedRoute>} />
      <Route path="/syllabus" element={<ProtectedRoute><Syllabus /></ProtectedRoute>} />
      <Route path="/birthdays" element={<ProtectedRoute><Birthdays /></ProtectedRoute>} />
      <Route path="/hall-tickets" element={<ProtectedRoute><HallTickets /></ProtectedRoute>} />
      <Route path="/certificates" element={<ProtectedRoute><Certificates /></ProtectedRoute>} />
      <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
      <Route path="/late-fees" element={<ProtectedRoute><LateFees /></ProtectedRoute>} />
      <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
      <Route path="/payroll" element={<ProtectedRoute><Payroll /></ProtectedRoute>} />
      <Route path="/my-salary" element={<ProtectedRoute><MySalary /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
