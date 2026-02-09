/**
 * RequireClerkAuth Component
 * Story 10.4: Complete Login Experience
 *
 * Wrapper component that protects routes requiring Clerk authentication.
 * Redirects to login if not authenticated.
 */

import { useUser } from "@clerk/clerk-react";
import { Navigate, useLocation } from "react-router-dom";

/**
 * RequireClerkAuth - Protects routes requiring Clerk authentication
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to render if authenticated
 * @param {string} props.redirectTo - Path to redirect to if not authenticated (default: /auth/clerk-login)
 */
function RequireClerkAuth({ children, redirectTo = "/auth/clerk-login" }) {
  const { isLoaded, isSignedIn } = useUser();
  const location = useLocation();

  // Show loading skeleton while Clerk is loading
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-full max-w-sm px-6">
          {/* Skeleton loader */}
          <div className="animate-pulse">
            {/* Logo skeleton */}
            <div className="flex justify-center mb-8">
              <div className="w-40 h-24 bg-[#2A2A2A] rounded-lg"></div>
            </div>

            {/* Content skeleton */}
            <div className="bg-[#1A1A1A] rounded-3xl p-8 space-y-4">
              <div className="h-6 bg-[#2A2A2A] rounded w-3/4 mx-auto"></div>
              <div className="h-4 bg-[#2A2A2A] rounded w-1/2 mx-auto"></div>
              <div className="h-12 bg-[#2A2A2A] rounded-2xl mt-6"></div>
              <div className="h-12 bg-[#2A2A2A] rounded-2xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Redirect to login if not signed in
  if (!isSignedIn) {
    // Save the current location to redirect back after login
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // User is authenticated - render children
  return children;
}

export default RequireClerkAuth;
