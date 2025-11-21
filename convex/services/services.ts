import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { throwUserError, ERROR_CODES, validateInput } from "../utils/errors";

// Get all services (for super admin)
export const getAllServices = query({
  args: {},
  handler: async (ctx) => {
    const services = await ctx.db.query("services").collect();
    
    // Get branch information for each service
    const servicesWithBranch = await Promise.all(
      services.map(async (service) => {
        const branch = await ctx.db.get(service.branch_id);
        return {
          ...service,
          branch_name: branch?.name || 'Unknown Branch',
        };
      })
    );
    
    return servicesWithBranch;
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
    
    return services.filter(service => service.is_active);
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
    if (args.price < 0) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Invalid price", "Price cannot be negative.");
    }
    if (args.duration_minutes <= 0) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Invalid duration", "Duration must be greater than 0 minutes.");
    }
    if (!args.name.trim()) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Invalid name", "Service name cannot be empty.");
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
      throwUserError(ERROR_CODES.RESOURCE_NOT_FOUND, "Service not found", "The service you are trying to update does not exist.");
    }

    // Validate updates if provided
    if (updates.price !== undefined && updates.price < 0) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Invalid price", "Price cannot be negative.");
    }
    if (updates.duration_minutes !== undefined && updates.duration_minutes <= 0) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Invalid duration", "Duration must be greater than 0 minutes.");
    }
    if (updates.name !== undefined && !updates.name.trim()) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Invalid name", "Service name cannot be empty.");
    }

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
    const service = await ctx.db.get(args.id);
    if (!service) {
      throwUserError(ERROR_CODES.RESOURCE_NOT_FOUND, "Service not found", "The service you are trying to delete does not exist.");
    }
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// Bulk insert services from CSV data (deprecated - use bulkInsertServicesForBranch instead)
export const bulkInsertServices = mutation({
  args: {
    branch_id: v.id("branches"),
    services: v.array(v.object({
      name: v.string(),
      description: v.string(),
      duration_minutes: v.number(),
      price: v.number(),
    }))
  },
  handler: async (ctx, args) => {
    const insertedServices: string[] = [];

    for (const service of args.services) {
      // Determine category based on service name/description
      let category = "haircut"; // default category

      const serviceName = service.name.toLowerCase();
      const serviceDesc = service.description.toLowerCase();

      if (serviceName.includes("beard") || serviceName.includes("mustache") || serviceDesc.includes("shav")) {
        category = "beard-care";
      } else if (serviceName.includes("hair spa") || serviceName.includes("treatment") || serviceName.includes("scalp")) {
        category = "hair-treatment";
      } else if (serviceName.includes("color") || serviceName.includes("perm") || serviceName.includes("tattoo")) {
        category = "hair-styling";
      } else if (serviceName.includes("package") || serviceName.includes("elite") || serviceName.includes("deluxe")) {
        category = "premium-package";
      }

      const serviceId = await ctx.db.insert("services", {
        name: service.name,
        description: service.description,
        price: service.price,
        duration_minutes: service.duration_minutes,
        category: category,
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
      serviceIds: insertedServices
    };
  },
});

// Bulk insert services for a specific branch
export const bulkInsertServicesForBranch = mutation({
  args: {
    branch_id: v.id("branches"),
    services: v.array(v.object({
      name: v.string(),
      description: v.string(),
      duration_minutes: v.number(),
      price: v.number(),
    }))
  },
  handler: async (ctx, args) => {
    const insertedServices: string[] = [];

    for (const service of args.services) {
      // Determine category based on service name/description
      let category = "haircut"; // default category

      const serviceName = service.name.toLowerCase();
      const serviceDesc = service.description.toLowerCase();

      if (serviceName.includes("beard") || serviceName.includes("mustache") || serviceDesc.includes("shav")) {
        category = "beard-care";
      } else if (serviceName.includes("hair spa") || serviceName.includes("treatment") || serviceName.includes("scalp")) {
        category = "hair-treatment";
      } else if (serviceName.includes("color") || serviceName.includes("perm") || serviceName.includes("tattoo")) {
        category = "hair-styling";
      } else if (serviceName.includes("package") || serviceName.includes("elite") || serviceName.includes("deluxe")) {
        category = "premium-package";
      }

      const serviceId = await ctx.db.insert("services", {
        name: service.name,
        description: service.description,
        price: service.price,
        duration_minutes: service.duration_minutes,
        category: category,
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
      serviceIds: insertedServices
    };
  },
});

// Insert default services for new branch
export const insertDefaultServicesForBranch = mutation({
  args: {
    branch_id: v.id("branches")
  },
  handler: async (ctx, args) => {
    const defaultServices = [
      {
        name: "Tipuno X Classico",
        description: "Consultation, Haircut",
        duration_minutes: 30,
        price: 150.00
      },
      {
        name: "Tipuno X Signature",
        description: "Consultation, Haircut, Rinse Hot and Cold Towel Finish",
        duration_minutes: 60,
        price: 500.00
      },
      {
        name: "Tipuno X Deluxe",
        description: "Consultation, Haircut, Hair Spa Treatment, Rinse Hot and Cold Towel Finish",
        duration_minutes: 90,
        price: 800.00
      },
      {
        name: "Beard Shave/Shaping/Sculpting",
        description: "More than a shave. It's a service you'll feel.",
        duration_minutes: 30,
        price: 200.00
      },
      {
        name: "FACVNDO ELITE BARBERING SERVICE",
        description: "If you are looking for wedding haircuts, trust the elite hands that turn grooms into legends.",
        duration_minutes: 0,
        price: 10000.00
      },
      {
        name: "Package 1",
        description: "Consultation, Haircut, Shaving, Styling",
        duration_minutes: 45,
        price: 500.00
      },
      {
        name: "Package 2",
        description: "Consultation, Haircut, Hair Color or With Single Bleach, Rinse, Styling.\nNote: Short hair only, add 250 per length",
        duration_minutes: 60,
        price: 850.00
      },
      {
        name: "Package 3",
        description: "Consultation, Haircut, Hair Color or With Single Bleach, Hair Spa Treatment, Rinse, Styling.\nNote: Short hair only, add 250 per length",
        duration_minutes: 60,
        price: 1400.00
      },
      {
        name: "Mustache/Beard Trim",
        description: "No Description with this product yet.",
        duration_minutes: 30,
        price: 170.00
      },
      {
        name: "Hair Spa",
        description: "No description for this service yet.",
        duration_minutes: 30,
        price: 600.00
      },
      {
        name: "Hair and Scalp Treatment",
        description: "No description for this product yet.",
        duration_minutes: 60,
        price: 1500.00
      },
      {
        name: "Hair Color",
        description: "No description for this product yet.",
        duration_minutes: 60,
        price: 800.00
      },
      {
        name: "Perm",
        description: "No description for this product yet.",
        duration_minutes: 60,
        price: 1500.00
      },
      {
        name: "Hair Tattoo",
        description: "No description for this product yet.",
        duration_minutes: 60,
        price: 100.00
      }
    ];

    const insertedServices: string[] = [];

    for (const service of defaultServices) {
      // Determine category based on service name/description
      let category = "haircut"; // default category

      const serviceName = service.name.toLowerCase();
      const serviceDesc = service.description.toLowerCase();

      if (serviceName.includes("beard") || serviceName.includes("mustache") || serviceDesc.includes("shav")) {
        category = "beard-care";
      } else if (serviceName.includes("hair spa") || serviceName.includes("treatment") || serviceName.includes("scalp")) {
        category = "hair-treatment";
      } else if (serviceName.includes("color") || serviceName.includes("perm") || serviceName.includes("tattoo")) {
        category = "hair-styling";
      } else if (serviceName.includes("package") || serviceName.includes("elite") || serviceName.includes("deluxe")) {
        category = "premium-package";
      }

      const serviceId = await ctx.db.insert("services", {
        name: service.name,
        description: service.description,
        price: service.price,
        duration_minutes: service.duration_minutes,
        category: category,
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
      serviceIds: insertedServices
    };
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
