import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { api } from "../_generated/api";
import { throwUserError, ERROR_CODES, validateInput } from "../utils/errors";
import { getCurrentUser } from "../lib/clerkAuth";
import type { Id } from "../_generated/dataModel";
import { logAudit } from "./auditLogs";

// ============================================================================
// SECURE CUSTOMER QUERIES (Story 13-7: Customer Booking Self-Service)
// ============================================================================

/**
 * Get the current customer's bookings
 * Automatically filters to only show bookings where the authenticated user is the customer
 * No customerId parameter needed - uses the authenticated user
 */
export const getMyBookings = query({
  args: {
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("no_show")
    )),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      return [];
    }

    const userEmail = user.email?.toLowerCase();
    const limit = args.limit || 50;

    // Get bookings by customer ID
    let bookings = await ctx.db
      .query("bookings")
      .withIndex("by_customer", (q) => q.eq("customer", user._id))
      .order("desc")
      .take(limit);

    // Also get bookings by email (for custom bookings where customer ID is not set)
    if (userEmail) {
      const customBookings = await ctx.db
        .query("bookings")
        .filter((q) =>
          q.and(
            q.eq(q.field("customer"), undefined),
            q.eq(q.field("customer_email"), userEmail)
          )
        )
        .take(limit);

      // Merge and deduplicate
      const bookingIds = new Set(bookings.map((b) => b._id.toString()));
      bookings = [
        ...bookings,
        ...customBookings.filter((b) => !bookingIds.has(b._id.toString())),
      ];
    }

    // Filter by status if provided
    if (args.status) {
      bookings = bookings.filter((b) => b.status === args.status);
    }

    // Get associated data
    const bookingsWithData = await Promise.all(
      bookings.map(async (booking) => {
        const [service, barber, branch] = await Promise.all([
          ctx.db.get(booking.service),
          booking.barber ? ctx.db.get(booking.barber) : null,
          ctx.db.get(booking.branch_id),
        ]);

        return {
          _id: booking._id,
          booking_code: booking.booking_code,
          branch_id: booking.branch_id,
          date: booking.date,
          time: booking.time,
          status: booking.status,
          price: booking.price,
          final_price: booking.final_price,
          payment_status: booking.payment_status,
          payment_method: booking.payment_method,
          payment_type: booking.payment_type,
          booking_fee: booking.booking_fee || 0,
          discount_amount: booking.discount_amount || 0,
          convenience_fee_paid: booking.convenience_fee_paid || 0,
          amount_paid: booking.amount_paid || 0,
          service_price: booking.price || service?.price || 0,
          serviceName: service?.name || "Unknown Service",
          serviceDuration: service?.duration_minutes || 30,
          barberName: barber?.full_name || "Any Available",
          branchName: branch?.name || "Unknown Branch",
          branchPhone: branch?.phone,
          createdAt: booking.createdAt,
          // Include full objects for rebook functionality
          service: service ? {
            _id: service._id,
            name: service.name,
            price: service.price,
            duration: service.duration_minutes || 30,
          } : null,
          barber: barber ? barber._id : null,
          branch: branch ? {
            _id: branch._id,
            name: branch.name,
            phone: branch.phone,
          } : null,
        };
      })
    );

    // Sort by date descending
    return bookingsWithData.sort((a, b) => {
      const dateA = new Date(`${a.date} ${a.time}`).getTime();
      const dateB = new Date(`${b.date} ${b.time}`).getTime();
      return dateB - dateA;
    });
  },
});

/**
 * Check if a booking can be cancelled (within cancellation window)
 * Returns { canCancel: boolean, reason?: string }
 */
export const checkCancellationEligibility = query({
  args: {
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      return { canCancel: false, reason: "Not authenticated" };
    }

    const booking = await ctx.db.get(args.bookingId);

    if (!booking) {
      return { canCancel: false, reason: "Booking not found" };
    }

    // Verify the booking belongs to this user
    const userEmail = user.email?.toLowerCase();
    const isOwner =
      booking.customer === user._id ||
      (booking.customer_email?.toLowerCase() === userEmail && !booking.customer);

    if (!isOwner) {
      return { canCancel: false, reason: "Not authorized" };
    }

    // Check if already cancelled
    if (booking.status === "cancelled") {
      return { canCancel: false, reason: "Booking is already cancelled" };
    }

    // Check if already completed
    if (booking.status === "completed") {
      return { canCancel: false, reason: "Booking is already completed" };
    }

    // Check cancellation window (default 2 hours)
    const bookingDateTime = new Date(`${booking.date}T${booking.time}`);
    const now = new Date();
    const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Get branch for custom cancellation window (if configured)
    const branch = await ctx.db.get(booking.branch_id);
    const cancellationWindowHours = 2; // Default 2 hours, could be configurable per branch

    if (hoursUntilBooking < cancellationWindowHours) {
      return {
        canCancel: false,
        reason: `Cancellations must be made at least ${cancellationWindowHours} hours before your appointment`,
      };
    }

    return { canCancel: true };
  },
});

// ============================================================================
// EXISTING FUNCTIONS
// ============================================================================

// Generate booking code
function generateBookingCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Get all bookings - with pagination
export const getAllBookings = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50; // Default to 50 records per page

    const bookings = await ctx.db
      .query("bookings")
      .order("desc")
      .take(limit + 1);

    const hasMore = bookings.length > limit;
    const results = hasMore ? bookings.slice(0, limit) : bookings;
    const nextCursor = hasMore && results.length > 0 ? results[results.length - 1]._id : null;

    // Get associated data for each booking with error handling
    const bookingsWithData = await Promise.all(
      results.map(async (booking) => {
        try {
          const [customer, service, barber, branch] = await Promise.all([
            booking.customer ? ctx.db.get(booking.customer) : null,
            booking.service ? ctx.db.get(booking.service) : null,
            booking.barber ? ctx.db.get(booking.barber) : null,
            booking.branch_id ? ctx.db.get(booking.branch_id) : null,
          ]);

          return {
            _id: booking._id,
            booking_code: booking.booking_code,
            branch_id: booking.branch_id,
            customer: booking.customer,
            service: booking.service,
            barber: booking.barber,
            date: booking.date,
            time: booking.time,
            status: booking.status,
            payment_status: booking.payment_status,
            payment_method: booking.payment_method,
            price: booking.price,
            final_price: booking.final_price,
            discount_amount: booking.discount_amount,
            voucher_id: booking.voucher_id,
            notes: booking.notes,
            booking_fee: booking.booking_fee || 0,
            convenience_fee_paid: booking.convenience_fee_paid || 0,
            cash_collected: booking.cash_collected || 0,
            late_fee: booking.late_fee || 0,
            createdAt: booking.createdAt || booking._creationTime,
            updatedAt: booking.updatedAt || booking._creationTime,
            customer_name: booking.customer_name || customer?.username || customer?.nickname || 'Unknown',
            customer_email: booking.customer_email || customer?.email || '',
            customer_phone: booking.customer_phone || customer?.mobile_number || '',
            service_name: service?.name || 'Unknown Service',
            service_price: booking.price || service?.price || 0,
            service_duration: service?.duration_minutes || 0,
            barber_name: barber?.full_name || 'Not assigned',
            branch_name: branch?.name || 'Unknown Branch',
            formattedDate: new Date(booking.date).toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            }),
            formattedTime: formatTime(booking.time),
          };
        } catch (error) {
          // Return minimal booking data if lookup fails
          return {
            _id: booking._id,
            booking_code: booking.booking_code,
            branch_id: booking.branch_id,
            customer: booking.customer,
            service: booking.service,
            barber: booking.barber,
            date: booking.date,
            time: booking.time,
            status: booking.status,
            payment_status: booking.payment_status,
            payment_method: booking.payment_method,
            price: booking.price,
            final_price: booking.final_price,
            discount_amount: booking.discount_amount,
            voucher_id: booking.voucher_id,
            notes: booking.notes,
            booking_fee: booking.booking_fee || 0,
            convenience_fee_paid: booking.convenience_fee_paid || 0,
            cash_collected: booking.cash_collected || 0,
            late_fee: booking.late_fee || 0,
            createdAt: booking.createdAt || booking._creationTime,
            updatedAt: booking.updatedAt || booking._creationTime,
            customer_name: booking.customer_name || 'Unknown',
            customer_email: booking.customer_email || '',
            customer_phone: booking.customer_phone || '',
            service_name: 'Unknown Service',
            service_price: booking.price || 0,
            service_duration: 0,
            barber_name: 'Not assigned',
            branch_name: 'Unknown Branch',
            formattedDate: new Date(booking.date).toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            }),
            formattedTime: formatTime(booking.time),
          };
        }
      })
    );

    return {
      bookings: bookingsWithData,
      nextCursor,
      hasMore,
    };
  },
});

// Get bookings by branch (for branch admin/staff) - with pagination
export const getBookingsByBranch = query({
  args: {
    branch_id: v.id("branches"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50; // Default to 50 records per page

    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .order("desc")
      .take(limit + 1);

    const hasMore = bookings.length > limit;
    const results = hasMore ? bookings.slice(0, limit) : bookings;
    const nextCursor = hasMore && results.length > 0 ? results[results.length - 1]._id : null;

    // Get associated data for each booking with error handling
    const bookingsWithData = await Promise.all(
      results.map(async (booking) => {
        try {
          const [customer, service, barber] = await Promise.all([
            booking.customer ? ctx.db.get(booking.customer) : null,
            booking.service ? ctx.db.get(booking.service) : null,
            booking.barber ? ctx.db.get(booking.barber) : null,
          ]);

          return {
            _id: booking._id,
            booking_code: booking.booking_code,
            branch_id: booking.branch_id,
            customer: booking.customer,
            service: booking.service,
            barber: booking.barber,
            date: booking.date,
            time: booking.time,
            status: booking.status,
            payment_status: booking.payment_status,
            payment_method: booking.payment_method,
            price: booking.price,
            final_price: booking.final_price,
            discount_amount: booking.discount_amount,
            voucher_id: booking.voucher_id,
            notes: booking.notes,
            booking_fee: booking.booking_fee || 0,
            convenience_fee_paid: booking.convenience_fee_paid || 0,
            cash_collected: booking.cash_collected || 0,
            late_fee: booking.late_fee || 0,
            createdAt: booking.createdAt || booking._creationTime,
            updatedAt: booking.updatedAt || booking._creationTime,
            customer_name: booking.customer_name || customer?.username || customer?.nickname || 'Unknown',
            customer_email: booking.customer_email || customer?.email || '',
            customer_phone: booking.customer_phone || customer?.mobile_number || '',
            amount_paid: booking.amount_paid || 0,
            service_name: service?.name || 'Unknown Service',
            service_price: booking.price || service?.price || 0,
            original_service_price: service?.price || 0,
            service_duration: service?.duration_minutes || 0,
            barber_name: barber?.full_name || 'Not assigned',
            formattedDate: new Date(booking.date).toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            }),
            formattedTime: formatTime(booking.time),
          };
        } catch (error) {
          // Return minimal booking data if lookup fails
          return {
            _id: booking._id,
            booking_code: booking.booking_code,
            branch_id: booking.branch_id,
            customer: booking.customer,
            service: booking.service,
            barber: booking.barber,
            date: booking.date,
            time: booking.time,
            status: booking.status,
            payment_status: booking.payment_status,
            payment_method: booking.payment_method,
            price: booking.price,
            final_price: booking.final_price,
            discount_amount: booking.discount_amount,
            voucher_id: booking.voucher_id,
            notes: booking.notes,
            booking_fee: booking.booking_fee || 0,
            convenience_fee_paid: booking.convenience_fee_paid || 0,
            cash_collected: booking.cash_collected || 0,
            late_fee: booking.late_fee || 0,
            createdAt: booking.createdAt || booking._creationTime,
            updatedAt: booking.updatedAt || booking._creationTime,
            customer_name: booking.customer_name || 'Unknown',
            customer_email: booking.customer_email || '',
            customer_phone: booking.customer_phone || '',
            service_name: 'Unknown Service',
            service_price: booking.price || 0,
            service_duration: 0,
            barber_name: 'Not assigned',
            formattedDate: new Date(booking.date).toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            }),
            formattedTime: formatTime(booking.time),
          };
        }
      })
    );

    return {
      bookings: bookingsWithData,
      nextCursor,
      hasMore,
    };
  },
});

