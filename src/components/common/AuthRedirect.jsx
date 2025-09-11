import { useAuth } from '../../context/AuthContext'
import { Navigate } from 'react-router-dom'

const AuthRedirect = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth()

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F5F5F5] to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect authenticated users to their dashboard based on role
  if (isAuthenticated && user) {
    switch (user.role) {
      case 'super_admin':
        return <Navigate to="/admin/dashboard" replace />
      case 'staff':
      case 'admin':
      case 'branch_admin':
        return <Navigate to="/staff/dashboard" replace />
      case 'barber':
        return <Navigate to="/barber/dashboard" replace />
      case 'customer':
      default:
        return <Navigate to="/customer/dashboard" replace />
    }
  }

  // Show login/register page for unauthenticated users
  return children
}

export default AuthRedirect