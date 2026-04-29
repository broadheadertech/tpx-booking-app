/**
 * useCurrentUser Hook
 * Story 10.4 & 10.6: Complete Login Experience & Session Management
 *
 * Unified hook that returns the current user from either:
 * - Clerk authentication (preferred)
 * - Legacy AuthContext (fallback)
 *
 * This enables dual-auth support during the migration period.
 */

import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUser, useClerk } from '@clerk/clerk-react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

/**
 * Get the current authenticated user from either Clerk or legacy auth
 * @returns {Object} - { user, loading, isAuthenticated, authMethod, logout }
 */
export function useCurrentUser() {
  // Legacy auth
  const { user: legacyUser, loading: legacyLoading, isAuthenticated: legacyAuthenticated, logout: legacyLogout, sessionToken: legacySessionToken } = useAuth();

  // Clerk auth
  const { user: clerkUser, isLoaded: clerkLoaded, isSignedIn: clerkSignedIn } = useUser();
  const clerk = useClerk();

  // Query Convex for Clerk user (only if signed in via Clerk)
  const clerkConvexUser = useQuery(
    api.services.auth.getUserByClerkId,
    clerkLoaded && clerkSignedIn && clerkUser?.id
      ? { clerk_user_id: clerkUser.id }
      : "skip"
  );

  // Determine loading state
  const isClerkLoading = !clerkLoaded || (clerkSignedIn && clerkConvexUser === undefined);
  const loading = legacyLoading || isClerkLoading;

  // Determine authentication status and method
  const isClerkAuthenticated = clerkSignedIn && clerkConvexUser !== null;
  const isAuthenticated = legacyAuthenticated || isClerkAuthenticated;

  // Get the active user (prefer Clerk if signed in via Clerk)
  const user = isClerkAuthenticated ? clerkConvexUser : legacyUser;

  // Determine which auth method is active
  const authMethod = isClerkAuthenticated ? 'clerk' : (legacyAuthenticated ? 'legacy' : null);

  // Unified logout function that handles both Clerk and legacy auth
  const logout = useCallback(async () => {
    try {
      if (isClerkAuthenticated) {
        // Sign out from Clerk
        await clerk.signOut();
      }
      // Also call legacy logout to clear any local state.
      // legacyLogout already does a hard window.location.replace to /auth/login,
      // so we only need to invoke it for the legacy-only path.
      if (legacyLogout && !isClerkAuthenticated) {
        await legacyLogout();
        return;
      }
    } catch (e) {
      console.error('Logout error:', e);
    }
    // For Clerk sign-outs (and as a safety net) hard-replace history so
    // the browser Back button can't return to a protected page from bfcache.
    try {
      window.history.replaceState(null, '', '/auth/login');
      window.location.replace('/auth/login');
    } catch (_) {
      window.location.href = '/auth/login';
    }
  }, [isClerkAuthenticated, clerk, legacyLogout]);

  return {
    user,
    loading,
    isAuthenticated,
    authMethod,
    logout,
    // Session token from legacy auth (used for API calls)
    // Convert null to undefined for Convex v.optional(v.string()) compatibility
    sessionToken: legacySessionToken ?? undefined,
    // Clerk-specific data if needed
    clerkUser: clerkSignedIn ? clerkUser : null,
    // Expose signOut separately if needed for Clerk-only logout
    clerkSignOut: clerk.signOut,
  };
}

export default useCurrentUser;
