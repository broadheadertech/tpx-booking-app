/**
 * RequireRole Component
 * Story 11-3: Permission-Aware UI Components
 *
 * Wrapper component that checks if user has at least the required role level.
 * Shows AccessDenied if role is insufficient.
 */

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import AccessDenied from "./AccessDenied";
import LoadingScreen from "./LoadingScreen";

/**
 * Role hierarchy for comparison
 */
const ROLE_HIERARCHY = {
  super_admin: 6,
  admin_staff: 5,
  branch_admin: 4,
  staff: 3,
  barber: 2,
  customer: 1,
};

/**
 * Check if userRole has equal or higher level than requiredRole
 */
function hasRoleOrHigher(userRole, requiredRole) {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  return userLevel >= requiredLevel;
}

/**
 * RequireRole - Protects content requiring minimum role level
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Content to render if authorized
 * @param {string} props.role - Minimum required role (e.g., "branch_admin")
 * @param {React.ReactNode} props.fallback - Optional custom fallback component
 */
function RequireRole({ children, role, fallback = null }) {
  const { user, loading } = useCurrentUser();

  // Show loading while checking auth
  if (loading) {
    return <LoadingScreen message="Checking permissions..." />;
  }

  // Not authenticated
  if (!user) {
    return fallback || <AccessDenied message="You must be logged in to access this content." />;
  }

  // Check role level
  if (!hasRoleOrHigher(user.role, role)) {
    return (
      fallback || (
        <AccessDenied
          message={`This content requires ${role.replace("_", " ")} access or higher.`}
        />
      )
    );
  }

  // User has sufficient role
  return children;
}

export default RequireRole;
