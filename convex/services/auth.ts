import { v } from "convex/values";
import { mutation, query, action } from "../_generated/server";
import { api } from "../_generated/api";
import { throwUserError, ERROR_CODES, validateInput } from "../utils/errors";

// Generate a simple session token (in production, use proper JWT or similar)
function generateSessionToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// User registration mutation
export const registerUser = mutation({
  args: {
    username: v.string(),
    password: v.string(),
    email: v.string(),
    mobile_number: v.string(),
    address: v.optional(v.string()),
    nickname: v.optional(v.string()),
    birthday: v.optional(v.string()),
    role: v.union(v.literal("staff"), v.literal("customer"), v.literal("admin"), v.literal("barber"), v.literal("super_admin"), v.literal("branch_admin")),
    branch_id: v.optional(v.id("branches")),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      throwUserError(ERROR_CODES.AUTH_EMAIL_EXISTS);
    }

    const existingUsername = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (existingUsername) {
      throwUserError(ERROR_CODES.AUTH_USERNAME_EXISTS);
    }

    // Validate branch_id for non-super_admin users
    if (args.role !== "super_admin" && !args.branch_id) {
      throw new Error("Branch ID is required for all users except super_admin");
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      username: args.username,
      email: args.email,
      password: args.password, // In production, hash this password
      mobile_number: args.mobile_number,
      address: args.address,
      nickname: args.nickname,
      birthday: args.birthday,
      role: args.role,
      branch_id: args.branch_id,
      is_active: true,
      avatar: undefined,
      bio: undefined,
      skills: [],
      isVerified: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create session
    const sessionToken = generateSessionToken();
    await ctx.db.insert("sessions", {
      userId,
      token: sessionToken,
      expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
      createdAt: Date.now(),
    });

    // Get the created user
    const user = await ctx.db.get(userId);

    return {
      userId,
      sessionToken,
      user: {
        id: user?._id,
        username: user?.username,
        email: user?.email,
        nickname: user?.nickname,
        mobile_number: user?.mobile_number,
        role: user?.role,
        is_active: user?.is_active,
      }
    };
  },
});

// User login mutation
export const loginUser = mutation({
  args: {
    email: v.string(),
    password: v.string()
  },
  handler: async (ctx, args) => {
    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      throwUserError(ERROR_CODES.AUTH_INVALID_CREDENTIALS);
    }

    if (!user.is_active) {
      throwUserError(ERROR_CODES.AUTH_ACCOUNT_INACTIVE);
    }

    // Check password (in production, use proper password hashing)
    if (user.password !== args.password) {
      throwUserError(ERROR_CODES.AUTH_INVALID_CREDENTIALS);
    }

    // Create new session
    const sessionToken = generateSessionToken();
    await ctx.db.insert("sessions", {
      userId: user._id,
      token: sessionToken,
      expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000),
      createdAt: Date.now(),
    });

    return {
      userId: user._id,
      sessionToken,
      user: {
        _id: user._id,
        id: user._id, // Keep both for compatibility
        username: user.username,
        email: user.email,
        nickname: user.nickname,
        mobile_number: user.mobile_number,
        role: user.role,
        branch_id: user.branch_id,
        is_active: user.is_active,
      }
    };
  },
});

// Get current user query
export const getCurrentUser = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // If no session token provided, return null
    if (!args.sessionToken) {
      return null;
    }

    // Find valid session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken!))
      .first();

    if (!session || session.expiresAt < Date.now() || !session.userId) {
      return null; // Invalid or expired session
    }

    // Get user data
    const user = await ctx.db.get(session.userId);
    if (!user || !user.is_active) {
      return null;
    }

    return {
      _id: user._id,
      id: user._id, // Keep both for compatibility
      username: user.username,
      email: user.email,
      nickname: user.nickname,
      mobile_number: user.mobile_number,
      birthday: user.birthday,
      role: user.role,
      branch_id: user.branch_id,
      is_active: user.is_active,
      avatar: user.avatar,
      bio: user.bio,
      skills: user.skills,
      isVerified: user.isVerified,
    };
  },
});

