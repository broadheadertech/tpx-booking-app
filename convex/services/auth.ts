import { v } from "convex/values";
import { mutation, query, action, internalMutation } from "../_generated/server";
// import { api } from "../_generated/api"; // Removed to break circular dependency
import { throwUserError, ERROR_CODES, validateInput } from "../utils/errors";
import { hashPassword, verifyPassword } from "../utils/password";
import { requireAuthenticatedUser, getAuthenticatedUser } from "../lib/unifiedAuth";

import { Resend } from 'resend';



// Generate a cryptographically secure session token
function generateSessionToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
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

    // Validate branch_id for staff users (customers don't need branch_id)
    if (["staff", "barber", "branch_admin", "admin"].includes(args.role) && !args.branch_id) {
      throwUserError(ERROR_CODES.VALIDATION_ERROR, "Branch ID is required for this user role", "Staff, barbers, branch admins, and admins must be assigned to a branch.");
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      username: args.username,
      email: args.email,
      password: hashPassword(args.password), // Hash password for security
      mobile_number: args.mobile_number,
      address: args.address,
      nickname: args.nickname,
      birthday: args.birthday || '',
      role: args.role as "staff" | "customer" | "admin" | "barber" | "super_admin" | "branch_admin",
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

    // Check password - hashed passwords only (secure)
    if (!verifyPassword(args.password, user.password)) {
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
        page_access: user.page_access,
        page_access_v2: user.page_access_v2,
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
      role: user.role || "customer",
      branch_id: user.branch_id,
      is_active: user.is_active,
      avatar: user.avatar,
      bio: user.bio,
      skills: user.skills,
      isVerified: user.isVerified,
      page_access: user.page_access,
      page_access_v2: user.page_access_v2,
      has_seen_tutorial: user.has_seen_tutorial,
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
        throwUserError(ERROR_CODES.AUTH_INVALID_CREDENTIALS, "Facebook login failed", "The Facebook authentication token is invalid or expired. Please try logging in again.");
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

    // Fetch profile with a URL for the profile picture
    const fields = "id,name,email,picture.type(large)";
    const res = await fetch(`https://graph.facebook.com/v18.0/me?fields=${fields}&access_token=${accessTokenToUse}`);
    if (!res.ok) {
      throwUserError(ERROR_CODES.AUTH_INVALID_CREDENTIALS, "Facebook login failed", "Unable to retrieve your Facebook profile information. Please try logging in again.");
    }
    const profile: any = await res.json();
    if (!profile || (!profile.email && !profile.id)) {
      throwUserError(ERROR_CODES.AUTH_INVALID_CREDENTIALS, "Facebook login failed", "Could not retrieve valid profile information from Facebook. Please try logging in again.");
    }

    // Pass minimal normalized info to mutation
    const email = profile.email || `fb_${profile.id}@facebook.local`;
    const name = profile.name || "Facebook User";
    const avatar = profile.picture?.data?.url as string | undefined;

    // Use require to break circular dependency for runtime import
    const { api } = require("../_generated/api");

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

    // If user already exists and we have a fresher avatar, update it once
    if (user && args.avatar && user.avatar !== args.avatar) {
      await ctx.db.patch(user._id, { avatar: args.avatar, updatedAt: now });
      user = await ctx.db.get(user._id)!;
    }

    if (!user) {
      throwUserError(ERROR_CODES.AUTH_INVALID_CREDENTIALS, "Facebook login failed", "Unable to complete Facebook login. Please try again or use email/password login instead.");
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
        page_access: user.page_access,
        page_access_v2: user.page_access_v2,
        is_active: user.is_active,
        avatar: user.avatar,
      },
    };
  },
});

// Update user profile
export const updateUserProfile = mutation({
  args: {
    sessionToken: v.optional(v.string()), // Optional for backwards compatibility
    nickname: v.optional(v.string()),
    birthday: v.optional(v.string()),
    mobile_number: v.optional(v.string()),
    address: v.optional(v.string()),
    avatar: v.optional(v.string()),
    bio: v.optional(v.string()),
    skills: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Use unified auth (supports both Clerk and legacy)
    const currentUser = await requireAuthenticatedUser(ctx, args.sessionToken);

    // Validate inputs
    if (args.mobile_number !== undefined && args.mobile_number.length > 0) {
      if (!/^\+?[0-9\s\-\(\)]{7,}$/.test(args.mobile_number)) {
        throwUserError(ERROR_CODES.INVALID_INPUT, "Invalid mobile number format", "Please enter a valid phone number with at least 7 digits.");
      }
    }

    if (args.nickname !== undefined && args.nickname.length > 100) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Nickname too long", "Nickname must be less than 100 characters.");
    }

    if (args.address !== undefined && args.address.length > 500) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Address too long", "Address must be less than 500 characters.");
    }

    if (args.bio !== undefined && args.bio.length > 1000) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Bio too long", "Bio must be less than 1000 characters.");
    }

    // Update user
    await ctx.db.patch(currentUser._id, {
      ...(args.nickname !== undefined && { nickname: args.nickname }),
      ...(args.birthday !== undefined && { birthday: args.birthday }),
      ...(args.mobile_number !== undefined && { mobile_number: args.mobile_number }),
      ...(args.address !== undefined && { address: args.address }),
      ...(args.avatar !== undefined && { avatar: args.avatar }),
      ...(args.bio !== undefined && { bio: args.bio }),
      ...(args.skills !== undefined && { skills: args.skills }),
      updatedAt: Date.now(),
    });

    // Return updated user
    const user = await ctx.db.get(currentUser._id);
    return {
      _id: user?._id,
      id: user?._id,
      username: user?.username,
      email: user?.email,
      nickname: user?.nickname,
      mobile_number: user?.mobile_number,
      birthday: user?.birthday,
      address: user?.address,
      role: user?.role,
      avatar: user?.avatar,
      bio: user?.bio,
      skills: user?.skills,
      is_active: user?.is_active,
      page_access: user?.page_access,
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
    page_access: v.optional(v.array(v.string())),
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

    // Build page_access_v2 from page_access array
    let pageAccessV2: Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean; approve: boolean }> | undefined;
    if (args.page_access && args.page_access.length > 0) {
      pageAccessV2 = {};
      for (const pageId of args.page_access) {
        pageAccessV2[pageId] = { view: true, create: true, edit: true, delete: true, approve: true };
      }
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      username: args.username,
      email: args.email,
      password: hashPassword(args.password), // Hash password for security
      mobile_number: args.mobile_number || "",
      address: args.address,
      nickname: undefined,
      birthday: undefined,
      role: args.role,
      branch_id: args.branch_id,
      page_access: args.page_access,
      page_access_v2: pageAccessV2,
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
      page_access: user?.page_access,
      is_active: user?.is_active,
    };
  },
});

// Create user with Clerk account (admin user creation)
// Uses action because it needs to call external Clerk API
export const createUserWithClerk = action({
  args: {
    username: v.string(),
    email: v.string(),
    password: v.string(),
    mobile_number: v.optional(v.string()),
    address: v.optional(v.string()),
    role: v.union(v.literal("staff"), v.literal("customer"), v.literal("admin"), v.literal("barber"), v.literal("super_admin"), v.literal("branch_admin")),
    branch_id: v.optional(v.id("branches")),
    page_access: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { api } = require("../_generated/api");

    // Step 1: Create Convex user first (validates email/username uniqueness)
    const convexUser = await ctx.runMutation(api.services.auth.createUser, {
      username: args.username,
      email: args.email,
      password: args.password,
      mobile_number: args.mobile_number,
      address: args.address,
      role: args.role,
      branch_id: args.branch_id,
      page_access: args.page_access,
    });

    // Step 2: Try to create Clerk account
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      console.log("[createUserWithClerk] CLERK_SECRET_KEY not configured, skipping Clerk creation");
      return convexUser;
    }

    try {
      // Sanitize username for Clerk (only allows [a-zA-Z0-9_-])
      const sanitizedUsername = args.username
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '') || undefined;

      const response = await fetch("https://api.clerk.com/v1/users", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${clerkSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email_address: [args.email],
          username: sanitizedUsername,
          password: args.password,
          skip_password_checks: true,
        }),
      });

      let clerkUserId: string | null = null;

      if (!response.ok) {
        const errorData = await response.json();

        // If user already exists in Clerk, find and link
        if (errorData.errors?.[0]?.code === "form_identifier_exists") {
          const findResponse = await fetch(
            `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(args.email)}`,
            { headers: { Authorization: `Bearer ${clerkSecretKey}` } }
          );
          if (findResponse.ok) {
            const existingUsers = await findResponse.json();
            if (existingUsers[0]) {
              clerkUserId = existingUsers[0].id;
            }
          }
        }

        if (!clerkUserId) {
          console.error("[createUserWithClerk] Clerk API error:", errorData);
          // Convex user was already created, just return it without Clerk link
          return convexUser;
        }
      } else {
        const clerkUser = await response.json();
        clerkUserId = clerkUser.id;
      }

      // Step 3: Link Clerk user ID to Convex user
      if (clerkUserId) {
        await ctx.runMutation(api.services.auth.linkClerkToUser, {
          userId: convexUser._id,
          clerk_user_id: clerkUserId,
        });
        console.log(`[createUserWithClerk] Linked ${args.email} to Clerk ${clerkUserId}`);
      }

      return convexUser;
    } catch (error) {
      console.error("[createUserWithClerk] Clerk error:", error instanceof Error ? error.message : error);
      // Convex user was already created, return it even if Clerk fails
      return convexUser;
    }
  },
});

