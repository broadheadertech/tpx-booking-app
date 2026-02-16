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
    // Total Float: Sum of all customer wallet balances (stored in centavos)
    const wallets = await ctx.db.query("wallets").collect();
    const totalFloatCentavos = wallets.reduce((sum, w) => sum + (w.balance || 0) + (w.bonus_balance || 0), 0);

    // Outstanding to Branches: Sum of all pending earnings across all branches
    // NOTE: branchWalletEarnings stores amounts in PESOS (not centavos)
    const pendingEarnings = await ctx.db
      .query("branchWalletEarnings")
      .filter((q) => q.eq(q.field("status"), EARNING_STATUS.PENDING))
      .collect();
    const outstandingToBranchesPesos = pendingEarnings.reduce(
      (sum, e) => sum + (e.net_amount || 0),
      0
    );

    // Booking Float: Money SA holds in PayMongo from online bookings (platform fallback)
    // Uses gross_amount because SA received the FULL amount (commission + net)
    const bookingFloatPesos = pendingEarnings
      .filter((e) => e.payment_source === "online_paymongo")
      .reduce((sum, e) => sum + (e.gross_amount || 0), 0);
    const bookingFloatCount = pendingEarnings
      .filter((e) => e.payment_source === "online_paymongo").length;

    // Branch wallets: Sum of all branch ordering wallet balances (stored in pesos)
    const branchWallets = await ctx.db.query("branch_wallets").collect();
    const totalBranchWalletBalance = branchWallets.reduce((sum, w) => sum + (w.balance || 0), 0);
    const totalBranchWalletHeld = branchWallets.reduce((sum, w) => sum + (w.held_balance || 0), 0);
    const totalBranchWalletToppedUp = branchWallets.reduce((sum, w) => sum + (w.total_topped_up || 0), 0);

    // Convert wallet balance from centavos to pesos for display
    const totalFloatPesos = totalFloatCentavos / 100;

    // Commission Earned: money SA kept from completed settlements (recorded in superAdminRevenue)
    const commissionRevenue = await ctx.db
      .query("superAdminRevenue")
      .withIndex("by_category", (q) => q.eq("category", "commission_income"))
      .collect();
    const commissionEarnedPesos = commissionRevenue.reduce(
      (sum, r) => sum + (r.amount || 0), 0
    );

    // Available for Operations: All float + booking float + commission earned - outstanding
    const availableForOpsPesos = totalFloatPesos + totalBranchWalletBalance + bookingFloatPesos + commissionEarnedPesos - outstandingToBranchesPesos;

    return {
      totalFloat: totalFloatPesos,
      outstandingToBranches: outstandingToBranchesPesos,
      availableForOps: availableForOpsPesos,
      walletCount: wallets.length,
      pendingEarningsCount: pendingEarnings.length,
      // Branch wallet data
      branchWalletBalance: totalBranchWalletBalance,
      branchWalletHeld: totalBranchWalletHeld,
      branchWalletToppedUp: totalBranchWalletToppedUp,
      branchWalletCount: branchWallets.length,
      // Booking Float: money SA holds from platform PayMongo bookings
      bookingFloat: bookingFloatPesos,
      bookingFloatCount: bookingFloatCount,
      // Commission Earned: money SA kept from settled earnings
      commissionEarned: commissionEarnedPesos,
      commissionEarnedCount: commissionRevenue.length,
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

    // Customer wallet top-ups: wallet_transactions where type=topup AND completed
    const allTransactions = await ctx.db.query("wallet_transactions").collect();
    const topUpTransactions = allTransactions.filter(
      (t) =>
        t.type === "topup" &&
        t.status === "completed" &&
        t.createdAt >= startDate &&
        t.createdAt <= endDate
    );
    const customerTopUps = topUpTransactions.reduce(
      (sum, t) => sum + (t.amount || 0),
      0
    );

    // Branch wallet top-ups: branch_wallet_transactions where type=topup
    const allBranchWalletTxns = await ctx.db.query("branch_wallet_transactions").collect();
    const branchTopUpTxns = allBranchWalletTxns.filter(
      (t) =>
        t.type === "topup" &&
        t.createdAt >= startDate &&
        t.createdAt <= endDate
    );
    const branchTopUps = branchTopUpTxns.reduce(
      (sum, t) => sum + (t.amount || 0),
      0
    );

    // Combined top-ups (customer + branch wallets)
    const totalTopUps = customerTopUps + branchTopUps;

    // Total Bonuses Given: Sum of bonus_amount from customer topup transactions
    const totalBonusGiven = topUpTransactions.reduce(
      (sum, t) => sum + ((t as any).bonus_amount || 0),
      0
    );
    const bonusTransactionCount = topUpTransactions.filter(
      (t) => (t as any).bonus_amount && (t as any).bonus_amount > 0
    ).length;

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

    // NOTE: wallet_transactions.amount, branchWalletEarnings amounts, and branchSettlements.amount
    // are all stored in PESOS (not centavos), so no conversion needed
    return {
      totalTopUps: totalTopUps,
      topUpCount: topUpTransactions.length + branchTopUpTxns.length,
      customerTopUps: customerTopUps,
      customerTopUpCount: topUpTransactions.length,
      branchTopUps: branchTopUps,
      branchTopUpCount: branchTopUpTxns.length,
      totalPayments: Math.abs(totalPayments), // Payments are stored as negative, return absolute value
      paymentCount: paymentTransactions.length,
      commissionEarned: commissionEarned,
      grossEarnings: grossEarnings,
      settlementsPaid: settlementsPaid,
      settlementsCount: completedSettlements.length,
      pendingSettlementsCount: pendingSettlements.length,
      // Bonus tracking for admin analytics
      totalBonusGiven: totalBonusGiven,
      bonusTransactionCount: bonusTransactionCount,
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

      // NOTE: All amounts (transactions, earnings, settlements) are stored in PESOS
      trends.push({
        month: monthDate.toLocaleString("en-US", { month: "short" }),
        year: monthDate.getFullYear(),
        topUps: topUps,
        payments: Math.abs(payments), // Payments are stored as negative
        commission: commission,
        settlements: settlementsTotal,
      });
    }

    // Return in chronological order (oldest first)
    return trends.reverse();
  },
});

