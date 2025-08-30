import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { throwUserError, ERROR_CODES, validateInput } from "../utils/errors";

// Get all services
export const getAllServices = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("services").collect();
  },
});

// Get active services
export const getActiveServices = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("services")
      .withIndex("by_active", (q) => q.eq("is_active", true))
      .collect();
  },
});

// Get service by ID
export const getServiceById = query({
  args: { id: v.id("services") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get services by category
export const getServicesByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("services")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();
  },
});

// Create new service
export const createService = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    price: v.number(),
    duration_minutes: v.number(),
    category: v.string(),
    is_active: v.boolean(),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const serviceId = await ctx.db.insert("services", {
      name: args.name,
      description: args.description,
      price: args.price,
      duration_minutes: args.duration_minutes,
      category: args.category,
      is_active: args.is_active,
      image: args.image || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return serviceId;
  },
});

// Update service
export const updateService = mutation({
  args: {
    id: v.id("services"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    duration_minutes: v.optional(v.number()),
    category: v.optional(v.string()),
    is_active: v.optional(v.boolean()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return id;
  },
});

// Delete service
export const deleteService = mutation({
  args: { id: v.id("services") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// Get service categories
export const getServiceCategories = query({
  args: {},
  handler: async (ctx) => {
    const services = await ctx.db.query("services").collect();

    // Extract unique categories
    const categories = [...new Set(services.map(service => service.category))];
    return categories.sort();
  },
});
