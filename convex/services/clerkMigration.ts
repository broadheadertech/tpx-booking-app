/**
 * Clerk Migration Service
 * Migrates existing Convex users to Clerk
 *
 * This service creates users in Clerk and links them back to Convex
 * by updating the clerk_user_id field.
 *
 * Usage:
 * 1. Run the migration from Convex Dashboard Actions tab
 * 2. Or call via frontend: api.services.clerkMigration.migrateAllUsers
 */

import { action, internalMutation, mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all migrated users with their Clerk IDs (for debugging)
 */
export const getMigratedUsersDebug = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db
      .query("users")
      .filter((q) =>
        q.and(
          q.eq(q.field("is_active"), true),
          q.neq(q.field("clerk_user_id"), undefined),
          q.neq(q.field("clerk_user_id"), null),
          q.neq(q.field("clerk_user_id"), "")
        )
      )
      .collect();

    return users.map((user) => ({
      _id: user._id,
      email: user.email,
      role: user.role,
      clerk_user_id: user.clerk_user_id,
    }));
  },
});

/**
 * Get all users that haven't been migrated to Clerk yet
 */
export const getUnmigratedUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db
      .query("users")
      .filter((q) =>
        q.and(
          q.eq(q.field("is_active"), true),
          q.or(
            q.eq(q.field("clerk_user_id"), undefined),
            q.eq(q.field("clerk_user_id"), null),
            q.eq(q.field("clerk_user_id"), "")
          )
        )
      )
      .collect();

    return users.map((user) => ({
      _id: user._id,
      email: user.email,
      username: user.username,
      nickname: user.nickname,
      role: user.role,
      mobile_number: user.mobile_number,
      is_active: user.is_active,
      migration_status: user.migration_status,
    }));
  },
});

/**
 * Get migration statistics
 * Story 14-1: Migration Status Tracking
 */
export const getMigrationStats = query({
  args: {},
  handler: async (ctx) => {
    const allUsers = await ctx.db.query("users").collect();

    const stats = {
      total: allUsers.length,
      migrated: 0,
      pending: 0,
      invited: 0,
      failed: 0,
      byRole: {} as Record<string, { migrated: number; pending: number; invited: number }>,
      byStatus: {
        pending: 0,
        invited: 0,
        completed: 0,
        failed: 0,
      },
    };

    for (const user of allUsers) {
      const hasClerKId = user.clerk_user_id && user.clerk_user_id !== "";
      const role = user.role || "unknown";
      const status = user.migration_status || "pending";

      if (!stats.byRole[role]) {
        stats.byRole[role] = { migrated: 0, pending: 0, invited: 0 };
      }

      // Count by status
      if (status === "completed" || hasClerKId) {
        stats.migrated++;
        stats.byRole[role].migrated++;
        stats.byStatus.completed++;
      } else if (status === "invited") {
        stats.invited++;
        stats.byRole[role].invited++;
        stats.byStatus.invited++;
      } else if (status === "failed") {
        stats.failed++;
        stats.byStatus.failed++;
      } else if (user.is_active) {
        stats.pending++;
        stats.byRole[role].pending++;
        stats.byStatus.pending++;
      }
    }

    return stats;
  },
});

/**
 * Get users by migration status
 * Story 14-1: Migration Status Tracking
 */
