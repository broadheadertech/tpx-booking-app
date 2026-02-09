/**
 * Loyalty Analytics Service
 *
 * Provides analytics queries for the loyalty program:
 * - Wallet metrics (top-ups, payments, net float)
 * - Points metrics (earned, redeemed, circulation)
 * - Tier distribution (customers by VIP tier)
 * - Retention metrics (returning VIP customers)
 *
 * @module convex/services/loyaltyAnalytics
 */

import { query } from "../_generated/server";
import { v } from "convex/values";

// ============================================================================
// DATE RANGE HELPERS
// ============================================================================

/**
 * Get date range boundaries for common presets
 */
function getDateRange(preset: string): { start: number; end: number } {
  const now = Date.now();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfDay = today.getTime();

  switch (preset) {
    case "today":
      return { start: startOfDay, end: now };
    case "this_week": {
      const dayOfWeek = today.getDay();
      const weekStart = startOfDay - dayOfWeek * 86400000;
      return { start: weekStart, end: now };
    }
    case "this_month": {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
      return { start: monthStart, end: now };
    }
    case "last_30_days": {
      const thirtyDaysAgo = now - 30 * 86400000;
      return { start: thirtyDaysAgo, end: now };
    }
    default:
      return { start: startOfDay, end: now };
  }
}

/**
 * Get previous period range for comparison
 */
function getPreviousPeriodRange(
  start: number,
  end: number
): { start: number; end: number } {
  const duration = end - start;
  return {
    start: start - duration,
    end: start,
  };
}

// ============================================================================
// WALLET METRICS
// ============================================================================

/**
 * Get system-wide wallet metrics
 * Note: wallet_transactions doesn't have branch_id, so these are system-wide
 */
export const getSystemWideWalletMetrics = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    preset: v.optional(v.string()), // "today", "this_week", "this_month", "last_30_days"
  },
  handler: async (ctx, args) => {
    // Determine date range
    let start: number;
    let end: number;

    if (args.startDate && args.endDate) {
      start = args.startDate;
      end = args.endDate;
    } else if (args.preset) {
      const range = getDateRange(args.preset);
      start = range.start;
      end = range.end;
    } else {
      const range = getDateRange("this_month");
      start = range.start;
      end = range.end;
    }

    // Get all wallet transactions in date range
    const transactions = await ctx.db
      .query("wallet_transactions")
      .filter((q) =>
        q.and(
          q.gte(q.field("createdAt"), start),
          q.lte(q.field("createdAt"), end),
          q.eq(q.field("status"), "completed")
        )
      )
      .collect();

    // Calculate metrics
    const topUps = transactions
      .filter((t) => t.type === "topup")
      .reduce((sum, t) => sum + t.amount, 0);

    const payments = transactions
      .filter((t) => t.type === "payment")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const refunds = transactions
      .filter((t) => t.type === "refund")
      .reduce((sum, t) => sum + t.amount, 0);

    const netFloat = topUps - payments + refunds;

    // Get previous period for comparison
    const previousRange = getPreviousPeriodRange(start, end);
    const previousTransactions = await ctx.db
      .query("wallet_transactions")
      .filter((q) =>
        q.and(
          q.gte(q.field("createdAt"), previousRange.start),
          q.lte(q.field("createdAt"), previousRange.end),
          q.eq(q.field("status"), "completed")
        )
      )
      .collect();

    const prevTopUps = previousTransactions
      .filter((t) => t.type === "topup")
      .reduce((sum, t) => sum + t.amount, 0);

    const prevPayments = previousTransactions
      .filter((t) => t.type === "payment")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Calculate trends (percentage change)
    const topUpsTrend = prevTopUps > 0 ? ((topUps - prevTopUps) / prevTopUps) * 100 : 0;
    const paymentsTrend = prevPayments > 0 ? ((payments - prevPayments) / prevPayments) * 100 : 0;

    return {
      topUps,
      payments,
      refunds,
      netFloat,
      transactionCount: transactions.length,
      topUpCount: transactions.filter((t) => t.type === "topup").length,
      paymentCount: transactions.filter((t) => t.type === "payment").length,
      trends: {
        topUps: topUpsTrend,
        payments: paymentsTrend,
      },
      period: { start, end },
    };
  },
});

/**
 * Get total wallet balances across all users
 */
