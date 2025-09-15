import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";

// Generate a unique branch code
function generateBranchCode(name: string): string {
  const prefix = name.substring(0, 3).toUpperCase();
  const timestamp = Date.now().toString().slice(-4);
  return `${prefix}${timestamp}`;
}

// Queries
export const getAllBranches = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("branches").order("desc").collect();
  },
});

export const getActiveBranches = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("branches")
      .filter((q) => q.eq(q.field("is_active"), true))
      .order("desc")
      .collect();
  },
});

export const getBranchById = query({
  args: { id: v.id("branches") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getBranchByCode = query({
  args: { branch_code: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("branches")
      .withIndex("by_branch_code", (q) => q.eq("branch_code", args.branch_code))
      .first();
  },
});

// Get branch statistics
export const getBranchStats = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    const [bookings, transactions, barbers, users] = await Promise.all([
      ctx.db
        .query("bookings")
        .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
        .collect(),
      ctx.db
        .query("transactions")
        .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
        .collect(),
      ctx.db
        .query("barbers")
        .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
        .collect(),
      ctx.db
        .query("users")
        .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
        .collect(),
    ]);

    const totalRevenue = transactions
      .filter((t) => t.payment_status === "completed")
      .reduce((sum, t) => sum + t.total_amount, 0);

    const completedBookings = bookings.filter((b) => b.status === "completed").length;

    return {
      totalBookings: bookings.length,
      completedBookings,
      totalRevenue,
      totalBarbers: barbers.length,
      totalStaff: users.filter((u) => u.role === "staff" || u.role === "branch_admin").length,
      totalCustomers: users.filter((u) => u.role === "customer").length,
    };
  },
});

// Mutations
export const createBranch = mutation({
  args: {
    name: v.string(),
    address: v.string(),
    phone: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const branch_code = generateBranchCode(args.name);

    // Check if branch code already exists
    const existingBranch = await ctx.db
      .query("branches")
      .withIndex("by_branch_code", (q) => q.eq("branch_code", branch_code))
      .first();

    if (existingBranch) {
      throw new Error("Branch code already exists. Please try again.");
    }

    const branchId = await ctx.db.insert("branches", {
      branch_code,
      name: args.name,
      address: args.address,
      phone: args.phone,
      email: args.email,
      is_active: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Automatically insert default services for the new branch
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

    // Insert default services for the new branch
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

      await ctx.db.insert("services", {
        name: service.name,
        description: service.description,
        price: service.price,
        duration_minutes: service.duration_minutes,
        category: category,
        branch_id: branchId,
        is_active: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return branchId;
  },
});

export const updateBranch = mutation({
  args: {
    id: v.id("branches"),
    name: v.optional(v.string()),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    is_active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    const updateData: Partial<Doc<"branches">> = {
      ...updates,
      updatedAt: Date.now(),
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => 
      updateData[key as keyof typeof updateData] === undefined && delete updateData[key as keyof typeof updateData]
    );

    await ctx.db.patch(id, updateData);
    return id;
  },
});

export const deleteBranch = mutation({
  args: { id: v.id("branches") },
  handler: async (ctx, args) => {
    // Check if branch has any associated data
    const [users, barbers, services, bookings, transactions] = await Promise.all([
      ctx.db
        .query("users")
        .withIndex("by_branch", (q) => q.eq("branch_id", args.id))
        .collect(),
      ctx.db
        .query("barbers")
        .withIndex("by_branch", (q) => q.eq("branch_id", args.id))
        .collect(),
      ctx.db
        .query("services")
        .withIndex("by_branch", (q) => q.eq("branch_id", args.id))
        .collect(),
      ctx.db
        .query("bookings")
        .withIndex("by_branch", (q) => q.eq("branch_id", args.id))
        .collect(),
      ctx.db
        .query("transactions")
        .withIndex("by_branch", (q) => q.eq("branch_id", args.id))
        .collect(),
    ]);

    if (users.length > 0 || barbers.length > 0 || services.length > 0 || 
        bookings.length > 0 || transactions.length > 0) {
      throw new Error("Cannot delete branch with associated data. Please transfer or remove all users, barbers, services, bookings, and transactions first.");
    }

    await ctx.db.delete(args.id);
    return args.id;
  },
});

export const toggleBranchStatus = mutation({
  args: { id: v.id("branches") },
  handler: async (ctx, args) => {
    const branch = await ctx.db.get(args.id);
    if (!branch) {
      throw new Error("Branch not found");
    }

    await ctx.db.patch(args.id, {
      is_active: !branch.is_active,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});