import { mutation, query, action, internalMutation, internalAction } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import { api, internal } from "../_generated/api";
import {
  calculateTopUpBonus,
  calculateBonusWithCap,
  shouldResetMonthlyBonus,
  getMonthStartTimestamp,
  DEFAULT_BONUS_TIERS,
  type BonusTier
} from "../lib/walletBonus";
import { toStorageFormat } from "../lib/points";
import { decryptApiKey } from "../lib/encryption";
import { getAuthenticatedUser } from "../lib/unifiedAuth";
// Encryption key for SA wallet credentials
const PAYMONGO_ENCRYPTION_KEY = process.env.PAYMONGO_ENCRYPTION_KEY || "";

export const getWallet = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Soft auth guard: only enforced when Clerk JWT is present
    // Legacy session auth (no JWT) passes through for backward compatibility
    const currentUser = await getAuthenticatedUser(ctx);
    if (currentUser) {
      const isOwner = currentUser._id === args.userId;
      const isStaffOrAdmin = ["customer", "staff", "admin", "branch_admin", "super_admin", "barber"].includes(currentUser.role);
      if (!isOwner && !isStaffOrAdmin) {
        throw new ConvexError({ code: "FORBIDDEN", message: "You can only view your own wallet" });
      }
    }

    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .first();
    return wallet || null;
  },
});

