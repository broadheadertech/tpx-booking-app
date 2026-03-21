import { v, ConvexError } from "convex/values";
import { query, mutation } from "../_generated/server";

// Stale shift threshold: 24 hours in milliseconds
const STALE_SHIFT_THRESHOLD_MS = 24 * 60 * 60 * 1000;
// Philippines timezone offset: UTC+8
const PHT_OFFSET_MS = 8 * 60 * 60 * 1000;

// Default confidence thresholds (confidence = 1 - euclideanDistance / 1.2)
// Standard face-api.js match: distance < 0.6 → confidence 0.50
const DEFAULT_AUTO_APPROVE = 0.65; // distance < 0.42 (high confidence auto-approve)
const DEFAULT_ADMIN_REVIEW = 0.50; // distance < 0.60 (standard face-api.js threshold)

function effectiveStatus(record: { status?: string; clock_out?: number }): string {
  if (record.status) return record.status;
  return record.clock_out ? "approved_out" : "approved_in";
}

// ── Upload URL ──

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// ── Enrollment Mutations ──

export const saveEnrollment = mutation({
  args: {
    barber_id: v.optional(v.id("barbers")),
    user_id: v.optional(v.id("users")),
    branch_id: v.id("branches"),
    embeddings: v.array(v.array(v.number())),
    enrollment_photos: v.array(v.id("_storage")),
    consent_given: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (!args.barber_id && !args.user_id) {
      throw new ConvexError({ code: "MISSING_ID", message: "Either barber_id or user_id must be provided." });
    }

    if (!args.consent_given) {
      throw new ConvexError({ code: "CONSENT_REQUIRED", message: "Consent is required for face enrollment." });
    }

    if (args.barber_id) {
      const barber = await ctx.db.get(args.barber_id);
      if (!barber) throw new ConvexError({ code: "BARBER_NOT_FOUND", message: "Barber not found." });
    }

    if (args.user_id) {
      const user = await ctx.db.get(args.user_id);
      if (!user) throw new ConvexError({ code: "USER_NOT_FOUND", message: "User not found." });
    }

    const branch = await ctx.db.get(args.branch_id);
    if (!branch) throw new ConvexError({ code: "BRANCH_NOT_FOUND", message: "Branch not found." });

    // Revoke any existing active enrollment for this person
    let existing;
    if (args.barber_id) {
      existing = await ctx.db
        .query("face_enrollments")
        .withIndex("by_barber", (q) => q.eq("barber_id", args.barber_id!))
        .filter((q) => q.eq(q.field("enrollment_status"), "active"))
        .first();
    } else {
      existing = await ctx.db
        .query("face_enrollments")
        .withIndex("by_user", (q) => q.eq("user_id", args.user_id!))
        .filter((q) => q.eq(q.field("enrollment_status"), "active"))
        .first();
    }

    if (existing) {
      await ctx.db.patch(existing._id, { enrollment_status: "revoked", updated_at: Date.now() });
    }

    const now = Date.now();
    const insertData: any = {
      branch_id: args.branch_id,
      embeddings: args.embeddings,
      enrollment_photos: args.enrollment_photos,
      enrollment_status: "active",
      consent_given: true,
      consent_timestamp: now,
      created_at: now,
    };
    if (args.barber_id) insertData.barber_id = args.barber_id;
    if (args.user_id) insertData.user_id = args.user_id;

    const id = await ctx.db.insert("face_enrollments", insertData);

    return { success: true, enrollmentId: id };
  },
});

