import { useState, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useUser } from '@clerk/clerk-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Navigate, useLocation } from 'react-router-dom'
import LoadingScreen from './LoadingScreen'
import useIdleTimer from '../../hooks/useIdleTimer'
import IdleTimeoutDialog from './IdleTimeoutDialog'
import { AlertTriangle, X } from 'lucide-react'

const IDLE_TIMEOUT = 30 * 60 * 1000 // 30 minutes
const WARNING_TIME = 60 * 1000 // 60 seconds warning before logout

const ProtectedRoute = ({ children, requireStaff = false, requireBarber = false, requireSuperAdmin = false, requireItAdmin = false, requirePageAccess = null }) => {
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
  const [dismissedGraceBanner, setDismissedGraceBanner] = useState(false)

  // Subscription access check for branch-level users
  const isBranchLevelRole = user?.role && !['super_admin', 'it_admin', 'customer'].includes(user.role)
  const subscriptionAccess = useQuery(
    api.services.subscriptions.checkBranchAccess,
    isBranchLevelRole && user?.branch_id ? { branch_id: user.branch_id } : 'skip'
  )

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

  // Check if user is banned
  if (user?.is_banned) {
    return <Navigate to="/account-banned" replace />
  }

  // Check subscription access for branch-level users
  if (isBranchLevelRole && subscriptionAccess && !subscriptionAccess.allowed) {
    return (
      <Navigate
        to="/subscription-blocked"
        state={{
          reason: subscriptionAccess.reason,
          overdueMonths: subscriptionAccess.overdueMonths,
          message: subscriptionAccess.message,
        }}
        replace
      />
    )
  }

  // Check IT admin requirement
  if (requireItAdmin && user?.role !== 'it_admin') {
    return <Navigate to={getRoleBasedRedirect(user?.role)} replace />
  }

  // Check staff requirement
  if (requireStaff && user?.role !== 'staff' && user?.role !== 'admin' && user?.role !== 'super_admin' && user?.role !== 'branch_admin' && user?.role !== 'it_admin') {
    return <Navigate to={getRoleBasedRedirect(user?.role)} replace />
  }

  // Check barber requirement
  if (requireBarber && user?.role !== 'barber') {
    return <Navigate to={getRoleBasedRedirect(user?.role)} replace />
  }

  // Check super admin requirement (also allow it_admin)
  if (requireSuperAdmin && user?.role !== 'super_admin' && user?.role !== 'it_admin') {
    return <Navigate to={getRoleBasedRedirect(user?.role)} replace />
  }

  // Check specific page access for staff/admin
  if (requirePageAccess && user?.role !== 'super_admin' && user?.role !== 'admin' && user?.role !== 'it_admin') {
    // Check page_access_v2 first (new RBAC system)
    if (user?.page_access_v2 && Object.keys(user.page_access_v2).length > 0) {
      if (!user.page_access_v2[requirePageAccess]?.view) {
        return <Navigate to="/staff/dashboard" replace />
      }
    }
    // Fallback to legacy page_access
    else if (user?.page_access && Array.isArray(user.page_access) && !user.page_access.includes(requirePageAccess)) {
      return <Navigate to="/staff/dashboard" replace />
    }
  }

  return (
    <>
      {/* Grace period warning banner for branch users with overdue subscription */}
      {isBranchLevelRole && subscriptionAccess?.graceperiod && !dismissedGraceBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500/95 backdrop-blur-sm px-4 py-3 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-900 flex-shrink-0" />
              <p className="text-sm font-medium text-amber-900">
                {subscriptionAccess.message || `Subscription payment overdue. ${subscriptionAccess.daysRemaining} day${subscriptionAccess.daysRemaining !== 1 ? 's' : ''} remaining before access is restricted.`}
                <span className="font-normal ml-1">Please contact your administrator.</span>
              </p>
            </div>
            <button
              onClick={() => setDismissedGraceBanner(true)}
              className="p-1 rounded-lg hover:bg-amber-600/30 text-amber-900 transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
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
    case 'it_admin':
      return '/it-admin/dashboard'
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