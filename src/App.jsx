import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Classes from './pages/Classes.jsx'
import Students from './pages/Students.jsx'
import Attendance from './pages/Attendance.jsx'
import MyAttendance from './pages/MyAttendance.jsx'
import Exams from './pages/Exams.jsx'
import MarksEntry from './pages/MarksEntry.jsx'
import ReportCards from './pages/ReportCards.jsx'
import MyMarks from './pages/MyMarks.jsx'
import Fees from './pages/Fees.jsx'
import MyFees from './pages/MyFees.jsx'
import Udise from './pages/Udise.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

export default function App() {
  return (
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
