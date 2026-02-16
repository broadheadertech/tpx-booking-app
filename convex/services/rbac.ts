/**
 * RBAC Service - Role-Based Access Control
 * Story 11-2: RBAC Service with Permission Checking
 *
 * Provides centralized permission validation for queries and mutations.
 * All permission checks should go through this service for consistency.
 */

import { v, ConvexError } from "convex/values";
import { query, mutation } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import { QueryCtx, MutationCtx } from "../_generated/server";
import { getCurrentUser } from "../lib/clerkAuth";
import {
  UserRole,
  Action,
  PageId,
  hasRoleOrHigher,
  isBranchScoped,
  hasPagePermission,
  getAccessiblePages,
  isAlwaysAccessible,
  canCreateUserWithRole,
  getAssignableRoles,
  ROLE_HIERARCHY,
} from "../lib/roleUtils";

/**
 * Permission error codes
 */
export const PERMISSION_ERRORS = {
  PERMISSION_DENIED: "PERMISSION_DENIED",
  PERMISSION_ROLE_INSUFFICIENT: "PERMISSION_ROLE_INSUFFICIENT",
  PERMISSION_BRANCH_MISMATCH: "PERMISSION_BRANCH_MISMATCH",
  UNAUTHENTICATED: "UNAUTHENTICATED",
} as const;

/**
 * Check if the current user has permission to perform an action on a page
 * For use in mutations and queries
 *
 * @param ctx - Convex context
 * @param page - Page ID to check
 * @param action - Action to check (view, create, edit, delete, approve)
 * @returns true if permitted, throws ConvexError if not
 */
export async function checkPermission(
  ctx: QueryCtx | MutationCtx,
  page: string,
  action: Action
): Promise<boolean> {
  const user = await getCurrentUser(ctx);

  if (!user) {
    throw new ConvexError({
      code: PERMISSION_ERRORS.UNAUTHENTICATED,
      message: "You must be logged in to perform this action",
    });
  }

  const role = user.role as UserRole;

  // IT admin and super admin bypass all checks
  if (role === "it_admin" || role === "super_admin") {
    return true;
  }

  // Check permission using roleUtils
  const hasPermission = hasPagePermission(user, page, action);

  if (!hasPermission) {
    throw new ConvexError({
      code: PERMISSION_ERRORS.PERMISSION_DENIED,
      message: `You don't have permission to ${action} ${page}`,
    });
  }

  return true;
}

/**
 * Check if the current user has at least the required role level
 *
 * @param ctx - Convex context
 * @param requiredRole - Minimum required role
 * @returns true if user has sufficient role
 */
export async function checkRole(
  ctx: QueryCtx | MutationCtx,
  requiredRole: UserRole
): Promise<boolean> {
  const user = await getCurrentUser(ctx);

  if (!user) {
    throw new ConvexError({
      code: PERMISSION_ERRORS.UNAUTHENTICATED,
      message: "You must be logged in to perform this action",
    });
  }

  const userRole = user.role as UserRole;

  if (!hasRoleOrHigher(userRole, requiredRole)) {
    throw new ConvexError({
      code: PERMISSION_ERRORS.PERMISSION_ROLE_INSUFFICIENT,
      message: `This action requires ${requiredRole} role or higher`,
    });
  }

  return true;
}

/**
 * Check if the current user can access a specific branch's data
 *
 * @param ctx - Convex context
 * @param branchId - Branch to check access for
 * @param selectedBranchContext - Optional selected branch (for admin_staff switching)
 * @returns true if user can access the branch
 */
export async function checkBranchAccess(
  ctx: QueryCtx | MutationCtx,
  branchId: Id<"branches">,
  selectedBranchContext?: Id<"branches">
): Promise<boolean> {
  const user = await getCurrentUser(ctx);

  if (!user) {
    throw new ConvexError({
      code: PERMISSION_ERRORS.UNAUTHENTICATED,
      message: "You must be logged in to perform this action",
    });
  }

  const role = user.role as UserRole;

  // IT admin and super admin can access any branch
  if (role === "it_admin" || role === "super_admin") {
    return true;
  }

  // Admin staff can access any branch (with context switching)
  if (role === "admin_staff") {
    return true;
  }

  // Branch-scoped users must match their assigned branch
  if (isBranchScoped(role)) {
    if (user.branch_id !== branchId) {
      throw new ConvexError({
        code: PERMISSION_ERRORS.PERMISSION_BRANCH_MISMATCH,
        message: "You can only access data from your assigned branch",
      });
    }
  }

  return true;
}

/**
 * Get the branch filter for queries based on user's permissions
 *
 * @param ctx - Convex context
 * @param selectedBranchContext - Optional selected branch for admin_staff
 * @returns Branch ID to filter by, or null for all branches
 */
