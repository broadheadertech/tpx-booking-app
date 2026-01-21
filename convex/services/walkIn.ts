import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { throwUserError, ERROR_CODES, validateInput } from "../utils/errors";
import type { Id } from "../_generated/dataModel";

// Create a new walk-in customer
export const createWalkIn = mutation({
  args: {
    name: v.string(),
    number: v.string(),
    assignedBarber: v.string(),
    notes: v.optional(v.string()),
    branch_id: v.optional(v.id("branches")),
  },
  handler: async (ctx, args) => {
    // Validate input
    validateInput(!args.name.trim(), ERROR_CODES.INVALID_INPUT, "Customer name is required");
    validateInput(!args.number.trim(), ERROR_CODES.INVALID_INPUT, "Phone number is required");
    validateInput(!args.assignedBarber, ERROR_CODES.INVALID_INPUT, "Assigned barber is required");

    const now = Date.now();

    // Find the barber by name to get their ID
    const barber = await ctx.db
      .query("barbers")
      .filter((q) => q.eq(q.field("full_name"), args.assignedBarber))
      .first();

    if (!barber) {
      throwUserError(ERROR_CODES.NOT_FOUND, "Barber not found");
    }

    // Create the walk-in record
    const walkInId = await ctx.db.insert("walkIns", {
      name: args.name.trim(),
      number: args.number.trim(),
      assignedBarber: args.assignedBarber,
      barberId: barber._id,
      notes: args.notes?.trim() || "",
      branch_id: args.branch_id || barber.branch_id,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      walkInId,
      message: "Walk-in customer added successfully",
    };
  },
});

// Get all walk-ins with optional filtering
export const getAllWalkIns = query({
  args: {
    branch_id: v.optional(v.id("branches")),
    limit: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;

    let query = ctx.db.query("walkIns");

    // Filter by branch if provided
    if (args.branch_id) {
      query = query.filter((q) => q.eq(q.field("branch_id"), args.branch_id));
    }

    // Filter by status if provided
    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }

    const walkIns = await query.order("desc").take(limit);

    // Enhance walk-ins with barber details
    const walkInsWithDetails = await Promise.all(
      walkIns.map(async (walkIn) => {
        try {
          const [barber, branch] = await Promise.all([
            walkIn.barberId ? ctx.db.get(walkIn.barberId) : null,
            walkIn.branch_id ? ctx.db.get(walkIn.branch_id) : null,
          ]);

          return {
            ...walkIn,
            barber_name: barber?.full_name || walkIn.assignedBarber,
            barber_phone: barber?.phone || "",
            barber_email: barber?.email || "",
            branch_name: branch?.name || "Unknown Branch",
          };
        } catch (error) {
          return {
            ...walkIn,
            barber_name: walkIn.assignedBarber,
            barber_phone: "",
            barber_email: "",
            branch_name: "Unknown Branch",
          };
        }
      })
    );

    return walkInsWithDetails;
  },
});

