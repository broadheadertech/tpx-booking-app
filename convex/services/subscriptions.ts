/**
 * Subscriptions Service - IT Admin Platform Management
 * Manages per-branch SaaS subscriptions (plans, billing, renewals).
 */

import { v } from "convex/values";
import { query, mutation } from "../_generated/server";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all subscriptions with optional plan/status filters, joined with branch name.
 */
export const getAllSubscriptions = query({
  args: {
    plan: v.optional(
      v.union(
        v.literal("free"),
        v.literal("basic"),
        v.literal("pro"),
        v.literal("enterprise")
      )
    ),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("past_due"),
        v.literal("suspended"),
        v.literal("cancelled"),
        v.literal("trial")
      )
    ),
  },
  handler: async (ctx, args) => {
    let subscriptions = await ctx.db.query("subscriptions").collect();

    // Apply optional filters
    if (args.plan) {
      subscriptions = subscriptions.filter((s) => s.plan === args.plan);
    }
    if (args.status) {
      subscriptions = subscriptions.filter((s) => s.status === args.status);
    }

    // Join branch name
    const enriched = await Promise.all(
      subscriptions.map(async (sub) => {
        const branch = await ctx.db.get(sub.branch_id);
        return {
          ...sub,
          branch_name: branch?.name || "Unknown Branch",
        };
      })
    );

    return enriched;
  },
});

/**
 * Get subscription for a specific branch.
 */
export const getSubscriptionByBranch = query({
  args: {
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .first();

    if (!subscription) return null;

    const branch = await ctx.db.get(subscription.branch_id);
    return {
      ...subscription,
      branch_name: branch?.name || "Unknown Branch",
    };
  },
});

/**
 * Get subscriptions with upcoming renewals within N days.
 */
export const getUpcomingRenewals = query({
  args: {
    withinDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.withinDays ?? 30;
    const now = Date.now();
    const cutoff = now + days * 24 * 60 * 60 * 1000;

    const subscriptions = await ctx.db
      .query("subscriptions")
      .collect();

    const upcoming = subscriptions.filter(
      (s) =>
        s.next_renewal !== undefined &&
        s.next_renewal >= now &&
        s.next_renewal <= cutoff &&
        s.status === "active"
    );

    const enriched = await Promise.all(
      upcoming.map(async (sub) => {
        const branch = await ctx.db.get(sub.branch_id);
        return {
          ...sub,
          branch_name: branch?.name || "Unknown Branch",
          days_until_renewal: Math.ceil(
            (sub.next_renewal! - now) / (24 * 60 * 60 * 1000)
          ),
        };
      })
    );

    return enriched.sort(
      (a, b) => (a.next_renewal ?? 0) - (b.next_renewal ?? 0)
    );
  },
});

/**
 * Get overdue subscriptions (payment_status is 'overdue' or status is 'past_due').
 */
export const getOverdueSubscriptions = query({
  args: {},
  handler: async (ctx) => {
    const subscriptions = await ctx.db.query("subscriptions").collect();

    const overdue = subscriptions.filter(
      (s) => s.payment_status === "overdue" || s.status === "past_due"
    );

    const enriched = await Promise.all(
      overdue.map(async (sub) => {
        const branch = await ctx.db.get(sub.branch_id);
        return {
          ...sub,
          branch_name: branch?.name || "Unknown Branch",
        };
      })
    );

    return enriched;
  },
});

/**
 * Get subscription aggregate stats: total, active, past_due, cancelled, trial, MRR.
 */
