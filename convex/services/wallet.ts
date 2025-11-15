import { mutation, query, action } from "../_generated/server";
import { v } from "convex/values";

export const getWallet = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
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
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .first();
    if (!wallet) {
      await ctx.db.insert("wallets", {
        user_id: args.userId,
        balance: 0,
        currency: "PHP",
        createdAt: now,
        updatedAt: now,
      });
    }
    const current = wallet || (await ctx.db
      .query("wallets")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .first());
    await ctx.db.patch(current!._id, {
      balance: current!.balance + args.amount,
      updatedAt: now,
    });
    await ctx.db.insert("wallet_transactions", {
      user_id: args.userId,
      type: "topup",
      amount: args.amount,
      status: "completed",
      provider: "paymongo",
      reference_id: args.reference_id,
      createdAt: now,
      updatedAt: now,
      description: args.description,
    });
    return { success: true };
  },
});

export const createPendingTransaction = mutation({
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

export const updateTransactionStatus = mutation({
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
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .first();
    if (!wallet) {
      await ctx.db.insert("wallets", {
        user_id: args.userId,
        balance: args.amount,
        currency: "PHP",
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(wallet._id, {
        balance: wallet.balance + args.amount,
        updatedAt: now,
      });
    }
    return { success: true };
  },
});