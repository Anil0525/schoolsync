import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'

export default function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <p className="p-8 text-muted">Loading…</p>
  if (!session) return <Navigate to="/login" replace />
  return children
}
