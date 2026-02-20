/**
 * Membership Card Service
 *
 * Handles the Virtual Card / Paid Membership system.
 * Tiers: Silver (purchase) → Gold (earn XP or top-up) → Platinum (earn XP or top-up)
 * Multipliers: 1.5x / 2.0x / 3.0x points per peso
 *
 * @module convex/services/membershipCards
 */

import { mutation, query, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";
import { DEFAULT_CONFIGS } from "./loyaltyConfig";

// ============================================================================
// HELPERS
// ============================================================================

const TIER_ORDER = { Silver: 1, Gold: 2, Platinum: 3 } as const;

/** Get a card config value from loyalty_config table or fallback to DEFAULT_CONFIGS */
async function getCardConfigValue(
  ctx: any,
  key: string
): Promise<string | null> {
  const config = await ctx.db
    .query("loyalty_config")
    .withIndex("by_key", (q: any) => q.eq("config_key", key))
    .unique();
  if (config) return config.config_value;
  const defaultConfig = DEFAULT_CONFIGS.find((c) => c.config_key === key);
  return defaultConfig?.config_value ?? null;
}

async function getCardConfigNumber(
  ctx: any,
  key: string,
  fallback: number
): Promise<number> {
  const val = await getCardConfigValue(ctx, key);
  return val !== null ? parseFloat(val) : fallback;
}

function generateVoucherCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "BD-"; // Birthday prefix
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get the active (or grace_period) membership card for a user.
 * Returns null if user has no active card.
 */
export const getActiveCard = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const cards = await ctx.db
      .query("membership_cards")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .collect();

    // Find active or grace_period card
    const card = cards.find(
      (c) => c.status === "active" || c.status === "grace_period"
    );
    if (!card) return null;

    // Get tier display info
    const tier = await ctx.db
      .query("tiers")
      .withIndex("by_name", (q) => q.eq("name", card.tier_name))
      .first();

    // Calculate XP progress
    const goldThreshold = await getCardConfigNumber(
      ctx,
      "card_gold_xp_threshold",
      200000
    );
    const platinumThreshold = await getCardConfigNumber(
      ctx,
      "card_platinum_xp_threshold",
      500000
    );

    let nextTierName: string | null = null;
    let nextTierThreshold = 0;
    let xpProgress = 100;

    if (card.tier_name === "Silver") {
      nextTierName = "Gold";
      nextTierThreshold = goldThreshold;
      xpProgress = Math.min(
        100,
        Math.round((card.card_xp / goldThreshold) * 100)
      );
    } else if (card.tier_name === "Gold") {
      nextTierName = "Platinum";
      nextTierThreshold = platinumThreshold;
      xpProgress = Math.min(
        100,
        Math.round((card.card_xp / platinumThreshold) * 100)
      );
    }

    const now = Date.now();
    const daysToExpiry = Math.max(
      0,
      Math.ceil((card.expires_at - now) / (1000 * 60 * 60 * 24))
    );

    return {
      ...card,
      tier,
      nextTierName,
      nextTierThreshold,
      xpProgress,
      daysToExpiry,
      isMaxTier: card.tier_name === "Platinum",
    };
  },
});

/**
 * Get all card configuration values for super admin panel.
 */
export const getCardConfig = query({
  args: {},
  handler: async (ctx) => {
    const keys = DEFAULT_CONFIGS.filter((c) =>
      c.config_key.startsWith("card_")
    ).map((c) => c.config_key);

    const configs: Record<string, any> = {};
    for (const key of keys) {
      const val = await getCardConfigValue(ctx, key);
      configs[key] = val;
    }
    return configs;
  },
});

/**
 * Get card purchase options for customer purchase flow.
 */