/**
 * Get cash flow summary for wallet system
 *
 * Tracks actual money movement:
 * - Inflows: Customer top-ups, Branch top-ups
 * - Outflows: Settlements paid, Refunds
 * - Net cash flow
 *
 * @param startDate - Start timestamp (defaults to start of current month)
 * @param endDate - End timestamp (defaults to now)
 */
export const getCashFlowSummary = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const startDate = args.startDate ?? startOfMonth.getTime();
    const endDate = args.endDate ?? now;

    // === INFLOWS ===

    // Customer wallet top-ups (wallet_transactions type=topup, completed)
    const allWalletTxns = await ctx.db.query("wallet_transactions").collect();
    const customerTopUps = allWalletTxns.filter(
      (t) =>
        t.type === "topup" &&
        t.status === "completed" &&
        t.createdAt >= startDate &&
        t.createdAt <= endDate
    );
    const customerTopUpAmount = customerTopUps.reduce(
      (sum, t) => sum + (t.amount || 0),
      0
    );

    // Branch wallet top-ups (branch_wallet_transactions type=topup)
    const allBranchWalletTxns = await ctx.db
      .query("branch_wallet_transactions")
      .collect();
    const branchTopUps = allBranchWalletTxns.filter(
      (t) =>
        t.type === "topup" &&
        t.createdAt >= startDate &&
        t.createdAt <= endDate
    );
    const branchTopUpAmount = branchTopUps.reduce(
      (sum, t) => sum + (t.amount || 0),
      0
    );

    // Online booking payments via SA's PayMongo (platform fallback inflow)
    const allEarnings = await ctx.db.query("branchWalletEarnings").collect();
    const periodBookingInflows = allEarnings.filter(
      (e) =>
        e.payment_source === "online_paymongo" &&
        e.created_at >= startDate &&
        e.created_at <= endDate
    );
    const bookingInflowAmount = periodBookingInflows.reduce(
      (sum, e) => sum + (e.gross_amount || 0),
      0
    );

    // === OUTFLOWS ===

    // Settlements paid to branches (completed settlements)
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

    // Refunds (wallet_transactions type=refund, completed)
    const refunds = allWalletTxns.filter(
      (t) =>
        t.type === "refund" &&
        t.status === "completed" &&
        t.createdAt >= startDate &&
        t.createdAt <= endDate
    );
    const refundAmount = refunds.reduce(
      (sum, t) => sum + Math.abs(t.amount || 0),
      0
    );

    // Branch wallet credits/adjustments (type=credit)
    const branchCredits = allBranchWalletTxns.filter(
      (t) =>
        t.type === "credit" &&
        t.createdAt >= startDate &&
        t.createdAt <= endDate
    );
    const branchCreditAmount = branchCredits.reduce(
      (sum, t) => sum + (t.amount || 0),
      0
    );

    // === TOTALS ===
    const totalInflows = customerTopUpAmount + branchTopUpAmount + bookingInflowAmount;
    const totalOutflows = settlementsPaid + refundAmount + branchCreditAmount;
    const netCashFlow = totalInflows - totalOutflows;

    return {
      // Period
      periodStart: startDate,
      periodEnd: endDate,
      // Inflows
      inflows: {
        customerTopUps: customerTopUpAmount,
        customerTopUpCount: customerTopUps.length,
        branchTopUps: branchTopUpAmount,
        branchTopUpCount: branchTopUps.length,
        bookingPayments: bookingInflowAmount,
        bookingPaymentCount: periodBookingInflows.length,
        total: totalInflows,
      },
      // Outflows
      outflows: {
        settlementsPaid,
        settlementsCount: completedSettlements.length,
        refunds: refundAmount,
        refundCount: refunds.length,
        branchCredits: branchCreditAmount,
        branchCreditCount: branchCredits.length,
        total: totalOutflows,
      },
      // Net
      netCashFlow,
    };
  },
});

