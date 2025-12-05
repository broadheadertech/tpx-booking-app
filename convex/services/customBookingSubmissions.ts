import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

// Helper: get current user by session token
async function getUserBySession(ctx: any, sessionToken: string) {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", sessionToken))
    .first();
  if (!session || session.expiresAt < Date.now()) return null;
  const user = await ctx.db.get(session.userId);
  return user || null;
}

// Generate booking code for reference
function generateBookingCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'CB'; // Custom Booking prefix
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Get all submissions (super admin)
export const getAllSubmissions = query({
  args: {},
  handler: async (ctx) => {
    const submissions = await ctx.db
      .query("custom_booking_submissions")
      .order("desc")
      .collect();

    const enriched = await Promise.all(
      submissions.map(async (sub) => {
        const [barber, branch, form, handledBy] = await Promise.all([
          ctx.db.get(sub.barber_id),
          ctx.db.get(sub.branch_id),
          ctx.db.get(sub.form_id),
          sub.handled_by ? ctx.db.get(sub.handled_by) : null,
        ]);

        return {
          ...sub,
          barber_name: barber?.full_name || "Unknown",
          branch_name: branch?.name || "Unknown",
          form_title: form?.title || "Unknown Form",
          form_fields: form?.fields || [],
          handled_by_name: handledBy?.nickname || handledBy?.email,
        };
      })
    );

    return enriched;
  },
});

// Get submissions by branch
export const getSubmissionsByBranch = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    const submissions = await ctx.db
      .query("custom_booking_submissions")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .order("desc")
      .collect();

    const enriched = await Promise.all(
      submissions.map(async (sub) => {
        const [barber, form, handledBy] = await Promise.all([
          ctx.db.get(sub.barber_id),
          ctx.db.get(sub.form_id),
          sub.handled_by ? ctx.db.get(sub.handled_by) : null,
        ]);

        return {
          ...sub,
          barber_name: barber?.full_name || "Unknown",
          form_title: form?.title || "Unknown Form",
          form_fields: form?.fields || [],
          handled_by_name: handledBy?.nickname || handledBy?.email,
        };
      })
    );

    return enriched;
  },
});

// Get submissions by barber
export const getSubmissionsByBarber = query({
  args: { barber_id: v.id("barbers") },
  handler: async (ctx, args) => {
    const submissions = await ctx.db
      .query("custom_booking_submissions")
      .withIndex("by_barber", (q) => q.eq("barber_id", args.barber_id))
      .order("desc")
      .collect();

    const enriched = await Promise.all(
      submissions.map(async (sub) => {
        const [form, handledBy] = await Promise.all([
          ctx.db.get(sub.form_id),
          sub.handled_by ? ctx.db.get(sub.handled_by) : null,
        ]);

        return {
          ...sub,
          form_title: form?.title || "Unknown Form",
          form_fields: form?.fields || [],
          handled_by_name: handledBy?.nickname || handledBy?.email,
        };
      })
    );

    return enriched;
  },
});

// Get submission by ID
export const getSubmissionById = query({
  args: { id: v.id("custom_booking_submissions") },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.id);
    if (!submission) return null;

    const [barber, branch, form, handledBy, booking] = await Promise.all([
      ctx.db.get(submission.barber_id),
      ctx.db.get(submission.branch_id),
      ctx.db.get(submission.form_id),
      submission.handled_by ? ctx.db.get(submission.handled_by) : null,
      submission.booking_id ? ctx.db.get(submission.booking_id) : null,
    ]);

    return {
      ...submission,
      barber_name: barber?.full_name || "Unknown",
      barber_avatar: barber?.avatar,
      branch_name: branch?.name || "Unknown",
      form_title: form?.title || "Unknown Form",
      form_fields: form?.fields || [],
      handled_by_name: handledBy?.nickname || handledBy?.email,
      booking_code: booking?.booking_code,
    };
  },
});

// Get pending submissions count
export const getPendingCount = query({
  args: { branch_id: v.optional(v.id("branches")) },
  handler: async (ctx, args) => {
    let submissions;

    if (args.branch_id) {
      submissions = await ctx.db
        .query("custom_booking_submissions")
        .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
        .filter((q) => q.eq(q.field("status"), "pending"))
        .collect();
    } else {
      submissions = await ctx.db
        .query("custom_booking_submissions")
        .withIndex("by_status", (q) => q.eq("status", "pending"))
        .collect();
    }

    return submissions.length;
  },
});

