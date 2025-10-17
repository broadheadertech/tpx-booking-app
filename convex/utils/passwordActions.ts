"use node";

import { createHash } from "convex/values";
import { action } from "../_generated/server";
import { v } from "convex/values";

/**
 * Hash a password using SHA-256 with salt
 * In production, use bcrypt or Argon2 for better security
 */
export const hashPasswordAction = action({
  args: { password: v.string() },
  handler: async (ctx, args): Promise<string> => {
    const crypto = await import("crypto");
    const salt = process.env.PASSWORD_SALT || "default-salt-change-in-production";
    return crypto.createHash("sha256").update(args.password + salt).digest("hex");
  },
});

/**
 * Verify a password against its hash
 */
export const verifyPasswordAction = action({
  args: { password: v.string(), hash: v.string() },
  handler: async (ctx, args): Promise<boolean> => {
    const hashed = await ctx.runAction(hashPasswordAction, { password: args.password });
    return hashed === args.hash;
  },
});
