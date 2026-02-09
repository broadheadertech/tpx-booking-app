/**
 * Points Service
 *
 * Handles loyalty points ledger and transaction operations.
 * Uses integer ×100 storage pattern (4575 = 45.75 points).
 *
 * @module convex/services/points
 */

import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

/**
 * Get user's points ledger (balance and lifetime stats)
 * Returns null if no ledger exists yet
 */
export const getPointsLedger = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("points_ledger")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .unique();
  },
});

/**
 * Ensure user has a points ledger, creating one if needed
 * Returns the ledger ID
 */
export const ensurePointsLedger = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("points_ledger")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .unique();

    if (existing) {
      return existing._id;
    }

    // Create new ledger with 0 balance
    const ledgerId = await ctx.db.insert("points_ledger", {
      user_id: args.userId,
      current_balance: 0, // Integer ×100
      lifetime_earned: 0, // Integer ×100
      lifetime_redeemed: 0, // Integer ×100
      last_activity_at: Date.now(),
    });

    return ledgerId;
  },
});

/**
 * Get user's points transaction history
 * Ordered by most recent first
 */
export const getPointsHistory = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("points_transactions")
      .withIndex("by_user_created", (q) => q.eq("user_id", args.userId))
      .order("desc")
      .collect();

    return args.limit ? transactions.slice(0, args.limit) : transactions;
  },
});

/**
 * Internal helper: Add points to user's ledger
 * Creates ledger if not exists, records transaction
 */
export const earnPoints = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(), // Integer ×100
    sourceType: v.union(
      v.literal("payment"),
      v.literal("wallet_payment"),
      v.literal("top_up_bonus")
    ),
    sourceId: v.optional(v.string()),
    branchId: v.optional(v.id("branches")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get or create ledger
    let ledger = await ctx.db
      .query("points_ledger")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .unique();

    if (!ledger) {
      const ledgerId = await ctx.db.insert("points_ledger", {
        user_id: args.userId,
        current_balance: 0,
        lifetime_earned: 0,
        lifetime_redeemed: 0,
        last_activity_at: now,
      });
      ledger = await ctx.db.get(ledgerId);
    }

    if (!ledger) {
      throw new Error("Failed to create points ledger");
    }

    // Calculate new balance
    const newBalance = ledger.current_balance + args.amount;
    const newLifetimeEarned = ledger.lifetime_earned + args.amount;

    // Update ledger
    await ctx.db.patch(ledger._id, {
      current_balance: newBalance,
      lifetime_earned: newLifetimeEarned,
      last_activity_at: now,
    });

    // Check for tier promotion based on new lifetime points (before recording transaction)
    let tierPromotion = null;
    try {
      tierPromotion = await ctx.runMutation(api.services.tiers.updateUserTier, {
        userId: args.userId,
      });
      if (tierPromotion?.promoted) {
        console.log("[POINTS] User promoted to new tier:", tierPromotion);
      }
    } catch (error) {
      // Log but don't fail points earn if tier check fails
      console.error("[POINTS] Failed to check tier promotion:", error);
    }

    // Build transaction notes with tier promotion info
    let transactionNotes = args.notes || "";
    if (tierPromotion?.promoted) {
      const promotionNote = `[TIER_PROMOTION:${tierPromotion.previousTier}→${tierPromotion.newTier}]`;
      transactionNotes = transactionNotes
        ? `${transactionNotes} ${promotionNote}`
        : promotionNote;
    }

    // Record transaction
    await ctx.db.insert("points_transactions", {
      user_id: args.userId,
      branch_id: args.branchId,
      type: "earn",
      amount: args.amount,
      balance_after: newBalance,
      source_type: args.sourceType,
      source_id: args.sourceId,
      notes: transactionNotes || undefined,
      created_at: now,
    });

    return {
      newBalance,
      pointsEarned: args.amount,
      lifetimeEarned: newLifetimeEarned,
      tierPromotion: tierPromotion?.promoted
        ? {
            promoted: true,
            previousTier: tierPromotion.previousTier,
            newTier: tierPromotion.newTier,
            newTierIcon: tierPromotion.newTierIcon,
            newTierColor: tierPromotion.newTierColor,
          }
        : null,
    };
  },
});

