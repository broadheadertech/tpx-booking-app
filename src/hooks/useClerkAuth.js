/**
 * useClerkAuth Hook
 * Story 10.4: Complete Login Experience
 *
 * Combines Clerk authentication state with Convex user data.
 * Handles the synchronization between Clerk user and Convex user record.
 */

import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

/**
 * Hook to get the current authenticated user from Clerk and their Convex user record
 * @returns {Object} Authentication state and user data
 */
export function useClerkAuth() {
  // Get Clerk user state
  const { user: clerkUser, isLoaded: clerkLoaded, isSignedIn } = useUser();

  // Query Convex for the user record by clerk_user_id
  // This will be null/undefined while loading or if user doesn't exist
  const convexUser = useQuery(
    api.services.auth.getUserByClerkId,
    clerkLoaded && isSignedIn && clerkUser?.id
      ? { clerk_user_id: clerkUser.id }
      : "skip"
  );

  // Determine loading state
  const isLoading = !clerkLoaded || (isSignedIn && convexUser === undefined);

  // Determine if user exists in Convex
  const hasConvexUser = convexUser !== null && convexUser !== undefined;

  return {
    // Clerk state
    clerkUser,
    clerkLoaded,
    isSignedIn,

    // Convex state
    convexUser,
    hasConvexUser,

    // Combined state
    isLoading,
    isAuthenticated: isSignedIn && hasConvexUser,

    // User data (from Convex)
    role: convexUser?.role || null,
    branchId: convexUser?.branch_id || null,
    userId: convexUser?._id || null,
  };
}

/**
 * Hook to wait for user creation after Clerk sign-in
 * Useful in callback pages where webhook may not have completed
 * @param {string} clerkUserId - The Clerk user ID to wait for
 * @param {number} maxWaitMs - Maximum time to wait (default 5000ms)
 * @returns {Object} User data and waiting state
 */
export function useWaitForConvexUser(clerkUserId, maxWaitMs = 5000) {
  // This is handled by the callback page with polling
  // The hook here is for consistent API usage
  const convexUser = useQuery(
    api.services.auth.getUserByClerkId,
    clerkUserId ? { clerk_user_id: clerkUserId } : "skip"
  );

  return {
    user: convexUser,
    isLoading: convexUser === undefined,
    notFound: convexUser === null,
  };
}

export default useClerkAuth;