export const revokeEnrollment = mutation({
  args: {
    barber_id: v.optional(v.id("barbers")),
    user_id: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    let enrollment;
    if (args.barber_id) {
      enrollment = await ctx.db
        .query("face_enrollments")
        .withIndex("by_barber", (q) => q.eq("barber_id", args.barber_id!))
        .filter((q) => q.eq(q.field("enrollment_status"), "active"))
        .first();
    } else if (args.user_id) {
      enrollment = await ctx.db
        .query("face_enrollments")
        .withIndex("by_user", (q) => q.eq("user_id", args.user_id!))
        .filter((q) => q.eq(q.field("enrollment_status"), "active"))
        .first();
    }

    if (!enrollment) {
      throw new ConvexError({ code: "NOT_ENROLLED", message: "No active enrollment found." });
    }

    await ctx.db.patch(enrollment._id, { enrollment_status: "revoked", updated_at: Date.now() });

    // Delete stored photos
    for (const photoId of enrollment.enrollment_photos) {
      try { await ctx.storage.delete(photoId); } catch (_) { /* ignore if already deleted */ }
    }

    return { success: true };
  },
});

// ── Enrollment Queries ──

export const getEnrollmentByBarber = query({
  args: { barber_id: v.id("barbers") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("face_enrollments")
      .withIndex("by_barber", (q) => q.eq("barber_id", args.barber_id))
      .filter((q) => q.eq(q.field("enrollment_status"), "active"))
      .first();
  },
});

export const getEnrollmentsByBranch = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    const enrollments = await ctx.db
      .query("face_enrollments")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .filter((q) => q.eq(q.field("enrollment_status"), "active"))
      .collect();

    // Enrich with person name for client-side display after match
    const result = [];
    for (const e of enrollments) {
      let barber_name = "Unknown";
      let barber_avatar: string | undefined;

      if (e.barber_id) {
        const barber = await ctx.db.get(e.barber_id);
        barber_name = barber?.full_name ?? "Unknown";
        barber_avatar = barber?.avatar;
      } else if (e.user_id) {
        const user = await ctx.db.get(e.user_id);
        barber_name = user?.nickname || user?.username || "Unknown";
        barber_avatar = user?.avatar;
      }

      result.push({
        _id: e._id,
        barber_id: e.barber_id,
        user_id: e.user_id,
        person_type: e.barber_id ? "barber" as const : "staff" as const,
        barber_name,
        barber_avatar,
        embeddings: e.embeddings,
      });
    }
    return result;
  },
});

export const isBarberEnrolled = query({
  args: { barber_id: v.id("barbers") },
  handler: async (ctx, args) => {
    const enrollment = await ctx.db
      .query("face_enrollments")
      .withIndex("by_barber", (q) => q.eq("barber_id", args.barber_id))
      .filter((q) => q.eq(q.field("enrollment_status"), "active"))
      .first();
    return { enrolled: !!enrollment };
  },
});

export const getEnrollmentByUser = query({
  args: { user_id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("face_enrollments")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .filter((q) => q.eq(q.field("enrollment_status"), "active"))
      .first();
  },
});

export const isUserEnrolled = query({
  args: { user_id: v.id("users") },
  handler: async (ctx, args) => {
    const enrollment = await ctx.db
      .query("face_enrollments")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .filter((q) => q.eq(q.field("enrollment_status"), "active"))
      .first();
    return { enrolled: !!enrollment };
  },
});

// ── FR Clock-In / Clock-Out ──

/**
 * Helper: resolve stale shifts and check for pending/active shifts.
 * Reuses the same logic as timeAttendance.clockIn.
 */