// Logout mutation
export const logoutUser = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    // Find and delete the session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }

    return { success: true };
  },
});

// Social login with Facebook: action to verify token via Facebook Graph API,
// then delegate to a mutation that creates/returns a session.
export const loginWithFacebook = action({
  args: {
    access_token: v.string(),
  },
  handler: async (ctx, args) => {
    // Strictly validate the short-lived token with debug_token using an App Token
    const appId = process.env.FACEBOOK_CLIENT_ID;
    const appSecret = process.env.FACEBOOK_CLIENT_SECRET;
    let accessTokenToUse = args.access_token;

    if (appId && appSecret) {
      const appToken = `${appId}|${appSecret}`;
      const debugUrl = `https://graph.facebook.com/v18.0/debug_token?input_token=${encodeURIComponent(args.access_token)}&access_token=${encodeURIComponent(appToken)}`;
      const debugRes = await fetch(debugUrl);
      const debugJson = await debugRes.json();
      if (!debugRes.ok || !debugJson?.data?.is_valid || debugJson?.data?.app_id !== appId) {
        throw new Error("Invalid Facebook token");
      }
      // Optionally exchange for a long-lived token
      const exchangeUrl = `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${encodeURIComponent(args.access_token)}`;
      const exchangeRes = await fetch(exchangeUrl, { method: 'POST' });
      if (exchangeRes.ok) {
        const exchangeJson = await exchangeRes.json();
        if (exchangeJson?.access_token) {
          accessTokenToUse = exchangeJson.access_token as string;
        }
      }
    }

    // Fetch profile with the verified token
    const fields = "id,name,email,picture";
    const res = await fetch(`https://graph.facebook.com/v18.0/me?fields=${fields}&access_token=${accessTokenToUse}`);
    if (!res.ok) {
      throw new Error("Failed to fetch Facebook profile");
    }
    const profile: any = await res.json();
    if (!profile || (!profile.email && !profile.id)) {
      throw new Error("Invalid Facebook profile response");
    }

    // Pass minimal normalized info to mutation
    const email = profile.email || `fb_${profile.id}@facebook.local`;
    const name = profile.name || "Facebook User";
    const avatar = profile.picture?.data?.url as string | undefined;
    return await ctx.runMutation(api.services.auth.loginWithFacebookInternal, {
      email,
      name,
      avatar,
      facebook_id: profile.id,
    } as any);
  },
});

export const loginWithFacebookInternal = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    avatar: v.optional(v.string()),
    facebook_id: v.string(),
  },
  handler: async (ctx, args) => {
    // Try to find user by email
    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    const now = Date.now();
    if (!user) {
      // Create a new customer user. Username unique based on email or fb id
      const baseUsername = (args.email.split("@")[0] || `fb_${args.facebook_id}`).replace(/[^a-zA-Z0-9_\-\.]/g, "");
      let username = baseUsername || `fb_${args.facebook_id}`;
      // Ensure uniqueness by appending random suffix if needed
      const existingUsername = await ctx.db
        .query("users")
        .withIndex("by_username", (q) => q.eq("username", username))
        .first();
      if (existingUsername) {
        username = `${baseUsername}_${Math.random().toString(36).slice(2, 6)}`;
      }

      const randomPassword = generateSessionToken(); // placeholder
      const userId = await ctx.db.insert("users", {
        username,
        email: args.email,
        password: randomPassword,
        mobile_number: "", // unknown at signup
        address: undefined,
        nickname: args.name,
        birthday: undefined,
        role: "customer",
        branch_id: undefined,
        is_active: true,
        avatar: args.avatar,
        bio: undefined,
        skills: [],
        isVerified: true,
        createdAt: now,
        updatedAt: now,
      });
      user = await ctx.db.get(userId)!;
    }

    if (!user) {
      throw new Error("User not found after Facebook login");
    }

    // Create a session for this user
    const sessionToken = generateSessionToken();
    await ctx.db.insert("sessions", {
      userId: user._id,
      token: sessionToken,
      expiresAt: now + 30 * 24 * 60 * 60 * 1000,
      createdAt: now,
    });

    return {
      sessionToken,
      user: {
        _id: user._id,
        id: user._id,
        username: user.username,
        email: user.email,
        nickname: user.nickname,
        mobile_number: user.mobile_number,
        role: user.role,
        branch_id: user.branch_id,
        is_active: user.is_active,
        avatar: user.avatar,
      },
    };
  },
});