export async function getBranchFilter(
  ctx: QueryCtx | MutationCtx,
  selectedBranchContext?: Id<"branches">
): Promise<Id<"branches"> | null> {
  const user = await getCurrentUser(ctx);

  if (!user) {
    return null;
  }

  const role = user.role as UserRole;

  // IT admin and super admin see all branches (unless filtering specifically)
  if (role === "it_admin" || role === "super_admin") {
    return selectedBranchContext || null;
  }

  // Admin staff can switch between branches
  if (role === "admin_staff") {
    return selectedBranchContext || null;
  }

  // Branch-scoped users see only their branch
  if (isBranchScoped(role) && user.branch_id) {
    return user.branch_id;
  }

  return null;
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get the current user's permissions
 * Returns role and page_access_v2 for client-side permission checks
 */
export const getUserPermissions = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      return null;
    }

    return {
      role: user.role as UserRole,
      page_access: user.page_access,
      page_access_v2: user.page_access_v2,
      branch_id: user.branch_id,
      is_branch_scoped: isBranchScoped(user.role as UserRole),
    };
  },
});

/**
 * Get list of pages the current user can access (view permission)
 */
export const getAccessiblePagesQuery = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      return [];
    }

    return getAccessiblePages(user);
  },
});

/**
 * Check if current user can perform a specific action on a page
 */
export const canPerformAction = query({
  args: {
    page: v.string(),
    action: v.union(
      v.literal("view"),
      v.literal("create"),
      v.literal("edit"),
      v.literal("delete"),
      v.literal("approve")
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      return false;
    }

    return hasPagePermission(user, args.page, args.action);
  },
});

/**
 * Get roles that the current user can assign to others
 */
export const getAssignableRolesQuery = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      return [];
    }

    return getAssignableRoles(user.role as UserRole);
  },
});

/**
 * Check if current user has at least the specified role
 */
export const hasRole = query({
  args: {
    role: v.union(
      v.literal("it_admin"),
      v.literal("super_admin"),
      v.literal("admin_staff"),
      v.literal("branch_admin"),
      v.literal("staff"),
      v.literal("barber"),
      v.literal("customer")
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      return false;
    }

    return hasRoleOrHigher(user.role as UserRole, args.role);
  },
});

/**
 * Get permission summary for a user (for admin views)
 */
export const getUserPermissionSummary = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    if (!currentUser) {
      return null;
    }

    // Only admins can view others' permissions
    if (!hasRoleOrHigher(currentUser.role as UserRole, "branch_admin")) {
      return null;
    }

    const targetUser = await ctx.db.get(args.userId);

    if (!targetUser) {
      return null;
    }

    // Branch admins can only see users in their branch
    if (
      currentUser.role === "branch_admin" &&
      targetUser.branch_id !== currentUser.branch_id
    ) {
      return null;
    }

    return {
      userId: targetUser._id,
      username: targetUser.username,
      email: targetUser.email,
      role: targetUser.role,
      branch_id: targetUser.branch_id,
      page_access: targetUser.page_access,
      page_access_v2: targetUser.page_access_v2,
      accessiblePages: getAccessiblePages(targetUser),
    };
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Update a user's page_access_v2 permissions
 * Only admins can update permissions, with role-based restrictions
 */