/**
 * Get the 10 most recent top-up transactions across customer + branch wallets
 */
export const getRecentTopUps = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    // Customer wallet top-ups
    const customerTxns = await ctx.db.query("wallet_transactions").order("desc").collect();
    const customerTopUps = customerTxns
      .filter((t) => t.type === "topup" && t.status === "completed")
      .slice(0, limit);

    // Get user info for customer top-ups
    const customerResults = await Promise.all(
      customerTopUps.map(async (t) => {
        const user = await ctx.db.get(t.user_id);
        return {
          id: t._id,
          source: "customer" as const,
          amount: t.amount || 0,
          date: t.createdAt,
          name: user?.nickname || user?.username || "Unknown",
          email: user?.email || "",
          description: (t as any).description || "Customer wallet top-up",
        };
      })
    );

    // Branch wallet top-ups
    const branchTxns = await ctx.db.query("branch_wallet_transactions").order("desc").collect();
    const branchTopUps = branchTxns
      .filter((t) => t.type === "topup")
      .slice(0, limit);

    // Get branch info for branch top-ups
    const allBranches = await ctx.db.query("branches").collect();
    const branchMap: Record<string, string> = {};
    for (const b of allBranches) {
      branchMap[b._id] = b.name;
    }

    const branchResults = branchTopUps.map((t) => ({
      id: t._id,
      source: "branch" as const,
      amount: t.amount || 0,
      date: t.createdAt,
      name: branchMap[t.branch_id as string] || "Unknown Branch",
      email: "",
      description: t.description || "Branch wallet top-up",
    }));

    // Merge + sort by date desc, take top N
    const all = [...customerResults, ...branchResults]
      .sort((a, b) => b.date - a.date)
      .slice(0, limit);

    return all;
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
    const todayCustomerTopUps = todayTransactions
      .filter((t) => t.type === "topup")
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const todayPayments = todayTransactions
      .filter((t) => t.type === "payment")
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    // Branch wallet top-ups today
    const branchWalletTxns = await ctx.db.query("branch_wallet_transactions").collect();
    const todayBranchTopUps = branchWalletTxns
      .filter((t) => t.type === "topup" && t.createdAt >= todayStartTime)
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    // Branch wallets count
    const branchWallets = await ctx.db.query("branch_wallets").collect();

    // NOTE: wallet_transactions.amount is stored in PESOS (not centavos)
    return {
      activeWallets,
      totalWallets: wallets.length,
      branchWalletCount: branchWallets.length,
      branchesWithPending,
      pendingSettlements,
      todayTopUps: todayCustomerTopUps + todayBranchTopUps,
      todayCustomerTopUps: todayCustomerTopUps,
      todayBranchTopUps: todayBranchTopUps,
      todayPayments: Math.abs(todayPayments), // Payments are stored as negative
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
    const [allEarnings, allSettlements, allBranchWallets] = await Promise.all([
      ctx.db.query("branchWalletEarnings").collect(),
      ctx.db.query("branchSettlements").collect(),
      ctx.db.query("branch_wallets").collect(),
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

      // Branch prepaid wallet data
      const branchWallet = allBranchWallets.find(
        (w) => w.branch_id === branch._id
      );

      // NOTE: branchWalletEarnings amounts are stored in PESOS (not centavos)
      return {
        branchId: branch._id,
        branchName: branch.name || "Unknown Branch",
        totalEarnings: totalEarnings,
        pendingAmount: pendingAmount,
        settledAmount: settledAmount,
        totalCommission: totalCommission,
        lastSettlementDate: lastSettlement?.completed_at || null,
        transactionCount: branchEarnings.length,
        pendingSettlements: allSettlements.filter(
          (s) =>
            s.branch_id === branch._id &&
            (s.status === "pending" || s.status === "approved" || s.status === "processing")
        ).length,
        // Branch prepaid wallet (ordering wallet)
        walletBalance: branchWallet?.balance ?? 0,
        walletHeldBalance: branchWallet?.held_balance ?? 0,
        walletTotalToppedUp: branchWallet?.total_topped_up ?? 0,
        walletTotalSpent: branchWallet?.total_spent ?? 0,
      };
    });

    // Filter out branches with no wallet activity AND no prepaid wallet
    const activeBranches = summaries.filter(
      (s) => s.transactionCount > 0 || s.walletTotalToppedUp > 0
    );

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

    // Get recent branch wallet top-ups (last 10)
    const allBranchWalletTxns = await ctx.db
      .query("branch_wallet_transactions")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branchId))
      .collect();
    const recentTopUps = allBranchWalletTxns
      .filter((t) => t.type === "topup")
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10);

    // Enrich top-ups with creator name
    const topUpCreatorIds = [...new Set(recentTopUps.map((t) => t.created_by))];
    const topUpCreators: Record<string, string> = {};
    await Promise.all(
      topUpCreatorIds.map(async (id) => {
        const user = await ctx.db.get(id);
        topUpCreators[id as string] = user?.nickname || user?.username || "Unknown";
      })
    );

    const formattedTopUps = recentTopUps.map((t) => ({
      id: t._id,
      amount: t.amount || 0,
      balanceAfter: t.balance_after || 0,
      description: t.description || "Top-up",
      reference: t.reference_id || null,
      createdBy: topUpCreators[t.created_by as string] || "Unknown",
      createdAt: t.createdAt,
    }));

    const totalToppedUp = allBranchWalletTxns
      .filter((t) => t.type === "topup")
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    // Get recent earnings (last 20)
    const allEarnings = await ctx.db
      .query("branchWalletEarnings")
      .filter((q) => q.eq(q.field("branch_id"), args.branchId))
      .collect();
    // NOTE: branchWalletEarnings amounts are stored in PESOS (not centavos)
    const recentEarnings = allEarnings
      .sort((a, b) => b.created_at - a.created_at)
      .slice(0, 20)
      .map((e) => ({
        id: e._id,
        serviceName: e.service_name,
        grossAmount: e.gross_amount || 0,
        commissionAmount: e.commission_amount || 0,
        netAmount: e.net_amount || 0,
        status: e.status,
        createdAt: e.created_at,
      }));

    // Get recent settlements (last 10)
    const allSettlements = await ctx.db
      .query("branchSettlements")
      .filter((q) => q.eq(q.field("branch_id"), args.branchId))
      .collect();
    // NOTE: branchSettlements.amount is stored in PESOS (not centavos)
    const recentSettlements = allSettlements
      .sort((a, b) => b.created_at - a.created_at)
      .slice(0, 10)
      .map((s) => ({
        id: s._id,
        amount: s.amount || 0,
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

    // NOTE: branchWalletEarnings amounts are stored in PESOS (not centavos)
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
        totalEarnings: totalEarnings,
        totalCommission: totalCommission,
        pendingAmount: pendingAmount,
        settledAmount: settledAmount,
        transactionCount: allEarnings.length,
        settlementCount: allSettlements.length,
      },
      recentEarnings,
      recentSettlements,
      recentTopUps: formattedTopUps,
      totalToppedUp,
      topUpCount: allBranchWalletTxns.filter((t) => t.type === "topup").length,
    };
  },
});