// Get bookings by customer (includes both regular and custom bookings)
export const getBookingsByCustomer = query({
  args: { customerId: v.id("users") },
  handler: async (ctx, args) => {
    // Get the user to find their email
    const user = await ctx.db.get(args.customerId);
    const userEmail = user?.email?.toLowerCase();

    // Get bookings by customer ID (regular bookings)
    const bookingsByCustomerId = await ctx.db
      .query("bookings")
      .withIndex("by_customer", (q) => q.eq("customer", args.customerId))
      .collect();

    // Also get bookings by email (for custom bookings where customer is undefined)
    let bookingsByEmail: typeof bookingsByCustomerId = [];
    if (userEmail) {
      const emailBookings = await ctx.db
        .query("bookings")
        .withIndex("by_customer_email", (q) => q.eq("customer_email", userEmail))
        .collect();
      bookingsByEmail = emailBookings.filter((b) => !b.customer);
    }

    // Merge and deduplicate
    const bookingIds = new Set(bookingsByCustomerId.map((b) => b._id.toString()));
    const mergedBookings = [
      ...bookingsByCustomerId,
      ...bookingsByEmail.filter((b) => !bookingIds.has(b._id.toString())),
    ];

    // Get associated data
    const bookingsWithData = await Promise.all(
      mergedBookings.map(async (booking) => {
        const [service, barber, branch] = await Promise.all([
          ctx.db.get(booking.service),
          booking.barber ? ctx.db.get(booking.barber) : null,
          ctx.db.get(booking.branch_id),
        ]);

        // Check if this is a custom booking
        const isCustomBooking = !booking.customer && booking.notes?.includes("Custom Booking Form");

        return {
          _id: booking._id,
          booking_code: booking.booking_code,
          branch_id: booking.branch_id,
          customer: booking.customer,
          service: booking.service,
          barber: booking.barber,
          date: booking.date,
          time: booking.time,
          status: booking.status,
          payment_status: booking.payment_status,
          payment_method: booking.payment_method,
          price: booking.price,
          final_price: booking.final_price,
          discount_amount: booking.discount_amount,
          voucher_id: booking.voucher_id,
          notes: booking.notes,
          createdAt: booking._creationTime,
          service_name: service?.name || (isCustomBooking ? 'Custom Booking' : 'Unknown Service'),
          service_price: booking.price || service?.price || 0,
          service_duration: service?.duration_minutes || 0,
          barber_name: barber?.full_name || 'Not assigned',
          branch_name: branch?.name || 'Unknown Branch',
          formattedDate: new Date(booking.date).toLocaleDateString(),
          formattedTime: formatTime(booking.time),
          is_custom_booking: isCustomBooking,
          // Payment/fee fields
          booking_fee: booking.booking_fee || 0,
          convenience_fee_paid: booking.convenience_fee_paid || 0,
          total_amount: booking.final_price || booking.price || 0,
          amount_paid: booking.amount_paid || 0,
          amount_due: booking.amount_due || 0,
        };
      })
    );

    return bookingsWithData.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get bookings by barber
export const getBookingsByBarber = query({
  args: { barberId: v.id("barbers") },
  handler: async (ctx, args) => {
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_barber", (q) => q.eq("barber", args.barberId))
      .collect();

    // Get associated data
    const bookingsWithData = await Promise.all(
      bookings.map(async (booking) => {
        const [customer, service] = await Promise.all([
          booking.customer ? ctx.db.get(booking.customer) : null,
          ctx.db.get(booking.service),
        ]);

        return {
          _id: booking._id,
          booking_code: booking.booking_code,
          branch_id: booking.branch_id,
          customer: booking.customer,
          service: booking.service,
          barber: booking.barber,
          date: booking.date,
          time: booking.time,
          status: booking.status,
          payment_status: booking.payment_status,
          payment_method: booking.payment_method,
          price: booking.price,
          final_price: booking.final_price,
          discount_amount: booking.discount_amount,
          voucher_id: booking.voucher_id,
          notes: booking.notes,
          createdAt: booking._creationTime,
          // Prioritize booking.customer_name (for walk-in customers with actual names)
          // Only fall back to customer?.username if booking.customer_name is not set
          customer_name: booking.customer_name || customer?.username || customer?.nickname || 'Unknown',
          customer_email: booking.customer_email || customer?.email || '',
          customer_phone: booking.customer_phone || customer?.mobile_number || '',
          service_name: service?.name || 'Unknown Service',
          service_price: booking.price || service?.price || 0,
          service_duration: service?.duration_minutes || 0,
          formattedDate: new Date(booking.date).toLocaleDateString(),
          formattedTime: formatTime(booking.time),
        };
      })
    );

    return bookingsWithData.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get booking by ID
export const getBookingById = query({
  args: { id: v.id("bookings") },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.id);
    if (!booking) return null;

    const [customer, service, barber, branch] = await Promise.all([
      booking.customer ? ctx.db.get(booking.customer) : null,
      ctx.db.get(booking.service),
      booking.barber ? ctx.db.get(booking.barber) : null,
      ctx.db.get(booking.branch_id),
    ]);

    return {
      _id: booking._id,
      booking_code: booking.booking_code,
      branch_id: booking.branch_id,
      customer: booking.customer,
      service: booking.service,
      barber: booking.barber,
      date: booking.date,
      time: booking.time,
      status: booking.status,
      payment_status: booking.payment_status,
      payment_method: booking.payment_method,
      price: booking.price,
      final_price: booking.final_price,
      discount_amount: booking.discount_amount,
      voucher_id: booking.voucher_id,
      notes: booking.notes,
      booking_fee: booking.booking_fee || 0,
      createdAt: booking._creationTime,
      customer_name: customer?.username || booking.customer_name || 'Unknown',
      customer_email: customer?.email || booking.customer_email || '',
      customer_phone: customer?.mobile_number || booking.customer_phone || '',
      service_name: service?.name || 'Unknown Service',
      service_price: booking.price || service?.price || 0,
      service_duration: service?.duration_minutes || 0,
      barber_name: barber?.full_name || 'Not assigned',
      branch_name: branch?.name || 'Unknown Branch',
      formattedDate: new Date(booking.date).toLocaleDateString(),
      formattedTime: formatTime(booking.time),
    };
  },
});

// Get booking by booking code
export const getBookingByCode = query({
  args: { bookingCode: v.string() },
  handler: async (ctx, args) => {
    const booking = await ctx.db
      .query("bookings")
      .withIndex("by_booking_code", (q) => q.eq("booking_code", args.bookingCode))
      .first();

    if (!booking) return null;

    const [customer, service, barber] = await Promise.all([
      booking.customer ? ctx.db.get(booking.customer) : null,
      ctx.db.get(booking.service),
      booking.barber ? ctx.db.get(booking.barber) : null,
    ]);

    return {
      ...booking,
      customer_name: customer?.username || booking.customer_name || 'Unknown',
      customer_email: customer?.email || booking.customer_email || '',
      customer_phone: customer?.mobile_number || booking.customer_phone || '',
      service_name: service?.name || 'Unknown Service',
      service_price: booking.price || service?.price || 0,
      service_duration: service?.duration_minutes || 0,
      barber_name: barber?.full_name || 'Not assigned',
      formattedDate: new Date(booking.date).toLocaleDateString(),
      formattedTime: formatTime(booking.time),
    };
  },
});

// Create new booking
export const createBooking = mutation({
  args: {
    customer: v.id("users"),
    service: v.id("services"),
    branch_id: v.id("branches"),
    barber: v.optional(v.id("barbers")),
    date: v.string(),
    time: v.string(),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("booked"),
      v.literal("confirmed"),
      v.literal("completed"),
      v.literal("cancelled")
    )),
    notes: v.optional(v.string()),
    voucher_id: v.optional(v.id("vouchers")),
    discount_amount: v.optional(v.number()),
    customer_name: v.optional(v.string()), // For walk-in customers - actual name entered
    customer_phone: v.optional(v.string()),
    customer_email: v.optional(v.string()),
    booking_fee: v.optional(v.number()),
    payment_status: v.optional(v.union(
      v.literal("unpaid"),
      v.literal("paid"),
      v.literal("partial"),
      v.literal("refunded")
    )),
  },
  handler: async (ctx, args) => {
    // Get service details for price
    const service = await ctx.db.get(args.service);
    if (!service) {
      throwUserError(ERROR_CODES.BOOKING_SERVICE_UNAVAILABLE);
    }

    // Verify customer exists
    const customer = await ctx.db.get(args.customer);
    if (!customer) {
      throwUserError(ERROR_CODES.BOOKING_NOT_FOUND, 'Customer not found for booking. Please ensure the customer exists before creating a booking.');
    }

    // Validate booking date is not in the past
    const bookingDate = new Date(args.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (bookingDate < today) {
      throwUserError(ERROR_CODES.BOOKING_PAST_DATE);
    }

    // Validate branch is not closed
    const bookingBranch = await ctx.db.get(args.branch_id);
    if (bookingBranch) {
      if (bookingBranch.is_manually_closed) {
        throwUserError(
          ERROR_CODES.OPERATION_FAILED,
          "Branch is closed",
          bookingBranch.manual_close_reason || "This branch is temporarily closed and not accepting bookings."
        );
      }
      if (bookingBranch.closed_dates && bookingBranch.closed_dates.length > 0) {
        const closedDate = bookingBranch.closed_dates.find((cd: { date: string; reason: string }) => cd.date === args.date);
        if (closedDate) {
          throwUserError(
            ERROR_CODES.OPERATION_FAILED,
            "Branch closed on this date",
            closedDate.reason || `This branch is closed on ${args.date}.`
          );
        }
      }
      if (bookingBranch.weekly_schedule) {
        const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
        const bookingDayOfWeek = dayNames[bookingDate.getDay()];
        const daySchedule = bookingBranch.weekly_schedule[bookingDayOfWeek];
        if (daySchedule && !daySchedule.is_open) {
          throwUserError(
            ERROR_CODES.OPERATION_FAILED,
            "Branch closed on this day",
            `This branch is closed on ${bookingDayOfWeek.charAt(0).toUpperCase() + bookingDayOfWeek.slice(1)}s.`
          );
        }
      }
    }

    // SERVER-SIDE DOUBLE-BOOKING PREVENTION
    // Check if there's already an active booking for this barber at the same date and time
    if (args.barber) {
      const existingBooking = await ctx.db
        .query("bookings")
        .withIndex("by_barber_date", (q) =>
          q.eq("barber", args.barber).eq("date", args.date)
        )
        .filter((q) =>
          q.and(
            q.eq(q.field("time"), args.time),
            q.neq(q.field("status"), "cancelled")
          )
        )
        .first();

      if (existingBooking) {
        throwUserError(
          ERROR_CODES.BOOKING_TIME_UNAVAILABLE,
          'Time slot already booked',
          'This time slot is already booked for this barber. Please select a different time.'
        );
      }
    }

    // Validate barber schedule if barber is specified
    if (args.barber) {
      const barber = await ctx.db.get(args.barber);
      if (!barber) {
        throwUserError(ERROR_CODES.BARBER_NOT_FOUND, 'Selected barber not found.');
      }

      // Check schedule type (specific dates vs weekly)
      if (barber.schedule_type === 'specific_dates' && barber.specific_dates) {
        const bookingDateStr = args.date;
        const specificDate = barber.specific_dates.find(d => d.date === bookingDateStr);

        if (!specificDate || !specificDate.available) {
          throwUserError(
            ERROR_CODES.BOOKING_TIME_UNAVAILABLE,
            'Barber is not available on this date',
            `The barber is not available on ${bookingDateStr}. Please select a different date.`
          );
        }

        const bookingTime = args.time.substring(0, 5);
        if (bookingTime < specificDate.start || bookingTime >= specificDate.end) {
          throwUserError(
            ERROR_CODES.BOOKING_TIME_UNAVAILABLE,
            'Selected time is outside barber working hours',
            `The barber works from ${specificDate.start} to ${specificDate.end} on ${bookingDateStr}.`
          );
        }
      } else {
        // Default to weekly schedule
        const dayOfWeek = bookingDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const daySchedule = barber.schedule?.[dayOfWeek as keyof typeof barber.schedule];

        // Check if barber is available on this day
        if (!daySchedule || !daySchedule.available) {
          throwUserError(
            ERROR_CODES.BOOKING_TIME_UNAVAILABLE,
            'Barber is not available on the selected day',
            `The barber is not working on ${dayOfWeek}s. Please select a different day.`
          );
        }

        // Validate booking time is within barber's working hours
        const bookingTime = args.time.substring(0, 5); // Get HH:MM format
        if (bookingTime < daySchedule.start || bookingTime >= daySchedule.end) {
          throwUserError(
            ERROR_CODES.BOOKING_TIME_UNAVAILABLE,
            'Selected time is outside barber working hours',
            `The barber works from ${daySchedule.start} to ${daySchedule.end} on ${dayOfWeek}s. Please select a time within these hours.`
          );
        }
      }
    }

    const bookingCode = generateBookingCode();

    // Calculate final price with discount
    const originalPrice = service.price;
    const discountAmount = args.discount_amount || 0;
    const finalPrice = Math.max(0, originalPrice - discountAmount);

    const bookingId = await ctx.db.insert("bookings", {
      booking_code: bookingCode,
      branch_id: args.branch_id,
      customer: args.customer,
      service: args.service,
      barber: args.barber,
      date: args.date,
      time: args.time,
      status: args.status || "pending",
      payment_status: args.payment_status || "unpaid",
      price: originalPrice,
      voucher_id: args.voucher_id,
      booking_fee: args.booking_fee,
      discount_amount: discountAmount > 0 ? discountAmount : undefined,
      final_price: discountAmount > 0 ? finalPrice : undefined,
      notes: args.notes || undefined,
      // Store customer name/phone/email if provided (for walk-in customers)
      customer_name: args.customer_name?.trim() || undefined,
      customer_phone: args.customer_phone?.trim() || undefined,
      customer_email: args.customer_email?.trim() || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Send comprehensive booking notifications
    try {
      // Use require to break circular dependency for runtime import
      const { api } = require("../_generated/api");

      // Send new booking notification to staff (for confirmation/processing)
      await ctx.runMutation(api.services.bookingNotifications.sendBookingNotifications, {
        bookingId,
        notificationType: "STAFF_NEW_BOOKING",
        recipients: [
          { type: "staff", branchId: args.branch_id },
        ]
      });

      // Send notification to barber if assigned
      if (args.barber) {
        // Get barber's user ID
        const barber = await ctx.db.get(args.barber);
        if (barber && barber.user) {
          await ctx.runMutation(api.services.bookingNotifications.sendBookingNotifications, {
            bookingId,
            notificationType: "BARBER_NEW_ASSIGNMENT",
            recipients: [
              { type: "barber", userId: barber.user },
            ]
          });
        }
      }

      // Send booking confirmation email to customer
      // Note: Actions must be scheduled from mutations, not called directly
      const customerEmail = args.customer_email?.trim() || customer?.email;
      console.log("📧 Booking email check:", {
        hasArgsEmail: !!args.customer_email,
        argsEmail: args.customer_email,
        hasCustomerEmail: !!customer?.email,
        customerEmail: customer?.email,
        resolvedEmail: customerEmail,
      });

      const branch = await ctx.db.get(args.branch_id);
      const barberData = args.barber ? await ctx.db.get(args.barber) : null;
      const customerName = args.customer_name?.trim() || customer?.nickname || customer?.username || 'Valued Customer';

      if (customerEmail) {
        console.log("📧 Scheduling booking confirmation email to:", customerEmail);

        await ctx.scheduler.runAfter(0, api.services.auth.sendBookingConfirmationEmail, {
          email: customerEmail,
          customerName,
          bookingCode: bookingCode,
          serviceName: service.name,
          servicePrice: finalPrice,
          barberName: barberData?.full_name || 'Any Available',
          branchName: branch?.name || 'Our Branch',
          branchAddress: branch?.address,
          date: args.date,
          time: args.time,
          bookingId: bookingId.toString(),
        });
        console.log("📧 Booking confirmation email scheduled successfully");
      } else {
        console.log("📧 No customer email available, skipping email notification");
      }

      // Send booking notification email to barber (if assigned and has email)
      if (barberData?.email) {
        console.log("📧 Scheduling barber notification email to:", barberData.email);

        await ctx.scheduler.runAfter(0, api.services.auth.sendBarberBookingNotificationEmail, {
          email: barberData.email,
          barberName: barberData.full_name || 'Barber',
          customerName,
          bookingCode: bookingCode,
          serviceName: service.name,
          servicePrice: finalPrice,
          branchName: branch?.name || 'Our Branch',
          branchAddress: branch?.address,
          date: args.date,
          time: args.time,
        });
        console.log("📧 Barber notification email scheduled successfully");
      } else if (args.barber) {
        console.log("📧 Barber has no email, skipping barber email notification");
      }
    } catch (error) {
      console.error("Failed to send booking notifications:", error);
      // Don't fail the booking creation if notifications fail
    }

    await logAudit(ctx, {
      user_id: args.customer as string,
      user_name: args.customer_name || customer?.nickname || customer?.username,
      branch_id: args.branch_id as string,
      category: "booking",
      action: "booking.created",
      description: `Created booking #${bookingCode} for ${args.customer_name || customer?.nickname || customer?.username || "Customer"} on ${args.date} at ${args.time}`,
      target_type: "booking",
      target_id: bookingId as string,
      metadata: {
        booking_code: bookingCode,
        service_id: args.service,
        service_name: service!.name,
        barber_id: args.barber,
        date: args.date,
        time: args.time,
        price: originalPrice,
        final_price: finalPrice,
        discount_amount: discountAmount,
        status: args.status || "pending",
        payment_status: args.payment_status || "unpaid",
      },
    });

    return bookingId;
  },
});

// Update booking
export const updateBooking = mutation({
  args: {
    id: v.id("bookings"),
    service: v.optional(v.id("services")),
    barber: v.optional(v.id("barbers")),
    date: v.optional(v.string()),
    time: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("booked"),
      v.literal("confirmed"),
      v.literal("completed"),
      v.literal("cancelled")
    )),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    // Get the current booking to check for status changes
    const currentBooking = await ctx.db.get(id);
    if (!currentBooking) {
      throwUserError(ERROR_CODES.BOOKING_NOT_FOUND);
    }

    // Block editing completed or cancelled bookings (service/barber/date/time/notes changes)
    // Status changes are still allowed (e.g., marking as completed)
    const hasFieldEdits = args.service || args.barber || args.date || args.time || args.notes !== undefined;
    if (hasFieldEdits && (currentBooking.status === "completed" || currentBooking.status === "cancelled")) {
      throwUserError(
        ERROR_CODES.BOOKING_NOT_FOUND,
        "Booking cannot be edited",
        `This booking has already been ${currentBooking.status}. Completed or cancelled bookings cannot be modified.`
      );
    }

    // Validate referenced entities if updated
    let newServicePrice: number | undefined;
    if (args.service) {
      const service = await ctx.db.get(args.service);
      if (!service) {
        throwUserError(ERROR_CODES.BOOKING_SERVICE_UNAVAILABLE, "Service not found", "The selected service does not exist.");
      }
      // Track new price if service actually changed
      if (args.service !== currentBooking.service) {
        newServicePrice = service!.price;
      }
    }

    if (args.barber) {
      const barber = await ctx.db.get(args.barber);
      if (!barber) {
        throwUserError(ERROR_CODES.BARBER_NOT_FOUND, "Barber not found", "The selected barber does not exist.");
      }
    }

    // Check if booking was rescheduled
    const isRescheduled = (args.date && args.date !== currentBooking.date) ||
      (args.time && args.time !== currentBooking.time);

    // Check if barber was changed
    const barberChanged = args.barber && args.barber !== currentBooking.barber;
    const previousBarber = currentBooking.barber;

    // Build price updates if service changed
    const priceUpdates: Record<string, any> = {};
    if (newServicePrice !== undefined) {
      priceUpdates.price = newServicePrice;
      const discountAmount = currentBooking.discount_amount || 0;
      const newFinalPrice = Math.max(0, newServicePrice - discountAmount);
      priceUpdates.final_price = newFinalPrice;

      // Adjust payment_status if customer already paid and new price differs
      const amountPaid = currentBooking.amount_paid;
      if (amountPaid !== undefined && amountPaid > 0) {
        if (newFinalPrice > amountPaid) {
          // Customer owes more — mark as partial
          priceUpdates.payment_status = "partial";
        } else {
          // Same or less — keep as paid (overpayment handled as credit/refund at POS)
          priceUpdates.payment_status = "paid";
        }
      }
    }

    await ctx.db.patch(id, {
      ...updates,
      ...priceUpdates,
      updatedAt: Date.now(),
    });

    // Send rescheduled notification if date/time changed
    if (isRescheduled) {
      try {
        // Use require to break circular dependency for runtime import
        const { api } = require("../_generated/api");

        const recipients: Array<{ type: "customer" | "staff" | "barber" | "admin"; userId?: Id<"users">; branchId?: Id<"branches">; }> = [];

        // Notify customer if booking has a customer account
        if (currentBooking.customer) {
          recipients.push({ type: "customer", userId: currentBooking.customer });
        }

        // Notify staff
        recipients.push({ type: "staff", branchId: currentBooking.branch_id });

        await ctx.runMutation(api.services.bookingNotifications.sendBookingNotifications, {
          bookingId: id,
          notificationType: "CUSTOMER_BOOKING_RESCHEDULED",
          recipients,
          metadata: {
            new_date: args.date || currentBooking.date,
            new_time: args.time || currentBooking.time,
          }
        });

        // Notify barber if assigned
        if (currentBooking.barber) {
          // Get barber record to find user ID
          const barberRecord = await ctx.db.get(currentBooking.barber);
          if (barberRecord && barberRecord.user) {
            await ctx.runMutation(api.services.bookingNotifications.sendBookingNotifications, {
              bookingId: id,
              notificationType: "BARBER_APPOINTMENT_RESCHEDULED",
              recipients: [
                { type: "barber", userId: barberRecord.user as Id<"users"> },
              ],
              metadata: {
                new_date: args.date || currentBooking.date,
                new_time: args.time || currentBooking.time,
              }
            });
          }
        }
      } catch (error) {
        console.error("Failed to send reschedule notifications:", error);
      }
    }

    // Send notifications if barber was changed
    if (barberChanged) {
      try {
        // Use require to break circular dependency for runtime import
        const { api } = require("../_generated/api");

        // Notify the new barber about assignment
        if (args.barber) {
          // Get barber record to find user ID
          const barberRecord = await ctx.db.get(args.barber);
          if (barberRecord && barberRecord.user) {
            await ctx.runMutation(api.services.bookingNotifications.sendBookingNotifications, {
              bookingId: id,
              notificationType: "BARBER_NEW_ASSIGNMENT",
              recipients: [
                { type: "barber", userId: barberRecord.user },
              ]
            });
          }
        }

        // Notify the previous barber about unassignment
        if (previousBarber) {
          // Look up the previous barber to get their associated user ID
          const prevBarberRecord = await ctx.db.get(previousBarber);
          if (prevBarberRecord && prevBarberRecord.user) {
            await ctx.runMutation(api.services.bookingNotifications.sendBookingNotifications, {
              bookingId: id,
              notificationType: "BARBER_APPOINTMENT_CANCELLED",
              recipients: [
                { type: "barber", userId: prevBarberRecord.user },
              ],
              metadata: {
                reason: "Reassigned to another barber",
              }
            });
          }
        }

        // Notify customer about barber change
        if (currentBooking.customer) {
          await ctx.runMutation(api.services.notifications.createNotification, {
            title: "Barber Changed",
            message: "Your appointment barber has been updated.",
            type: "booking",
            priority: "medium",
            recipient_id: currentBooking.customer,
            recipient_type: "customer",
            branch_id: currentBooking.branch_id,
            action_url: `/bookings/${currentBooking.booking_code}`,
            action_label: "View Details",
            metadata: {
              booking_id: id,
              branch_id: currentBooking.branch_id,
            }
          });
        }
      } catch (error) {
        console.error("Failed to send barber change notifications:", error);
      }
    }

    // Create notification if status changed
    if (args.status && args.status !== currentBooking.status) {
      try {
        // Use require to break circular dependency for runtime import
        const { api } = require("../_generated/api");

        const recipients: Array<{ type: "customer" | "staff" | "barber" | "admin"; userId?: Id<"users">; branchId?: Id<"branches">; }> = [];

        // Notify customer if exists
        if (currentBooking.customer) {
          recipients.push({ type: "customer", userId: currentBooking.customer });
        }

        // Notify staff
        recipients.push({ type: "staff", branchId: currentBooking.branch_id });

        await ctx.runMutation(api.services.bookingNotifications.sendBookingNotifications, {
          bookingId: id,
          notificationType: "CUSTOMER_BOOKING_CONFIRMED",
          recipients
        });

        // Notify barber if assigned
        if (currentBooking.barber) {
          // Look up the barber to get their associated user ID
          const barber = await ctx.db.get(currentBooking.barber);
          if (barber && barber.user) {
            await ctx.runMutation(api.services.notifications.createNotification, {
              title: "Booking Confirmed",
              message: "A booking has been confirmed for you.",
              type: "booking",
              priority: "medium",
              recipient_id: barber.user,
              recipient_type: "barber",
              branch_id: currentBooking.branch_id,
              action_url: `/bookings/${currentBooking.booking_code}`,
              action_label: "View Details",
              metadata: {
                booking_id: id,
                branch_id: currentBooking.branch_id,
              }
            });
          }
        }
      } catch (error) {
        console.error("Failed to create booking status notification:", error);
        // Don't fail the booking update if notification fails
      }
    }

    await logAudit(ctx, {
      user_id: currentBooking.customer as string | undefined,
      user_name: currentBooking.customer_name,
      branch_id: currentBooking.branch_id as string,
      category: "booking",
      action: "booking.updated",
      description: `Updated booking #${currentBooking.booking_code}${args.status ? ` status to ${args.status}` : ""}${isRescheduled ? ` rescheduled to ${args.date || currentBooking.date} at ${args.time || currentBooking.time}` : ""}`,
      target_type: "booking",
      target_id: id as string,
      metadata: {
        booking_code: currentBooking.booking_code,
        changes: updates,
        previous_status: currentBooking.status,
        new_status: args.status || currentBooking.status,
        rescheduled: isRescheduled,
        barber_changed: barberChanged,
        price_updated: newServicePrice !== undefined,
      },
    });

    return id;
  },
});

// Delete booking
export const deleteBooking = mutation({
  args: { id: v.id("bookings") },
  handler: async (ctx, args) => {
    // Get the booking details before deleting
    const booking = await ctx.db.get(args.id);

    if (!booking) {
      throwUserError(ERROR_CODES.BOOKING_NOT_FOUND);
    }

    if (booking) {
      // Send notifications before deletion
      try {
        // Use require to break circular dependency for runtime import
        const { api } = require("../_generated/api");

        const recipients: Array<{ type: "customer" | "staff" | "barber" | "admin"; userId?: Id<"users">; branchId?: Id<"branches">; }> = [];

        // Notify customer if exists
        if (booking.customer) {
          recipients.push({ type: "customer", userId: booking.customer });
        }

        // Notify staff
        recipients.push({ type: "staff", branchId: booking.branch_id });

        await ctx.runMutation(api.services.bookingNotifications.sendBookingNotifications, {
          bookingId: args.id,
          notificationType: "CUSTOMER_BOOKING_CANCELLED",
          recipients,
          metadata: {
            reason: "Booking deleted by administrator"
          }
        });

        // Notify barber if assigned
        if (booking.barber) {
          // Look up the barber to get their associated user ID
          const barberRecord = await ctx.db.get(booking.barber);
          if (barberRecord && barberRecord.user) {
            await ctx.runMutation(api.services.bookingNotifications.sendBookingNotifications, {
              bookingId: args.id,
              notificationType: "BARBER_APPOINTMENT_CANCELLED",
              recipients: [
                { type: "barber", userId: barberRecord.user },
              ],
              metadata: {
                reason: "Booking deleted by administrator"
              }
            });
          }
        }
      } catch (error) {
        console.error("Failed to send booking deletion notifications:", error);
        // Continue with deletion even if notifications fail
      }

      // Delete associated transaction if it exists
      // The link between Booking and Transaction is the Receipt Number stored in Booking Notes.
      // Transactions do not directly store the Booking Code, so we rely on this link.
      if (booking.notes) {
        try {
          // Match "Receipt: RCP-..." case insensitive, allowing for optional space and more flexible receipt number format
          const receiptMatch = booking?.notes?.match(/(RCP-[\w\d-]+)/i);
          if (receiptMatch && receiptMatch[1]) {
            const receiptNumber = receiptMatch[1];
            console.log(`[DELETE BOOKING] Found associated receipt number in notes: ${receiptNumber}`);

            const transaction = await ctx.db
              .query("transactions")
              .withIndex("by_receipt_number", (q) => q.eq("receipt_number", receiptNumber))
              .first();

            if (transaction) {
              console.log(`[DELETE BOOKING] Processing hard delete for transaction: ${transaction._id}`);

              // 1. Restore product stock
              if (transaction.products && transaction.products.length > 0) {
                for (const product of transaction.products) {
                  const productDoc = await ctx.db.get(product.product_id);
                  if (productDoc) {
                    await ctx.db.patch(product.product_id, {
                      stock: productDoc.stock + product.quantity,
                      soldThisMonth: Math.max(0, productDoc.soldThisMonth - product.quantity),
                    });
                    console.log(`[DELETE BOOKING] Restored stock for product: ${product.product_name}`);
                  }
                }
              }

              // 2. Restore voucher status
              if (transaction.voucher_applied && transaction.customer) {
                const userAssignment = await ctx.db
                  .query("user_vouchers")
                  .withIndex("by_voucher_user", (q) => q.eq("voucher_id", transaction.voucher_applied!).eq("user_id", transaction.customer!))
                  .first();

                if (userAssignment && userAssignment.status === "redeemed") {
                  await ctx.db.patch(userAssignment._id, {
                    status: "assigned",
                    redeemed_at: undefined,
                  });
                  console.log(`[DELETE BOOKING] Restored voucher status for: ${transaction.voucher_applied}`);
                }
              }

              // 3. Delete the transaction record
              await ctx.db.delete(transaction._id);
              console.log(`[DELETE BOOKING] Transaction hard deleted.`);
            } else {
              console.log(`[DELETE BOOKING] No transaction found for receipt number: ${receiptNumber}`);
            }
          } else {
            console.log(`[DELETE BOOKING] No valid receipt number found in booking notes: ${booking.notes}`);
          }
        } catch (error) {
          console.error("[DELETE BOOKING] Failed to delete associated transaction:", error);
          // Continue with booking deletion even if transaction deletion fails
        }
      }
    }

    await ctx.db.delete(args.id);

    await logAudit(ctx, {
      user_id: booking.customer as string | undefined,
      user_name: booking.customer_name,
      branch_id: booking.branch_id as string,
      category: "booking",
      action: "booking.deleted",
      description: `Deleted booking #${booking.booking_code} for ${booking.customer_name || "Customer"} on ${booking.date} at ${booking.time}`,
      target_type: "booking",
      target_id: args.id as string,
      metadata: {
        booking_code: booking.booking_code,
        date: booking.date,
        time: booking.time,
        status: booking.status,
        price: booking.price,
        payment_status: booking.payment_status,
      },
    });

    return { success: true };
  },
});

// Get bookings by date range
export const getBookingsByDateRange = query({
  args: {
    startDate: v.string(), // YYYY-MM-DD
    endDate: v.string(), // YYYY-MM-DD
    branch_id: v.optional(v.id("branches"))
  },
  handler: async (ctx, args) => {
    let bookingsQuery = ctx.db
      .query("bookings")
      .withIndex("by_date", q => q.gte("date", args.startDate).lte("date", args.endDate));

    if (args.branch_id) {
      bookingsQuery = bookingsQuery.filter(q => q.eq(q.field("branch_id"), args.branch_id));
    }

    const bookings = await bookingsQuery.collect();

    // Get associated data for each booking with error handling
    const bookingsWithData = await Promise.all(
      bookings.map(async (booking) => {
        try {
          const [customer, service, barber, branch] = await Promise.all([
            booking.customer ? ctx.db.get(booking.customer) : null,
            booking.service ? ctx.db.get(booking.service) : null,
            booking.barber ? ctx.db.get(booking.barber) : null,
            booking.branch_id ? ctx.db.get(booking.branch_id) : null,
          ]);

          return {
            _id: booking._id,
            booking_code: booking.booking_code,
            branch_id: booking.branch_id,
            customer: booking.customer,
            service: booking.service,
            barber: booking.barber,
            date: booking.date,
            time: booking.time,
            status: booking.status,
            payment_status: booking.payment_status,
            price: booking.price,
            final_price: booking.final_price,
            discount_amount: booking.discount_amount,
            voucher_id: booking.voucher_id,
            notes: booking.notes,
            booking_fee: booking.booking_fee || 0,
            convenience_fee_paid: booking.convenience_fee_paid || 0,
            cash_collected: booking.cash_collected || 0,
            late_fee: booking.late_fee || 0,
            createdAt: booking.createdAt || booking._creationTime,
            updatedAt: booking.updatedAt || booking._creationTime,
            customer_name: booking.customer_name || customer?.username || customer?.nickname || 'Unknown',
            customer_email: booking.customer_email || customer?.email || '',
            customer_phone: booking.customer_phone || customer?.mobile_number || '',
            service_name: service?.name || 'Unknown Service',
            service_price: booking.price || service?.price || 0,
            service_duration: service?.duration_minutes || 0,
            barber_name: barber?.full_name || 'Not assigned',
            branch_name: branch?.name || 'Unknown Branch',
            formattedDate: new Date(booking.date).toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            }),
            formattedTime: formatTime(booking.time),
          };
        } catch (error) {
          // Return minimal booking data if lookup fails
          return {
            _id: booking._id,
            booking_code: booking.booking_code,
            branch_id: booking.branch_id,
            customer: booking.customer,
            service: booking.service,
            barber: booking.barber,
            date: booking.date,
            time: booking.time,
            status: booking.status,
            payment_status: booking.payment_status,
            price: booking.price,
            final_price: booking.final_price,
            discount_amount: booking.discount_amount,
            voucher_id: booking.voucher_id,
            notes: booking.notes,
            booking_fee: booking.booking_fee || 0,
            convenience_fee_paid: booking.convenience_fee_paid || 0,
            cash_collected: booking.cash_collected || 0,
            late_fee: booking.late_fee || 0,
            createdAt: booking.createdAt || booking._creationTime,
            updatedAt: booking.updatedAt || booking._creationTime,
            customer_name: booking.customer_name || 'Unknown',
            customer_email: booking.customer_email || '',
            customer_phone: booking.customer_phone || '',
            service_name: 'Unknown Service',
            service_price: booking.price || 0,
            service_duration: 0,
            barber_name: 'Not assigned',
            branch_name: 'Unknown Branch',
            formattedDate: new Date(booking.date).toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            }),
            formattedTime: formatTime(booking.time),
          };
        }
      })
    );

    return bookingsWithData;
  },
});

