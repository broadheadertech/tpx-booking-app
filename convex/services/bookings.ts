import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
// import { api } from "../_generated/api"; // Removed to break circular dependency
import { throwUserError, ERROR_CODES, validateInput } from "../utils/errors";
import type { Id } from "../_generated/dataModel";

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
            price: booking.price,
            final_price: booking.final_price,
            discount_amount: booking.discount_amount,
            voucher_id: booking.voucher_id,
            notes: booking.notes,
            createdAt: booking.createdAt || booking._creationTime,
            updatedAt: booking.updatedAt || booking._creationTime,
            customer_name: booking.customer_name || customer?.username || customer?.nickname || 'Unknown',
            customer_email: booking.customer_email || customer?.email || '',
            customer_phone: booking.customer_phone || customer?.mobile_number || '',
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
            createdAt: booking.createdAt || booking._creationTime,
            updatedAt: booking.updatedAt || booking._creationTime,
            customer_name: booking.customer_name || 'Unknown',
            customer_email: booking.customer_email || '',
            customer_phone: booking.customer_phone || '',
            service_name: 'Unknown Service',
            service_price: 0,
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
            price: booking.price,
            final_price: booking.final_price,
            discount_amount: booking.discount_amount,
            voucher_id: booking.voucher_id,
            notes: booking.notes,
            createdAt: booking.createdAt || booking._creationTime,
            updatedAt: booking.updatedAt || booking._creationTime,
            customer_name: booking.customer_name || customer?.username || customer?.nickname || 'Unknown',
            customer_email: booking.customer_email || customer?.email || '',
            customer_phone: booking.customer_phone || customer?.mobile_number || '',
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
            createdAt: booking.createdAt || booking._creationTime,
            updatedAt: booking.updatedAt || booking._creationTime,
            customer_name: booking.customer_name || 'Unknown',
            customer_email: booking.customer_email || '',
            customer_phone: booking.customer_phone || '',
            service_name: 'Unknown Service',
            service_price: 0,
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
      const allBookings = await ctx.db.query("bookings").collect();
      bookingsByEmail = allBookings.filter(
        (b) =>
          !b.customer && // No customer ID linked
          b.customer_email?.toLowerCase() === userEmail
      );
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
          price: booking.price,
          final_price: booking.final_price,
          discount_amount: booking.discount_amount,
          voucher_id: booking.voucher_id,
          notes: booking.notes,
          createdAt: booking._creationTime,
          service_name: service?.name || (isCustomBooking ? 'Custom Booking' : 'Unknown Service'),
          service_price: service?.price || 0,
          service_duration: service?.duration_minutes || 0,
          barber_name: barber?.full_name || 'Not assigned',
          branch_name: branch?.name || 'Unknown Branch',
          formattedDate: new Date(booking.date).toLocaleDateString(),
          formattedTime: formatTime(booking.time),
          is_custom_booking: isCustomBooking,
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
      createdAt: booking._creationTime,
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
    voucher_id: v.optional(v.id("vouchers")),
    discount_amount: v.optional(v.number()),
    customer_name: v.optional(v.string()), // For walk-in customers - actual name entered
    customer_phone: v.optional(v.string()),
    customer_email: v.optional(v.string()),
    booking_fee: v.optional(v.number()),
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
      payment_status: "unpaid",
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

      if (customerEmail) {
        const branch = await ctx.db.get(args.branch_id);
        const barberData = args.barber ? await ctx.db.get(args.barber) : null;

        console.log("📧 Scheduling booking confirmation email to:", customerEmail);

        // Schedule the action to run immediately after this mutation completes
        await ctx.scheduler.runAfter(0, api.services.auth.sendBookingConfirmationEmail, {
          email: customerEmail,
          customerName: args.customer_name?.trim() || customer?.nickname || customer?.username || 'Valued Customer',
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
    } catch (error) {
      console.error("Failed to send booking notifications:", error);
      // Don't fail the booking creation if notifications fail
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

    // Validate referenced entities if updated
    if (args.service) {
      const service = await ctx.db.get(args.service);
      if (!service) {
        throwUserError(ERROR_CODES.BOOKING_SERVICE_UNAVAILABLE, "Service not found", "The selected service does not exist.");
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

    await ctx.db.patch(id, {
      ...updates,
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
    return { success: true };
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

    return bookingId;
  },
});