/**
 * Internal helper: Redeem points from user's ledger
 * Returns error if insufficient balance
 */
export const redeemPoints = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(), // Integer ×100 (positive number)
    sourceId: v.optional(v.string()),
    branchId: v.optional(v.id("branches")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const ledger = await ctx.db
      .query("points_ledger")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .unique();

    if (!ledger) {
      throw new Error("No points ledger found");
    }

    if (ledger.current_balance < args.amount) {
      throw new Error("Insufficient points balance");
    }

    // Calculate new balance
    const newBalance = ledger.current_balance - args.amount;
    const newLifetimeRedeemed = ledger.lifetime_redeemed + args.amount;

    // Update ledger
    await ctx.db.patch(ledger._id, {
      current_balance: newBalance,
      lifetime_redeemed: newLifetimeRedeemed,
      last_activity_at: now,
    });

    // Record transaction (negative amount for redemption)
    await ctx.db.insert("points_transactions", {
      user_id: args.userId,
      branch_id: args.branchId,
      type: "redeem",
      amount: -args.amount, // Negative for display purposes
      balance_after: newBalance,
      source_type: "redemption",
      source_id: args.sourceId,
      notes: args.notes,
      created_at: now,
    });

    return { newBalance, pointsRedeemed: args.amount };
  },
});

/**
 * Manual Points Adjustment (Super Admin only)
 * Allows adding or deducting points with audit trail
 * Story 19.4: Manual Points Adjustment
 */
export const adjustPoints = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(), // Positive to add, negative to deduct (Integer ×100)
    reason: v.string(), // Required reason for audit trail
    allowNegativeBalance: v.optional(v.boolean()), // Allow balance to go negative
    adjustedBy: v.id("users"), // Admin performing the adjustment
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Validate reason is not empty
    if (!args.reason.trim()) {
      throw new Error("A reason must be provided for points adjustment");
    }

    // Get or create ledger
    let ledger = await ctx.db
      .query("points_ledger")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .unique();

    if (!ledger) {
      const ledgerId = await ctx.db.insert("points_ledger", {
        user_id: args.userId,
        current_balance: 0,
        lifetime_earned: 0,
        lifetime_redeemed: 0,
        last_activity_at: now,
      });
      ledger = await ctx.db.get(ledgerId);
    }

    if (!ledger) {
      throw new Error("Failed to create points ledger");
    }

    const oldBalance = ledger.current_balance;
    const newBalance = oldBalance + args.amount;

    // Check for negative balance if deducting
    if (newBalance < 0 && !args.allowNegativeBalance) {
      return {
        success: false,
        error: "NEGATIVE_BALANCE",
        message: `Deduction would result in negative balance. Current: ${oldBalance}, After: ${newBalance}`,
        oldBalance,
        newBalance,
        requiresConfirmation: true,
      };
    }

    // Update ledger based on adjustment type
    const updates: {
      current_balance: number;
      last_activity_at: number;
      lifetime_earned?: number;
      lifetime_redeemed?: number;
    } = {
      current_balance: newBalance,
      last_activity_at: now,
    };

    // If adding points, track in lifetime_earned
    if (args.amount > 0) {
      updates.lifetime_earned = ledger.lifetime_earned + args.amount;
    }

    await ctx.db.patch(ledger._id, updates);

    // Build audit note
    const auditNote = `[MANUAL_ADJUST by ${args.adjustedBy}] ${args.reason}`;

    // Record transaction
    await ctx.db.insert("points_transactions", {
      user_id: args.userId,
      type: "adjust",
      amount: args.amount,
      balance_after: newBalance,
      source_type: "manual_adjustment",
      source_id: args.adjustedBy.toString(), // Store admin ID as source
      notes: auditNote,
      created_at: now,
    });

    console.log("[POINTS] Manual adjustment completed:", {
      userId: args.userId,
      amount: args.amount,
      oldBalance,
      newBalance,
      adjustedBy: args.adjustedBy,
      reason: args.reason,
    });

    // Check for tier promotion if points were added
    let tierPromotion = null;
    if (args.amount > 0) {
      try {
        tierPromotion = await ctx.runMutation(api.services.tiers.updateUserTier, {
          userId: args.userId,
        });
      } catch (error) {
        console.error("[POINTS] Failed to check tier after adjustment:", error);
      }
    }

    return {
      success: true,
      oldBalance,
      newBalance,
      adjustment: args.amount,
      reason: args.reason,
      adjustedBy: args.adjustedBy,
      timestamp: now,
      tierPromotion: tierPromotion?.promoted ? tierPromotion : null,
    };
  },
});

