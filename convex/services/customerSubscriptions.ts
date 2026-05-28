/**
 * Customer Subscriptions — recurring "membership-box" plans for registered
 * customers. Distinct from membership_cards (XP/multiplier) and from
 * subscription_packages (SaaS branch-side).
 *
 * Admin defines tiers (e.g., Bronze/Silver/Gold) with per-period allocations
 * of free services + free products. Customers either self-serve apply (paid
 * at checkout) or admins assign them directly. At POS, each redemption
 * decrements the appropriate counter.
 */

import { v } from "convex/values";
import { mutation, query, internalMutation } from "../_generated/server";
import { logAudit } from "./auditLogs";

const ADMIN_ROLES = new Set(["admin", "super_admin", "it_admin", "branch_admin"]);

async function requireAdmin(ctx: any, userId: string) {
  const user = await ctx.db.get(userId as any);
  if (!user) throw new Error("User not found.");
  if (!ADMIN_ROLES.has(user.role)) {
    throw new Error("Admin role required.");
  }
  return user;
}

function addPeriod(start: number, period: string): number {
  const d = new Date(start);
  if (period === "monthly") d.setMonth(d.getMonth() + 1);
  else if (period === "quarterly") d.setMonth(d.getMonth() + 3);
  else if (period === "annual") d.setFullYear(d.getFullYear() + 1);
  return d.getTime();
}

// ============================================================================
// TIER CRUD (admin only)
// ============================================================================

export const listTiers = query({
  args: { include_inactive: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    let rows = await ctx.db.query("customer_subscription_tiers").collect();
    if (!args.include_inactive) rows = rows.filter((r) => r.is_active);
    return rows.sort(
      (a, b) => (a.display_order ?? 999) - (b.display_order ?? 999)
    );
  },
});

export const getTierById = query({
  args: { tier_id: v.id("customer_subscription_tiers") },
  handler: async (ctx, args) => ctx.db.get(args.tier_id),
});

export const getTierBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) =>
    ctx.db
      .query("customer_subscription_tiers")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first(),
});

export const createTier = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    service_allocations: v.number(),
    product_allocations: v.number(),
    service_max_value: v.optional(v.number()),
    product_max_value: v.optional(v.number()),
    period_type: v.union(
      v.literal("monthly"),
      v.literal("quarterly"),
      v.literal("annual")
    ),
    price: v.number(),
    currency: v.optional(v.string()),
    perks: v.optional(v.array(v.string())),
    display_order: v.optional(v.number()),
    created_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, args.created_by as any);
    if (!args.name.trim()) throw new Error("Tier name required.");
    if (!args.slug.trim()) throw new Error("Tier slug required.");
    if (args.service_allocations < 0 || args.product_allocations < 0) {
      throw new Error("Allocations must be 0 or higher.");
    }
    const existing = await ctx.db
      .query("customer_subscription_tiers")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (existing) throw new Error(`Slug "${args.slug}" already exists.`);

    const now = Date.now();
    const id = await ctx.db.insert("customer_subscription_tiers", {
      name: args.name.trim(),
      slug: args.slug.trim(),
      description: args.description?.trim(),
      is_active: true,
      display_order: args.display_order,
      service_allocations: args.service_allocations,
      product_allocations: args.product_allocations,
      service_max_value: args.service_max_value,
      product_max_value: args.product_max_value,
      period_type: args.period_type,
      price: args.price,
      currency: args.currency || "PHP",
      perks: args.perks,
      created_by: args.created_by,
      created_at: now,
      updated_at: now,
    });

    await logAudit(ctx, {
      user_id: args.created_by as string,
      user_name: actor.name,
      user_role: actor.role,
      category: "settings",
      action: "customer_subscription_tier.created",
      description: `Created customer subscription tier "${args.name}"`,
      target_type: "customer_subscription_tier",
      target_id: id,
      metadata: { slug: args.slug, period: args.period_type, price: args.price },
    });

    return { tier_id: id };
  },
});

