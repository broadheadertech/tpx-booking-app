import { v, ConvexError } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getAuthenticatedUser, requireSuperAdmin } from "../lib/unifiedAuth";

// Validation helpers
function isValidColor(color: string): boolean {
  if (!color || typeof color !== 'string') return false;
  // Hex: #FF8C42 or #FFF
  if (/^#[0-9A-F]{3}([0-9A-F]{3})?$/i.test(color)) return true;
  // RGB: rgb(255, 140, 66)
  if (/^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/i.test(color)) return true;
  // RGBA: rgba(255, 140, 66, 0.5)
  if (/^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/i.test(color)) return true;
  // CSS var: var(--color-primary)
  if (/^var\(--[\w-]+\)$/.test(color)) return true;
  return false;
}

function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  // Allow relative paths
  if (url.startsWith('/')) return true;
  // Validate full URLs
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function validateBrandingPayload(payload: any): string[] {
  const errors: string[] = [];

  // Color validation
  if (payload.primary_color && !isValidColor(payload.primary_color)) {
    errors.push('Invalid primary_color format (use #RRGGBB, rgb(...), or var(--name))');
  }
  if (payload.accent_color && !isValidColor(payload.accent_color)) {
    errors.push('Invalid accent_color format (use #RRGGBB, rgb(...), or var(--name))');
  }
  if (payload.bg_color && !isValidColor(payload.bg_color)) {
    errors.push('Invalid bg_color format (use #RRGGBB, rgb(...), or var(--name))');
  }
  if (payload.text_color && !isValidColor(payload.text_color)) {
    errors.push('Invalid text_color format (use #RRGGBB, rgb(...), or var(--name))');
  }
  if (payload.muted_color && !isValidColor(payload.muted_color)) {
    errors.push('Invalid muted_color format (use #RRGGBB, rgb(...), or var(--name))');
  }

  // URL validation
  if (payload.logo_light_url && !isValidUrl(payload.logo_light_url)) {
    errors.push('Invalid logo_light_url format (must be http:// or https:// or /path)');
  }
  if (payload.logo_dark_url && !isValidUrl(payload.logo_dark_url)) {
    errors.push('Invalid logo_dark_url format (must be http:// or https:// or /path)');
  }
  if (payload.favicon_url && !isValidUrl(payload.favicon_url)) {
    errors.push('Invalid favicon_url format (must be http:// or https:// or /path)');
  }
  if (payload.banner_url && !isValidUrl(payload.banner_url)) {
    errors.push('Invalid banner_url format (must be http:// or https:// or /path)');
  }
  if (payload.hero_image_url && !isValidUrl(payload.hero_image_url)) {
    errors.push('Invalid hero_image_url format (must be http:// or https:// or /path)');
  }

  // Display name length
  if (payload.display_name && payload.display_name.length > 100) {
    errors.push('Display name too long (max 100 characters)');
  }
  if (payload.display_name && payload.display_name.length < 1) {
    errors.push('Display name cannot be empty');
  }

  return errors;
}

export const getBrandingByBranch = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    const branding = await ctx.db
      .query("branding")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .first();
    return branding || null;
  },
});

export const getBrandingByBranchCode = query({
  args: { branch_code: v.string() },
  handler: async (ctx, args) => {
    const branch = await ctx.db
      .query("branches")
      .withIndex("by_branch_code", (q) => q.eq("branch_code", args.branch_code))
      .first();
    if (!branch) return null;
    const branding = await ctx.db
      .query("branding")
      .withIndex("by_branch", (q) => q.eq("branch_id", branch._id))
      .first();
    return branding || null;
  },
});

export const getGlobalBranding = query({
  args: { version: v.optional(v.number()) },
  handler: async (ctx) => {
    const branding = await ctx.db.query("branding_global").first();
    if (branding) return branding;
    return {
      display_name: "",
      primary_color: "#000000",
      accent_color: "#000000",
      bg_color: "#0A0A0A",
      text_color: "#FFFFFF",
      muted_color: "#333333",
      logo_light_url: "",
      logo_dark_url: "",
      favicon_url: "",
      banner_url: "",
      hero_image_url: "",
      feature_toggles: {
        kiosk: true,
        wallet: true,
        vouchers: true,
        referrals: false,
      },
      version: 0,
      updatedAt: 0,
      createdAt: 0,
    } as any;
  },
});

