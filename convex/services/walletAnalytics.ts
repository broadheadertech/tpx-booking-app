/**
 * Wallet Analytics Service - Story 26.1
 *
 * Provides analytics queries for Super Admin wallet system monitoring.
 * Includes float calculation, outstanding amounts, and monthly metrics.
 *
 * @module convex/services/walletAnalytics
 */

import { query } from "../_generated/server";
import { v } from "convex/values";
import { EARNING_STATUS } from "../lib/walletUtils";
import { checkRole } from "./rbac";

// ============================================================================
// QUERIES - Super Admin Analytics
// ============================================================================

/**
 * Get wallet system overview metrics
 *
 * AC #1: Returns Total Float, Outstanding to Branches, Available for Operations
 * AC #4: Real-time via Convex subscription
 *
 * @returns Overview metrics for Super Admin dashboard
 */
export const getWalletOverview = query({
  args: {},
  handler: async (ctx) => {
    // Total Float: Sum of all customer wallet balances
    const wallets = await ctx.db.query("wallets").collect();
    const totalFloat = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);

    // Outstanding to Branches: Sum of all pending earnings across all branches
    const pendingEarnings = await ctx.db
      .query("branchWalletEarnings")
      .filter((q) => q.eq(q.field("status"), EARNING_STATUS.PENDING))
      .collect();
    const outstandingToBranches = pendingEarnings.reduce(
      (sum, e) => sum + (e.net_amount || 0),
      0
    );

    // Available for Operations: Float minus Outstanding
    const availableForOps = totalFloat - outstandingToBranches;

    return {
      totalFloat,
      outstandingToBranches,
      availableForOps,
      walletCount: wallets.length,
      pendingEarningsCount: pendingEarnings.length,
    };
  },
});

/**
 * Get monthly wallet metrics for a specific period
 *
 * AC #2: Returns Top-ups, Payments, Commission, Settlements
 * AC #3: Supports date range filtering
 *
 * @param startDate - Start timestamp (defaults to start of current month)
 * @param endDate - End timestamp (defaults to now)
 */
export const getMonthlyMetrics = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Default to current month if not specified
    const now = Date.now();
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const startDate = args.startDate ?? startOfMonth.getTime();
    const endDate = args.endDate ?? now;

    // Total Top-ups: Sum of wallet_transactions where type=topup AND completed
    const allTransactions = await ctx.db.query("wallet_transactions").collect();
    const topUpTransactions = allTransactions.filter(
      (t) =>
        t.type === "topup" &&
        t.status === "completed" &&
        t.createdAt >= startDate &&
        t.createdAt <= endDate
    );
    const totalTopUps = topUpTransactions.reduce(
      (sum, t) => sum + (t.amount || 0),
      0
    );

    // Total Wallet Payments: Sum of wallet_transactions where type=payment AND completed
    const paymentTransactions = allTransactions.filter(
      (t) =>
        t.type === "payment" &&
        t.status === "completed" &&
        t.createdAt >= startDate &&
        t.createdAt <= endDate
    );
    const totalPayments = paymentTransactions.reduce(
      (sum, t) => sum + (t.amount || 0),
      0
    );

    // Commission Earned: Sum of commission_amount from branchWalletEarnings in period
    const allEarnings = await ctx.db.query("branchWalletEarnings").collect();
    const periodEarnings = allEarnings.filter(
      (e) => e.created_at >= startDate && e.created_at <= endDate
    );
    const commissionEarned = periodEarnings.reduce(
      (sum, e) => sum + (e.commission_amount || 0),
      0
    );

    // Gross earnings for reference
    const grossEarnings = periodEarnings.reduce(
      (sum, e) => sum + (e.gross_amount || 0),
      0
    );

    // Settlements Paid: Sum of completed settlements in period
    const allSettlements = await ctx.db.query("branchSettlements").collect();
    const completedSettlements = allSettlements.filter(
      (s) =>
        s.status === "completed" &&
        s.completed_at &&
        s.completed_at >= startDate &&
        s.completed_at <= endDate
    );
    const settlementsPaid = completedSettlements.reduce(
      (sum, s) => sum + (s.amount || 0),
      0
    );

    // Pending settlements count for context
    const pendingSettlements = allSettlements.filter(
      (s) => s.status === "pending" || s.status === "approved" || s.status === "processing"
    );

    return {
      totalTopUps,
      topUpCount: topUpTransactions.length,
      totalPayments,
      paymentCount: paymentTransactions.length,
      commissionEarned,
      grossEarnings,
      settlementsPaid,
      settlementsCount: completedSettlements.length,
      pendingSettlementsCount: pendingSettlements.length,
      periodStart: startDate,
      periodEnd: endDate,
    };
  },
});

/**
 * Get trend data for wallet system (monthly comparison)
 * Optimized: queries database once, then filters in memory for each month
 *
 * @param months - Number of months to include (default 3)
 */