// Get bookings by status
export const getBookingsByStatus = query({
  args: {
    status: v.union(
      v.literal("pending"),
      v.literal("booked"),
      v.literal("confirmed"),
      v.literal("completed"),
      v.literal("cancelled")
    )
  },
  handler: async (ctx, args) => {
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect();

    // Get associated data
    const bookingsWithData = await Promise.all(
      bookings.map(async (booking) => {
        const [customer, service, barber] = await Promise.all([
          booking.customer ? ctx.db.get(booking.customer) : null,
          ctx.db.get(booking.service),
          booking.barber ? ctx.db.get(booking.barber) : null,
        ]);

        return {
          ...booking,
          // Prioritize booking.customer_name (for walk-in customers with actual names)
          // Only fall back to customer?.username if booking.customer_name is not set
          customer_name: booking.customer_name || customer?.username || customer?.nickname || 'Unknown',
          customer_email: booking.customer_email || customer?.email || '',
          customer_phone: booking.customer_phone || customer?.mobile_number || '',
          service_name: service?.name || 'Unknown Service',
          barber_name: barber?.full_name || 'Not assigned',
          formattedDate: new Date(booking.date).toLocaleDateString(),
          formattedTime: formatTime(booking.time),
        };
      })
    );

    return bookingsWithData;
  },
});