/**
 * Search customers for points adjustment
 * Returns matching users with their current points balance
 * Story 19.4: Manual Points Adjustment
 */
export const searchCustomersForAdjustment = query({
  args: {
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const searchLimit = args.limit || 10;

    if (!args.searchTerm.trim()) {
      return [];
    }

    const searchLower = args.searchTerm.toLowerCase();

    // Get all users (in production, use search index)
    const users = await ctx.db.query("users").collect();

    // Filter users by name, email, or phone
    const matchingUsers = users.filter((user) => {
      const name = (user.name || "").toLowerCase();
      const email = (user.email || "").toLowerCase();
      const phone = (user.phone || "").toLowerCase();

      return (
        name.includes(searchLower) ||
        email.includes(searchLower) ||
        phone.includes(searchLower)
      );
    });

    // Get points ledger for each matching user
    const results = await Promise.all(
      matchingUsers.slice(0, searchLimit).map(async (user) => {
        const ledger = await ctx.db
          .query("points_ledger")
          .withIndex("by_user", (q) => q.eq("user_id", user._id))
          .unique();

        return {
          userId: user._id,
          name: user.name || "Unknown",
          email: user.email || "",
          phone: user.phone || "",
          currentBalance: ledger?.current_balance || 0,
          lifetimeEarned: ledger?.lifetime_earned || 0,
          lifetimeRedeemed: ledger?.lifetime_redeemed || 0,
          hasLedger: !!ledger,
        };
      })
    );

    return results;
  },
});

/**
 * Get recent points adjustments (for audit log)
 * Story 19.4: Manual Points Adjustment
 */
export const getRecentAdjustments = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    // Get adjustment transactions
    const adjustments = await ctx.db
      .query("points_transactions")
      .filter((q) => q.eq(q.field("type"), "adjust"))
      .order("desc")
      .take(limit);

    // Enrich with user info
    const enriched = await Promise.all(
      adjustments.map(async (adj) => {
        const user = await ctx.db.get(adj.user_id);

        // Parse admin ID from source_id if present
        let adjustedByUser = null;
        if (adj.source_id) {
          try {
            adjustedByUser = await ctx.db.get(adj.source_id as any);
          } catch {
            // source_id might not be a valid user ID
          }
        }

        return {
          ...adj,
          userName: user?.name || "Unknown",
          userEmail: user?.email || "",
          adjustedByName: adjustedByUser?.name || "System",
        };
      })
    );

    return enriched;
  },
});

// ============================================================================
// POINTS EXPIRY MANAGEMENT (Story 19.5)
// ============================================================================

/**
 * Get expiry configuration values
 */
export const getExpiryConfig = query({
  args: {},
  handler: async (ctx) => {
    // Get expiry settings from loyalty_config
    const getConfigValue = async (key: string, defaultValue: string) => {
      const config = await ctx.db
        .query("loyalty_config")
        .withIndex("by_key", (q) => q.eq("config_key", key))
        .unique();
      return config?.config_value || defaultValue;
    };

    const enabled = (await getConfigValue("points_expiry_enabled", "false")) === "true";
    const expiryMonths = parseInt(await getConfigValue("points_expiry_months", "12"));
    const warningDays = parseInt(await getConfigValue("expiry_warning_days", "30"));

    return {
      enabled,
      expiryMonths,
      warningDays,
    };
  },
});

/**
 * Process points expiry for inactive accounts
 * Should be run periodically (e.g., daily via scheduled job)
 */