export const getMonthlyTrends = query({
  args: {
    months: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const monthsToFetch = args.months ?? 3;
    const now = new Date();

    // Query all data ONCE upfront (optimization: avoid N queries per month)
    const [allTransactions, allEarnings, allSettlements] = await Promise.all([
      ctx.db.query("wallet_transactions").collect(),
      ctx.db.query("branchWalletEarnings").collect(),
      ctx.db.query("branchSettlements").collect(),
    ]);

    const trends: Array<{
      month: string;
      year: number;
      topUps: number;
      payments: number;
      commission: number;
      settlements: number;
    }> = [];

    for (let i = 0; i < monthsToFetch; i++) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);

      const startDate = monthDate.getTime();
      const endDate = monthEnd.getTime();

      // Filter transactions for this month (from pre-fetched data)
      const monthTransactions = allTransactions.filter(
        (t) => t.createdAt >= startDate && t.createdAt <= endDate
      );

      const topUps = monthTransactions
        .filter((t) => t.type === "topup" && t.status === "completed")
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      const payments = monthTransactions
        .filter((t) => t.type === "payment" && t.status === "completed")
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      // Filter earnings for this month (from pre-fetched data)
      const monthEarnings = allEarnings.filter(
        (e) => e.created_at >= startDate && e.created_at <= endDate
      );
      const commission = monthEarnings.reduce(
        (sum, e) => sum + (e.commission_amount || 0),
        0
      );

      // Filter settlements for this month (from pre-fetched data)
      const monthSettlements = allSettlements.filter(
        (s) =>
          s.status === "completed" &&
          s.completed_at &&
          s.completed_at >= startDate &&
          s.completed_at <= endDate
      );
      const settlementsTotal = monthSettlements.reduce(
        (sum, s) => sum + (s.amount || 0),
        0
      );

      trends.push({
        month: monthDate.toLocaleString("en-US", { month: "short" }),
        year: monthDate.getFullYear(),
        topUps,
        payments,
        commission,
        settlements: settlementsTotal,
      });
    }

    // Return in chronological order (oldest first)
    return trends.reverse();
  },
});

/**
 * Get quick summary stats for dashboard header
 */
export const getQuickStats = query({
  args: {},
  handler: async (ctx) => {
    // Active wallet users (have balance > 0)
    const wallets = await ctx.db.query("wallets").collect();
    const activeWallets = wallets.filter((w) => (w.balance || 0) > 0).length;

    // Branches with pending earnings
    const pendingEarnings = await ctx.db
      .query("branchWalletEarnings")
      .filter((q) => q.eq(q.field("status"), EARNING_STATUS.PENDING))
      .collect();
    const branchesWithPending = new Set(pendingEarnings.map((e) => e.branch_id)).size;

    // Pending settlement requests
    const settlements = await ctx.db.query("branchSettlements").collect();
    const pendingSettlements = settlements.filter(
      (s) => s.status === "pending" || s.status === "approved"
    ).length;

    // Today's activity
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartTime = todayStart.getTime();

    const transactions = await ctx.db.query("wallet_transactions").collect();
    const todayTransactions = transactions.filter(
      (t) => t.createdAt >= todayStartTime && t.status === "completed"
    );
    const todayTopUps = todayTransactions
      .filter((t) => t.type === "topup")
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const todayPayments = todayTransactions
      .filter((t) => t.type === "payment")
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    return {
      activeWallets,
      totalWallets: wallets.length,
      branchesWithPending,
      pendingSettlements,
      todayTopUps,
      todayPayments,
      todayTransactionCount: todayTransactions.length,
    };
  },
});

// ============================================================================
// QUERIES - Story 26.2: By-Branch Breakdown
// ============================================================================

/**
 * Get wallet summaries for all branches
 *
 * AC #1: Returns table data with branch performance metrics
 *
 * @returns Array of branch wallet summaries for table display
 */
