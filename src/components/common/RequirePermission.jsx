/**
 * RequirePermission Component
 * Story 11-3: Permission-Aware UI Components
 *
 * Wrapper component that checks if user has specific page/action permission.
 * Uses the RBAC service to verify permissions.
 */

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import AccessDenied from "./AccessDenied";
import LoadingScreen from "./LoadingScreen";

/**
 * Pages that are always accessible regardless of permissions
 */
const ALWAYS_ACCESSIBLE_PAGES = ["overview", "custom_bookings", "walkins"];

/**
 * RequirePermission - Protects content requiring specific page/action permission
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Content to render if authorized
 * @param {string} props.page - Page ID to check (e.g., "bookings")
 * @param {string} props.action - Action to check (view, create, edit, delete, approve)
 * @param {React.ReactNode} props.fallback - Optional custom fallback component
 */
function RequirePermission({ children, page, action = "view", fallback = null }) {
  const { user, loading: userLoading } = useCurrentUser();

  // Query permission check from RBAC service
  const canPerform = useQuery(
    api.services.rbac.canPerformAction,
    user ? { page, action } : "skip"
  );

  // Show loading while checking
  if (userLoading || canPerform === undefined) {
    return <LoadingScreen message="Checking permissions..." />;
  }

  // Not authenticated
  if (!user) {
    return fallback || <AccessDenied message="You must be logged in to access this content." />;
  }

  // Super admin bypasses all checks
  if (user.role === "super_admin") {
    return children;
  }

  // Always accessible pages bypass view check
  if (action === "view" && ALWAYS_ACCESSIBLE_PAGES.includes(page)) {
    return children;
  }

  // Check permission result
  if (!canPerform) {
    return (
      fallback || (
        <AccessDenied
          message={`You don't have permission to ${action} ${page.replace("_", " ")}.`}
        />
      )
    );
  }

  // User has permission
  return children;
}

export default RequirePermission;
