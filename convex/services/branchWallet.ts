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

import { action, mutation, query } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import { api } from "../_generated/api";
import { requireSuperAdmin } from "../lib/unifiedAuth";
import { verifyPassword, hashPassword } from "../utils/password";
import { logAudit } from "./auditLogs";

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

// ============================================================================
// SECURE HQ TOP-UP — Password + OTP verification
// ============================================================================

/**
 * Generate a 6-digit numeric OTP code
 */
function generateOtpCode(): string {
  const digits = "0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += digits[Math.floor(Math.random() * 10)];
  }
  return code;
}

/**
 * Step 1: Verify Super Admin password and send OTP email
 * Called after the admin enters the amount and their password.
 */
export const verifyPasswordForTopup = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    password: v.string(),
    branch_id: v.id("branches"),
    amount: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Only super_admin can top up branch wallets
    const user = await requireSuperAdmin(ctx, args.sessionToken);

    // Validate amount
    if (args.amount <= 0 || !Number.isInteger(args.amount)) {
      throw new ConvexError({
        code: "INVALID_AMOUNT",
        message: "Amount must be a positive whole number (in pesos)",
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

    // Verify password
    if (!verifyPassword(args.password, user.password)) {
      await logAudit(ctx, {
        user_id: user._id as string,
        user_name: user.username,
        user_role: user.role,
        category: "finance",
        action: "wallet.topup_password_failed",
        description: `Failed password verification for branch wallet top-up — ${branch.name}`,
        target_type: "branch",
        target_id: args.branch_id as string,
        metadata: { amount: args.amount, branch_name: branch.name },
      });
      throw new ConvexError({
        code: "INVALID_PASSWORD",
        message: "Incorrect password",
      });
    }

    // Invalidate any unused OTP tokens for this user
    const existingTokens = await ctx.db
      .query("wallet_otp_tokens")
      .withIndex("by_user_unused", (q) => q.eq("user_id", user._id).eq("used", false))
      .collect();
    for (const token of existingTokens) {
      await ctx.db.patch(token._id, { used: true });
    }

    // Generate OTP and store
    const otpCode = generateOtpCode();
    const now = Date.now();
    const expiresAt = now + 5 * 60 * 1000; // 5 minutes

    const otpTokenId = await ctx.db.insert("wallet_otp_tokens", {
      user_id: user._id,
      code_hash: hashPassword(otpCode),
      branch_id: args.branch_id,
      amount: args.amount,
      description: args.description,
      expires_at: expiresAt,
      attempts: 0,
      used: false,
      created_at: now,
    });

    // Schedule email with OTP code
    const maskedEmail = user.email
      ? user.email.replace(/(.{2})(.*)(@.*)/, "$1***$3")
      : "your registered email";

    await ctx.scheduler.runAfter(0, api.services.branchWallet.sendWalletOtpEmail, {
      to: user.email,
      otpCode,
      amount: args.amount,
      branchName: branch.name,
    });

    await logAudit(ctx, {
      user_id: user._id as string,
      user_name: user.username,
      user_role: user.role,
      category: "finance",
      action: "wallet.topup_otp_sent",
      description: `OTP sent for ₱${args.amount.toLocaleString()} top-up to ${branch.name}`,
      target_type: "branch",
      target_id: args.branch_id as string,
      metadata: { amount: args.amount, branch_name: branch.name, otp_token_id: otpTokenId as string },
    });

    return {
      success: true,
      otpTokenId,
      expiresAt,
      maskedEmail,
    };
  },
});

/**
 * Send OTP email via Resend (action — runs outside transaction)
 */
