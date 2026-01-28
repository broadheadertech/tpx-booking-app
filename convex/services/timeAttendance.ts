import { v, ConvexError } from "convex/values";
import { query, mutation } from "../_generated/server";

// Stale shift threshold: 24 hours in milliseconds
const STALE_SHIFT_THRESHOLD_MS = 24 * 60 * 60 * 1000;

// Philippines timezone offset: UTC+8
const PHT_OFFSET_MS = 8 * 60 * 60 * 1000;

/**
 * Clock in a barber - creates a new time attendance record
 * Validates that the barber is not already clocked in.
 *
 * Auto-close behavior: If an unclosed shift is older than 24 hours,
 * it will be automatically closed at midnight (PHT) of the shift date,
 * allowing the barber to clock in again.
 */
export const clockIn = mutation({
  args: {
    barber_id: v.id("barbers"),
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    let autoClosedPreviousShift = false;
    let autoClosedShiftId = null;

    // Check if already clocked in (has unclosed shift)
    const activeShift = await ctx.db
      .query("timeAttendance")
      .withIndex("by_barber", (q) => q.eq("barber_id", args.barber_id))
      .filter((q) => q.eq(q.field("clock_out"), undefined))
      .first();

    if (activeShift) {
      const shiftAge = Date.now() - activeShift.clock_in;

      if (shiftAge > STALE_SHIFT_THRESHOLD_MS) {
        // Auto-close stale shift at midnight PHT of shift date
        // Convert to PHT, find midnight, convert back to UTC timestamp
        const shiftDatePHT = new Date(activeShift.clock_in + PHT_OFFSET_MS);
        const midnightPHT = new Date(Date.UTC(
          shiftDatePHT.getUTCFullYear(),
          shiftDatePHT.getUTCMonth(),
          shiftDatePHT.getUTCDate() + 1,
          0, 0, 0, 0
        )).getTime() - PHT_OFFSET_MS;

        await ctx.db.patch(activeShift._id, {
          clock_out: midnightPHT,
        });

        autoClosedPreviousShift = true;
        autoClosedShiftId = activeShift._id;
        // Continue to create new shift
      } else {
        // Still within 24 hours - cannot clock in
        throw new ConvexError({
          code: "ALREADY_CLOCKED_IN",
          message: "You are already clocked in. Please clock out first.",
        });
      }
    }

    // Validate barber exists
    const barber = await ctx.db.get(args.barber_id);
    if (!barber) {
      throw new ConvexError({
        code: "BARBER_NOT_FOUND",
        message: "Barber not found.",
      });
    }

    // Validate branch exists
    const branch = await ctx.db.get(args.branch_id);
    if (!branch) {
      throw new ConvexError({
        code: "BRANCH_NOT_FOUND",
        message: "Branch not found.",
      });
    }

    const now = Date.now();
    const shiftId = await ctx.db.insert("timeAttendance", {
      barber_id: args.barber_id,
      branch_id: args.branch_id,
      clock_in: now,
      created_at: now,
    });

    return {
      success: true,
      shiftId,
      clockInTime: now,
      autoClosedPreviousShift,
      autoClosedShiftId,
    };
  },
});

/**
 * Get the current clock status for a barber
 * Returns whether clocked in, active shift details, and duration
 */
export const getBarberClockStatus = query({
  args: {
    barber_id: v.id("barbers"),
  },
  handler: async (ctx, args) => {
    // Find active shift (no clock_out)
    const activeShift = await ctx.db
      .query("timeAttendance")
      .withIndex("by_barber", (q) => q.eq("barber_id", args.barber_id))
      .filter((q) => q.eq(q.field("clock_out"), undefined))
      .first();

    if (!activeShift) {
      return {
        isClockedIn: false,
        shift: null,
        shiftDuration: null,
      };
    }

    return {
      isClockedIn: true,
      shift: activeShift,
      shiftDuration: Date.now() - activeShift.clock_in,
    };
  },
});