export const ensureWallet = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("wallets")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .first();
    if (existing) return existing._id;
    const id = await ctx.db.insert("wallets", {
      user_id: args.userId,
      balance: 0,
      currency: "PHP",
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

export const listTransactions = query({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    // Soft auth guard: only enforced when Clerk JWT is present
    const currentUser = await getAuthenticatedUser(ctx);
    if (currentUser) {
      const isOwner = currentUser._id === args.userId;
      const isStaffOrAdmin = ["customer", "staff", "admin", "branch_admin", "super_admin", "barber"].includes(currentUser.role);
      if (!isOwner && !isStaffOrAdmin) {
        throw new ConvexError({ code: "FORBIDDEN", message: "You can only view your own transactions" });
      }
    }

    const items = await ctx.db
      .query("wallet_transactions")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .order("desc")
      .collect();
    return (args.limit ? items.slice(0, args.limit) : items);
  },
});

export const creditWallet = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    description: v.optional(v.string()),
    reference_id: v.optional(v.string()),
    applyBonus: v.optional(v.boolean()), // Whether to apply top-up bonus
    branchId: v.optional(v.id("branches")), // For promo lookup
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Story 23.3: Fetch configurable bonus tiers from walletConfig
    let bonusTiers: BonusTier[] = DEFAULT_BONUS_TIERS;
    const walletConfig = await ctx.db.query("walletConfig").first();
    if (walletConfig?.bonus_tiers && walletConfig.bonus_tiers.length > 0) {
      bonusTiers = walletConfig.bonus_tiers as BonusTier[];
    }

    // Story 23.4: Get monthly bonus cap (0 = unlimited)
    const monthlyBonusCap = walletConfig?.monthly_bonus_cap ?? 0;

    // Get existing wallet to check monthly bonus tracking
    const existingWallet = await ctx.db
      .query("wallets")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .first();

    // Story 23.4: Calculate monthly bonus usage, reset if new month
    // NOTE: bonus_topup_this_month now tracks BONUS GIVEN (in pesos), not top-up amount
    let bonusGivenThisMonth = 0;
    let bonusMonthStarted = getMonthStartTimestamp();

    if (existingWallet) {
      // Check if we need to reset monthly tracking
      if (shouldResetMonthlyBonus(existingWallet.bonus_month_started)) {
        // New month - reset tracking
        bonusGivenThisMonth = 0;
        bonusMonthStarted = getMonthStartTimestamp();
      } else {
        // Same month - use existing tracking (this is now bonus given, not top-up amount)
        bonusGivenThisMonth = existingWallet.bonus_topup_this_month ?? 0;
        bonusMonthStarted = existingWallet.bonus_month_started ?? getMonthStartTimestamp();
      }
    }

    // Story 23.4: Calculate bonus with monthly cap consideration
    // The cap now limits the BONUS AMOUNT given, not the top-up amount
    let tierBonus = 0;
    let newBonusGivenThisMonth = bonusGivenThisMonth;

    if (args.applyBonus !== false) {
      const bonusResult = calculateBonusWithCap(
        args.amount,
        monthlyBonusCap,
        bonusGivenThisMonth,
        bonusTiers
      );
      tierBonus = bonusResult.bonus;
      newBonusGivenThisMonth = bonusResult.newBonusGivenThisMonth;

      if (bonusResult.wasLimited) {
        console.log("[WALLET] Bonus limited by monthly cap:", {
          topUpAmount: args.amount,
          fullBonus: bonusResult.fullBonus,
          actualBonus: bonusResult.bonus,
          monthlyBonusCap,
          bonusGivenThisMonth,
          newBonusGivenThisMonth: bonusResult.newBonusGivenThisMonth,
        });
      }
    }

    // ========================================
    // Story 20.4: Check for wallet_bonus promo
    // ========================================
    let appliedPromo = null;
    let promoBonus = 0;

    // Get user for tier check
    const user = await ctx.db.get(args.userId);
    const userTier = user?.current_tier_id
      ? await ctx.db.get(user.current_tier_id)
      : null;
    const tierRank: Record<string, number> = { bronze: 1, silver: 2, gold: 3, platinum: 4 };
    const userRank = tierRank[userTier?.name?.toLowerCase() || "bronze"] || 1;

    // Get active wallet_bonus promotions
    let promotions = await ctx.db
      .query("flash_promotions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    // Filter to wallet_bonus type, within date range, matching branch
    promotions = promotions.filter(
      (p) =>
        p.type === "wallet_bonus" &&
        p.start_at <= now &&
        p.end_at >= now &&
        !p.is_template &&
        (!p.branch_id || p.branch_id === args.branchId)
    );

    // Find best applicable promo
    for (const promo of promotions) {
      // Check tier requirement
      if (promo.tier_requirement) {
        const requiredRank = tierRank[promo.tier_requirement] || 1;
        if (userRank < requiredRank) continue;
      }

      // Check min purchase (min top-up amount)
      if (promo.min_purchase && args.amount < promo.min_purchase) continue;

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

      // Calculate promo bonus (flat_amount is in pesos × 100, convert to pesos)
      const thisPromoBonus = promo.flat_amount ? promo.flat_amount / 100 : 0;

      if (thisPromoBonus > promoBonus) {
        promoBonus = thisPromoBonus;
        appliedPromo = promo;
      }
    }

    // Add promo bonus to total bonus (tier bonus + promo bonus)
    const totalBonus = tierBonus + promoBonus;

    // Convert to centavos for storage (₱1 = 100 centavos)
    const amountInCentavos = Math.round(args.amount * 100);
    const bonusInCentavos = Math.round(totalBonus * 100);

    // Use existingWallet we already queried earlier (Story 23.4)
    if (!existingWallet) {
      // Create wallet with initial balance, bonus, and monthly tracking (in centavos)
      await ctx.db.insert("wallets", {
        user_id: args.userId,
        balance: amountInCentavos,
        bonus_balance: bonusInCentavos,
        currency: "PHP",
        // Story 23.4: Monthly bonus tracking - now tracks BONUS GIVEN in pesos
        bonus_topup_this_month: newBonusGivenThisMonth,
        bonus_month_started: bonusMonthStarted,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      // Update existing wallet (add centavos) with monthly tracking
      await ctx.db.patch(existingWallet._id, {
        balance: existingWallet.balance + amountInCentavos,
        bonus_balance: (existingWallet.bonus_balance || 0) + bonusInCentavos,
        // Story 23.4: Update monthly bonus tracking - now tracks BONUS GIVEN in pesos
        bonus_topup_this_month: newBonusGivenThisMonth,
        bonus_month_started: bonusMonthStarted,
        updatedAt: now,
      });
    }

    // Record main top-up transaction with bonus amount
    const description = appliedPromo
      ? `Wallet Top-up ₱${args.amount} [PROMO: ${appliedPromo.name}]`
      : args.description || `Wallet Top-up ₱${args.amount}`;

    await ctx.db.insert("wallet_transactions", {
      user_id: args.userId,
      type: "topup",
      amount: args.amount,
      bonus_amount: totalBonus > 0 ? totalBonus : undefined, // Store bonus amount for display
      status: "completed",
      provider: "paymongo",
      reference_id: args.reference_id,
      createdAt: now,
      updatedAt: now,
      description,
    });

    // If bonus was applied, award bonus points
    if (totalBonus > 0) {
      try {
        // Award points for the bonus (1:1 ratio)
        const bonusPoints = toStorageFormat(totalBonus);
        await ctx.runMutation(api.services.points.earnPoints, {
          userId: args.userId,
          amount: bonusPoints,
          sourceType: "top_up_bonus",
          sourceId: args.reference_id,
          notes: appliedPromo
            ? `Bonus from ₱${args.amount} wallet top-up [PROMO: ${appliedPromo.name}]`
            : `Bonus from ₱${args.amount} wallet top-up`,
        });
        console.log("[WALLET] Bonus points awarded:", { totalBonus, bonusPoints });
      } catch (error) {
        // Log but don't fail the transaction if points fail
        console.error("[WALLET] Failed to award bonus points:", error);
      }
    }

    // Record promo usage if a promo was applied
    if (appliedPromo) {
      await ctx.db.insert("promo_usage", {
        promo_id: appliedPromo._id,
        user_id: args.userId,
        branch_id: args.branchId,
        transaction_id: args.reference_id,
        points_earned: 0, // This is wallet bonus, not points
        bonus_points: toStorageFormat(promoBonus),
        used_at: now,
      });

      // Increment promo total_uses
      await ctx.db.patch(appliedPromo._id, {
        total_uses: appliedPromo.total_uses + 1,
        updated_at: now,
      });

      console.log("[WALLET] Promo applied to top-up:", {
        promoName: appliedPromo.name,
        promoBonus,
        totalBonus,
      });
    }

    // Email customer with top-up receipt
    try {
      if (user?.email) {
        await ctx.scheduler.runAfter(0, api.services.emailNotifications.sendNotificationEmail, {
          notification_type: "customer_wallet_topup",
          to_email: user.email,
          to_name: user.nickname || user.username || "Customer",
          variables: {
            amount: `₱${args.amount.toLocaleString()}`,
            bonus: totalBonus > 0 ? `₱${totalBonus.toLocaleString()}` : "₱0",
            total: `₱${(args.amount + totalBonus).toLocaleString()}`,
          },
        });
      }
    } catch (e) { console.error("[WALLET] Top-up email failed:", e); }

    return {
      success: true,
      bonus: totalBonus,
      tierBonus,
      promoBonus,
      total: args.amount + totalBonus,
      promoApplied: appliedPromo
        ? { name: appliedPromo.name, bonus: promoBonus }
        : null,
    };
  },
});

export const createPendingTransaction = internalMutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    description: v.optional(v.string()),
    source_id: v.optional(v.string()),
    payment_id: v.optional(v.string()),
    status: v.optional(v.union(v.literal("pending"), v.literal("completed"), v.literal("failed"))),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("wallet_transactions", {
      user_id: args.userId,
      type: "topup",
      amount: args.amount,
      status: args.status || "pending",
      provider: "paymongo",
      source_id: args.source_id,
      payment_id: args.payment_id,
      description: args.description || `Wallet Top-up ₱${args.amount}`,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

export const getTransactionBySource = query({
  args: { sourceId: v.string() },
  handler: async (ctx, args) => {
    const transaction = await ctx.db
      .query("wallet_transactions")
      .withIndex("by_source", (q) => q.eq("source_id", args.sourceId))
      .first();
    return transaction || null;
  },
});

/**
 * Get pending wallet top-up transactions for a user
 * Used to show "Check Payment Status" option on wallet page
 */
// 5 minutes in milliseconds - pending topups older than this are auto-expired
const PENDING_TOPUP_EXPIRY_MS = 5 * 60 * 1000;

export const getPendingTopups = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const transactions = await ctx.db
      .query("wallet_transactions")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("type"), "topup"),
          q.eq(q.field("status"), "pending")
        )
      )
      .order("desc")
      .take(5);

    // Filter out expired pending topups (older than 5 minutes)
    return transactions.filter((t) => now - t.createdAt < PENDING_TOPUP_EXPIRY_MS);
  },
});

