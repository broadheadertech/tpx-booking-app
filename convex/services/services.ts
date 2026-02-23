import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { throwUserError, ERROR_CODES } from "../utils/errors";

// Valid service categories
const VALID_CATEGORIES = [
  "haircut",
  "beard-care",
  "hair-treatment",
  "hair-styling",
  "premium-package",
];

// Determine category from service name/description
function inferCategory(name: string, description: string): string {
  const n = name.toLowerCase();
  const d = description.toLowerCase();

  if (n.includes("beard") || n.includes("mustache") || d.includes("shav")) {
    return "beard-care";
  }
  if (n.includes("hair spa") || n.includes("treatment") || n.includes("scalp")) {
    return "hair-treatment";
  }
  if (n.includes("color") || n.includes("perm") || n.includes("tattoo")) {
    return "hair-styling";
  }
  if (n.includes("package") || n.includes("elite") || n.includes("deluxe")) {
    return "premium-package";
  }
  return "haircut";
}

// Get all services (for super admin)
export const getAllServices = query({
  args: {},
  handler: async (ctx) => {
    const services = await ctx.db.query("services").collect();

    // Batch-load unique branches to avoid N+1
    const branchIds = [...new Set(services.map((s) => s.branch_id))];
    const branchMap = new Map<string, string>();
    for (const bid of branchIds) {
      const branch = await ctx.db.get(bid);
      branchMap.set(bid as string, branch?.name || "Unknown Branch");
    }

    return services.map((service) => ({
      ...service,
      branch_name: branchMap.get(service.branch_id as string) || "Unknown Branch",
    }));
  },
});

// Get services by branch
export const getServicesByBranch = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("services")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();
  },
});

// Get active services by branch
export const getActiveServicesByBranch = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    const services = await ctx.db
      .query("services")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    return services.filter((service) => service.is_active);
  },
});

// Get active services (legacy - for backward compatibility)
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
    branch_id: v.id("branches"),
    is_active: v.boolean(),
    image: v.optional(v.string()),
    hide_price: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (!args.name.trim()) {
      throwUserError(
        ERROR_CODES.INVALID_INPUT,
        "Invalid name",
        "Service name cannot be empty."
      );
    }
    if (!args.description.trim()) {
      throwUserError(
        ERROR_CODES.INVALID_INPUT,
        "Invalid description",
        "Service description cannot be empty."
      );
    }
    if (args.price < 0) {
      throwUserError(
        ERROR_CODES.INVALID_INPUT,
        "Invalid price",
        "Price cannot be negative."
      );
    }
    if (args.duration_minutes <= 0) {
      throwUserError(
        ERROR_CODES.INVALID_INPUT,
        "Invalid duration",
        "Duration must be greater than 0 minutes."
      );
    }
    if (!VALID_CATEGORIES.includes(args.category)) {
      throwUserError(
        ERROR_CODES.INVALID_INPUT,
        "Invalid category",
        `Category must be one of: ${VALID_CATEGORIES.join(", ")}.`
      );
    }

    // Verify branch exists
    const branch = await ctx.db.get(args.branch_id);
    if (!branch) {
      throwUserError(
        ERROR_CODES.RESOURCE_NOT_FOUND,
        "Branch not found",
        "The specified branch does not exist."
      );
    }

    const serviceId = await ctx.db.insert("services", {
      name: args.name,
      description: args.description,
      price: args.price,
      duration_minutes: args.duration_minutes,
      category: args.category,
      branch_id: args.branch_id,
      is_active: args.is_active,
      image: args.image || undefined,
      hide_price: args.hide_price,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return serviceId;
  },
});