export const processPointsExpiry = mutation({
  args: {
    dryRun: v.optional(v.boolean()), // If true, just return what would expire
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const dryRun = args.dryRun || false;

    // Get expiry configuration
    const getConfigValue = async (key: string, defaultValue: string) => {
      const config = await ctx.db
        .query("loyalty_config")
        .withIndex("by_key", (q) => q.eq("config_key", key))
        .unique();
      return config?.config_value || defaultValue;
    };

    const enabled = (await getConfigValue("points_expiry_enabled", "false")) === "true";
    if (!enabled) {
      return {
        processed: 0,
        totalPointsExpired: 0,
        message: "Points expiry is disabled",
        dryRun,
      };
    }

    const expiryMonths = parseInt(await getConfigValue("points_expiry_months", "12"));
    if (expiryMonths <= 0) {
      return {
        processed: 0,
        totalPointsExpired: 0,
        message: "Expiry months set to 0 (never expire)",
        dryRun,
      };
    }

    // Calculate cutoff date
    const cutoffDate = now - expiryMonths * 30 * 24 * 60 * 60 * 1000;

    // Find ledgers with last_activity_at before cutoff and positive balance
    const allLedgers = await ctx.db.query("points_ledger").collect();
    const inactiveLedgers = allLedgers.filter(
      (ledger) =>
        ledger.last_activity_at < cutoffDate && ledger.current_balance > 0
    );

    if (dryRun) {
      // Just return what would expire
      const details = await Promise.all(
        inactiveLedgers.map(async (ledger) => {
          const user = await ctx.db.get(ledger.user_id);
          return {
            userId: ledger.user_id,
            userName: user?.name || "Unknown",
            balance: ledger.current_balance,
            lastActivity: ledger.last_activity_at,
          };
        })
      );

      return {
        processed: 0,
        wouldExpire: inactiveLedgers.length,
        totalPointsWouldExpire: inactiveLedgers.reduce(
          (sum, l) => sum + l.current_balance,
          0
        ),
        details,
        dryRun: true,
        message: `Would expire points for ${inactiveLedgers.length} inactive accounts`,
      };
    }

    // Process expiry for each inactive ledger
    let processed = 0;
    let totalPointsExpired = 0;

    for (const ledger of inactiveLedgers) {
      const pointsToExpire = ledger.current_balance;

      // Update ledger - set balance to 0
      await ctx.db.patch(ledger._id, {
        current_balance: 0,
        last_activity_at: now, // Update activity to prevent re-processing
      });

      // Create expire transaction
      await ctx.db.insert("points_transactions", {
        user_id: ledger.user_id,
        type: "expire",
        amount: -pointsToExpire,
        balance_after: 0,
        source_type: "expiry",
        source_id: `expiry-${now}`,
        notes: `Points expired after ${expiryMonths} months of inactivity`,
        created_at: now,
      });

      processed++;
      totalPointsExpired += pointsToExpire;

      console.log(
        `[POINTS] Expired ${pointsToExpire} points for user ${ledger.user_id}`
      );
    }

    return {
      processed,
      totalPointsExpired,
      message: `Expired points for ${processed} inactive accounts`,
      dryRun: false,
    };
  },
});

/**
 * Get expiry summary stats for admin dashboard
 */
