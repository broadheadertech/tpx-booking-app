/**
 * Role Redirect Utility
 * Story 10.4: Complete Login Experience
 *
 * Maps user roles to their appropriate dashboard paths.
 */

/**
 * Get the redirect path for a given user role
 * @param {string} role - User role from Convex database
 * @returns {string} - Dashboard path for the role
 */
export function getRoleRedirectPath(role) {
  switch (role) {
    case "it_admin":
      return "/it-admin/dashboard";
    case "super_admin":
      return "/admin/dashboard";
    case "admin_staff":
    case "branch_admin":
    case "admin":
    case "staff":
      return "/staff/dashboard";
    case "barber":
      return "/barber/home";
    case "customer":
    default:
      return "/customer/dashboard";
  }
}

/**
 * Check if a role is a staff-level role (has access to staff dashboard)
 * @param {string} role - User role
 * @returns {boolean}
 */
export function isStaffRole(role) {
  return ["it_admin", "super_admin", "admin_staff", "branch_admin", "admin", "staff"].includes(role);
}

/**
 * Check if a role is an admin role (has elevated permissions)
 * @param {string} role - User role
 * @returns {boolean}
 */
export function isAdminRole(role) {
  return ["it_admin", "super_admin", "admin_staff", "branch_admin", "admin"].includes(role);
}