// Update service
export const updateService = mutation({
  args: {
    branch_id: v.optional(v.id("branches")),
    id: v.id("services"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    duration_minutes: v.optional(v.number()),
    category: v.optional(v.string()),
    is_active: v.optional(v.boolean()),
    image: v.optional(v.string()),
    hide_price: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    const service = await ctx.db.get(id);
    if (!service) {
      throwUserError(
        ERROR_CODES.RESOURCE_NOT_FOUND,
        "Service not found",
        "The service you are trying to update does not exist."
      );
    }

    // Validate updates if provided
    if (updates.name !== undefined && !updates.name.trim()) {
      throwUserError(
        ERROR_CODES.INVALID_INPUT,
        "Invalid name",
        "Service name cannot be empty."
      );
    }
    if (updates.description !== undefined && !updates.description.trim()) {
      throwUserError(
        ERROR_CODES.INVALID_INPUT,
        "Invalid description",
        "Service description cannot be empty."
      );
    }
    if (updates.price !== undefined && updates.price < 0) {
      throwUserError(
        ERROR_CODES.INVALID_INPUT,
        "Invalid price",
        "Price cannot be negative."
      );
    }
    if (
      updates.duration_minutes !== undefined &&
      updates.duration_minutes <= 0
    ) {
      throwUserError(
        ERROR_CODES.INVALID_INPUT,
        "Invalid duration",
        "Duration must be greater than 0 minutes."
      );
    }
    if (updates.category !== undefined && !VALID_CATEGORIES.includes(updates.category)) {
      throwUserError(
        ERROR_CODES.INVALID_INPUT,
        "Invalid category",
        `Category must be one of: ${VALID_CATEGORIES.join(", ")}.`
      );
    }

    // Verify branch exists if branch_id is being updated
    if (updates.branch_id !== undefined) {
      const branch = await ctx.db.get(updates.branch_id);
      if (!branch) {
        throwUserError(
          ERROR_CODES.RESOURCE_NOT_FOUND,
          "Branch not found",
          "The specified branch does not exist."
        );
      }
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return id;
  },
});

// Deactivate service (soft delete — preserves booking references)
export const deleteService = mutation({
  args: { id: v.id("services") },
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.id);
    if (!service) {
      throwUserError(
        ERROR_CODES.RESOURCE_NOT_FOUND,
        "Service not found",
        "The service you are trying to delete does not exist."
      );
    }

    await ctx.db.patch(args.id, {
      is_active: false,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Bulk insert services from CSV data (deprecated - use bulkInsertServicesForBranch instead)
export const bulkInsertServices = mutation({
  args: {
    branch_id: v.id("branches"),
    services: v.array(
      v.object({
        name: v.string(),
        description: v.string(),
        duration_minutes: v.number(),
        price: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const branch = await ctx.db.get(args.branch_id);
    if (!branch) {
      throwUserError(ERROR_CODES.RESOURCE_NOT_FOUND, "Branch not found", "The specified branch does not exist.");
    }

    const insertedServices: string[] = [];

    for (const service of args.services) {
      if (!service.name.trim()) continue; // skip empty names
      if (service.duration_minutes <= 0 || service.price < 0) continue; // skip invalid

      const serviceId = await ctx.db.insert("services", {
        name: service.name,
        description: service.description,
        price: service.price,
        duration_minutes: service.duration_minutes,
        category: inferCategory(service.name, service.description),
        branch_id: args.branch_id,
        is_active: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      insertedServices.push(serviceId);
    }

    return {
      success: true,
      insertedCount: insertedServices.length,
      serviceIds: insertedServices,
    };
  },
});

// Bulk insert services for a specific branch
export const bulkInsertServicesForBranch = mutation({
  args: {
    branch_id: v.id("branches"),
    services: v.array(
      v.object({
        name: v.string(),
        description: v.string(),
        duration_minutes: v.number(),
        price: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const branch = await ctx.db.get(args.branch_id);
    if (!branch) {
      throwUserError(ERROR_CODES.RESOURCE_NOT_FOUND, "Branch not found", "The specified branch does not exist.");
    }

    const insertedServices: string[] = [];

    for (const service of args.services) {
      if (!service.name.trim()) continue;
      if (service.duration_minutes <= 0 || service.price < 0) continue;

      const serviceId = await ctx.db.insert("services", {
        name: service.name,
        description: service.description,
        price: service.price,
        duration_minutes: service.duration_minutes,
        category: inferCategory(service.name, service.description),
        branch_id: args.branch_id,
        is_active: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      insertedServices.push(serviceId);
    }

    return {
      success: true,
      insertedCount: insertedServices.length,
      serviceIds: insertedServices,
    };
  },
});

// Insert default services for new branch
export const insertDefaultServicesForBranch = mutation({
  args: {
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const defaultServices = [
      {
        name: "Tipuno X Classico",
        description: "Consultation, Haircut",
        duration_minutes: 30,
        price: 150.0,
      },
      {
        name: "Tipuno X Signature",
        description: "Consultation, Haircut, Rinse Hot and Cold Towel Finish",
        duration_minutes: 60,
        price: 500.0,
      },
      {
        name: "Tipuno X Deluxe",
        description:
          "Consultation, Haircut, Hair Spa Treatment, Rinse Hot and Cold Towel Finish",
        duration_minutes: 90,
        price: 800.0,
      },
      {
        name: "Beard Shave/Shaping/Sculpting",
        description: "More than a shave. It's a service you'll feel.",
        duration_minutes: 30,
        price: 200.0,
      },
      {
        name: "Package 1",
        description: "Consultation, Haircut, Shaving, Styling",
        duration_minutes: 45,
        price: 500.0,
      },
      {
        name: "Package 2",
        description:
          "Consultation, Haircut, Hair Color or With Single Bleach, Rinse, Styling.\nNote: Short hair only, add 250 per length",
        duration_minutes: 60,
        price: 850.0,
      },
      {
        name: "Package 3",
        description:
          "Consultation, Haircut, Hair Color or With Single Bleach, Hair Spa Treatment, Rinse, Styling.\nNote: Short hair only, add 250 per length",
        duration_minutes: 60,
        price: 1400.0,
      },
      {
        name: "Mustache/Beard Trim",
        description: "No Description with this product yet.",
        duration_minutes: 30,
        price: 170.0,
      },
      {
        name: "Hair Spa",
        description: "No description for this service yet.",
        duration_minutes: 30,
        price: 600.0,
      },
      {
        name: "Hair and Scalp Treatment",
        description: "No description for this product yet.",
        duration_minutes: 60,
        price: 1500.0,
      },
      {
        name: "Hair Color",
        description: "No description for this product yet.",
        duration_minutes: 60,
        price: 800.0,
      },
      {
        name: "Perm",
        description: "No description for this product yet.",
        duration_minutes: 60,
        price: 1500.0,
      },
      {
        name: "Hair Tattoo",
        description: "No description for this product yet.",
        duration_minutes: 60,
        price: 100.0,
      },
    ];

    const branch = await ctx.db.get(args.branch_id);
    if (!branch) {
      throwUserError(ERROR_CODES.RESOURCE_NOT_FOUND, "Branch not found", "The specified branch does not exist.");
    }

    const insertedServices: string[] = [];

    for (const service of defaultServices) {
      const serviceId = await ctx.db.insert("services", {
        name: service.name,
        description: service.description,
        price: service.price,
        duration_minutes: service.duration_minutes,
        category: inferCategory(service.name, service.description),
        branch_id: args.branch_id,
        is_active: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      insertedServices.push(serviceId);
    }

    return {
      success: true,
      insertedCount: insertedServices.length,
      serviceIds: insertedServices,
    };
  },
});

// Get service categories
export const getServiceCategories = query({
  args: {},
  handler: async (ctx) => {
    const services = await ctx.db.query("services").collect();

    // Extract unique categories
    const categories = [
      ...new Set(services.map((service) => service.category)),
    ];
    return categories.sort();
  },
});
