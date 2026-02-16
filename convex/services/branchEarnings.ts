/**
 * Branch Wallet Earnings Service
 *
 * Manages branch wallet earnings from POS wallet payments.
 * Handles commission calculation, earning records, and branch-isolated queries.
 *
 * Story 22.1: Create Wallet Earning Records
 * @module convex/services/branchEarnings
 */

import { mutation, query } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import {
  calculateCommission,
  DEFAULT_COMMISSION_PERCENT,
  EARNING_STATUS,
} from "../lib/walletUtils";

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new earning record when a wallet payment is processed
 *
 * AC #1: Records wallet payment to branch ledger with all required fields
 * AC #3: Uses branch commission override if available, else global default
 *
 * @param branch_id - Branch receiving the payment
 * @param booking_id - Booking associated with the payment
 * @param customer_id - Customer who made the payment
 * @param staff_id - Staff who processed the payment (optional)
 * @param service_name - Service name for display
 * @param gross_amount - Full payment amount in whole pesos
 */
export const createEarningRecord = mutation({
  args: {
    branch_id: v.id("branches"),
    booking_id: v.id("bookings"),
    customer_id: v.id("users"),
    staff_id: v.optional(v.id("users")),
    service_name: v.string(),
    gross_amount: v.number(),
    processed_via: v.optional(v.string()),    // "admin" | "branch"
    payment_source: v.optional(v.string()),   // "online_paymongo" | "wallet"
  },
  handler: async (ctx, args) => {
    // Validate gross_amount
    if (args.gross_amount <= 0) {
      throw new ConvexError({
        code: "INVALID_AMOUNT",
        message: "Invalid payment amount",
      });
    }

    // Validate branch exists
    const branch = await ctx.db.get(args.branch_id);
    if (!branch) {
      throw new ConvexError({
        code: "BRANCH_NOT_FOUND",
        message: "Branch not found",
      });
    }

    // Validate booking exists
    const booking = await ctx.db.get(args.booking_id);
    if (!booking) {
      throw new ConvexError({
        code: "BOOKING_NOT_FOUND",
        message: "Booking not found",
      });
    }

    // Get commission rate: branch override > global config > default
    // AC #3: Branch override takes precedence
    const branchSettings = await ctx.db
      .query("branchWalletSettings")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .first();

    const globalConfig = await ctx.db.query("walletConfig").first();

    const commissionPercent =
      branchSettings?.commission_override ??
      globalConfig?.default_commission_percent ??
      DEFAULT_COMMISSION_PERCENT;

    // AC #2: Calculate commission using mandatory pattern
    const { commissionAmount, netAmount } = calculateCommission(
      args.gross_amount,
      commissionPercent
    );

    // Create earning record with all required fields
    const now = Date.now();
    const recordId = await ctx.db.insert("branchWalletEarnings", {
      branch_id: args.branch_id,
      booking_id: args.booking_id,
      customer_id: args.customer_id,
      staff_id: args.staff_id,
      service_name: args.service_name,
      gross_amount: args.gross_amount,
      commission_percent: commissionPercent,
      commission_amount: commissionAmount,
      net_amount: netAmount,
      status: EARNING_STATUS.PENDING,
      created_at: now,
      processed_via: args.processed_via || "branch",
      payment_source: args.payment_source || "wallet",
    });

    console.log("[BRANCH_EARNINGS] Created earning record:", {
      recordId,
      branch_id: args.branch_id,
      gross: args.gross_amount,
      commission: commissionAmount,
      net: netAmount,
      rate: commissionPercent,
    });

    return {
      recordId,
      grossAmount: args.gross_amount,
      commissionPercent,
      commissionAmount,
      netAmount,
    };
  },
});

// ============================================================================
// QUERIES - Branch Isolated (AC #4)
// ============================================================================

/**
 * Get all earnings for a specific branch
 *
 * AC #4: Proper branch isolation enforced via by_branch index
 *
 * @param branch_id - Branch to get earnings for
 * @param limit - Maximum number of records (default 100)
 */