// Get today's bookings
export const getTodaysBookings = query({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().split('T')[0];

    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_date", (q) => q.eq("date", today))
      .collect();

    // Get associated data
    const bookingsWithData = await Promise.all(
      bookings.map(async (booking) => {
        const [customer, service, barber] = await Promise.all([
          booking.customer ? ctx.db.get(booking.customer) : null,
          ctx.db.get(booking.service),
          booking.barber ? ctx.db.get(booking.barber) : null,
        ]);

        return {
          ...booking,
          // Prioritize booking.customer_name (for walk-in customers with actual names)
          // Only fall back to customer?.username if booking.customer_name is not set
          customer_name: booking.customer_name || customer?.username || customer?.nickname || 'Unknown',
          customer_email: booking.customer_email || customer?.email || '',
          customer_phone: booking.customer_phone || customer?.mobile_number || '',
          service_name: service?.name || 'Unknown Service',
          barber_name: barber?.full_name || 'Not assigned',
          formattedTime: formatTime(booking.time),
        };
      })
    );

    return bookingsWithData;
  },
});

// Get bookings by barber and date for availability checking
export const getBookingsByBarberAndDate = query({
  args: {
    barberId: v.id("barbers"),
    date: v.string()
  },
  handler: async (ctx, args) => {
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_barber", (q) => q.eq("barber", args.barberId))
      .filter((q) => q.eq(q.field("date"), args.date))
      .collect();

    // Return just the times for availability checking
    return bookings.map(booking => ({
      _id: booking._id,
      time: booking.time,
      status: booking.status
    }));
  },
});

