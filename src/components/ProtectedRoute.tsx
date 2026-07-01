import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/useAuth'

function ProtectedRoute() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <main className="page">
        <div className="container">
          <p>読み込み中...</p>
        </div>
      </main>
    )
  }

  if (!session) {
    return <Navigate to="/admin/login" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
