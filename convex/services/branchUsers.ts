/**
 * Branch User Management Service
 * Story 13-2: User Branch Assignment and Org Sync
 *
 * Handles user branch assignments with Clerk Organization sync:
 * - Assign user to branch: Update branch_id + add to Clerk Org
 * - Remove user from branch: Clear branch_id + remove from Clerk Org
 * - Audit logging for all branch assignment changes
 */

import { v } from "convex/values";
import { action, internalMutation, internalQuery, mutation, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get users by branch with optional role filter
 */
export const getUsersByBranch = query({
  args: {
    branchId: v.id("branches"),
    roleFilter: v.optional(
      v.union(
        v.literal("staff"),
        v.literal("barber"),
        v.literal("branch_admin"),
        v.literal("all")
      )
    ),
  },
  handler: async (ctx, args) => {
    let users = await ctx.db
      .query("users")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branchId))
      .collect();

    if (args.roleFilter && args.roleFilter !== "all") {
      users = users.filter((u) => u.role === args.roleFilter);
    }

    return users.map((u) => ({
      _id: u._id,
      username: u.username,
      email: u.email,
      nickname: u.nickname,
      role: u.role,
      is_active: u.is_active,
      clerk_user_id: u.clerk_user_id,
      clerk_org_ids: u.clerk_org_ids,
    }));
  },
});

/**
 * Get unassigned users (no branch_id) who could be assigned to a branch
 */
export const getUnassignedUsers = query({
  args: {
    roleFilter: v.optional(
      v.union(
        v.literal("staff"),
        v.literal("barber"),
        v.literal("branch_admin"),
        v.literal("all")
      )
    ),
  },
  handler: async (ctx, args) => {
    // Get users without branch_id that are branch-scoped roles
    const branchScopedRoles = ["staff", "barber", "branch_admin"];

    const users = await ctx.db
      .query("users")
      .filter((q) =>
        q.and(
          q.eq(q.field("branch_id"), undefined),
          q.or(
            ...branchScopedRoles.map((role) =>
              q.eq(q.field("role"), role as any)
            )
          )
        )
      )
      .collect();

    let filtered = users;
    if (args.roleFilter && args.roleFilter !== "all") {
      filtered = users.filter((u) => u.role === args.roleFilter);
    }

    return filtered.map((u) => ({
      _id: u._id,
      username: u.username,
      email: u.email,
      nickname: u.nickname,
      role: u.role,
      is_active: u.is_active,
      clerk_user_id: u.clerk_user_id,
    }));
  },
});

// ============================================================================
// INTERNAL MUTATIONS (for action use)
// ============================================================================

/**
 * Internal mutation to update user's branch assignment
 */
export const updateUserBranchInternal = internalMutation({
  args: {
    userId: v.id("users"),
    branchId: v.optional(v.id("branches")),
    clerk_org_ids: v.optional(v.array(v.string())),
    operation: v.union(v.literal("assign"), v.literal("remove")),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const previousBranchId = user.branch_id;
    const previousClerkOrgIds = user.clerk_org_ids || [];

    // Update user
    await ctx.db.patch(args.userId, {
      branch_id: args.branchId,
      clerk_org_ids: args.clerk_org_ids,
      updatedAt: Date.now(),
    });

    // Create audit log entry
    await ctx.db.insert("permissionAuditLog", {
      user_id: args.userId,
      changed_by: args.userId, // Will be overwritten by action with actual admin ID
      change_type: args.operation === "assign" ? "branch_assigned" : "branch_removed",
      previous_value: previousBranchId
        ? JSON.stringify({
            branch_id: previousBranchId,
            clerk_org_ids: previousClerkOrgIds,
          })
        : null,
      new_value: args.branchId
        ? JSON.stringify({
            branch_id: args.branchId,
            clerk_org_ids: args.clerk_org_ids || [],
          })
        : null,
      timestamp: Date.now(),
    });

    console.log("[BranchUsers] Updated user branch assignment:", {
      userId: args.userId,
      operation: args.operation,
      previousBranchId,
      newBranchId: args.branchId,
    });

    return {
      success: true,
      userId: args.userId,
      previousBranchId,
      newBranchId: args.branchId,
    };
  },
});

/**
 * Internal mutation to create audit log with correct changed_by
 */
export const createBranchAssignmentAuditLog = internalMutation({
  args: {
    userId: v.id("users"),
    changedBy: v.id("users"),
    changeType: v.union(v.literal("branch_assigned"), v.literal("branch_removed")),
    previousValue: v.optional(v.string()),
    newValue: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("permissionAuditLog", {
      user_id: args.userId,
      changed_by: args.changedBy,
      change_type: args.changeType,
      previous_value: args.previousValue || null,
      new_value: args.newValue || null,
      timestamp: Date.now(),
    });
  },
});