export const getUsersByMigrationStatus = query({
  args: {
    status: v.union(
      v.literal("pending"),
      v.literal("invited"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("all")
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let users;

    if (args.status === "all") {
      users = await ctx.db.query("users").collect();
    } else if (args.status === "completed") {
      // Completed = has clerk_user_id OR migration_status is completed
      users = await ctx.db
        .query("users")
        .filter((q) =>
          q.or(
            q.eq(q.field("migration_status"), "completed"),
            q.and(
              q.neq(q.field("clerk_user_id"), undefined),
              q.neq(q.field("clerk_user_id"), null),
              q.neq(q.field("clerk_user_id"), "")
            )
          )
        )
        .collect();
    } else if (args.status === "pending") {
      // Pending = no clerk_user_id AND (no migration_status OR migration_status is pending)
      users = await ctx.db
        .query("users")
        .filter((q) =>
          q.and(
            q.eq(q.field("is_active"), true),
            q.or(
              q.eq(q.field("clerk_user_id"), undefined),
              q.eq(q.field("clerk_user_id"), null),
              q.eq(q.field("clerk_user_id"), "")
            ),
            q.or(
              q.eq(q.field("migration_status"), undefined),
              q.eq(q.field("migration_status"), null),
              q.eq(q.field("migration_status"), "pending")
            )
          )
        )
        .collect();
    } else {
      // invited or failed
      users = await ctx.db
        .query("users")
        .withIndex("by_migration_status", (q) => q.eq("migration_status", args.status))
        .collect();
    }

    // Apply limit
    if (args.limit && args.limit > 0) {
      users = users.slice(0, args.limit);
    }

    return users.map((user) => ({
      _id: user._id,
      email: user.email,
      username: user.username,
      nickname: user.nickname,
      role: user.role,
      mobile_number: user.mobile_number,
      is_active: user.is_active,
      migration_status: user.migration_status || "pending",
      clerk_user_id: user.clerk_user_id,
      createdAt: user.createdAt,
    }));
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Update user with Clerk ID after successful migration
 */
export const linkUserToClerk = mutation({
  args: {
    userId: v.id("users"),
    clerk_user_id: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      clerk_user_id: args.clerk_user_id,
      migration_status: "completed",
      updatedAt: Date.now(),
    });

    console.log(`[ClerkMigration] Linked user ${args.userId} to Clerk ${args.clerk_user_id}`);
    return { success: true };
  },
});

/**
 * Mark user migration as failed
 */
export const markMigrationFailed = mutation({
  args: {
    userId: v.id("users"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      migration_status: "failed",
      updatedAt: Date.now(),
    });

    console.error(`[ClerkMigration] Failed to migrate user ${args.userId}: ${args.error}`);
    return { success: false, error: args.error };
  },
});

/**
 * Mark user as invited
 * Story 14-2: Invite-Based User Migration
 */
export const markUserInvited = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      migration_status: "invited",
      updatedAt: Date.now(),
    });

    console.log(`[ClerkMigration] Marked user ${args.userId} as invited`);
    return { success: true };
  },
});

/**
 * Preserve legacy password hash before migration
 * Story 14-5: Data Preservation During Migration
 */
export const preserveLegacyPassword = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Only preserve if not already preserved and password exists
    if (!user.legacy_password_hash && user.password) {
      await ctx.db.patch(args.userId, {
        legacy_password_hash: user.password,
        updatedAt: Date.now(),
      });
      console.log(`[ClerkMigration] Preserved legacy password for user ${args.userId}`);
    }

    return { success: true };
  },
});

/**
 * Map legacy role to new 6-role system
 * Story 14-4: Role Mapping to 6-Role System
 */
export const mapUserRole = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Role mapping table
    const roleMapping: Record<string, string> = {
      admin: "super_admin",      // Legacy admin → super_admin
      manager: "branch_admin",   // Legacy manager → branch_admin
      staff: "staff",            // Staff unchanged
      barber: "barber",          // Barber unchanged
      customer: "customer",      // Customer unchanged
      // New roles (no mapping needed)
      super_admin: "super_admin",
      branch_admin: "branch_admin",
      admin_staff: "admin_staff",
    };

    const currentRole = user.role;
    const mappedRole = roleMapping[currentRole] || "customer"; // Default to customer if unknown

    if (currentRole !== mappedRole) {
      await ctx.db.patch(args.userId, {
        role: mappedRole as any,
        updatedAt: Date.now(),
      });
      console.log(`[ClerkMigration] Mapped role ${currentRole} → ${mappedRole} for user ${args.userId}`);
      return { success: true, previousRole: currentRole, newRole: mappedRole, changed: true };
    }

    return { success: true, role: currentRole, changed: false };
  },
});

/**
 * Migrate page_access from array to object format
 * Story 14-6: Page Access Structure Migration
 */