// Mutation to validate and get booking by code for QR scanning
export const validateBookingByCode = mutation({
  args: { bookingCode: v.string() },
  handler: async (ctx, args) => {
    const booking = await ctx.db
      .query("bookings")
      .withIndex("by_booking_code", (q) => q.eq("booking_code", args.bookingCode))
      .first();

    if (!booking) return null;

    const [customer, service, barber] = await Promise.all([
      booking.customer ? ctx.db.get(booking.customer) : null,
      ctx.db.get(booking.service),
      booking.barber ? ctx.db.get(booking.barber) : null,
    ]);

    return {
      ...booking,
      customer_name: customer?.username || booking.customer_name || 'Unknown',
      customer_email: customer?.email || booking.customer_email || '',
      customer_phone: customer?.mobile_number || booking.customer_phone || '',
      service_name: service?.name || 'Unknown Service',
      service_price: booking.price || service?.price || 0,
      service_duration: service?.duration_minutes || 0,
      barber_name: barber?.full_name || 'Not assigned',
      formattedDate: new Date(booking.date).toLocaleDateString(),
      formattedTime: formatTime(booking.time),
    };
  },
});

// Update payment status
export const updatePaymentStatus = mutation({
  args: {
    id: v.id("bookings"),
    payment_status: v.union(
      v.literal("unpaid"),
      v.literal("paid"),
      v.literal("refunded")
    ),
    // Optional: update price when service was changed at POS
    price: v.optional(v.number()),
    final_price: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, any> = {
      payment_status: args.payment_status,
      updatedAt: Date.now(),
    };
    if (args.price !== undefined) {
      updates.price = args.price;
    }
    if (args.final_price !== undefined) {
      updates.final_price = args.final_price;
    }
    if (args.notes !== undefined) {
      updates.notes = args.notes;
    }
    await ctx.db.patch(args.id, updates);

    const booking = await ctx.db.get(args.id);
    await logAudit(ctx, {
      user_id: booking?.customer as string | undefined,
      user_name: booking?.customer_name,
      branch_id: booking?.branch_id as string | undefined,
      category: "booking",
      action: "booking.payment_status_changed",
      description: `Updated payment status to "${args.payment_status}" for booking #${booking?.booking_code || args.id}`,
      target_type: "booking",
      target_id: args.id as string,
      metadata: {
        booking_code: booking?.booking_code,
        new_payment_status: args.payment_status,
        price: args.price,
        final_price: args.final_price,
      },
    });

    return args.id;
  },
});

// Get payment details for a booking
export const getBookingPayments = query({
  args: { bookingId: v.optional(v.id("bookings")) },
  handler: async (ctx, args) => {
    if (!args.bookingId) {
      return [];
    }

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_booking_id", (q) => q.eq("booking_id", args.bookingId!))
      .collect();

    return payments.sort((a, b) => b.created_at - a.created_at);
  },
});

