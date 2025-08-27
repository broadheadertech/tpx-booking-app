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

  // Redirect authenticated users to their dashboard
  if (isAuthenticated && user) {
    if (user.is_staff) {
      return <Navigate to="/staff/dashboard" replace />
    } else {
      return <Navigate to="/customer/dashboard" replace />
    }
  }

  // Show login/register page for unauthenticated users
  return children
}

export default AuthRedirect