export const updateTier = mutation({
  args: {
    tier_id: v.id("customer_subscription_tiers"),
    updated_by: v.id("users"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    service_allocations: v.optional(v.number()),
    product_allocations: v.optional(v.number()),
    service_max_value: v.optional(v.number()),
    product_max_value: v.optional(v.number()),
    period_type: v.optional(
      v.union(v.literal("monthly"), v.literal("quarterly"), v.literal("annual"))
    ),
    price: v.optional(v.number()),
    currency: v.optional(v.string()),
    perks: v.optional(v.array(v.string())),
    display_order: v.optional(v.number()),
    is_active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, args.updated_by as any);
    const tier = await ctx.db.get(args.tier_id);
    if (!tier) throw new Error("Tier not found.");

    const patch: Record<string, any> = { updated_at: Date.now() };
    for (const key of [
      "name", "description", "service_allocations", "product_allocations",
      "service_max_value", "product_max_value", "period_type",
      "price", "currency", "perks", "display_order", "is_active",
    ] as const) {
      if ((args as any)[key] !== undefined) patch[key] = (args as any)[key];
    }
    await ctx.db.patch(args.tier_id, patch);

    await logAudit(ctx, {
      user_id: args.updated_by as string,
      user_name: actor.name,
      user_role: actor.role,
      category: "settings",
      action: "customer_subscription_tier.updated",
      description: `Updated customer subscription tier "${tier.name}"`,
      target_type: "customer_subscription_tier",
      target_id: args.tier_id,
      metadata: { changes: patch },
    });

    return { success: true };
  },
});

export const archiveTier = mutation({
  args: {
    tier_id: v.id("customer_subscription_tiers"),
    updated_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, args.updated_by as any);
    const tier = await ctx.db.get(args.tier_id);
    if (!tier) throw new Error("Tier not found.");

    const inUse = await ctx.db
      .query("customer_subscriptions")
      .withIndex("by_tier", (q) => q.eq("tier_id", args.tier_id))
      .filter((q) =>
        q.or(q.eq(q.field("status"), "active"), q.eq(q.field("status"), "pending"))
      )
      .first();
    if (inUse) {
      throw new Error("This tier still has active/pending subscribers. Cancel them first.");
    }

    await ctx.db.patch(args.tier_id, { is_active: false, updated_at: Date.now() });

    await logAudit(ctx, {
      user_id: args.updated_by as string,
      user_name: actor.name,
      user_role: actor.role,
      category: "settings",
      action: "customer_subscription_tier.archived",
      description: `Archived customer subscription tier "${tier.name}"`,
      target_type: "customer_subscription_tier",
      target_id: args.tier_id,
    });

    return { success: true };
  },
});

// ============================================================================
// SUBSCRIPTION LIFECYCLE
// ============================================================================

/**
 * Apply for a subscription. Works for both flows:
 *   - applied_via="self_serve": customer creates pending application
 *   - applied_via="admin": admin assigns + (optionally) auto-activates
 * If auto_activate is true and the actor is admin, status starts as "active".
 */
