import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Save or update a push notification token for a user/device.
 * Called when Capacitor registers with FCM/APNs.
 */
export const saveToken = mutation({
  args: {
    user_id: v.id("users"),
    token: v.string(),
    platform: v.string(), // 'android' | 'ios'
  },
  handler: async (ctx, args) => {
    // Check if this token already exists for this user
    const existing = await ctx.db
      .query("push_tokens")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.user_id))
      .collect();

    const existingToken = existing.find((t) => t.token === args.token);

    if (existingToken) {
      // Update the timestamp
      await ctx.db.patch(existingToken._id, {
        updatedAt: Date.now(),
      });
      return existingToken._id;
    }

    // Create new token entry
    return await ctx.db.insert("push_tokens", {
      user_id: args.user_id,
      token: args.token,
      platform: args.platform,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Remove all push tokens for a user (e.g., on logout).
 */
export const removeToken = mutation({
  args: {
    user_id: v.id("users"),
  },
  handler: async (ctx, args) => {
    const tokens = await ctx.db
      .query("push_tokens")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.user_id))
      .collect();

    for (const token of tokens) {
      await ctx.db.delete(token._id);
    }
  },
});

/**
 * Get all push tokens for a user (for sending notifications).
 */
export const getTokensByUser = query({
  args: {
    user_id: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("push_tokens")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.user_id))
      .collect();
  },
});