export const getBranchEarnings = query({
  args: {
    branch_id: v.id("branches"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    const earnings = await ctx.db
      .query("branchWalletEarnings")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .order("desc")
      .take(limit);

    return earnings;
  },
});

/**
 * Get earnings with date filtering and customer names (Story 22.3)
 *
 * AC #3: Date range filtering support
 * AC #5: Branch isolation via by_branch index
 *
 * @param branch_id - Branch to get earnings for
 * @param startDate - Start date timestamp (optional)
 * @param endDate - End date timestamp (optional)
 * @param limit - Maximum number of records (default 50)
 */
export const getBranchEarningsFiltered = query({
  args: {
    branch_id: v.id("branches"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    // Query earnings for this branch, sorted by date descending
    const allEarnings = await ctx.db
      .query("branchWalletEarnings")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .order("desc")
      .take(limit + 50); // Take extra for filtering buffer

    // Filter by date range if specified
    let filtered = allEarnings;
    if (args.startDate || args.endDate) {
      filtered = allEarnings.filter((e) => {
        if (args.startDate && e.created_at < args.startDate) return false;
        if (args.endDate && e.created_at > args.endDate) return false;
        return true;
      });
    }

    // Take only the requested limit
    const limitedEarnings = filtered.slice(0, limit);

    // Enrich with customer names
    const enriched = await Promise.all(
      limitedEarnings.map(async (earning) => {
        const customer = await ctx.db.get(earning.customer_id);
        return {
          ...earning,
          customer_name: customer?.name || "Unknown Customer",
        };
      })
    );

    // Calculate totals for filtered period
    let totalGross = 0;
    let totalCommission = 0;
    let totalNet = 0;

    for (const earning of filtered) {
      totalGross += earning.gross_amount;
      totalCommission += earning.commission_amount;
      totalNet += earning.net_amount;
    }

    return {
      earnings: enriched,
      hasMore: filtered.length > limit,
      totals: {
        count: filtered.length,
        totalGross,
        totalCommission,
        totalNet,
      },
    };
  },
});

/**
 * Get pending earnings total for a branch (dashboard summary)
 *
 * AC #4: Branch isolation with by_branch_status index
 *
 * @param branch_id - Branch to get pending total for
 */
export const getBranchPendingTotal = query({
  args: {
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const pendingEarnings = await ctx.db
      .query("branchWalletEarnings")
      .withIndex("by_branch_status", (q) =>
        q.eq("branch_id", args.branch_id).eq("status", EARNING_STATUS.PENDING)
      )
      .collect();

    // Calculate totals
    let totalGross = 0;
    let totalCommission = 0;
    let totalNet = 0;

    for (const earning of pendingEarnings) {
      totalGross += earning.gross_amount;
      totalCommission += earning.commission_amount;
      totalNet += earning.net_amount;
    }

    return {
      count: pendingEarnings.length,
      totalGross,
      totalCommission,
      totalNet,
    };
  },
});

/**
 * Get earnings by status for a branch
 *
 * AC #4: Uses by_branch_status compound index
 *
 * @param branch_id - Branch to get earnings for
 * @param status - Status filter ("pending" | "settled")
 * @param limit - Maximum number of records (default 100)
 */
export const getEarningsByStatus = query({
  args: {
    branch_id: v.id("branches"),
    status: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    const earnings = await ctx.db
      .query("branchWalletEarnings")
      .withIndex("by_branch_status", (q) =>
        q.eq("branch_id", args.branch_id).eq("status", args.status)
      )
      .order("desc")
      .take(limit);

    return earnings;
  },
});

/**
 * Get a single earning record by ID
 *
 * @param earningId - ID of the earning record
 */
export const getEarningById = query({
  args: {
    earningId: v.id("branchWalletEarnings"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.earningId);
  },
});

/**
 * Get earnings linked to a specific settlement
 *
 * AC #5: Settlement linkage via by_settlement index
 *
 * @param settlement_id - Settlement to get linked earnings for
 */
export const getEarningsBySettlement = query({
  args: {
    settlement_id: v.id("branchSettlements"),
  },
  handler: async (ctx, args) => {
    const earnings = await ctx.db
      .query("branchWalletEarnings")
      .withIndex("by_settlement", (q) =>
        q.eq("settlement_id", args.settlement_id)
      )
      .collect();

    return earnings;
  },
});

// ============================================================================
// INTERNAL MUTATIONS (for settlement linking)
// ============================================================================

/**
 * Link pending earnings to a settlement request
 *
 * AC #5: Links earnings to settlement via settlement_id field
 *
 * @param branch_id - Branch whose earnings to link
 * @param settlement_id - Settlement to link to
 * @returns Count of linked earnings and total amount
 */
export const linkEarningsToSettlement = mutation({
  args: {
    branch_id: v.id("branches"),
    settlement_id: v.id("branchSettlements"),
  },
  handler: async (ctx, args) => {
    // Validate settlement exists
    const settlement = await ctx.db.get(args.settlement_id);
    if (!settlement) {
      throw new ConvexError({
        code: "SETTLEMENT_NOT_FOUND",
        message: "Settlement not found",
      });
    }

    // Get all pending earnings for this branch
    const pendingEarnings = await ctx.db
      .query("branchWalletEarnings")
      .withIndex("by_branch_status", (q) =>
        q.eq("branch_id", args.branch_id).eq("status", EARNING_STATUS.PENDING)
      )
      .collect();

    let totalLinked = 0;
    let totalAmount = 0;

    // Link each earning to the settlement
    for (const earning of pendingEarnings) {
      await ctx.db.patch(earning._id, {
        settlement_id: args.settlement_id,
      });
      totalLinked++;
      totalAmount += earning.net_amount;
    }

    console.log("[BRANCH_EARNINGS] Linked earnings to settlement:", {
      settlement_id: args.settlement_id,
      count: totalLinked,
      amount: totalAmount,
    });

    return {
      count: totalLinked,
      totalAmount,
    };
  },
});

/**
 * Mark earnings as settled when settlement is completed
 *
 * @param settlement_id - Settlement that was completed
 */
export const markEarningsAsSettled = mutation({
  args: {
    settlement_id: v.id("branchSettlements"),
  },
  handler: async (ctx, args) => {
    const linkedEarnings = await ctx.db
      .query("branchWalletEarnings")
      .withIndex("by_settlement", (q) =>
        q.eq("settlement_id", args.settlement_id)
      )
      .collect();

    let settledCount = 0;

    for (const earning of linkedEarnings) {
      if (earning.status === EARNING_STATUS.PENDING) {
        await ctx.db.patch(earning._id, {
          status: EARNING_STATUS.SETTLED,
        });
        settledCount++;
      }
    }

    console.log("[BRANCH_EARNINGS] Marked earnings as settled:", {
      settlement_id: args.settlement_id,
      count: settledCount,
    });

    return { settledCount };
  },
});
