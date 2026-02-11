/**
 * AuthRedirect Component
 * Updated to support both legacy and Clerk authentication
 *
 * Redirects authenticated users (via either method) to their dashboard.
 * Used for pages like login, register, forgot-password.
 */

import { useAuth } from '../../context/AuthContext'
import { useUser } from '@clerk/clerk-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Navigate } from 'react-router-dom'
import { getRoleRedirectPath } from '../../utils/roleRedirect'

const AuthRedirect = ({ children }) => {
  // Legacy auth
  const { isAuthenticated: legacyAuthenticated, user: legacyUser, loading: legacyLoading } = useAuth()

  // Clerk auth
  const { user: clerkUser, isLoaded: clerkLoaded, isSignedIn: clerkSignedIn } = useUser()

  // Query Convex for Clerk user (only if signed in via Clerk)
  const clerkConvexUser = useQuery(
    api.services.auth.getUserByClerkId,
    clerkLoaded && clerkSignedIn && clerkUser?.id
      ? { clerk_user_id: clerkUser.id }
      : "skip"
  )

  // Check if authenticated via either method
  const isAuthenticated = legacyAuthenticated || (clerkSignedIn && clerkConvexUser !== null)

  // Get the active user (prefer Clerk user if signed in via Clerk)
  const user = (clerkSignedIn && clerkConvexUser) ? clerkConvexUser : legacyUser

  // For auth pages (login/register), don't block on loading — show the form immediately.
  // If the user turns out to be authenticated, redirect once loading completes.
  if (isAuthenticated && user) {
    const redirectPath = getRoleRedirectPath(user.role)
    return <Navigate to={redirectPath} replace />
  }

  // Show login/register page immediately (don't wait for Clerk to load)
  return children
}

export default AuthRedirect