// ============================================================================
// ACTIONS (with Clerk API sync)
// ============================================================================

/**
 * Assign a user to a branch with Clerk Organization sync
 * Story 13-2: User Branch Assignment and Org Sync
 *
 * Flow:
 * 1. Validate user and branch exist
 * 2. Get branch's clerk_org_id
 * 3. If user has clerk_user_id and branch has clerk_org_id:
 *    - Add user to Clerk Organization as member
 * 4. Update user's branch_id and clerk_org_ids
 * 5. Create audit log entry
 */
export const assignUserToBranch = action({
  args: {
    userId: v.id("users"),
    branchId: v.id("branches"),
    adminUserId: v.optional(v.id("users")), // Who is making the change
  },
  handler: async (ctx, args) => {
    // 1. Get user and branch
    const user = await ctx.runQuery(internal.services.branchUsers.getUserById, {
      userId: args.userId,
    });

    if (!user) {
      throw new Error("User not found");
    }

    const branch = await ctx.runQuery(internal.services.branchUsers.getBranchById, {
      branchId: args.branchId,
    });

    if (!branch) {
      throw new Error("Branch not found");
    }

    const clerk_user_id = user.clerk_user_id;
    const clerk_org_id = branch.clerk_org_id;

    let newClerkOrgIds = [...(user.clerk_org_ids || [])];

    // 2. Add user to Clerk Organization if both have Clerk IDs
    if (clerk_user_id && clerk_org_id) {
      const clerkSecretKey = process.env.CLERK_SECRET_KEY;

      if (clerkSecretKey) {
        try {
          console.log("[BranchUsers] Adding user to Clerk Organization:", {
            clerk_user_id,
            clerk_org_id,
          });

          // Check if membership already exists
          const checkResponse = await fetch(
            `https://api.clerk.com/v1/organizations/${clerk_org_id}/memberships?user_id=${clerk_user_id}`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${clerkSecretKey}`,
              },
            }
          );

          if (checkResponse.ok) {
            const checkData = await checkResponse.json();
            const existingMembership = checkData.data?.find(
              (m: any) => m.public_user_data?.user_id === clerk_user_id
            );

            if (existingMembership) {
              console.log("[BranchUsers] User already member of organization");
            } else {
              // Add user to organization
              const response = await fetch(
                `https://api.clerk.com/v1/organizations/${clerk_org_id}/memberships`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${clerkSecretKey}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    user_id: clerk_user_id,
                    role: "org:member", // Basic member role
                  }),
                }
              );

              if (!response.ok) {
                const errorData = await response.json();
                console.error("[BranchUsers] Clerk API error:", errorData);
                // Don't fail the operation - Clerk sync can be retried
                console.warn(
                  "[BranchUsers] Failed to add user to Clerk org, continuing with local update"
                );
              } else {
                console.log("[BranchUsers] Added user to Clerk Organization");
              }
            }
          }

          // Update clerk_org_ids array
          if (!newClerkOrgIds.includes(clerk_org_id)) {
            newClerkOrgIds.push(clerk_org_id);
          }
        } catch (error: any) {
          console.error("[BranchUsers] Error calling Clerk API:", error.message);
          // Continue with local update even if Clerk fails
        }
      } else {
        console.warn("[BranchUsers] CLERK_SECRET_KEY not configured, skipping org sync");
      }
    }

    // 3. Update user in database
    await ctx.runMutation(internal.services.branchUsers.updateUserBranchInternal, {
      userId: args.userId,
      branchId: args.branchId,
      clerk_org_ids: newClerkOrgIds.length > 0 ? newClerkOrgIds : undefined,
      operation: "assign",
    });

    // 4. Create audit log with correct changed_by
    if (args.adminUserId) {
      await ctx.runMutation(internal.services.branchUsers.createBranchAssignmentAuditLog, {
        userId: args.userId,
        changedBy: args.adminUserId,
        changeType: "branch_assigned",
        previousValue: user.branch_id
          ? JSON.stringify({ branch_id: user.branch_id })
          : undefined,
        newValue: JSON.stringify({
          branch_id: args.branchId,
          clerk_org_ids: newClerkOrgIds,
        }),
      });
    }

    console.log("[BranchUsers] User assigned to branch:", {
      userId: args.userId,
      branchId: args.branchId,
      clerkSynced: !!(clerk_user_id && clerk_org_id),
    });

    return {
      success: true,
      userId: args.userId,
      branchId: args.branchId,
      clerkOrgId: clerk_org_id,
      clerkSynced: !!(clerk_user_id && clerk_org_id),
    };
  },
});