export const applyForSubscription = mutation({
  args: {
    customer_id: v.id("users"),
    tier_id: v.id("customer_subscription_tiers"),
    applied_by: v.id("users"),
    applied_via: v.union(v.literal("admin"), v.literal("self_serve")),
    branch_id: v.optional(v.id("branches")),
    auto_activate: v.optional(v.boolean()),
    payment_method: v.optional(v.string()),
    last_payment_amount: v.optional(v.number()),
    auto_renew: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tier = await ctx.db.get(args.tier_id);
    if (!tier) throw new Error("Tier not found.");
    if (!tier.is_active) throw new Error("This tier is no longer available.");

    const customer = await ctx.db.get(args.customer_id);
    if (!customer) throw new Error("Customer not found.");

    // Prevent duplicate active/pending subscriptions for the same customer
    const existing = await ctx.db
      .query("customer_subscriptions")
      .withIndex("by_customer", (q) => q.eq("customer_id", args.customer_id))
      .filter((q) =>
        q.or(q.eq(q.field("status"), "active"), q.eq(q.field("status"), "pending"))
      )
      .first();
    if (existing) {
      throw new Error(
        existing.status === "active"
          ? "Customer already has an active subscription. Cancel it first."
          : "Customer already has a pending application."
      );
    }

    const now = Date.now();
    let willActivate = false;

    if (args.applied_via === "admin" && args.auto_activate) {
      const actor = await requireAdmin(ctx, args.applied_by as any);
      willActivate = true;
      var activator = actor; // for audit reuse
    }

    const status = willActivate ? "active" : "pending";
    const periodStart = willActivate ? now : undefined;
    const periodEnd = willActivate ? addPeriod(now, tier.period_type) : undefined;

    const id = await ctx.db.insert("customer_subscriptions", {
      customer_id: args.customer_id,
      tier_id: args.tier_id,
      branch_id: args.branch_id,
      status,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      services_remaining: willActivate ? tier.service_allocations : 0,
      products_remaining: willActivate ? tier.product_allocations : 0,
      services_used_this_period: 0,
      products_used_this_period: 0,
      applied_at: now,
      activated_at: willActivate ? now : undefined,
      activated_by: willActivate ? args.applied_by : undefined,
      ends_at: undefined,
      applied_via: args.applied_via,
      applied_by: args.applied_by,
      payment_method: args.payment_method,
      last_payment_at: willActivate && args.last_payment_amount ? now : undefined,
      last_payment_amount: args.last_payment_amount,
      next_billing_at: willActivate ? periodEnd : undefined,
      auto_renew: args.auto_renew ?? false,
      notes: args.notes,
      created_at: now,
      updated_at: now,
    });

    await logAudit(ctx, {
      user_id: args.applied_by as string,
      user_name: customer.name,
      branch_id: args.branch_id as any,
      category: "user",
      action: willActivate
        ? "customer_subscription.activated_on_apply"
        : "customer_subscription.applied",
      description: `${args.applied_via === "self_serve" ? "Customer applied" : "Admin assigned"} ${customer.name || "customer"} → "${tier.name}"${willActivate ? " (auto-activated)" : ""}`,
      target_type: "customer_subscription",
      target_id: id,
      metadata: {
        tier_id: args.tier_id,
        tier_slug: tier.slug,
        applied_via: args.applied_via,
        auto_activated: willActivate,
        period_type: tier.period_type,
      },
    });

    return { subscription_id: id, status };
  },
});

/**
 * Approve a pending application — admin only. Sets period window and seeds
 * the period's allocations from the tier.
 */
export const activateSubscription = mutation({
  args: {
    subscription_id: v.id("customer_subscriptions"),
    approved_by: v.id("users"),
    payment_received: v.optional(v.number()),
    payment_method: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, args.approved_by as any);
    const sub = await ctx.db.get(args.subscription_id);
    if (!sub) throw new Error("Subscription not found.");
    if (sub.status !== "pending") {
      throw new Error(`Cannot activate a ${sub.status} subscription.`);
    }
    const tier = await ctx.db.get(sub.tier_id);
    if (!tier) throw new Error("Tier no longer exists.");

    const now = Date.now();
    const periodEnd = addPeriod(now, tier.period_type);

    await ctx.db.patch(args.subscription_id, {
      status: "active",
      current_period_start: now,
      current_period_end: periodEnd,
      services_remaining: tier.service_allocations,
      products_remaining: tier.product_allocations,
      services_used_this_period: 0,
      products_used_this_period: 0,
      activated_at: now,
      activated_by: args.approved_by,
      payment_method: args.payment_method ?? sub.payment_method,
      last_payment_at: args.payment_received ? now : sub.last_payment_at,
      last_payment_amount: args.payment_received ?? sub.last_payment_amount,
      next_billing_at: periodEnd,
      updated_at: now,
    });

    const customer = await ctx.db.get(sub.customer_id);
    await logAudit(ctx, {
      user_id: args.approved_by as string,
      user_name: actor.name,
      user_role: actor.role,
      branch_id: sub.branch_id as any,
      category: "user",
      action: "customer_subscription.activated",
      description: `Activated ${customer?.name || "customer"}'s subscription to "${tier.name}"`,
      target_type: "customer_subscription",
      target_id: args.subscription_id,
      metadata: {
        customer_id: sub.customer_id,
        tier_id: sub.tier_id,
        payment_received: args.payment_received,
      },
    });

    return { success: true, period_end: periodEnd };
  },
});