export const updateTransactionStatus = internalMutation({
  args: {
    transactionId: v.id("wallet_transactions"),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
    payment_id: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.transactionId, {
      status: args.status,
      payment_id: args.payment_id,
      updatedAt: now,
    });
    return { success: true };
  },
});

export const creditWalletBalance = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(), // Amount in PESOS
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    // Convert to centavos for storage (₱1 = 100 centavos)
    const amountInCentavos = Math.round(args.amount * 100);

    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .first();
    if (!wallet) {
      await ctx.db.insert("wallets", {
        user_id: args.userId,
        balance: amountInCentavos,
        currency: "PHP",
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(wallet._id, {
        balance: wallet.balance + amountInCentavos,
        updatedAt: now,
      });
    }
    return { success: true };
  },
});

/**
 * Debit wallet for payment - uses bonus balance first, then main balance
 * This mutation is called atomically with transaction creation for wallet payments
 */
export const debitWallet = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(), // Amount in PESOS (will be converted to centavos internally)
    description: v.optional(v.string()),
    reference_id: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Validate amount is positive
    if (args.amount <= 0) {
      throw new Error("Debit amount must be positive");
    }

    // Convert pesos to centavos for comparison with stored balances
    // Wallet balances are stored in centavos (₱1 = 100 centavos)
    const amountInCentavos = Math.round(args.amount * 100);

    // Get user's wallet
    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .first();

    if (!wallet) {
      throw new Error("Wallet not found. Please top up your wallet first.");
    }

    const mainBalance = wallet.balance || 0; // In centavos
    const bonusBalance = wallet.bonus_balance || 0; // In centavos
    const totalAvailable = mainBalance + bonusBalance; // In centavos

    // Server-side validation: check sufficient balance (both in centavos)
    if (totalAvailable < amountInCentavos) {
      const availablePesos = totalAvailable / 100;
      throw new Error(
        `Insufficient wallet balance. Available: ₱${availablePesos.toFixed(2)}, Required: ₱${args.amount.toFixed(2)}`
      );
    }

    // Calculate deduction: bonus first, then main (all in centavos)
    const bonusUsed = Math.min(bonusBalance, amountInCentavos);
    const remainingAmount = amountInCentavos - bonusUsed;
    const mainUsed = Math.min(mainBalance, remainingAmount);

    // Update wallet balances (in centavos)
    const newBonusBalance = bonusBalance - bonusUsed;
    const newMainBalance = mainBalance - mainUsed;

    await ctx.db.patch(wallet._id, {
      balance: newMainBalance,
      bonus_balance: newBonusBalance,
      updatedAt: now,
    });

    // Record wallet payment transaction (amount in pesos for display)
    await ctx.db.insert("wallet_transactions", {
      user_id: args.userId,
      type: "payment",
      amount: -args.amount, // Negative for debit, in pesos
      status: "completed",
      provider: "wallet",
      reference_id: args.reference_id,
      createdAt: now,
      updatedAt: now,
      description: args.description || `Wallet Payment ₱${args.amount}`,
    });

    console.log("[WALLET] Debit successful:", {
      userId: args.userId,
      amountPesos: args.amount,
      amountCentavos: amountInCentavos,
      bonusUsedCentavos: bonusUsed,
      mainUsedCentavos: mainUsed,
      newBonusBalanceCentavos: newBonusBalance,
      newMainBalanceCentavos: newMainBalance,
    });

    // Return values in pesos for display purposes
    return {
      success: true,
      bonusUsed: bonusUsed / 100, // Convert to pesos
      mainUsed: mainUsed / 100, // Convert to pesos
      totalDeducted: (bonusUsed + mainUsed) / 100, // Convert to pesos
      remainingBonus: newBonusBalance / 100, // Convert to pesos
      remainingMain: newMainBalance / 100, // Convert to pesos
      remainingTotal: (newBonusBalance + newMainBalance) / 100, // Convert to pesos
    };
  },
});

/**
 * Check if user has sufficient wallet balance for a payment
 * Used for UI to show/hide wallet payment option
 */
export const checkWalletBalance = query({
  args: {
    userId: v.id("users"),
    amount: v.number(), // Amount in PESOS
  },
  handler: async (ctx, args) => {
    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .first();

    if (!wallet) {
      return {
        hasWallet: false,
        hasSufficientBalance: false,
        mainBalance: 0,
        bonusBalance: 0,
        totalBalance: 0,
        shortfall: args.amount,
      };
    }

    // Balances are stored in centavos, convert to pesos for comparison
    const mainBalancePesos = (wallet.balance || 0) / 100;
    const bonusBalancePesos = (wallet.bonus_balance || 0) / 100;
    const totalBalancePesos = mainBalancePesos + bonusBalancePesos;
    const hasSufficientBalance = totalBalancePesos >= args.amount;

    // Return all values in pesos for consistency
    return {
      hasWallet: true,
      hasSufficientBalance,
      mainBalance: mainBalancePesos,
      bonusBalance: bonusBalancePesos,
      totalBalance: totalBalancePesos,
      shortfall: hasSufficientBalance ? 0 : args.amount - totalBalancePesos,
    };
  },
});

// ============================================================================
// STAFF WALLET QUERIES (Customer Wallet Monitoring)
// ============================================================================

/**
 * Get all customer wallets with user info (for staff dashboard)
 * Returns wallet data joined with user info for display in customers table
 */