async function resolveActiveShifts(ctx: any, opts: { barber_id?: any; user_id?: any }) {
  let autoClosedPreviousShift = false;
  let autoClosedShiftId = null;

  let activeShifts;
  if (opts.barber_id) {
    activeShifts = await ctx.db
      .query("timeAttendance")
      .withIndex("by_barber", (q: any) => q.eq("barber_id", opts.barber_id))
      .filter((q: any) => q.eq(q.field("clock_out"), undefined))
      .collect();
  } else {
    activeShifts = await ctx.db
      .query("timeAttendance")
      .withIndex("by_user", (q: any) => q.eq("user_id", opts.user_id))
      .filter((q: any) => q.eq(q.field("clock_out"), undefined))
      .collect();
  }

  for (const activeShift of activeShifts) {
    const status = effectiveStatus(activeShift);

    if (status === "pending_in") {
      throw new ConvexError({ code: "PENDING_REQUEST", message: "A pending clock-in request already exists." });
    }

    if (status === "approved_in") {
      const shiftAge = Date.now() - activeShift.clock_in;
      if (shiftAge > STALE_SHIFT_THRESHOLD_MS) {
        const shiftDatePHT = new Date(activeShift.clock_in + PHT_OFFSET_MS);
        const midnightPHT = new Date(Date.UTC(
          shiftDatePHT.getUTCFullYear(),
          shiftDatePHT.getUTCMonth(),
          shiftDatePHT.getUTCDate() + 1, 0, 0, 0, 0
        )).getTime() - PHT_OFFSET_MS;

        await ctx.db.patch(activeShift._id, { clock_out: midnightPHT, status: "approved_out" });
        autoClosedPreviousShift = true;
        autoClosedShiftId = activeShift._id;
      } else {
        // Return the active shift so clock-out can use it
        return { activeShift, autoClosedPreviousShift, autoClosedShiftId };
      }
    }
  }

  return { activeShift: null, autoClosedPreviousShift, autoClosedShiftId };
}

export const clockInWithFR = mutation({
  args: {
    barber_id: v.optional(v.id("barbers")),
    user_id: v.optional(v.id("users")),
    branch_id: v.id("branches"),
    confidence_score: v.number(),
    photo_storage_id: v.id("_storage"),
    liveness_passed: v.boolean(),
    device_fingerprint: v.optional(v.string()),
    geofence_passed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (!args.barber_id && !args.user_id) {
      throw new ConvexError({ code: "MISSING_ID", message: "Either barber_id or user_id must be provided." });
    }

    // Get branch config for thresholds
    const config = await ctx.db
      .query("attendance_config")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .first();

    const autoThreshold = config?.auto_approve_threshold ?? DEFAULT_AUTO_APPROVE;
    const reviewThreshold = config?.admin_review_threshold ?? DEFAULT_ADMIN_REVIEW;

    if (args.confidence_score < reviewThreshold) {
      throw new ConvexError({
        code: "LOW_CONFIDENCE",
        message: "Face recognition confidence too low. Please try again or use manual check-in.",
      });
    }

    // Validate person and branch
    if (args.barber_id) {
      const barber = await ctx.db.get(args.barber_id);
      if (!barber) throw new ConvexError({ code: "BARBER_NOT_FOUND", message: "Barber not found." });
    }
    if (args.user_id) {
      const user = await ctx.db.get(args.user_id);
      if (!user) throw new ConvexError({ code: "USER_NOT_FOUND", message: "User not found." });
    }
    const branch = await ctx.db.get(args.branch_id);
    if (!branch) throw new ConvexError({ code: "BRANCH_NOT_FOUND", message: "Branch not found." });

    // Resolve any active shifts (same logic as manual clockIn)
    const { activeShift, autoClosedPreviousShift, autoClosedShiftId } = await resolveActiveShifts(
      ctx,
      args.barber_id ? { barber_id: args.barber_id } : { user_id: args.user_id }
    );

    if (activeShift) {
      throw new ConvexError({ code: "ALREADY_CLOCKED_IN", message: "Already clocked in. Clock out first." });
    }

    const now = Date.now();
    const status = args.confidence_score >= autoThreshold ? "approved_in" : "pending_in";

    const insertData: any = {
      branch_id: args.branch_id,
      clock_in: now,
      status,
      created_at: now,
      confidence_score: args.confidence_score,
      photo_storage_id: args.photo_storage_id,
      liveness_passed: args.liveness_passed,
      device_fingerprint: args.device_fingerprint,
      method: "fr",
      geofence_passed: args.geofence_passed,
    };
    if (args.barber_id) insertData.barber_id = args.barber_id;
    if (args.user_id) insertData.user_id = args.user_id;

    const shiftId = await ctx.db.insert("timeAttendance", insertData);

    return {
      success: true,
      shiftId,
      clockInTime: now,
      status,
      autoApproved: status === "approved_in",
      autoClosedPreviousShift,
      autoClosedShiftId,
    };
  },
});

