/**
 * Flash Promotions Service
 *
 * Manages time-limited promotional events for the loyalty program.
 * Supports bonus points multipliers, flat bonuses, and wallet bonuses.
 *
 * Story 20.1: Flash Promo Schema
 * @module convex/services/promotions
 */

import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all promotions (for admin view)
 * Optionally filter by branch or status
 */
export const getPromotions = query({
  args: {
    branchId: v.optional(v.id("branches")),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("scheduled"),
        v.literal("active"),
        v.literal("ended"),
        v.literal("cancelled")
      )
    ),
    includeSystemWide: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let promotions;

    if (args.branchId) {
      // Get branch-specific promotions
      promotions = await ctx.db
        .query("flash_promotions")
        .withIndex("by_branch", (q) => q.eq("branch_id", args.branchId))
        .collect();

      // Optionally include system-wide promotions
      if (args.includeSystemWide) {
        const systemWide = await ctx.db
          .query("flash_promotions")
          .withIndex("by_branch", (q) => q.eq("branch_id", undefined))
          .collect();
        promotions = [...promotions, ...systemWide];
      }
    } else {
      // Get all promotions
      promotions = await ctx.db.query("flash_promotions").collect();
    }

    // Filter by status if specified
    if (args.status) {
      promotions = promotions.filter((p) => p.status === args.status);
    }

    // Sort by created_at desc
    promotions.sort((a, b) => b.created_at - a.created_at);

    // Enrich with branch info
    const enriched = await Promise.all(
      promotions.map(async (promo) => {
        let branchName = "System-wide";
        if (promo.branch_id) {
          const branch = await ctx.db.get(promo.branch_id);
          branchName = branch?.name || "Unknown Branch";
        }
        return {
          ...promo,
          branchName,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get a single promotion by ID
 */
export const getPromotion = query({
  args: { promoId: v.id("flash_promotions") },
  handler: async (ctx, args) => {
    const promo = await ctx.db.get(args.promoId);
    if (!promo) return null;

    let branchName = "System-wide";
    if (promo.branch_id) {
      const branch = await ctx.db.get(promo.branch_id);
      branchName = branch?.name || "Unknown Branch";
    }

    const creator = await ctx.db.get(promo.created_by);

    return {
      ...promo,
      branchName,
      createdByName: creator?.username || "Unknown",
    };
  },
});

/**
 * Get active promotions for a branch (for customer view)
 * Returns promotions that are currently active and applicable
 */
export const getActivePromotions = query({
  args: {
    branchId: v.optional(v.id("branches")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get active promotions for the branch
    let promotions = await ctx.db
      .query("flash_promotions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    // Filter by branch (include system-wide + branch-specific)
    if (args.branchId) {
      promotions = promotions.filter(
        (p) => !p.branch_id || p.branch_id === args.branchId
      );
    }

    // Filter by date range
    promotions = promotions.filter(
      (p) => p.start_at <= now && p.end_at >= now
    );

    // Filter out templates
    promotions = promotions.filter((p) => !p.is_template);

    // Check user eligibility if userId provided
    if (args.userId) {
      const user = await ctx.db.get(args.userId);
      const userTier = user?.current_tier_id
        ? await ctx.db.get(user.current_tier_id)
        : null;

      const eligiblePromos = await Promise.all(
        promotions.map(async (promo) => {
          // Check tier requirement
          if (promo.tier_requirement) {
            const tierRank = { bronze: 1, silver: 2, gold: 3, platinum: 4 };
            const userRank = tierRank[userTier?.name?.toLowerCase() as keyof typeof tierRank] || 1;
            const requiredRank = tierRank[promo.tier_requirement];
            if (userRank < requiredRank) {
              return null; // User doesn't meet tier requirement
            }
          }

          // Check max uses
          if (promo.max_uses && promo.total_uses >= promo.max_uses) {
            return null; // Promo is maxed out
          }

          // Check per-user limit
          if (promo.max_uses_per_user) {
            const userUsage = await ctx.db
              .query("promo_usage")
              .withIndex("by_promo_user", (q) =>
                q.eq("promo_id", promo._id).eq("user_id", args.userId!)
              )
              .collect();
            if (userUsage.length >= promo.max_uses_per_user) {
              return null; // User has reached their limit
            }
          }

          return promo;
        })
      );

      promotions = eligiblePromos.filter((p): p is NonNullable<typeof p> => p !== null);
    }

    // Calculate time remaining for each promo
    return promotions.map((promo) => ({
      ...promo,
      hoursRemaining: Math.max(0, Math.floor((promo!.end_at - now) / (60 * 60 * 1000))),
      isEndingSoon: promo!.end_at - now < 24 * 60 * 60 * 1000, // Within 24 hours
    }));
  },
});

/**
 * Get promo templates (Super Admin only)
 */
export const getPromoTemplates = query({
  args: {},
  handler: async (ctx) => {
    const templates = await ctx.db
      .query("flash_promotions")
      .filter((q) => q.eq(q.field("is_template"), true))
      .collect();

    return templates.sort((a, b) => b.created_at - a.created_at);
  },
});

/**
 * Get promo usage stats
 */
export const getPromoUsageStats = query({
  args: { promoId: v.id("flash_promotions") },
  handler: async (ctx, args) => {
    const usage = await ctx.db
      .query("promo_usage")
      .withIndex("by_promo", (q) => q.eq("promo_id", args.promoId))
      .collect();

    const totalBonusPoints = usage.reduce((sum, u) => sum + u.bonus_points, 0);
    const uniqueUsers = new Set(usage.map((u) => u.user_id)).size;

    return {
      totalUses: usage.length,
      uniqueUsers,
      totalBonusPoints,
      recentUsage: usage.slice(0, 10).sort((a, b) => b.used_at - a.used_at),
    };
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new flash promotion
 */
export const createPromotion = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    type: v.union(
      v.literal("bonus_points"),
      v.literal("flat_bonus"),
      v.literal("wallet_bonus")
    ),
    multiplier: v.optional(v.number()),
    flat_amount: v.optional(v.number()),
    branchId: v.optional(v.id("branches")),
    isTemplate: v.optional(v.boolean()),
    tierRequirement: v.optional(
      v.union(
        v.literal("bronze"),
        v.literal("silver"),
        v.literal("gold"),
        v.literal("platinum")
      )
    ),
    minPurchase: v.optional(v.number()),
    newCustomersOnly: v.optional(v.boolean()),
    maxUses: v.optional(v.number()),
    maxUsesPerUser: v.optional(v.number()),
    startAt: v.number(),
    endAt: v.number(),
    status: v.optional(
      v.union(v.literal("draft"), v.literal("scheduled"), v.literal("active"))
    ),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Validate dates
    if (args.endAt <= args.startAt) {
      throw new Error("End date must be after start date");
    }

    // Validate type-specific fields
    if (args.type === "bonus_points" && !args.multiplier) {
      throw new Error("Multiplier is required for bonus_points type");
    }
    if ((args.type === "flat_bonus" || args.type === "wallet_bonus") && !args.flat_amount) {
      throw new Error("Flat amount is required for flat_bonus/wallet_bonus type");
    }

    // Determine initial status
    let status = args.status || "draft";
    if (status === "scheduled" && args.startAt <= now) {
      status = "active";
    }

    const promoId = await ctx.db.insert("flash_promotions", {
      name: args.name,
      description: args.description,
      type: args.type,
      multiplier: args.multiplier,
      flat_amount: args.flat_amount,
      branch_id: args.branchId,
      is_template: args.isTemplate,
      tier_requirement: args.tierRequirement,
      min_purchase: args.minPurchase,
      new_customers_only: args.newCustomersOnly,
      max_uses: args.maxUses,
      max_uses_per_user: args.maxUsesPerUser || 1,
      start_at: args.startAt,
      end_at: args.endAt,
      status,
      total_uses: 0,
      created_by: args.createdBy,
      created_at: now,
      updated_at: now,
    });

    console.log("[PROMOTIONS] Created promotion:", { promoId, name: args.name, type: args.type });

    return { promoId, status };
  },
});

/**
 * Update a promotion (only if draft or scheduled)
 */
export const updatePromotion = mutation({
  args: {
    promoId: v.id("flash_promotions"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    multiplier: v.optional(v.number()),
    flat_amount: v.optional(v.number()),
    tierRequirement: v.optional(
      v.union(
        v.literal("bronze"),
        v.literal("silver"),
        v.literal("gold"),
        v.literal("platinum")
      )
    ),
    minPurchase: v.optional(v.number()),
    maxUses: v.optional(v.number()),
    maxUsesPerUser: v.optional(v.number()),
    startAt: v.optional(v.number()),
    endAt: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("scheduled"),
        v.literal("active"),
        v.literal("cancelled")
      )
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const promo = await ctx.db.get(args.promoId);

    if (!promo) {
      throw new Error("Promotion not found");
    }

    // Only allow editing draft/scheduled promos (except for cancellation)
    if (promo.status === "active" && args.status !== "cancelled") {
      throw new Error("Cannot edit active promotions. You can only cancel them.");
    }

    if (promo.status === "ended" || promo.status === "cancelled") {
      throw new Error("Cannot edit ended or cancelled promotions");
    }

    const updates: Record<string, unknown> = { updated_at: now };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.multiplier !== undefined) updates.multiplier = args.multiplier;
    if (args.flat_amount !== undefined) updates.flat_amount = args.flat_amount;
    if (args.tierRequirement !== undefined) updates.tier_requirement = args.tierRequirement;
    if (args.minPurchase !== undefined) updates.min_purchase = args.minPurchase;
    if (args.maxUses !== undefined) updates.max_uses = args.maxUses;
    if (args.maxUsesPerUser !== undefined) updates.max_uses_per_user = args.maxUsesPerUser;
    if (args.startAt !== undefined) updates.start_at = args.startAt;
    if (args.endAt !== undefined) updates.end_at = args.endAt;
    if (args.status !== undefined) updates.status = args.status;

    await ctx.db.patch(args.promoId, updates);

    return { success: true };
  },
});

/**
 * End a promotion early
 */
export const endPromotion = mutation({
  args: { promoId: v.id("flash_promotions") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const promo = await ctx.db.get(args.promoId);

    if (!promo) {
      throw new Error("Promotion not found");
    }

    if (promo.status !== "active") {
      throw new Error("Can only end active promotions");
    }

    await ctx.db.patch(args.promoId, {
      status: "ended",
      end_at: now,
      updated_at: now,
    });

    console.log("[PROMOTIONS] Ended promotion early:", { promoId: args.promoId });

    return { success: true };
  },
});

/**
 * Record promo usage (called when a transaction uses a promo)
 */
export const recordPromoUsage = mutation({
  args: {
    promoId: v.id("flash_promotions"),
    userId: v.id("users"),
    branchId: v.optional(v.id("branches")),
    transactionId: v.optional(v.string()),
    pointsEarned: v.number(),
    bonusPoints: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Record usage
    await ctx.db.insert("promo_usage", {
      promo_id: args.promoId,
      user_id: args.userId,
      branch_id: args.branchId,
      transaction_id: args.transactionId,
      points_earned: args.pointsEarned,
      bonus_points: args.bonusPoints,
      used_at: now,
    });

    // Increment total_uses counter
    const promo = await ctx.db.get(args.promoId);
    if (promo) {
      await ctx.db.patch(args.promoId, {
        total_uses: promo.total_uses + 1,
        updated_at: now,
      });
    }

    return { success: true };
  },
});

/**
 * Update promo statuses (should be called periodically)
 * Activates scheduled promos and ends expired ones
 */
export const updatePromoStatuses = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let activated = 0;
    let ended = 0;

    // Find scheduled promos that should be active
    const scheduledPromos = await ctx.db
      .query("flash_promotions")
      .withIndex("by_status", (q) => q.eq("status", "scheduled"))
      .collect();

    for (const promo of scheduledPromos) {
      if (promo.start_at <= now && promo.end_at > now) {
        await ctx.db.patch(promo._id, { status: "active", updated_at: now });
        activated++;
      }
    }

    // Find active promos that should be ended
    const activePromos = await ctx.db
      .query("flash_promotions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    for (const promo of activePromos) {
      if (promo.end_at <= now) {
        await ctx.db.patch(promo._id, { status: "ended", updated_at: now });
        ended++;
      }
    }

    return { activated, ended };
  },
});

/**
 * Get aggregate promo statistics (for dashboard summary)
 * Story 20.5: Promo Performance Tracking
 */
export const getAggregatePromoStats = query({
  args: {
    branchId: v.optional(v.id("branches")),
  },
  handler: async (ctx, args) => {
    // Get all promo usage records
    const allUsage = await ctx.db.query("promo_usage").collect();

    // Filter by branch if specified
    const filteredUsage = args.branchId
      ? allUsage.filter((u) => !u.branch_id || u.branch_id === args.branchId)
      : allUsage;

    // Calculate aggregates
    const totalUses = filteredUsage.length;
    const totalBonusPoints = filteredUsage.reduce(
      (sum, u) => sum + (u.bonus_points || 0),
      0
    );
    const uniqueUsers = new Set(filteredUsage.map((u) => u.user_id)).size;
    const uniquePromos = new Set(filteredUsage.map((u) => u.promo_id)).size;

    // Get usage by day (last 7 days)
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const recentUsage = filteredUsage.filter((u) => u.used_at >= sevenDaysAgo);

    // Group by day
    const usageByDay: Record<string, number> = {};
    recentUsage.forEach((u) => {
      const day = new Date(u.used_at).toISOString().split("T")[0];
      usageByDay[day] = (usageByDay[day] || 0) + 1;
    });

    // Get top performing promos (by usage count)
    const promoUsageCounts: Record<string, number> = {};
    filteredUsage.forEach((u) => {
      promoUsageCounts[u.promo_id] = (promoUsageCounts[u.promo_id] || 0) + 1;
    });

    const topPromoIds = Object.entries(promoUsageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);

    const topPromos = await Promise.all(
      topPromoIds.map(async (id) => {
        const promo = await ctx.db.get(id as any);
        return promo
          ? {
              id: promo._id,
              name: promo.name,
              type: promo.type,
              uses: promoUsageCounts[id],
            }
          : null;
      })
    );

    return {
      totalUses,
      totalBonusPoints,
      uniqueUsers,
      uniquePromos,
      usageByDay,
      topPromos: topPromos.filter((p) => p !== null),
      recentUsageCount: recentUsage.length,
    };
  },
});