export const getExpiringSummary = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Get expiry config
    const getConfigValue = async (key: string, defaultValue: string) => {
      const config = await ctx.db
        .query("loyalty_config")
        .withIndex("by_key", (q) => q.eq("config_key", key))
        .unique();
      return config?.config_value || defaultValue;
    };

    const enabled = (await getConfigValue("points_expiry_enabled", "false")) === "true";
    const expiryMonths = parseInt(await getConfigValue("points_expiry_months", "12"));
    const warningDays = parseInt(await getConfigValue("expiry_warning_days", "30"));

    if (!enabled || expiryMonths <= 0) {
      return {
        enabled,
        expiryMonths,
        warningDays,
        upcomingExpirations: 0,
        totalPointsAtRisk: 0,
        recentlyExpired: 0,
        totalPointsExpiredLast30Days: 0,
        customers: [],
      };
    }

    const cutoffDate = now - expiryMonths * 30 * 24 * 60 * 60 * 1000;
    const warningCutoff = cutoffDate + warningDays * 24 * 60 * 60 * 1000;

    // Get all ledgers
    const allLedgers = await ctx.db.query("points_ledger").collect();

    // Find accounts approaching expiry (within warning period)
    const approachingExpiry = allLedgers.filter(
      (ledger) =>
        ledger.current_balance > 0 &&
        ledger.last_activity_at < warningCutoff &&
        ledger.last_activity_at >= cutoffDate
    );

    // Get details of approaching expiry customers
    const customers = await Promise.all(
      approachingExpiry.slice(0, 10).map(async (ledger) => {
        const user = await ctx.db.get(ledger.user_id);
        const daysUntilExpiry = Math.ceil(
          (ledger.last_activity_at + expiryMonths * 30 * 24 * 60 * 60 * 1000 - now) /
            (24 * 60 * 60 * 1000)
        );
        return {
          userId: ledger.user_id,
          userName: user?.name || "Unknown",
          email: user?.email || "",
          pointsAtRisk: ledger.current_balance,
          daysUntilExpiry: Math.max(0, daysUntilExpiry),
          lastActivity: ledger.last_activity_at,
        };
      })
    );

    // Get recently expired transactions (last 30 days)
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const recentExpiryTransactions = await ctx.db
      .query("points_transactions")
      .filter((q) =>
        q.and(
          q.eq(q.field("type"), "expire"),
          q.gte(q.field("created_at"), thirtyDaysAgo)
        )
      )
      .collect();

    return {
      enabled,
      expiryMonths,
      warningDays,
      upcomingExpirations: approachingExpiry.length,
      totalPointsAtRisk: approachingExpiry.reduce(
        (sum, l) => sum + l.current_balance,
        0
      ),
      recentlyExpired: recentExpiryTransactions.length,
      totalPointsExpiredLast30Days: recentExpiryTransactions.reduce(
        (sum, t) => sum + Math.abs(t.amount),
        0
      ),
      customers,
    };
  },
});

// ============================================================================
// PROMO-INTEGRATED POINTS EARNING (Story 20.4)
// ============================================================================

/**
 * Award points with automatic promo application
 * Checks for active promos and applies bonuses automatically
 * Story 20.4: Promo Points Calculation
 */
