/**
 * Subscriptions Service - IT Admin Platform Management
 * Manages per-branch SaaS subscriptions (plans, billing, renewals).
 */

import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { logAudit } from "./auditLogs";
import { FEATURE_CATALOG, mergeFeatures } from "../lib/features";

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

// ============================================================================
// PACKAGE ASSIGNMENT + FEATURE OVERRIDES (IT admin only)
// ============================================================================

const PACKAGE_ADMIN_ROLES = new Set(["it_admin", "super_admin"]);

/**
 * Assign or change the subscription package for a branch. Creates the
 * subscription record if none exists yet (trial-style), otherwise patches.
 */
export const assignPackageToBranch = mutation({
  args: {
    branch_id: v.id("branches"),
    package_id: v.id("subscription_packages"),
    assigned_by: v.id("users"),
    // Optional: also adjust billing while assigning
    plan: v.optional(
      v.union(
        v.literal("free"),
        v.literal("basic"),
        v.literal("pro"),
        v.literal("enterprise")
      )
    ),
    billing_cycle: v.optional(
      v.union(v.literal("monthly"), v.literal("quarterly"), v.literal("annual"))
    ),
    amount: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await ctx.db.get(args.assigned_by);
    if (!actor) throw new Error("Actor not found.");
    if (!PACKAGE_ADMIN_ROLES.has(actor.role as any)) {
      throw new Error("Only IT admins or super admins can assign packages.");
    }

    const pkg = await ctx.db.get(args.package_id);
    if (!pkg) throw new Error("Package not found.");
    if (!pkg.is_active) throw new Error("Cannot assign an archived package.");

    const branch = await ctx.db.get(args.branch_id);
    if (!branch) throw new Error("Branch not found.");

    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        package_id: args.package_id,
        ...(args.plan ? { plan: args.plan } : {}),
        ...(args.billing_cycle ? { billing_cycle: args.billing_cycle } : {}),
        ...(args.amount !== undefined ? { amount: args.amount } : {}),
        notes: args.notes ?? existing.notes,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("subscriptions", {
        branch_id: args.branch_id,
        package_id: args.package_id,
        plan: args.plan ?? "basic",
        status: "trial",
        billing_cycle: args.billing_cycle ?? "monthly",
        amount: args.amount ?? 0,
        currency: pkg.currency || "PHP",
        start_date: now,
        payment_status: "pending",
        auto_renew: false,
        notes: args.notes,
        created_by: args.assigned_by,
        createdAt: now,
        updatedAt: now,
      });
    }

    await logAudit(ctx, {
      user_id: args.assigned_by as string,
      user_name: actor.name,
      user_role: actor.role,
      branch_id: args.branch_id as string,
      branch_name: branch.name,
      category: "settings",
      action: "subscription.package_assigned",
      description: `Assigned package "${pkg.name}" to branch ${branch.name}`,
      target_type: "branch",
      target_id: args.branch_id as string,
      metadata: { package_id: args.package_id, package_slug: pkg.slug },
    });

    return { success: true };
  },
});

/**
 * Set a per-branch feature override. Passing value=null clears the override.
 */
export const setFeatureOverride = mutation({
  args: {
    branch_id: v.id("branches"),
    feature_key: v.string(),
    value: v.union(v.boolean(), v.null()),
    reason: v.optional(v.string()),
    updated_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const actor = await ctx.db.get(args.updated_by);
    if (!actor) throw new Error("Actor not found.");
    if (!PACKAGE_ADMIN_ROLES.has(actor.role as any)) {
      throw new Error("Only IT admins or super admins can override features.");
    }

    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .first();
    if (!sub) {
      throw new Error("Branch has no subscription yet — assign a package first.");
    }

    const overrides = { ...(sub.feature_overrides || {}) };
    if (args.value === null) {
      delete overrides[args.feature_key];
    } else {
      overrides[args.feature_key] = args.value;
    }

    await ctx.db.patch(sub._id, {
      feature_overrides: overrides,
      feature_override_notes: args.reason ?? sub.feature_override_notes,
      updatedAt: Date.now(),
    });

    const branch = await ctx.db.get(args.branch_id);
    await logAudit(ctx, {
      user_id: args.updated_by as string,
      user_name: actor.name,
      user_role: actor.role,
      branch_id: args.branch_id as string,
      branch_name: branch?.name,
      category: "settings",
      action:
        args.value === null
          ? "subscription.override_cleared"
          : "subscription.override_set",
      description:
        args.value === null
          ? `Cleared feature override "${args.feature_key}" for ${branch?.name}`
          : `Set feature override "${args.feature_key}" = ${args.value} for ${branch?.name}${args.reason ? ` — ${args.reason}` : ""}`,
      target_type: "branch",
      target_id: args.branch_id as string,
      metadata: { feature_key: args.feature_key, value: args.value, reason: args.reason },
    });

    return { success: true };
  },
});

/**
 * Get the effective features for a branch: package defaults + per-branch
 * overrides applied. Used by useBranchFeatures() and feature gates.
 */
export const getEffectiveFeatures = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .first();

    const pkg = sub?.package_id ? await ctx.db.get(sub.package_id) : null;

    const features = mergeFeatures(
      (pkg?.features as any) || {},
      (sub?.feature_overrides as any) || {}
    );

    return {
      branch_id: args.branch_id,
      package_id: sub?.package_id ?? null,
      package_name: pkg?.name ?? null,
      package_slug: pkg?.slug ?? null,
      has_overrides: !!(sub?.feature_overrides && Object.keys(sub.feature_overrides).length),
      override_count: sub?.feature_overrides ? Object.keys(sub.feature_overrides).length : 0,
      features,
      catalog: FEATURE_CATALOG,
    };
  },
});