/**
 * Clock out a barber - closes the active shift
 * Validates that the barber is currently clocked in
 */
export const clockOut = mutation({
  args: {
    barber_id: v.id("barbers"),
  },
  handler: async (ctx, args) => {
    // Find active shift
    const activeShift = await ctx.db
      .query("timeAttendance")
      .withIndex("by_barber", (q) => q.eq("barber_id", args.barber_id))
      .filter((q) => q.eq(q.field("clock_out"), undefined))
      .first();

    if (!activeShift) {
      throw new ConvexError({
        code: "NOT_CLOCKED_IN",
        message: "You are not clocked in. Please clock in first.",
      });
    }

    const now = Date.now();
    await ctx.db.patch(activeShift._id, {
      clock_out: now,
    });

    return {
      success: true,
      shiftId: activeShift._id,
      clockOutTime: now,
      shiftDuration: now - activeShift.clock_in,
    };
  },
});

/**
 * Get attendance records for a branch within a date range
 * Used by Branch Admin to view attendance
 */
export const getAttendanceByBranch = query({
  args: {
    branch_id: v.id("branches"),
    start_date: v.optional(v.number()),
    end_date: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;

    // Query with branch index
    let records = await ctx.db
      .query("timeAttendance")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .order("desc")
      .collect();

    // Filter by date range if provided
    if (args.start_date !== undefined) {
      records = records.filter((r) => r.clock_in >= args.start_date!);
    }
    if (args.end_date !== undefined) {
      records = records.filter((r) => r.clock_in <= args.end_date!);
    }

    // Apply limit
    records = records.slice(0, limit);

    // Enrich with barber details
    const enrichedRecords = await Promise.all(
      records.map(async (record) => {
        const barber = await ctx.db.get(record.barber_id);
        return {
          ...record,
          barber_name: barber?.full_name || "Unknown",
          barber_avatar: barber?.avatar || null,
        };
      })
    );

    return enrichedRecords;
  },
});

/**
 * Get current clock status for all barbers in a branch
 * Used by Branch Admin to see who is currently clocked in/out
 *
 * Optimized: Fetches all active shifts for the branch in a single query
 * instead of one query per barber (N+1 pattern avoided)
 */
export const getBarberStatusForBranch = query({
  args: {
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    // Get all active barbers for this branch
    const barbers = await ctx.db
      .query("barbers")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .filter((q) => q.eq(q.field("is_active"), true))
      .collect();

    // Get all active shifts for this branch in a single query (avoids N+1)
    const activeShifts = await ctx.db
      .query("timeAttendance")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .filter((q) => q.eq(q.field("clock_out"), undefined))
      .collect();

    // Create a map of barber_id to active shift for O(1) lookup
    const activeShiftByBarber = new Map(
      activeShifts.map((shift) => [shift.barber_id.toString(), shift])
    );

    // Build status list using the pre-fetched data
    const statusList = barbers.map((barber) => {
      const activeShift = activeShiftByBarber.get(barber._id.toString());
      return {
        barber_id: barber._id,
        barber_name: barber.full_name,
        barber_avatar: barber.avatar || null,
        isClockedIn: !!activeShift,
        clockInTime: activeShift?.clock_in || null,
      };
    });

    return statusList;
  },
});

/**
 * Get attendance history for a specific barber
 */
export const getBarberAttendanceHistory = query({
  args: {
    barber_id: v.id("barbers"),
    start_date: v.optional(v.number()),
    end_date: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    // Query with barber index
    let records = await ctx.db
      .query("timeAttendance")
      .withIndex("by_barber", (q) => q.eq("barber_id", args.barber_id))
      .order("desc")
      .collect();

    // Filter by date range if provided
    if (args.start_date !== undefined) {
      records = records.filter((r) => r.clock_in >= args.start_date!);
    }
    if (args.end_date !== undefined) {
      records = records.filter((r) => r.clock_in <= args.end_date!);
    }

    // Apply limit
    return records.slice(0, limit);
  },
});
