import { v } from "convex/values";
import { mutation, query, action } from "../_generated/server";
import { api } from "../_generated/api";
import { throwUserError, ERROR_CODES, validateInput } from "../utils/errors";
import { hashPassword, verifyPassword } from "../utils/password";
import { Resend } from 'resend';


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

    // Validate branch_id for staff users (customers don't need branch_id)
    if (["staff", "barber", "branch_admin", "admin"].includes(args.role) && !args.branch_id) {
      throw new Error("Branch ID is required for staff, barber, branch_admin, and admin users");
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

    // Debug: Check what's happening with the password
    console.log("DEBUG - Login attempt details:");
    console.log("Input email:", args.email);
    console.log("Input password:", `"${args.password}"`);
    console.log("Input password length:", args.password.length);
    console.log("Stored password:", `"${user.password}"`);
    console.log("Stored password length:", user.password.length);
    console.log("Stored hash verification:", verifyPassword(args.password, user.password));
    
    // Check password - assume it's hashed (new standard)
    if (!verifyPassword(args.password, user.password)) {
      // If hash verification fails, try plain text as fallback for legacy accounts
      console.log("Hash failed, trying plain text...");
      if (args.password !== user.password) {
        console.log("Plain text also failed");
        throwUserError(ERROR_CODES.AUTH_INVALID_CREDENTIALS);
      } else {
        console.log("Plain text verification succeeded - legacy account");
      }
    } else {
      console.log("Hash verification succeeded");
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

    // Fetch profile with a URL for the profile picture
    const fields = "id,name,email,picture.type(large)";
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

    // If user already exists and we have a fresher avatar, update it once
    if (user && args.avatar && user.avatar !== args.avatar) {
      await ctx.db.patch(user._id, { avatar: args.avatar, updatedAt: now });
      user = await ctx.db.get(user._id)!;
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
    mobile_number: v.optional(v.string()),
    address: v.optional(v.string()),
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

    // Get current user to validate
    const currentUser = await ctx.db.get(session.userId);
    if (!currentUser) {
      throw new Error("User not found");
    }

    // Validate inputs
    if (args.mobile_number !== undefined && args.mobile_number.length > 0) {
      if (!/^\+?[0-9\s\-\(\)]{7,}$/.test(args.mobile_number)) {
        throw new Error("Invalid mobile number format");
      }
    }

    if (args.nickname !== undefined && args.nickname.length > 100) {
      throw new Error("Nickname must be less than 100 characters");
    }

    if (args.address !== undefined && args.address.length > 500) {
      throw new Error("Address must be less than 500 characters");
    }

    if (args.bio !== undefined && args.bio.length > 1000) {
      throw new Error("Bio must be less than 1000 characters");
    }

    // Update user
    await ctx.db.patch(session.userId, {
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
    const user = await ctx.db.get(session.userId);
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
      password: hashPassword(args.password), // Hash password for security
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
    is_active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId, ...updateData } = args;

    // Get existing user
    const existingUser = await ctx.db.get(userId);
    if (!existingUser) {
      throw new Error("User not found");
    }

    // Check if email is being updated and if it's already taken by another user
    if (updateData.email && updateData.email !== existingUser.email) {
      const emailExists = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", updateData.email!))
        .first();

      if (emailExists && emailExists._id !== userId) {
        throwUserError(ERROR_CODES.AUTH_EMAIL_EXISTS);
      }
    }

    // Check if username is being updated and if it's already taken by another user
    if (updateData.username && updateData.username !== existingUser.username) {
      const usernameExists = await ctx.db
        .query("users")
        .withIndex("by_username", (q) => q.eq("username", updateData.username!))
        .first();

      if (usernameExists && usernameExists._id !== userId) {
        throwUserError(ERROR_CODES.AUTH_USERNAME_EXISTS);
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
      throw new Error("User not found");
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
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
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

    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const expiresInMs = 1000 * 60 * 15; // 15 minutes
    await ctx.db.patch(user._id, {
      password_reset_token: token,
      password_reset_expires: Date.now() + expiresInMs,
      updatedAt: Date.now(),
    });

    return { success: true, token, email: user.email };
  },
});

const resend = new Resend(process.env.RESEND_API_KEY);

// Send password reset email with Resend
export const sendPasswordResetEmail = action({
  args: {
    email: v.string(),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const resetUrl = `${process.env.PUBLIC_APP_URL || 'http://localhost:5173'}/auth/reset-password?token=${args.token}`;

    const emailData = {
      from: 'TPX Barbershop <no-reply@tipunox.broadheader.com>',
      to: args.email,
      subject: 'Reset your TPX Barbershop password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset - TPX Barbershop</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background-color: #0A0A0A;
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
              color: #FF8C42;
              text-align: center;
            }
            .text {
              color: #ccc;
              margin-bottom: 30px;
              text-align: center;
            }
            .reset-button {
              display: inline-block;
              background: linear-gradient(135deg, #FF8C42 0%, #FF7A2B 100%);
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
              background: rgba(255, 140, 66, 0.1);
              border: 1px solid rgba(255, 140, 66, 0.3);
              border-radius: 8px;
              padding: 20px;
              margin-top: 20px;
            }
            .security-info h3 {
              color: #FF8C42;
              margin-top: 0;
              margin-bottom: 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="color: #FF8C42; font-size: 32px; margin-bottom: 10px;">TPX Barbershop</h1>
            </div>
            
            <div class="content">
              <h1 class="title">Reset Your Password</h1>
              <p class="text">
                Hi there! We received a request to reset your password for your TPX Barbershop account.
                Click the button below to set a new password.
              </p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="reset-button">Reset Password</a>
              </div>
              
              <div class="security-info">
                <h3>🔐 Security Information</h3>
                <p style="margin: 0; font-size: 14px; color: #bbb;">
                  This link will expire in 15 minutes for your security. If you didn't request a password reset, 
                  you can safely ignore this email.
                </p>
              </div>
              
              <p class="text" style="margin-top: 30px; font-size: 14px;">
                If the button above doesn't work, copy and paste this link into your browser:<br>
                <span style="word-break: break-all; color: #FF8C42;">${resetUrl}</span>
              </p>
            </div>
            
            <div class="footer">
              <p>© 2024 TPX Barbershop. All rights reserved.</p>
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
      return { success: false, error: error.message };
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
    // Scan for a user with this token; Convex doesn't support cross-table search by arbitrary field with index,
    // so collect and filter. For small user counts in dev this is fine. For prod, add an index if needed.
    const candidates = await ctx.db.query("users").collect();
    const user = candidates.find(
      (u: any) => u.password_reset_token === args.token && typeof u.password_reset_expires === 'number'
    );

    if (!user) {
      throwUserError(ERROR_CODES.AUTH_INVALID_CREDENTIALS);
    }

    if ((user.password_reset_expires as number) < Date.now()) {
      throw new Error("Reset token expired");
    }

    await ctx.db.patch(user._id, {
      password: hashPassword(args.new_password), // Hash password for security
      password_reset_token: undefined,
      password_reset_expires: undefined,
      updatedAt: Date.now(),
    });

    return { success: true };
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

// Send voucher email with QR code to users
export const sendVoucherEmailWithQR = action({
  args: {
    email: v.string(),
    voucherCode: v.string(),
    voucherValue: v.string(),
    pointsRequired: v.number(),
    expiresAt: v.string(),
    qrCodeBase64: v.string(), // Base64 encoded QR code image
    recipientName: v.string(),
  },
  handler: async (ctx, args) => {
    const emailData = {
      from: 'TPX Barbershop <no-reply@tipunox.broadheader.com>',
      to: args.email,
      subject: `Your Voucher ${args.voucherCode} from TPX Barbershop`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your Voucher - TPX Barbershop</title>
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
              background: linear-gradient(135deg, #FF8C42 0%, #FF7A2B 100%);
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
              background: linear-gradient(135deg, #FFF8F4 0%, #FFF5F0 100%);
              border: 2px solid #FFD6C5;
              border-radius: 10px;
              padding: 20px;
              margin-bottom: 24px;
              text-align: center;
            }
            .voucher-code {
              font-size: 28px;
              font-weight: 800;
              color: #FF8C42;
              font-family: 'Courier New', monospace;
              letter-spacing: 2px;
              margin-bottom: 8px;
              word-break: break-all;
            }
            .voucher-value {
              font-size: 32px;
              font-weight: 800;
              color: #FF8C42;
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
              background: #FFF8F4;
              border-left: 4px solid #FF8C42;
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
              <h1>✨ Your Voucher Is Ready</h1>
            </div>
            
            <div class="body">
              <div class="greeting">
                Hey <strong>${args.recipientName}</strong>! 🎉<br>
                You've received a voucher from <strong>TPX Barbershop</strong>
              </div>
              
              <div class="voucher-card">
                <div class="voucher-label">Your Code</div>
                <div class="voucher-code">${args.voucherCode}</div>
                <div class="voucher-value">${args.voucherValue}</div>
              </div>

              <div class="qr-container">
                <div class="qr-instruction">📱 Scan at checkout</div>
                <div class="qr-code">
                  <img src="${args.qrCodeBase64}" alt="Voucher QR Code" style="max-width: 100%;" />
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
                <p>✓ Present this email or scan the QR code</p>
                <p>✓ Our staff will apply your discount</p>
                <p>✓ One voucher per visit</p>
              </div>
            </div>
            
            <div class="footer">
              <p><strong>TPX Barbershop</strong></p>
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
        return { success: true, messageId: 'dev-mock-' + Date.now(), isDev: true };
      }

      // Production: Use Resend SDK
      const result = await resend.emails.send(emailData);
      
      if (result.error) {
        console.error('Voucher email service error:', result.error);
        throw new Error(`Email service error: ${result.error.message || 'Unknown error'}`);
      }
      
      console.log('Voucher email sent successfully:', result);
      return { success: true, messageId: result.data?.id };
    } catch (error) {
      console.error('Failed to send voucher email:', error);
      throw error;
    }
  },
});