// Get transaction details for a booking (from POS transactions)
export const getBookingTransactions = query({
  args: { bookingId: v.optional(v.id("bookings")) },
  handler: async (ctx, args) => {
    if (!args.bookingId) {
      return [];
    }

    // First: find transactions linked by booking_id (POS booking payments)
    const linkedTransactions = await ctx.db
      .query("transactions")
      .withIndex("by_booking_id", (q) => q.eq("booking_id", args.bookingId!))
      .collect();

    if (linkedTransactions.length > 0) {
      return linkedTransactions.sort((a, b) => b.createdAt - a.createdAt);
    }

    // Fallback: match by service_id for older transactions without booking_id
    const booking = await ctx.db.get(args.bookingId!);
    if (!booking) return [];

    const allTransactions = await ctx.db
      .query("transactions")
      .collect();

    const bookingTransactions = allTransactions.filter(transaction => {
      return transaction.services?.some(service =>
        service.service_id === booking.service
      );
    });

    return bookingTransactions.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Cancel booking - works for any status including confirmed
export const cancelBooking = mutation({
  args: {
    id: v.id("bookings"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.id);

    if (!booking) {
      throwUserError(ERROR_CODES.BOOKING_NOT_FOUND);
    }

    // Check if booking is already cancelled
    if (booking.status === 'cancelled') {
      throwUserError(
        ERROR_CODES.BOOKING_ALREADY_CANCELLED,
        'Booking is already cancelled',
        'This booking has already been cancelled.'
      );
    }

    // Allow cancelling completed bookings to enable correction/deletion workflows
    // if (booking.status === 'completed') {
    //   throwUserError(
    //     ERROR_CODES.BOOKING_ALREADY_COMPLETED,
    //     'Cannot cancel completed booking',
    //     'This booking has already been completed and cannot be cancelled.'
    //   );
    // }

    // Update booking status to cancelled
    await ctx.db.patch(args.id, {
      status: 'cancelled',
      updatedAt: Date.now(),
      notes: args.reason ? `${booking.notes || ''}\nCancellation reason: ${args.reason}`.trim() : booking.notes,
    });

    // Send cancellation notifications
    try {
      // Use require to break circular dependency for runtime import
      const { api } = require("../_generated/api");

      const recipients: Array<{ type: "customer" | "staff" | "barber" | "admin"; userId?: Id<"users">; branchId?: Id<"branches">; }> = [];

      // Notify customer if exists
      if (booking.customer) {
        recipients.push({ type: "customer", userId: booking.customer });
      }

      // Notify staff
      recipients.push({ type: "staff", branchId: booking.branch_id });

      await ctx.runMutation(api.services.bookingNotifications.sendBookingNotifications, {
        bookingId: args.id,
        notificationType: "CUSTOMER_BOOKING_CANCELLED",
        recipients,
        metadata: {
          reason: args.reason || "Cancelled by staff",
          previous_status: booking.status,
        }
      });

      // Notify barber if assigned
      if (booking.barber) {
        const barberRecord = await ctx.db.get(booking.barber);
        if (barberRecord && barberRecord.user) {
          await ctx.runMutation(api.services.bookingNotifications.sendBookingNotifications, {
            bookingId: args.id,
            notificationType: "BARBER_APPOINTMENT_CANCELLED",
            recipients: [
              { type: "barber", userId: barberRecord.user },
            ],
            metadata: {
              reason: args.reason || "Cancelled by staff",
              previous_status: booking.status,
            }
          });
        }
      }
    } catch (error) {
      console.error("Failed to send cancellation notifications:", error);
      // Don't fail the cancellation if notifications fail
    }

    // Send cancellation email notifications
    try {
      const cancelService = await ctx.db.get(booking.service);
      const cancelBranch = await ctx.db.get(booking.branch_id);
      const cancelCustomer = booking.customer ? await ctx.db.get(booking.customer) : null;
      const cancelCustomerEmail = booking.customer_email || cancelCustomer?.email;
      const cancelCustomerName = booking.customer_name || cancelCustomer?.nickname || cancelCustomer?.username || "Customer";

      // Email branch admin about cancellation
      await ctx.scheduler.runAfter(0, api.services.emailNotifications.sendNotificationToRole, {
        notification_type: "booking_cancellation_to_branch",
        role: "branch_admin",
        branch_id: booking.branch_id,
        variables: {
          customer_name: cancelCustomerName,
          service_name: cancelService?.name || "Service",
          date: booking.date,
          time: booking.time,
          reason: args.reason || "No reason provided",
        },
      });

      // Email customer about cancellation
      if (cancelCustomerEmail) {
        await ctx.scheduler.runAfter(0, api.services.emailNotifications.sendNotificationEmail, {
          notification_type: "booking_cancellation_to_customer",
          to_email: cancelCustomerEmail,
          to_name: cancelCustomerName,
          variables: {
            service_name: cancelService?.name || "Service",
            branch_name: cancelBranch?.name || "Our Branch",
            date: booking.date,
            time: booking.time,
            reason: args.reason || "No reason provided",
          },
        });
      }
    } catch (e) { console.error("[BOOKINGS] Cancellation email failed:", e); }

    // In-app notification for SA about cancellation
    try {
      const svc = await ctx.db.get(booking.service);
      await ctx.db.insert("notifications", {
        title: "Booking Cancelled",
        message: `${booking.customer_name || "Customer"}'s ${svc?.name || "appointment"} on ${booking.date} at ${booking.time} was cancelled`,
        type: "booking" as const,
        priority: "medium" as const,
        recipient_type: "admin" as const,
        branch_id: booking.branch_id,
        is_read: false,
        is_archived: false,
        metadata: {
          booking_id: args.id,
          booking_code: booking.booking_code,
          reason: args.reason,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } catch (e) { console.error("[BOOKINGS] In-app cancellation notification failed:", e); }

    await logAudit(ctx, {
      user_id: booking.customer as string | undefined,
      user_name: booking.customer_name,
      branch_id: booking.branch_id as string,
      category: "booking",
      action: "booking.cancelled",
      description: `Cancelled booking #${booking.booking_code} for ${booking.customer_name || "Customer"} on ${booking.date} at ${booking.time}${args.reason ? ` — ${args.reason}` : ""}`,
      target_type: "booking",
      target_id: args.id as string,
      metadata: {
        booking_code: booking.booking_code,
        date: booking.date,
        time: booking.time,
        previous_status: booking.status,
        reason: args.reason,
        price: booking.price,
        payment_status: booking.payment_status,
      },
    });

    return { success: true, booking_id: args.id };
  },
});

// Migration function to update existing bookings with payment_status
export const migratePaymentStatus = mutation({
  args: {},
  handler: async (ctx) => {
    const bookings = await ctx.db.query("bookings").collect();

    let updateCount = 0;
    for (const booking of bookings) {
      if (!booking.payment_status) {
        await ctx.db.patch(booking._id, {
          payment_status: "unpaid",
          updatedAt: Date.now(),
        });
        updateCount++;
      }
    }

    return { updated: updateCount };
  },
});

// Helper function to format time
function formatTime(timeString: string) {
  if (!timeString || timeString === 'N/A') return 'N/A';

  try {
    return new Date(`1970-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    return timeString;
  }
}

// Create walk-in booking for kiosk (no customer account required)
export const createWalkInBooking = mutation({
  args: {
    customer_name: v.string(),
    customer_phone: v.optional(v.string()),
    customer_email: v.optional(v.string()),
    service: v.id("services"),
    branch_id: v.id("branches"),
    barber: v.optional(v.id("barbers")),
    date: v.string(),
    time: v.string(),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("booked"),
      v.literal("confirmed"),
      v.literal("completed"),
      v.literal("cancelled")
    )),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate required fields
    if (!args.customer_name.trim()) {
      throwUserError(ERROR_CODES.BOOKING_INVALID_CUSTOMER_NAME);
    }

    // Get service details for price
    const service = await ctx.db.get(args.service);
    if (!service) {
      throwUserError(ERROR_CODES.BOOKING_SERVICE_UNAVAILABLE);
    }

    // Validate booking date is not in the past
    const bookingDate = new Date(args.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (bookingDate < today) {
      throwUserError(ERROR_CODES.BOOKING_PAST_DATE);
    }

    // SERVER-SIDE DOUBLE-BOOKING PREVENTION FOR WALK-IN
    // Check if there's already an active booking for this barber at the same date and time
    if (args.barber) {
      const existingBooking = await ctx.db
        .query("bookings")
        .withIndex("by_barber_date", (q) =>
          q.eq("barber", args.barber).eq("date", args.date)
        )
        .filter((q) =>
          q.and(
            q.eq(q.field("time"), args.time),
            q.neq(q.field("status"), "cancelled")
          )
        )
        .first();

      if (existingBooking) {
        throwUserError(
          ERROR_CODES.BOOKING_TIME_UNAVAILABLE,
          'Time slot already booked',
          'This time slot is already booked for this barber. Please select a different time.'
        );
      }
    }

    // Validate barber schedule if barber is specified
    if (args.barber) {
      const barber = await ctx.db.get(args.barber);
      if (!barber) {
        throwUserError(ERROR_CODES.BARBER_NOT_FOUND, 'Selected barber not found.');
      }

      // Check schedule type (specific dates vs weekly)
      if (barber.schedule_type === 'specific_dates' && barber.specific_dates) {
        const bookingDateStr = args.date;
        const specificDate = barber.specific_dates.find(d => d.date === bookingDateStr);

        if (!specificDate || !specificDate.available) {
          throwUserError(
            ERROR_CODES.BOOKING_TIME_UNAVAILABLE,
            'Barber is not available on this date',
            `The barber is not available on ${bookingDateStr}. Please select a different date.`
          );
        }

        const bookingTime = args.time.substring(0, 5);
        if (bookingTime < specificDate.start || bookingTime >= specificDate.end) {
          throwUserError(
            ERROR_CODES.BOOKING_TIME_UNAVAILABLE,
            'Selected time is outside barber working hours',
            `The barber works from ${specificDate.start} to ${specificDate.end} on ${bookingDateStr}.`
          );
        }
      } else {
        // Default to weekly schedule
        const dayOfWeek = bookingDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const daySchedule = barber.schedule?.[dayOfWeek as keyof typeof barber.schedule];

        // Check if barber is available on this day
        if (!daySchedule || !daySchedule.available) {
          throwUserError(
            ERROR_CODES.BOOKING_TIME_UNAVAILABLE,
            'Barber is not available on the selected day',
            `The barber is not working on ${dayOfWeek}s. Please select a different day.`
          );
        }

        // Validate booking time is within barber's working hours
        const bookingTime = args.time.substring(0, 5); // Get HH:MM format
        if (bookingTime < daySchedule.start || bookingTime >= daySchedule.end) {
          throwUserError(
            ERROR_CODES.BOOKING_TIME_UNAVAILABLE,
            'Selected time is outside barber working hours',
            `The barber works from ${daySchedule.start} to ${daySchedule.end} on ${dayOfWeek}s. Please select a time within these hours.`
          );
        }
      }
    }

    const bookingCode = generateBookingCode();

    const bookingId = await ctx.db.insert("bookings", {
      booking_code: bookingCode,
      branch_id: args.branch_id,
      customer: undefined, // No customer account for walk-ins
      customer_name: args.customer_name,
      customer_phone: args.customer_phone || undefined,
      customer_email: args.customer_email || undefined,
      service: args.service,
      barber: args.barber,
      date: args.date,
      time: args.time,
      status: args.status || "pending",
      payment_status: "unpaid",
      price: service.price,
      notes: args.notes || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Send walk-in booking notifications
    try {
      // Use require to break circular dependency for runtime import
      const { api } = require("../_generated/api");

      // Notify staff about walk-in booking
      await ctx.runMutation(api.services.bookingNotifications.sendBookingNotifications, {
        bookingId,
        notificationType: "STAFF_WALKIN_BOOKING",
        recipients: [
          { type: "staff", branchId: args.branch_id },
        ]
      });

      // Notify barber if assigned
      if (args.barber) {
        // Get barber record to find user ID
        const barberRecord = await ctx.db.get(args.barber);
        if (barberRecord && barberRecord.user) {
          await ctx.runMutation(api.services.bookingNotifications.sendBookingNotifications, {
            bookingId,
            notificationType: "BARBER_NEW_ASSIGNMENT",
            recipients: [
              { type: "barber", userId: barberRecord.user },
            ]
          });
        }
      }

      // Send booking confirmation email to walk-in customer
      // Note: Actions must be scheduled from mutations, not called directly
      if (args.customer_email) {
        const branch = await ctx.db.get(args.branch_id);
        const barberData = args.barber ? await ctx.db.get(args.barber) : null;

        console.log("📧 Scheduling walk-in booking confirmation email to:", args.customer_email);

        // Schedule the action to run immediately after this mutation completes
        await ctx.scheduler.runAfter(0, api.services.auth.sendBookingConfirmationEmail, {
          email: args.customer_email,
          customerName: args.customer_name,
          bookingCode: bookingCode,
          serviceName: service.name,
          servicePrice: service.price,
          barberName: barberData?.full_name || 'Any Available',
          branchName: branch?.name || 'Our Branch',
          branchAddress: branch?.address,
          date: args.date,
          time: args.time,
          bookingId: bookingId.toString(),
        });
        console.log("📧 Walk-in booking confirmation email scheduled successfully");
      }
    } catch (error) {
      console.error("Failed to send walk-in booking notifications:", error);
      // Don't fail the booking creation if notifications fail
    }

    await logAudit(ctx, {
      user_name: args.customer_name,
      branch_id: args.branch_id as string,
      category: "booking",
      action: "booking.walkin_created",
      description: `Created walk-in booking #${bookingCode} for ${args.customer_name} on ${args.date} at ${args.time}`,
      target_type: "booking",
      target_id: bookingId as string,
      metadata: {
        booking_code: bookingCode,
        customer_name: args.customer_name,
        customer_phone: args.customer_phone,
        customer_email: args.customer_email,
        service_id: args.service,
        service_name: service!.name,
        barber_id: args.barber,
        date: args.date,
        time: args.time,
        price: service!.price,
        status: args.status || "pending",
      },
    });

    return bookingId;
  },
});

// Record cash payment collection at POS (Story 8.2 - FR15)
export const recordCashPayment = mutation({
  args: {
    booking_id: v.id("bookings"),
    amount: v.number(),
    payment_method: v.union(
      v.literal("cash"),
      v.literal("gcash_manual"),
      v.literal("maya_manual"),
      v.literal("card_manual")
    ),
    collected_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get the booking
    const booking = await ctx.db.get(args.booking_id);
    if (!booking) {
      throw new Error("Booking not found");
    }

    // Calculate remaining balance
    // Note: Convenience fee is a separate reservation payment, NOT deducted from service price
    const servicePrice = booking.service_price || booking.price || 0;
    const convenienceFeePaid = booking.convenience_fee_paid || 0;
    const cashAlreadyCollected = booking.cash_collected || 0;
    const remainingBalance = servicePrice - cashAlreadyCollected;

    // Determine new payment status based on total cash collected
    let newPaymentStatus: "paid" | "partial" | "unpaid" = booking.payment_status || "unpaid";
    const totalCashAfterPayment = cashAlreadyCollected + args.amount;
    if (totalCashAfterPayment >= servicePrice) {
      newPaymentStatus = "paid";
    } else if (totalCashAfterPayment > 0) {
      newPaymentStatus = "partial";
    }

    // Update booking payment_status
    await ctx.db.patch(args.booking_id, {
      payment_status: newPaymentStatus,
      // Track total amount paid at branch
      cash_collected: (booking.cash_collected || 0) + args.amount,
    });

    // Determine payment_for based on context
    // If convenience fee was paid previously, this is remaining_balance
    // If this covers full service price, it's full_cash
    // Otherwise it's partial
    let paymentFor: "remaining_balance" | "full_cash" | "partial" = "partial";
    if (convenienceFeePaid > 0) {
      paymentFor = "remaining_balance";
    } else if (args.amount >= servicePrice) {
      paymentFor = "full_cash";
    }

    // Log to paymentAuditLog
    await ctx.db.insert("paymentAuditLog", {
      booking_id: args.booking_id,
      branch_id: booking.branch_id,
      event_type: "cash_collected",
      amount: args.amount,
      payment_method: args.payment_method,
      payment_for: paymentFor,
      created_at: Date.now(),
      created_by: args.collected_by,
      raw_payload: {
        booking_code: booking.booking_code,
        service_price: servicePrice,
        convenience_fee_paid: convenienceFeePaid,
        previous_status: booking.payment_status || "unpaid",
        new_status: newPaymentStatus,
        remaining_after: remainingBalance - args.amount,
      },
    });

    await logAudit(ctx, {
      user_id: args.collected_by as string,
      user_name: undefined,
      branch_id: booking.branch_id as string,
      category: "booking",
      action: "booking.cash_payment_recorded",
      description: `Recorded ${args.payment_method} payment of ₱${args.amount.toLocaleString()} for booking #${booking.booking_code}`,
      target_type: "booking",
      target_id: args.booking_id as string,
      metadata: {
        booking_code: booking.booking_code,
        amount: args.amount,
        payment_method: args.payment_method,
        previous_payment_status: booking.payment_status || "unpaid",
        new_payment_status: newPaymentStatus,
        service_price: servicePrice,
        remaining_balance: Math.max(0, remainingBalance - args.amount),
      },
    });

    return {
      success: true,
      new_payment_status: newPaymentStatus,
      amount_collected: args.amount,
      remaining_balance: Math.max(0, remainingBalance - args.amount),
    };
  },
});

// Mark booking as completed (Story 8.3 - FR16)
export const markBookingComplete = mutation({
  args: {
    booking_id: v.id("bookings"),
    completed_by: v.id("users"),
    force_complete: v.optional(v.boolean()), // Allow completion even with unpaid balance
  },
  handler: async (ctx, args) => {
    // Get the booking
    const booking = await ctx.db.get(args.booking_id);
    if (!booking) {
      throw new Error("Booking not found");
    }

    // Calculate remaining balance
    const servicePrice = booking.service_price || booking.price || 0;
    const convenienceFeePaid = booking.convenience_fee_paid || 0;
    const cashCollected = booking.cash_collected || 0;
    const remainingBalance = servicePrice - convenienceFeePaid - cashCollected;

    // Skip balance check if payment_status is 'paid' (already paid via PayMongo)
    const isFullyPaid = booking.payment_status === 'paid';

    // Check if there's unpaid balance and force_complete is not set
    // But skip this check if booking is already marked as fully paid
    if (remainingBalance > 0 && !args.force_complete && !isFullyPaid) {
      return {
        success: false,
        requires_confirmation: true,
        unpaid_balance: remainingBalance,
        message: `Customer has unpaid balance of ₱${remainingBalance.toLocaleString()}`,
      };
    }

    // Update booking status to completed
    await ctx.db.patch(args.booking_id, {
      status: "completed",
      completed_at: Date.now(),
    });

    // Log to paymentAuditLog
    await ctx.db.insert("paymentAuditLog", {
      booking_id: args.booking_id,
      branch_id: booking.branch_id,
      event_type: "booking_completed",
      amount: 0,
      payment_method: "system",
      created_at: Date.now(),
      created_by: args.completed_by,
      raw_payload: {
        booking_code: booking.booking_code,
        service_price: servicePrice,
        total_paid: convenienceFeePaid + cashCollected,
        unpaid_balance: Math.max(0, remainingBalance),
        forced_complete: args.force_complete || false,
        payment_status: booking.payment_status || "unpaid",
      },
    });

    // Update customer-branch activity for marketing/churn tracking
    // Only if customer has an account (not walk-in without account)
    if (booking.customer) {
      try {
        await ctx.runMutation(api.services.customerBranchActivity.upsertActivity, {
          customerId: booking.customer,
          branchId: booking.branch_id,
          bookingAmount: servicePrice,
          bookingDate: Date.now(),
        });
      } catch (error) {
        // Log but don't fail booking completion if activity tracking fails
        console.error("[markBookingComplete] Failed to update customer branch activity:", error);
      }
    }

    await logAudit(ctx, {
      user_id: args.completed_by as string,
      user_name: undefined,
      branch_id: booking.branch_id as string,
      category: "booking",
      action: "booking.completed",
      description: `Completed booking #${booking.booking_code} for ${booking.customer_name || "Customer"} on ${booking.date} at ${booking.time}`,
      target_type: "booking",
      target_id: args.booking_id as string,
      metadata: {
        booking_code: booking.booking_code,
        date: booking.date,
        time: booking.time,
        service_price: servicePrice,
        total_paid: convenienceFeePaid + cashCollected,
        unpaid_balance: Math.max(0, remainingBalance),
        forced_complete: args.force_complete || false,
        payment_status: booking.payment_status || "unpaid",
      },
    });

    return {
      success: true,
      booking_status: "completed",
    };
  },
});

// Get today's bookings with payment status (Story 8.4 - FR17)
export const getTodaysBookingsWithPaymentStatus = query({
  args: {
    branch_id: v.id("branches"),
    payment_status_filter: v.optional(v.union(
      v.literal("all"),
      v.literal("paid"),
      v.literal("partial"),
      v.literal("unpaid")
    )),
  },
  handler: async (ctx, args) => {
    // Get today's date range (start and end of day)
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

    // Get today's date string for matching
    const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Query bookings for this branch
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    // Filter for today's bookings
    const todaysBookings = bookings.filter((booking) => {
      // Check if booking date matches today
      if (booking.date === todayStr) {
        return true;
      }
      // Also check created_at for walk-in bookings
      if (booking.created_at && booking.created_at >= startOfDay && booking.created_at < endOfDay) {
        return true;
      }
      return false;
    });

    // Apply payment status filter
    let filteredBookings = todaysBookings;
    if (args.payment_status_filter && args.payment_status_filter !== "all") {
      filteredBookings = todaysBookings.filter(
        (booking) => booking.payment_status === args.payment_status_filter
      );
    }

    // Get barber and service names
    const enrichedBookings = await Promise.all(
      filteredBookings.map(async (booking) => {
        const barber = booking.barber ? await ctx.db.get(booking.barber) : null;
        const service = booking.service_id ? await ctx.db.get(booking.service_id) : null;

        // Calculate amounts
        const servicePrice = booking.service_price || booking.price || 0;
        const convenienceFeePaid = booking.convenience_fee_paid || 0;
        const cashCollected = booking.cash_collected || 0;
        const remainingBalance = Math.max(0, servicePrice - convenienceFeePaid - cashCollected);

        return {
          _id: booking._id,
          booking_code: booking.booking_code,
          time: booking.time,
          date: booking.date,
          customer_name: booking.customer_name,
          customer_phone: booking.customer_phone,
          service_name: service?.name || booking.service_name || "Unknown Service",
          barber_name: barber?.full_name || booking.barber_name || "Any Barber",
          payment_status: booking.payment_status || "unpaid",
          service_price: servicePrice,
          convenience_fee_paid: convenienceFeePaid,
          cash_collected: cashCollected,
          remaining_balance: remainingBalance,
          status: booking.status,
        };
      })
    );

    // Sort by time
    return enrichedBookings.sort((a, b) => {
      if (!a.time || !b.time) return 0;
      return a.time.localeCompare(b.time);
    });
  },
});

// Get customer's last completed booking with a specific barber
export const getCustomerLastVisit = query({
  args: {
    barberId: v.id("barbers"),
    customerIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (args.customerIds.length === 0) return {};

    const result: Record<string, { service_name: string; date: string; days_ago: number }> = {};

    for (const customerId of args.customerIds) {
      const bookings = await ctx.db
        .query("bookings")
        .withIndex("by_customer", (q) => q.eq("customer", customerId))
        .collect();

      // Filter for completed bookings with this barber, excluding today
      const today = new Date().toISOString().split("T")[0];
      const pastBookings = bookings
        .filter(
          (b) =>
            b.barber === args.barberId &&
            b.status === "completed" &&
            b.date !== today
        )
        .sort((a, b) => b.date.localeCompare(a.date));

      if (pastBookings.length > 0) {
        const last = pastBookings[0];
        const service = await ctx.db.get(last.service);
        const lastDate = new Date(last.date);
        const now = new Date();
        const daysAgo = Math.floor(
          (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        result[customerId] = {
          service_name: service?.name || "Unknown",
          date: last.date,
          days_ago: daysAgo,
        };
      }
    }

    return result;
  },
});

// ============================================================================
// NO-SHOW + TRANSFER (reschedule of paid online bookings)
// ============================================================================
// Only PAID bookings via online payment (paymongo / wallet / combo) qualify —
// cash payments are settled in-person so a no-show transfer fee doesn't apply.
// Staff can mark as no-show, then transfer the booking to a new date/time.
// The new booking gets a transfer_fee (per-branch config) unless explicitly
// waived with a reason ("shop fault").

const ONLINE_PAYMENT_METHODS = new Set(["paymongo", "wallet", "combo"]);

const isOnlinePaidBooking = (booking: any): boolean => {
  if (booking.payment_status !== "paid") return false;
  const m = (booking.payment_method || "").toLowerCase();
  if (!m) return false;
  return ONLINE_PAYMENT_METHODS.has(m);
};

/**
 * Compute the transfer fee that would apply for a booking, given the branch
 * config. Returns 0 if transfer fees are disabled.
 */
export const previewTransferFee = query({
  args: { booking_id: v.id("bookings") },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.booking_id);
    if (!booking) return { eligible: false, reason: "Booking not found", fee: 0 };

    if (!isOnlinePaidBooking(booking)) {
      return {
        eligible: false,
        reason: "Transfer fee only applies to paid online bookings (PayMongo / wallet)",
        fee: 0,
      };
    }

    const branch = await ctx.db.get(booking.branch_id);
    if (!branch?.enable_transfer_fee) {
      return { eligible: true, fee: 0, fee_enabled: false };
    }
    const type = branch.transfer_fee_type || "fixed";
    const amount = branch.transfer_fee_amount || 0;
    const fee =
      type === "percent"
        ? Math.round(((booking.price || 0) * amount) / 100)
        : amount;
    return { eligible: true, fee, fee_enabled: true, fee_type: type, fee_amount: amount };
  },
});

/**
 * Mark a booking as no-show. Only valid for paid online bookings whose
 * appointment time has passed and that are still in booked/confirmed status.
 */
export const markBookingAsNoShow = mutation({
  args: {
    booking_id: v.id("bookings"),
    marked_by: v.id("users"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.booking_id);
    if (!booking) throwUserError(ERROR_CODES.BOOKING_NOT_FOUND);

    if (!isOnlinePaidBooking(booking)) {
      throw new Error(
        "Only paid online bookings (PayMongo / wallet) can be marked as no-show."
      );
    }
    if (!["booked", "confirmed"].includes(booking.status)) {
      throw new Error(`Cannot mark a ${booking.status} booking as no-show.`);
    }

    const marker = await ctx.db.get(args.marked_by);
    const now = Date.now();
    await ctx.db.patch(args.booking_id, {
      status: "no_show" as const,
      no_show_marked_at: now,
      no_show_marked_by: args.marked_by,
      no_show_reason: args.reason,
      updatedAt: now,
    });

    await logAudit(ctx, {
      user_id: args.marked_by as string,
      user_name: marker?.name,
      user_role: marker?.role,
      branch_id: booking.branch_id as string,
      category: "booking",
      action: "booking.marked_no_show",
      description: `Marked booking #${booking.booking_code} (${booking.customer_name || "Customer"} on ${booking.date} ${booking.time}) as no-show${args.reason ? ` — ${args.reason}` : ""}`,
      target_type: "booking",
      target_id: args.booking_id as string,
      metadata: {
        booking_code: booking.booking_code,
        previous_status: booking.status,
        reason: args.reason,
      },
    });

    return { success: true };
  },
});

// ============================================================================
// ADMIN OVERVIEW — per-branch booking aggregates (must always be branch-scoped
// to keep query scope bounded and avoid pulling all bookings system-wide).
// ============================================================================

/**
 * Lightweight counts for one branch over a date range. Designed to never
 * page the entire bookings table — always reads via by_branch index and
 * caps at the supplied window. The admin overview UI uses this for the
 * summary card row.
 */
export const getBranchBookingsSummary = query({
  args: {
    branch_id: v.id("branches"),
    start_date: v.optional(v.string()), // "YYYY-MM-DD"
    end_date: v.optional(v.string()),   // "YYYY-MM-DD"
  },
  handler: async (ctx, args) => {
    // Build a date-window from args (default: last 30 days)
    const now = new Date();
    const defaultEnd = now.toISOString().slice(0, 10);
    const defaultStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const start = args.start_date || defaultStart;
    const end = args.end_date || defaultEnd;

    // Pull this branch's bookings in the window. by_branch_date index keeps
    // the scan bounded to a single branch's records.
    const rows = await ctx.db
      .query("bookings")
      .withIndex("by_branch_date", (q) =>
        q.eq("branch_id", args.branch_id).gte("date", start).lte("date", end)
      )
      .collect();

    const todayStr = defaultEnd;
    const weekAgoStr = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const byStatus: Record<string, number> = {
      pending: 0,
      booked: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      no_show: 0,
    };
    const byPayment: Record<string, number> = {
      unpaid: 0,
      paid: 0,
      partial: 0,
      refunded: 0,
    };
    let todayCount = 0;
    let weekCount = 0;
    let revenueInWindow = 0;
    let paidOnlineCount = 0;
    let cashCount = 0;

    for (const b of rows) {
      byStatus[b.status] = (byStatus[b.status] || 0) + 1;
      if (b.payment_status) byPayment[b.payment_status] = (byPayment[b.payment_status] || 0) + 1;
      if (b.date === todayStr) todayCount++;
      if (b.date >= weekAgoStr) weekCount++;
      if (b.payment_status === "paid") {
        revenueInWindow += b.final_price || b.price || 0;
        const m = (b.payment_method || "").toLowerCase();
        if (m === "paymongo" || m === "wallet" || m === "combo") paidOnlineCount++;
        else if (m === "cash") cashCount++;
      }
    }

    return {
      branch_id: args.branch_id,
      window: { start, end },
      total: rows.length,
      today: todayCount,
      last_7_days: weekCount,
      by_status: byStatus,
      by_payment: byPayment,
      revenue_in_window: revenueInWindow,
      paid_online_count: paidOnlineCount,
      cash_count: cashCount,
    };
  },
});

/**
 * Paginated bookings for one branch with optional date/status filters.
 * Always branch-scoped; refuses to run without a branch_id so the admin UI
 * forces a branch selection before any data is fetched.
 */
export const getBookingsByBranchFiltered = query({
  args: {
    branch_id: v.id("branches"),
    start_date: v.optional(v.string()),
    end_date: v.optional(v.string()),
    status: v.optional(v.string()),
    payment_status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit || 50, 200);

    // Use by_branch_date when a date range is supplied — far more efficient
    // for branches with high booking volume.
    let rowsQuery;
    if (args.start_date || args.end_date) {
      const start = args.start_date || "0000-00-00";
      const end = args.end_date || "9999-12-31";
      rowsQuery = ctx.db
        .query("bookings")
        .withIndex("by_branch_date", (q) =>
          q.eq("branch_id", args.branch_id).gte("date", start).lte("date", end)
        );
    } else {
      rowsQuery = ctx.db
        .query("bookings")
        .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
        .order("desc");
    }

    let rows = await rowsQuery.take(limit * 4); // small buffer for filtering

    if (args.status) rows = rows.filter((r) => r.status === args.status);
    if (args.payment_status) rows = rows.filter((r) => r.payment_status === args.payment_status);

    // Sort newest first by date+time
    rows.sort((a, b) => {
      const da = (a.date || "") + (a.time || "");
      const db = (b.date || "") + (b.time || "");
      return db.localeCompare(da);
    });

    const sliced = rows.slice(0, limit);

    // Enrich just what the admin overview needs (lighter than getBookingsByBranch)
    const enriched = await Promise.all(
      sliced.map(async (b) => {
        const [customer, service, barber] = await Promise.all([
          b.customer ? ctx.db.get(b.customer) : null,
          b.service ? ctx.db.get(b.service) : null,
          b.barber ? ctx.db.get(b.barber) : null,
        ]);
        return {
          _id: b._id,
          booking_code: b.booking_code,
          date: b.date,
          time: b.time,
          status: b.status,
          payment_status: b.payment_status,
          payment_method: b.payment_method,
          price: b.price,
          final_price: b.final_price,
          customer_name: b.customer_name || customer?.username || customer?.nickname || "—",
          customer_email: b.customer_email || customer?.email || "",
          service_name: service?.name || "—",
          barber_name: barber?.full_name || "Not assigned",
        };
      })
    );

    return {
      bookings: enriched,
      returned: sliced.length,
      truncated: rows.length > limit,
    };
  },
});

/**
 * Transfer (reschedule) a no-show booking to a new date/time. Creates a NEW
 * booking that inherits the customer/service/payment of the original and
 * carries the transfer fee. The original is marked transferred (status stays
 * "no_show" for accounting traceability) and the two are linked.
 */
export const transferNoShowBooking = mutation({
  args: {
    booking_id: v.id("bookings"),
    new_date: v.string(),
    new_time: v.string(),
    new_barber: v.optional(v.id("barbers")),
    transferred_by: v.id("users"),
    waive_fee: v.optional(v.boolean()),
    waive_reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const original = await ctx.db.get(args.booking_id);
    if (!original) throwUserError(ERROR_CODES.BOOKING_NOT_FOUND);

    if (original.status !== "no_show") {
      throw new Error("Only no-show bookings can be transferred.");
    }
    if (original.transferred_to_booking_id) {
      throw new Error("This booking has already been transferred.");
    }
    if (!isOnlinePaidBooking(original)) {
      throw new Error(
        "Transfer is only allowed for paid online bookings (PayMongo / wallet)."
      );
    }
    if (args.waive_fee && !args.waive_reason?.trim()) {
      throw new Error("A reason is required when waiving the transfer fee.");
    }

    const transferredBy = await ctx.db.get(args.transferred_by);

    // Compute fee using branch config (mirror previewTransferFee)
    const branch = await ctx.db.get(original.branch_id);
    let fee = 0;
    if (branch?.enable_transfer_fee && !args.waive_fee) {
      const type = branch.transfer_fee_type || "fixed";
      const amount = branch.transfer_fee_amount || 0;
      fee =
        type === "percent"
          ? Math.round(((original.price || 0) * amount) / 100)
          : amount;
    }

    const now = Date.now();

    // Generate booking code for the new booking — append "-T" + counter
    let newCode = `${original.booking_code}-T`;
    let suffix = 1;
    while (
      await ctx.db
        .query("bookings")
        .withIndex("by_booking_code", (q) => q.eq("booking_code", newCode))
        .first()
    ) {
      suffix++;
      newCode = `${original.booking_code}-T${suffix}`;
    }

    const transferNote = `Transferred from booking #${original.booking_code} (no-show on ${original.date} ${original.time}).${
      args.waive_fee
        ? ` Transfer fee waived: ${args.waive_reason}.`
        : fee > 0
        ? ` Transfer fee: ₱${fee}.`
        : ""
    }`;

    const newBookingId = await ctx.db.insert("bookings", {
      booking_code: newCode,
      branch_id: original.branch_id,
      customer: original.customer,
      customer_name: original.customer_name,
      customer_phone: original.customer_phone,
      customer_email: original.customer_email,
      service: original.service,
      barber: args.new_barber ?? original.barber,
      date: args.new_date,
      time: args.new_time,
      status: "booked" as const,
      // Payment carries over — the customer already paid for the original
      payment_status: original.payment_status,
      payment_method: original.payment_method,
      paymongo_link_id: original.paymongo_link_id,
      paymongo_payment_id: original.paymongo_payment_id,
      price: original.price,
      voucher_id: original.voucher_id,
      discount_amount: original.discount_amount,
      booking_fee: original.booking_fee,
      final_price: original.final_price,
      amount_paid: original.amount_paid,
      notes: [original.notes, transferNote].filter(Boolean).join("\n"),
      // Transfer linkage + fee
      transferred_from_booking_id: args.booking_id,
      transferred_at: now,
      transfer_fee: fee,
      transfer_fee_waived: args.waive_fee || undefined,
      transfer_fee_waive_reason: args.waive_fee ? args.waive_reason : undefined,
      createdAt: now,
      updatedAt: now,
    } as any);

    // Update the original — link to the new booking, keep status no_show
    await ctx.db.patch(args.booking_id, {
      transferred_to_booking_id: newBookingId,
      transferred_at: now,
      updatedAt: now,
      notes: [original.notes, `Rescheduled to ${args.new_date} ${args.new_time} (booking #${newCode}).`]
        .filter(Boolean)
        .join("\n"),
    });

    await logAudit(ctx, {
      user_id: args.transferred_by as string,
      user_name: transferredBy?.name,
      user_role: transferredBy?.role,
      branch_id: original.branch_id as string,
      category: "booking",
      action: args.waive_fee ? "booking.transfer_fee_waived" : "booking.transferred",
      description: args.waive_fee
        ? `Transferred booking #${original.booking_code} → #${newCode} with fee WAIVED (${args.waive_reason})`
        : `Transferred booking #${original.booking_code} → #${newCode}${fee > 0 ? ` with ₱${fee} transfer fee` : ""}`,
      target_type: "booking",
      target_id: newBookingId as string,
      metadata: {
        original_booking_id: args.booking_id,
        original_booking_code: original.booking_code,
        new_booking_code: newCode,
        new_date: args.new_date,
        new_time: args.new_time,
        transfer_fee: fee,
        waived: !!args.waive_fee,
        waive_reason: args.waive_reason,
      },
    });

    return {
      success: true,
      new_booking_id: newBookingId,
      new_booking_code: newCode,
      transfer_fee: fee,
      waived: !!args.waive_fee,
    };
  },
});