export const updateUserPermissions = mutation({
  args: {
    userId: v.id("users"),
    page_access_v2: v.any(), // PageAccessV2 type
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    if (!currentUser) {
      throw new ConvexError({
        code: PERMISSION_ERRORS.UNAUTHENTICATED,
        message: "You must be logged in",
      });
    }

    const currentRole = currentUser.role as UserRole;

    // Must be at least branch_admin to update permissions
    if (!hasRoleOrHigher(currentRole, "branch_admin")) {
      throw new ConvexError({
        code: PERMISSION_ERRORS.PERMISSION_ROLE_INSUFFICIENT,
        message: "Only branch admins and above can update permissions",
      });
    }

    const targetUser = await ctx.db.get(args.userId);

    if (!targetUser) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    // Branch admins can only update users in their branch
    if (
      currentRole === "branch_admin" &&
      targetUser.branch_id !== currentUser.branch_id
    ) {
      throw new ConvexError({
        code: PERMISSION_ERRORS.PERMISSION_BRANCH_MISMATCH,
        message: "You can only update permissions for users in your branch",
      });
    }

    // Cannot update permissions for users with equal or higher role
    const targetRole = targetUser.role as UserRole;
    if (ROLE_HIERARCHY[targetRole] >= ROLE_HIERARCHY[currentRole]) {
      throw new ConvexError({
        code: PERMISSION_ERRORS.PERMISSION_ROLE_INSUFFICIENT,
        message: "You cannot update permissions for users with equal or higher role",
      });
    }

    // Store previous value for audit
    const previousValue = targetUser.page_access_v2;

    // Update permissions
    await ctx.db.patch(args.userId, {
      page_access_v2: args.page_access_v2,
    });

    // Create audit log entry
    await ctx.db.insert("permissionAuditLog", {
      user_id: args.userId,
      changed_by: currentUser._id,
      change_type: "page_access_changed",
      previous_value: JSON.stringify(previousValue),
      new_value: JSON.stringify(args.page_access_v2),
      created_at: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Update a user's role
 * Only users with sufficient role level can change roles
 */
export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    newRole: v.union(
      v.literal("it_admin"),
      v.literal("super_admin"),
      v.literal("admin_staff"),
      v.literal("branch_admin"),
      v.literal("staff"),
      v.literal("barber"),
      v.literal("customer")
    ),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    if (!currentUser) {
      throw new ConvexError({
        code: PERMISSION_ERRORS.UNAUTHENTICATED,
        message: "You must be logged in",
      });
    }

    const currentRole = currentUser.role as UserRole;

    // Check if current user can create users with the target role
    if (!canCreateUserWithRole(currentRole, args.newRole)) {
      throw new ConvexError({
        code: PERMISSION_ERRORS.PERMISSION_ROLE_INSUFFICIENT,
        message: `You don't have permission to assign the ${args.newRole} role`,
      });
    }

    const targetUser = await ctx.db.get(args.userId);

    if (!targetUser) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    // Branch admins can only update users in their branch
    if (
      currentRole === "branch_admin" &&
      targetUser.branch_id !== currentUser.branch_id
    ) {
      throw new ConvexError({
        code: PERMISSION_ERRORS.PERMISSION_BRANCH_MISMATCH,
        message: "You can only update users in your branch",
      });
    }

    // Store previous value for audit
    const previousRole = targetUser.role;

    // Update role
    await ctx.db.patch(args.userId, {
      role: args.newRole,
    });

    // Create audit log entry
    await ctx.db.insert("permissionAuditLog", {
      user_id: args.userId,
      changed_by: currentUser._id,
      change_type: "role_changed",
      previous_value: JSON.stringify({ role: previousRole }),
      new_value: JSON.stringify({ role: args.newRole }),
      created_at: Date.now(),
    });

    return { success: true };
  },
});

// ============================================================================
// AUDIT TRAIL QUERIES - Story 12-7
// ============================================================================

/**
 * Get audit trail entries (Super Admin only)
 */
export const getAuditTrail = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    userId: v.optional(v.id("users")),
    changedBy: v.optional(v.id("users")),
    changeType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    if (!currentUser) {
      return { entries: [], total: 0 };
    }

    // Only it_admin and super_admin can view full audit trail
    if (currentUser.role !== "it_admin" && currentUser.role !== "super_admin") {
      return { entries: [], total: 0 };
    }

    const limit = args.limit || 50;
    const offset = args.offset || 0;

    // Build query
    let query = ctx.db.query("permissionAuditLog");

    // Apply filters
    if (args.userId) {
      query = query.withIndex("by_user", (q) => q.eq("user_id", args.userId));
    } else if (args.changedBy) {
      query = query.withIndex("by_changed_by", (q) => q.eq("changed_by", args.changedBy));
    } else {
      query = query.withIndex("by_created_at");
    }

    // Get all matching entries for count
    const allEntries = await query.order("desc").collect();

    // Apply change_type filter if specified
    let filteredEntries = allEntries;
    if (args.changeType) {
      filteredEntries = allEntries.filter((e) => e.change_type === args.changeType);
    }

    const total = filteredEntries.length;

    // Apply pagination
    const paginatedEntries = filteredEntries.slice(offset, offset + limit);

    // Fetch user details for each entry
    const entriesWithUsers = await Promise.all(
      paginatedEntries.map(async (entry) => {
        const affectedUser = await ctx.db.get(entry.user_id);
        const changedByUser = await ctx.db.get(entry.changed_by);

        return {
          ...entry,
          affected_user: affectedUser
            ? { _id: affectedUser._id, username: affectedUser.username, email: affectedUser.email }
            : null,
          changed_by_user: changedByUser
            ? { _id: changedByUser._id, username: changedByUser.username, email: changedByUser.email }
            : null,
        };
      })
    );

    return {
      entries: entriesWithUsers,
      total,
    };
  },
});

/**
 * Get audit trail summary stats (Super Admin only)
 */
export const getAuditTrailStats = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await getCurrentUser(ctx);

    if (!currentUser || (currentUser.role !== "it_admin" && currentUser.role !== "super_admin")) {
      return null;
    }

    const allEntries = await ctx.db.query("permissionAuditLog").collect();

    // Count by change type
    const byType: Record<string, number> = {};
    allEntries.forEach((entry) => {
      byType[entry.change_type] = (byType[entry.change_type] || 0) + 1;
    });

    // Count last 24 hours
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const last24Hours = allEntries.filter((e) => e.created_at > oneDayAgo).length;

    // Count last 7 days
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const last7Days = allEntries.filter((e) => e.created_at > sevenDaysAgo).length;

    return {
      total: allEntries.length,
      byType,
      last24Hours,
      last7Days,
    };
  },
});
