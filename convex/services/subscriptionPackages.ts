/**
 * Subscription Packages Service — IT-admin-managed feature bundles.
 *
 * Packages define which features are enabled for the branches that subscribe
 * to them. Branch subscriptions can additionally override individual feature
 * flags (see subscriptions.feature_overrides).
 *
 * Only it_admin and super_admin can create/update/archive packages.
 */

import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { logAudit } from "./auditLogs";

const ALLOWED_ROLES = new Set(["it_admin", "super_admin"]);

async function requireITAdmin(ctx: any, userId: string) {
  const user = await ctx.db.get(userId as any);
  if (!user) throw new Error("User not found");
  if (!ALLOWED_ROLES.has(user.role)) {
    throw new Error("Only IT admins or super admins can manage subscription packages.");
  }
  return user;
}

// ============================================================================
// QUERIES
// ============================================================================

export const listPackages = query({
  args: { include_inactive: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    let rows = await ctx.db.query("subscription_packages").collect();
    if (!args.include_inactive) {
      rows = rows.filter((r) => r.is_active);
    }
    return rows.sort(
      (a, b) => (a.display_order ?? 999) - (b.display_order ?? 999)
    );
  },
});

export const getPackageById = query({
  args: { package_id: v.id("subscription_packages") },
  handler: async (ctx, args) => ctx.db.get(args.package_id),
});

export const getPackageBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) =>
    ctx.db
      .query("subscription_packages")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first(),
});

// ============================================================================
// MUTATIONS — IT admin only
// ============================================================================

const termDiscountValidator = v.array(
  v.object({
    min_months: v.number(),
    discount_percent: v.number(),
    label: v.optional(v.string()),
  })
);

export const createPackage = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    features: v.any(), // { [feature_key]: boolean }
    monthly_price: v.optional(v.number()),
    annual_price: v.optional(v.number()),
    currency: v.optional(v.string()),
    display_order: v.optional(v.number()),
    term_discounts: v.optional(termDiscountValidator),
    created_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const actor = await requireITAdmin(ctx, args.created_by as any);

    if (!args.name?.trim()) throw new Error("Package name is required.");
    if (!args.slug?.trim()) throw new Error("Package slug is required.");

    const existing = await ctx.db
      .query("subscription_packages")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (existing) throw new Error(`A package with slug "${args.slug}" already exists.`);

    // Validate and sort term discounts (ascending by min_months)
    const termDiscounts = (args.term_discounts || [])
      .filter((t) => t.min_months > 0 && t.discount_percent >= 0 && t.discount_percent <= 100)
      .sort((a, b) => a.min_months - b.min_months);

    const now = Date.now();
    const id = await ctx.db.insert("subscription_packages", {
      name: args.name.trim(),
      slug: args.slug.trim(),
      description: args.description?.trim(),
      is_active: true,
      display_order: args.display_order,
      features: args.features || {},
      monthly_price: args.monthly_price,
      annual_price: args.annual_price,
      currency: args.currency || "PHP",
      term_discounts: termDiscounts,
      created_by: args.created_by,
      created_at: now,
      updated_at: now,
    });

    await logAudit(ctx, {
      user_id: args.created_by as string,
      user_name: actor.name,
      user_role: actor.role,
      category: "settings",
      action: "subscription_package.created",
      description: `Created subscription package "${args.name}"`,
      target_type: "subscription_package",
      target_id: id,
      metadata: { slug: args.slug, features: args.features },
    });

    return { package_id: id };
  },
});

export const updatePackage = mutation({
  args: {
    package_id: v.id("subscription_packages"),
    updated_by: v.id("users"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    features: v.optional(v.any()),
    monthly_price: v.optional(v.number()),
    annual_price: v.optional(v.number()),
    currency: v.optional(v.string()),
    display_order: v.optional(v.number()),
    is_active: v.optional(v.boolean()),
    term_discounts: v.optional(termDiscountValidator),
  },
  handler: async (ctx, args) => {
    const actor = await requireITAdmin(ctx, args.updated_by as any);

    const pkg = await ctx.db.get(args.package_id);
    if (!pkg) throw new Error("Package not found.");

    const patch: Record<string, any> = { updated_at: Date.now() };
    if (args.name !== undefined) patch.name = args.name.trim();
    if (args.description !== undefined) patch.description = args.description?.trim();
    if (args.features !== undefined) patch.features = args.features;
    if (args.monthly_price !== undefined) patch.monthly_price = args.monthly_price;
    if (args.annual_price !== undefined) patch.annual_price = args.annual_price;
    if (args.currency !== undefined) patch.currency = args.currency;
    if (args.display_order !== undefined) patch.display_order = args.display_order;
    if (args.is_active !== undefined) patch.is_active = args.is_active;
    if (args.term_discounts !== undefined) {
      patch.term_discounts = args.term_discounts
        .filter((t) => t.min_months > 0 && t.discount_percent >= 0 && t.discount_percent <= 100)
        .sort((a, b) => a.min_months - b.min_months);
    }

    await ctx.db.patch(args.package_id, patch);

    await logAudit(ctx, {
      user_id: args.updated_by as string,
      user_name: actor.name,
      user_role: actor.role,
      category: "settings",
      action: "subscription_package.updated",
      description: `Updated subscription package "${pkg.name}"`,
      target_type: "subscription_package",
      target_id: args.package_id,
      metadata: { changes: patch },
    });

    return { success: true };
  },
});

export const archivePackage = mutation({
  args: {
    package_id: v.id("subscription_packages"),
    updated_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const actor = await requireITAdmin(ctx, args.updated_by as any);
    const pkg = await ctx.db.get(args.package_id);
    if (!pkg) throw new Error("Package not found.");

    // Check if any subscriptions still reference this package
    const inUse = await ctx.db
      .query("subscriptions")
      .withIndex("by_package", (q) => q.eq("package_id", args.package_id))
      .first();
    if (inUse) {
      throw new Error(
        "This package is still assigned to one or more branches. Reassign them before archiving."
      );
    }

    await ctx.db.patch(args.package_id, {
      is_active: false,
      updated_at: Date.now(),
    });

    await logAudit(ctx, {
      user_id: args.updated_by as string,
      user_name: actor.name,
      user_role: actor.role,
      category: "settings",
      action: "subscription_package.archived",
      description: `Archived subscription package "${pkg.name}"`,
      target_type: "subscription_package",
      target_id: args.package_id,
    });

    return { success: true };
  },
});