export const getTotalWalletBalances = query({
  args: {},
  handler: async (ctx) => {
    const wallets = await ctx.db.query("wallets").collect();

    const totalMainBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);
    const totalBonusBalance = wallets.reduce((sum, w) => sum + (w.bonus_balance || 0), 0);

    return {
      totalMainBalance,
      totalBonusBalance,
      totalBalance: totalMainBalance + totalBonusBalance,
      activeWallets: wallets.filter((w) => (w.balance || 0) + (w.bonus_balance || 0) > 0).length,
      totalWallets: wallets.length,
    };
  },
});

// ============================================================================
// POINTS METRICS
// ============================================================================

/**
 * Get branch-specific points metrics
 */
export const getBranchPointsMetrics = query({
  args: {
    branchId: v.id("branches"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    preset: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Determine date range
    let start: number;
    let end: number;

    if (args.startDate && args.endDate) {
      start = args.startDate;
      end = args.endDate;
    } else if (args.preset) {
      const range = getDateRange(args.preset);
      start = range.start;
      end = range.end;
    } else {
      const range = getDateRange("this_month");
      start = range.start;
      end = range.end;
    }

    // Get points transactions for this branch in date range
    const transactions = await ctx.db
      .query("points_transactions")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branchId))
      .filter((q) =>
        q.and(
          q.gte(q.field("created_at"), start),
          q.lte(q.field("created_at"), end)
        )
      )
      .collect();

    // Calculate metrics (amounts are in ×100 format)
    const pointsEarned = transactions
      .filter((t) => t.type === "earn")
      .reduce((sum, t) => sum + t.amount, 0);

    const pointsRedeemed = transactions
      .filter((t) => t.type === "redeem")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const netPoints = pointsEarned - pointsRedeemed;

    // Get unique customers who earned/redeemed at this branch
    const uniqueCustomers = new Set(transactions.map((t) => t.user_id.toString()));

    return {
      pointsEarned, // ×100 format
      pointsRedeemed, // ×100 format
      netPoints, // ×100 format
      displayPointsEarned: pointsEarned / 100, // Display format
      displayPointsRedeemed: pointsRedeemed / 100,
      displayNetPoints: netPoints / 100,
      pesoValueEarned: pointsEarned / 100, // 1 point = ₱1
      pesoValueRedeemed: pointsRedeemed / 100,
      transactionCount: transactions.length,
      uniqueCustomers: uniqueCustomers.size,
      period: { start, end },
    };
  },
});

/**
 * Get system-wide points metrics
 */
export const getSystemWidePointsMetrics = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    preset: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Determine date range
    let start: number;
    let end: number;

    if (args.startDate && args.endDate) {
      start = args.startDate;
      end = args.endDate;
    } else if (args.preset) {
      const range = getDateRange(args.preset);
      start = range.start;
      end = range.end;
    } else {
      const range = getDateRange("this_month");
      start = range.start;
      end = range.end;
    }

    // Get all points transactions in date range
    const transactions = await ctx.db
      .query("points_transactions")
      .withIndex("by_created_at")
      .filter((q) =>
        q.and(
          q.gte(q.field("created_at"), start),
          q.lte(q.field("created_at"), end)
        )
      )
      .collect();

    // Calculate metrics
    const pointsEarned = transactions
      .filter((t) => t.type === "earn")
      .reduce((sum, t) => sum + t.amount, 0);

    const pointsRedeemed = transactions
      .filter((t) => t.type === "redeem")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Get total points in circulation (from all ledgers)
    const ledgers = await ctx.db.query("points_ledger").collect();
    const totalCirculating = ledgers.reduce((sum, l) => sum + l.current_balance, 0);
    const totalLifetimeEarned = ledgers.reduce((sum, l) => sum + l.lifetime_earned, 0);
    const totalLifetimeRedeemed = ledgers.reduce((sum, l) => sum + l.lifetime_redeemed, 0);

    // Get previous period for comparison
    const previousRange = getPreviousPeriodRange(start, end);
    const previousTransactions = await ctx.db
      .query("points_transactions")
      .withIndex("by_created_at")
      .filter((q) =>
        q.and(
          q.gte(q.field("created_at"), previousRange.start),
          q.lte(q.field("created_at"), previousRange.end)
        )
      )
      .collect();

    const prevPointsEarned = previousTransactions
      .filter((t) => t.type === "earn")
      .reduce((sum, t) => sum + t.amount, 0);

    const prevPointsRedeemed = previousTransactions
      .filter((t) => t.type === "redeem")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Calculate trends
    const earnedTrend = prevPointsEarned > 0
      ? ((pointsEarned - prevPointsEarned) / prevPointsEarned) * 100
      : 0;
    const redeemedTrend = prevPointsRedeemed > 0
      ? ((pointsRedeemed - prevPointsRedeemed) / prevPointsRedeemed) * 100
      : 0;

    return {
      pointsEarned,
      pointsRedeemed,
      netPoints: pointsEarned - pointsRedeemed,
      displayPointsEarned: pointsEarned / 100,
      displayPointsRedeemed: pointsRedeemed / 100,
      totalCirculating, // Current points in circulation
      displayCirculating: totalCirculating / 100,
      liabilityValue: totalCirculating / 100, // Peso liability (1 pt = ₱1)
      totalLifetimeEarned,
      totalLifetimeRedeemed,
      activeUsers: ledgers.filter((l) => l.current_balance > 0).length,
      trends: {
        earned: earnedTrend,
        redeemed: redeemedTrend,
      },
      period: { start, end },
    };
  },
});

