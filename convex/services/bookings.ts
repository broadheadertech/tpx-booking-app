import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { api } from "../_generated/api";
import { throwUserError, ERROR_CODES, validateInput } from "../utils/errors";

// Generate booking code
function generateBookingCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Get all bookings
export const getAllBookings = query({
  args: {},
  handler: async (ctx) => {
    const bookings = await ctx.db.query("bookings").collect();

    // Get associated data for each booking
    const bookingsWithData = await Promise.all(
      bookings.map(async (booking) => {
        const [customer, service, barber, branch] = await Promise.all([
          booking.customer ? ctx.db.get(booking.customer) : null,
          ctx.db.get(booking.service),
          booking.barber ? ctx.db.get(booking.barber) : null,
          ctx.db.get(booking.branch_id),
        ]);

        return {
          ...booking,
          customer_name: customer?.username || booking.customer_name || 'Unknown',
          customer_email: customer?.email || booking.customer_email || '',
          customer_phone: customer?.mobile_number || booking.customer_phone || '',
          service_name: service?.name || 'Unknown Service',
          service_price: service?.price || 0,
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
      })
    );

    return bookingsWithData.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get bookings by branch (for branch admin/staff)
export const getBookingsByBranch = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    // Get associated data for each booking
    const bookingsWithData = await Promise.all(
      bookings.map(async (booking) => {
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
          service_price: service?.price || 0,
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
      })
    );

    return bookingsWithData.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get bookings by customer
export const getBookingsByCustomer = query({
  args: { customerId: v.id("users") },
  handler: async (ctx, args) => {
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_customer", (q) => q.eq("customer", args.customerId))
      .collect();

    // Get associated data
    const bookingsWithData = await Promise.all(
      bookings.map(async (booking) => {
        const [service, barber, branch] = await Promise.all([
          ctx.db.get(booking.service),
          booking.barber ? ctx.db.get(booking.barber) : null,
          ctx.db.get(booking.branch_id),
        ]);

        return {
          ...booking,
          service_name: service?.name || 'Unknown Service',
          service_price: service?.price || 0,
          service_duration: service?.duration_minutes || 0,
          barber_name: barber?.full_name || 'Not assigned',
          branch_name: branch?.name || 'Unknown Branch',
          formattedDate: new Date(booking.date).toLocaleDateString(),
          formattedTime: formatTime(booking.time),
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
          ...booking,
          customer_name: customer?.username || booking.customer_name || 'Unknown',
          customer_email: customer?.email || booking.customer_email || '',
          customer_phone: customer?.mobile_number || booking.customer_phone || '',
          service_name: service?.name || 'Unknown Service',
          service_price: service?.price || 0,
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
      ...booking,
      customer_name: customer?.username || booking.customer_name || 'Unknown',
      customer_email: customer?.email || booking.customer_email || '',
      customer_phone: customer?.mobile_number || booking.customer_phone || '',
      service_name: service?.name || 'Unknown Service',
      service_price: service?.price || 0,
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
      service_price: service?.price || 0,
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
  },
  handler: async (ctx, args) => {
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

    const bookingCode = generateBookingCode();

    const bookingId = await ctx.db.insert("bookings", {
      booking_code: bookingCode,
      branch_id: args.branch_id,
      customer: args.customer,
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

    // Create notification for booking creation
    try {
      await ctx.runMutation(api.services.notifications.createNotification, {
        title: "Booking Created",
        message: `Your booking has been created with code: ${bookingCode}`,
        type: "booking",
        priority: "medium",
        recipient_id: args.customer,
        recipient_type: "customer",
      });
    } catch (error) {
      console.error("Failed to create booking notification:", error);
      // Don't fail the booking creation if notification fails
    }

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

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    // Create notification if status changed
    if (args.status && args.status !== currentBooking.status) {
      try {
        let notificationType;
        switch (args.status) {
          case "confirmed":
            notificationType = "booking_confirmed";
            break;
          case "cancelled":
            notificationType = "booking_cancelled";
            break;
          case "completed":
            notificationType = "booking_completed";
            break;
          default:
            notificationType = null;
        }
        
        if (notificationType) {
           let title, message;
           switch (notificationType) {
             case "booking_confirmed":
               title = "Booking Confirmed";
               message = "Your booking has been confirmed.";
               break;
             case "booking_cancelled":
               title = "Booking Cancelled";
               message = "Your booking has been cancelled.";
               break;
             case "booking_completed":
               title = "Booking Completed";
               message = "Your booking has been completed.";
               break;
             default:
               title = "Booking Updated";
               message = "Your booking status has been updated.";
           }
           
           if (currentBooking.customer) {
             await ctx.runMutation(api.services.notifications.createNotification, {
               title,
               message,
               type: "booking",
               priority: "medium",
               recipient_id: currentBooking.customer,
               recipient_type: "customer",
             });
           }
         }
       } catch (error) {
         console.error("Failed to create booking status notification:", error);
         // Don't fail the booking update if notification fails
       }
     }

    return id;
  },
});

// Delete booking
export const deleteBooking = mutation({
  args: { id: v.id("bookings") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// Get bookings by status
export const getBookingsByStatus = query({
  args: { status: v.union(
    v.literal("pending"),
    v.literal("booked"),
    v.literal("confirmed"),
    v.literal("completed"),
    v.literal("cancelled")
  ) },
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
          customer_name: customer?.username || booking.customer_name || 'Unknown',
          customer_email: customer?.email || booking.customer_email || '',
          customer_phone: customer?.mobile_number || booking.customer_phone || '',
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
          customer_name: customer?.username || booking.customer_name || 'Unknown',
          customer_email: customer?.email || booking.customer_email || '',
          customer_phone: customer?.mobile_number || booking.customer_phone || '',
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
      service_price: service?.price || 0,
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
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      payment_status: args.payment_status,
      updatedAt: Date.now(),
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

    const transactions = await ctx.db
      .query("transactions")
      .collect();

    // Filter transactions that include services from this booking
    const booking = await ctx.db.get(args.bookingId!);
    if (!booking) return [];

    const bookingTransactions = transactions.filter(transaction => {
      return transaction.services?.some(service =>
        service.service_id === booking.service
      );
    });

    return bookingTransactions.sort((a, b) => b.createdAt - a.createdAt);
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

    return bookingId;
  },
});
