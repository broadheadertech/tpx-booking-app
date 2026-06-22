/**
 * Configurable service categories (super-admin / IT-admin managed).
 *
 * Replaces the old hard-coded VALID_CATEGORIES list. Services validate their
 * `category` against the active rows here. Validation is intentionally lenient:
 * if no categories are configured yet, anything is allowed (so nothing breaks
 * before the list is seeded), and a service may always keep its current
 * category even if it's later removed from the list.
 *
 * @module convex/services/serviceCategories
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

const ADMIN_ROLES = new Set(["super_admin", "it_admin"]);

async function requireAdmin(ctx: any, userId: any) {
  const u = await ctx.db.get(userId);
  if (!u || !ADMIN_ROLES.has(u.role)) {
    throw new Error("Only a super admin or IT admin can manage service categories.");
  }
  return u;
}

export const listServiceCategories = query({
  args: { include_inactive: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    let rows = await ctx.db.query("service_categories").collect();
    if (!args.include_inactive) rows = rows.filter((r) => r.is_active);
    return rows.sort(
      (a, b) =>
        (a.display_order ?? 1e15) - (b.display_order ?? 1e15) ||
        a.name.localeCompare(b.name)
    );
  },
});

export const addServiceCategory = mutation({
  args: { name: v.string(), actor_id: v.id("users") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.actor_id);
    const name = args.name.trim();
    if (!name) throw new Error("Category name is required.");

    const existing = await ctx.db
      .query("service_categories")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();
    if (existing) {
      // Re-activate if it was deactivated; treat as idempotent otherwise.
      if (!existing.is_active) {
        await ctx.db.patch(existing._id, { is_active: true, updated_at: Date.now() });
      }
      return { id: existing._id, reactivated: !existing.is_active };
    }

    const now = Date.now();
    const id = await ctx.db.insert("service_categories", {
      name,
      is_active: true,
      display_order: now,
      created_at: now,
      updated_at: now,
    });
    return { id };
  },
});

export const setServiceCategoryActive = mutation({
  args: { id: v.id("service_categories"), is_active: v.boolean(), actor_id: v.id("users") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.actor_id);
    await ctx.db.patch(args.id, { is_active: args.is_active, updated_at: Date.now() });
    return { success: true };
  },
});

export const removeServiceCategory = mutation({
  args: { id: v.id("service_categories"), actor_id: v.id("users") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.actor_id);
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

/**
 * Seed the category list from categories already used by existing services.
 * Idempotent and safe — only adds names that don't already exist. Public so it
 * can be run once via `npx convex run` (no auth context needed).
 */
export const seedServiceCategoriesFromServices = mutation({
  args: {},
  handler: async (ctx) => {
    const services = await ctx.db.query("services").collect();
    const names = new Set<string>();
    for (const s of services) {
      if (s.category && s.category.trim()) names.add(s.category.trim());
    }
    const existing = await ctx.db.query("service_categories").collect();
    const have = new Set(existing.map((r) => r.name));

    let created = 0;
    const now = Date.now();
    for (const name of names) {
      if (have.has(name)) continue;
      await ctx.db.insert("service_categories", {
        name,
        is_active: true,
        display_order: now + created,
        created_at: now,
        updated_at: now,
      });
      created++;
    }
    return { created, distinct_in_services: names.size };
  },
});
