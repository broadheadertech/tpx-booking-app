import { useAuth } from '../../context/AuthContext'
import { Navigate, useLocation } from 'react-router-dom'
import LoadingScreen from './LoadingScreen'

const ProtectedRoute = ({ children, requireStaff = false, requireBarber = false, requireSuperAdmin = false, requirePageAccess = null }) => {
  const { isAuthenticated, user, loading } = useAuth()
  const location = useLocation()

  // Show loading while checking authentication
  if (loading) {
    return <LoadingScreen message="Verifying access..." />
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

  // Check specific page access for staff/admin
  if (requirePageAccess && user?.role !== 'super_admin' && user?.role !== 'admin') {
    // If user has page_access defined, check if required page is included
    if (user?.page_access && Array.isArray(user.page_access) && !user.page_access.includes(requirePageAccess)) {
      // Redirect to dashboard if access denied
      return <Navigate to="/staff/dashboard" replace />
    }
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
      return '/barber/home'
    case 'customer':
    default:
      return '/customer/dashboard'
  }
}

export default ProtectedRoute