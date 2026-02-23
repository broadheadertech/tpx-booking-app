/**
 * AuthRedirect Component
 * Updated to support both legacy and Clerk authentication
 *
 * Redirects authenticated users (via either method) to their dashboard.
 * Used for pages like login, register, forgot-password.
 */

import { useAuth } from '../../context/AuthContext'
import { useUser, useClerk } from '@clerk/clerk-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Navigate } from 'react-router-dom'
import { getRoleRedirectPath } from '../../utils/roleRedirect'

const AuthRedirect = ({ children }) => {
  // Legacy auth
  const { isAuthenticated: legacyAuthenticated, user: legacyUser } = useAuth()

  // Clerk auth
  const { user: clerkUser, isLoaded: clerkLoaded, isSignedIn: clerkSignedIn } = useUser()
  const clerk = useClerk()

  // Query Convex for Clerk user (only if fully signed in via Clerk)
  const clerkConvexUser = useQuery(
    api.services.auth.getUserByClerkId,
    clerkLoaded && clerkSignedIn && clerkUser?.id
      ? { clerk_user_id: clerkUser.id }
      : "skip"
  )

  // Don't redirect while Clerk is mid-flow (factor-one/factor-two/sso-callback).
  // The Clerk SignIn component handles its own sub-step routing internally.
  const clerkSession = clerk?.client?.signIn
  const isClerkMidFlow = clerkSession?.status && clerkSession.status !== 'complete'
  if (isClerkMidFlow) return children

  // clerkConvexUser is undefined while loading, null if not found, or the user object.
  // Only redirect when we have an actual user object (not undefined/null).
  const hasClerkUser = clerkSignedIn && clerkConvexUser && clerkConvexUser._id
  const isAuthenticated = legacyAuthenticated || hasClerkUser
  const user = hasClerkUser ? clerkConvexUser : legacyUser

  if (isAuthenticated && user) {
    const redirectPath = getRoleRedirectPath(user.role)
    return <Navigate to={redirectPath} replace />
  }

  return children
}

export default AuthRedirect