// Update user profile
export const updateUserProfile = mutation({
  args: {
    sessionToken: v.string(),
    nickname: v.optional(v.string()),
    birthday: v.optional(v.string()),
    avatar: v.optional(v.string()),
    bio: v.optional(v.string()),
    skills: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Verify session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throwUserError(ERROR_CODES.AUTH_SESSION_EXPIRED);
    }

    // Update user
    await ctx.db.patch(session.userId, {
      ...(args.nickname !== undefined && { nickname: args.nickname }),
      ...(args.birthday !== undefined && { birthday: args.birthday }),
      ...(args.avatar !== undefined && { avatar: args.avatar }),
      ...(args.bio !== undefined && { bio: args.bio }),
      ...(args.skills !== undefined && { skills: args.skills }),
      updatedAt: Date.now(),
    });

    // Return updated user
    const user = await ctx.db.get(session.userId);
    return {
      id: user?._id,
      username: user?.username,
      email: user?.email,
      nickname: user?.nickname,
      mobile_number: user?.mobile_number,
      birthday: user?.birthday,
      role: user?.role,
      avatar: user?.avatar,
      bio: user?.bio,
      skills: user?.skills,
    };
  },
});

// Get all users (for staff/admin)
// Create user mutation (for POS walk-in customers)
export const createUser = mutation({
  args: {
    username: v.string(),
    email: v.string(),
    password: v.string(),
    mobile_number: v.optional(v.string()),
    address: v.optional(v.string()),
    role: v.union(v.literal("staff"), v.literal("customer"), v.literal("admin"), v.literal("barber"), v.literal("super_admin"), v.literal("branch_admin")),
    branch_id: v.optional(v.id("branches")),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      throwUserError(ERROR_CODES.AUTH_EMAIL_EXISTS);
    }

    const existingUsername = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (existingUsername) {
      throwUserError(ERROR_CODES.AUTH_USERNAME_EXISTS);
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      username: args.username,
      email: args.email,
      password: args.password, // In production, hash this password
      mobile_number: args.mobile_number || "",
      address: args.address,
      nickname: undefined,
      birthday: undefined,
      role: args.role,
      branch_id: args.branch_id,
      is_active: true,
      avatar: undefined,
      bio: undefined,
      skills: [],
      isVerified: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Get the created user
    const user = await ctx.db.get(userId);

    return {
      _id: userId,
      username: user?.username,
      email: user?.email,
      mobile_number: user?.mobile_number,
      address: user?.address,
      role: user?.role,
      branch_id: user?.branch_id,
      is_active: user?.is_active,
    };
  },
});

export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

// Get users by branch (for branch admins/staff)
export const getUsersByBranch = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();
  },
});

// Get users by role within a branch
export const getUsersByRoleAndBranch = query({
  args: { 
    role: v.union(v.literal("staff"), v.literal("customer"), v.literal("admin"), v.literal("barber"), v.literal("branch_admin")),
    branch_id: v.optional(v.id("branches"))
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", args.role));
    
    const users = await query.collect();
    
    // Filter by branch if specified
    if (args.branch_id) {
      return users.filter(user => user.branch_id === args.branch_id);
    }
    
    return users;
  },
});
