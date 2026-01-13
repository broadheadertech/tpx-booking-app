import { useUser } from '@clerk/clerk-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Navigate, useLocation } from 'react-router-dom'
import LoadingScreen from './LoadingScreen'

const ClerkProtectedRoute = ({ 
  children, 
  requireStaff = false, 
  requireBarber = false, 
  requireSuperAdmin = false, 
  requirePageAccess = null 
}) => {
  const { user: clerkUser, isLoaded } = useUser()
  const location = useLocation()
  
  // Query user data from Convex using Clerk ID
  const convexUser = useQuery(
    api.services.clerkSync.getUserByClerkId,
    clerkUser?.id ? { clerkUserId: clerkUser.id } : "skip"
  )

  // Show loading while checking authentication
  if (!isLoaded) {
    return <LoadingScreen message="Verifying access..." />
  }

  // Redirect to login if not authenticated with Clerk
  if (!clerkUser) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />
  }

  // Wait for Convex user data to load
  if (!convexUser) {
    return <LoadingScreen message="Loading your profile..." />
  }

  // Check staff requirement
  if (requireStaff && !['staff', 'admin', 'super_admin', 'branch_admin'].includes(convexUser.role)) {
    return <Navigate to={getRoleBasedRedirect(convexUser.role)} replace />
  }

  // Check barber requirement
  if (requireBarber && convexUser.role !== 'barber') {
    return <Navigate to={getRoleBasedRedirect(convexUser.role)} replace />
  }

  // Check super admin requirement
  if (requireSuperAdmin && convexUser.role !== 'super_admin') {
    return <Navigate to={getRoleBasedRedirect(convexUser.role)} replace />
  }

  // Check specific page access for staff/admin
  if (requirePageAccess && convexUser.role !== 'super_admin' && convexUser.role !== 'admin') {
    // If user has page_access defined, check if required page is included
    if (convexUser.page_access && Array.isArray(convexUser.page_access) && !convexUser.page_access.includes(requirePageAccess)) {
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

export default ClerkProtectedRoute