// ============================================================================
// TERM DISCOUNTS — commitment-based pricing (admin-side billing only)
// ============================================================================

/**
 * Find the best applicable term discount for a given month count.
 * Tiers are stored sorted ascending; we walk to find the highest tier where
 * `min_months <= term_months`.
 */
function findBestDiscount(
  termDiscounts: any[] | undefined,
  termMonths: number
): { discount_percent: number; tier_min_months: number | null; label: string | null } {
  if (!termDiscounts || termDiscounts.length === 0 || termMonths <= 0) {
    return { discount_percent: 0, tier_min_months: null, label: null };
  }
  let best: any = null;
  for (const tier of termDiscounts) {
    if (tier.min_months <= termMonths) {
      if (!best || tier.discount_percent > best.discount_percent) {
        best = tier;
      }
    }
  }
  return best
    ? {
        discount_percent: best.discount_percent,
        tier_min_months: best.min_months,
        label: best.label ?? null,
      }
    : { discount_percent: 0, tier_min_months: null, label: null };
}

/**
 * Compute pricing for a hypothetical package + term combination. Returns the
 * monthly amount, applied discount, and total term value. Used by the IT
 * admin assignment UI to render "6 months: ₱X (-10%), 12 months: ₱Y (-20%)".
 */
export const previewSubscriptionPricing = query({
  args: {
    package_id: v.id("subscription_packages"),
    term_months: v.number(),
    base_monthly_override: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const pkg = await ctx.db.get(args.package_id);
    if (!pkg) return null;

    const baseMonthly = args.base_monthly_override ?? pkg.monthly_price ?? 0;
    const best = findBestDiscount(pkg.term_discounts as any[] | undefined, args.term_months);
    const discountedMonthly = Math.round(baseMonthly * (1 - best.discount_percent / 100));
    const totalValue = discountedMonthly * args.term_months;
    const savings = Math.max(0, baseMonthly * args.term_months - totalValue);

    return {
      package_id: args.package_id,
      package_name: pkg.name,
      term_months: args.term_months,
      base_monthly: baseMonthly,
      discount_percent: best.discount_percent,
      tier_min_months: best.tier_min_months,
      tier_label: best.label,
      discounted_monthly: discountedMonthly,
      total_term_value: totalValue,
      savings,
      currency: pkg.currency || "PHP",
    };
  },
});

/**
 * Lock in a term commitment on a branch's subscription. Computes the best
 * applicable discount from the package's term_discounts and stores all
 * pricing fields so the IT admin can audit billing later.
 *
 * Visible / billable only to admin — the branch never sees these numbers.
 */
export const setSubscriptionTerm = mutation({
  args: {
    branch_id: v.id("branches"),
    term_months: v.number(),
    set_by: v.id("users"),
    base_monthly_override: v.optional(v.number()), // negotiated price override
    term_notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await ctx.db.get(args.set_by);
    if (!actor) throw new Error("Actor not found.");
    if (!PACKAGE_ADMIN_ROLES.has(actor.role as any)) {
      throw new Error("Only IT admins or super admins can set subscription terms.");
    }
    if (args.term_months <= 0) throw new Error("Term months must be positive.");

    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .first();
    if (!sub) throw new Error("Branch has no subscription yet — assign a package first.");
    if (!sub.package_id) throw new Error("Subscription has no package assigned.");

    const pkg = await ctx.db.get(sub.package_id);
    if (!pkg) throw new Error("Assigned package no longer exists.");

    const baseMonthly = args.base_monthly_override ?? pkg.monthly_price ?? 0;
    const best = findBestDiscount(pkg.term_discounts as any[] | undefined, args.term_months);
    const discountedMonthly = Math.round(baseMonthly * (1 - best.discount_percent / 100));
    const totalValue = discountedMonthly * args.term_months;
    const savings = Math.max(0, baseMonthly * args.term_months - totalValue);

    const now = Date.now();
    const termEnd = new Date(now);
    termEnd.setMonth(termEnd.getMonth() + args.term_months);

    await ctx.db.patch(sub._id, {
      term_months: args.term_months,
      term_start: now,
      term_end: termEnd.getTime(),
      base_monthly_amount: baseMonthly,
      applied_discount_percent: best.discount_percent,
      discounted_monthly_amount: discountedMonthly,
      total_term_value: totalValue,
      term_savings: savings,
      term_notes: args.term_notes,
      // Sync billing fields so existing renewal logic remains coherent
      amount: discountedMonthly,
      next_renewal: termEnd.getTime(),
      updatedAt: now,
    });

    const branch = await ctx.db.get(args.branch_id);
    await logAudit(ctx, {
      user_id: args.set_by as string,
      user_name: actor.name,
      user_role: actor.role,
      branch_id: args.branch_id as string,
      branch_name: branch?.name,
      category: "settings",
      action: "subscription.term_set",
      description: `Set ${args.term_months}-month term for ${branch?.name} on package "${pkg.name}"${best.discount_percent > 0 ? ` (${best.discount_percent}% off, saves ₱${savings})` : ""}`,
      target_type: "branch",
      target_id: args.branch_id as string,
      metadata: {
        package_id: sub.package_id,
        term_months: args.term_months,
        base_monthly: baseMonthly,
        discount_percent: best.discount_percent,
        discounted_monthly: discountedMonthly,
        total_term_value: totalValue,
        savings,
        notes: args.term_notes,
      },
    });

    return {
      success: true,
      term_end: termEnd.getTime(),
      discount_percent: best.discount_percent,
      discounted_monthly: discountedMonthly,
      total_term_value: totalValue,
      savings,
    };
  },
});