export const getAllCustomerWallets = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 500;

    // Get all wallets
    const wallets = await ctx.db.query("wallets").take(limit);

    // Get all branches for name lookup
    const allBranches = await ctx.db.query("branches").collect();
    const branchMap: Record<string, string> = {};
    for (const b of allBranches) {
      branchMap[b._id] = b.name;
    }

    // Get user info + branch info for each wallet
    const walletsWithUsers = await Promise.all(
      wallets.map(async (wallet) => {
        const user = await ctx.db.get(wallet.user_id);
        if (!user || user.role !== "customer") return null;

        // Get customer's branch associations (primary = most bookings)
        const activities = await ctx.db
          .query("customer_branch_activity")
          .withIndex("by_customer", (q) => q.eq("customer_id", wallet.user_id))
          .collect();

        // Sort by total_bookings desc to find primary branch
        activities.sort((a, b) => b.total_bookings - a.total_bookings);
        const primaryActivity = activities[0];

        return {
          walletId: wallet._id,
          userId: wallet.user_id,
          balance: wallet.balance || 0,
          bonusBalance: wallet.bonus_balance || 0,
          totalBalance: (wallet.balance || 0) + (wallet.bonus_balance || 0),
          currency: wallet.currency || "PHP",
          userName: user.nickname || user.username || "Unknown",
          userEmail: user.email,
          // Branch info
          primaryBranchId: primaryActivity?.branch_id || null,
          primaryBranchName: primaryActivity ? (branchMap[primaryActivity.branch_id] || "Unknown") : null,
          branchCount: activities.length,
        };
      })
    );

    return walletsWithUsers.filter(Boolean);
  },
});

/**
 * Get wallet for a specific customer (for staff to view customer wallet details)
 */
export const getCustomerWalletByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .first();

    if (!wallet) {
      return null;
    }

    // Get recent transactions
    const transactions = await ctx.db
      .query("wallet_transactions")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .order("desc")
      .take(10);

    // Get user info
    const user = await ctx.db.get(args.userId);

    return {
      wallet: {
        _id: wallet._id,
        balance: wallet.balance || 0,
        bonusBalance: wallet.bonus_balance || 0,
        totalBalance: (wallet.balance || 0) + (wallet.bonus_balance || 0),
        currency: wallet.currency || "PHP",
        createdAt: wallet.createdAt,
        updatedAt: wallet.updatedAt,
      },
      transactions: transactions.map((t) => ({
        _id: t._id,
        type: t.type,
        amount: t.amount,
        status: t.status,
        description: t.description,
        createdAt: t.createdAt,
      })),
      user: user
        ? {
            name: user.nickname || user.username,
            email: user.email,
            phone: user.mobile_number,
          }
        : null,
    };
  },
});

// ============================================================================
// BOOKING WALLET PAYMENT WITH POINTS (Customer Experience)
// ============================================================================

/**
 * Pay for a booking using wallet balance and earn points
 * This is an atomic operation that:
 * 1. Debits the wallet
 * 2. Awards points (with promo check)
 * 3. Returns the result for booking update
 *
 * @param userId - Customer user ID
 * @param amount - Payment amount in pesos (will be converted to centavos internally)
 * @param bookingId - Booking ID for reference
 * @param branchId - Branch ID for promo matching
 * @returns Wallet debit result + points earned info
 */
export const payBookingWithWallet = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(), // In pesos
    bookingId: v.optional(v.id("bookings")),
    branchId: v.optional(v.id("branches")),
    serviceName: v.optional(v.string()),
    staffId: v.optional(v.id("users")), // Staff who processed payment (POS flow)
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    console.log("[WALLET_PAY] Starting wallet payment:", {
      userId: args.userId,
      amountPesos: args.amount,
      bookingId: args.bookingId,
    });

    // Step 1: Debit the wallet (amount in pesos - wallet stores pesos)
    const debitResult = await ctx.runMutation(api.services.wallet.debitWallet, {
      userId: args.userId,
      amount: args.amount,
      description: args.serviceName
        ? `Payment for ${args.serviceName}`
        : `Booking payment`,
      reference_id: args.bookingId
        ? `BOOKING-${args.bookingId}`
        : `WALLET-PAY-${now}`,
    });

    console.log("[WALLET_PAY] Wallet debit successful:", debitResult);

    // Step 2: Award points (1 peso = 1 point base rate, with promo multipliers)
    // Points are stored in ×100 format (e.g., 500 pesos = 50000 points storage = 500 display)
    const basePoints = Math.floor(args.amount); // 1 peso = 1 point
    const pointsStorageFormat = basePoints * 100; // Convert to ×100 storage format

    let pointsResult = null;
    try {
      // Use awardPointsWithPromo to check for active promotions
      pointsResult = await ctx.runMutation(api.services.points.awardPointsWithPromo, {
        userId: args.userId,
        baseAmount: args.amount, // Pass peso amount - function handles conversion
        branchId: args.branchId,
        sourceType: "wallet_payment",
        sourceId: args.bookingId
          ? `BOOKING-${args.bookingId}`
          : `WALLET-PAY-${now}`,
      });

      console.log("[WALLET_PAY] Points awarded:", pointsResult);
    } catch (error) {
      // Log but don't fail the payment if points award fails
      console.error("[WALLET_PAY] Failed to award points:", error);

      // Fallback: try basic earnPoints without promo
      try {
        pointsResult = await ctx.runMutation(api.services.points.earnPoints, {
          userId: args.userId,
          amount: pointsStorageFormat,
          sourceType: "wallet_payment",
          sourceId: args.bookingId
            ? `BOOKING-${args.bookingId}`
            : `WALLET-PAY-${now}`,
          branchId: args.branchId,
          notes: `Payment for booking - ₱${args.amount}`,
        });
        console.log("[WALLET_PAY] Fallback points awarded:", pointsResult);
      } catch (fallbackError) {
        console.error("[WALLET_PAY] Fallback points also failed:", fallbackError);
      }
    }

    // Step 3: Update booking payment status if bookingId provided
    if (args.bookingId) {
      try {
        const booking = await ctx.db.get(args.bookingId);
        if (booking) {
          await ctx.db.patch(args.bookingId, {
            payment_status: "paid",
            payment_method: "wallet",
            updatedAt: now,
          });
          console.log("[WALLET_PAY] Booking payment status updated");
        }
      } catch (error) {
        console.error("[WALLET_PAY] Failed to update booking:", error);
      }
    }

    // Step 4: Create branch earning record (Story 22.1)
    // Records wallet payment to branch ledger for settlement tracking
    let earningRecord = null;
    if (args.branchId && args.bookingId) {
      try {
        // Amount in pesos (whole pesos, not centavos) per project-context.md
        earningRecord = await ctx.runMutation(
          api.services.branchEarnings.createEarningRecord,
          {
            branch_id: args.branchId,
            booking_id: args.bookingId,
            customer_id: args.userId,
            staff_id: args.staffId, // Staff who processed (POS) or undefined (self-service)
            service_name: args.serviceName || "Booking Payment",
            gross_amount: args.amount, // In whole pesos
            processed_via: "branch",
            payment_source: "wallet",
          }
        );
        console.log("[WALLET_PAY] Branch earning record created:", {
          recordId: earningRecord.recordId,
          net: earningRecord.netAmount,
          commission: earningRecord.commissionAmount,
        });
      } catch (error) {
        // Log but don't fail the payment if earning record fails
        console.error("[WALLET_PAY] Failed to create earning record:", error);
      }
    }

    return {
      success: true,
      walletDebit: {
        bonusUsed: debitResult.bonusUsed,
        mainUsed: debitResult.mainUsed,
        totalDeducted: debitResult.totalDeducted,
        remainingBalance: debitResult.remainingTotal,
      },
      pointsEarned: pointsResult
        ? {
            basePoints: basePoints,
            bonusPoints: pointsResult.bonusPoints || 0,
            totalPoints: pointsResult.totalPoints || basePoints,
            promoApplied: pointsResult.promoApplied || null,
            tierPromotion: pointsResult.tierPromotion || null,
          }
        : {
            basePoints: 0,
            bonusPoints: 0,
            totalPoints: 0,
            promoApplied: null,
            tierPromotion: null,
          },
      message: `Payment successful! Earned ${pointsResult?.totalPoints || basePoints} points.`,
      // Story 22.1: Include branch earning info if created
      branchEarning: earningRecord
        ? {
            recordId: earningRecord.recordId,
            grossAmount: earningRecord.grossAmount,
            commissionAmount: earningRecord.commissionAmount,
            netAmount: earningRecord.netAmount,
            commissionPercent: earningRecord.commissionPercent,
          }
        : null,
    };
  },
});