// Submit custom booking form (customer-facing, no auth required)
export const submitForm = mutation({
  args: {
    form_id: v.id("custom_booking_forms"),
    customer_name: v.string(),
    customer_email: v.optional(v.string()),
    customer_phone: v.optional(v.string()),
    responses: v.any(), // Object with field_id -> response
  },
  handler: async (ctx, args) => {
    const form = await ctx.db.get(args.form_id);
    if (!form) throw new Error("Form not found");
    if (form.status !== "active") throw new Error("This form is not accepting submissions");

    const barber = await ctx.db.get(form.barber_id);
    if (!barber || !barber.custom_booking_enabled) {
      throw new Error("Custom booking is not enabled for this barber");
    }

    const branch = await ctx.db.get(form.branch_id);

    // Validate required fields
    for (const field of form.fields) {
      if (field.required) {
        const response = args.responses[field.id];
        if (response === undefined || response === null || response === "" ||
            (Array.isArray(response) && response.length === 0)) {
          throw new Error(`${field.label} is required`);
        }
      }
    }

    const now = Date.now();
    const bookingCode = generateBookingCode();

    // Create a reference booking in the bookings table
    // This is for tracking and transaction purposes
    const bookingId = await ctx.db.insert("bookings", {
      booking_code: bookingCode,
      branch_id: form.branch_id,
      customer: undefined, // No user account for custom bookings initially
      customer_name: args.customer_name,
      customer_email: args.customer_email,
      customer_phone: args.customer_phone,
      service: barber.services[0] || form.branch_id as any, // Use first service or placeholder
      barber: form.barber_id,
      date: new Date().toISOString().split('T')[0], // Today as placeholder
      time: "00:00", // Placeholder
      status: "pending",
      payment_status: "unpaid",
      price: 0, // Will be determined after contact
      notes: `Custom Booking Form: ${form.title}`,
      createdAt: now,
      updatedAt: now,
    });

    // Create the submission
    const submissionId = await ctx.db.insert("custom_booking_submissions", {
      form_id: args.form_id,
      barber_id: form.barber_id,
      branch_id: form.branch_id,
      booking_id: bookingId,
      customer_name: args.customer_name,
      customer_email: args.customer_email,
      customer_phone: args.customer_phone,
      responses: args.responses,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    // Send in-app notification to barber
    if (barber.user) {
      await ctx.db.insert("notifications", {
        title: "New Custom Booking Request",
        message: `${args.customer_name} submitted a custom booking request via "${form.title}".`,
        type: "booking",
        priority: "high",
        recipient_id: barber.user,
        recipient_type: "barber",
        branch_id: form.branch_id,
        is_read: false,
        is_archived: false,
        action_url: `/staff/custom-bookings`,
        action_label: "View Request",
        metadata: {
          submission_id: submissionId,
          booking_code: bookingCode,
          customer_name: args.customer_name,
          customer_email: args.customer_email,
          customer_phone: args.customer_phone,
          form_title: form.title,
        },
        createdAt: now,
        updatedAt: now,
      });
    }

    // Send notification to branch admins
    const branchAdmins = await ctx.db
      .query("users")
      .withIndex("by_branch_role", (q) =>
        q.eq("branch_id", form.branch_id).eq("role", "branch_admin")
      )
      .filter((q) => q.eq(q.field("is_active"), true))
      .collect();

    for (const admin of branchAdmins) {
      await ctx.db.insert("notifications", {
        title: "New Custom Booking Request",
        message: `${args.customer_name} submitted a custom booking for ${barber.full_name} via "${form.title}".`,
        type: "booking",
        priority: "medium",
        recipient_id: admin._id,
        recipient_type: "admin",
        branch_id: form.branch_id,
        is_read: false,
        is_archived: false,
        action_url: `/staff/custom-bookings`,
        action_label: "View Request",
        metadata: {
          submission_id: submissionId,
          booking_code: bookingCode,
          customer_name: args.customer_name,
          barber_name: barber.full_name,
          form_title: form.title,
        },
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      submission_id: submissionId,
      booking_code: bookingCode,
      branch_name: branch?.name || "Unknown",
      barber_name: barber.full_name,
      form_title: form.title,
    };
  },
});

// Status messages for customer notifications
const STATUS_MESSAGES = {
  contacted: {
    title: "We've Received Your Request",
    message: "Our team has reviewed your booking request and will contact you shortly to discuss the details.",
  },
  confirmed: {
    title: "Booking Confirmed!",
    message: "Great news! Your booking has been confirmed. We look forward to seeing you!",
  },
  completed: {
    title: "Thank You for Your Visit",
    message: "Thank you for choosing us. We hope you enjoyed your experience!",
  },
  cancelled: {
    title: "Booking Cancelled",
    message: "Your booking request has been cancelled. If you have any questions, please contact us.",
  },
};

// Update submission status (staff action)
export const updateStatus = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("custom_booking_submissions"),
    status: v.union(
      v.literal("pending"),
      v.literal("contacted"),
      v.literal("confirmed"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken);
    if (!user) throw new Error("Unauthorized");

    const submission = await ctx.db.get(args.id);
    if (!submission) throw new Error("Submission not found");

    // Check permissions
    const isSuperAdmin = user.role === "super_admin";
    const isBranchAdmin = user.role === "branch_admin" && String(user.branch_id) === String(submission.branch_id);
    const isStaff = user.role === "staff" && String(user.branch_id) === String(submission.branch_id);
    if (!isSuperAdmin && !isBranchAdmin && !isStaff) {
      throw new Error("Permission denied");
    }

    // Get form and barber details for notification
    const [form, barber, branch] = await Promise.all([
      ctx.db.get(submission.form_id),
      ctx.db.get(submission.barber_id),
      ctx.db.get(submission.branch_id),
    ]);

    const now = Date.now();
    const updates: any = {
      status: args.status,
      handled_by: user._id,
      updatedAt: now,
    };

    if (args.notes !== undefined) {
      updates.notes = args.notes;
    }

    // Track status change timestamps
    if (args.status === "contacted" && !submission.contacted_at) {
      updates.contacted_at = now;
    }
    if (args.status === "confirmed" && !submission.confirmed_at) {
      updates.confirmed_at = now;
    }
    if (args.status === "completed" && !submission.completed_at) {
      updates.completed_at = now;
    }

    await ctx.db.patch(args.id, updates);

    // Update the reference booking status as well
    let bookingCode = "";
    if (submission.booking_id) {
      let bookingStatus: "pending" | "booked" | "confirmed" | "completed" | "cancelled" = "pending";
      if (args.status === "contacted") bookingStatus = "booked";
      if (args.status === "confirmed") bookingStatus = "confirmed";
      if (args.status === "completed") bookingStatus = "completed";
      if (args.status === "cancelled") bookingStatus = "cancelled";

      await ctx.db.patch(submission.booking_id, {
        status: bookingStatus,
        updatedAt: now,
      });

      const booking = await ctx.db.get(submission.booking_id);
      bookingCode = booking?.booking_code || "";
    }

    // Store customer notification data for email sending (will be picked up by email service)
    // This creates a record that can trigger email notifications
    if (args.status !== "pending" && submission.customer_email) {
      const statusMsg = STATUS_MESSAGES[args.status as keyof typeof STATUS_MESSAGES];
      if (statusMsg) {
        await ctx.db.insert("notifications", {
          title: statusMsg.title,
          message: `${statusMsg.message} Reference: ${bookingCode}`,
          type: "booking",
          priority: args.status === "cancelled" ? "high" : "medium",
          recipient_id: undefined, // No user account for custom booking customers
          recipient_type: "customer",
          branch_id: submission.branch_id,
          is_read: false,
          is_archived: false,
          action_url: `/track/${bookingCode}`,
          action_label: "Track Booking",
          metadata: {
            submission_id: args.id,
            booking_code: bookingCode,
            customer_name: submission.customer_name,
            customer_email: submission.customer_email,
            customer_phone: submission.customer_phone,
            barber_name: barber?.full_name || "Unknown",
            branch_name: branch?.name || "Unknown",
            form_title: form?.title || "Custom Booking",
            status: args.status,
            requires_email: true, // Flag for email service to pick up
          },
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return {
      id: args.id,
      status: args.status,
      booking_code: bookingCode,
      customer_email: submission.customer_email,
    };
  },
});

// Add notes to submission
export const addNotes = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("custom_booking_submissions"),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken);
    if (!user) throw new Error("Unauthorized");

    const submission = await ctx.db.get(args.id);
    if (!submission) throw new Error("Submission not found");

    // Check permissions
    const isSuperAdmin = user.role === "super_admin";
    const isBranchAdmin = user.role === "branch_admin" && String(user.branch_id) === String(submission.branch_id);
    const isStaff = user.role === "staff" && String(user.branch_id) === String(submission.branch_id);
    if (!isSuperAdmin && !isBranchAdmin && !isStaff) {
      throw new Error("Permission denied");
    }

    const existingNotes = submission.notes || "";
    const timestamp = new Date().toLocaleString();
    const newNotes = existingNotes
      ? `${existingNotes}\n\n[${timestamp} - ${user.nickname || user.email}]\n${args.notes}`
      : `[${timestamp} - ${user.nickname || user.email}]\n${args.notes}`;

    await ctx.db.patch(args.id, {
      notes: newNotes,
      handled_by: user._id,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

// Convert submission to regular booking with confirmed details
export const convertToBooking = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("custom_booking_submissions"),
    service_id: v.id("services"),
    date: v.string(),
    time: v.string(),
    price: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken);
    if (!user) throw new Error("Unauthorized");

    const submission = await ctx.db.get(args.id);
    if (!submission) throw new Error("Submission not found");

    // Check permissions
    const isSuperAdmin = user.role === "super_admin";
    const isBranchAdmin = user.role === "branch_admin" && String(user.branch_id) === String(submission.branch_id);
    if (!isSuperAdmin && !isBranchAdmin) {
      throw new Error("Permission denied");
    }

    const service = await ctx.db.get(args.service_id);
    if (!service) throw new Error("Service not found");

    const now = Date.now();

    // Update the reference booking with actual details
    if (submission.booking_id) {
      await ctx.db.patch(submission.booking_id, {
        service: args.service_id,
        date: args.date,
        time: args.time,
        price: args.price || service.price,
        status: "confirmed",
        updatedAt: now,
      });
    }

    // Update submission status
    await ctx.db.patch(args.id, {
      status: "confirmed",
      confirmed_at: now,
      handled_by: user._id,
      updatedAt: now,
    });

    return submission.booking_id;
  },
});

// Delete submission
export const deleteSubmission = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("custom_booking_submissions"),
  },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken);
    if (!user) throw new Error("Unauthorized");

    const submission = await ctx.db.get(args.id);
    if (!submission) throw new Error("Submission not found");

    // Check permissions (only super admin and branch admin can delete)
    const isSuperAdmin = user.role === "super_admin";
    const isBranchAdmin = user.role === "branch_admin" && String(user.branch_id) === String(submission.branch_id);
    if (!isSuperAdmin && !isBranchAdmin) {
      throw new Error("Permission denied");
    }

    // Optionally delete the reference booking
    if (submission.booking_id) {
      const booking = await ctx.db.get(submission.booking_id);
      if (booking && booking.status === "pending") {
        await ctx.db.delete(submission.booking_id);
      }
    }

    await ctx.db.delete(args.id);

    return true;
  },
});