// ============================================================================
// VIP TIER METRICS
// ============================================================================

/**
 * Get tier distribution across all customers
 */
export const getSystemWideTierDistribution = query({
  args: {},
  handler: async (ctx) => {
    // Get all tiers
    const tiers = await ctx.db
      .query("tiers")
      .withIndex("by_display_order")
      .collect();

    // Get all users with tier info
    const users = await ctx.db.query("users").collect();

    // Count users by tier
    const distribution: Record<string, { count: number; name: string; icon: string; color: string }> = {};

    // Initialize with all tiers
    for (const tier of tiers) {
      distribution[tier._id.toString()] = {
        count: 0,
        name: tier.name,
        icon: tier.icon,
        color: tier.color,
      };
    }

    // Count users without a tier (default Bronze)
    let noTierCount = 0;
    const bronzeTier = tiers.find((t) => t.threshold === 0);

    for (const user of users) {
      if (user.current_tier_id) {
        const tierId = user.current_tier_id.toString();
        if (distribution[tierId]) {
          distribution[tierId].count++;
        }
      } else {
        noTierCount++;
      }
    }

    // Add no-tier users to Bronze count
    if (bronzeTier && distribution[bronzeTier._id.toString()]) {
      distribution[bronzeTier._id.toString()].count += noTierCount;
    }

    // Convert to array sorted by display order
    const result = tiers.map((tier) => ({
      tierId: tier._id,
      name: tier.name,
      icon: tier.icon,
      color: tier.color,
      threshold: tier.threshold,
      displayThreshold: tier.threshold / 100,
      count: distribution[tier._id.toString()]?.count || 0,
    }));

    const totalVIPCustomers = result.reduce((sum, t) => sum + t.count, 0);

    return {
      tiers: result,
      totalCustomers: users.length,
      totalVIPCustomers,
      bronzeCount: bronzeTier ? distribution[bronzeTier._id.toString()]?.count || 0 : noTierCount,
    };
  },
});

/**
 * Get VIP retention metrics
 * Tracks returning VIP customers within a time period
 */
