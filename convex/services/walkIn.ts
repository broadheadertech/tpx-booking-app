import { v } from "convex/values";
import { mutation, query, internalMutation } from "../_generated/server";
import { throwUserError, ERROR_CODES, validateInput } from "../utils/errors";
import type { Id } from "../_generated/dataModel";

// Create a new walk-in customer
export const createWalkIn = mutation({
  args: {
    name: v.string(),
    number: v.string(),
    barberId: v.id("barbers"),
    service_id: v.optional(v.id("services")),
    scheduled_time: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      console.log("[createWalkIn] Starting with args:", args);

      // Validate input
      console.log("[createWalkIn] Validating inputs...");
      if (!args.name.trim()) {
        return {
          success: false,
          message: "Customer name is required",
        };
      }
      if (!args.number.trim()) {
        return {
          success: false,
          message: "Phone number is required",
        };
      }

      const now = Date.now();
      let barber: any = null;
      let branch_id: Id<"branches"> | undefined = undefined;

      // Get the barber
      console.log("[createWalkIn] Fetching barber by ID:", args.barberId);
      barber = await ctx.db.get(args.barberId);
      console.log("[createWalkIn] Barber fetched:", barber ? "FOUND" : "NOT FOUND");

      if (!barber) {
        console.error("[createWalkIn] Barber not found with ID:", args.barberId);
        return {
          success: false,
          message: `Barber with ID ${args.barberId} does not exist in the database.`,
        };
      }

      // Get branch_id from barber
      branch_id = barber.branch_id;
      console.log("[createWalkIn] Barber branch_id:", branch_id);

      // Validate branch_id before proceeding
      if (!branch_id) {
        console.error("[createWalkIn] Barber has no branch_id:", barber._id);
        return {
          success: false,
          message: "Branch ID is required but not found for this barber.",
        };
      }

      // Verify the branch exists
      console.log("[createWalkIn] Fetching branch with ID:", branch_id);
      const branch = await ctx.db.get(branch_id);
      console.log("[createWalkIn] Branch fetched:", branch ? "FOUND" : "NOT FOUND");

      if (!branch) {
        console.error("[createWalkIn] Branch not found with ID:", branch_id);
        return {
          success: false,
          message: `Branch with ID ${branch_id} does not exist in the database.`,
        };
      }
      console.log("[createWalkIn] All validations passed, branch_id:", branch_id);

      // Get the highest queue number for ALL walk-ins in this branch today (regardless of status)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayStartTimestamp = todayStart.getTime();

      console.log("[createWalkIn] Calculating queue number for branch:", branch_id);

      let nextQueueNumber = 1;

      // Query ALL walk-ins for this branch to get the max queue number today
      // This ensures queue numbers continue incrementing regardless of status
      try {
        console.log("[createWalkIn] Querying all walk-ins for queue calculation...");
        const allWalkInsQuery = await ctx.db.query("walkIns").collect();

        console.log("[createWalkIn] All walk-ins fetched:", allWalkInsQuery?.length || 0);

        // Filter for this branch and today's walk-ins only (all statuses)
        if (Array.isArray(allWalkInsQuery) && allWalkInsQuery.length > 0) {
          const todaysBranchWalkIns = allWalkInsQuery.filter(
            (walkIn) =>
              walkIn.branch_id === branch_id &&
              walkIn.createdAt >= todayStartTimestamp
          );

          console.log("[createWalkIn] Today's walk-ins for this branch (all statuses):", todaysBranchWalkIns.length);

          if (todaysBranchWalkIns.length > 0) {
            const queueNumbers = todaysBranchWalkIns
              .map((w) => w.queueNumber)
              .filter((num) => typeof num === "number" && !isNaN(num));

            if (queueNumbers.length > 0) {
              nextQueueNumber = Math.max(...queueNumbers) + 1;
            }
          }
        }
      } catch (queryError) {
        // If query fails, log the error but proceed with queue number 1
        // This handles the case where the walkIns table might not exist yet or has issues
        console.warn("[createWalkIn] Query failed (this might be the first walk-in):", queryError?.message || queryError);
        console.log("[createWalkIn] Proceeding with default queue number:", nextQueueNumber);
      }

      console.log("[createWalkIn] Final queue number:", nextQueueNumber);

      // Look up service name if service_id provided
      let serviceNote = "";
      if (args.service_id) {
        try {
          const service = await ctx.db.get(args.service_id);
          if (service) {
            serviceNote = `Service: ${service.name}`;
          }
        } catch (e) {
          console.warn("[createWalkIn] Could not look up service:", e);
        }
      }

      // Create the walk-in record - defensive approach
      console.log("Preparing to insert walk-in record...");
      const walkInData = {
        name: args.name.trim(),
        number: args.number.trim(),
        assignedBarber: barber.full_name,
        barberId: barber._id,
        branch_id: branch_id,
        queueNumber: nextQueueNumber,
        service_id: args.service_id,
        scheduled_time: args.scheduled_time,
        notes: args.notes?.trim() || serviceNote || "",
        status: "waiting" as const, // Default to waiting status
        createdAt: now,
        updatedAt: now,
      };
      console.log("Walk-in data prepared:", JSON.stringify(walkInData, null, 2));

      let walkInId;
      try {
        walkInId = await ctx.db.insert("walkIns", walkInData);
        console.log("Walk-in created with ID:", walkInId);
      } catch (insertError) {
        console.error("Error inserting walk-in:", insertError);
        console.error("Insert error details:", {
          name: insertError.name,
          message: insertError.message,
          stack: insertError.stack,
        });
        throw insertError;
      }

      return {
        success: true,
        walkInId,
        queueNumber: nextQueueNumber,
        message: `Walk-in customer added successfully with queue number ${nextQueueNumber}`,
      };
    } catch (error) {
      console.error("Error in createWalkIn mutation:", error);
      console.error("Error stack:", error.stack);
      console.error("Error details:", {
        message: error.message,
        name: error.name,
        cause: error.cause,
      });
      return {
        success: false,
        message: error.message || "Failed to create walk-in",
        errorDetails: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      };
    }
  },
});

