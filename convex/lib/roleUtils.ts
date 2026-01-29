/**
 * Role Utilities for RBAC
 * Story 11-1: Role Hierarchy and Utility Functions
 *
 * Provides role hierarchy, comparison utilities, and permission helpers
 * for consistent permission checks throughout the application.
 */

import { Doc } from "../_generated/dataModel";

/**
 * User roles in the system
 */
export type UserRole =
  | "super_admin"
  | "admin_staff"
  | "branch_admin"
  | "staff"
  | "barber"
  | "customer";

/**
 * Role hierarchy levels (higher = more permissions)
 * Used for role comparison checks
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 6,
  admin_staff: 5,
  branch_admin: 4,
  staff: 3,
  barber: 2,
  customer: 1,
};

/**
 * Pages that are always accessible regardless of permissions
 * These bypass permission checks
 */
export const ALWAYS_ACCESSIBLE_PAGES = [
  "overview",
  "custom_bookings",
  "walkins",
] as const;

/**
 * All available pages in the system (30 total)
 */
export const ALL_PAGES = {
  // Staff Dashboard Pages (25)
  staffDashboard: [
    "overview",
    "reports",
    "bookings",
    "custom_bookings",
    "calendar",
    "walkins",
    "queue",
    "pos",
    "barbers",
    "users",
    "services",
    "customers",
    "products",
    "order_products",
    "vouchers",
    "payroll",
    "cash_advances",
    "royalty",
    "pl",
    "balance_sheet",
    "payments",
    "payment_history",
    "attendance",
    "events",
    "notifications",
    "email_marketing",
  ] as const,

  // Admin Dashboard Pages (5 additional)
  adminDashboard: [
    "branches",
    "catalog",
    "branding",
    "emails",
    "settings",
  ] as const,
} as const;

/**
 * All page IDs combined
 */
export const ALL_PAGE_IDS = [
  ...ALL_PAGES.staffDashboard,
  ...ALL_PAGES.adminDashboard,
] as const;

export type PageId = (typeof ALL_PAGE_IDS)[number];

/**
 * Available actions for each page
 */
export const ACTIONS = ["view", "create", "edit", "delete", "approve"] as const;
export type Action = (typeof ACTIONS)[number];

/**
 * Permission object for a single page
 */
export interface PagePermission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
}

/**
 * Full page_access_v2 type
 */
export type PageAccessV2 = Partial<Record<PageId, PagePermission>>;

/**
 * Check if a user has a role at or above the required level
 *
 * @param userRole - The user's current role
 * @param requiredRole - The minimum required role
 * @returns true if userRole has equal or higher hierarchy level
 *
 * @example
 * hasRoleOrHigher("admin_staff", "branch_admin") // true
 * hasRoleOrHigher("staff", "branch_admin") // false
 */
export function hasRoleOrHigher(
  userRole: UserRole,
  requiredRole: UserRole
): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Check if a role is branch-scoped (requires branch_id)
 *
 * Branch-scoped roles can only see data from their assigned branch.
 * super_admin and admin_staff can see all branches.
 *
 * @param role - The role to check
 * @returns true if the role is limited to a single branch
 *
 * @example
 * isBranchScoped("branch_admin") // true
 * isBranchScoped("super_admin") // false
 */
export function isBranchScoped(role: UserRole): boolean {
  return ["branch_admin", "staff", "barber"].includes(role);
}

/**
 * Check if a role can view all branches
 *
 * @param role - The role to check
 * @returns true if the role can view/switch between all branches
 */
export function canViewAllBranches(role: UserRole): boolean {
  return ["super_admin", "admin_staff"].includes(role);
}

/**
 * Check if a role is an admin role (has elevated permissions)
 *
 * @param role - The role to check
 * @returns true if the role has admin-level privileges
 */
export function isAdminRole(role: UserRole): boolean {
  return ["super_admin", "admin_staff", "branch_admin"].includes(role);
}

/**
 * Check if a role can create users with a specific target role
 *
 * Role creation permissions:
 * - super_admin: can create any role
 * - admin_staff: can create staff, barber, customer
 * - branch_admin: can create staff, barber (for their branch only)
 * - Others: cannot create users
 *
 * @param creatorRole - Role of the user creating the new user
 * @param targetRole - Role being assigned to the new user
 * @returns true if creation is allowed
 */
export function canCreateUserWithRole(
  creatorRole: UserRole,
  targetRole: UserRole
): boolean {
  const creatorLevel = ROLE_HIERARCHY[creatorRole];
  const targetLevel = ROLE_HIERARCHY[targetRole];

  // super_admin can create any role
  if (creatorRole === "super_admin") {
    return true;
  }

  // admin_staff can create roles below branch_admin
  if (creatorRole === "admin_staff") {
    return targetLevel < ROLE_HIERARCHY["branch_admin"];
  }

  // branch_admin can create staff and barber only
  if (creatorRole === "branch_admin") {
    return ["staff", "barber"].includes(targetRole);
  }

  // Others cannot create users
  return false;
}

/**
 * Check if a page is always accessible (bypasses permission checks)
 *
 * @param pageId - The page to check
 * @returns true if the page is always accessible
 */
export function isAlwaysAccessible(pageId: string): boolean {
  return ALWAYS_ACCESSIBLE_PAGES.includes(
    pageId as (typeof ALWAYS_ACCESSIBLE_PAGES)[number]
  );
}