export const clockOutWithFR = mutation({
  args: {
    barber_id: v.optional(v.id("barbers")),
    user_id: v.optional(v.id("users")),
    confidence_score: v.number(),
    photo_storage_id: v.id("_storage"),
    liveness_passed: v.optional(v.boolean()),
    device_fingerprint: v.optional(v.string()),
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
      throw new ConvexError({ code: "MISSING_ID", message: "Either barber_id or user_id must be provided." });
    }

    const approvedShift = activeShifts.find((s: any) => effectiveStatus(s) === "approved_in");
    if (!approvedShift) {
      throw new ConvexError({ code: "NOT_CLOCKED_IN", message: "Not clocked in." });
    }

    // Check no pending_out
    const pendingOut = activeShifts.find((s: any) => s.status === "pending_out");
    if (pendingOut) {
      throw new ConvexError({ code: "PENDING_REQUEST", message: "Pending clock-out request exists." });
    }

    // Get config for threshold
    const config = await ctx.db
      .query("attendance_config")
      .withIndex("by_branch", (q) => q.eq("branch_id", approvedShift.branch_id))
      .first();
    const autoThreshold = config?.auto_approve_threshold ?? DEFAULT_AUTO_APPROVE;

    const now = Date.now();
    const status = args.confidence_score >= autoThreshold ? "approved_out" : "pending_out";

    await ctx.db.patch(approvedShift._id, {
      clock_out: now,
      status,
      confidence_score: args.confidence_score,
      photo_storage_id: args.photo_storage_id,
      liveness_passed: args.liveness_passed ?? true,
      device_fingerprint: args.device_fingerprint,
      method: "fr",
    });

    return {
      success: true,
      shiftId: approvedShift._id,
      clockOutTime: now,
      status,
      autoApproved: status === "approved_out",
      shiftDuration: now - approvedShift.clock_in,
    };
  },
});

export const clockInManualFallback = mutation({
  args: {
    barber_id: v.optional(v.id("barbers")),
    user_id: v.optional(v.id("users")),
    branch_id: v.id("branches"),
    photo_storage_id: v.optional(v.id("_storage")),
    device_fingerprint: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.barber_id && !args.user_id) {
      throw new ConvexError({ code: "MISSING_ID", message: "Either barber_id or user_id must be provided." });
    }

    if (args.barber_id) {
      const barber = await ctx.db.get(args.barber_id);
      if (!barber) throw new ConvexError({ code: "BARBER_NOT_FOUND", message: "Barber not found." });
    }
    if (args.user_id) {
      const user = await ctx.db.get(args.user_id);
      if (!user) throw new ConvexError({ code: "USER_NOT_FOUND", message: "User not found." });
    }
    const branch = await ctx.db.get(args.branch_id);
    if (!branch) throw new ConvexError({ code: "BRANCH_NOT_FOUND", message: "Branch not found." });

    const { activeShift, autoClosedPreviousShift, autoClosedShiftId } = await resolveActiveShifts(
      ctx,
      args.barber_id ? { barber_id: args.barber_id } : { user_id: args.user_id }
    );
    if (activeShift) {
      throw new ConvexError({ code: "ALREADY_CLOCKED_IN", message: "Already clocked in." });
    }

    const now = Date.now();
    const insertData: any = {
      branch_id: args.branch_id,
      clock_in: now,
      status: "pending_in",
      created_at: now,
      photo_storage_id: args.photo_storage_id,
      device_fingerprint: args.device_fingerprint,
      method: "pin",
    };
    if (args.barber_id) insertData.barber_id = args.barber_id;
    if (args.user_id) insertData.user_id = args.user_id;

    const shiftId = await ctx.db.insert("timeAttendance", insertData);

    return { success: true, shiftId, clockInTime: now, status: "pending_in", autoClosedPreviousShift, autoClosedShiftId };
  },
});

