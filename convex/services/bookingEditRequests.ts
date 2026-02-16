/**
 * Booking Edit Requests Service
 *
 * Staff edits to bookings require branch_admin approval.
 * Flow:
 * 1. Staff edits a booking → creates a pending edit request (no direct update)
 * 2. Branch admin reviews the request (sees old → new diff)
 * 3. Approve → changes applied to booking + notifications sent
 * 4. Reject → reason sent to staff via notification
 *
 * Branch admins and above can still edit bookings directly.
 *
 * @module convex/services/bookingEditRequests
 */

import { mutation, query } from "../_generated/server";
import { v, ConvexError } from "convex/values";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get edit requests for a branch, optionally filtered by status
 */
export const getEditRequestsByBranch = query({
  args: {
    branch_id: v.id("branches"),
    status: v.optional(
      v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))
    ),
  },
  handler: async (ctx, args) => {
    let requests;
    if (args.status) {
      requests = await ctx.db
        .query("booking_edit_requests")
        .withIndex("by_branch_status", (q) =>
          q.eq("branch_id", args.branch_id).eq("status", args.status!)
        )
        .order("desc")
        .collect();
    } else {
      requests = await ctx.db
        .query("booking_edit_requests")
        .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
        .order("desc")
        .collect();
    }

    // Enrich with display names
    const enriched = await Promise.all(
      requests.map(async (req) => {
        const requester = await ctx.db.get(req.requested_by);
        const reviewer = req.reviewed_by ? await ctx.db.get(req.reviewed_by) : null;
        const booking = await ctx.db.get(req.booking_id);

        // Resolve service names from changes
        let oldServiceName, newServiceName;
        if (req.changes.service) {
          const oldSvc = await ctx.db.get(req.changes.service.old);
          const newSvc = await ctx.db.get(req.changes.service.new);
          oldServiceName = oldSvc?.name || "Unknown";
          newServiceName = newSvc?.name || "Unknown";
        }

        // Resolve barber names from changes
        let oldBarberName, newBarberName;
        if (req.changes.barber) {
          if (req.changes.barber.old) {
            const oldBarber = await ctx.db.get(req.changes.barber.old);
            oldBarberName = oldBarber?.name || "Unassigned";
          } else {
            oldBarberName = "Unassigned";
          }
          if (req.changes.barber.new) {
            const newBarber = await ctx.db.get(req.changes.barber.new);
            newBarberName = newBarber?.name || "Unassigned";
          } else {
            newBarberName = "Unassigned";
          }
        }

        return {
          ...req,
          requester_name: requester?.username || requester?.nickname || "Unknown",
          reviewer_name: reviewer?.username || reviewer?.nickname || null,
          customer_name: booking?.customer_name || "Walk-in",
          old_service_name: oldServiceName,
          new_service_name: newServiceName,
          old_barber_name: oldBarberName,
          new_barber_name: newBarberName,
        };
      })
    );

    return enriched;
  },
});

/**
 * Count pending edit requests for a branch (for badge display)
 */
export const getPendingCount = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    const pending = await ctx.db
      .query("booking_edit_requests")
      .withIndex("by_branch_status", (q) =>
        q.eq("branch_id", args.branch_id).eq("status", "pending")
      )
      .collect();
    return pending.length;
  },
});

/**
 * Get edit requests for a specific booking
 */
