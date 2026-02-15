import { v, ConvexError } from "convex/values";
import { query, mutation } from "../_generated/server";

// Stale shift threshold: 24 hours in milliseconds
const STALE_SHIFT_THRESHOLD_MS = 24 * 60 * 60 * 1000;

// Philippines timezone offset: UTC+8
const PHT_OFFSET_MS = 8 * 60 * 60 * 1000;

/**
 * Helper: treat legacy records (no status field) as approved
 */
function effectiveStatus(record: { status?: string; clock_out?: number }): string {
  if (record.status) return record.status;
  // Legacy records: if clock_out exists → approved_out, else → approved_in
  return record.clock_out ? "approved_out" : "approved_in";
}

/**
 * Clock in a barber or staff user - creates a pending attendance request
 * The request must be approved by staff before it takes effect.
 *
 * Auto-close behavior: If an unclosed shift is older than 24 hours,
 * it will be automatically closed at midnight (PHT) of the shift date.
 */
export const clockIn = mutation({
  args: {
    barber_id: v.optional(v.id("barbers")),
    user_id: v.optional(v.id("users")),
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    let autoClosedPreviousShift = false;
    let autoClosedShiftId = null;

    // Check if already has an active or pending shift
    let activeShifts;
    if (args.barber_id) {
      activeShifts = await ctx.db
        .query("timeAttendance")
        .withIndex("by_barber", (q) => q.eq("barber_id", args.barber_id!))
        .filter((q) => q.eq(q.field("clock_out"), undefined))
        .collect();
    } else if (args.user_id) {
      activeShifts = await ctx.db
        .query("timeAttendance")
        .withIndex("by_user", (q) => q.eq("user_id", args.user_id!))
        .filter((q) => q.eq(q.field("clock_out"), undefined))
        .collect();
    } else {
      throw new ConvexError({
        code: "INVALID_ARGS",
        message: "Either barber_id or user_id must be provided.",
      });
    }

    for (const activeShift of activeShifts) {
      const status = effectiveStatus(activeShift);

      // If there's a pending_in request, don't allow another
      if (status === "pending_in") {
        throw new ConvexError({
          code: "PENDING_REQUEST",
          message: "You already have a pending clock-in request. Please wait for approval.",
        });
      }

      // If approved_in (currently clocked in), can't clock in again
      if (status === "approved_in") {
        const shiftAge = Date.now() - activeShift.clock_in;

        if (shiftAge > STALE_SHIFT_THRESHOLD_MS) {
          // Auto-close stale shift at midnight PHT of shift date
          const shiftDatePHT = new Date(activeShift.clock_in + PHT_OFFSET_MS);
          const midnightPHT = new Date(Date.UTC(
            shiftDatePHT.getUTCFullYear(),
            shiftDatePHT.getUTCMonth(),
            shiftDatePHT.getUTCDate() + 1,
            0, 0, 0, 0
          )).getTime() - PHT_OFFSET_MS;

          await ctx.db.patch(activeShift._id, {
            clock_out: midnightPHT,
            status: "approved_out",
          });

          autoClosedPreviousShift = true;
          autoClosedShiftId = activeShift._id;
        } else {
          throw new ConvexError({
            code: "ALREADY_CLOCKED_IN",
            message: "You are already clocked in. Please clock out first.",
          });
        }
      }
    }

    // Validate the person exists
    if (args.barber_id) {
      const barber = await ctx.db.get(args.barber_id);
      if (!barber) {
        throw new ConvexError({
          code: "BARBER_NOT_FOUND",
          message: "Barber not found.",
        });
      }
    } else if (args.user_id) {
      const user = await ctx.db.get(args.user_id);
      if (!user) {
        throw new ConvexError({
          code: "USER_NOT_FOUND",
          message: "User not found.",
        });
      }
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
    const insertData: Record<string, any> = {
      branch_id: args.branch_id,
      clock_in: now,
      status: "pending_in",
      created_at: now,
    };
    if (args.barber_id) {
      insertData.barber_id = args.barber_id;
    }
    if (args.user_id) {
      insertData.user_id = args.user_id;
    }

    const shiftId = await ctx.db.insert("timeAttendance", insertData as any);

    return {
      success: true,
      shiftId,
      clockInTime: now,
      status: "pending_in",
      autoClosedPreviousShift,
      autoClosedShiftId,
    };
  },
});

/**
 * Get the current clock status for a barber
 * Returns whether clocked in, active shift details, pending requests, and duration
 */
export const getBarberClockStatus = query({
  args: {
    barber_id: v.id("barbers"),
  },
  handler: async (ctx, args) => {
    // Find active shift (no clock_out) — could be pending or approved
    const activeShifts = await ctx.db
      .query("timeAttendance")
      .withIndex("by_barber", (q) => q.eq("barber_id", args.barber_id))
      .filter((q) => q.eq(q.field("clock_out"), undefined))
      .collect();

    // Check for pending_in
    const pendingIn = activeShifts.find((s) => s.status === "pending_in");
    if (pendingIn) {
      return {
        isClockedIn: false,
        shift: null,
        shiftDuration: null,
        pendingRequest: {
          _id: pendingIn._id,
          type: "clock_in",
          requestedAt: pendingIn.clock_in,
        },
      };
    }

    // Check for approved_in (including legacy records with no status)
    const approvedIn = activeShifts.find((s) => effectiveStatus(s) === "approved_in");
    if (approvedIn) {
      // Check if there's a pending_out for this shift
      const pendingOutShifts = await ctx.db
        .query("timeAttendance")
        .withIndex("by_barber", (q) => q.eq("barber_id", args.barber_id))
        .filter((q) => q.eq(q.field("status"), "pending_out"))
        .collect();

      const pendingOut = pendingOutShifts.length > 0 ? pendingOutShifts[0] : null;

      return {
        isClockedIn: true,
        shift: approvedIn,
        shiftDuration: Date.now() - approvedIn.clock_in,
        pendingRequest: pendingOut
          ? {
              _id: pendingOut._id,
              type: "clock_out",
              requestedAt: pendingOut.clock_out || Date.now(),
            }
          : null,
      };
    }

    // Check for most recent rejected request (show briefly)
    const recentRecords = await ctx.db
      .query("timeAttendance")
      .withIndex("by_barber", (q) => q.eq("barber_id", args.barber_id))
      .order("desc")
      .take(1);

    const lastRecord = recentRecords[0];
    const isRecentRejection =
      lastRecord?.status === "rejected" &&
      lastRecord.reviewed_at &&
      Date.now() - lastRecord.reviewed_at < 60000; // show for 1 minute

    return {
      isClockedIn: false,
      shift: null,
      shiftDuration: null,
      pendingRequest: isRecentRejection
        ? {
            _id: lastRecord._id,
            type: "rejected",
            requestedAt: lastRecord.reviewed_at!,
          }
        : null,
    };
  },
});

/**
 * Get the current clock status for a staff user
 * Returns whether clocked in, active shift details, pending requests, and duration
 */
export const getUserClockStatus = query({
  args: {
    user_id: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Find active shift (no clock_out) — could be pending or approved
    const activeShifts = await ctx.db
      .query("timeAttendance")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .filter((q) => q.eq(q.field("clock_out"), undefined))
      .collect();

    // Check for pending_in
    const pendingIn = activeShifts.find((s) => s.status === "pending_in");
    if (pendingIn) {
      return {
        isClockedIn: false,
        shift: null,
        shiftDuration: null,
        pendingRequest: {
          _id: pendingIn._id,
          type: "clock_in",
          requestedAt: pendingIn.clock_in,
        },
      };
    }

    // Check for approved_in (including legacy records with no status)
    const approvedIn = activeShifts.find((s) => effectiveStatus(s) === "approved_in");
    if (approvedIn) {
      // Check if there's a pending_out for this shift
      const pendingOutShifts = await ctx.db
        .query("timeAttendance")
        .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
        .filter((q) => q.eq(q.field("status"), "pending_out"))
        .collect();

      const pendingOut = pendingOutShifts.length > 0 ? pendingOutShifts[0] : null;

      return {
        isClockedIn: true,
        shift: approvedIn,
        shiftDuration: Date.now() - approvedIn.clock_in,
        pendingRequest: pendingOut
          ? {
              _id: pendingOut._id,
              type: "clock_out",
              requestedAt: pendingOut.clock_out || Date.now(),
            }
          : null,
      };
    }

    // Check for most recent rejected request (show briefly)
    const recentRecords = await ctx.db
      .query("timeAttendance")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .order("desc")
      .take(1);

    const lastRecord = recentRecords[0];
    const isRecentRejection =
      lastRecord?.status === "rejected" &&
      lastRecord.reviewed_at &&
      Date.now() - lastRecord.reviewed_at < 60000; // show for 1 minute

    return {
      isClockedIn: false,
      shift: null,
      shiftDuration: null,
      pendingRequest: isRecentRejection
        ? {
            _id: lastRecord._id,
            type: "rejected",
            requestedAt: lastRecord.reviewed_at!,
          }
        : null,
    };
  },
});

/**
 * Clock out a barber or staff user - creates a pending clock-out request
 * The request must be approved by staff before it takes effect.
 */
export const clockOut = mutation({
  args: {
    barber_id: v.optional(v.id("barbers")),
    user_id: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Find active approved shift
    let activeShifts;
    if (args.barber_id) {
      activeShifts = await ctx.db
        .query("timeAttendance")
        .withIndex("by_barber", (q) => q.eq("barber_id", args.barber_id!))
        .filter((q) => q.eq(q.field("clock_out"), undefined))
        .collect();
    } else if (args.user_id) {
      activeShifts = await ctx.db
        .query("timeAttendance")
        .withIndex("by_user", (q) => q.eq("user_id", args.user_id!))
        .filter((q) => q.eq(q.field("clock_out"), undefined))
        .collect();
    } else {
      throw new ConvexError({
        code: "INVALID_ARGS",
        message: "Either barber_id or user_id must be provided.",
      });
    }

    const approvedShift = activeShifts.find((s) => effectiveStatus(s) === "approved_in");

    if (!approvedShift) {
      throw new ConvexError({
        code: "NOT_CLOCKED_IN",
        message: "You are not clocked in. Please clock in first.",
      });
    }

    // Check if there's already a pending_out request
    let existingPendingOut;
    if (args.barber_id) {
      existingPendingOut = await ctx.db
        .query("timeAttendance")
        .withIndex("by_barber", (q) => q.eq("barber_id", args.barber_id!))
        .filter((q) => q.eq(q.field("status"), "pending_out"))
        .first();
    } else {
      existingPendingOut = await ctx.db
        .query("timeAttendance")
        .withIndex("by_user", (q) => q.eq("user_id", args.user_id!))
        .filter((q) => q.eq(q.field("status"), "pending_out"))
        .first();
    }

    if (existingPendingOut) {
      throw new ConvexError({
        code: "PENDING_REQUEST",
        message: "You already have a pending clock-out request. Please wait for approval.",
      });
    }

    const now = Date.now();
    await ctx.db.patch(approvedShift._id, {
      clock_out: now,
      status: "pending_out",
    });

    return {
      success: true,
      shiftId: approvedShift._id,
      clockOutTime: now,
      status: "pending_out",
      shiftDuration: now - approvedShift.clock_in,
    };
  },
});

/**
 * Get attendance records for a branch within a date range
 * Only returns approved records (completed shifts)
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

    let records = await ctx.db
      .query("timeAttendance")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .order("desc")
      .collect();

    // Only show approved records (approved_in, approved_out, or legacy with no status)
    records = records.filter((r) => {
      const status = effectiveStatus(r);
      return status === "approved_in" || status === "approved_out";
    });

    // Filter by date range if provided
    if (args.start_date !== undefined) {
      records = records.filter((r) => r.clock_in >= args.start_date!);
    }
    if (args.end_date !== undefined) {
      records = records.filter((r) => r.clock_in <= args.end_date!);
    }

    records = records.slice(0, limit);

    const enrichedRecords = await Promise.all(
      records.map(async (record) => {
        let personName = "Unknown";
        let personAvatar: string | null = null;

        if (record.barber_id) {
          const barber = await ctx.db.get(record.barber_id);
          personName = barber?.full_name || "Unknown";
          personAvatar = barber?.avatar || null;
        } else if (record.user_id) {
          const user = await ctx.db.get(record.user_id);
          personName = user ? (user.nickname || user.username) : "Unknown";
          personAvatar = user?.avatar || null;
        }

        return {
          ...record,
          barber_name: personName,
          barber_avatar: personAvatar,
        };
      })
    );

    return enrichedRecords;
  },
});

/**
 * Get current clock status for all barbers and staff in a branch
 * Optimized: single query for all active shifts
 */
export const getBarberStatusForBranch = query({
  args: {
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const barbers = await ctx.db
      .query("barbers")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .filter((q) => q.eq(q.field("is_active"), true))
      .collect();

    // Get all non-completed shifts for this branch
    const activeShifts = await ctx.db
      .query("timeAttendance")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .filter((q) => q.eq(q.field("clock_out"), undefined))
      .collect();

    // Also get pending_out records (they have clock_out set but status is pending_out)
    const pendingOutShifts = await ctx.db
      .query("timeAttendance")
      .withIndex("by_branch_status", (q) =>
        q.eq("branch_id", args.branch_id).eq("status", "pending_out")
      )
      .collect();

    // Maps for O(1) lookup — barbers keyed by barber_id, staff keyed by user_id
    const activeShiftByBarber = new Map<string, typeof activeShifts[0]>();
    const pendingOutByBarber = new Map<string, typeof pendingOutShifts[0]>();
    const activeShiftByUser = new Map<string, typeof activeShifts[0]>();
    const pendingOutByUser = new Map<string, typeof pendingOutShifts[0]>();

    for (const shift of activeShifts) {
      if (shift.barber_id) {
        activeShiftByBarber.set(shift.barber_id.toString(), shift);
      }
      if (shift.user_id) {
        activeShiftByUser.set(shift.user_id.toString(), shift);
      }
    }
    for (const shift of pendingOutShifts) {
      if (shift.barber_id) {
        pendingOutByBarber.set(shift.barber_id.toString(), shift);
      }
      if (shift.user_id) {
        pendingOutByUser.set(shift.user_id.toString(), shift);
      }
    }

    const statusList: any[] = barbers.map((barber) => {
      const activeShift = activeShiftByBarber.get(barber._id.toString());
      const pendingOut = pendingOutByBarber.get(barber._id.toString());
      const status = activeShift ? effectiveStatus(activeShift) : null;

      return {
        barber_id: barber._id,
        user_id: null,
        barber_name: barber.full_name,
        barber_avatar: barber.avatar || null,
        person_type: "barber",
        isClockedIn: status === "approved_in" || (!!pendingOut),
        isPending: status === "pending_in" || !!pendingOut,
        clockInTime: activeShift?.clock_in || pendingOut?.clock_in || null,
        status: pendingOut ? "pending_out" : status,
        schedule: barber.schedule || null,
        ot_hourly_rate: barber.ot_hourly_rate || null,
        penalty_hourly_rate: barber.penalty_hourly_rate || null,
      };
    });

    // Also query staff users for this branch
    const staffRoles = ["staff", "branch_admin", "admin_staff"];
    const branchUsers = await ctx.db
      .query("users")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .filter((q) => q.eq(q.field("is_active"), true))
      .collect();

    const staffUsers = branchUsers.filter((u) => staffRoles.includes(u.role));

    for (const user of staffUsers) {
      const activeShift = activeShiftByUser.get(user._id.toString());
      const pendingOut = pendingOutByUser.get(user._id.toString());
      const status = activeShift ? effectiveStatus(activeShift) : null;

      statusList.push({
        barber_id: null,
        user_id: user._id,
        barber_name: user.nickname || user.username,
        barber_avatar: user.avatar || null,
        person_type: "staff",
        isClockedIn: status === "approved_in" || (!!pendingOut),
        isPending: status === "pending_in" || !!pendingOut,
        clockInTime: activeShift?.clock_in || pendingOut?.clock_in || null,
        status: pendingOut ? "pending_out" : status,
        schedule: null,
        ot_hourly_rate: null,
        penalty_hourly_rate: null,
      });
    }

    return statusList;
  },
});

/**
 * Get attendance history for a specific barber
 * Only returns approved records
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

    let records = await ctx.db
      .query("timeAttendance")
      .withIndex("by_barber", (q) => q.eq("barber_id", args.barber_id))
      .order("desc")
      .collect();

    // Only approved records
    records = records.filter((r) => {
      const status = effectiveStatus(r);
      return status === "approved_in" || status === "approved_out";
    });

    if (args.start_date !== undefined) {
      records = records.filter((r) => r.clock_in >= args.start_date!);
    }
    if (args.end_date !== undefined) {
      records = records.filter((r) => r.clock_in <= args.end_date!);
    }

    return records.slice(0, limit);
  },
});

// ─── Approval Functions ───────────────────────────────────────────────────────

/**
 * Get all pending attendance requests for a branch
 */
export const getPendingRequests = query({
  args: {
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    // Get pending_in requests
    const pendingIn = await ctx.db
      .query("timeAttendance")
      .withIndex("by_branch_status", (q) =>
        q.eq("branch_id", args.branch_id).eq("status", "pending_in")
      )
      .collect();

    // Get pending_out requests
    const pendingOut = await ctx.db
      .query("timeAttendance")
      .withIndex("by_branch_status", (q) =>
        q.eq("branch_id", args.branch_id).eq("status", "pending_out")
      )
      .collect();

    const allPending = [...pendingIn, ...pendingOut];

    // Sort by created_at desc (most recent first)
    allPending.sort((a, b) => b.created_at - a.created_at);

    // Enrich with barber or user details
    const enriched = await Promise.all(
      allPending.map(async (record) => {
        let personName = "Unknown";
        let personAvatar: string | null = null;

        if (record.barber_id) {
          const barber = await ctx.db.get(record.barber_id);
          personName = barber?.full_name || "Unknown";
          personAvatar = barber?.avatar || null;
        } else if (record.user_id) {
          const user = await ctx.db.get(record.user_id);
          personName = user ? (user.nickname || user.username) : "Unknown";
          personAvatar = user?.avatar || null;
        }

        return {
          ...record,
          barber_name: personName,
          barber_avatar: personAvatar,
        };
      })
    );

    return enriched;
  },
});

/**
 * Approve an attendance request
 * pending_in → approved_in, pending_out → approved_out
 */
export const approveAttendance = mutation({
  args: {
    recordId: v.id("timeAttendance"),
    reviewerName: v.string(),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.recordId);
    if (!record) {
      throw new ConvexError({
        code: "RECORD_NOT_FOUND",
        message: "Attendance record not found.",
      });
    }

    const now = Date.now();

    if (record.status === "pending_in") {
      await ctx.db.patch(args.recordId, {
        status: "approved_in",
        reviewed_by: args.reviewerName,
        reviewed_at: now,
      });
      return { success: true, newStatus: "approved_in" };
    }

    if (record.status === "pending_out") {
      await ctx.db.patch(args.recordId, {
        status: "approved_out",
        reviewed_by: args.reviewerName,
        reviewed_at: now,
      });
      return { success: true, newStatus: "approved_out" };
    }

    throw new ConvexError({
      code: "INVALID_STATUS",
      message: `Cannot approve record with status "${record.status}".`,
    });
  },
});

/**
 * Reject an attendance request
 */
export const rejectAttendance = mutation({
  args: {
    recordId: v.id("timeAttendance"),
    reviewerName: v.string(),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.recordId);
    if (!record) {
      throw new ConvexError({
        code: "RECORD_NOT_FOUND",
        message: "Attendance record not found.",
      });
    }

    if (record.status !== "pending_in" && record.status !== "pending_out") {
      throw new ConvexError({
        code: "INVALID_STATUS",
        message: `Cannot reject record with status "${record.status}".`,
      });
    }

    const now = Date.now();

    // If rejecting a pending_out, revert to approved_in (still clocked in)
    if (record.status === "pending_out") {
      await ctx.db.patch(args.recordId, {
        clock_out: undefined,
        status: "approved_in",
        reviewed_by: args.reviewerName,
        reviewed_at: now,
      });
      return { success: true, newStatus: "approved_in", action: "clock_out_rejected" };
    }

    // If rejecting a pending_in, mark as rejected
    await ctx.db.patch(args.recordId, {
      status: "rejected",
      reviewed_by: args.reviewerName,
      reviewed_at: now,
    });
    return { success: true, newStatus: "rejected", action: "clock_in_rejected" };
  },
});