// ============================================================================
// SUPER ADMIN WALLET TOP-UP (Multi-Branch Wallet - Story 23.1)
// ============================================================================

/**
 * Helper function for base64 encoding (used for PayMongo auth)
 */
function base64EncodeAscii(input: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let output = "";
  let i = 0;
  while (i < input.length) {
    const a = input.charCodeAt(i++);
    const b = i < input.length ? input.charCodeAt(i++) : NaN;
    const c = i < input.length ? input.charCodeAt(i++) : NaN;
    const b1 = a >> 2;
    const b2 = ((a & 3) << 4) | (isNaN(b) ? 0 : (b >> 4));
    const b3 = isNaN(b) ? 64 : (((b & 15) << 2) | (isNaN(c) ? 0 : (c >> 6)));
    const b4 = isNaN(c) ? 64 : (c & 63);
    output += chars[b1] + chars[b2] + chars[b3] + chars[b4];
  }
  return output;
}

/**
 * Check if wallet top-up is enabled (SA config exists and has valid credentials)
 * Story 23.1 - Task 4: Used by frontend to show/hide top-up functionality
 *
 * @returns { enabled: boolean, reason?: string }
 */
export const isWalletTopupEnabled = query({
  args: {},
  handler: async (ctx) => {
    // Get SA wallet config
    const config = await ctx.db.query("walletConfig").first();

    if (!config) {
      return {
        enabled: false,
        reason: "Wallet configuration not set up by administrator",
      };
    }

    // Check if credentials are configured
    if (!config.paymongo_public_key || !config.paymongo_secret_key) {
      return {
        enabled: false,
        reason: "PayMongo credentials not configured",
      };
    }

    return {
      enabled: true,
      isTestMode: config.is_test_mode,
    };
  },
});

/**
 * Create wallet top-up using Super Admin PayMongo credentials
 * Story 23.1 - Task 1: Main action for centralized wallet top-ups
 *
 * This creates a PayMongo checkout session using SA credentials,
 * enabling all wallet deposits to flow through a central account.
 *
 * @param userId - Customer user ID
 * @param amount - Top-up amount in pesos
 * @param origin - Frontend origin for redirect URLs
 * @returns { checkoutUrl, sessionId, amount }
 */