export const cancelSubscription = mutation({
  args: {
    subscription_id: v.id("customer_subscriptions"),
    cancelled_by: v.id("users"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sub = await ctx.db.get(args.subscription_id);
    if (!sub) throw new Error("Subscription not found.");
    if (sub.status === "cancelled" || sub.status === "expired") {
      throw new Error(`Subscription is already ${sub.status}.`);
    }
    // Allow customer to cancel their own — otherwise admin role required
    const actor = await ctx.db.get(args.cancelled_by);
    if (!actor) throw new Error("Actor not found.");
    const isOwner = sub.customer_id === args.cancelled_by;
    if (!isOwner && !ADMIN_ROLES.has(actor.role as any)) {
      throw new Error("Only the customer or an admin can cancel.");
    }

    const now = Date.now();
    await ctx.db.patch(args.subscription_id, {
      status: "cancelled",
      cancelled_at: now,
      cancelled_by: args.cancelled_by,
      cancel_reason: args.reason,
      updated_at: now,
    });

    const customer = await ctx.db.get(sub.customer_id);
    const tier = await ctx.db.get(sub.tier_id);
    await logAudit(ctx, {
      user_id: args.cancelled_by as string,
      user_name: actor.name,
      user_role: actor.role,
      branch_id: sub.branch_id as any,
      category: "user",
      action: "customer_subscription.cancelled",
      description: `${isOwner ? "Customer cancelled" : "Admin cancelled"} ${customer?.name || "customer"}'s "${tier?.name || "subscription"}"${args.reason ? ` — ${args.reason}` : ""}`,
      target_type: "customer_subscription",
      target_id: args.subscription_id,
      metadata: { cancelled_by_role: actor.role, reason: args.reason },
    });

    return { success: true };
  },
});

// ============================================================================
// REDEMPTION — called from POS / staff when customer uses a free service/product
// ============================================================================

export const redeemEntitlement = mutation({
  args: {
    customer_id: v.id("users"),
    redemption_type: v.union(v.literal("service"), v.literal("product")),
    item_id: v.string(),
    item_name: v.string(),
    item_price: v.number(),
    redeemed_by: v.id("users"),
    branch_id: v.optional(v.id("branches")),
    transaction_id: v.optional(v.id("transactions")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sub = await ctx.db
      .query("customer_subscriptions")
      .withIndex("by_customer", (q) =>
        q.eq("customer_id", args.customer_id).eq("status", "active")
      )
      .first();
    if (!sub) throw new Error("Customer has no active subscription.");

    const tier = await ctx.db.get(sub.tier_id);
    if (!tier) throw new Error("Tier no longer exists.");

    // Period sanity — staff might be redeeming on a stale period that the
    // cron hasn't rolled yet. If the period has expired, fail cleanly.
    if (sub.current_period_end && sub.current_period_end < Date.now()) {
      throw new Error("Current subscription period has ended. Awaiting renewal.");
    }

    // Value cap (optional)
    if (args.redemption_type === "service") {
      if (tier.service_max_value && args.item_price > tier.service_max_value) {
        throw new Error(
          `This service (₱${args.item_price}) exceeds the tier's per-service cap of ₱${tier.service_max_value}.`
        );
      }
      if (sub.services_remaining <= 0) {
        throw new Error("No free services remaining this period.");
      }
    } else {
      if (tier.product_max_value && args.item_price > tier.product_max_value) {
        throw new Error(
          `This product (₱${args.item_price}) exceeds the tier's per-product cap of ₱${tier.product_max_value}.`
        );
      }
      if (sub.products_remaining <= 0) {
        throw new Error("No free products remaining this period.");
      }
    }

    const now = Date.now();
    const patch: any = { updated_at: now };
    if (args.redemption_type === "service") {
      patch.services_remaining = sub.services_remaining - 1;
      patch.services_used_this_period = (sub.services_used_this_period || 0) + 1;
    } else {
      patch.products_remaining = sub.products_remaining - 1;
      patch.products_used_this_period = (sub.products_used_this_period || 0) + 1;
    }
    await ctx.db.patch(sub._id, patch);

    const redemptionId = await ctx.db.insert("customer_subscription_redemptions", {
      subscription_id: sub._id,
      customer_id: args.customer_id,
      redemption_type: args.redemption_type,
      item_id: args.item_id,
      item_name: args.item_name,
      item_price: args.item_price,
      branch_id: args.branch_id,
      redeemed_by: args.redeemed_by,
      redeemed_at: now,
      transaction_id: args.transaction_id,
      period_start: sub.current_period_start,
      notes: args.notes,
    });

    const customer = await ctx.db.get(args.customer_id);
    const staff = await ctx.db.get(args.redeemed_by);
    await logAudit(ctx, {
      user_id: args.redeemed_by as string,
      user_name: staff?.name,
      user_role: staff?.role,
      branch_id: args.branch_id as any,
      category: "transaction",
      action: "customer_subscription.redeemed",
      description: `${customer?.name || "Customer"} redeemed a free ${args.redemption_type}: ${args.item_name} (₱${args.item_price})`,
      target_type: "customer_subscription",
      target_id: sub._id as string,
      metadata: {
        redemption_id: redemptionId,
        redemption_type: args.redemption_type,
        item_id: args.item_id,
        item_price: args.item_price,
        services_remaining: patch.services_remaining ?? sub.services_remaining,
        products_remaining: patch.products_remaining ?? sub.products_remaining,
      },
    });

    return {
      success: true,
      redemption_id: redemptionId,
      services_remaining: patch.services_remaining ?? sub.services_remaining,
      products_remaining: patch.products_remaining ?? sub.products_remaining,
    };
  },
});

// ============================================================================
// QUERIES — list / detail
// ============================================================================

export const getActiveSubscription = query({
  args: { customer_id: v.id("users") },
  handler: async (ctx, args) => {
    const sub = await ctx.db
      .query("customer_subscriptions")
      .withIndex("by_customer", (q) =>
        q.eq("customer_id", args.customer_id).eq("status", "active")
      )
      .first();
    if (!sub) return null;
    const tier = await ctx.db.get(sub.tier_id);
    return { ...sub, tier };
  },
});

export const getSubscriptionsByStatus = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("active"),
        v.literal("paused"),
        v.literal("cancelled"),
        v.literal("expired")
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit || 200, 500);
    let rows;
    if (args.status) {
      rows = await ctx.db
        .query("customer_subscriptions")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(limit);
    } else {
      rows = await ctx.db
        .query("customer_subscriptions")
        .order("desc")
        .take(limit);
    }

    // Enrich with customer + tier
    const enriched = await Promise.all(
      rows.map(async (r) => {
        const customer = await ctx.db.get(r.customer_id);
        const tier = await ctx.db.get(r.tier_id);
        return {
          ...r,
          customer_name: customer?.name || customer?.email || "Unknown",
          customer_email: customer?.email,
          tier_name: tier?.name,
          tier_slug: tier?.slug,
          tier_period: tier?.period_type,
        };
      })
    );
    return enriched;
  },
});