export const getCardPurchaseOptions = query({
  args: {},
  handler: async (ctx) => {
    const enabled = await getCardConfigValue(ctx, "card_enabled");
    if (enabled === "false") return { enabled: false };

    return {
      enabled: true,
      silverPrice: await getCardConfigNumber(ctx, "card_silver_price", 299),
      goldTopupThreshold: await getCardConfigNumber(
        ctx,
        "card_gold_topup_threshold",
        2000
      ),
      platinumTopupThreshold: await getCardConfigNumber(
        ctx,
        "card_platinum_topup_threshold",
        5000
      ),
      silverMultiplier: await getCardConfigNumber(
        ctx,
        "card_silver_multiplier",
        1.5
      ),
      goldMultiplier: await getCardConfigNumber(
        ctx,
        "card_gold_multiplier",
        2.0
      ),
      platinumMultiplier: await getCardConfigNumber(
        ctx,
        "card_platinum_multiplier",
        3.0
      ),
      goldXpThreshold: await getCardConfigNumber(
        ctx,
        "card_gold_xp_threshold",
        200000
      ),
      platinumXpThreshold: await getCardConfigNumber(
        ctx,
        "card_platinum_xp_threshold",
        500000
      ),
      renewalMonths: await getCardConfigNumber(
        ctx,
        "card_renewal_months",
        12
      ),
    };
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Purchase a Silver membership card.
 */
export const purchaseCard = mutation({
  args: {
    userId: v.id("users"),
    paymentMethod: v.literal("wallet"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check for existing active card
    const existingCards = await ctx.db
      .query("membership_cards")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .collect();

    const activeCard = existingCards.find(
      (c) => c.status === "active" || c.status === "grace_period"
    );
    if (activeCard) {
      throw new Error(
        "You already have an active membership card. Visit your card page to manage it."
      );
    }

    // Get Silver price
    const silverPrice = await getCardConfigNumber(
      ctx,
      "card_silver_price",
      299
    );
    const silverMultiplier = await getCardConfigNumber(
      ctx,
      "card_silver_multiplier",
      1.5
    );
    const renewalMonths = await getCardConfigNumber(
      ctx,
      "card_renewal_months",
      12
    );
    const graceDays = await getCardConfigNumber(
      ctx,
      "card_grace_period_days",
      30
    );

    // Debit wallet
    await ctx.runMutation(api.services.wallet.debitWallet, {
      userId: args.userId,
      amount: silverPrice,
      description: "Membership Card - Silver",
      reference_id: `card_purchase_${now}`,
    });

    // Calculate dates
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + renewalMonths);
    const gracePeriodEndsAt = new Date(expiresAt.getTime());
    gracePeriodEndsAt.setDate(gracePeriodEndsAt.getDate() + graceDays);

    // Create card
    const cardId = await ctx.db.insert("membership_cards", {
      user_id: args.userId,
      tier_name: "Silver",
      status: "active",
      card_xp: 0,
      lifetime_xp: 0,
      points_multiplier: silverMultiplier,
      acquired_via: "purchase",
      purchased_at: now,
      activated_at: now,
      expires_at: expiresAt.getTime(),
      grace_period_ends_at: gracePeriodEndsAt.getTime(),
      renewal_count: 0,
      last_visit_at: now,
      purchase_amount: silverPrice,
      created_at: now,
      updated_at: now,
    });

    // Update user's current_tier_id to Silver
    const silverTier = await ctx.db
      .query("tiers")
      .withIndex("by_name", (q) => q.eq("name", "Silver"))
      .first();
    if (silverTier) {
      await ctx.db.patch(args.userId, {
        current_tier_id: silverTier._id,
        updatedAt: now,
      });
    }

    // Check if birthday freebie should be generated
    const user = await ctx.db.get(args.userId);
    if (user?.birthday) {
      const currentMonth = new Date(now).getMonth();
      const birthdayMonth = new Date(user.birthday).getMonth();
      if (currentMonth === birthdayMonth) {
        try {
          await generateBirthdayFreebieInternal(ctx, args.userId, cardId, now);
        } catch (e) {
          console.error("[CARD] Birthday freebie generation failed:", e);
        }
      }
    }

    // Create notification
    await ctx.db.insert("notifications", {
      recipient_id: args.userId,
      type: "alert",
      title: "Welcome to the Club! 🎉",
      message: `Your Silver membership card is now active! Enjoy ${silverMultiplier}x points on all purchases.`,
      priority: "medium",
      recipient_type: "customer",
      is_read: false,
      is_archived: false,
      createdAt: now,
      updatedAt: now,
    });

    return cardId;
  },
});

/**
 * Upgrade card via wallet top-up shortcut (Gold or Platinum).
 * The top-up amount goes into the wallet AND the tier upgrades.
 */
export const upgradeCardViaTopup = mutation({
  args: {
    userId: v.id("users"),
    targetTier: v.union(v.literal("Gold"), v.literal("Platinum")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get active card
    const cards = await ctx.db
      .query("membership_cards")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .collect();
    const card = cards.find(
      (c) => c.status === "active" || c.status === "grace_period"
    );
    if (!card) {
      throw new Error("You need an active membership card first.");
    }

    // Validate upgrade direction
    if (TIER_ORDER[args.targetTier] <= TIER_ORDER[card.tier_name]) {
      throw new Error(
        `Cannot upgrade: you are already ${card.tier_name} or higher.`
      );
    }

    // Get threshold amount
    const configKey =
      args.targetTier === "Gold"
        ? "card_gold_topup_threshold"
        : "card_platinum_topup_threshold";
    const thresholdAmount = await getCardConfigNumber(
      ctx,
      configKey,
      args.targetTier === "Gold" ? 2000 : 5000
    );

    // Get new multiplier
    const multiplierKey =
      args.targetTier === "Gold"
        ? "card_gold_multiplier"
        : "card_platinum_multiplier";
    const newMultiplier = await getCardConfigNumber(
      ctx,
      multiplierKey,
      args.targetTier === "Gold" ? 2.0 : 3.0
    );

    // Credit wallet with the threshold amount (the customer tops up, wallet gets funded)
    await ctx.runMutation(api.services.wallet.creditWallet, {
      userId: args.userId,
      amount: thresholdAmount,
      applyBonus: true,
      description: `Membership Card - ${args.targetTier} Fast-Track Top-Up`,
    });

    // Update card tier
    await ctx.db.patch(card._id, {
      tier_name: args.targetTier,
      points_multiplier: newMultiplier,
      acquired_via: "topup_shortcut",
      updated_at: now,
    });

    // Update user's current_tier_id
    const tier = await ctx.db
      .query("tiers")
      .withIndex("by_name", (q) => q.eq("name", args.targetTier))
      .first();
    if (tier) {
      await ctx.db.patch(args.userId, {
        current_tier_id: tier._id,
        updatedAt: now,
      });
    }

    // Notification
    await ctx.db.insert("notifications", {
      recipient_id: args.userId,
      type: "alert",
      title: `${args.targetTier} Member! 🌟`,
      message: `You've been upgraded to ${args.targetTier}! Enjoy ${newMultiplier}x points on all purchases.`,
      priority: "medium",
      recipient_type: "customer",
      is_read: false,
      is_archived: false,
      createdAt: now,
      updatedAt: now,
    });

    return { upgraded: true, newTier: args.targetTier, newMultiplier };
  },
});

/**
 * Award XP to a cardholder. Called after completed booking/payment.
 * Auto-upgrades tier if XP threshold is crossed.
 */
export const awardXP = mutation({
  args: {
    userId: v.id("users"),
    xpAmount: v.number(), // ×100 format
    source: v.string(),
    sourceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.xpAmount <= 0) return { upgraded: false };

    const now = Date.now();

    // Get active card
    const cards = await ctx.db
      .query("membership_cards")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .collect();
    const card = cards.find((c) => c.status === "active");
    if (!card) return { upgraded: false };

    // Update XP and last visit
    const newXp = card.card_xp + args.xpAmount;
    const newLifetimeXp = card.lifetime_xp + args.xpAmount;

    const updates: Record<string, any> = {
      card_xp: newXp,
      lifetime_xp: newLifetimeXp,
      last_visit_at: now,
      maintenance_warning_sent: false, // Reset warning on activity
      updated_at: now,
    };

    // Check for tier upgrade
    let upgraded = false;
    let newTier = card.tier_name;

    if (card.tier_name === "Silver") {
      const goldThreshold = await getCardConfigNumber(
        ctx,
        "card_gold_xp_threshold",
        200000
      );
      if (newXp >= goldThreshold) {
        const goldMultiplier = await getCardConfigNumber(
          ctx,
          "card_gold_multiplier",
          2.0
        );
        updates.tier_name = "Gold";
        updates.points_multiplier = goldMultiplier;
        updates.acquired_via = "xp_upgrade";
        upgraded = true;
        newTier = "Gold";
      }
    } else if (card.tier_name === "Gold") {
      const platinumThreshold = await getCardConfigNumber(
        ctx,
        "card_platinum_xp_threshold",
        500000
      );
      if (newXp >= platinumThreshold) {
        const platinumMultiplier = await getCardConfigNumber(
          ctx,
          "card_platinum_multiplier",
          3.0
        );
        updates.tier_name = "Platinum";
        updates.points_multiplier = platinumMultiplier;
        updates.acquired_via = "xp_upgrade";
        upgraded = true;
        newTier = "Platinum";
      }
    }

    await ctx.db.patch(card._id, updates);

    // Update user tier if upgraded
    if (upgraded) {
      const tier = await ctx.db
        .query("tiers")
        .withIndex("by_name", (q) => q.eq("name", newTier))
        .first();
      if (tier) {
        await ctx.db.patch(args.userId, {
          current_tier_id: tier._id,
          updatedAt: now,
        });
      }

      await ctx.db.insert("notifications", {
        recipient_id: args.userId,
        type: "alert",
        title: `Tier Upgrade! 🎉`,
        message: `Congratulations! You've earned your way to ${newTier}! Enjoy ${updates.points_multiplier}x points.`,
        priority: "high",
        recipient_type: "customer",
        is_read: false,
        is_archived: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { upgraded, newTier, totalXP: newXp };
  },
});

/**
 * Renew an expired or grace_period card.
 */
export const renewCard = mutation({
  args: {
    userId: v.id("users"),
    paymentMethod: v.literal("wallet"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find expired or grace_period card
    const cards = await ctx.db
      .query("membership_cards")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .collect();
    const card = cards.find(
      (c) => c.status === "expired" || c.status === "grace_period"
    );
    if (!card) {
      throw new Error("No card found to renew.");
    }

    // Get renewal price (same as Silver price)
    const renewalPrice = await getCardConfigNumber(
      ctx,
      "card_silver_price",
      299
    );
    const renewalMonths = await getCardConfigNumber(
      ctx,
      "card_renewal_months",
      12
    );
    const graceDays = await getCardConfigNumber(
      ctx,
      "card_grace_period_days",
      30
    );

    // Debit wallet
    await ctx.runMutation(api.services.wallet.debitWallet, {
      userId: args.userId,
      amount: renewalPrice,
      description: "Membership Card - Renewal",
      reference_id: `card_renewal_${now}`,
    });

    // Calculate new dates
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + renewalMonths);
    const gracePeriodEndsAt = new Date(expiresAt.getTime());
    gracePeriodEndsAt.setDate(gracePeriodEndsAt.getDate() + graceDays);

    // Determine tier after renewal
    // Grace period: keep current tier
    // Expired (past grace): reset to Silver
    const silverMultiplier = await getCardConfigNumber(
      ctx,
      "card_silver_multiplier",
      1.5
    );
    const isFullExpiry = card.status === "expired";

    const updates: Record<string, any> = {
      status: "active",
      activated_at: now,
      expires_at: expiresAt.getTime(),
      grace_period_ends_at: gracePeriodEndsAt.getTime(),
      renewed_at: now,
      renewal_count: (card.renewal_count || 0) + 1,
      last_visit_at: now,
      maintenance_warning_sent: false,
      purchase_amount: renewalPrice,
      updated_at: now,
    };

    if (isFullExpiry) {
      // Past grace period — reset to Silver, reset XP
      updates.tier_name = "Silver";
      updates.points_multiplier = silverMultiplier;
      updates.card_xp = 0;
      // lifetime_xp preserved
    }

    await ctx.db.patch(card._id, updates);

    // Update user tier
    const tierName = isFullExpiry ? "Silver" : card.tier_name;
    const tier = await ctx.db
      .query("tiers")
      .withIndex("by_name", (q) => q.eq("name", tierName))
      .first();
    if (tier) {
      await ctx.db.patch(args.userId, {
        current_tier_id: tier._id,
        updatedAt: now,
      });
    }

    await ctx.db.insert("notifications", {
      recipient_id: args.userId,
      type: "alert",
      title: "Card Renewed! ✅",
      message: isFullExpiry
        ? "Your card has been renewed as Silver. Start earning XP to level up again!"
        : `Your ${card.tier_name} card has been renewed! All your progress is intact.`,
      priority: "medium",
      recipient_type: "customer",
      is_read: false,
      is_archived: false,
      createdAt: now,
      updatedAt: now,
    });

    return { renewed: true, tier: tierName };
  },
});

/**
 * Generate birthday freebie voucher for a cardholder.
 */
export const generateBirthdayFreebie = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get active card
    const cards = await ctx.db
      .query("membership_cards")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .collect();
    const card = cards.find((c) => c.status === "active");
    if (!card) {
      throw new Error("No active membership card found.");
    }

    return generateBirthdayFreebieInternal(ctx, args.userId, card._id, now);
  },
});

/** Internal helper for birthday freebie (used by both mutation and cron) */
async function generateBirthdayFreebieInternal(
  ctx: any,
  userId: any,
  cardId: any,
  now: number
) {
  const user = await ctx.db.get(userId);
  if (!user?.birthday) return null;

  const currentMonth = new Date(now).getMonth();
  const currentYear = new Date(now).getFullYear();
  const birthdayMonth = new Date(user.birthday).getMonth();

  if (currentMonth !== birthdayMonth) return null;

  // Check if already generated this year
  const card = await ctx.db.get(cardId);
  if (card?.birthday_freebie_year === currentYear) return null;

  // Create birthday voucher
  const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
  const code = generateVoucherCode();

  // Get a default branch_id from the user or use the card's branch
  const branchId = user.branch_id || card?.branch_id;

  // We need a branch_id for the voucher. If user has no branch, use any active branch.
  let voucherBranchId = branchId;
  if (!voucherBranchId) {
    const anyBranch = await ctx.db.query("branches").first();
    voucherBranchId = anyBranch?._id;
  }
  if (!voucherBranchId) return null; // Can't create voucher without branch

  const voucherId = await ctx.db.insert("vouchers", {
    code,
    value: 0, // Free service, not peso discount
    points_required: 0, // No points needed — it's a freebie
    max_uses: 1,
    expires_at: endOfMonth.getTime(),
    description: "🎂 Birthday Freebie - Free Haircut! Happy Birthday from TPX!",
    branch_id: voucherBranchId,
    created_by: userId,
    status: "active" as const,
    createdAt: now,
    updatedAt: now,
  });

  // Assign voucher to user
  await ctx.db.insert("user_vouchers", {
    voucher_id: voucherId,
    user_id: userId,
    status: "assigned" as const,
    assigned_at: now,
  });

  // Update card with birthday freebie tracking
  await ctx.db.patch(cardId, {
    birthday_freebie_year: currentYear,
    birthday_voucher_id: voucherId,
    updated_at: now,
  });

  // Send notification
  await ctx.db.insert("notifications", {
    recipient_id: userId,
    type: "alert",
    title: "Happy Birthday! 🎂",
    message:
      "We've got a special gift for you — a FREE haircut! Check your vouchers to claim it before the month ends.",
    priority: "high",
    recipient_type: "customer",
    is_read: false,
    is_archived: false,
    createdAt: now,
    updatedAt: now,
  });

  return voucherId;
}

// ============================================================================
// CRON / INTERNAL
// ============================================================================

/**
 * Daily maintenance cron job.
 * Handles: expiry transitions, grace period enforcement, inactivity tier drops, birthday freebies.
 */
export const dailyCardMaintenance = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let processed = 0;

    // 1. Active cards past expires_at → grace_period
    const activeCards = await ctx.db
      .query("membership_cards")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    for (const card of activeCards) {
      if (card.expires_at < now) {
        await ctx.db.patch(card._id, {
          status: "grace_period",
          updated_at: now,
        });

        await ctx.db.insert("notifications", {
          recipient_id: card.user_id,
          type: "alert",
          title: "Card Expired - Grace Period",
          message:
            "Your membership card has expired. You have 30 days to renew and keep your current tier. After that, your tier resets to Silver.",
          priority: "high",
          recipient_type: "customer",
          is_read: false,
          is_archived: false,
          createdAt: now,
          updatedAt: now,
        });
        processed++;
        continue;
      }

      // Check inactivity (only for Gold/Platinum)
      const maintenanceDays = await getCardConfigNumber(
        ctx,
        "card_maintenance_days",
        30
      );
      if (
        maintenanceDays > 0 &&
        card.last_visit_at &&
        card.tier_name !== "Silver"
      ) {
        const daysSinceVisit = Math.floor(
          (now - card.last_visit_at) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceVisit > maintenanceDays) {
          // Drop one tier
          const newTierName =
            card.tier_name === "Platinum" ? "Gold" : "Silver";
          const multiplierKey =
            newTierName === "Gold"
              ? "card_gold_multiplier"
              : "card_silver_multiplier";
          const newMultiplier = await getCardConfigNumber(
            ctx,
            multiplierKey,
            newTierName === "Gold" ? 2.0 : 1.5
          );

          await ctx.db.patch(card._id, {
            tier_name: newTierName,
            points_multiplier: newMultiplier,
            maintenance_warning_sent: false,
            updated_at: now,
          });

          // Update user tier
          const tier = await ctx.db
            .query("tiers")
            .withIndex("by_name", (q) => q.eq("name", newTierName))
            .first();
          if (tier) {
            await ctx.db.patch(card.user_id, {
              current_tier_id: tier._id,
              updatedAt: now,
            });
          }

          await ctx.db.insert("notifications", {
            recipient_id: card.user_id,
            type: "alert",
            title: "Tier Downgraded",
            message: `Your card has been downgraded to ${newTierName} due to inactivity. Visit a branch to maintain your tier!`,
            priority: "high",
            recipient_type: "customer",
            is_read: false,
            is_archived: false,
            createdAt: now,
            updatedAt: now,
          });
          processed++;
        } else if (
          daysSinceVisit > maintenanceDays - 5 &&
          !card.maintenance_warning_sent
        ) {
          // Send warning 5 days before drop
          await ctx.db.patch(card._id, {
            maintenance_warning_sent: true,
            updated_at: now,
          });
          await ctx.db.insert("notifications", {
            recipient_id: card.user_id,
            type: "alert",
            title: "Visit Soon!",
            message: `Your ${card.tier_name} tier may drop in ${maintenanceDays - daysSinceVisit} days due to inactivity. Book a service to keep your tier!`,
            priority: "medium",
            recipient_type: "customer",
            is_read: false,
            is_archived: false,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      // Check birthday freebie
      const user = await ctx.db.get(card.user_id);
      if (user?.birthday) {
        const currentMonth = new Date(now).getMonth();
        const currentYear = new Date(now).getFullYear();
        const birthdayMonth = new Date(user.birthday).getMonth();

        if (
          currentMonth === birthdayMonth &&
          card.birthday_freebie_year !== currentYear
        ) {
          try {
            await generateBirthdayFreebieInternal(
              ctx,
              card.user_id,
              card._id,
              now
            );
            processed++;
          } catch (e) {
            console.error(
              `[CRON] Birthday freebie failed for user ${card.user_id}:`,
              e
            );
          }
        }
      }
    }

    // 2. Grace period cards past grace_period_ends_at → expired
    const graceCards = await ctx.db
      .query("membership_cards")
      .withIndex("by_status", (q) => q.eq("status", "grace_period"))
      .collect();

    for (const card of graceCards) {
      if (card.grace_period_ends_at < now) {
        await ctx.db.patch(card._id, {
          status: "expired",
          updated_at: now,
        });

        // Clear user's tier
        await ctx.db.patch(card.user_id, {
          current_tier_id: undefined,
          updatedAt: now,
        });

        await ctx.db.insert("notifications", {
          recipient_id: card.user_id,
          type: "alert",
          title: "Card Fully Expired",
          message:
            "Your membership card and tier have been deactivated. Renew to get back your benefits — you'll start fresh at Silver.",
          priority: "high",
          recipient_type: "customer",
          is_read: false,
          is_archived: false,
          createdAt: now,
          updatedAt: now,
        });
        processed++;
      }
    }

    console.log(
      `[CRON] dailyCardMaintenance completed. Processed ${processed} cards.`
    );
  },
});

// ============================================================================
// ONE-TIME MIGRATION
// ============================================================================

/**
 * Migrate tiers for the card-based system.
 * - Deactivates Bronze tier
 * - Updates Silver/Gold/Platinum thresholds to 0 (card-based, not points-based)
 * - Clears users off Bronze tier
 *
 * Run once from Convex dashboard: api.services.membershipCards.migrateToCardSystem
 */
export const migrateToCardSystem = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const results: string[] = [];

    // 1. Deactivate Bronze tier
    const bronze = await ctx.db
      .query("tiers")
      .withIndex("by_name", (q) => q.eq("name", "Bronze"))
      .first();

    if (bronze) {
      await ctx.db.patch(bronze._id, {
        is_active: false,
        updated_at: now,
      });
      results.push("Bronze tier deactivated");

      // Clear users off Bronze → no tier (they'll need a card)
      const allUsers = await ctx.db.query("users").collect();
      const bronzeUsers = allUsers.filter(
        (u) => u.current_tier_id === bronze._id
      );

      for (const u of bronzeUsers) {
        await ctx.db.patch(u._id, {
          current_tier_id: undefined,
          updatedAt: now,
        });
      }
      results.push(`Cleared ${bronzeUsers.length} users from Bronze tier`);
    } else {
      results.push("Bronze tier not found (already removed?)");
    }

    // 2. Update Silver/Gold/Platinum — set threshold to 0 (card-managed)
    const tierUpdates = [
      { name: "Silver", display_order: 1 },
      { name: "Gold", display_order: 2 },
      { name: "Platinum", display_order: 3 },
    ];

    for (const tu of tierUpdates) {
      const tier = await ctx.db
        .query("tiers")
        .withIndex("by_name", (q) => q.eq("name", tu.name))
        .first();

      if (tier) {
        await ctx.db.patch(tier._id, {
          threshold: 0, // Card-managed, not points-based
          display_order: tu.display_order,
          is_active: true,
          updated_at: now,
        });
        results.push(`${tu.name} tier updated (threshold=0, active)`);
      } else {
        results.push(`${tu.name} tier not found — skipped`);
      }
    }

    console.log("[MIGRATION] migrateToCardSystem:", results);
    return { results };
  },
});