export const getBranchWalletSummaries = query({
  args: {},
  handler: async (ctx) => {
    // Super Admin only
    await checkRole(ctx, "super_admin");

    // Get all branches
    const branches = await ctx.db.query("branches").collect();

    // Query all data ONCE (optimization)
    const [allEarnings, allSettlements] = await Promise.all([
      ctx.db.query("branchWalletEarnings").collect(),
      ctx.db.query("branchSettlements").collect(),
    ]);

    // Build summaries for each branch
    const summaries = branches.map((branch) => {
      // Filter earnings for this branch
      const branchEarnings = allEarnings.filter(
        (e) => e.branch_id === branch._id
      );

      // Calculate totals
      const totalEarnings = branchEarnings.reduce(
        (sum, e) => sum + (e.gross_amount || 0),
        0
      );
      const pendingAmount = branchEarnings
        .filter((e) => e.status === EARNING_STATUS.PENDING)
        .reduce((sum, e) => sum + (e.net_amount || 0), 0);
      const settledAmount = branchEarnings
        .filter((e) => e.status === EARNING_STATUS.SETTLED)
        .reduce((sum, e) => sum + (e.net_amount || 0), 0);
      const totalCommission = branchEarnings.reduce(
        (sum, e) => sum + (e.commission_amount || 0),
        0
      );

      // Get last settlement date
      const branchSettlements = allSettlements.filter(
        (s) => s.branch_id === branch._id && s.status === "completed"
      );
      const lastSettlement = branchSettlements.sort(
        (a, b) => (b.completed_at || 0) - (a.completed_at || 0)
      )[0];

      return {
        branchId: branch._id,
        branchName: branch.name || "Unknown Branch",
        totalEarnings,
        pendingAmount,
        settledAmount,
        totalCommission,
        lastSettlementDate: lastSettlement?.completed_at || null,
        transactionCount: branchEarnings.length,
        pendingSettlements: allSettlements.filter(
          (s) =>
            s.branch_id === branch._id &&
            (s.status === "pending" || s.status === "approved" || s.status === "processing")
        ).length,
      };
    });

    // Filter out branches with no wallet activity
    const activeBranches = summaries.filter((s) => s.transactionCount > 0);

    // Sort by total earnings descending by default
    activeBranches.sort((a, b) => b.totalEarnings - a.totalEarnings);

    return {
      branches: activeBranches,
      totalBranches: activeBranches.length,
    };
  },
});

/**
 * Get detailed wallet information for a specific branch
 *
 * AC #4: Returns branch detail for modal view
 *
 * @param branchId - The branch ID to get details for
 */
export const getBranchWalletDetail = query({
  args: {
    branchId: v.id("branches"),
  },
  handler: async (ctx, args) => {
    // Super Admin only
    await checkRole(ctx, "super_admin");

    // Get branch info
    const branch = await ctx.db.get(args.branchId);
    if (!branch) {
      return null;
    }

    // Get branch wallet settings
    const branchSettings = await ctx.db
      .query("branchWalletSettings")
      .filter((q) => q.eq(q.field("branch_id"), args.branchId))
      .first();

    // Get global wallet config for commission rate
    const walletConfig = await ctx.db.query("walletConfig").first();
    const globalCommissionRate = walletConfig?.default_commission_percent ?? 5;

    // Commission rate: use branch override if set, otherwise global
    const commissionRate = branchSettings?.commission_override ?? globalCommissionRate;

    // Get recent earnings (last 20)
    const allEarnings = await ctx.db
      .query("branchWalletEarnings")
      .filter((q) => q.eq(q.field("branch_id"), args.branchId))
      .collect();
    const recentEarnings = allEarnings
      .sort((a, b) => b.created_at - a.created_at)
      .slice(0, 20)
      .map((e) => ({
        id: e._id,
        serviceName: e.service_name,
        grossAmount: e.gross_amount,
        commissionAmount: e.commission_amount,
        netAmount: e.net_amount,
        status: e.status,
        createdAt: e.created_at,
      }));

    // Get recent settlements (last 10)
    const allSettlements = await ctx.db
      .query("branchSettlements")
      .filter((q) => q.eq(q.field("branch_id"), args.branchId))
      .collect();
    const recentSettlements = allSettlements
      .sort((a, b) => b.created_at - a.created_at)
      .slice(0, 10)
      .map((s) => ({
        id: s._id,
        amount: s.amount,
        status: s.status,
        createdAt: s.created_at,
        completedAt: s.completed_at,
        transferReference: s.transfer_reference,
      }));

    // Calculate summary stats
    const totalEarnings = allEarnings.reduce(
      (sum, e) => sum + (e.gross_amount || 0),
      0
    );
    const totalCommission = allEarnings.reduce(
      (sum, e) => sum + (e.commission_amount || 0),
      0
    );
    const pendingAmount = allEarnings
      .filter((e) => e.status === EARNING_STATUS.PENDING)
      .reduce((sum, e) => sum + (e.net_amount || 0), 0);
    const settledAmount = allEarnings
      .filter((e) => e.status === EARNING_STATUS.SETTLED)
      .reduce((sum, e) => sum + (e.net_amount || 0), 0);

    return {
      branch: {
        id: branch._id,
        name: branch.name,
      },
      commissionRate,
      isCustomCommission: branchSettings?.commission_override !== undefined && branchSettings?.commission_override !== null,
      payoutDetails: branchSettings
        ? {
            method: branchSettings.payout_method,
            accountNumber: branchSettings.payout_account_number,
            accountName: branchSettings.payout_account_name,
            bankName: branchSettings.payout_bank_name,
          }
        : null,
      summary: {
        totalEarnings,
        totalCommission,
        pendingAmount,
        settledAmount,
        transactionCount: allEarnings.length,
        settlementCount: allSettlements.length,
      },
      recentEarnings,
      recentSettlements,
    };
  },
});
