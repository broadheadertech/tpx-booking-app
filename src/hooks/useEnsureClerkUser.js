/**
 * useEnsureClerkUser Hook
 *
 * Ensures that a Clerk-authenticated user has a corresponding Convex user.
 * This is a fallback mechanism for when the Clerk webhook hasn't processed yet,
 * ensuring robust registration sync between Clerk and Convex.
 *
 * Usage:
 *   const { user, isLoading, isEnsuring } = useEnsureClerkUser()
 */

import { useState, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { useUser } from '@clerk/clerk-react'
import { api } from '../../convex/_generated/api'
import { useAuth } from '../context/AuthContext'

export function useEnsureClerkUser() {
  const { user: authUser, loading: authLoading } = useAuth()
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser()
  const [isEnsuring, setIsEnsuring] = useState(false)
  const [ensuredUser, setEnsuredUser] = useState(null)

  // Query for existing Convex user by Clerk ID
  const clerkConvexUser = useQuery(
    api.services.auth.getUserByClerkId,
    clerkUser?.id ? { clerk_user_id: clerkUser.id } : 'skip'
  )

  // Mutation to create user if not exists
  const ensureUserFromClerk = useMutation(api.services.auth.ensureUserFromClerk)

  // Effect to ensure user exists in Convex
  useEffect(() => {
    const ensureUser = async () => {
      // Only run if:
      // 1. Clerk is loaded and user exists
      // 2. Query for Convex user has completed (not undefined)
      // 3. Convex user doesn't exist (null)
      // 4. We're not already ensuring
      // 5. We haven't already ensured a user this session
      if (
        clerkLoaded &&
        clerkUser?.id &&
        clerkConvexUser === null &&
        !isEnsuring &&
        !ensuredUser
      ) {
        console.log('[useEnsureClerkUser] Clerk user exists but Convex user not found, creating...')
        setIsEnsuring(true)
        try {
          const result = await ensureUserFromClerk({
            clerk_user_id: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress || `${clerkUser.id}@clerk.local`,
            first_name: clerkUser.firstName || undefined,
            last_name: clerkUser.lastName || undefined,
            image_url: clerkUser.imageUrl || undefined,
          })
          console.log('[useEnsureClerkUser] User ensured in Convex:', result)
          setEnsuredUser(result)
        } catch (error) {
          console.error('[useEnsureClerkUser] Failed to ensure user:', error)
        } finally {
          setIsEnsuring(false)
        }
      }
    }

    ensureUser()
  }, [clerkLoaded, clerkUser, clerkConvexUser, isEnsuring, ensuredUser, ensureUserFromClerk])

  // Determine the final user (priority: ensured > query result > authContext)
  const user = ensuredUser || clerkConvexUser || authUser

  // Determine loading state
  const isLoading = (
    authLoading ||
    !clerkLoaded ||
    (clerkUser?.id && clerkConvexUser === undefined) ||
    isEnsuring
  )

  return {
    user,
    isLoading,
    isEnsuring,
    isClerkAuth: !!clerkUser,
    clerkUser,
    authUser,
  }
}

export default useEnsureClerkUser