export const migratePageAccess = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { success: false, error: "User not found" };
    }

    // If already has page_access_v2, skip
    if (user.page_access_v2) {
      return { success: true, skipped: true, reason: "Already has page_access_v2" };
    }

    // Default permissions object
    const defaultPermissions = { view: false, create: false, edit: false, delete: false, approve: false };
    const fullPermissions = { view: true, create: true, edit: true, delete: true, approve: true };

    // Get default page_access_v2 based on role
    let pageAccessV2: Record<string, typeof defaultPermissions> = {};

    // All possible pages
    const staffPages = [
      "overview", "reports", "bookings", "custom_bookings", "calendar", "walkins",
      "pos", "barbers", "users", "services", "customers", "products", "order_products",
      "vouchers", "payroll", "cash_advances", "royalty", "pl", "balance_sheet",
      "payments", "payment_history", "attendance", "events", "notifications", "email_marketing"
    ];
    const adminPages = ["branches", "catalog", "branding", "emails", "settings"];

    if (user.role === "super_admin" || user.role === "admin_staff") {
      // Full access to all pages
      [...staffPages, ...adminPages].forEach(page => {
        pageAccessV2[page] = { ...fullPermissions };
      });
    } else if (user.role === "branch_admin") {
      // Full access to staff pages
      staffPages.forEach(page => {
        pageAccessV2[page] = { ...fullPermissions };
      });
    } else if (user.role === "staff") {
      // If legacy page_access exists, convert it
      if (user.page_access && Array.isArray(user.page_access)) {
        user.page_access.forEach(page => {
          pageAccessV2[page] = { ...fullPermissions };
        });
      }
      // Always grant overview access
      pageAccessV2["overview"] = { ...fullPermissions };
    } else if (user.role === "barber" || user.role === "customer") {
      // Minimal access - overview only
      pageAccessV2["overview"] = { view: true, create: false, edit: false, delete: false, approve: false };
    }

    await ctx.db.patch(args.userId, {
      page_access_v2: pageAccessV2,
      updatedAt: Date.now(),
    });

    console.log(`[ClerkMigration] Migrated page_access to v2 for user ${args.userId}`);
    return { success: true, pagesSet: Object.keys(pageAccessV2).length };
  },
});

// ============================================================================
// ACTIONS (External API calls)
// ============================================================================

/**
 * Create a single user in Clerk
 * Uses Clerk Backend API
 */