export const upsertGlobalBranding = mutation({
  args: {
    sessionToken: v.optional(v.string()), // Optional for backwards compatibility
    payload: v.object({
      display_name: v.optional(v.string()),
      primary_color: v.optional(v.string()),
      accent_color: v.optional(v.string()),
      bg_color: v.optional(v.string()),
      text_color: v.optional(v.string()),
      muted_color: v.optional(v.string()),
      logo_light_url: v.optional(v.string()),
      logo_dark_url: v.optional(v.string()),
      favicon_url: v.optional(v.string()),
      banner_url: v.optional(v.string()),
      hero_image_url: v.optional(v.string()),
      feature_toggles: v.optional(v.object({
        kiosk: v.optional(v.boolean()),
        wallet: v.optional(v.boolean()),
        vouchers: v.optional(v.boolean()),
        referrals: v.optional(v.boolean()),
      })),
    }),
  },
  handler: async (ctx, args) => {
    // Use unified auth (supports both Clerk and legacy)
    const user = await requireSuperAdmin(ctx, args.sessionToken);

    // Validate payload
    const validationErrors = validateBrandingPayload(args.payload);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }

    const now = Date.now();
    const existing = await ctx.db.query("branding_global").first();

    // Create history snapshot BEFORE updating
    if (existing) {
      const currentVersion = existing.version || 0;
      await ctx.db.insert("branding_history", {
        branding_id: existing._id,
        snapshot: existing,
        changed_by: user._id,
        version: currentVersion,
        createdAt: now,
      });
    }

    const newVersion = (existing?.version || 0) + 1;

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args.payload,
        version: newVersion,
        updated_by: user._id,
        updated_at: now,
        updatedAt: now,
      });
      return existing._id;
    }

    const id = await ctx.db.insert("branding_global", {
      ...args.payload,
      version: 1,
      updated_by: user._id,
      updated_at: now,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

export const getBrandingHistory = query({
  args: {
    sessionToken: v.optional(v.string()), // Optional for backwards compatibility
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.sessionToken);

    const limit = args.limit || 20;
    const history = await ctx.db
      .query("branding_history")
      .order("desc")
      .take(limit);

    // Enrich with user info
    const enriched = await Promise.all(
      history.map(async (item) => {
        const changedByUser = await ctx.db.get(item.changed_by);
        return {
          ...item,
          changed_by_user: changedByUser ? {
            _id: changedByUser._id,
            nickname: changedByUser.nickname,
            email: changedByUser.email,
          } : null,
        };
      })
    );

    return enriched;
  },
});

export const rollbackGlobalBranding = mutation({
  args: {
    sessionToken: v.optional(v.string()), // Optional for backwards compatibility
    version: v.number(),
  },
  handler: async (ctx, args) => {
    // Use unified auth (supports both Clerk and legacy)
    const user = await requireSuperAdmin(ctx, args.sessionToken);

    const current = await ctx.db.query("branding_global").first();
    if (!current) {
      throw new Error("No current branding configuration found");
    }

    const history = await ctx.db
      .query("branding_history")
      .withIndex("by_version", (q) => q.eq("version", args.version))
      .first();

    if (!history) {
      throw new Error(`Version ${args.version} not found in history`);
    }

    const now = Date.now();

    // Create history of current state before rollback
    const currentVersion = current.version || 0;
    await ctx.db.insert("branding_history", {
      branding_id: current._id,
      snapshot: current,
      changed_by: user._id,
      change_notes: `Pre-rollback snapshot (rolling back to version ${args.version})`,
      version: currentVersion,
      createdAt: now,
    });

    // Restore snapshot (exclude metadata fields)
    const { _id, _creationTime, createdAt: _, version: __, changed_by, ...snapshotData } = history.snapshot;

    await ctx.db.patch(current._id, {
      ...snapshotData,
      version: currentVersion + 1,
      updated_by: user._id,
      updated_at: now,
      updatedAt: now,
    });

    return current._id;
  },
});

export const exportBranding = query({
  args: { sessionToken: v.optional(v.string()) }, // Optional for backwards compatibility
  handler: async (ctx, args) => {
    const user = await requireSuperAdmin(ctx, args.sessionToken);

    const branding = await ctx.db.query("branding_global").first();
    return {
      version: 1,
      exportedAt: Date.now(),
      exportedBy: user._id,
      data: branding,
    };
  },
});

export const importBranding = mutation({
  args: {
    sessionToken: v.optional(v.string()), // Optional for backwards compatibility
    config: v.any(),
  },
  handler: async (ctx, args) => {
    // Use unified auth (supports both Clerk and legacy)
    const user = await requireSuperAdmin(ctx, args.sessionToken);

    // Validate import format
    if (!args.config.version || !args.config.data) {
      throw new Error("Invalid import format: missing version or data");
    }

    const importData = args.config.data;

    // Validate imported data
    const validationErrors = validateBrandingPayload(importData);
    if (validationErrors.length > 0) {
      throw new Error(`Import validation failed: ${validationErrors.join(', ')}`);
    }

    const current = await ctx.db.query("branding_global").first();
    const now = Date.now();

    // Create backup before import
    if (current) {
      await ctx.db.insert("branding_history", {
        branding_id: current._id,
        snapshot: current,
        changed_by: user._id,
        change_notes: "Pre-import backup",
        version: current.version || 0,
        createdAt: now,
      });
    }

    const newVersion = (current?.version || 0) + 1;

    // Extract only the fields we want to import (exclude metadata)
    const { _id, _creationTime, createdAt: _, updatedAt: __, version: ___, updated_by, updated_at, ...dataToImport } = importData;

    if (current) {
      await ctx.db.patch(current._id, {
        ...dataToImport,
        version: newVersion,
        updated_by: user._id,
        updated_at: now,
        updatedAt: now,
      });
      return current._id;
    }

    const id = await ctx.db.insert("branding_global", {
      ...dataToImport,
      version: 1,
      updated_by: user._id,
      updated_at: now,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

// Upload image mutation - stores file and returns storage ID
// Allows branch_admin and above to upload images for their branch
export const generateUploadUrl = mutation({
  args: {
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx, args.sessionToken);
    if (!user) throw new Error("Please log in to upload images");
    return await ctx.storage.generateUploadUrl();
  },
});

// Get URL for uploaded file
export const getImageUrl = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx, args.sessionToken);
    if (!user) throw new Error("Please log in to access images");
    const url = await ctx.storage.getUrl(args.storageId as any);
    return url;
  },
});

export const upsertBranding = mutation({
  args: {
    sessionToken: v.optional(v.string()), // Optional for backwards compatibility
    branch_id: v.id("branches"),
    payload: v.object({
      display_name: v.optional(v.string()),
      primary_color: v.optional(v.string()),
      accent_color: v.optional(v.string()),
      bg_color: v.optional(v.string()),
      text_color: v.optional(v.string()),
      muted_color: v.optional(v.string()),
      logo_light_url: v.optional(v.string()),
      logo_dark_url: v.optional(v.string()),
      favicon_url: v.optional(v.string()),
      banner_url: v.optional(v.string()),
      hero_image_url: v.optional(v.string()),
      feature_toggles: v.optional(v.object({
        kiosk: v.optional(v.boolean()),
        wallet: v.optional(v.boolean()),
        vouchers: v.optional(v.boolean()),
        referrals: v.optional(v.boolean()),
      })),
    }),
  },
  handler: async (ctx, args) => {
    // Use unified auth (supports both Clerk and legacy)
    const user = await getAuthenticatedUser(ctx, args.sessionToken);
    if (!user) throw new Error("Unauthorized");

    // AuthZ: only super_admin or branch_admin for the branch
    const isSuperAdmin = user.role === "super_admin";
    const isBranchAdmin = user.role === "branch_admin" && String(user.branch_id) === String(args.branch_id);
    if (!isSuperAdmin && !isBranchAdmin) throw new Error("Permission denied");

    // Upsert by branch
    const existing = await ctx.db
      .query("branding")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args.payload,
        updated_by: user._id,
        updated_at: now,
        updatedAt: now,
      });
      return existing._id;
    }

    const id = await ctx.db.insert("branding", {
      branch_id: args.branch_id,
      ...args.payload,
      updated_by: user._id,
      updated_at: now,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});