// Get all walk-ins with optional filtering including date range
export const getAllWalkIns = query({
  args: {
    branch_id: v.optional(v.id("branches")),
    limit: v.optional(v.number()),
    status: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;

    let allWalkInsQuery: any = [];

    try {
      // Try to get all walk-ins using order and collect
      allWalkInsQuery = await ctx.db.query("walkIns").order("desc").collect();
    } catch (queryError) {
      console.warn("[getAllWalkIns] Query failed, returning empty array:", queryError?.message || queryError);
      return [];
    }

    // Filter by branch if provided
    let allWalkIns = allWalkInsQuery;
    if (args.branch_id) {
      allWalkIns = allWalkInsQuery.filter((w) => w.branch_id === args.branch_id);
    }

    // Filter by status if provided
    if (args.status) {
      allWalkIns = allWalkIns.filter((w) => w.status === args.status);
    }

    // Filter by date range if provided
    let walkIns = allWalkIns;
    if (args.startDate !== undefined || args.endDate !== undefined) {
      walkIns = allWalkIns.filter((walkIn) => {
        if (args.startDate !== undefined && walkIn.createdAt < args.startDate) {
          return false;
        }
        if (args.endDate !== undefined && walkIn.createdAt > args.endDate) {
          return false;
        }
        return true;
      });
    }

    // Apply limit
    walkIns = walkIns.slice(0, limit);

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

    let allWalkInsQuery: any = [];

    try {
      // Try to get all walk-ins
      allWalkInsQuery = await ctx.db.query("walkIns").order("desc").collect();
    } catch (queryError) {
      console.warn("[getTodayWalkIns] Query failed, returning empty array:", queryError?.message || queryError);
      return [];
    }

    // Filter by branch if provided
    let allWalkIns = allWalkInsQuery;
    if (args.branch_id) {
      allWalkIns = allWalkInsQuery.filter((w) => w.branch_id === args.branch_id);
    }

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

// Mark walk-in as active (start serving)
export const startWalkIn = mutation({
  args: {
    walkInId: v.id("walkIns"),
  },
  handler: async (ctx, args) => {
    const walkIn = await ctx.db.get(args.walkInId);

    if (!walkIn) {
      throwUserError(ERROR_CODES.NOT_FOUND, "Walk-in not found");
    }

    if (walkIn.status === "active") {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Walk-in is already active");
    }

    if (walkIn.status === "completed") {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Cannot start a completed walk-in");
    }

    if (walkIn.status === "cancelled") {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Cannot start a cancelled walk-in");
    }

    await ctx.db.patch(args.walkInId, {
      status: "active",
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: "Walk-in started successfully",
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

    if (walkIn.status === "completed") {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Walk-in is already completed");
    }

    if (walkIn.status === "cancelled") {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Cannot complete a cancelled walk-in");
    }

    // Mark current walk-in as completed
    await ctx.db.patch(args.walkInId, {
      status: "completed",
      completedAt: Date.now(),
      updatedAt: Date.now(),
    });

    // FIFO Auto-start: Find next waiting customer for the same barber
    const barberId = walkIn.barberId;
    if (barberId) {
      // Get today's timestamp range
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayStartTimestamp = todayStart.getTime();

      // Get all walk-ins for this barber - defensive approach
      let allWalkInsQuery: any = [];
      try {
        allWalkInsQuery = await ctx.db.query("walkIns").collect();
      } catch (queryError) {
        console.warn("[completeWalkIn] Query failed for auto-start:", queryError?.message || queryError);
        // Return without auto-start if query fails
        return {
          success: true,
          message: "Walk-in marked as completed",
        };
      }

      // Filter for waiting walk-ins for the same barber, created today
      const waitingWalkIns = allWalkInsQuery.filter(
        (w) =>
          w.barberId === barberId &&
          w.status === "waiting" &&
          w.createdAt >= todayStartTimestamp
      );

      if (waitingWalkIns.length > 0) {
        // Sort by queue number (FIFO - lowest queue number first)
        waitingWalkIns.sort((a, b) => {
          if (a.queueNumber !== b.queueNumber) {
            return a.queueNumber - b.queueNumber;
          }
          return a.createdAt - b.createdAt; // Fallback to creation time
        });

        // Auto-start the first in line
        const nextWalkIn = waitingWalkIns[0];
        await ctx.db.patch(nextWalkIn._id, {
          status: "active",
          updatedAt: Date.now(),
        });

        return {
          success: true,
          message: "Walk-in marked as completed. Next customer automatically started.",
          autoStarted: {
            walkInId: nextWalkIn._id,
            queueNumber: nextWalkIn.queueNumber,
            customerName: nextWalkIn.name,
          },
        };
      }
    }

    return {
      success: true,
      message: "Walk-in marked as completed",
    };
  },
});

// Cancel a walk-in
export const cancelWalkIn = mutation({
  args: {
    walkInId: v.id("walkIns"),
  },
  handler: async (ctx, args) => {
    const walkIn = await ctx.db.get(args.walkInId);

    if (!walkIn) {
      throwUserError(ERROR_CODES.NOT_FOUND, "Walk-in not found");
    }

    if (walkIn.status === "completed") {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Cannot cancel a completed walk-in");
    }

    if (walkIn.status === "cancelled") {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Walk-in is already cancelled");
    }

    // Mark as cancelled
    await ctx.db.patch(args.walkInId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });

    // FIFO Auto-start: If cancelled walk-in was active, auto-start next waiting customer for same barber
    if (walkIn.status === "active") {
      const barberId = walkIn.barberId;
      if (barberId) {
        // Get today's timestamp range
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayStartTimestamp = todayStart.getTime();

        // Get all walk-ins for this barber - defensive approach
        let allWalkInsQuery: any = [];
        try {
          allWalkInsQuery = await ctx.db.query("walkIns").collect();
        } catch (queryError) {
          console.warn("[cancelWalkIn] Query failed for auto-start:", queryError?.message || queryError);
          // Return without auto-start if query fails
          return {
            success: true,
            message: "Walk-in cancelled successfully",
          };
        }

        // Filter for waiting walk-ins for the same barber, created today
        const waitingWalkIns = allWalkInsQuery.filter(
          (w) =>
            w.barberId === barberId &&
            w.status === "waiting" &&
            w.createdAt >= todayStartTimestamp
        );

        if (waitingWalkIns.length > 0) {
          // Sort by queue number (FIFO - lowest queue number first)
          waitingWalkIns.sort((a, b) => {
            if (a.queueNumber !== b.queueNumber) {
              return a.queueNumber - b.queueNumber;
            }
            return a.createdAt - b.createdAt;
          });

          // Auto-start the first in line
          const nextWalkIn = waitingWalkIns[0];
          await ctx.db.patch(nextWalkIn._id, {
            status: "active",
            updatedAt: Date.now(),
          });

          return {
            success: true,
            message: "Walk-in cancelled. Next customer automatically started.",
            autoStarted: {
              walkInId: nextWalkIn._id,
              queueNumber: nextWalkIn.queueNumber,
              customerName: nextWalkIn.name,
            },
          };
        }
      }
    }

    return {
      success: true,
      message: "Walk-in cancelled successfully",
    };
  },
});

// Clean up old walk-ins (yesterday and older) - Internal mutation for cron job
export const cleanupOldWalkIns = internalMutation({
  args: {
    branch_id: v.optional(v.id("branches")),
  },
  handler: async (ctx, args) => {
    // Calculate timestamp for start of yesterday
    const yesterdayStart = new Date();
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    yesterdayStart.setHours(0, 0, 0, 0);
    const yesterdayStartTimestamp = yesterdayStart.getTime();

    // Get all walk-ins - defensive approach
    let allWalkInsQuery: any = [];
    try {
      allWalkInsQuery = await ctx.db.query("walkIns").collect();
    } catch (queryError) {
      console.warn("[cleanupOldWalkIns] Query failed:", queryError?.message || queryError);
      return {
        success: true,
        deletedCount: 0,
        message: "No walk-ins to clean up",
      };
    }

    // Filter by branch if provided
    let allWalkIns = allWalkInsQuery;
    if (args.branch_id) {
      allWalkIns = allWalkInsQuery.filter((w) => w.branch_id === args.branch_id);
    }

    // Find walk-ins older than yesterday (created before yesterday's start)
    const oldWalkIns = allWalkIns.filter(
      (walkIn) => walkIn.createdAt < yesterdayStartTimestamp
    );

    // Delete old walk-ins
    const deletePromises = oldWalkIns.map((walkIn) => ctx.db.delete(walkIn._id));
    await Promise.all(deletePromises);

    return {
      success: true,
      deletedCount: oldWalkIns.length,
      message: `Cleaned up ${oldWalkIns.length} old walk-in(s)`,
    };
  },
});

// Manual cleanup trigger (for admins/staff to manually trigger cleanup)
export const manualCleanupOldWalkIns = mutation({
  args: {
    branch_id: v.optional(v.id("branches")),
  },
  handler: async (ctx, args) => {
    // Calculate timestamp for start of yesterday
    const yesterdayStart = new Date();
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    yesterdayStart.setHours(0, 0, 0, 0);
    const yesterdayStartTimestamp = yesterdayStart.getTime();

    // Get all walk-ins - defensive approach
    let allWalkInsQuery: any = [];
    try {
      allWalkInsQuery = await ctx.db.query("walkIns").collect();
    } catch (queryError) {
      console.warn("[manualCleanupOldWalkIns] Query failed:", queryError?.message || queryError);
      return {
        success: true,
        deletedCount: 0,
        message: "No walk-ins to clean up",
      };
    }

    // Filter by branch if provided
    let allWalkIns = allWalkInsQuery;
    if (args.branch_id) {
      allWalkIns = allWalkInsQuery.filter((w) => w.branch_id === args.branch_id);
    }

    // Find walk-ins older than yesterday (created before yesterday's start)
    const oldWalkIns = allWalkIns.filter(
      (walkIn) => walkIn.createdAt < yesterdayStartTimestamp
    );

    // Delete old walk-ins
    const deletePromises = oldWalkIns.map((walkIn) => ctx.db.delete(walkIn._id));
    await Promise.all(deletePromises);

    return {
      success: true,
      deletedCount: oldWalkIns.length,
      message: `Cleaned up ${oldWalkIns.length} old walk-in(s)`,
    };
  },
});

// Get walk-in statistics
export const getWalkInStats = query({
  args: {
    branch_id: v.optional(v.id("branches")),
  },
  handler: async (ctx, args) => {
    // Get all walk-ins - defensive approach
    let allWalkInsQuery: any = [];
    try {
      allWalkInsQuery = await ctx.db.query("walkIns").collect();
    } catch (queryError) {
      console.warn("[getWalkInStats] Query failed:", queryError?.message || queryError);
      // Return zero stats if query fails
      return {
        total: 0,
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
        waiting: 0,
        active: 0,
        completed: 0,
        cancelled: 0,
      };
    }

    // Filter by branch if provided
    let allWalkIns = allWalkInsQuery;
    if (args.branch_id) {
      allWalkIns = allWalkInsQuery.filter((w) => w.branch_id === args.branch_id);
    }

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
      waiting: allWalkIns.filter((w) => w.status === "waiting").length,
      active: allWalkIns.filter((w) => w.status === "active").length,
      completed: allWalkIns.filter((w) => w.status === "completed").length,
      cancelled: allWalkIns.filter((w) => w.status === "cancelled").length,
    };
  },
});

// ───────────────────────────────────────────────────────
// Helper: convert "HH:MM" to minutes since midnight
// ───────────────────────────────────────────────────────
function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

// Helper: convert minutes since midnight to "HH:MM"
function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Day-of-week lookup matching barber schedule keys
const DOW_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

/**
 * Get available time slots for walk-in booking.
 * Returns open slots for the selected barber (or all barbers if barber_id omitted).
 */
export const getAvailableSlots = query({
  args: {
    branch_id: v.id("branches"),
    barber_id: v.optional(v.id("barbers")),
    service_id: v.id("services"),
  },
  handler: async (ctx, args) => {
    // 1. Get selected service duration
    const service = await ctx.db.get(args.service_id);
    if (!service) return { slots: [] };
    const duration = service.duration_minutes || 30;

    // 2. Get barbers — single or all active for the branch
    let barbers: any[] = [];
    if (args.barber_id) {
      const b = await ctx.db.get(args.barber_id);
      if (b && b.is_active) barbers = [b];
    } else {
      barbers = await ctx.db
        .query("barbers")
        .withIndex("by_branch", (q: any) => q.eq("branch_id", args.branch_id))
        .filter((q: any) => q.eq(q.field("is_active"), true))
        .collect();
    }

    if (barbers.length === 0) return { slots: [] };

    // 3. Today's date info
    const todayDate = new Date().toISOString().split("T")[0];
    const dayIndex = new Date().getDay(); // 0=Sun
    const dayKey = DOW_KEYS[dayIndex];

    // Current time in minutes (local, approximate — clients handle TZ)
    const nowMinutes =
      new Date().getHours() * 60 + new Date().getMinutes();

    // 4. Fetch today's bookings
    let allBookings: any[] = [];
    try {
      allBookings = await ctx.db.query("bookings").collect();
    } catch (e) {
      console.warn("[getAvailableSlots] bookings query failed:", e);
    }
    const todaysBookings = allBookings.filter(
      (b: any) =>
        b.branch_id === args.branch_id &&
        b.date === todayDate &&
        b.status !== "cancelled" &&
        b.status !== "completed"
    );

    // 5. Fetch today's walk-ins
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartTs = todayStart.getTime();

    let allWalkIns: any[] = [];
    try {
      allWalkIns = await ctx.db.query("walkIns").collect();
    } catch (e) {
      console.warn("[getAvailableSlots] walkIns query failed:", e);
    }
    const todaysWalkIns = allWalkIns.filter(
      (w: any) =>
        w.branch_id === args.branch_id &&
        w.createdAt >= todayStartTs &&
        w.status !== "cancelled" &&
        w.status !== "completed"
    );

    // 6. Per barber — compute available slots
    const result: Array<{
      barber_id: string;
      barber_name: string;
      slots: string[];
    }> = [];

    for (const barber of barbers) {
      // Get barber's schedule for today
      const schedule = barber.schedule as Record<string, any> | undefined;
      const daySchedule = schedule?.[dayKey];
      if (!daySchedule || !daySchedule.available) continue;

      const schedStart = timeToMinutes(daySchedule.start || "09:00");
      const schedEnd = timeToMinutes(daySchedule.end || "18:00");

      // Collect occupied ranges for this barber
      const occupied: Array<{ start: number; end: number }> = [];

      // From bookings
      for (const bk of todaysBookings) {
        if (String(bk.barber) !== String(barber._id)) continue;
        const bkStart = timeToMinutes(bk.time?.substring(0, 5) || "00:00");
        // Use service duration if available, default 30
        let bkDuration = 30;
        if (bk.service) {
          try {
            const svc = await ctx.db.get(bk.service);
            if (svc) bkDuration = svc.duration_minutes || 30;
          } catch (_) {}
        }
        occupied.push({ start: bkStart, end: bkStart + bkDuration });
      }

      // From walk-ins
      for (const wi of todaysWalkIns) {
        if (String(wi.barberId) !== String(barber._id)) continue;
        if (!wi.scheduled_time) continue;
        const wiStart = timeToMinutes(wi.scheduled_time);
        let wiDuration = 30;
        if (wi.service_id) {
          try {
            const svc = await ctx.db.get(wi.service_id);
            if (svc) wiDuration = svc.duration_minutes || 30;
          } catch (_) {}
        }
        occupied.push({ start: wiStart, end: wiStart + wiDuration });
      }

      // Sort occupied ranges
      occupied.sort((a, b) => a.start - b.start);

      // Find free slots in 30-min increments
      const slots: string[] = [];
      for (let t = schedStart; t + duration <= schedEnd; t += 30) {
        // Skip past times
        if (t < nowMinutes) continue;

        // Check overlap with any occupied range
        const slotEnd = t + duration;
        const hasConflict = occupied.some(
          (o) => t < o.end && slotEnd > o.start
        );
        if (!hasConflict) {
          slots.push(minutesToTime(t));
        }
      }

      result.push({
        barber_id: barber._id,
        barber_name: barber.full_name,
        slots,
      });
    }

    return { slots: result };
  },
});
