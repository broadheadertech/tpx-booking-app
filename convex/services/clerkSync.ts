import { v } from "convex/values";
import { internalMutation, mutation, query, MutationCtx } from "../_generated/server";

// Internal mutation to sync Clerk user to Convex (called by webhook)
export const syncClerkUser = internalMutation({
  args: {
    clerkUserId: v.string(),
    email: v.string(),
    username: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    avatar: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user already exists by email
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      // Update existing user with Clerk info
      await ctx.db.patch(existingUser._id, {
        clerk_user_id: args.clerkUserId,
        avatar: args.avatar || existingUser.avatar,
        nickname: `${args.firstName} ${args.lastName}`.trim() || existingUser.nickname,
        mobile_number: args.phoneNumber || existingUser.mobile_number || "",
        isVerified: true,
        updatedAt: Date.now(),
      });
      
      console.log("Updated existing user with Clerk data:", existingUser._id);
      return existingUser._id;
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      clerk_user_id: args.clerkUserId,
      username: args.username,
      email: args.email,
      password: "", // Clerk handles authentication
      nickname: `${args.firstName} ${args.lastName}`.trim() || args.username,
      mobile_number: args.phoneNumber || "",
      role: "customer", // Default role for Clerk signups
      is_active: true,
      avatar: args.avatar,
      skills: [],
      isVerified: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    console.log("Created new user from Clerk:", userId);
    return userId;
  },
});

// Internal mutation to update Clerk user in Convex
export const updateClerkUser = internalMutation({
  args: {
    clerkUserId: v.string(),
    email: v.string(),
    username: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    avatar: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find user by Clerk ID or email
    let user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerk_user_id"), args.clerkUserId))
      .first();

    if (!user) {
      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", args.email))
        .first();
    }

    if (user) {
      await ctx.db.patch(user._id, {
        clerk_user_id: args.clerkUserId,
        email: args.email,
        username: args.username,
        nickname: `${args.firstName} ${args.lastName}`.trim() || user.nickname,
        avatar: args.avatar || user.avatar,
        mobile_number: args.phoneNumber || user.mobile_number,
        updatedAt: Date.now(),
      });
      
      console.log("Updated user from Clerk webhook:", user._id);
    }
  },
});

// Internal mutation to deactivate Clerk user
export const deactivateClerkUser = internalMutation({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerk_user_id"), args.clerkUserId))
      .first();

    if (user) {
      await ctx.db.patch(user._id, {
        is_active: false,
        updatedAt: Date.now(),
      });
      
      console.log("Deactivated user from Clerk:", user._id);
    }
  },
});

// Query to get user by Clerk ID
export const getUserByClerkId = query({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerk_user_id"), args.clerkUserId))
      .first();

    if (!user) {
      return null;
    }

    return {
      _id: user._id,
      username: user.username,
      email: user.email,
      nickname: user.nickname,
      mobile_number: user.mobile_number,
      role: user.role,
      avatar: user.avatar,
      is_active: user.is_active,
      branch_id: user.branch_id,
      page_access: user.page_access,
    };
  },
});

// Mutation to manually sync a Clerk user (can be called from frontend)
export const manualSyncClerkUser = mutation({
  args: {
    clerkUserId: v.string(),
    email: v.string(),
    username: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    avatar: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await syncClerkUser(ctx, args);
  },
});

// Generate session token helper
function generateSessionToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Create session for Clerk-authenticated user
export const createSessionForClerkUser = mutation({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user by Clerk ID
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerk_user_id"), args.clerkUserId))
      .first();

    if (!user) {
      throw new Error("User not found. Please register first.");
    }

    // Check if user is active
    if (!user.is_active) {
      throw new Error("Account is inactive. Please contact support.");
    }

    // Create session token
    const sessionToken = generateSessionToken();
    await ctx.db.insert("sessions", {
      userId: user._id,
      token: sessionToken,
      expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
      createdAt: Date.now(),
    });

    // Return session data
    return {
      sessionToken,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        nickname: user.nickname,
        mobile_number: user.mobile_number,
        role: user.role,
        avatar: user.avatar,
        is_active: user.is_active,
        branch_id: user.branch_id,
        page_access: user.page_access,
      }
    };
  },
});
