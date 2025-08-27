import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// Generate voucher code
function generateVoucherCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Get all vouchers
export const getAllVouchers = query({
  args: {},
  handler: async (ctx) => {
    const vouchers = await ctx.db.query("vouchers").collect();

    // Get creator information
    const vouchersWithCreators = await Promise.all(
      vouchers.map(async (voucher) => {
        const creator = await ctx.db.get(voucher.created_by);
        const redeemer = voucher.redeemed_by ? await ctx.db.get(voucher.redeemed_by) : undefined;

        return {
          ...voucher,
          created_by_name: creator?.username || 'Unknown',
          redeemed_by_name: redeemer?.username || undefined,
          is_expired: voucher.expires_at < Date.now(),
          is_active: !voucher.redeemed && voucher.expires_at > Date.now(),
        };
      })
    );

    return vouchersWithCreators.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },
});

// Get voucher by ID
export const getVoucherById = query({
  args: { id: v.id("vouchers") },
  handler: async (ctx, args) => {
    const voucher = await ctx.db.get(args.id);
    if (!voucher) return undefined;

    const creator = await ctx.db.get(voucher.created_by);
    const redeemer = voucher.redeemed_by ? await ctx.db.get(voucher.redeemed_by) : undefined;

    return {
      ...voucher,
      created_by_name: creator?.username || 'Unknown',
      redeemed_by_name: redeemer?.username || undefined,
      is_expired: voucher.expires_at < Date.now(),
      is_active: !voucher.redeemed && voucher.expires_at > Date.now(),
    };
  },
});

// Get voucher by code
export const getVoucherByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const voucher = await ctx.db
      .query("vouchers")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (!voucher) return undefined;

    const creator = await ctx.db.get(voucher.created_by);
    const redeemer = voucher.redeemed_by ? await ctx.db.get(voucher.redeemed_by) : undefined;

    return {
      ...voucher,
      created_by_name: creator?.username || 'Unknown',
      redeemed_by_name: redeemer?.username || undefined,
      is_expired: voucher.expires_at < Date.now(),
      is_active: !voucher.redeemed && voucher.expires_at > Date.now(),
    };
  },
});

// Get active vouchers
export const getActiveVouchers = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const vouchers = await ctx.db
      .query("vouchers")
      .filter((q) => q.and(
        q.eq(q.field("redeemed"), false),
        q.gt(q.field("expires_at"), now)
      ))
      .collect();

    // Get creator information
    const vouchersWithCreators = await Promise.all(
      vouchers.map(async (voucher) => {
        const creator = await ctx.db.get(voucher.created_by);
        return {
          ...voucher,
          created_by_name: creator?.username || 'Unknown',
        };
      })
    );

    return vouchersWithCreators;
  },
});

// Get vouchers by user
export const getVouchersByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const vouchers = await ctx.db
      .query("vouchers")
      .filter((q) => q.or(
        q.eq(q.field("created_by"), args.userId),
        q.eq(q.field("redeemed_by"), args.userId)
      ))
      .collect();

    // Get additional information
    const vouchersWithData = await Promise.all(
      vouchers.map(async (voucher) => {
        const creator = await ctx.db.get(voucher.created_by);
        const redeemer = voucher.redeemed_by ? await ctx.db.get(voucher.redeemed_by) : undefined;

        return {
          ...voucher,
          created_by_name: creator?.username || 'Unknown',
          redeemed_by_name: redeemer?.username || undefined,
          is_expired: voucher.expires_at < Date.now(),
          is_active: !voucher.redeemed && voucher.expires_at > Date.now(),
        };
      })
    );

    return vouchersWithData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },
});

// Create new voucher
export const createVoucher = mutation({
  args: {
    value: v.number(),
    points_required: v.number(),
    max_uses: v.number(),
    expires_at: v.number(),
    description: v.optional(v.string()),
    created_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const code = generateVoucherCode();

    const voucherId = await ctx.db.insert("vouchers", {
      code,
      value: args.value,
      points_required: args.points_required,
      max_uses: args.max_uses,
      redeemed: false,
      expires_at: args.expires_at,
      description: args.description || undefined,
      created_by: args.created_by,
      redeemed_by: undefined,
      redeemed_at: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return voucherId;
  },
});

// Create voucher with custom code
export const createVoucherWithCode = mutation({
  args: {
    code: v.string(),
    value: v.number(),
    points_required: v.number(),
    max_uses: v.number(),
    expires_at: v.number(),
    description: v.optional(v.string()),
    created_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if code already exists
    const existingVoucher = await ctx.db
      .query("vouchers")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (existingVoucher) {
      throw new Error("Voucher code already exists");
    }

    const voucherId = await ctx.db.insert("vouchers", {
      code: args.code.toUpperCase(),
      value: args.value,
      points_required: args.points_required,
      max_uses: args.max_uses,
      redeemed: false,
      expires_at: args.expires_at,
      description: args.description || undefined,
      created_by: args.created_by,
      redeemed_by: undefined,
      redeemed_at: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return voucherId;
  },
});

// Redeem voucher
export const redeemVoucher = mutation({
  args: {
    code: v.string(),
    redeemed_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const voucher = await ctx.db
      .query("vouchers")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (!voucher) {
      throw new Error("Voucher not found");
    }

    if (voucher.redeemed) {
      throw new Error("Voucher has already been redeemed");
    }

    if (voucher.expires_at < Date.now()) {
      throw new Error("Voucher has expired");
    }

    // Mark voucher as redeemed
    await ctx.db.patch(voucher._id, {
      redeemed: true,
      redeemed_by: args.redeemed_by,
      redeemed_at: Date.now(),
      updatedAt: Date.now(),
    });

    return voucher;
  },
});

// Update voucher
export const updateVoucher = mutation({
  args: {
    id: v.id("vouchers"),
    value: v.optional(v.number()),
    points_required: v.optional(v.number()),
    max_uses: v.optional(v.number()),
    expires_at: v.optional(v.number()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return id;
  },
});

// Delete voucher
export const deleteVoucher = mutation({
  args: { id: v.id("vouchers") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// Validate voucher
export const validateVoucher = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const voucher = await ctx.db
      .query("vouchers")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (!voucher) {
      return { valid: false, error: "Voucher not found" };
    }

    if (voucher.redeemed) {
      return { valid: false, error: "Voucher has already been redeemed" };
    }

    if (voucher.expires_at < Date.now()) {
      return { valid: false, error: "Voucher has expired" };
    }

    return {
      valid: true,
      voucher: {
        id: voucher._id,
        code: voucher.code,
        value: voucher.value,
        points_required: voucher.points_required,
        description: voucher.description,
        expires_at: voucher.expires_at,
      }
    };
  },
});