// ── Attendance Config ──

export const getAttendanceConfig = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("attendance_config")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .first();

    // Return with defaults
    return {
      fr_enabled: config?.fr_enabled ?? false,
      auto_approve_threshold: config?.auto_approve_threshold ?? DEFAULT_AUTO_APPROVE,
      admin_review_threshold: config?.admin_review_threshold ?? DEFAULT_ADMIN_REVIEW,
      liveness_required: config?.liveness_required ?? true,
      geofence_enabled: config?.geofence_enabled ?? false,
      geofence_lat: config?.geofence_lat,
      geofence_lng: config?.geofence_lng,
      geofence_radius_meters: config?.geofence_radius_meters ?? 100,
      device_lock_enabled: config?.device_lock_enabled ?? false,
      barber_overrides: config?.barber_overrides ?? [],
      staff_overrides: config?.staff_overrides ?? [],
      _id: config?._id,
    };
  },
});

export const isFREnabled = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("attendance_config")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .first();
    return { enabled: config?.fr_enabled ?? false };
  },
});

export const saveAttendanceConfig = mutation({
  args: {
    branch_id: v.id("branches"),
    fr_enabled: v.boolean(),
    auto_approve_threshold: v.optional(v.number()),
    admin_review_threshold: v.optional(v.number()),
    liveness_required: v.optional(v.boolean()),
    geofence_enabled: v.optional(v.boolean()),
    geofence_lat: v.optional(v.number()),
    geofence_lng: v.optional(v.number()),
    geofence_radius_meters: v.optional(v.number()),
    device_lock_enabled: v.optional(v.boolean()),
    barber_overrides: v.optional(v.array(v.object({
      barber_id: v.id("barbers"),
      fr_exempt: v.boolean(),
    }))),
    staff_overrides: v.optional(v.array(v.object({
      user_id: v.id("users"),
      fr_exempt: v.boolean(),
    }))),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("attendance_config")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updated_at: now,
      });
      return { success: true, configId: existing._id };
    }

    const id = await ctx.db.insert("attendance_config", {
      ...args,
      updated_at: now,
    });
    return { success: true, configId: id };
  },
});

// ── Device Management ──

export const getRegisteredDevices = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("attendance_devices")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();
  },
});

export const checkDeviceRegistered = query({
  args: {
    branch_id: v.id("branches"),
    device_fingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    const device = await ctx.db
      .query("attendance_devices")
      .withIndex("by_fingerprint", (q) => q.eq("device_fingerprint", args.device_fingerprint))
      .first();

    if (!device || !device.is_active || device.branch_id !== args.branch_id) {
      return { registered: false };
    }

    return { registered: true, device_name: device.device_name };
  },
});

export const registerDevice = mutation({
  args: {
    branch_id: v.id("branches"),
    device_fingerprint: v.string(),
    device_name: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if already registered
    const existing = await ctx.db
      .query("attendance_devices")
      .withIndex("by_fingerprint", (q) => q.eq("device_fingerprint", args.device_fingerprint))
      .first();

    if (existing) {
      // Reactivate if same branch
      if (existing.branch_id === args.branch_id) {
        await ctx.db.patch(existing._id, { is_active: true, device_name: args.device_name });
        return { success: true, deviceId: existing._id, reactivated: true };
      }
      throw new ConvexError({ code: "DEVICE_REGISTERED", message: "Device is registered to another branch." });
    }

    const id = await ctx.db.insert("attendance_devices", {
      branch_id: args.branch_id,
      device_fingerprint: args.device_fingerprint,
      device_name: args.device_name,
      is_active: true,
      registered_at: Date.now(),
    });
    return { success: true, deviceId: id };
  },
});

export const deactivateDevice = mutation({
  args: { device_id: v.id("attendance_devices") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.device_id, { is_active: false });
    return { success: true };
  },
});