// Internal mutation to link a Clerk user ID to a Convex user
export const linkClerkToUser = mutation({
  args: {
    userId: v.id("users"),
    clerk_user_id: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      clerk_user_id: args.clerk_user_id,
      migration_status: "completed",
      updatedAt: Date.now(),
    });
  },
});

// Create guest user mutation (for guest bookings with better redundancy handling)
export const createGuestUser = mutation({
  args: {
    username: v.string(),
    email: v.string(),
    password: v.string(),
    mobile_number: v.optional(v.string()),
    branch_id: v.optional(v.id("branches")),
    guest_name: v.string(), // Original guest name for logging
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if email already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    // If user exists and is a customer, return them for guest booking
    if (existingUser && existingUser.role === "customer") {
      console.log(`Guest booking: Existing customer found for email ${args.email}, user ID: ${existingUser._id}`);

      // Update mobile number if different
      if (args.mobile_number && args.mobile_number !== existingUser.mobile_number) {
        await ctx.db.patch(existingUser._id, {
          mobile_number: args.mobile_number,
          updatedAt: now,
        });
        console.log(`Updated mobile number for existing customer ${existingUser._id}`);
      }

      return {
        _id: existingUser._id,
        username: existingUser.username,
        email: existingUser.email,
        nickname: existingUser.nickname || args.guest_name,
        mobile_number: existingUser.mobile_number,
        role: existingUser.role,
        branch_id: existingUser.branch_id || args.branch_id,
        is_active: existingUser.is_active,
        isExistingUser: true, // Flag to indicate this was an existing user
      };
    }

    // If user exists but is not a customer (staff, admin, etc.), don't allow guest booking
    if (existingUser && existingUser.role !== "customer") {
      console.log(`Guest creation blocked: Email ${args.email} belongs to ${existingUser.role} user ${existingUser._id}`);
      throwUserError(ERROR_CODES.AUTH_EMAIL_EXISTS,
        `This email is registered as a ${existingUser.role} account`,
        "This email address is already registered as a staff or admin account. Please use a different email for guest booking."
      );
    }

    // Generate a clean username format: Guest-JD-a3f2 (initials + short ID)
    const nameParts = args.guest_name.trim().split(/\s+/);
    const initials = nameParts.map(part => part.charAt(0).toUpperCase()).join('').slice(0, 2) || 'GU';
    let shortId = Math.random().toString(36).slice(2, 6);
    let finalUsername = `Guest-${initials}-${shortId}`;
    let attempts = 0;
    const maxAttempts = 5;

    // Check if username already exists and generate new one if needed
    while (attempts < maxAttempts) {
      const existingUsername = await ctx.db
        .query("users")
        .withIndex("by_username", (q) => q.eq("username", finalUsername))
        .first();

      if (!existingUsername) {
        break; // Username is available
      }

      // Generate a new unique username
      shortId = Math.random().toString(36).slice(2, 6);
      finalUsername = `Guest-${initials}-${shortId}`;
      attempts++;

      console.log(`Username conflict detected, trying new username: ${finalUsername} (attempt ${attempts})`);
    }

    if (attempts >= maxAttempts) {
      console.error(`Failed to generate unique username after ${maxAttempts} attempts for guest ${args.guest_name}`);
      throwUserError(ERROR_CODES.VALIDATION_ERROR,
        "Unable to generate unique username",
        "Please try again in a moment."
      );
    }

    // Create new guest user
    const userId = await ctx.db.insert("users", {
      username: finalUsername,
      email: args.email,
      password: hashPassword(args.password),
      mobile_number: args.mobile_number || "",
      address: undefined,
      nickname: args.guest_name, // Store original guest name as nickname
      birthday: undefined,
      role: "customer",
      branch_id: args.branch_id,
      is_active: true,
      is_guest: true, // Mark as guest for analytics filtering
      avatar: undefined,
      bio: undefined,
      skills: [],
      isVerified: false,
      createdAt: now,
      updatedAt: now,
    });

    // Get the created user
    const user = await ctx.db.get(userId);

    console.log(`✅ Guest user created successfully:`, {
      id: userId,
      username: finalUsername,
      email: args.email,
      guest_name: args.guest_name,
      branch_id: args.branch_id
    });

    return {
      _id: userId,
      username: user?.username,
      email: user?.email,
      nickname: user?.nickname,
      mobile_number: user?.mobile_number,
      role: user?.role,
      branch_id: user?.branch_id,
      is_active: user?.is_active,
    };
  },
});

// Convert guest account to full account
// Called when a guest creates a real account with the same email
export const convertGuestToAccount = mutation({
  args: {
    email: v.string(),
    username: v.string(),
    password: v.string(),
    mobile_number: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find existing guest user by email
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!existingUser) {
      throwUserError(ERROR_CODES.USER_NOT_FOUND,
        "No account found",
        "No account found with this email address."
      );
    }

    // Check if already a full account
    if (!existingUser.is_guest) {
      throwUserError(ERROR_CODES.AUTH_EMAIL_EXISTS,
        "Account already exists",
        "This email is already registered as a full account. Please login instead."
      );
    }

    // Check if new username is available
    const existingUsername = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (existingUsername && existingUsername._id !== existingUser._id) {
      throwUserError(ERROR_CODES.AUTH_USERNAME_EXISTS,
        "Username taken",
        "This username is already taken. Please choose another."
      );
    }

    // Convert guest to full account
    await ctx.db.patch(existingUser._id, {
      username: args.username,
      password: hashPassword(args.password),
      mobile_number: args.mobile_number || existingUser.mobile_number,
      is_guest: false, // Convert to full account
      isVerified: true,
      updatedAt: now,
    });

    console.log(`✅ Guest account converted to full account:`, {
      id: existingUser._id,
      email: args.email,
      previousUsername: existingUser.username,
      newUsername: args.username,
    });

    // Create session for the newly converted user
    const sessionToken = generateSessionToken();
    await ctx.db.insert("sessions", {
      userId: existingUser._id,
      token: sessionToken,
      expiresAt: now + (30 * 24 * 60 * 60 * 1000), // 30 days
      createdAt: now,
    });

    return {
      success: true,
      userId: existingUser._id,
      sessionToken,
      message: "Account converted successfully. Your booking history has been preserved.",
    };
  },
});

// Migration: Mark existing guest users with is_guest: true
// Run once to fix legacy guest accounts
export const migrateGuestUsers = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let updated = 0;
    let alreadyMarked = 0;

    // Get all users with username starting with "guest_" or "Guest-"
    const allUsers = await ctx.db.query("users").collect();

    for (const user of allUsers) {
      // Skip if already marked as guest
      if (user.is_guest === true) {
        alreadyMarked++;
        continue;
      }

      // Check if username indicates a guest
      const isGuestUsername = user.username?.startsWith("guest_") ||
        user.username?.startsWith("Guest-") ||
        user.username?.toLowerCase().includes("guest");

      if (isGuestUsername && user.role === "customer") {
        await ctx.db.patch(user._id, {
          is_guest: true,
          updatedAt: now,
        });
        updated++;
        console.log(`Marked guest: ${user.username} (${user.nickname || 'no nickname'})`);
      }
    }

    console.log(`[Guest Migration] Complete: ${updated} marked as guest, ${alreadyMarked} already marked`);
    return { updated, alreadyMarked };
  },
});