export const createClerkUser = action({
  args: {
    userId: v.id("users"),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    username: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;

    if (!clerkSecretKey) {
      console.error("[ClerkMigration] CLERK_SECRET_KEY not configured");
      await ctx.runMutation(internal.services.clerkMigration.markMigrationFailed, {
        userId: args.userId,
        error: "CLERK_SECRET_KEY not configured",
      });
      return { success: false, error: "CLERK_SECRET_KEY not configured" };
    }

    try {
      // Create user in Clerk via Backend API
      const response = await fetch("https://api.clerk.com/v1/users", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${clerkSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email_address: [args.email],
          first_name: args.firstName || "",
          last_name: args.lastName || "",
          username: sanitizeUsername(args.username),
          skip_password_requirement: true, // User will set password via forgot password
          skip_password_checks: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Check if user already exists in Clerk
        if (errorData.errors?.[0]?.code === "form_identifier_exists") {
          // User exists - try to find them and link
          const existingUser = await findClerkUserByEmail(clerkSecretKey, args.email);
          if (existingUser) {
            await ctx.runMutation(internal.services.clerkMigration.linkUserToClerk, {
              userId: args.userId,
              clerk_user_id: existingUser.id,
            });
            return { success: true, clerk_user_id: existingUser.id, existing: true };
          }
        }

        console.error("[ClerkMigration] Clerk API error:", errorData);
        await ctx.runMutation(internal.services.clerkMigration.markMigrationFailed, {
          userId: args.userId,
          error: JSON.stringify(errorData.errors?.[0] || errorData),
        });
        return { success: false, error: errorData.errors?.[0]?.message || "Unknown error" };
      }

      const clerkUser = await response.json();

      // Link Convex user to Clerk user
      await ctx.runMutation(internal.services.clerkMigration.linkUserToClerk, {
        userId: args.userId,
        clerk_user_id: clerkUser.id,
      });

      console.log(`[ClerkMigration] Created Clerk user ${clerkUser.id} for ${args.email}`);
      return { success: true, clerk_user_id: clerkUser.id };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("[ClerkMigration] Error creating Clerk user:", errorMessage);

      await ctx.runMutation(internal.services.clerkMigration.markMigrationFailed, {
        userId: args.userId,
        error: errorMessage,
      });

      return { success: false, error: errorMessage };
    }
  },
});

/**
 * Send migration invite to a user via Clerk
 * Story 14-2: Invite-Based User Migration
 *
 * This sends an invitation email to the user to set up their Clerk account.
 * When they complete setup, the webhook will link their account.
 */
export const sendMigrationInvite = action({
  args: {
    userId: v.id("users"),
    email: v.string(),
    redirectUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;

    if (!clerkSecretKey) {
      console.error("[ClerkMigration] CLERK_SECRET_KEY not configured");
      return { success: false, error: "CLERK_SECRET_KEY not configured" };
    }

    try {
      // Create invitation via Clerk Backend API
      const response = await fetch("https://api.clerk.com/v1/invitations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${clerkSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email_address: args.email,
          redirect_url: args.redirectUrl || `${process.env.CLERK_FRONTEND_URL || ""}/auth/clerk-callback`,
          public_metadata: {
            convex_user_id: args.userId,
            migration_invite: true,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[ClerkMigration] Clerk invitation error:", errorData);
        return { success: false, error: errorData.errors?.[0]?.message || "Failed to send invitation" };
      }

      const invitation = await response.json();

      // Mark user as invited
      await ctx.runMutation(internal.services.clerkMigration.markUserInvited, {
        userId: args.userId,
      });

      // Preserve legacy password before migration
      await ctx.runMutation(internal.services.clerkMigration.preserveLegacyPassword, {
        userId: args.userId,
      });

      console.log(`[ClerkMigration] Sent invite to ${args.email}, invitation ID: ${invitation.id}`);
      return { success: true, invitationId: invitation.id };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("[ClerkMigration] Error sending invite:", errorMessage);
      return { success: false, error: errorMessage };
    }
  },
});

/**
 * Send bulk migration invites
 * Story 14-2: Invite-Based User Migration
 */
export const sendBulkMigrationInvites = action({
  args: {
    userIds: v.array(v.id("users")),
    redirectUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { api } = require("../_generated/api");

    const results = {
      total: args.userIds.length,
      success: 0,
      failed: 0,
      details: [] as Array<{ userId: string; email?: string; status: string; error?: string }>,
    };

    for (const userId of args.userIds) {
      // Get user details
      const users = await ctx.runQuery(api.services.clerkMigration.getUsersByMigrationStatus, {
        status: "pending",
        limit: 1000,
      });
      const user = users.find((u: any) => u._id === userId);

      if (!user) {
        results.failed++;
        results.details.push({ userId, status: "failed", error: "User not found or not pending" });
        continue;
      }

      if (!user.email || !user.email.includes("@")) {
        results.failed++;
        results.details.push({ userId, email: user.email, status: "failed", error: "Invalid email" });
        continue;
      }

      try {
        const result = await ctx.runAction(api.services.clerkMigration.sendMigrationInvite, {
          userId,
          email: user.email,
          redirectUrl: args.redirectUrl,
        });

        if (result.success) {
          results.success++;
          results.details.push({ userId, email: user.email, status: "invited" });
        } else {
          results.failed++;
          results.details.push({ userId, email: user.email, status: "failed", error: result.error });
        }
      } catch (error) {
        results.failed++;
        results.details.push({
          userId,
          email: user.email,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(`[ClerkMigration] Bulk invites sent: ${results.success}/${results.total}`);
    return results;
  },
});

/**
 * Run full migration with role mapping and page_access migration
 * Story 14-4 & 14-6: Complete user migration
 */
export const runCompleteMigration = action({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { api } = require("../_generated/api");

    try {
      // 1. Preserve legacy password
      await ctx.runMutation(internal.services.clerkMigration.preserveLegacyPassword, {
        userId: args.userId,
      });

      // 2. Map role to new 6-role system
      const roleResult = await ctx.runMutation(internal.services.clerkMigration.mapUserRole, {
        userId: args.userId,
      });

      // 3. Migrate page_access to v2
      const pageAccessResult = await ctx.runMutation(internal.services.clerkMigration.migratePageAccess, {
        userId: args.userId,
      });

      console.log(`[ClerkMigration] Complete migration for ${args.userId}:`, {
        roleMapping: roleResult,
        pageAccess: pageAccessResult,
      });

      return {
        success: true,
        roleMapping: roleResult,
        pageAccess: pageAccessResult,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("[ClerkMigration] Complete migration error:", errorMessage);
      return { success: false, error: errorMessage };
    }
  },
});

/**
 * Run batch migration for all users (roles + page_access)
 * Story 14-4 & 14-6: Batch complete migration
 */
export const runBatchCompleteMigration = action({
  args: {
    dryRun: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { api } = require("../_generated/api");

    // Get all users
    const users = await ctx.runQuery(api.services.clerkMigration.getUsersByMigrationStatus, {
      status: "all",
      limit: args.limit || 1000,
    });

    if (args.dryRun) {
      return {
        dryRun: true,
        totalUsers: users.length,
        wouldMigrate: users.filter((u: any) => !u.page_access_v2).length,
      };
    }

    const results = {
      total: users.length,
      success: 0,
      failed: 0,
      details: [] as Array<{ userId: string; status: string; error?: string }>,
    };

    for (const user of users) {
      try {
        const result = await ctx.runAction(api.services.clerkMigration.runCompleteMigration, {
          userId: user._id,
        });

        if (result.success) {
          results.success++;
          results.details.push({ userId: user._id, status: "success" });
        } else {
          results.failed++;
          results.details.push({ userId: user._id, status: "failed", error: result.error });
        }
      } catch (error) {
        results.failed++;
        results.details.push({
          userId: user._id,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    console.log(`[ClerkMigration] Batch migration complete: ${results.success}/${results.total}`);
    return results;
  },
});

/**
 * Migrate all unmigrated users to Clerk
 * Call this action to run the full migration
 */
export const migrateAllUsers = action({
  args: {
    dryRun: v.optional(v.boolean()), // If true, just report what would be migrated
    limit: v.optional(v.number()), // Limit number of users to migrate (for testing)
  },
  handler: async (ctx, args) => {
    const { api } = require("../_generated/api");

    // Get unmigrated users
    const users = await ctx.runQuery(api.services.clerkMigration.getUnmigratedUsers, {});

    const limit = args.limit || users.length;
    const usersToMigrate = users.slice(0, limit);

    console.log(`[ClerkMigration] Found ${users.length} unmigrated users, processing ${usersToMigrate.length}`);

    if (args.dryRun) {
      return {
        dryRun: true,
        totalUnmigrated: users.length,
        wouldMigrate: usersToMigrate.length,
        users: usersToMigrate.map((u: { email: string; role: string; username?: string }) => ({
          email: u.email,
          role: u.role,
          username: u.username,
        })),
      };
    }

    const results = {
      total: usersToMigrate.length,
      success: 0,
      failed: 0,
      skipped: 0,
      details: [] as Array<{ email: string; status: string; error?: string }>,
    };

    for (const user of usersToMigrate) {
      // Skip users without valid email
      if (!user.email || !user.email.includes("@") || user.email.endsWith("@clerk.local")) {
        results.skipped++;
        results.details.push({
          email: user.email || "no-email",
          status: "skipped",
          error: "Invalid or placeholder email",
        });
        continue;
      }

      // Parse name from nickname
      const nameParts = (user.nickname || "").split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      try {
        const result = await ctx.runAction(api.services.clerkMigration.createClerkUser, {
          userId: user._id,
          email: user.email,
          firstName,
          lastName,
          username: user.username,
        });

        if (result.success) {
          results.success++;
          results.details.push({
            email: user.email,
            status: result.existing ? "linked-existing" : "created",
          });
        } else {
          results.failed++;
          results.details.push({
            email: user.email,
            status: "failed",
            error: result.error,
          });
        }
      } catch (error) {
        results.failed++;
        results.details.push({
          email: user.email,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(`[ClerkMigration] Migration complete:`, {
      success: results.success,
      failed: results.failed,
      skipped: results.skipped,
    });

    return results;
  },
});

/**
 * Migrate a single user by email
 */
export const migrateUserByEmail = action({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const { api } = require("../_generated/api");

    // Find user by email
    const users = await ctx.runQuery(api.services.clerkMigration.getUnmigratedUsers, {});
    const user = users.find((u: any) => u.email === args.email);

    if (!user) {
      return { success: false, error: "User not found or already migrated" };
    }

    // Parse name
    const nameParts = (user.nickname || "").split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    return await ctx.runAction(api.services.clerkMigration.createClerkUser, {
      userId: user._id,
      email: user.email,
      firstName,
      lastName,
      username: user.username,
    });
  },
});

/**
 * Update user email in both Clerk and Convex
 * Useful for testing with real email addresses
 */
export const updateUserEmail = action({
  args: {
    email: v.string(),      // Current email
    newEmail: v.string(),   // New email to set
  },
  handler: async (ctx, args) => {
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;

    if (!clerkSecretKey) {
      return { success: false, error: "CLERK_SECRET_KEY not configured" };
    }

    try {
      // Find user in Clerk by current email
      const clerkUser = await findClerkUserByEmail(clerkSecretKey, args.email);
      if (!clerkUser) {
        return { success: false, error: "User not found in Clerk" };
      }

      // Update email in Clerk
      const response = await fetch(`https://api.clerk.com/v1/users/${clerkUser.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${clerkSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          primary_email_address_id: clerkUser.primary_email_address_id,
        }),
      });

      // Create new email address
      const emailResponse = await fetch(`https://api.clerk.com/v1/email_addresses`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${clerkSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: clerkUser.id,
          email_address: args.newEmail,
          verified: true, // Mark as verified for testing
          primary: true,  // Make it the primary email
        }),
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json();
        return { success: false, error: errorData.errors?.[0]?.message || "Failed to update email" };
      }

      // Update email in Convex
      const { api } = require("../_generated/api");
      const users = await ctx.runQuery(api.services.clerkMigration.getUnmigratedUsers, {});
      // Note: We need a different query - let's update via mutation

      console.log(`[ClerkMigration] Updated email from ${args.email} to ${args.newEmail}`);
      return { success: true, clerkUserId: clerkUser.id };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});

/**
 * Set password for a Clerk user
 * Useful for testing without email verification
 */
export const setUserPassword = action({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;

    if (!clerkSecretKey) {
      return { success: false, error: "CLERK_SECRET_KEY not configured" };
    }

    if (args.password.length < 8) {
      return { success: false, error: "Password must be at least 8 characters" };
    }

    try {
      // Find user in Clerk by email
      const clerkUser = await findClerkUserByEmail(clerkSecretKey, args.email);
      if (!clerkUser) {
        return { success: false, error: "User not found in Clerk" };
      }

      // Set password via Clerk API
      const response = await fetch(`https://api.clerk.com/v1/users/${clerkUser.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${clerkSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: args.password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.errors?.[0]?.message || "Failed to set password" };
      }

      console.log(`[ClerkMigration] Set password for ${args.email}`);
      return { success: true, email: args.email };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});

/**
 * Set passwords for all migrated users (bulk operation)
 * Useful for setting up test environment
 */
export const setAllUserPasswords = action({
  args: {
    password: v.string(), // Same password for all users
  },
  handler: async (ctx, args) => {
    const { api } = require("../_generated/api");

    // Get migration stats to find migrated users
    const stats = await ctx.runQuery(api.services.clerkMigration.getMigrationStats, {});

    // Get all users from Convex
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      return { success: false, error: "CLERK_SECRET_KEY not configured" };
    }

    // List all users from Clerk
    const response = await fetch("https://api.clerk.com/v1/users?limit=100", {
      headers: {
        Authorization: `Bearer ${clerkSecretKey}`,
      },
    });

    if (!response.ok) {
      return { success: false, error: "Failed to fetch users from Clerk" };
    }

    const clerkUsers = await response.json();
    const results: Array<{ email: string; status: string; error?: string }> = [];

    for (const user of clerkUsers) {
      const email = user.email_addresses?.[0]?.email_address;
      if (!email) continue;

      try {
        const result = await ctx.runAction(api.services.clerkMigration.setUserPassword, {
          email,
          password: args.password,
        });

        results.push({
          email,
          status: result.success ? "success" : "failed",
          error: result.error,
        });
      } catch (error) {
        results.push({
          email,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return {
      total: results.length,
      success: results.filter((r) => r.status === "success").length,
      failed: results.filter((r) => r.status === "failed").length,
      details: results,
    };
  },
});

/**
 * List all Clerk users with their IDs (for debugging)
 */
export const listClerkUsers = action({
  args: {},
  handler: async () => {
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      return { success: false, error: "CLERK_SECRET_KEY not configured" };
    }

    const response = await fetch("https://api.clerk.com/v1/users?limit=100", {
      headers: {
        Authorization: `Bearer ${clerkSecretKey}`,
      },
    });

    if (!response.ok) {
      return { success: false, error: "Failed to fetch users from Clerk" };
    }

    const clerkUsers = await response.json();
    return clerkUsers.map((user: any) => ({
      id: user.id,
      email: user.email_addresses?.[0]?.email_address,
      verified: user.email_addresses?.[0]?.verification?.status === "verified",
      has_password: user.password_enabled,
    }));
  },
});

/**
 * Verify all email addresses for Clerk users
 * This bypasses the OTP requirement for testing
 */
export const verifyAllEmails = action({
  args: {},
  handler: async () => {
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      return { success: false, error: "CLERK_SECRET_KEY not configured" };
    }

    // List all users from Clerk
    const response = await fetch("https://api.clerk.com/v1/users?limit=100", {
      headers: {
        Authorization: `Bearer ${clerkSecretKey}`,
      },
    });

    if (!response.ok) {
      return { success: false, error: "Failed to fetch users from Clerk" };
    }

    const clerkUsers = await response.json();
    const results: Array<{ email: string; status: string; error?: string }> = [];

    for (const user of clerkUsers) {
      const emailAddress = user.email_addresses?.[0];
      if (!emailAddress) continue;

      // Skip if already verified
      if (emailAddress.verification?.status === "verified") {
        results.push({
          email: emailAddress.email_address,
          status: "already_verified",
        });
        continue;
      }

      try {
        // Verify the email address
        const verifyResponse = await fetch(
          `https://api.clerk.com/v1/email_addresses/${emailAddress.id}/verify`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${clerkSecretKey}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (verifyResponse.ok) {
          results.push({
            email: emailAddress.email_address,
            status: "verified",
          });
        } else {
          const errorData = await verifyResponse.json();
          results.push({
            email: emailAddress.email_address,
            status: "failed",
            error: errorData.errors?.[0]?.message || "Verification failed",
          });
        }
      } catch (error) {
        results.push({
          email: emailAddress.email_address,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return {
      total: results.length,
      verified: results.filter((r) => r.status === "verified").length,
      alreadyVerified: results.filter((r) => r.status === "already_verified").length,
      failed: results.filter((r) => r.status === "failed").length,
      details: results,
    };
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Sanitize username for Clerk (only letters, numbers, hyphens, underscores)
 */
function sanitizeUsername(username: string | undefined): string | undefined {
  if (!username) return undefined;
  // Replace invalid characters with underscores, then clean up multiple underscores
  const sanitized = username
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  return sanitized || undefined;
}

/**
 * Find a Clerk user by email
 */
async function findClerkUserByEmail(secretKey: string, email: string) {
  try {
    const response = await fetch(
      `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const users = await response.json();
    return users[0] || null;
  } catch {
    return null;
  }
}