export const getSubscriptionRedemptions = query({
  args: { subscription_id: v.id("customer_subscriptions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("customer_subscription_redemptions")
      .withIndex("by_subscription", (q) =>
        q.eq("subscription_id", args.subscription_id)
      )
      .order("desc")
      .take(200);
  },
});

// ============================================================================
// CRON — daily period rollover + expiry
// ============================================================================

/**
 * Daily maintenance: for every active subscription whose current period has
 * ended, refresh allocations (if auto_renew) or mark expired (if not).
 * Idempotent — safe to run repeatedly.
 */
export const dailySubscriptionMaintenance = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const active = await ctx.db
      .query("customer_subscriptions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    let renewed = 0;
    let expired = 0;

    for (const sub of active) {
      if (!sub.current_period_end || sub.current_period_end > now) continue;

      const tier = await ctx.db.get(sub.tier_id);
      if (!tier) {
        // Orphaned — mark expired
        await ctx.db.patch(sub._id, { status: "expired", updated_at: now });
        expired++;
        continue;
      }

      if (sub.auto_renew) {
        const newEnd = addPeriod(now, tier.period_type);
        await ctx.db.patch(sub._id, {
          current_period_start: now,
          current_period_end: newEnd,
          services_remaining: tier.service_allocations,
          products_remaining: tier.product_allocations,
          services_used_this_period: 0,
          products_used_this_period: 0,
          next_billing_at: newEnd,
          last_payment_at: now,
          last_payment_amount: tier.price,
          updated_at: now,
        });
        renewed++;
      } else {
        await ctx.db.patch(sub._id, {
          status: "expired",
          ends_at: sub.current_period_end,
          updated_at: now,
        });
        expired++;
      }
    }

    console.log(
      `[CustomerSubscriptions] Maintenance: ${renewed} renewed, ${expired} expired`
    );
    return { renewed, expired };
  },
});