// Update user mutation (for admin use)
export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    username: v.optional(v.string()),
    email: v.optional(v.string()),
    password: v.optional(v.string()),
    mobile_number: v.optional(v.string()),
    address: v.optional(v.string()),
    role: v.optional(v.union(v.literal("staff"), v.literal("customer"), v.literal("admin"), v.literal("barber"), v.literal("super_admin"), v.literal("branch_admin"))),
    branch_id: v.optional(v.id("branches")),
    page_access: v.optional(v.array(v.string())),
    is_active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId, ...updateData } = args;

    // Get existing user
    const existingUser = await ctx.db.get(userId);
    if (!existingUser) {
      throwUserError(ERROR_CODES.RESOURCE_NOT_FOUND, "User not found", "The user account could not be found in the system. Please refresh and try again.");
    }

    // Check if email is being updated and if it's already taken by another user
    if (updateData.email && updateData.email !== existingUser.email) {
      const emailExists = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", updateData.email!))
        .first();

      if (emailExists && emailExists._id !== userId) {
        throwUserError(ERROR_CODES.AUTH_EMAIL_EXISTS, `Email ${updateData.email} is already in use`, "This email is already registered in the system. Please use a different email address.");
      }
    }

    // Check if username is being updated and if it's already taken by another user
    if (updateData.username && updateData.username !== existingUser.username) {
      const usernameExists = await ctx.db
        .query("users")
        .withIndex("by_username", (q) => q.eq("username", updateData.username!))
        .first();

      if (usernameExists && usernameExists._id !== userId) {
        throwUserError(ERROR_CODES.AUTH_USERNAME_EXISTS, `Username "${updateData.username}" is already taken`, "This username is already in use. Please choose a different username.");
      }
    }

    // Build update object with only provided fields
    const fieldsToUpdate: any = {
      updatedAt: Date.now(),
    };

    if (updateData.username !== undefined) fieldsToUpdate.username = updateData.username;
    if (updateData.email !== undefined) fieldsToUpdate.email = updateData.email;
    if (updateData.password !== undefined) fieldsToUpdate.password = hashPassword(updateData.password);
    if (updateData.mobile_number !== undefined) fieldsToUpdate.mobile_number = updateData.mobile_number;
    if (updateData.address !== undefined) fieldsToUpdate.address = updateData.address;
    if (updateData.role !== undefined) fieldsToUpdate.role = updateData.role as "staff" | "customer" | "admin" | "barber" | "super_admin" | "branch_admin";
    if (updateData.branch_id !== undefined) fieldsToUpdate.branch_id = updateData.branch_id;
    if (updateData.page_access !== undefined) {
      fieldsToUpdate.page_access = updateData.page_access;
      // Sync page_access_v2 so the new RBAC system reflects the same permissions
      const pageAccessV2: Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean; approve: boolean }> = {};
      for (const pageId of updateData.page_access) {
        pageAccessV2[pageId] = { view: true, create: true, edit: true, delete: true, approve: true };
      }
      fieldsToUpdate.page_access_v2 = pageAccessV2;
    }
    if (updateData.is_active !== undefined) fieldsToUpdate.is_active = updateData.is_active;

    // Update user
    await ctx.db.patch(userId, fieldsToUpdate);

    // Get and return updated user
    const user = await ctx.db.get(userId);
    return {
      _id: user?._id,
      username: user?.username,
      email: user?.email,
      mobile_number: user?.mobile_number,
      address: user?.address,
      role: user?.role,
      branch_id: user?.branch_id,
      page_access: user?.page_access,
      is_active: user?.is_active,
    };
  },
});

// Delete user mutation (for admin use)
export const deleteUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get existing user
    const existingUser = await ctx.db.get(args.userId);
    if (!existingUser) {
      throwUserError(ERROR_CODES.RESOURCE_NOT_FOUND, "User not found", "The user account could not be found in the system.");
    }

    // Delete all sessions for this user
    const userSessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const session of userSessions) {
      await ctx.db.delete(session._id);
    }

    // Delete the user
    await ctx.db.delete(args.userId);

    return { success: true };
  },
});

export const getAllUsers = query({
  args: {
    limit: v.optional(v.number()),
    roles: v.optional(v.array(v.string())),
    branch_id: v.optional(v.id("branches")),
  },
  handler: async (ctx, args) => {
    // Auth guard: if authenticated (Clerk), verify caller has staff/admin role
    // For legacy session auth (no Clerk JWT), allow through for backward compatibility
    const currentUser = await getAuthenticatedUser(ctx);
    if (currentUser) {
      const allowedRoles = ["staff", "admin", "branch_admin", "super_admin", "barber"];
      if (!allowedRoles.includes(currentUser.role)) {
        return [];
      }
    }

    const limit = args.limit || 1000; // Increased default to 1000 users

    let usersQuery = ctx.db.query("users").order("desc");

    const hasRoles = args.roles && args.roles.length > 0;
    const hasBranch = !!args.branch_id;

    if (hasRoles || hasBranch) {
      usersQuery = usersQuery.filter((q) => {
        const conditions = [];

        if (hasRoles) {
          // Create OR condition for multiple roles
          const roleConditions = args.roles!.map(role => q.eq(q.field("role"), role));
          if (roleConditions.length === 1) {
            conditions.push(roleConditions[0]);
          } else {
            conditions.push(q.or(...roleConditions));
          }
        }

        if (hasBranch) {
          conditions.push(q.eq(q.field("branch_id"), args.branch_id));
        }

        // This should not be reached if the outer check is correct, but for type safety:
        if (conditions.length === 0) return q.eq(q.field("role"), q.field("role")); // Unreachable but type safe
        if (conditions.length === 1) return conditions[0];

        return q.and(...conditions);
      });
    }

    const users = await usersQuery.take(limit);

    // Return only necessary fields to reduce bandwidth
    return users.map(user => ({
      _id: user._id,
      id: user._id,
      username: user.username,
      email: user.email,
      nickname: user.nickname,
      mobile_number: user.mobile_number,
      birthday: user.birthday,
      role: user.role,
      branch_id: user.branch_id,
      is_active: user.is_active,
      isVerified: user.isVerified,
      createdAt: user._creationTime,
      page_access: user.page_access,
      page_access_v2: user.page_access_v2,
      // Customer analytics fields for AI Email Marketing segmentation
      lastBookingDate: user.lastBookingDate,
      totalBookings: user.totalBookings,
      totalSpent: user.totalSpent,
      // Exclude heavy fields like avatar (if base64), bio, skills, password
    }));
  },
});

// Request password reset: generate a short-lived token and store on user
export const requestPasswordReset = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    // Do not reveal whether user exists (privacy). If not found, respond success.
    if (!user) {
      return { success: true };
    }

    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const token = Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
    const expiresInMs = 1000 * 60 * 15; // 15 minutes
    await ctx.db.patch(user._id, {
      password_reset_token: token,
      password_reset_expires: Date.now() + expiresInMs,
      updatedAt: Date.now(),
    });

    // Token returned for server-side use only (action calls this mutation internally)
    // Frontend callers should use sendPasswordResetEmail action instead
    return { success: true, token };
  },
});

const resend = new Resend(process.env.RESEND_API_KEY || 'missing_key');