export const sendWalletOtpEmail = action({
  args: {
    to: v.string(),
    otpCode: v.string(),
    amount: v.number(),
    branchName: v.string(),
  },
  handler: async (_ctx, args) => {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY || "missing_key");

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #D4A853; margin-bottom: 8px;">Wallet Top-Up Verification</h2>
        <p style="color: #666; margin-bottom: 24px;">You requested a branch wallet top-up. Use the code below to confirm.</p>
        <div style="background: #1A1A1A; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <p style="color: #999; font-size: 14px; margin: 0 0 8px 0;">Your verification code</p>
          <p style="color: #D4A853; font-size: 36px; font-weight: bold; letter-spacing: 8px; margin: 0;">${args.otpCode}</p>
        </div>
        <table style="width: 100%; margin-bottom: 24px; color: #ccc;">
          <tr><td style="padding: 4px 0; color: #999;">Amount</td><td style="text-align: right; font-weight: bold;">₱${args.amount.toLocaleString()}</td></tr>
          <tr><td style="padding: 4px 0; color: #999;">Branch</td><td style="text-align: right;">${args.branchName}</td></tr>
        </table>
        <p style="color: #ff6b6b; font-size: 13px;">This code expires in 5 minutes. Do not share it with anyone.</p>
        <hr style="border: none; border-top: 1px solid #333; margin: 16px 0;" />
        <p style="color: #666; font-size: 12px;">If you did not request this, please secure your account immediately.</p>
      </div>
    `;

    try {
      await resend.emails.send({
        from: "TipunoX Barber <noreply@tipunoxph.com>",
        to: args.to,
        subject: `Wallet Top-Up Code: ${args.otpCode}`,
        html,
        text: `Your wallet top-up verification code is ${args.otpCode}. Amount: ₱${args.amount.toLocaleString()} for ${args.branchName}. Expires in 5 minutes.`,
      });
      return { success: true };
    } catch (error: any) {
      console.error("Failed to send OTP email:", error);
      return { success: false, error: error.message };
    }
  },
});

/**
 * Step 2: Verify OTP and execute the top-up
 * Called after the admin enters the OTP code from their email.
 */
export const verifyOtpAndTopup = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    otpTokenId: v.id("wallet_otp_tokens"),
    otp_code: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireSuperAdmin(ctx, args.sessionToken);

    // Fetch OTP token
    const otpToken = await ctx.db.get(args.otpTokenId);
    if (!otpToken) {
      throw new ConvexError({ code: "INVALID_TOKEN", message: "Verification token not found" });
    }

    // Validate ownership
    if (otpToken.user_id !== user._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "This token does not belong to you" });
    }

    // Check if already used
    if (otpToken.used) {
      throw new ConvexError({ code: "TOKEN_USED", message: "This verification code has already been used" });
    }

    // Check expiry
    const now = Date.now();
    if (now > otpToken.expires_at) {
      await ctx.db.patch(args.otpTokenId, { used: true });
      throw new ConvexError({ code: "TOKEN_EXPIRED", message: "Verification code has expired. Please start over." });
    }

    // Check max attempts
    if (otpToken.attempts >= 3) {
      await ctx.db.patch(args.otpTokenId, { used: true });
      throw new ConvexError({ code: "MAX_ATTEMPTS", message: "Too many failed attempts. Please start over." });
    }

    // Verify OTP code
    const codeMatch = verifyPassword(args.otp_code, otpToken.code_hash);
    if (!codeMatch) {
      await ctx.db.patch(args.otpTokenId, { attempts: otpToken.attempts + 1 });
      const remaining = 2 - otpToken.attempts;
      throw new ConvexError({
        code: "INVALID_OTP",
        message: `Incorrect code. ${remaining > 0 ? `${remaining} attempt(s) remaining.` : "No attempts remaining. Please start over."}`,
      });
    }

    // Mark token as used
    await ctx.db.patch(args.otpTokenId, { used: true });

    // === Execute the top-up (inlined for atomicity) ===
    const branch = await ctx.db.get(otpToken.branch_id);
    if (!branch) {
      throw new ConvexError({ code: "BRANCH_NOT_FOUND", message: "Branch no longer exists" });
    }

    // Get or create wallet
    let wallet = await ctx.db
      .query("branch_wallets")
      .withIndex("by_branch", (q) => q.eq("branch_id", otpToken.branch_id))
      .first();

    if (!wallet) {
      const walletId = await ctx.db.insert("branch_wallets", {
        branch_id: otpToken.branch_id,
        balance: 0,
        held_balance: 0,
        total_topped_up: 0,
        total_spent: 0,
        createdAt: now,
        updatedAt: now,
      });
      wallet = await ctx.db.get(walletId);
      if (!wallet) {
        throw new ConvexError({ code: "WALLET_CREATE_FAILED", message: "Failed to create branch wallet" });
      }
    }

    const newBalance = wallet.balance + otpToken.amount;
    const newTotalToppedUp = wallet.total_topped_up + otpToken.amount;

    await ctx.db.patch(wallet._id, {
      balance: newBalance,
      total_topped_up: newTotalToppedUp,
      updatedAt: now,
    });

    // Transaction record
    await ctx.db.insert("branch_wallet_transactions", {
      branch_id: otpToken.branch_id,
      wallet_id: wallet._id,
      type: "topup",
      amount: otpToken.amount,
      balance_after: newBalance,
      held_balance_after: wallet.held_balance,
      reference_type: "hq_topup",
      reference_id: args.otpTokenId as string,
      description: otpToken.description || `HQ Wallet Top-Up — ₱${otpToken.amount.toLocaleString()}`,
      created_by: user._id,
      createdAt: now,
    });

    // Accounting entry
    await ctx.db.insert("branchRevenue", {
      branch_id: otpToken.branch_id,
      category: "wallet_topup",
      description: `Wallet Top-Up (HQ) — ₱${otpToken.amount.toLocaleString()}`,
      amount: otpToken.amount,
      revenue_date: now,
      notes: `Authorized by ${user.username} via OTP verification`,
      is_automated: true,
      created_by: user._id,
      created_at: now,
      updated_at: now,
    });

    // Audit log
    await logAudit(ctx, {
      user_id: user._id as string,
      user_name: user.username,
      user_role: user.role,
      category: "finance",
      action: "wallet.branch_topup_completed",
      description: `HQ topped up ${branch.name} wallet with ₱${otpToken.amount.toLocaleString()} (new balance: ₱${newBalance.toLocaleString()})`,
      target_type: "branch_wallet",
      target_id: wallet._id as string,
      metadata: {
        amount: otpToken.amount,
        branch_id: otpToken.branch_id as string,
        branch_name: branch.name,
        new_balance: newBalance,
        otp_token_id: args.otpTokenId as string,
      },
    });

    return {
      success: true,
      newBalance,
      amount: otpToken.amount,
      branchName: branch.name,
    };
  },
});
