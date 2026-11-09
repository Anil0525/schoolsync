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
      <Route path="/my-classes" element={<ProtectedRoute><MyClasses /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
