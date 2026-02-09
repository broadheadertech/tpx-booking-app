import { useState, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useUser } from '@clerk/clerk-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Navigate, useLocation } from 'react-router-dom'
import LoadingScreen from './LoadingScreen'
import useIdleTimer from '../../hooks/useIdleTimer'
import IdleTimeoutDialog from './IdleTimeoutDialog'

const IDLE_TIMEOUT = 30 * 60 * 1000 // 30 minutes
const WARNING_TIME = 60 * 1000 // 60 seconds warning before logout

const ProtectedRoute = ({ children, requireStaff = false, requireBarber = false, requireSuperAdmin = false, requirePageAccess = null }) => {
  // Legacy auth context
  const { isAuthenticated: legacyAuthenticated, user: legacyUser, loading: legacyLoading, logout } = useAuth()

  // Clerk auth
  const { user: clerkUser, isLoaded: clerkLoaded, isSignedIn: clerkSignedIn } = useUser()

  // Query Convex for Clerk user (only if signed in via Clerk)
  const clerkConvexUser = useQuery(
    api.services.auth.getUserByClerkId,
    clerkLoaded && clerkSignedIn && clerkUser?.id
      ? { clerk_user_id: clerkUser.id }
      : "skip"
  )

  // Determine authentication status (either legacy OR Clerk)
  const isClerkLoading = !clerkLoaded || (clerkSignedIn && clerkConvexUser === undefined)
  const loading = legacyLoading || isClerkLoading

  // Check if authenticated via either method
  const isAuthenticated = legacyAuthenticated || (clerkSignedIn && clerkConvexUser !== null)

  // Get the active user (prefer Clerk user if signed in via Clerk)
  const user = (clerkSignedIn && clerkConvexUser) ? clerkConvexUser : legacyUser

  const location = useLocation()
  const [showWarning, setShowWarning] = useState(false)

  // Determine if idle timeout should be enabled (only for staff and barber)
  const shouldEnableIdleTimeout = requireStaff || requireBarber || requireSuperAdmin

  // Handle idle timeout
  const handleIdle = useCallback(async () => {
    setShowWarning(false)
    await logout()
  }, [logout])

  // Handle warning state
  const handleWarning = useCallback(() => {
    setShowWarning(true)
  }, [])

  // Handle when user becomes active during warning
  const handleActive = useCallback(() => {
    setShowWarning(false)
  }, [])

  const { isWarning, remainingTime, extendSession } = useIdleTimer({
    idleTime: IDLE_TIMEOUT,
    warningTime: WARNING_TIME,
    onIdle: handleIdle,
    onWarning: handleWarning,
    onActive: handleActive,
    enabled: shouldEnableIdleTimeout && isAuthenticated,
  })

  // Handle stay logged in button click
  const handleStayLoggedIn = useCallback(() => {
    setShowWarning(false)
    extendSession()
  }, [extendSession])

  // Handle manual logout from dialog
  const handleLogoutClick = useCallback(async () => {
    setShowWarning(false)
    await logout()
  }, [logout])

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

  return (
    <>
      {children}
      {/* Idle timeout warning dialog for staff/barber */}
      {shouldEnableIdleTimeout && (
        <IdleTimeoutDialog
          open={showWarning || isWarning}
          remainingTime={remainingTime}
          onStayLoggedIn={handleStayLoggedIn}
          onLogout={handleLogoutClick}
        />
      )}
    </>
  )
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