export const createWalletTopupWithSACredentials = action({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    origin: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate amount (PayMongo minimum is ₱100 for e-wallet transactions)
    const PAYMONGO_MIN_AMOUNT = 100;
    if (args.amount <= 0) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Top-up amount must be greater than zero",
      });
    }
    if (args.amount < PAYMONGO_MIN_AMOUNT) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: `Minimum top-up amount is ₱${PAYMONGO_MIN_AMOUNT}`,
      });
    }

    // Get SA wallet config
    const config = await ctx.runQuery(api.services.walletConfig.getDecryptedWalletConfig);

    if (!config) {
      throw new ConvexError({
        code: "CONFIG_NOT_FOUND",
        message: "Wallet top-up is currently unavailable. Please try again later.",
      });
    }

    // Check encryption key
    if (!PAYMONGO_ENCRYPTION_KEY || PAYMONGO_ENCRYPTION_KEY.length !== 64) {
      console.error("[WALLET_TOPUP] PAYMONGO_ENCRYPTION_KEY not configured");
      throw new ConvexError({
        code: "CONFIG_ERROR",
        message: "Wallet top-up is currently unavailable. Please try again later.",
      });
    }

    // Decrypt secret key
    // Format: "iv:encrypted" stored in single field
    const [iv, encrypted] = config.paymongo_secret_key.split(":");
    if (!iv || !encrypted) {
      console.error("[WALLET_TOPUP] Invalid encrypted key format");
      throw new ConvexError({
        code: "CONFIG_ERROR",
        message: "Wallet top-up is currently unavailable. Please try again later.",
      });
    }

    let secretKey: string;
    try {
      secretKey = await decryptApiKey(encrypted, iv, PAYMONGO_ENCRYPTION_KEY);
    } catch (error) {
      console.error("[WALLET_TOPUP] Failed to decrypt secret key:", error);
      throw new ConvexError({
        code: "CONFIG_ERROR",
        message: "Wallet top-up is currently unavailable. Please try again later.",
      });
    }

    // Build auth header
    const authToken = base64EncodeAscii(secretKey + ":");
    const authHeaderValue = `Basic ${authToken}`;

    // Build redirect URLs (origin is required from frontend)
    if (!args.origin) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Origin URL is required for payment redirect",
      });
    }
    const successUrl = `${args.origin}/customer/wallet?topup=success`;
    const cancelUrl = `${args.origin}/customer/wallet?topup=cancelled`;

    // Convert to centavos (PayMongo uses centavos)
    const amountInCentavos = Math.round(args.amount * 100);

    console.log("[WALLET_TOPUP] Creating checkout session:", {
      userId: args.userId,
      amount: args.amount,
      amountCentavos: amountInCentavos,
      testMode: config.is_test_mode,
    });

    // Create PayMongo checkout session
    const payload = {
      data: {
        attributes: {
          line_items: [
            {
              name: "Wallet Top-up",
              quantity: 1,
              amount: amountInCentavos,
              currency: "PHP",
            },
          ],
          payment_method_types: ["gcash", "card", "grab_pay"],
          success_url: successUrl,
          cancel_url: cancelUrl,
          description: `Wallet Top-up ₱${args.amount}`,
          metadata: {
            user_id: args.userId,
            type: "sa_wallet_topup",
            amount: args.amount.toString(),
          },
        },
      },
    };

    const response = await fetch("https://api.paymongo.com/v1/checkout_sessions", {
      method: "POST",
      headers: {
        Authorization: authHeaderValue,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    console.log("[WALLET_TOPUP] PayMongo response:", {
      ok: response.ok,
      status: response.status,
      sessionId: data?.data?.id,
      errors: data?.errors,
    });

    if (!response.ok) {
      console.error("[WALLET_TOPUP] PayMongo API error:", data?.errors);
      throw new ConvexError({
        code: "PAYMONGO_ERROR",
        message: data?.errors?.[0]?.detail || "Failed to create payment session. Please try again.",
      });
    }

    const sessionId = data.data.id;
    const checkoutUrl = data.data.attributes.checkout_url;

    // Store pending wallet transaction (reuse existing mutation)
    await ctx.runMutation(internal.services.wallet.createPendingTransaction, {
      userId: args.userId,
      amount: args.amount,
      description: `Wallet Top-up ₱${args.amount}`,
      source_id: sessionId,
      status: "pending",
    });

    return {
      success: true,
      sessionId,
      checkoutUrl,
      amount: args.amount,
    };
  },
});

/**
 * Process SA wallet top-up webhook
 * Story 23.1 - Task 3: Called from http.ts webhook handler
 *
 * Handles checkout_session.payment.paid events for SA wallet top-ups.
 * Credits the user wallet and creates transaction record.
 *
 * @param sessionId - PayMongo checkout session ID
 * @param paymentId - PayMongo payment ID
 * @param amount - Payment amount in pesos
 * @returns { success, userId, credited }
 */
export const processSAWalletTopupWebhook = internalAction({
  args: {
    sessionId: v.string(),
    paymentId: v.string(),
    amount: v.number(),
    rawPayload: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    console.log("[SA_WALLET_WEBHOOK] Processing top-up:", {
      sessionId: args.sessionId,
      paymentId: args.paymentId,
      amount: args.amount,
    });

    // Get pending transaction by source_id (session ID)
    const pending = await ctx.runQuery(api.services.wallet.getTransactionBySource, {
      sourceId: args.sessionId,
    });

    if (!pending) {
      console.error("[SA_WALLET_WEBHOOK] No pending transaction found for session:", args.sessionId);
      return { success: false, error: "Pending transaction not found" };
    }

    // Check idempotency - already processed?
    if (pending.status === "completed") {
      console.log("[SA_WALLET_WEBHOOK] Transaction already processed:", args.sessionId);
      return { success: true, alreadyProcessed: true, userId: pending.user_id };
    }

    // Credit the wallet
    const creditResult = await ctx.runMutation(api.services.wallet.creditWallet, {
      userId: pending.user_id,
      amount: pending.amount,
      description: `Wallet Top-up ₱${pending.amount}`,
      reference_id: args.paymentId,
      applyBonus: true,
    });

    // Update transaction status
    await ctx.runMutation(internal.services.wallet.updateTransactionStatus, {
      transactionId: pending._id,
      status: "completed",
      payment_id: args.paymentId,
    });

    // Story 23.2 - AC#2: Create notification for successful top-up
    try {
      const totalCredited = pending.amount + (creditResult.bonus || 0);
      const bonusMessage = creditResult.bonus > 0
        ? ` (+₱${creditResult.bonus.toLocaleString()} bonus!)`
        : "";

      await ctx.runMutation(api.services.notifications.createNotification, {
        title: "Wallet Top-up Successful",
        message: `Wallet topped up: ₱${pending.amount.toLocaleString()}${bonusMessage}`,
        type: "payment",
        priority: "medium",
        recipient_id: pending.user_id,
        recipient_type: "customer",
        action_url: "/customer/wallet",
        action_label: "View Wallet",
        metadata: {
          transaction_type: "wallet_topup",
          amount: pending.amount,
          bonus: creditResult.bonus || 0,
          total: totalCredited,
          reference: args.paymentId,
        },
      });
      console.log("[SA_WALLET_WEBHOOK] Notification created for user:", pending.user_id);
    } catch (notifError) {
      // Log but don't fail the webhook if notification creation fails
      console.error("[SA_WALLET_WEBHOOK] Failed to create notification:", notifError);
    }

    console.log("[SA_WALLET_WEBHOOK] Wallet credited:", {
      userId: pending.user_id,
      amount: pending.amount,
      bonus: creditResult.bonus,
      total: creditResult.total,
    });

    return {
      success: true,
      userId: pending.user_id,
      credited: pending.amount,
      bonus: creditResult.bonus,
      total: creditResult.total,
    };
  },
});

