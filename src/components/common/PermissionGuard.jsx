/**
 * PermissionGuard Component
 * Story 11-3: Permission-Aware UI Components
 *
 * Conditional rendering component that shows/hides content based on permissions.
 * Unlike RequirePermission, this does NOT show AccessDenied - just returns null.
 * Use this for conditionally showing buttons, menu items, etc.
 */

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCurrentUser } from "../../hooks/useCurrentUser";

/**
 * Pages that are always accessible regardless of permissions
 */
const ALWAYS_ACCESSIBLE_PAGES = ["overview", "custom_bookings", "walkins"];

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
 * PermissionGuard - Conditionally renders content based on permissions
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Content to render if authorized
 * @param {string} props.page - Page ID to check (e.g., "bookings")
 * @param {string} props.action - Action to check (view, create, edit, delete, approve)
 * @param {string} props.role - Alternative: minimum role level required
 * @param {React.ReactNode} props.fallback - Optional fallback (default: null)
 */
function PermissionGuard({ children, page, action = "view", role, fallback = null }) {
  const { user, loading: userLoading } = useCurrentUser();

  // Query permission check (only if page is specified)
  const canPerform = useQuery(
    api.services.rbac.canPerformAction,
    user && page ? { page, action } : "skip"
  );

  // While loading, don't render anything
  if (userLoading) {
    return fallback;
  }

  // Not authenticated
  if (!user) {
    return fallback;
  }

  // Super admin bypasses all checks
  if (user.role === "super_admin") {
    return children;
  }

  // If role is specified, check role level
  if (role) {
    const userLevel = ROLE_HIERARCHY[user.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[role] || 0;
    if (userLevel < requiredLevel) {
      return fallback;
    }
    // If only role check is needed (no page specified)
    if (!page) {
      return children;
    }
  }

  // If page is specified, check page permission
  if (page) {
    // Always accessible pages bypass view check
    if (action === "view" && ALWAYS_ACCESSIBLE_PAGES.includes(page)) {
      return children;
    }

    // Still loading permission
    if (canPerform === undefined) {
      return fallback;
    }

    // Permission denied
    if (!canPerform) {
      return fallback;
    }
  }

  // User has permission
  return children;
}

export default PermissionGuard;