export const getSubscriptionStats = query({
  args: {},
  handler: async (ctx) => {
    const subscriptions = await ctx.db.query("subscriptions").collect();

    const total = subscriptions.length;
    const active = subscriptions.filter((s) => s.status === "active").length;
    const past_due = subscriptions.filter((s) => s.status === "past_due").length;
    const cancelled = subscriptions.filter((s) => s.status === "cancelled").length;
    const trial = subscriptions.filter((s) => s.status === "trial").length;
    const suspended = subscriptions.filter((s) => s.status === "suspended").length;

    // Calculate Monthly Recurring Revenue (MRR) from active subscriptions
    const mrr = subscriptions
      .filter((s) => s.status === "active")
      .reduce((sum, s) => {
        switch (s.billing_cycle) {
          case "monthly":
            return sum + s.amount;
          case "quarterly":
            return sum + s.amount / 3;
          case "annual":
            return sum + s.amount / 12;
          default:
            return sum + s.amount;
        }
      }, 0);

    return {
      total,
      active,
      past_due,
      cancelled,
      trial,
      suspended,
      mrr: Math.round(mrr * 100) / 100,
    };
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new subscription for a branch. IT Admin only.
 */
export const createSubscription = mutation({
  args: {
    userId: v.id("users"),
    branch_id: v.id("branches"),
    plan: v.union(
      v.literal("free"),
      v.literal("basic"),
      v.literal("pro"),
      v.literal("enterprise")
    ),
    status: v.union(
      v.literal("active"),
      v.literal("past_due"),
      v.literal("suspended"),
      v.literal("cancelled"),
      v.literal("trial")
    ),
    billing_cycle: v.union(
      v.literal("monthly"),
      v.literal("quarterly"),
      v.literal("annual")
    ),
    amount: v.number(),
    currency: v.optional(v.string()),
    start_date: v.number(),
    end_date: v.optional(v.number()),
    next_renewal: v.optional(v.number()),
    payment_status: v.union(
      v.literal("paid"),
      v.literal("pending"),
      v.literal("failed"),
      v.literal("overdue")
    ),
    auto_renew: v.boolean(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate IT Admin role
    const user = await ctx.db.get(args.userId);
    if (!user || user.role !== "it_admin") {
      throw new Error("Unauthorized: IT Administrator access required");
    }

    const now = Date.now();
    const subscriptionId = await ctx.db.insert("subscriptions", {
      branch_id: args.branch_id,
      plan: args.plan,
      status: args.status,
      billing_cycle: args.billing_cycle,
      amount: args.amount,
      currency: args.currency,
      start_date: args.start_date,
      end_date: args.end_date,
      next_renewal: args.next_renewal,
      payment_status: args.payment_status,
      auto_renew: args.auto_renew,
      notes: args.notes,
      created_by: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, subscriptionId };
  },
});

/**
 * Update an existing subscription. IT Admin only.
 */
export const updateSubscription = mutation({
  args: {
    userId: v.id("users"),
    subscriptionId: v.id("subscriptions"),
    plan: v.optional(
      v.union(
        v.literal("free"),
        v.literal("basic"),
        v.literal("pro"),
        v.literal("enterprise")
      )
    ),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("past_due"),
        v.literal("suspended"),
        v.literal("cancelled"),
        v.literal("trial")
      )
    ),
    billing_cycle: v.optional(
      v.union(
        v.literal("monthly"),
        v.literal("quarterly"),
        v.literal("annual")
      )
    ),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
    end_date: v.optional(v.number()),
    next_renewal: v.optional(v.number()),
    payment_status: v.optional(
      v.union(
        v.literal("paid"),
        v.literal("pending"),
        v.literal("failed"),
        v.literal("overdue")
      )
    ),
    auto_renew: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate IT Admin role
    const user = await ctx.db.get(args.userId);
    if (!user || user.role !== "it_admin") {
      throw new Error("Unauthorized: IT Administrator access required");
    }

    const existing = await ctx.db.get(args.subscriptionId);
    if (!existing) {
      throw new Error("Subscription not found");
    }

    const updates: Record<string, any> = { updatedAt: Date.now() };
    if (args.plan !== undefined) updates.plan = args.plan;
    if (args.status !== undefined) updates.status = args.status;
    if (args.billing_cycle !== undefined) updates.billing_cycle = args.billing_cycle;
    if (args.amount !== undefined) updates.amount = args.amount;
    if (args.currency !== undefined) updates.currency = args.currency;
    if (args.end_date !== undefined) updates.end_date = args.end_date;
    if (args.next_renewal !== undefined) updates.next_renewal = args.next_renewal;
    if (args.payment_status !== undefined) updates.payment_status = args.payment_status;
    if (args.auto_renew !== undefined) updates.auto_renew = args.auto_renew;
    if (args.notes !== undefined) updates.notes = args.notes;

    await ctx.db.patch(args.subscriptionId, updates);

    return { success: true };
  },
});

/**
 * Cancel a subscription. IT Admin only.
 */
export const cancelSubscription = mutation({
  args: {
    userId: v.id("users"),
    subscriptionId: v.id("subscriptions"),
  },
  handler: async (ctx, args) => {
    // Validate IT Admin role
    const user = await ctx.db.get(args.userId);
    if (!user || user.role !== "it_admin") {
      throw new Error("Unauthorized: IT Administrator access required");
    }

    const existing = await ctx.db.get(args.subscriptionId);
    if (!existing) {
      throw new Error("Subscription not found");
    }

    await ctx.db.patch(args.subscriptionId, {
      status: "cancelled",
      auto_renew: false,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Renew a subscription: extends dates based on billing_cycle, resets payment_status to 'paid'.
 * IT Admin only.
 */
export const renewSubscription = mutation({
  args: {
    userId: v.id("users"),
    subscriptionId: v.id("subscriptions"),
  },
  handler: async (ctx, args) => {
    // Validate IT Admin role
    const user = await ctx.db.get(args.userId);
    if (!user || user.role !== "it_admin") {
      throw new Error("Unauthorized: IT Administrator access required");
    }

    const existing = await ctx.db.get(args.subscriptionId);
    if (!existing) {
      throw new Error("Subscription not found");
    }

    const now = Date.now();
    const baseDate = existing.next_renewal && existing.next_renewal > now
      ? existing.next_renewal
      : now;

    // Calculate extension based on billing cycle
    let extensionMs: number;
    switch (existing.billing_cycle) {
      case "monthly":
        extensionMs = 30 * 24 * 60 * 60 * 1000;
        break;
      case "quarterly":
        extensionMs = 90 * 24 * 60 * 60 * 1000;
        break;
      case "annual":
        extensionMs = 365 * 24 * 60 * 60 * 1000;
        break;
      default:
        extensionMs = 30 * 24 * 60 * 60 * 1000;
    }

    const newRenewal = baseDate + extensionMs;

    await ctx.db.patch(args.subscriptionId, {
      status: "active",
      payment_status: "paid",
      last_payment_date: now,
      next_renewal: newRenewal,
      end_date: newRenewal,
      updatedAt: now,
    });

    return { success: true, next_renewal: newRenewal };
  },
});

/**
 * Check if a branch has valid subscription access.
 * Used by the frontend ProtectedRoute to enforce subscription-based access.
 *
 * Returns:
 *  - allowed: true/false
 *  - graceperiod: true if in 30-day grace period
 *  - daysRemaining: days left in grace period (if applicable)
 *  - overdueMonths: how many months overdue (if blocked)
 *  - reason: 'cancelled' | 'expired' | 'no_subscription' (if blocked)
 */
export const checkBranchAccess = query({
  args: {
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    // Get ALL subscriptions for this branch (there may be old cancelled ones + a new active one)
    const allSubs = await ctx.db
      .query("subscriptions")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    // No subscriptions found for this branch
    if (allSubs.length === 0) {
      return {
        allowed: true,
        graceperiod: false,
        reason: null,
      };
    }

    // Prioritize: pick the most relevant subscription
    // 1. Any active/trial/past_due/suspended subscription (non-cancelled)
    // 2. If all are cancelled, use the most recently created one
    const activeSubscription = allSubs.find(
      (s) => s.status !== "cancelled"
    );
    const subscription = activeSubscription || allSubs.sort(
      (a, b) => (b.updatedAt || b._creationTime) - (a.updatedAt || a._creationTime)
    )[0];

    const now = Date.now();
    const GRACE_PERIOD_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

    // Cancelled subscription → blocked immediately (only if ALL subs are cancelled)
    if (subscription.status === "cancelled") {
      return {
        allowed: false,
        graceperiod: false,
        reason: "cancelled" as const,
        overdueMonths: 0,
        message: "Your branch subscription has been cancelled. Please contact your administrator to restore access.",
      };
    }

    // Active and paid → fully allowed, no warnings
    if (
      subscription.status === "active" &&
      subscription.payment_status === "paid"
    ) {
      return { allowed: true, graceperiod: false, reason: null };
    }

    // Trial → allowed
    if (subscription.status === "trial") {
      return { allowed: true, graceperiod: false, reason: null };
    }

    // Active with pending payment → allowed (just created, not overdue yet)
    if (
      subscription.status === "active" &&
      subscription.payment_status === "pending"
    ) {
      const dueDate = subscription.next_renewal || subscription.end_date;
      // If no due date yet or due date is in the future, allow
      if (!dueDate || now <= dueDate) {
        return { allowed: true, graceperiod: false, reason: null };
      }
    }

    // Check overdue: use next_renewal or end_date as the due date
    const dueDate = subscription.next_renewal || subscription.end_date || subscription.start_date;

    if (dueDate && now > dueDate) {
      const overdueMs = now - dueDate;
      const overdueDays = Math.floor(overdueMs / (24 * 60 * 60 * 1000));
      const overdueMonths = Math.ceil(overdueMs / (30 * 24 * 60 * 60 * 1000));

      if (overdueMs > GRACE_PERIOD_MS) {
        // Past grace period → blocked
        return {
          allowed: false,
          graceperiod: false,
          reason: "expired" as const,
          overdueMonths,
          message: `Your branch has ${overdueMonths} month${overdueMonths !== 1 ? "s" : ""} of unpaid subscription. Please contact your administrator to restore access.`,
        };
      } else {
        // Within grace period → allowed with warning
        const daysRemaining = 30 - overdueDays;
        return {
          allowed: true,
          graceperiod: true,
          reason: null,
          daysRemaining,
          overdueMonths: 1,
          message: `Your branch subscription payment is overdue. You have ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} remaining before access is restricted.`,
        };
      }
    }

    // Default: allowed (subscription exists and is not overdue)
    return { allowed: true, graceperiod: false, reason: null };
  },
});
