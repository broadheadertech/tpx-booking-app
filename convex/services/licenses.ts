/**
 * Licenses Service - IT Admin Platform Management
 * Manages branch license keys (generation, validation, revocation, renewal).
 */

import { v } from "convex/values";
import { query, mutation } from "../_generated/server";

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Generate a UUID-style license key in xxxx-xxxx-xxxx-xxxx format.
 */
function generateLicenseKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const segments: string[] = [];
  for (let s = 0; s < 4; s++) {
    let segment = "";
    for (let i = 0; i < 4; i++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    segments.push(segment);
  }
  return segments.join("-");
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all licenses, joined with branch name.
 */
export const getAllLicenses = query({
  args: {},
  handler: async (ctx) => {
    const licenses = await ctx.db.query("licenses").collect();

    const enriched = await Promise.all(
      licenses.map(async (license) => {
        const branch = await ctx.db.get(license.branch_id);
        return {
          ...license,
          branch_name: branch?.name || "Unknown Branch",
        };
      })
    );

    return enriched;
  },
});

/**
 * Get license(s) for a specific branch.
 */
export const getLicenseByBranch = query({
  args: {
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const licenses = await ctx.db
      .query("licenses")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    const enriched = await Promise.all(
      licenses.map(async (license) => {
        const branch = await ctx.db.get(license.branch_id);
        return {
          ...license,
          branch_name: branch?.name || "Unknown Branch",
        };
      })
    );

    return enriched;
  },
});

/**
 * Validate a license: checks if it is active and not expired.
 */
export const validateLicense = query({
  args: {
    licenseId: v.id("licenses"),
  },
  handler: async (ctx, args) => {
    const license = await ctx.db.get(args.licenseId);

    if (!license) {
      return { valid: false, reason: "License not found" };
    }

    if (!license.is_active) {
      return { valid: false, reason: "License is inactive or revoked" };
    }

    if (license.expires_at < Date.now()) {
      return { valid: false, reason: "License has expired" };
    }

    return {
      valid: true,
      license_key: license.license_key,
      expires_at: license.expires_at,
      features: license.features || [],
      max_users: license.max_users,
    };
  },
});

/**
 * Get licenses expiring within N days (default 30).
 */
export const getExpiringLicenses = query({
  args: {
    withinDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.withinDays ?? 30;
    const now = Date.now();
    const cutoff = now + days * 24 * 60 * 60 * 1000;

    const licenses = await ctx.db.query("licenses").collect();

    const expiring = licenses.filter(
      (l) =>
        l.is_active &&
        l.expires_at >= now &&
        l.expires_at <= cutoff
    );

    const enriched = await Promise.all(
      expiring.map(async (license) => {
        const branch = await ctx.db.get(license.branch_id);
        return {
          ...license,
          branch_name: branch?.name || "Unknown Branch",
          days_until_expiry: Math.ceil(
            (license.expires_at - now) / (24 * 60 * 60 * 1000)
          ),
        };
      })
    );

    return enriched.sort((a, b) => a.expires_at - b.expires_at);
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Generate a new license for a branch. IT Admin only.
 */
export const generateLicense = mutation({
  args: {
    userId: v.id("users"),
    branch_id: v.id("branches"),
    expires_at: v.number(),
    max_users: v.optional(v.number()),
    features: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate IT Admin role
    const user = await ctx.db.get(args.userId);
    if (!user || user.role !== "it_admin") {
      throw new Error("Unauthorized: IT Administrator access required");
    }

    const now = Date.now();
    const licenseKey = generateLicenseKey();

    const licenseId = await ctx.db.insert("licenses", {
      branch_id: args.branch_id,
      license_key: licenseKey,
      issued_at: now,
      expires_at: args.expires_at,
      is_active: true,
      max_users: args.max_users,
      features: args.features,
      notes: args.notes,
      created_by: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, licenseId, license_key: licenseKey };
  },
});

/**
 * Revoke a license. IT Admin only.
 */
export const revokeLicense = mutation({
  args: {
    userId: v.id("users"),
    licenseId: v.id("licenses"),
  },
  handler: async (ctx, args) => {
    // Validate IT Admin role
    const user = await ctx.db.get(args.userId);
    if (!user || user.role !== "it_admin") {
      throw new Error("Unauthorized: IT Administrator access required");
    }

    const existing = await ctx.db.get(args.licenseId);
    if (!existing) {
      throw new Error("License not found");
    }

    await ctx.db.patch(args.licenseId, {
      is_active: false,
      revoked_at: Date.now(),
      revoked_by: args.userId,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Renew a license by extending expires_at by 1 year. IT Admin only.
 */
export const renewLicense = mutation({
  args: {
    userId: v.id("users"),
    licenseId: v.id("licenses"),
  },
  handler: async (ctx, args) => {
    // Validate IT Admin role
    const user = await ctx.db.get(args.userId);
    if (!user || user.role !== "it_admin") {
      throw new Error("Unauthorized: IT Administrator access required");
    }

    const existing = await ctx.db.get(args.licenseId);
    if (!existing) {
      throw new Error("License not found");
    }

    const now = Date.now();
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    // Extend from current expiry if still in the future, otherwise from now
    const baseDate = existing.expires_at > now ? existing.expires_at : now;
    const newExpiresAt = baseDate + oneYear;

    await ctx.db.patch(args.licenseId, {
      expires_at: newExpiresAt,
      is_active: true,
      updatedAt: now,
    });

    return { success: true, new_expires_at: newExpiresAt };
  },
});