// ============================================================================
// POS WALLET PAYMENT QUERIES (Story 24.1)
// ============================================================================

/**
 * Get customer wallet balance for POS display
 * Story 24.1 - Task 1: Query for staff to view customer wallet at POS
 *
 * @param user_id - Optional customer user ID (null for guests)
 * @returns Wallet balance info or null for guests
 */
export const getCustomerWalletBalance = query({
  args: { user_id: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    // AC #5: Return null for guests (no user_id)
    if (!args.user_id) {
      return null;
    }

    // Get wallet from wallets table
    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id!))
      .first();

    if (!wallet) {
      return {
        hasWallet: false,
        balance: 0,
        bonusBalance: 0,
        totalBalance: 0,
      };
    }

    // Wallet stores balances in CENTAVOS - convert to PESOS for API response
    // This ensures consistency with service prices and payment amounts which are in pesos
    const balanceCentavos = wallet.balance || 0;
    const bonusBalanceCentavos = wallet.bonus_balance || 0;

    return {
      hasWallet: true,
      balance: balanceCentavos / 100, // Convert to pesos
      bonusBalance: bonusBalanceCentavos / 100, // Convert to pesos
      totalBalance: (balanceCentavos + bonusBalanceCentavos) / 100, // Convert to pesos
    };
  },
});

/**
 * Verify SA wallet webhook signature
 * Story 23.1 - Task 3.2: Signature verification using SA webhook secret
 *
 * @param signature - PayMongo-Signature header value
 * @param rawBody - Raw request body
 * @returns { valid: boolean }
 */
export const verifySAWalletWebhookSignature = internalAction({
  args: {
    signature: v.string(),
    rawBody: v.string(),
  },
  handler: async (ctx, args) => {
    // Get SA wallet config
    const config = await ctx.runQuery(api.services.walletConfig.getDecryptedWalletConfig);

    if (!config) {
      return { valid: false, error: "SA wallet config not found" };
    }

    // Check encryption key
    if (!PAYMONGO_ENCRYPTION_KEY || PAYMONGO_ENCRYPTION_KEY.length !== 64) {
      return { valid: false, error: "Encryption key not configured" };
    }

    // Decrypt webhook secret
    const [iv, encrypted] = config.paymongo_webhook_secret.split(":");
    if (!iv || !encrypted) {
      return { valid: false, error: "Invalid webhook secret format" };
    }

    let webhookSecret: string;
    try {
      webhookSecret = await decryptApiKey(encrypted, iv, PAYMONGO_ENCRYPTION_KEY);
    } catch (error) {
      console.error("[SA_WALLET_WEBHOOK] Failed to decrypt webhook secret:", error);
      return { valid: false, error: "Failed to decrypt webhook secret" };
    }

    // Parse signature components
    // Format: t=timestamp,te=test_signature,li=live_signature
    const parts = args.signature.split(",");
    let timestamp = "";
    let testSignature = "";
    let liveSignature = "";

    for (const part of parts) {
      const [key, value] = part.split("=");
      if (key === "t") timestamp = value;
      if (key === "te") testSignature = value;
      if (key === "li") liveSignature = value;
    }

    if (!timestamp) {
      return { valid: false, error: "Missing timestamp in signature" };
    }

    // Construct payload to verify
    const payloadToSign = `${timestamp}.${args.rawBody}`;
    const expectedSignature = liveSignature || testSignature;

    if (!expectedSignature) {
      return { valid: false, error: "Missing signature value" };
    }

    // Compute HMAC-SHA256 using Web Crypto API
    const encoder = new TextEncoder();
    const keyData = encoder.encode(webhookSecret);
    const payloadData = encoder.encode(payloadToSign);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, payloadData);
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const valid = computedSignature === expectedSignature;

    console.log("[SA_WALLET_WEBHOOK] Signature verification:", {
      valid,
      timestamp,
      hasTestSig: !!testSignature,
      hasLiveSig: !!liveSignature,
    });

    return { valid };
  },
});

// ============================================================================
// MANUAL WALLET TOP-UP VERIFICATION
// ============================================================================

/**
 * Manually check and process a pending wallet top-up payment
 * This is a fallback for when the webhook doesn't fire (e.g., during development or webhook misconfiguration)
 *
 * @param sessionId - The PayMongo checkout session ID (stored as source_id in pending transaction)
 * @returns Payment status and whether wallet was credited
 */
