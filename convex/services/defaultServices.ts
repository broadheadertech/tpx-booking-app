import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// ============================================================================
// DEFAULT SERVICES MANAGEMENT
// ============================================================================
// Template services managed by Super Admin.
// Copied to new branches on creation.
// ============================================================================

// Get all default services
export const getAllDefaultServices = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("defaultServices").collect();
  },
});

// Create a default service template
export const createDefaultService = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    price: v.number(),
    duration_minutes: v.number(),
    category: v.string(),
    is_active: v.boolean(),
    hide_price: v.optional(v.boolean()),
    sort_order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("defaultServices", {
      name: args.name,
      description: args.description,
      price: args.price,
      duration_minutes: args.duration_minutes,
      category: args.category,
      is_active: args.is_active,
      hide_price: args.hide_price,
      sort_order: args.sort_order,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update a default service template
export const updateDefaultService = mutation({
  args: {
    id: v.id("defaultServices"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    duration_minutes: v.optional(v.number()),
    category: v.optional(v.string()),
    is_active: v.optional(v.boolean()),
    hide_price: v.optional(v.boolean()),
    sort_order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Default service not found");

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Delete a default service template
export const deleteDefaultService = mutation({
  args: { id: v.id("defaultServices") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Default service not found");
    await ctx.db.delete(args.id);
  },
});

// Copy default services into a specific branch's services table
export const copyDefaultsToBranch = mutation({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    const branch = await ctx.db.get(args.branch_id);
    if (!branch) throw new Error("Branch not found");

    const defaults = await ctx.db
      .query("defaultServices")
      .withIndex("by_active", (q) => q.eq("is_active", true))
      .collect();

    if (defaults.length === 0) {
      return { success: false, count: 0, message: "No default services configured" };
    }

    const now = Date.now();
    for (const template of defaults) {
      await ctx.db.insert("services", {
        name: template.name,
        description: template.description,
        price: template.price,
        duration_minutes: template.duration_minutes,
        category: template.category,
        branch_id: args.branch_id,
        is_active: true,
        hide_price: template.hide_price,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true, count: defaults.length, message: `Loaded ${defaults.length} default services` };
  },
});

// Seed default services from the hardcoded list (one-time migration)
export const seedDefaultServices = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db.query("defaultServices").first();
    if (existing) {
      return { success: false, message: "Default services already exist" };
    }

    const now = Date.now();

    const defaults = [
      { name: "Tipuno X Classico", description: "Consultation, Haircut", duration_minutes: 30, price: 150, category: "haircut" },
      { name: "Tipuno X Signature", description: "Consultation, Haircut, Rinse Hot and Cold Towel Finish", duration_minutes: 60, price: 500, category: "haircut" },
      { name: "Tipuno X Deluxe", description: "Consultation, Haircut, Hair Spa Treatment, Rinse Hot and Cold Towel Finish", duration_minutes: 90, price: 800, category: "premium-package" },
      { name: "Beard Shave/Shaping/Sculpting", description: "More than a shave. It's a service you'll feel.", duration_minutes: 30, price: 200, category: "beard-care" },
      { name: "FACVNDO ELITE BARBERING SERVICE", description: "If you are looking for wedding haircuts, trust the elite hands that turn grooms into legends.", duration_minutes: 0, price: 10000, category: "premium-package" },
      { name: "Package 1", description: "Consultation, Haircut, Shaving, Styling", duration_minutes: 45, price: 500, category: "premium-package" },
      { name: "Package 2", description: "Consultation, Haircut, Hair Color or With Single Bleach, Rinse, Styling.\nNote: Short hair only, add 250 per length", duration_minutes: 60, price: 850, category: "premium-package" },
      { name: "Package 3", description: "Consultation, Haircut, Hair Color or With Single Bleach, Hair Spa Treatment, Rinse, Styling.\nNote: Short hair only, add 250 per length", duration_minutes: 60, price: 1400, category: "premium-package" },
      { name: "Mustache/Beard Trim", description: "No Description with this product yet.", duration_minutes: 30, price: 170, category: "beard-care" },
      { name: "Hair Spa", description: "No description for this service yet.", duration_minutes: 30, price: 600, category: "hair-treatment" },
      { name: "Hair and Scalp Treatment", description: "No description for this product yet.", duration_minutes: 60, price: 1500, category: "hair-treatment" },
      { name: "Hair Color", description: "No description for this product yet.", duration_minutes: 60, price: 800, category: "hair-styling" },
      { name: "Perm", description: "No description for this product yet.", duration_minutes: 60, price: 1500, category: "hair-styling" },
      { name: "Hair Tattoo", description: "No description for this product yet.", duration_minutes: 60, price: 100, category: "hair-styling" },
    ];

    for (let i = 0; i < defaults.length; i++) {
      await ctx.db.insert("defaultServices", {
        ...defaults[i],
        is_active: true,
        sort_order: i,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true, message: `Seeded ${defaults.length} default services` };
  },
});
