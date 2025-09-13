import { useAuth } from '../../context/AuthContext'
import { Navigate } from 'react-router-dom'
import LoadingScreen from './LoadingScreen'

const AuthRedirect = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth()

  // Show loading while checking authentication
  if (loading) {
    return <LoadingScreen message="Authenticating..." />
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