// Send password reset email with Resend
// Handles the full flow: generates token server-side and sends email (token never exposed to frontend)
export const sendPasswordResetEmail = action({
  args: {
    email: v.string(),
    token: v.optional(v.string()), // Deprecated: token is now generated server-side
  },
  handler: async (ctx, args) => {
    const { api } = require("../_generated/api");

    // Generate reset token server-side (never expose to frontend)
    const resetResult = await ctx.runMutation(api.services.auth.requestPasswordReset, {
      email: args.email,
    });
    if (!resetResult.success || !resetResult.token) {
      // User not found or no token - return success anyway (don't reveal if email exists)
      return { success: true };
    }
    const token = resetResult.token;

    // Fetch branding and email template
    const branding = await ctx.runQuery(api.services.branding.getGlobalBranding, {});
    const template = await ctx.runQuery(api.services.emailTemplates.getTemplateByType, { template_type: "password_reset" });

    // Extract branding colors (fallback to defaults)
    const primaryColor = branding?.primary_color || '#000000';
    const accentColor = branding?.accent_color || '#000000';
    const bgColor = branding?.bg_color || '#0A0A0A';
    const brandName = branding?.display_name || '';

    // Email template content
    const subject = (template?.subject || 'Reset your {{brand_name}} password').replace(/\{\{brand_name\}\}/g, brandName);
    const heading = (template?.heading || 'Reset Your Password').replace(/\{\{brand_name\}\}/g, brandName);
    const bodyText = (template?.body_text || 'Hi there! We received a request to reset your password for your {{brand_name}} account. Click the button below to set a new password.')
      .replace(/\{\{brand_name\}\}/g, brandName);
    const ctaText = template?.cta_text || 'Reset Password';
    const footerText = template?.footer_text || 'This link will expire in 15 minutes for your security. If you didn\'t request a password reset, you can safely ignore this email.';

    const resetUrl = `https://tipunox.broadheader.com/auth/reset-password?token=${token}`;

    const emailData = {
      from: `${brandName} <no-reply@tipunox.broadheader.com>`,
      to: args.email,
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset - ${brandName}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background-color: ${bgColor};
              color: #ffffff;
              margin: 0;
              padding: 0;
              line-height: 1.6;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 40px 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
            }
            .content {
              background: linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%);
              border-radius: 16px;
              padding: 40px;
              border: 1px solid #333;
              box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            }
            .title {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 20px;
              color: ${primaryColor};
              text-align: center;
            }
            .text {
              color: #ccc;
              margin-bottom: 30px;
              text-align: center;
            }
            .reset-button {
              display: inline-block;
              background: linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%);
              color: white;
              text-decoration: none;
              padding: 16px 32px;
              border-radius: 8px;
              font-weight: bold;
              text-align: center;
              margin: 20px 0;
              transition: transform 0.2s, box-shadow 0.2s;
            }
            .reset-button:hover {
              transform: translateY(-2px);
              box-shadow: 0 5px 15px rgba(255, 140, 66, 0.4);
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 14px;
            }
            .security-info {
              background: ${primaryColor}1a;
              border: 1px solid ${primaryColor}4d;
              border-radius: 8px;
              padding: 20px;
              margin-top: 20px;
            }
            .security-info h3 {
              color: ${primaryColor};
              margin-top: 0;
              margin-bottom: 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="color: #FF8C42; font-size: 32px; margin-bottom: 10px;">${brandName}</h1>
              <h1 style="color: ${primaryColor}; font-size: 32px; margin-bottom: 10px;">${brandName}</h1>
            </div>
            
            <div class="content">
              <h1 class="title">Reset Your Password</h1>
              <p class="text">
                Hi there! We received a request to reset your password for your ${brandName} account.
                Click the button below to set a new password.
              </p>
              <h1 class="title">${heading}</h1>
              <p class="text">${bodyText}</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="reset-button">${ctaText}</a>
              </div>
              
              <div class="security-info">
                <h3>🔐 Security Information</h3>
                <p style="margin: 0; font-size: 14px; color: #bbb;">${footerText}</p>
              </div>
              
              <p class="text" style="margin-top: 30px; font-size: 14px;">
                If the button above doesn't work, copy and paste this link into your browser:<br>
                <span style="word-break: break-all; color: ${primaryColor};">${resetUrl}</span>
              </p>
            </div>
            
            <div class="footer">
              <p>© 2024 ${brandName}. All rights reserved.</p>
              <p>© 2024 ${brandName}. All rights reserved.</p>
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      // In development, mock the email sending
      if (process.env.NODE_ENV === 'development' || process.env.ENVIRONMENT === 'development') {
        console.log('📧 [DEV MODE] Email would be sent:');
        console.log('  To:', args.email);
        console.log('  Subject:', emailData.subject);
        console.log('  Reset URL:', resetUrl);
        return { success: true, messageId: 'dev-mock-' + Date.now(), isDev: true };
      }

      // Production: Use Resend
      const result = await resend.emails.send(emailData);

      if (result.error) {
        console.error('Email service error:', result.error);
        throw new Error(`Email service error: ${result.error.message || 'Unknown error'}`);
      }

      console.log('Password reset email sent successfully:', result);
      return { success: true, messageId: result.data?.id };
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      // Don't throw error to avoid revealing if email exists or not
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  },
});

// Complete password reset with a valid token
export const resetPassword = mutation({
  args: {
    token: v.string(),
    new_password: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate password
    if (!args.new_password || args.new_password.length < 6) {
      throwUserError(
        ERROR_CODES.INVALID_INPUT,
        "Password too short",
        "Password must be at least 6 characters long."
      );
    }

    if (!args.token || args.token.trim() === '') {
      throwUserError(
        ERROR_CODES.INVALID_INPUT,
        "Invalid token",
        "Password reset token is missing or invalid."
      );
    }

    try {
      // Scan for a user with this token; Convex doesn't support cross-table search by arbitrary field with index,
      // so collect and filter. For small user counts in dev this is fine. For prod, add an index if needed.
      const candidates = await ctx.db.query("users").collect();
      const user = candidates.find(
        (u: any) =>
          u.password_reset_token === args.token &&
          u.password_reset_token !== "" && // Exclude already-used tokens
          typeof u.password_reset_expires === 'number' &&
          u.password_reset_expires > 0 // Exclude invalidated tokens
      );

      if (!user) {
        throwUserError(
          ERROR_CODES.AUTH_INVALID_CREDENTIALS,
          "Invalid or expired token",
          "This password reset link is invalid or has already been used. Please request a new password reset."
        );
      }

      const expiresAt = user.password_reset_expires as number;
      if (expiresAt < Date.now()) {
        throwUserError(
          ERROR_CODES.AUTH_INVALID_CREDENTIALS,
          "Reset token expired",
          "Your password reset link has expired. Please request a new one."
        );
      }

      // Update password and invalidate the reset token by setting expiry to past
      // Note: We set token to empty string and expiry to 0 instead of undefined
      // because Convex patches don't handle undefined well for clearing fields
      await ctx.db.patch(user._id, {
        password: hashPassword(args.new_password),
        password_reset_token: "", // Clear the token
        password_reset_expires: 0, // Set to past time to invalidate
        updatedAt: Date.now(),
      });

      return { success: true };
    } catch (error: any) {
      // Check if it's already a user error (thrown by throwUserError)
      if (error.message && error.message.startsWith('{')) {
        throw error;
      }
      // Wrap unexpected errors with user-friendly message
      console.error('Reset password error:', error);
      throwUserError(
        ERROR_CODES.OPERATION_FAILED,
        "Failed to reset password",
        "An error occurred while resetting your password. Please try again or request a new reset link."
      );
    }
  },
});

// Get users by branch (for branch admins/staff)
export const getUsersByBranch = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    const users = await ctx.db
      .query("users")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    // Return only necessary fields to reduce bandwidth
    return users.map(user => ({
      _id: user._id,
      id: user._id,
      username: user.username,
      email: user.email,
      nickname: user.nickname,
      mobile_number: user.mobile_number,
      birthday: user.birthday,
      role: user.role,
      branch_id: user.branch_id,
      is_active: user.is_active,
      isVerified: user.isVerified,
      createdAt: user._creationTime,
      // Customer analytics fields for AI Email Marketing segmentation
      lastBookingDate: user.lastBookingDate,
      totalBookings: user.totalBookings,
      totalSpent: user.totalSpent,
      // Exclude heavy fields like avatar (if base64), bio, skills, password
    }));
  },
});

// ============================================================================
// CLERK AUTHENTICATION QUERIES (Story 10.4)
// ============================================================================