// Get submission by booking code (for customer tracking page)
export const getSubmissionByBookingCode = query({
  args: { booking_code: v.string() },
  handler: async (ctx, args) => {
    // First find the booking by code
    const booking = await ctx.db
      .query("bookings")
      .withIndex("by_booking_code", (q) => q.eq("booking_code", args.booking_code))
      .first();

    if (!booking) return null;

    // Find the submission linked to this booking
    const submission = await ctx.db
      .query("custom_booking_submissions")
      .filter((q) => q.eq(q.field("booking_id"), booking._id))
      .first();

    if (!submission) return null;

    // Enrich with related data
    const [barber, branch, form] = await Promise.all([
      ctx.db.get(submission.barber_id),
      ctx.db.get(submission.branch_id),
      ctx.db.get(submission.form_id),
    ]);

    return {
      ...submission,
      booking_code: booking.booking_code,
      barber_name: barber?.full_name || "Unknown",
      branch_name: branch?.name || "Unknown",
      form_title: form?.title || "Custom Booking",
      form_fields: form?.fields || [],
    };
  },
});

// Get submission statistics
export const getStatistics = query({
  args: { branch_id: v.optional(v.id("branches")) },
  handler: async (ctx, args) => {
    let submissions;

    if (args.branch_id) {
      submissions = await ctx.db
        .query("custom_booking_submissions")
        .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
        .collect();
    } else {
      submissions = await ctx.db.query("custom_booking_submissions").collect();
    }

    const stats = {
      total: submissions.length,
      pending: submissions.filter((s) => s.status === "pending").length,
      contacted: submissions.filter((s) => s.status === "contacted").length,
      confirmed: submissions.filter((s) => s.status === "confirmed").length,
      completed: submissions.filter((s) => s.status === "completed").length,
      cancelled: submissions.filter((s) => s.status === "cancelled").length,
    };

    // Calculate conversion rate
    stats.conversionRate = stats.total > 0
      ? ((stats.confirmed + stats.completed) / stats.total) * 100
      : 0;

    return stats;
  },
});
