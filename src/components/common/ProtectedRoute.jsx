import { useAuth } from '../../context/AuthContext'
import { Navigate, useLocation } from 'react-router-dom'

const ProtectedRoute = ({ children, requireStaff = false, requireBarber = false, requireSuperAdmin = false }) => {
  const { isAuthenticated, user, loading } = useAuth()
  const location = useLocation()

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

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />
  }

  // Check staff requirement
  if (requireStaff && user?.role !== 'staff' && user?.role !== 'admin' && user?.role !== 'super_admin' && user?.role !== 'branch_admin') {
    return <Navigate to={getRoleBasedRedirect(user?.role)} replace />
  }

  // Check barber requirement
  if (requireBarber && user?.role !== 'barber') {
    return <Navigate to={getRoleBasedRedirect(user?.role)} replace />
  }

  // Check super admin requirement
  if (requireSuperAdmin && user?.role !== 'super_admin') {
    return <Navigate to={getRoleBasedRedirect(user?.role)} replace />
  }

  return children
}

// Helper function to get role-based redirect
const getRoleBasedRedirect = (role) => {
  switch (role) {
    case 'super_admin':
      return '/admin/dashboard'
    case 'staff':
    case 'admin':
    case 'branch_admin':
      return '/staff/dashboard'
    case 'barber':
      return '/barber/dashboard'
    case 'customer':
    default:
      return '/customer/dashboard'
  }
}

export default ProtectedRoute