/**
 * Ensure user exists in Convex from Clerk authentication
 *
 * This is a fallback mechanism for when the Clerk webhook hasn't processed yet.
 * Called from the client side when a Clerk-authenticated user doesn't have
 * a corresponding Convex user. This ensures robust registration sync.
 *
 * @param clerk_user_id - The Clerk user ID
 * @param email - Primary email from Clerk
 * @param first_name - First name from Clerk
 * @param last_name - Last name from Clerk
 * @param image_url - Profile image URL from Clerk
 * @returns Created or existing user object
 */
export const ensureUserFromClerk = mutation({
  args: {
    clerk_user_id: v.string(),
    email: v.string(),
    first_name: v.optional(v.string()),
    last_name: v.optional(v.string()),
    image_url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { clerk_user_id, email, first_name, last_name, image_url } = args;

    // 1. Check if user already exists by clerk_user_id (idempotent)
    const existingByClerkId = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerk_user_id", clerk_user_id))
      .first();

    if (existingByClerkId) {
      console.log("[EnsureUser] User already exists with clerk_user_id:", existingByClerkId._id);
      return {
        _id: existingByClerkId._id,
        id: existingByClerkId._id,
        username: existingByClerkId.username,
        email: existingByClerkId.email,
        nickname: existingByClerkId.nickname,
        mobile_number: existingByClerkId.mobile_number,
        birthday: existingByClerkId.birthday,
        role: existingByClerkId.role || "customer",
        branch_id: existingByClerkId.branch_id,
        is_active: existingByClerkId.is_active,
        avatar: existingByClerkId.avatar,
        isVerified: existingByClerkId.isVerified,
        clerk_user_id: existingByClerkId.clerk_user_id,
        has_seen_tutorial: existingByClerkId.has_seen_tutorial,
        action: "exists",
      };
    }

    // 2. Check if user exists by email but no clerk_user_id (migration case)
    const existingByEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (existingByEmail && !existingByEmail.clerk_user_id) {
      // Check if this is a guest account being converted to full account
      const wasGuest = existingByEmail.is_guest === true;
      const fullName = [first_name, last_name].filter(Boolean).join(" ") || existingByEmail.nickname || "User";

      console.log("[EnsureUser] Linking existing user by email:", existingByEmail._id, wasGuest ? "(converting from guest)" : "");

      await ctx.db.patch(existingByEmail._id, {
        clerk_user_id,
        migration_status: "completed",
        is_guest: false, // Convert guest to full account
        isVerified: true,
        nickname: fullName, // Update with Clerk name if available
        avatar: image_url || existingByEmail.avatar, // Update avatar from Clerk
        updatedAt: Date.now(),
      });

      return {
        _id: existingByEmail._id,
        id: existingByEmail._id,
        username: existingByEmail.username,
        email: existingByEmail.email,
        nickname: fullName,
        mobile_number: existingByEmail.mobile_number,
        birthday: existingByEmail.birthday,
        role: existingByEmail.role || "customer",
        branch_id: existingByEmail.branch_id,
        is_active: existingByEmail.is_active,
        avatar: image_url || existingByEmail.avatar,
        isVerified: true,
        clerk_user_id,
        has_seen_tutorial: existingByEmail.has_seen_tutorial,
        action: wasGuest ? "guest_converted" : "linked",
      };
    }

    // 3. Create new user with role "customer" by default
    const firstName = first_name || "";
    const lastName = last_name || "";
    const fullName = [firstName, lastName].filter(Boolean).join(" ") || "User";
    const baseUsername = email.split("@")[0] || clerk_user_id;
    const uniqueUsername = `${baseUsername}_${clerk_user_id.slice(-6)}`;

    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      email,
      username: uniqueUsername,
      nickname: fullName,
      password: "", // Clerk manages authentication
      mobile_number: "",
      role: "customer",
      clerk_user_id,
      migration_status: "completed",
      is_active: true,
      isVerified: true,
      avatar: image_url,
      skills: [],
      createdAt: now,
      updatedAt: now,
    });

    // =========================================================================
    // INITIALIZE LOYALTY DATA FOR NEW CUSTOMERS
    // Creates wallet and points ledger with 0 balance (fresh start)
    // =========================================================================

    // Create wallet with 0 balance
    await ctx.db.insert("wallets", {
      user_id: userId,
      balance: 0, // ₱0.00 in centavos
      bonus_balance: 0, // ₱0.00 bonus
      currency: "PHP",
      createdAt: now,
      updatedAt: now,
    });

    // Create points ledger with 0 balance
    await ctx.db.insert("points_ledger", {
      user_id: userId,
      current_balance: 0, // 0 points (×100 format)
      lifetime_earned: 0, // 0 points total
      lifetime_redeemed: 0, // 0 points redeemed
      last_activity_at: now,
    });

    console.log("[EnsureUser] Created new user with fresh loyalty data:", {
      userId,
      clerk_user_id,
      email,
      wallet: "₱0.00",
      points: "0 pts",
    });

    const user = await ctx.db.get(userId);
    return {
      _id: userId,
      id: userId,
      username: user?.username,
      email: user?.email,
      nickname: user?.nickname,
      mobile_number: user?.mobile_number,
      birthday: user?.birthday,
      role: user?.role,
      branch_id: user?.branch_id,
      is_active: user?.is_active,
      avatar: user?.avatar,
      isVerified: user?.isVerified,
      clerk_user_id,
      has_seen_tutorial: false,
      action: "created",
    };
  },
});

/**
 * Get user by Clerk user ID
 * Used by frontend to look up Convex user after Clerk authentication
 *
 * @param clerk_user_id - The Clerk user ID (e.g., "user_2abc123def")
 * @returns User object or null if not found
 */
export const getUserByClerkId = query({
  args: { clerk_user_id: v.string() },
  handler: async (ctx, args) => {
    if (!args.clerk_user_id) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerk_user_id", args.clerk_user_id))
      .first();

    if (!user || !user.is_active) {
      return null;
    }

    // Return user data without sensitive fields
    return {
      _id: user._id,
      id: user._id,
      username: user.username,
      email: user.email,
      nickname: user.nickname,
      mobile_number: user.mobile_number,
      birthday: user.birthday,
      role: user.role || "customer",
      branch_id: user.branch_id,
      is_active: user.is_active,
      avatar: user.avatar,
      bio: user.bio,
      skills: user.skills,
      isVerified: user.isVerified,
      page_access: user.page_access,
      page_access_v2: user.page_access_v2,
      clerk_user_id: user.clerk_user_id,
      has_seen_tutorial: user.has_seen_tutorial,
    };
  },
});

/**
 * Admin utility: set or fix the role on a user document.
 * Use this to patch users that are missing the role field.
 */
export const adminSetUserRole = mutation({
  args: {
    user_id: v.id("users"),
    role: v.union(
      v.literal("staff"),
      v.literal("customer"),
      v.literal("admin"),
      v.literal("barber"),
      v.literal("super_admin"),
      v.literal("branch_admin")
    ),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.user_id);
    if (!user) throw new Error("User not found");

    await ctx.db.patch(args.user_id, {
      role: args.role,
      updatedAt: Date.now(),
    });

    return { success: true, userId: args.user_id, newRole: args.role };
  },
});

/**
 * Mark tutorial as completed for a user
 */