export const getEditRequestsByBooking = query({
  args: { booking_id: v.id("bookings") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("booking_edit_requests")
      .withIndex("by_booking", (q) => q.eq("booking_id", args.booking_id))
      .order("desc")
      .collect();
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Submit an edit request (staff only — branch admins edit directly)
 */
export const submitEditRequest = mutation({
  args: {
    booking_id: v.id("bookings"),
    requested_by: v.id("users"),
    reason: v.string(),
    service: v.optional(v.id("services")),
    barber: v.optional(v.id("barbers")),
    clear_barber: v.optional(v.boolean()),
    date: v.optional(v.string()),
    time: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // 1. Validate booking exists and is editable
    const booking = await ctx.db.get(args.booking_id);
    if (!booking) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Booking not found" });
    }
    if (booking.status === "cancelled" || booking.status === "completed") {
      throw new ConvexError({
        code: "INVALID_STATE",
        message: "Cannot edit a cancelled or completed booking",
      });
    }

    // 2. Block duplicate pending requests
    const existingPending = await ctx.db
      .query("booking_edit_requests")
      .withIndex("by_booking", (q) => q.eq("booking_id", args.booking_id))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();
    if (existingPending) {
      throw new ConvexError({
        code: "DUPLICATE",
        message: "This booking already has a pending edit request. Please wait for it to be reviewed.",
      });
    }

    // 3. Validate referenced entities
    if (args.service) {
      const svc = await ctx.db.get(args.service);
      if (!svc) throw new ConvexError({ code: "NOT_FOUND", message: "Service not found" });
    }
    if (args.barber) {
      const barber = await ctx.db.get(args.barber);
      if (!barber) throw new ConvexError({ code: "NOT_FOUND", message: "Barber not found" });
    }

    // 4. Build changes diff — only include fields that actually changed
    const changes: Record<string, any> = {};
    const changedFields: string[] = [];

    if (args.service && args.service !== booking.service) {
      changes.service = { old: booking.service, new: args.service };
      changedFields.push("Service");
    }

    if (args.clear_barber && booking.barber) {
      changes.barber = { old: booking.barber, new: undefined };
      changedFields.push("Barber");
    } else if (args.barber && args.barber !== booking.barber) {
      changes.barber = { old: booking.barber || undefined, new: args.barber };
      changedFields.push("Barber");
    }

    if (args.date && args.date !== booking.date) {
      changes.date = { old: booking.date, new: args.date };
      changedFields.push("Date");
    }

    if (args.time && args.time !== booking.time) {
      changes.time = { old: booking.time, new: args.time };
      changedFields.push("Time");
    }

    if (args.notes !== undefined && args.notes !== (booking.notes || "")) {
      changes.notes = { old: booking.notes || undefined, new: args.notes || undefined };
      changedFields.push("Notes");
    }

    // 5. Error if nothing changed
    if (changedFields.length === 0) {
      throw new ConvexError({ code: "NO_CHANGES", message: "No changes were made to the booking" });
    }

    const change_summary = changedFields.join(", ");

    // 6. Insert edit request
    const editRequestId = await ctx.db.insert("booking_edit_requests", {
      booking_id: args.booking_id,
      booking_code: booking.booking_code,
      branch_id: booking.branch_id,
      changes,
      change_summary,
      reason: args.reason,
      status: "pending",
      requested_by: args.requested_by,
      requested_at: now,
      createdAt: now,
      updatedAt: now,
    });

    // 7. Notify branch admin
    const requester = await ctx.db.get(args.requested_by);
    const requesterName = requester?.username || requester?.nickname || "Staff";

    await ctx.db.insert("notifications", {
      title: "Booking Edit Request",
      message: `${requesterName} requested changes to booking #${booking.booking_code} — ${change_summary}`,
      type: "alert",
      priority: "medium",
      recipient_type: "admin",
      branch_id: booking.branch_id,
      is_read: false,
      is_archived: false,
      action_label: "Review Request",
      metadata: {
        edit_request_id: editRequestId,
        booking_code: booking.booking_code,
        change_summary,
      },
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, editRequestId };
  },
});

/**
 * Approve an edit request — applies changes to the booking
 */
export const approveEditRequest = mutation({
  args: {
    edit_request_id: v.id("booking_edit_requests"),
    approved_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // 1. Validate request
    const editRequest = await ctx.db.get(args.edit_request_id);
    if (!editRequest) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Edit request not found" });
    }
    if (editRequest.status !== "pending") {
      throw new ConvexError({
        code: "INVALID_STATE",
        message: `This request has already been ${editRequest.status}`,
      });
    }

    // 2. Re-validate booking
    const booking = await ctx.db.get(editRequest.booking_id);
    if (!booking) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Booking no longer exists" });
    }
    if (booking.status === "cancelled" || booking.status === "completed") {
      // Auto-reject since booking is no longer editable
      await ctx.db.patch(args.edit_request_id, {
        status: "rejected",
        reviewed_by: args.approved_by,
        reviewed_at: now,
        rejection_reason: "Booking was already " + booking.status,
        updatedAt: now,
      });
      throw new ConvexError({
        code: "INVALID_STATE",
        message: `Booking has been ${booking.status} since the edit was requested. Request auto-rejected.`,
      });
    }

    // 3. Build update patch from changes
    const updates: Record<string, any> = { updatedAt: now };
    const changes = editRequest.changes;

    if (changes.service) {
      updates.service = changes.service.new;
      // Update booking price to match new service
      const newService = await ctx.db.get(changes.service.new);
      if (newService) {
        updates.price = newService.price;
        const discountAmount = booking.discount_amount || 0;
        const newFinalPrice = Math.max(0, newService.price - discountAmount);
        updates.final_price = newFinalPrice;

        // Adjust payment_status if customer already paid and new price differs
        const amountPaid = booking.amount_paid;
        if (amountPaid !== undefined && amountPaid > 0) {
          if (newFinalPrice > amountPaid) {
            updates.payment_status = "partial";
          } else {
            updates.payment_status = "paid";
          }
        }
      }
    }
    if (changes.barber) updates.barber = changes.barber.new;
    if (changes.date) updates.date = changes.date.new;
    if (changes.time) updates.time = changes.time.new;
    if (changes.notes) updates.notes = changes.notes.new;

    // 4. Apply changes to booking
    await ctx.db.patch(editRequest.booking_id, updates);

    // 5. Update edit request status
    await ctx.db.patch(args.edit_request_id, {
      status: "approved",
      reviewed_by: args.approved_by,
      reviewed_at: now,
      updatedAt: now,
    });

    // 6. Notify requesting staff
    await ctx.db.insert("notifications", {
      title: "Edit Request Approved",
      message: `Your edit request for booking #${editRequest.booking_code} has been approved and applied.`,
      type: "booking",
      priority: "medium",
      recipient_id: editRequest.requested_by,
      recipient_type: "staff",
      branch_id: editRequest.branch_id,
      is_read: false,
      is_archived: false,
      metadata: {
        edit_request_id: args.edit_request_id,
        booking_code: editRequest.booking_code,
      },
      createdAt: now,
      updatedAt: now,
    });

    // 7. Send reschedule notifications if date/time changed
    if (changes.date || changes.time) {
      try {
        const { api } = require("../_generated/api");
        const recipients: Array<{ type: "customer" | "staff" | "barber" | "admin"; userId?: any; branchId?: any }> = [];

        if (booking.customer) {
          recipients.push({ type: "customer", userId: booking.customer });
        }
        recipients.push({ type: "staff", branchId: booking.branch_id });

        await ctx.runMutation(api.services.bookingNotifications.sendBookingNotifications, {
          bookingId: editRequest.booking_id,
          notificationType: "CUSTOMER_BOOKING_RESCHEDULED",
          recipients,
          metadata: {
            new_date: changes.date?.new || booking.date,
            new_time: changes.time?.new || booking.time,
          },
        });
      } catch (error) {
        console.error("Failed to send reschedule notifications:", error);
      }
    }

    return { success: true };
  },
});

/**
 * Reject an edit request with a reason
 */
export const rejectEditRequest = mutation({
  args: {
    edit_request_id: v.id("booking_edit_requests"),
    rejected_by: v.id("users"),
    rejection_reason: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // 1. Validate request
    const editRequest = await ctx.db.get(args.edit_request_id);
    if (!editRequest) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Edit request not found" });
    }
    if (editRequest.status !== "pending") {
      throw new ConvexError({
        code: "INVALID_STATE",
        message: `This request has already been ${editRequest.status}`,
      });
    }

    // 2. Update request status
    await ctx.db.patch(args.edit_request_id, {
      status: "rejected",
      reviewed_by: args.rejected_by,
      reviewed_at: now,
      rejection_reason: args.rejection_reason,
      updatedAt: now,
    });

    // 3. Notify requesting staff
    await ctx.db.insert("notifications", {
      title: "Edit Request Rejected",
      message: `Your edit request for booking #${editRequest.booking_code} was rejected. Reason: ${args.rejection_reason}`,
      type: "alert",
      priority: "medium",
      recipient_id: editRequest.requested_by,
      recipient_type: "staff",
      branch_id: editRequest.branch_id,
      is_read: false,
      is_archived: false,
      metadata: {
        edit_request_id: args.edit_request_id,
        booking_code: editRequest.booking_code,
        rejection_reason: args.rejection_reason,
      },
      createdAt: now,
      updatedAt: now,
    });

    return { success: true };
  },
});