// Get walk-ins for today
export const getTodayWalkIns = query({
  args: {
    branch_id: v.optional(v.id("branches")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartTimestamp = todayStart.getTime();

    let query = ctx.db.query("walkIns");

    // Filter by branch if provided
    if (args.branch_id) {
      query = query.filter((q) => q.eq(q.field("branch_id"), args.branch_id));
    }

    const allWalkIns = await query.order("desc").collect();

    // Filter for today
    const todayWalkIns = allWalkIns.filter(
      (walkIn) => walkIn.createdAt >= todayStartTimestamp
    );

    // Enhance with barber details
    const walkInsWithDetails = await Promise.all(
      todayWalkIns.map(async (walkIn) => {
        try {
          const barber = walkIn.barberId ? await ctx.db.get(walkIn.barberId) : null;
          return {
            ...walkIn,
            barber_name: barber?.full_name || walkIn.assignedBarber,
          };
        } catch (error) {
          return {
            ...walkIn,
            barber_name: walkIn.assignedBarber,
          };
        }
      })
    );

    return walkInsWithDetails;
  },
});

// Get a single walk-in by ID
export const getWalkInById = query({
  args: {
    walkInId: v.id("walkIns"),
  },
  handler: async (ctx, args) => {
    const walkIn = await ctx.db.get(args.walkInId);

    if (!walkIn) {
      throwUserError(ERROR_CODES.NOT_FOUND, "Walk-in not found");
    }

    // Get barber and branch details
    const [barber, branch] = await Promise.all([
      walkIn.barberId ? ctx.db.get(walkIn.barberId) : null,
      walkIn.branch_id ? ctx.db.get(walkIn.branch_id) : null,
    ]);

    return {
      ...walkIn,
      barber_name: barber?.full_name || walkIn.assignedBarber,
      barber_phone: barber?.phone || "",
      barber_email: barber?.email || "",
      branch_name: branch?.name || "Unknown Branch",
    };
  },
});

// Update a walk-in
export const updateWalkIn = mutation({
  args: {
    walkInId: v.id("walkIns"),
    name: v.optional(v.string()),
    number: v.optional(v.string()),
    assignedBarber: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const walkIn = await ctx.db.get(args.walkInId);

    if (!walkIn) {
      throwUserError(ERROR_CODES.NOT_FOUND, "Walk-in not found");
    }

    const updates: Partial<{
      name: string;
      number: string;
      assignedBarber: string;
      barberId: Id<"barbers">;
      notes: string;
      status: string;
      updatedAt: number;
    }> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) {
      validateInput(!args.name.trim(), ERROR_CODES.INVALID_INPUT, "Customer name cannot be empty");
      updates.name = args.name.trim();
    }

    if (args.number !== undefined) {
      validateInput(!args.number.trim(), ERROR_CODES.INVALID_INPUT, "Phone number cannot be empty");
      updates.number = args.number.trim();
    }

    if (args.assignedBarber !== undefined) {
      validateInput(!args.assignedBarber, ERROR_CODES.INVALID_INPUT, "Assigned barber cannot be empty");
      
      // Find the new barber
      const barber = await ctx.db
        .query("barbers")
        .filter((q) => q.eq(q.field("full_name"), args.assignedBarber))
        .first();

      if (!barber) {
        throwUserError(ERROR_CODES.NOT_FOUND, "Barber not found");
      }

      updates.assignedBarber = args.assignedBarber;
      updates.barberId = barber._id;
    }

    if (args.notes !== undefined) {
      updates.notes = args.notes.trim();
    }

    if (args.status !== undefined) {
      updates.status = args.status;
    }

    await ctx.db.patch(args.walkInId, updates);

    return {
      success: true,
      message: "Walk-in updated successfully",
    };
  },
});

// Delete a walk-in
export const deleteWalkIn = mutation({
  args: {
    walkInId: v.id("walkIns"),
  },
  handler: async (ctx, args) => {
    const walkIn = await ctx.db.get(args.walkInId);

    if (!walkIn) {
      throwUserError(ERROR_CODES.NOT_FOUND, "Walk-in not found");
    }

    await ctx.db.delete(args.walkInId);

    return {
      success: true,
      message: "Walk-in deleted successfully",
    };
  },
});

// Mark walk-in as completed
export const completeWalkIn = mutation({
  args: {
    walkInId: v.id("walkIns"),
  },
  handler: async (ctx, args) => {
    const walkIn = await ctx.db.get(args.walkInId);

    if (!walkIn) {
      throwUserError(ERROR_CODES.NOT_FOUND, "Walk-in not found");
    }

    await ctx.db.patch(args.walkInId, {
      status: "completed",
      completedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: "Walk-in marked as completed",
    };
  },
});

// Get walk-in statistics
export const getWalkInStats = query({
  args: {
    branch_id: v.optional(v.id("branches")),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("walkIns");

    if (args.branch_id) {
      query = query.filter((q) => q.eq(q.field("branch_id"), args.branch_id));
    }

    const allWalkIns = await query.collect();

    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartTimestamp = todayStart.getTime();

    const thisWeekStart = new Date();
    thisWeekStart.setDate(thisWeekStart.getDate() - 7);
    const weekStartTimestamp = thisWeekStart.getTime();

    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);
    const monthStartTimestamp = thisMonthStart.getTime();

    return {
      total: allWalkIns.length,
      today: allWalkIns.filter((w) => w.createdAt >= todayStartTimestamp).length,
      thisWeek: allWalkIns.filter((w) => w.createdAt >= weekStartTimestamp).length,
      thisMonth: allWalkIns.filter((w) => w.createdAt >= monthStartTimestamp).length,
      active: allWalkIns.filter((w) => w.status === "active").length,
      completed: allWalkIns.filter((w) => w.status === "completed").length,
    };
  },
});