export const getVIPRetentionMetrics = query({
  args: {
    branchId: v.optional(v.id("branches")),
    days: v.optional(v.number()), // Default 30 days
  },
  handler: async (ctx, args) => {
    const days = args.days || 30;
    const now = Date.now();
    const periodStart = now - days * 86400000;
    const previousPeriodStart = periodStart - days * 86400000;

    // Get transactions in current period
    let currentQuery = ctx.db.query("points_transactions");

    if (args.branchId) {
      currentQuery = currentQuery.withIndex("by_branch", (q) =>
        q.eq("branch_id", args.branchId)
      );
    }

    const currentTransactions = await currentQuery
      .filter((q) =>
        q.and(
          q.gte(q.field("created_at"), periodStart),
          q.eq(q.field("type"), "earn") // Only count earn transactions as visits
        )
      )
      .collect();

    // Get transactions in previous period
    let previousQuery = ctx.db.query("points_transactions");

    if (args.branchId) {
      previousQuery = previousQuery.withIndex("by_branch", (q) =>
        q.eq("branch_id", args.branchId)
      );
    }

    const previousTransactions = await previousQuery
      .filter((q) =>
        q.and(
          q.gte(q.field("created_at"), previousPeriodStart),
          q.lt(q.field("created_at"), periodStart),
          q.eq(q.field("type"), "earn")
        )
      )
      .collect();

    // Get unique customers in each period
    const currentCustomers = new Set(currentTransactions.map((t) => t.user_id.toString()));
    const previousCustomers = new Set(previousTransactions.map((t) => t.user_id.toString()));

    // Calculate returning customers (were in previous period AND in current period)
    const returningCustomers = [...currentCustomers].filter((c) =>
      previousCustomers.has(c)
    );

    // Get VIP tier info for current customers
    const users = await ctx.db.query("users").collect();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    let vipReturning = 0;
    let totalVIPInPeriod = 0;

    for (const userId of currentCustomers) {
      const user = userMap.get(userId);
      if (user?.current_tier_id) {
        totalVIPInPeriod++;
        if (returningCustomers.includes(userId)) {
          vipReturning++;
        }
      }
    }

    const retentionRate = previousCustomers.size > 0
      ? (returningCustomers.length / previousCustomers.size) * 100
      : 0;

    const vipRetentionRate = totalVIPInPeriod > 0
      ? (vipReturning / totalVIPInPeriod) * 100
      : 0;

    return {
      currentPeriodCustomers: currentCustomers.size,
      previousPeriodCustomers: previousCustomers.size,
      returningCustomers: returningCustomers.length,
      newCustomers: currentCustomers.size - returningCustomers.length,
      retentionRate,
      vipCustomersInPeriod: totalVIPInPeriod,
      vipReturning,
      vipRetentionRate,
      days,
    };
  },
});

// ============================================================================
// BRANCH COMPARISON
// ============================================================================

/**
 * Get comparison data for all branches (Super Admin view)
 */
export const getBranchComparison = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    preset: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Determine date range
    let start: number;
    let end: number;

    if (args.startDate && args.endDate) {
      start = args.startDate;
      end = args.endDate;
    } else if (args.preset) {
      const range = getDateRange(args.preset);
      start = range.start;
      end = range.end;
    } else {
      const range = getDateRange("this_month");
      start = range.start;
      end = range.end;
    }

    // Get all branches
    const branches = await ctx.db.query("branches").collect();

    // Get all points transactions in date range
    const transactions = await ctx.db
      .query("points_transactions")
      .filter((q) =>
        q.and(
          q.gte(q.field("created_at"), start),
          q.lte(q.field("created_at"), end)
        )
      )
      .collect();

    // Group transactions by branch
    const branchMetrics: Record<string, {
      pointsEarned: number;
      pointsRedeemed: number;
      uniqueCustomers: Set<string>;
      transactionCount: number;
    }> = {};

    for (const branch of branches) {
      branchMetrics[branch._id.toString()] = {
        pointsEarned: 0,
        pointsRedeemed: 0,
        uniqueCustomers: new Set(),
        transactionCount: 0,
      };
    }

    // Aggregate metrics
    for (const tx of transactions) {
      const branchId = tx.branch_id?.toString();
      if (branchId && branchMetrics[branchId]) {
        branchMetrics[branchId].transactionCount++;
        branchMetrics[branchId].uniqueCustomers.add(tx.user_id.toString());

        if (tx.type === "earn") {
          branchMetrics[branchId].pointsEarned += tx.amount;
        } else if (tx.type === "redeem") {
          branchMetrics[branchId].pointsRedeemed += Math.abs(tx.amount);
        }
      }
    }

    // Build result
    const result = branches.map((branch) => {
      const metrics = branchMetrics[branch._id.toString()];
      return {
        branchId: branch._id,
        branchName: branch.name,
        pointsEarned: metrics.pointsEarned,
        pointsRedeemed: metrics.pointsRedeemed,
        netPoints: metrics.pointsEarned - metrics.pointsRedeemed,
        displayPointsEarned: metrics.pointsEarned / 100,
        displayPointsRedeemed: metrics.pointsRedeemed / 100,
        pesoValueEarned: metrics.pointsEarned / 100,
        pesoValueRedeemed: metrics.pointsRedeemed / 100,
        uniqueCustomers: metrics.uniqueCustomers.size,
        transactionCount: metrics.transactionCount,
      };
    });

    // Sort by points earned (descending)
    result.sort((a, b) => b.pointsEarned - a.pointsEarned);

    return {
      branches: result,
      period: { start, end },
      totalBranches: branches.length,
    };
  },
});