export const markTutorialComplete = mutation({
  args: { user_id: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.user_id);
    if (!user) throw new Error("User not found");

    await ctx.db.patch(args.user_id, {
      has_seen_tutorial: true,
      tutorial_completed_at: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true };
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

// Send voucher email with QR code to users
export const sendVoucherEmailWithQR = action({
  args: {
    email: v.string(),
    voucherCode: v.string(),
    voucherValue: v.string(),
    pointsRequired: v.number(),
    expiresAt: v.string(),
    recipientName: v.string(),
    voucherId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { api } = require("../_generated/api");

    // Fetch branding and email template
    const branding = await ctx.runQuery(api.services.branding.getGlobalBranding, {});
    const template = await ctx.runQuery(api.services.emailTemplates.getTemplateByType, { template_type: "voucher" });

    // Extract branding colors (fallback to defaults)
    const primaryColor = branding?.primary_color || '#000000';
    const accentColor = branding?.accent_color || '#000000';
    const brandName = branding?.display_name || '';

    // Lighter versions of primary color for backgrounds
    const primaryLight = `${primaryColor}1a`;
    const primaryBorder = `${primaryColor}40`;

    // Email template content with variable replacements
    const subject = (template?.subject || 'Your Voucher {{voucher_code}} from {{brand_name}}')
      .replace(/\{\{brand_name\}\}/g, brandName)
      .replace(/\{\{voucher_code\}\}/g, args.voucherCode);
    const heading = (template?.heading || '🎉 Your Voucher Is Ready!')
      .replace(/\{\{brand_name\}\}/g, brandName);
    const bodyText = (template?.body_text || 'Hey {{recipient_name}}! 🎁\n\nYou\'ve received a special voucher from {{brand_name}}!\n\n💰 Voucher Value: {{voucher_value}}\n🎫 Voucher Code: {{voucher_code}}\n⭐ Points Used: {{points_required}}\n📅 Valid Until: {{expires_at}}\n\nThank you for being a valued customer!')
      .replace(/\{\{brand_name\}\}/g, brandName)
      .replace(/\{\{recipient_name\}\}/g, args.recipientName)
      .replace(/\{\{voucher_code\}\}/g, args.voucherCode)
      .replace(/\{\{voucher_value\}\}/g, args.voucherValue)
      .replace(/\{\{points_required\}\}/g, String(args.pointsRequired))
      .replace(/\{\{expires_at\}\}/g, args.expiresAt)
      .replace(/\n/g, '<br>');
    const footerText = (template?.footer_text || '✓ Present this email or scan the QR code at checkout\n✓ Our staff will apply your discount\n✓ One voucher per visit')
      .replace(/\n/g, '<br>');

    // Generate QR code
    const qrPayload = JSON.stringify({
      voucherId: args.voucherId || "",
      code: args.voucherCode,
      value: args.voucherValue,
      type: "voucher",
      brand: brandName
    });
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrPayload)}`;

    const emailData = {
      from: `${brandName} <no-reply@tipunox.broadheader.com>`,
      to: args.email,
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your Voucher - ${brandName}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
              background-color: #f5f5f5;
              color: #333;
              line-height: 1.6;
            }
            .container {
              max-width: 500px;
              margin: 0 auto;
              background: #ffffff;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%);
              padding: 24px;
              text-align: center;
              color: white;
            }
            .header h1 {
              font-size: 24px;
              font-weight: 700;
              margin: 0;
              letter-spacing: -0.5px;
            }
            .body {
              padding: 28px 24px;
            }
            .greeting {
              font-size: 15px;
              color: #555;
              margin-bottom: 24px;
              line-height: 1.5;
            }
            .greeting strong {
              color: #333;
              font-weight: 600;
            }
            .voucher-card {
              background: ${primaryLight};
              border: 2px solid ${primaryBorder};
              border-radius: 10px;
              padding: 20px;
              margin-bottom: 24px;
              text-align: center;
            }
            .voucher-code {
              font-size: 28px;
              font-weight: 800;
              color: ${primaryColor};
              font-family: 'Courier New', monospace;
              letter-spacing: 2px;
              margin-bottom: 8px;
              word-break: break-all;
            }
            .voucher-value {
              font-size: 32px;
              font-weight: 800;
              color: ${primaryColor};
              margin-bottom: 8px;
            }
            .voucher-label {
              font-size: 12px;
              color: #999;
              text-transform: uppercase;
              letter-spacing: 1px;
              font-weight: 600;
            }
            .qr-container {
              background: white;
              border: 1px solid #e5e5e5;
              border-radius: 8px;
              padding: 20px;
              margin-bottom: 24px;
              text-align: center;
            }
            .qr-instruction {
              font-size: 13px;
              color: #666;
              margin-bottom: 12px;
              font-weight: 500;
            }
            .qr-code {
              display: inline-block;
              padding: 12px;
              background: white;
              border: 1px solid #e5e5e5;
              border-radius: 6px;
            }
            .qr-code img {
              width: 180px;
              height: 180px;
              display: block;
              border-radius: 4px;
              margin: 0 auto;
              max-width: 100%;
              image-rendering: pixelated;
            }
            .details {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin-bottom: 24px;
            }
            .detail-item {
              background: #f9f9f9;
              border: 1px solid #efefef;
              border-radius: 6px;
              padding: 12px;
              text-align: center;
            }
            .detail-label {
              font-size: 11px;
              color: #999;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              font-weight: 600;
            }
            .detail-value {
              font-size: 14px;
              color: #333;
              font-weight: 700;
            }
            .cta-section {
              background: ${primaryLight};
              border-left: 4px solid ${primaryColor};
              border-radius: 4px;
              padding: 16px;
              margin-bottom: 24px;
              font-size: 13px;
              color: #555;
              line-height: 1.6;
            }
            .cta-section strong {
              color: #333;
              display: block;
              margin-bottom: 8px;
              font-weight: 600;
            }
            .cta-section p {
              margin: 4px 0;
            }
            .footer {
              background: #f9f9f9;
              border-top: 1px solid #efefef;
              padding: 16px 24px;
              text-align: center;
              font-size: 11px;
              color: #999;
            }
            .footer p {
              margin: 2px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✨ ${heading}</h1>
            </div>
            
            <div class="body">
              <div class="greeting">
                Hey <strong>${args.recipientName}</strong>! 🎉<br>
                You've received a voucher from <strong>${brandName}</strong>
              </div>
              <div class="greeting">${bodyText}</div>
              
              <div class="voucher-card">
                <div class="voucher-label">Your Code</div>
                <div class="voucher-code">${args.voucherCode}</div>
                <div class="voucher-value">${args.voucherValue}</div>
              </div>

              <div class="qr-container">
                <div class="qr-instruction">📱 Scan at checkout</div>
                <div class="qr-code">
                  <img src="${qrImageUrl}" alt="Voucher QR Code" style="max-width: 100%; width: 180px; height: 180px; display: block; margin: 0 auto; border-radius: 4px; image-rendering: pixelated;" />
                  <div style="margin-top: 8px; font-size: 12px; color: #999;">Voucher Code: ${args.voucherCode}</div>
                </div>
              </div>

              <div class="details">
                <div class="detail-item">
                  <div class="detail-label">Points Needed</div>
                  <div class="detail-value">${args.pointsRequired}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Valid Until</div>
                  <div class="detail-value">${args.expiresAt}</div>
                </div>
              </div>

              <div class="cta-section">
                <strong>How to Use</strong>
                <p>${footerText}</p>
              </div>
            </div>
            
            <div class="footer">
              <p><strong>${brandName}</strong></p>
              <p><strong>${brandName}</strong></p>
              <p>© 2024 All Rights Reserved</p>
              <p>This is an automated message. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      // In development, mock the email sending
      if (process.env.NODE_ENV === 'development' || process.env.ENVIRONMENT === 'development') {
        console.log('📧 [DEV MODE] Voucher email would be sent:');
        console.log('  To:', args.email);
        console.log('  Subject:', emailData.subject);
        console.log('  Voucher Code:', args.voucherCode);
        console.log('  QR URL:', qrImageUrl);
        return { success: true, messageId: 'dev-mock-' + Date.now(), isDev: true };
      }

      // Production: Use Resend SDK
      const result = await resend.emails.send(emailData as any);

      if (result.error) {
        console.error('Voucher email service error:', result.error);
        throwUserError(ERROR_CODES.OPERATION_FAILED, "Failed to send voucher email", "We encountered an issue sending the email. Please try again later.");
      }

      console.log('Voucher email sent successfully:', result);
      return { success: true, messageId: result.data?.id };
    } catch (error: any) {
      console.error('Failed to send voucher email:', error);
      // If it's already a user error, rethrow it
      if (error.message && error.message.includes('"code":')) {
        throw error;
      }
      throwUserError(ERROR_CODES.OPERATION_FAILED, "Failed to send voucher email", "An unexpected error occurred while sending the email.");
    }
  },
});

// Send booking confirmation email with QR code
export const sendBookingConfirmationEmail = action({
  args: {
    email: v.string(),
    customerName: v.string(),
    bookingCode: v.string(),
    serviceName: v.string(),
    servicePrice: v.number(),
    barberName: v.string(),
    branchName: v.string(),
    branchAddress: v.optional(v.string()),
    date: v.string(),
    time: v.string(),
    bookingId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { api } = require("../_generated/api");

    // Fetch branding and email template
    const branding = await ctx.runQuery(api.services.branding.getGlobalBranding, {});
    const template = await ctx.runQuery(api.services.emailTemplates.getTemplateByType, { template_type: "booking_confirmation" });

    // Extract branding colors (fallback to defaults)
    const primaryColor = branding?.primary_color || '#000000';
    const accentColor = branding?.accent_color || '#000000';
    const bgColor = branding?.bg_color || '#0A0A0A';
    const brandName = branding?.display_name || '';

    // Lighter versions of primary color for backgrounds
    const primaryLight = `${primaryColor}1a`;
    const primaryBorder = `${primaryColor}40`;

    // Format date for display
    const formattedDate = new Date(args.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Email template content with variable replacements
    const subject = (template?.subject || 'Booking Confirmed - {{brand_name}}')
      .replace(/\{\{brand_name\}\}/g, brandName);
    const heading = (template?.heading || 'Booking Confirmed!')
      .replace(/\{\{brand_name\}\}/g, brandName);
    const bodyText = (template?.body_text || 'Your appointment has been confirmed. We look forward to seeing you!')
      .replace(/\{\{brand_name\}\}/g, brandName)
      .replace(/\{\{customer_name\}\}/g, args.customerName)
      .replace(/\{\{service_name\}\}/g, args.serviceName)
      .replace(/\{\{date\}\}/g, formattedDate)
      .replace(/\{\{time\}\}/g, args.time)
      .replace(/\{\{barber_name\}\}/g, args.barberName)
      .replace(/\n/g, '<br>');
    const ctaText = template?.cta_text || 'View Booking';
    const footerText = (template?.footer_text || 'If you need to reschedule or cancel, please contact us at least 24 hours in advance.')
      .replace(/\n/g, '<br>');

    // Generate QR code for booking
    const qrPayload = JSON.stringify({
      bookingId: args.bookingId || "",
      code: args.bookingCode,
      type: "booking",
      brand: brandName
    });
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrPayload)}`;

    const emailData = {
      from: `${brandName} <no-reply@tipunox.broadheader.com>`,
      to: args.email,
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking Confirmation - ${brandName}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
              background-color: #f5f5f5;
              color: #333;
              line-height: 1.6;
            }
            .container {
              max-width: 500px;
              margin: 0 auto;
              background: #ffffff;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%);
              padding: 24px;
              text-align: center;
              color: white;
            }
            .header h1 {
              font-size: 24px;
              font-weight: 700;
              margin: 0;
              letter-spacing: -0.5px;
            }
            .body {
              padding: 28px 24px;
            }
            .greeting {
              font-size: 15px;
              color: #555;
              margin-bottom: 24px;
              line-height: 1.5;
              text-align: center;
            }
            .booking-card {
              background: ${primaryLight};
              border: 2px solid ${primaryBorder};
              border-radius: 10px;
              padding: 20px;
              margin-bottom: 24px;
            }
            .booking-code {
              font-size: 24px;
              font-weight: 800;
              color: ${primaryColor};
              font-family: 'Courier New', monospace;
              letter-spacing: 2px;
              margin-bottom: 8px;
              text-align: center;
              word-break: break-all;
            }
            .booking-label {
              font-size: 12px;
              color: #999;
              text-transform: uppercase;
              letter-spacing: 1px;
              font-weight: 600;
              text-align: center;
              margin-bottom: 16px;
            }
            .booking-details {
              border-top: 1px solid ${primaryBorder};
              padding-top: 16px;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #f0f0f0;
            }
            .detail-row:last-child {
              border-bottom: none;
            }
            .detail-label {
              font-size: 13px;
              color: #666;
              font-weight: 500;
            }
            .detail-value {
              font-size: 13px;
              color: #333;
              font-weight: 600;
              text-align: right;
            }
            .qr-container {
              background: white;
              border: 1px solid #e5e5e5;
              border-radius: 8px;
              padding: 20px;
              margin-bottom: 24px;
              text-align: center;
            }
            .qr-instruction {
              font-size: 13px;
              color: #666;
              margin-bottom: 12px;
              font-weight: 500;
            }
            .qr-code img {
              width: 150px;
              height: 150px;
              display: block;
              border-radius: 4px;
              margin: 0 auto;
            }
            .cta-section {
              background: ${primaryLight};
              border-left: 4px solid ${primaryColor};
              border-radius: 4px;
              padding: 16px;
              margin-bottom: 24px;
              font-size: 13px;
              color: #555;
              line-height: 1.6;
            }
            .footer {
              background: #f9f9f9;
              border-top: 1px solid #efefef;
              padding: 16px 24px;
              text-align: center;
              font-size: 11px;
              color: #999;
            }
            .footer p {
              margin: 2px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ ${heading}</h1>
            </div>
            
            <div class="body">
              <div class="greeting">
                Hi <strong>${args.customerName}</strong>! ${bodyText}
              </div>
              
              <div class="booking-card">
                <div class="booking-label">Booking Code</div>
                <div class="booking-code">${args.bookingCode}</div>
                
                <div class="booking-details">
                  <div class="detail-row">
                    <span class="detail-label">📅 Date</span>
                    <span class="detail-value">${formattedDate}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">🕐 Time</span>
                    <span class="detail-value">${args.time}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">✂️ Service</span>
                    <span class="detail-value">${args.serviceName}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">💰 Price</span>
                    <span class="detail-value">₱${args.servicePrice.toLocaleString()}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">💇 Barber</span>
                    <span class="detail-value">${args.barberName}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">📍 Branch</span>
                    <span class="detail-value">${args.branchName}</span>
                  </div>
                </div>
              </div>

              <div class="qr-container">
                <div class="qr-instruction">📱 Show this QR code at the shop</div>
                <div class="qr-code">
                  <img src="${qrImageUrl}" alt="Booking QR Code" />
                </div>
              </div>

              <div class="cta-section">
                <strong style="display:block;margin-bottom:8px;color:#333;">Important Information</strong>
                ${footerText}
              </div>
            </div>
            
            <div class="footer">
              <p><strong>${brandName}</strong></p>
              ${args.branchAddress ? `<p>${args.branchAddress}</p>` : ''}
              <p>© 2024 All Rights Reserved</p>
              <p>This is an automated message. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      console.log('📧 Attempting to send booking confirmation email:', {
        to: args.email,
        bookingCode: args.bookingCode,
        service: args.serviceName,
        environment: process.env.NODE_ENV,
        hasResendKey: !!process.env.RESEND_API_KEY,
      });

      // Always try to send in production - booking emails are critical
      const result = await resend.emails.send(emailData as any);

      if (result.error) {
        console.error('📧 Booking confirmation email service error:', result.error);
        return { success: false, error: result.error.message };
      }

      console.log('📧 Booking confirmation email sent successfully:', {
        messageId: result.data?.id,
        to: args.email,
        bookingCode: args.bookingCode,
      });
      return { success: true, messageId: result.data?.id };
    } catch (error: any) {
      console.error('📧 Failed to send booking confirmation email:', {
        error: error.message,
        to: args.email,
        bookingCode: args.bookingCode,
      });
      // Don't throw error - email failure shouldn't block booking
      return { success: false, error: error.message };
    }
  },
});

// Send barber notification email when a new booking is assigned to them
export const sendBarberBookingNotificationEmail = action({
  args: {
    email: v.string(),
    barberName: v.string(),
    customerName: v.string(),
    bookingCode: v.string(),
    serviceName: v.string(),
    servicePrice: v.number(),
    branchName: v.string(),
    branchAddress: v.optional(v.string()),
    date: v.string(),
    time: v.string(),
  },
  handler: async (ctx, args) => {
    const { api } = require("../_generated/api");

    const branding = await ctx.runQuery(api.services.branding.getGlobalBranding, {});

    const primaryColor = branding?.primary_color || '#000000';
    const accentColor = branding?.accent_color || '#000000';
    const brandName = branding?.display_name || '';
    const primaryLight = `${primaryColor}1a`;
    const primaryBorder = `${primaryColor}40`;

    const formattedDate = new Date(args.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const resend = new Resend(process.env.RESEND_API_KEY);

    const emailData = {
      from: `${brandName} <no-reply@tipunox.broadheader.com>`,
      to: args.email,
      subject: `New Appointment - ${args.customerName} on ${formattedDate}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Appointment - ${brandName}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
              background-color: #f5f5f5;
              color: #333;
              line-height: 1.6;
            }
            .container {
              max-width: 500px;
              margin: 0 auto;
              background: #ffffff;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%);
              padding: 24px;
              text-align: center;
              color: white;
            }
            .header h1 {
              font-size: 24px;
              font-weight: 700;
              margin: 0;
              letter-spacing: -0.5px;
            }
            .body {
              padding: 28px 24px;
            }
            .greeting {
              font-size: 15px;
              color: #555;
              margin-bottom: 24px;
              line-height: 1.5;
              text-align: center;
            }
            .booking-card {
              background: ${primaryLight};
              border: 2px solid ${primaryBorder};
              border-radius: 10px;
              padding: 20px;
              margin-bottom: 24px;
            }
            .booking-code {
              font-size: 24px;
              font-weight: 800;
              color: ${primaryColor};
              font-family: 'Courier New', monospace;
              letter-spacing: 2px;
              margin-bottom: 8px;
              text-align: center;
              word-break: break-all;
            }
            .booking-label {
              font-size: 12px;
              color: #999;
              text-transform: uppercase;
              letter-spacing: 1px;
              font-weight: 600;
              text-align: center;
              margin-bottom: 16px;
            }
            .booking-details {
              border-top: 1px solid ${primaryBorder};
              padding-top: 16px;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #f0f0f0;
            }
            .detail-row:last-child {
              border-bottom: none;
            }
            .detail-label {
              font-size: 13px;
              color: #666;
              font-weight: 500;
            }
            .detail-value {
              font-size: 13px;
              color: #333;
              font-weight: 600;
              text-align: right;
            }
            .footer {
              background: #f9f9f9;
              border-top: 1px solid #efefef;
              padding: 16px 24px;
              text-align: center;
              font-size: 11px;
              color: #999;
            }
            .footer p {
              margin: 2px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📋 New Appointment</h1>
            </div>

            <div class="body">
              <div class="greeting">
                Hi <strong>${args.barberName}</strong>! You have a new appointment booked.
              </div>

              <div class="booking-card">
                <div class="booking-label">Booking Code</div>
                <div class="booking-code">${args.bookingCode}</div>

                <div class="booking-details">
                  <div class="detail-row">
                    <span class="detail-label">👤 Customer</span>
                    <span class="detail-value">${args.customerName}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">📅 Date</span>
                    <span class="detail-value">${formattedDate}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">🕐 Time</span>
                    <span class="detail-value">${args.time}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">✂️ Service</span>
                    <span class="detail-value">${args.serviceName}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">💰 Price</span>
                    <span class="detail-value">₱${args.servicePrice.toLocaleString()}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">📍 Branch</span>
                    <span class="detail-value">${args.branchName}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="footer">
              <p><strong>${brandName}</strong></p>
              ${args.branchAddress ? `<p>${args.branchAddress}</p>` : ''}
              <p>This is an automated message. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      console.log('📧 Attempting to send barber booking notification email:', {
        to: args.email,
        barberName: args.barberName,
        bookingCode: args.bookingCode,
        service: args.serviceName,
      });

      const result = await resend.emails.send(emailData as any);

      if (result.error) {
        console.error('📧 Barber notification email service error:', result.error);
        return { success: false, error: result.error.message };
      }

      console.log('📧 Barber notification email sent successfully:', {
        messageId: result.data?.id,
        to: args.email,
      });
      return { success: true, messageId: result.data?.id };
    } catch (error: any) {
      console.error('📧 Failed to send barber notification email:', {
        error: error.message,
        to: args.email,
      });
      return { success: false, error: error.message };
    }
  },
});

// ============================================================================
// TEST DATA SEEDING
// ============================================================================

/**
 * Seed a test customer with wallet and points
 * Run via: npx convex run services/auth:seedTestCustomer
 */
export const seedTestCustomer = mutation({
  args: {
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    walletBalance: v.optional(v.number()), // in pesos
    points: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const email = args.email || "testcustomer@example.com";
    const name = args.name || "Test Customer";
    const walletBalanceCentavos = (args.walletBalance || 500) * 100;
    const pointsX100 = (args.points || 5000) * 100;

    // Check if customer already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (existingUser) {
      // Update existing user's wallet and points
      const wallet = await ctx.db
        .query("wallets")
        .withIndex("by_user", (q) => q.eq("user_id", existingUser._id))
        .first();

      if (wallet) {
        await ctx.db.patch(wallet._id, {
          balance: walletBalanceCentavos,
          bonus_balance: Math.floor(walletBalanceCentavos * 0.1),
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("wallets", {
          user_id: existingUser._id,
          balance: walletBalanceCentavos,
          bonus_balance: Math.floor(walletBalanceCentavos * 0.1),
          currency: "PHP",
          createdAt: now,
          updatedAt: now,
        });
      }

      const pointsLedger = await ctx.db
        .query("points_ledger")
        .withIndex("by_user", (q) => q.eq("user_id", existingUser._id))
        .first();

      if (pointsLedger) {
        await ctx.db.patch(pointsLedger._id, {
          current_balance: pointsX100,
          lifetime_earned: Math.floor(pointsX100 * 1.2),
          last_activity_at: now,
        });
      } else {
        await ctx.db.insert("points_ledger", {
          user_id: existingUser._id,
          current_balance: pointsX100,
          lifetime_earned: Math.floor(pointsX100 * 1.2),
          lifetime_redeemed: 0,
          last_activity_at: now,
        });
      }

      return {
        success: true,
        action: "updated",
        userId: existingUser._id,
        email,
        wallet: `₱${(walletBalanceCentavos / 100).toFixed(2)}`,
        points: args.points || 5000,
      };
    }

    // Create new test customer
    const userId = await ctx.db.insert("users", {
      email,
      username: email.split("@")[0],
      nickname: name,
      password: "",
      mobile_number: "+639123456789",
      role: "customer",
      is_active: true,
      isVerified: true,
      skills: [],
      createdAt: now,
      updatedAt: now,
    });

    // Create wallet with balance
    await ctx.db.insert("wallets", {
      user_id: userId,
      balance: walletBalanceCentavos,
      bonus_balance: Math.floor(walletBalanceCentavos * 0.1),
      currency: "PHP",
      createdAt: now,
      updatedAt: now,
    });

    // Create points ledger
    await ctx.db.insert("points_ledger", {
      user_id: userId,
      current_balance: pointsX100,
      lifetime_earned: Math.floor(pointsX100 * 1.2),
      lifetime_redeemed: Math.floor(pointsX100 * 0.2),
      last_activity_at: now,
    });

    // Add wallet transaction history
    await ctx.db.insert("wallet_transactions", {
      user_id: userId,
      type: "topup",
      amount: walletBalanceCentavos,
      status: "completed",
      reference_id: `SEED-${Date.now()}`,
      description: "Initial top-up (seeded)",
      createdAt: now - 3 * 24 * 60 * 60 * 1000,
      updatedAt: now - 3 * 24 * 60 * 60 * 1000,
    });

    // Add points transaction history
    await ctx.db.insert("points_transactions", {
      user_id: userId,
      type: "earn",
      amount: pointsX100,
      balance_after: pointsX100,
      source_type: "payment",
      source_id: "seed-bonus",
      notes: "Initial points (seeded)",
      created_at: now - 3 * 24 * 60 * 60 * 1000,
    });

    console.log("[Seed] Created test customer:", {
      userId,
      email,
      wallet: `₱${(walletBalanceCentavos / 100).toFixed(2)}`,
      points: args.points || 5000,
    });

    return {
      success: true,
      action: "created",
      userId,
      email,
      wallet: `₱${(walletBalanceCentavos / 100).toFixed(2)}`,
      points: args.points || 5000,
    };
  },
});
