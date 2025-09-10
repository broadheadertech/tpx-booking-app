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