/**
 * IT Admin Service - High-Level Platform Management
 * Branch suspension, user banning, and dashboard statistics.
 */

import { v } from "convex/values";
import { query, mutation } from "../_generated/server";

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Suspend a branch. IT Admin only.
 * Optionally also cancels the branch's active subscription.
 */
export const suspendBranch = mutation({
  args: {
    userId: v.id("users"),
    branchId: v.id("branches"),
    suspension_reason: v.string(),
    cancelSubscription: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Validate IT Admin role
    const user = await ctx.db.get(args.userId);
    if (!user || user.role !== "it_admin") {
      throw new Error("Unauthorized: IT Administrator access required");
    }

    const branch = await ctx.db.get(args.branchId);
    if (!branch) {
      throw new Error("Branch not found");
    }

    const now = Date.now();

    // Suspend the branch
    await ctx.db.patch(args.branchId, {
      is_suspended: true,
      suspension_reason: args.suspension_reason,
      suspended_at: now,
      suspended_by: args.userId,
      updatedAt: now,
    });

    // Optionally cancel the branch's subscription
    if (args.cancelSubscription) {
      const subscription = await ctx.db
        .query("subscriptions")
        .withIndex("by_branch", (q) => q.eq("branch_id", args.branchId))
        .first();

      if (subscription && subscription.status !== "cancelled") {
        await ctx.db.patch(subscription._id, {
          status: "cancelled",
          auto_renew: false,
          updatedAt: now,
        });
      }
    }

    return { success: true };
  },
});

/**
 * Unsuspend a branch. IT Admin only.
 */
export const unsuspendBranch = mutation({
  args: {
    userId: v.id("users"),
    branchId: v.id("branches"),
  },
  handler: async (ctx, args) => {
    // Validate IT Admin role
    const user = await ctx.db.get(args.userId);
    if (!user || user.role !== "it_admin") {
      throw new Error("Unauthorized: IT Administrator access required");
    }

    const branch = await ctx.db.get(args.branchId);
    if (!branch) {
      throw new Error("Branch not found");
    }

    await ctx.db.patch(args.branchId, {
      is_suspended: false,
      suspension_reason: undefined,
      suspended_at: undefined,
      suspended_by: undefined,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Ban a user. IT Admin only.
 */
export const banUser = mutation({
  args: {
    userId: v.id("users"),
    targetUserId: v.id("users"),
    ban_reason: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate IT Admin role
    const user = await ctx.db.get(args.userId);
    if (!user || user.role !== "it_admin") {
      throw new Error("Unauthorized: IT Administrator access required");
    }

    const targetUser = await ctx.db.get(args.targetUserId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    // Prevent banning other IT admins
    if (targetUser.role === "it_admin") {
      throw new Error("Cannot ban another IT Administrator");
    }

    await ctx.db.patch(args.targetUserId, {
      is_banned: true,
      ban_reason: args.ban_reason,
      banned_at: Date.now(),
      banned_by: args.userId,
    });

    return { success: true };
  },
});

/**
 * Unban a user. IT Admin only.
 */
export const unbanUser = mutation({
  args: {
    userId: v.id("users"),
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Validate IT Admin role
    const user = await ctx.db.get(args.userId);
    if (!user || user.role !== "it_admin") {
      throw new Error("Unauthorized: IT Administrator access required");
    }

    const targetUser = await ctx.db.get(args.targetUserId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    await ctx.db.patch(args.targetUserId, {
      is_banned: false,
      ban_reason: undefined,
      banned_at: undefined,
      banned_by: undefined,
    });

    return { success: true };
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all banned users.
 */
export const getBannedUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const bannedUsers = users.filter((u) => u.is_banned === true);

    const enriched = await Promise.all(
      bannedUsers.map(async (u) => {
        const bannedByUser = u.banned_by ? await ctx.db.get(u.banned_by) : null;
        const branch = u.branch_id ? await ctx.db.get(u.branch_id) : null;
        return {
          _id: u._id,
          username: u.username,
          email: u.email,
          role: u.role,
          branch_id: u.branch_id,
          branch_name: branch?.name || null,
          is_banned: u.is_banned,
          ban_reason: u.ban_reason,
          banned_at: u.banned_at,
          banned_by: u.banned_by,
          banned_by_username: bannedByUser?.username || null,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get all suspended branches.
 */
export const getSuspendedBranches = query({
  args: {},
  handler: async (ctx) => {
    const branches = await ctx.db.query("branches").collect();
    const suspended = branches.filter((b) => b.is_suspended === true);

    const enriched = await Promise.all(
      suspended.map(async (b) => {
        const suspendedByUser = b.suspended_by
          ? await ctx.db.get(b.suspended_by)
          : null;
        return {
          _id: b._id,
          name: b.name,
          branch_code: b.branch_code,
          address: b.address,
          is_suspended: b.is_suspended,
          suspension_reason: b.suspension_reason,
          suspended_at: b.suspended_at,
          suspended_by: b.suspended_by,
          suspended_by_username: suspendedByUser?.username || null,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get IT Admin dashboard aggregate stats.
 */
export const getItAdminDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const thirtyDaysFromNow = now + 30 * 24 * 60 * 60 * 1000;

    // Subscription stats
    const subscriptions = await ctx.db.query("subscriptions").collect();
    const activeSubscriptions = subscriptions.filter(
      (s) => s.status === "active"
    ).length;
    const overdueSubscriptions = subscriptions.filter(
      (s) => s.payment_status === "overdue" || s.status === "past_due"
    ).length;

    // License stats
    const licenses = await ctx.db.query("licenses").collect();
    const activeLicenses = licenses.filter(
      (l) => l.is_active && l.expires_at > now
    ).length;
    const expiringLicenses = licenses.filter(
      (l) =>
        l.is_active &&
        l.expires_at >= now &&
        l.expires_at <= thirtyDaysFromNow
    ).length;

    // Error log stats (last 24 hours)
    const errorLogs = await ctx.db.query("error_logs").collect();
    const recentErrors = errorLogs.filter(
      (e) => e.createdAt > oneDayAgo
    ).length;
    const criticalErrors = errorLogs.filter(
      (e) => e.severity === "critical" && e.createdAt > oneDayAgo
    ).length;

    // Security events stats (active/unresolved threats)
    const securityEvents = await ctx.db.query("security_events").collect();
    const activeThreats = securityEvents.filter(
      (e) => e.is_resolved !== true
    ).length;

    // Banned users count
    const users = await ctx.db.query("users").collect();
    const bannedUsers = users.filter((u) => u.is_banned === true).length;

    return {
      activeSubscriptions,
      overdueSubscriptions,
      activeLicenses,
      expiringLicenses,
      recentErrors,
      criticalErrors,
      activeThreats,
      bannedUsers,
    };
  },
});