export const checkAndProcessWalletTopupStatus = action({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("[WALLET_TOPUP_CHECK] Checking session:", args.sessionId);

    // 1. Get the pending transaction
    const pending = await ctx.runQuery(api.services.wallet.getTransactionBySource, {
      sourceId: args.sessionId,
    });

    if (!pending) {
      return { success: false, error: "Pending transaction not found", status: "not_found" };
    }

    // Already processed?
    if (pending.status === "completed") {
      return {
        success: true,
        status: "already_completed",
        userId: pending.user_id,
        amount: pending.amount,
      };
    }

    // 2. Get SA wallet config for PayMongo credentials
    const config = await ctx.runQuery(api.services.walletConfig.getDecryptedWalletConfig);

    if (!config) {
      return { success: false, error: "SA wallet config not found", status: "config_error" };
    }

    // Check encryption key
    if (!PAYMONGO_ENCRYPTION_KEY || PAYMONGO_ENCRYPTION_KEY.length !== 64) {
      return { success: false, error: "Encryption key not configured", status: "config_error" };
    }

    // Decrypt secret key
    const [iv, encrypted] = config.paymongo_secret_key.split(":");
    if (!iv || !encrypted) {
      return { success: false, error: "Invalid key format", status: "config_error" };
    }

    let secretKey: string;
    try {
      secretKey = await decryptApiKey(encrypted, iv, PAYMONGO_ENCRYPTION_KEY);
    } catch (error) {
      console.error("[WALLET_TOPUP_CHECK] Failed to decrypt key:", error);
      return { success: false, error: "Failed to decrypt credentials", status: "config_error" };
    }

    // 3. Poll PayMongo to check checkout session status
    const authToken = base64EncodeAscii(secretKey + ":");
    const authHeaderValue = `Basic ${authToken}`;

    const response = await fetch(`https://api.paymongo.com/v1/checkout_sessions/${args.sessionId}`, {
      method: "GET",
      headers: {
        Authorization: authHeaderValue,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    console.log("[WALLET_TOPUP_CHECK] PayMongo response:", {
      ok: response.ok,
      status: response.status,
      sessionStatus: data?.data?.attributes?.status,
      paymentIntentStatus: data?.data?.attributes?.payment_intent?.attributes?.status,
    });

    if (!response.ok) {
      return {
        success: false,
        error: data?.errors?.[0]?.detail || "Failed to check payment status",
        status: "api_error",
      };
    }

    const sessionData = data.data;
    const sessionStatus = sessionData?.attributes?.status;
    const paymentIntent = sessionData?.attributes?.payment_intent;
    const paymentIntentStatus = paymentIntent?.attributes?.status;

    // Check if payment was successful
    if (sessionStatus === "paid" || paymentIntentStatus === "succeeded") {
      console.log("[WALLET_TOPUP_CHECK] Payment confirmed! Crediting wallet...");

      const payments = paymentIntent?.attributes?.payments || [];
      const paymentId = payments[0]?.id || `manual_${Date.now()}`;
      const amountCentavos = paymentIntent?.attributes?.amount || pending.amount * 100;
      const amount = amountCentavos / 100;

      // Credit the wallet
      const creditResult = await ctx.runMutation(api.services.wallet.creditWallet, {
        userId: pending.user_id,
        amount: pending.amount,
        description: `Wallet Top-up ₱${pending.amount}`,
        reference_id: paymentId,
        applyBonus: true,
      });

      // Update transaction status
      await ctx.runMutation(internal.services.wallet.updateTransactionStatus, {
        transactionId: pending._id,
        status: "completed",
        payment_id: paymentId,
      });

      return {
        success: true,
        status: "paid",
        userId: pending.user_id,
        amount: pending.amount,
        bonus: creditResult.bonus || 0,
        total: creditResult.total || pending.amount,
      };
    } else if (sessionStatus === "expired") {
      // Mark as failed
      await ctx.runMutation(internal.services.wallet.updateTransactionStatus, {
        transactionId: pending._id,
        status: "failed",
      });

      return {
        success: false,
        status: "expired",
        error: "Payment session has expired",
      };
    } else {
      // Still pending — check if it's been more than 5 minutes
      const ageMs = Date.now() - pending.createdAt;
      if (ageMs > PENDING_TOPUP_EXPIRY_MS) {
        console.log("[WALLET_TOPUP_CHECK] Pending topup expired after 5 minutes, marking as failed");
        await ctx.runMutation(internal.services.wallet.updateTransactionStatus, {
          transactionId: pending._id,
          status: "failed",
        });
        return {
          success: false,
          status: "expired",
          error: "Payment was not completed within 5 minutes",
        };
      }

      return {
        success: true,
        status: "pending",
        sessionStatus,
        paymentIntentStatus,
      };
    }
  },
});

// ============================================================================
// MONTHLY BONUS TRACKING MANAGEMENT
// ============================================================================

/**
 * Reset monthly bonus tracking for a specific user
 * This resets the bonus_topup_this_month counter to 0
 *
 * @param userId - The user ID whose bonus tracking should be reset
 * @returns Success status
 */
export const resetUserMonthlyBonusTracking = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .first();

    if (!wallet) {
      throw new ConvexError("Wallet not found for user");
    }

    await ctx.db.patch(wallet._id, {
      bonus_topup_this_month: 0,
      bonus_month_started: getMonthStartTimestamp(),
      updatedAt: Date.now(),
    });

    return { success: true, walletId: wallet._id };
  },
});

/**
 * Reset monthly bonus tracking for ALL users (admin function)
 * This resets the bonus_topup_this_month counter to 0 for all wallets
 *
 * @returns Number of wallets reset
 */
export const resetAllMonthlyBonusTracking = mutation({
  args: {},
  handler: async (ctx) => {
    const wallets = await ctx.db.query("wallets").collect();
    const currentMonthStart = getMonthStartTimestamp();
    const now = Date.now();

    let resetCount = 0;
    for (const wallet of wallets) {
      // Only reset if there's bonus tracking data
      if (wallet.bonus_topup_this_month !== undefined && wallet.bonus_topup_this_month > 0) {
        await ctx.db.patch(wallet._id, {
          bonus_topup_this_month: 0,
          bonus_month_started: currentMonthStart,
          updatedAt: now,
        });
        resetCount++;
      }
    }

    return { success: true, walletsReset: resetCount };
  },
});

/**
 * Get monthly bonus tracking status for a user
 * Shows how much of their monthly bonus cap they've used
 *
 * @param userId - The user ID to check
 * @returns Bonus tracking status
 */
export const getMonthlyBonusStatus = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .first();

    if (!wallet) {
      return {
        hasWallet: false,
        bonusTopupThisMonth: 0,
        bonusMonthStarted: null,
        needsReset: false,
      };
    }

    const needsReset = shouldResetMonthlyBonus(wallet.bonus_month_started);

    return {
      hasWallet: true,
      bonusTopupThisMonth: wallet.bonus_topup_this_month ?? 0,
      bonusMonthStarted: wallet.bonus_month_started ?? null,
      needsReset,
    };
  },
});