export const awardPointsWithPromo = mutation({
  args: {
    userId: v.id("users"),
    baseAmount: v.number(), // Payment amount in pesos (for base points calculation)
    branchId: v.optional(v.id("branches")),
    sourceType: v.union(
      v.literal("payment"),
      v.literal("wallet_payment"),
      v.literal("top_up_bonus")
    ),
    sourceId: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Base points calculation: 1 peso = 100 points (integer ×100)
    const basePoints = Math.round(args.baseAmount * 100);

    // Get user for tier check
    const user = await ctx.db.get(args.userId);
    const userTier = user?.current_tier_id
      ? await ctx.db.get(user.current_tier_id)
      : null;
    const tierRank: Record<string, number> = { bronze: 1, silver: 2, gold: 3, platinum: 4 };
    const userRank = tierRank[userTier?.name?.toLowerCase() || "bronze"] || 1;

    // Get active promotions for this branch
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

    // Filter by date range and exclude wallet_bonus (that's for top-ups only)
    promotions = promotions.filter(
      (p) =>
        p.start_at <= now &&
        p.end_at >= now &&
        !p.is_template &&
        p.type !== "wallet_bonus"
    );

    // Find applicable promo with eligibility checks
    let bestPromo = null;
    let bestBonusPoints = 0;

    for (const promo of promotions) {
      // Check tier requirement
      if (promo.tier_requirement) {
        const requiredRank = tierRank[promo.tier_requirement] || 1;
        if (userRank < requiredRank) continue;
      }

      // Check min purchase
      if (promo.min_purchase && args.baseAmount < promo.min_purchase) continue;

      // Check max uses
      if (promo.max_uses && promo.total_uses >= promo.max_uses) continue;

      // Check per-user limit
      if (promo.max_uses_per_user) {
        const userUsage = await ctx.db
          .query("promo_usage")
          .withIndex("by_promo_user", (q) =>
            q.eq("promo_id", promo._id).eq("user_id", args.userId)
          )
          .collect();
        if (userUsage.length >= promo.max_uses_per_user) continue;
      }

      // Calculate bonus for this promo
      let bonus = 0;
      if (promo.type === "bonus_points" && promo.multiplier) {
        // Multiplier: totalPoints = basePoints * multiplier
        const totalPoints = Math.round(basePoints * promo.multiplier);
        bonus = totalPoints - basePoints;
      } else if (promo.type === "flat_bonus" && promo.flat_amount) {
        // Flat bonus: add fixed amount (flat_amount is already in ×100 format)
        bonus = promo.flat_amount;
      }

      // Track best promo
      if (bonus > bestBonusPoints) {
        bestBonusPoints = bonus;
        bestPromo = promo;
      }
    }

    // Calculate total points
    const totalPoints = basePoints + bestBonusPoints;

    // Award points using the earnPoints mutation
    const earnResult = await ctx.runMutation(api.services.points.earnPoints, {
      userId: args.userId,
      amount: totalPoints,
      sourceType: args.sourceType,
      sourceId: args.sourceId,
      branchId: args.branchId,
      notes: bestPromo
        ? `${args.notes || ""} [PROMO: ${bestPromo.name}]`.trim()
        : args.notes,
    });

    // Record promo usage if a promo was applied
    if (bestPromo) {
      await ctx.db.insert("promo_usage", {
        promo_id: bestPromo._id,
        user_id: args.userId,
        branch_id: args.branchId,
        transaction_id: args.sourceId,
        points_earned: totalPoints,
        bonus_points: bestBonusPoints,
        used_at: now,
      });

      // Increment promo total_uses
      await ctx.db.patch(bestPromo._id, {
        total_uses: bestPromo.total_uses + 1,
        updated_at: now,
      });

      console.log("[POINTS] Promo applied:", {
        userId: args.userId,
        promoName: bestPromo.name,
        basePoints,
        bonusPoints: bestBonusPoints,
        totalPoints,
      });
    }

    return {
      ...earnResult,
      basePoints,
      bonusPoints: bestBonusPoints,
      totalPoints,
      promoApplied: bestPromo
        ? {
            promoId: bestPromo._id,
            promoName: bestPromo.name,
            promoType: bestPromo.type,
            multiplier: bestPromo.multiplier,
            flatAmount: bestPromo.flat_amount,
          }
        : null,
    };
  },
});

/**
 * Get user's expiring points info (for customer display)
 */
export const getUserExpiringPoints = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get expiry config
    const getConfigValue = async (key: string, defaultValue: string) => {
      const config = await ctx.db
        .query("loyalty_config")
        .withIndex("by_key", (q) => q.eq("config_key", key))
        .unique();
      return config?.config_value || defaultValue;
    };

    const enabled = (await getConfigValue("points_expiry_enabled", "false")) === "true";
    const expiryMonths = parseInt(await getConfigValue("points_expiry_months", "12"));
    const warningDays = parseInt(await getConfigValue("expiry_warning_days", "30"));

    if (!enabled || expiryMonths <= 0) {
      return {
        hasExpiringPoints: false,
        pointsExpiring: 0,
        daysUntilExpiry: null,
        expiryDate: null,
        showWarning: false,
      };
    }

    // Get user's ledger
    const ledger = await ctx.db
      .query("points_ledger")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .unique();

    if (!ledger || ledger.current_balance <= 0) {
      return {
        hasExpiringPoints: false,
        pointsExpiring: 0,
        daysUntilExpiry: null,
        expiryDate: null,
        showWarning: false,
      };
    }

    // Calculate expiry date based on last activity
    const expiryDate = ledger.last_activity_at + expiryMonths * 30 * 24 * 60 * 60 * 1000;
    const daysUntilExpiry = Math.ceil((expiryDate - now) / (24 * 60 * 60 * 1000));

    // Determine if warning should be shown
    const showWarning = daysUntilExpiry <= warningDays && daysUntilExpiry > 0;

    return {
      hasExpiringPoints: daysUntilExpiry <= warningDays,
      pointsExpiring: showWarning ? ledger.current_balance : 0,
      daysUntilExpiry: Math.max(0, daysUntilExpiry),
      expiryDate,
      showWarning,
    };
  },
});
