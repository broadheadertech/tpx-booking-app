/**
 * Branch Admin Wallet Service
 *
 * Manages the branch ordering wallet - a prepaid wallet that branch admins
 * top up and use to pay for product orders from the central warehouse.
 *
 * Wallet flow:
 * 1. Branch admin tops up wallet (manual)
 * 2. When ordering products, wallet funds are held (escrow)
 * 3. On delivery receipt confirmation, held funds are deducted (payment)
 * 4. On order cancellation/rejection, held funds are released back
 *
 * Note: Hold/release/deduct operations are inlined into productOrders.ts
 * for atomicity. This service provides standalone queries and the topUp mutation.
 *
 * @module convex/services/branchWallet
 */

import { mutation, query } from "../_generated/server";
import { v, ConvexError } from "convex/values";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get the branch wallet for a specific branch
 * Returns null if no wallet exists yet
 */
export const getBranchWallet = query({
  args: {
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const wallet = await ctx.db
      .query("branch_wallets")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .first();

    return wallet;
  },
});

/**
 * Get branch wallet transaction history
 * Returns transactions ordered by most recent first
 */
export const getBranchWalletTransactions = query({
  args: {
    branch_id: v.id("branches"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    const transactions = await ctx.db
      .query("branch_wallet_transactions")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .order("desc")
      .take(limit);

    return transactions;
  },
});

/**
 * Get financial summary for ALL branches (super admin use)
 * Returns per-branch: wallet balance, transaction count, total revenue
 */
export const getAllBranchFinancials = query({
  args: {},
  handler: async (ctx) => {
    // Fetch all branch wallets and transactions in parallel
    const [allBranchWallets, allTransactions] = await Promise.all([
      ctx.db.query("branch_wallets").collect(),
      ctx.db.query("transactions").collect(),
    ]);

    // Build wallet map by branch_id
    const walletMap: Record<string, typeof allBranchWallets[0]> = {};
    for (const w of allBranchWallets) {
      walletMap[w.branch_id as string] = w;
    }

    // Aggregate transactions by branch_id
    const txnMap: Record<string, { count: number; revenue: number; completed: number }> = {};
    for (const t of allTransactions) {
      const bid = t.branch_id as string;
      if (!bid) continue;
      if (!txnMap[bid]) txnMap[bid] = { count: 0, revenue: 0, completed: 0 };
      txnMap[bid].count++;
      if (t.payment_status === "completed") {
        txnMap[bid].completed++;
        txnMap[bid].revenue += t.total_amount || 0;
      }
    }

    // Merge unique branch IDs from both sources
    const allBranchIds = new Set([...Object.keys(walletMap), ...Object.keys(txnMap)]);

    const results: Record<string, {
      walletBalance: number;
      walletHeldBalance: number;
      walletTotalToppedUp: number;
      walletTotalSpent: number;
      transactionCount: number;
      completedTransactions: number;
      totalRevenue: number;
    }> = {};

    for (const bid of allBranchIds) {
      const w = walletMap[bid];
      const t = txnMap[bid];
      results[bid] = {
        walletBalance: w?.balance ?? 0,
        walletHeldBalance: w?.held_balance ?? 0,
        walletTotalToppedUp: w?.total_topped_up ?? 0,
        walletTotalSpent: w?.total_spent ?? 0,
        transactionCount: t?.count ?? 0,
        completedTransactions: t?.completed ?? 0,
        totalRevenue: t?.revenue ?? 0,
      };
    }

    return results;
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a branch wallet if one doesn't exist
 * Returns the wallet ID (existing or newly created)
 */
export const ensureBranchWallet = mutation({
  args: {
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    // Check if wallet already exists
    const existing = await ctx.db
      .query("branch_wallets")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .first();

    if (existing) {
      return { walletId: existing._id, created: false };
    }

    // Validate branch exists
    const branch = await ctx.db.get(args.branch_id);
    if (!branch) {
      throw new ConvexError({
        code: "BRANCH_NOT_FOUND",
        message: "Branch not found",
      });
    }

    const now = Date.now();
    const walletId = await ctx.db.insert("branch_wallets", {
      branch_id: args.branch_id,
      balance: 0,
      held_balance: 0,
      total_topped_up: 0,
      total_spent: 0,
      createdAt: now,
      updatedAt: now,
    });

    return { walletId, created: true };
  },
});

/**
 * Top up the branch wallet
 * Adds funds to the available balance
 */
export const topUpBranchWallet = mutation({
  args: {
    branch_id: v.id("branches"),
    amount: v.number(),
    topped_up_by: v.id("users"),
    description: v.optional(v.string()),
    reference_type: v.optional(v.string()),
    reference_id: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate amount
    if (args.amount <= 0 || !Number.isInteger(args.amount)) {
      throw new ConvexError({
        code: "INVALID_AMOUNT",
        message: "Amount must be a positive whole number (in pesos)",
      });
    }

    // Get or create wallet
    let wallet = await ctx.db
      .query("branch_wallets")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .first();

    const now = Date.now();

    if (!wallet) {
      // Auto-create wallet
      const walletId = await ctx.db.insert("branch_wallets", {
        branch_id: args.branch_id,
        balance: 0,
        held_balance: 0,
        total_topped_up: 0,
        total_spent: 0,
        createdAt: now,
        updatedAt: now,
      });
      wallet = await ctx.db.get(walletId);
      if (!wallet) {
        throw new ConvexError({
          code: "WALLET_CREATE_FAILED",
          message: "Failed to create branch wallet",
        });
      }
    }

    // Update wallet balance
    const newBalance = wallet.balance + args.amount;
    const newTotalToppedUp = wallet.total_topped_up + args.amount;

    await ctx.db.patch(wallet._id, {
      balance: newBalance,
      total_topped_up: newTotalToppedUp,
      updatedAt: now,
    });

    // Create transaction record
    const refType = args.reference_type || "manual_topup";
    await ctx.db.insert("branch_wallet_transactions", {
      branch_id: args.branch_id,
      wallet_id: wallet._id,
      type: "topup",
      amount: args.amount,
      balance_after: newBalance,
      held_balance_after: wallet.held_balance,
      reference_type: refType,
      reference_id: args.reference_id,
      description: args.description || `Wallet top-up of ₱${args.amount.toLocaleString()}`,
      created_by: args.topped_up_by,
      createdAt: now,
    });

    // Auto-create accounting entry in branchRevenue for P&L tracking
    const topupLabel = refType === "online_topup" ? "Online" : "Manual";
    await ctx.db.insert("branchRevenue", {
      branch_id: args.branch_id,
      category: "wallet_topup",
      description: `Wallet Top-Up (${topupLabel}) — ₱${args.amount.toLocaleString()}`,
      amount: args.amount,
      revenue_date: now,
      notes: args.reference_id ? `PayMongo Session: ${args.reference_id}` : undefined,
      is_automated: true,
      created_by: args.topped_up_by,
      created_at: now,
      updated_at: now,
    });

    return {
      success: true,
      newBalance,
      walletId: wallet._id,
    };
  },
});