/**
 * Get the default page permissions for a role
 *
 * @param role - The user role
 * @returns Default PageAccessV2 object based on role
 */
export function getDefaultPageAccess(role: UserRole): PageAccessV2 {
  const allTrue: PagePermission = {
    view: true,
    create: true,
    edit: true,
    delete: true,
    approve: true,
  };

  const viewOnly: PagePermission = {
    view: true,
    create: false,
    edit: false,
    delete: false,
    approve: false,
  };

  const allFalse: PagePermission = {
    view: false,
    create: false,
    edit: false,
    delete: false,
    approve: false,
  };

  switch (role) {
    case "super_admin":
    case "admin_staff":
      // Full access to all pages
      return ALL_PAGE_IDS.reduce((acc, page) => {
        acc[page] = { ...allTrue };
        return acc;
      }, {} as PageAccessV2);

    case "branch_admin":
      // Full access to staff dashboard pages, no admin pages
      return ALL_PAGES.staffDashboard.reduce((acc, page) => {
        acc[page] = { ...allTrue };
        return acc;
      }, {} as PageAccessV2);

    case "staff":
      // Empty - requires explicit configuration by admin
      return {};

    case "barber":
      // Minimal: overview only
      return {
        overview: { ...viewOnly },
      };

    case "customer":
      // Minimal: overview only
      return {
        overview: { ...viewOnly },
      };

    default:
      return {};
  }
}

/**
 * Check if a user has permission to perform an action on a page
 *
 * @param user - User document with role and page_access_v2
 * @param pageId - The page to check
 * @param action - The action to check (view, create, edit, delete, approve)
 * @returns true if the user has permission
 */
export function hasPagePermission(
  user: Doc<"users">,
  pageId: string,
  action: Action
): boolean {
  const role = user.role as UserRole;

  // Super admin bypasses all checks
  if (role === "super_admin") {
    return true;
  }

  // Always accessible pages bypass view check
  if (action === "view" && isAlwaysAccessible(pageId)) {
    return true;
  }

  // Check page_access_v2 first (new system)
  const pageAccessV2 = user.page_access_v2 as PageAccessV2 | undefined;
  if (pageAccessV2 && pageAccessV2[pageId as PageId]) {
    return pageAccessV2[pageId as PageId]![action] ?? false;
  }

  // Fallback to legacy page_access array (view only)
  if (action === "view" && user.page_access) {
    return user.page_access.includes(pageId);
  }

  // For branch_admin without page_access_v2, use defaults
  if (role === "branch_admin" && !pageAccessV2) {
    const defaults = getDefaultPageAccess(role);
    return defaults[pageId as PageId]?.[action] ?? false;
  }

  // Default: deny
  return false;
}

/**
 * Get list of pages a user can view
 *
 * @param user - User document with role and page_access_v2
 * @returns Array of page IDs the user can view
 */
export function getAccessiblePages(user: Doc<"users">): string[] {
  const role = user.role as UserRole;

  // Super admin can view all pages
  if (role === "super_admin" || role === "admin_staff") {
    return [...ALL_PAGE_IDS];
  }

  const accessiblePages: string[] = [];

  // Always add always-accessible pages
  accessiblePages.push(...ALWAYS_ACCESSIBLE_PAGES);

  // Check page_access_v2
  const pageAccessV2 = user.page_access_v2 as PageAccessV2 | undefined;
  if (pageAccessV2) {
    for (const pageId of ALL_PAGE_IDS) {
      if (
        pageAccessV2[pageId]?.view &&
        !accessiblePages.includes(pageId)
      ) {
        accessiblePages.push(pageId);
      }
    }
  }

  // Fallback to legacy page_access
  if (user.page_access) {
    for (const pageId of user.page_access) {
      if (!accessiblePages.includes(pageId)) {
        accessiblePages.push(pageId);
      }
    }
  }

  // For branch_admin without explicit permissions, use defaults
  if (role === "branch_admin" && !pageAccessV2 && !user.page_access) {
    return [...ALL_PAGES.staffDashboard];
  }

  return accessiblePages;
}

/**
 * Validate if a role string is a valid UserRole
 *
 * @param role - String to validate
 * @returns true if valid UserRole
 */
export function isValidRole(role: string): role is UserRole {
  return Object.keys(ROLE_HIERARCHY).includes(role);
}

/**
 * Get human-readable role name
 *
 * @param role - The role
 * @returns Human-readable string
 */
export function getRoleDisplayName(role: UserRole): string {
  const displayNames: Record<UserRole, string> = {
    super_admin: "Super Admin",
    admin_staff: "Admin Staff",
    branch_admin: "Branch Admin",
    staff: "Staff",
    barber: "Barber",
    customer: "Customer",
  };
  return displayNames[role] || role;
}

/**
 * Get roles that a user can assign based on their role
 *
 * @param userRole - The current user's role
 * @returns Array of roles that can be assigned
 */
export function getAssignableRoles(userRole: UserRole): UserRole[] {
  switch (userRole) {
    case "super_admin":
      return ["super_admin", "admin_staff", "branch_admin", "staff", "barber", "customer"];
    case "admin_staff":
      return ["staff", "barber", "customer"];
    case "branch_admin":
      return ["staff", "barber"];
    default:
      return [];
  }
}
