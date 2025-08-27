import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

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
        const [customer, service, barber] = await Promise.all([
          ctx.db.get(booking.customer),
          ctx.db.get(booking.service),
          booking.barber ? ctx.db.get(booking.barber) : null,
        ]);

        return {
          ...booking,
          customer_name: customer?.username || 'Unknown',
          customer_email: customer?.email || '',
          customer_phone: customer?.mobile_number || '',
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
        const [service, barber] = await Promise.all([
          ctx.db.get(booking.service),
          booking.barber ? ctx.db.get(booking.barber) : null,
        ]);

        return {
          ...booking,
          service_name: service?.name || 'Unknown Service',
          service_price: service?.price || 0,
          service_duration: service?.duration_minutes || 0,
          barber_name: barber?.full_name || 'Not assigned',
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
          ctx.db.get(booking.customer),
          ctx.db.get(booking.service),
        ]);

        return {
          ...booking,
          customer_name: customer?.username || 'Unknown',
          customer_email: customer?.email || '',
          customer_phone: customer?.mobile_number || '',
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

    const [customer, service, barber] = await Promise.all([
      ctx.db.get(booking.customer),
      ctx.db.get(booking.service),
      booking.barber ? ctx.db.get(booking.barber) : null,
    ]);

    return {
      ...booking,
      customer_name: customer?.username || 'Unknown',
      customer_email: customer?.email || '',
      customer_phone: customer?.mobile_number || '',
      service_name: service?.name || 'Unknown Service',
      service_price: service?.price || 0,
      service_duration: service?.duration_minutes || 0,
      barber_name: barber?.full_name || 'Not assigned',
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
      ctx.db.get(booking.customer),
      ctx.db.get(booking.service),
      booking.barber ? ctx.db.get(booking.barber) : null,
    ]);

    return {
      ...booking,
      customer_name: customer?.username || 'Unknown',
      customer_email: customer?.email || '',
      customer_phone: customer?.mobile_number || '',
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
      throw new Error("Service not found");
    }

    const bookingCode = generateBookingCode();

    const bookingId = await ctx.db.insert("bookings", {
      booking_code: bookingCode,
      customer: args.customer,
      service: args.service,
      barber: args.barber,
      date: args.date,
      time: args.time,
      status: args.status || "pending",
      price: service.price,
      notes: args.notes || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
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

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

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
          ctx.db.get(booking.customer),
          ctx.db.get(booking.service),
          booking.barber ? ctx.db.get(booking.barber) : null,
        ]);

        return {
          ...booking,
          customer_name: customer?.username || 'Unknown',
          customer_email: customer?.email || '',
          customer_phone: customer?.mobile_number || '',
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
          ctx.db.get(booking.customer),
          ctx.db.get(booking.service),
          booking.barber ? ctx.db.get(booking.barber) : null,
        ]);

        return {
          ...booking,
          customer_name: customer?.username || 'Unknown',
          customer_email: customer?.email || '',
          customer_phone: customer?.mobile_number || '',
          service_name: service?.name || 'Unknown Service',
          barber_name: barber?.full_name || 'Not assigned',
          formattedTime: formatTime(booking.time),
        };
      })
    );

    return bookingsWithData;
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