/**
 * Remove a user from a branch with Clerk Organization sync
 * Story 13-2: User Branch Assignment and Org Sync
 *
 * Flow:
 * 1. Validate user exists and has a branch
 * 2. Get branch's clerk_org_id
 * 3. If user has clerk_user_id and branch has clerk_org_id:
 *    - Remove user from Clerk Organization
 * 4. Clear user's branch_id and update clerk_org_ids
 * 5. Create audit log entry
 */
export const removeUserFromBranch = action({
  args: {
    userId: v.id("users"),
    adminUserId: v.optional(v.id("users")), // Who is making the change
  },
  handler: async (ctx, args) => {
    // 1. Get user
    const user = await ctx.runQuery(internal.services.branchUsers.getUserById, {
      userId: args.userId,
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (!user.branch_id) {
      throw new Error("User is not assigned to any branch");
    }

    // 2. Get branch
    const branch = await ctx.runQuery(internal.services.branchUsers.getBranchById, {
      branchId: user.branch_id,
    });

    const clerk_user_id = user.clerk_user_id;
    const clerk_org_id = branch?.clerk_org_id;

    let newClerkOrgIds = [...(user.clerk_org_ids || [])];

    // 3. Remove user from Clerk Organization if both have Clerk IDs
    if (clerk_user_id && clerk_org_id) {
      const clerkSecretKey = process.env.CLERK_SECRET_KEY;

      if (clerkSecretKey) {
        try {
          console.log("[BranchUsers] Removing user from Clerk Organization:", {
            clerk_user_id,
            clerk_org_id,
          });

          // Find the membership ID first
          const checkResponse = await fetch(
            `https://api.clerk.com/v1/organizations/${clerk_org_id}/memberships?user_id=${clerk_user_id}`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${clerkSecretKey}`,
              },
            }
          );

          if (checkResponse.ok) {
            const checkData = await checkResponse.json();
            const membership = checkData.data?.find(
              (m: any) => m.public_user_data?.user_id === clerk_user_id
            );

            if (membership) {
              // Delete the membership
              const deleteResponse = await fetch(
                `https://api.clerk.com/v1/organizations/${clerk_org_id}/memberships/${membership.id}`,
                {
                  method: "DELETE",
                  headers: {
                    Authorization: `Bearer ${clerkSecretKey}`,
                  },
                }
              );

              if (!deleteResponse.ok) {
                const errorData = await deleteResponse.json();
                console.error("[BranchUsers] Clerk API error on delete:", errorData);
                console.warn(
                  "[BranchUsers] Failed to remove user from Clerk org, continuing with local update"
                );
              } else {
                console.log("[BranchUsers] Removed user from Clerk Organization");
              }
            }
          }

          // Update clerk_org_ids array - remove this org
          newClerkOrgIds = newClerkOrgIds.filter((id) => id !== clerk_org_id);
        } catch (error: any) {
          console.error("[BranchUsers] Error calling Clerk API:", error.message);
          // Continue with local update even if Clerk fails
        }
      } else {
        console.warn("[BranchUsers] CLERK_SECRET_KEY not configured, skipping org sync");
      }
    }

    const previousBranchId = user.branch_id;

    // 4. Update user in database (clear branch_id)
    await ctx.runMutation(internal.services.branchUsers.updateUserBranchInternal, {
      userId: args.userId,
      branchId: undefined,
      clerk_org_ids: newClerkOrgIds.length > 0 ? newClerkOrgIds : undefined,
      operation: "remove",
    });

    // 5. Create audit log with correct changed_by
    if (args.adminUserId) {
      await ctx.runMutation(internal.services.branchUsers.createBranchAssignmentAuditLog, {
        userId: args.userId,
        changedBy: args.adminUserId,
        changeType: "branch_removed",
        previousValue: JSON.stringify({
          branch_id: previousBranchId,
          clerk_org_ids: user.clerk_org_ids || [],
        }),
        newValue: undefined,
      });
    }

    console.log("[BranchUsers] User removed from branch:", {
      userId: args.userId,
      previousBranchId,
      clerkSynced: !!(clerk_user_id && clerk_org_id),
    });

    return {
      success: true,
      userId: args.userId,
      previousBranchId,
      clerkSynced: !!(clerk_user_id && clerk_org_id),
    };
  },
});

// ============================================================================
// INTERNAL QUERIES (for action use)
// ============================================================================

export const getUserById = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const getBranchById = internalQuery({
  args: { branchId: v.id("branches") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.branchId);
  },
});
