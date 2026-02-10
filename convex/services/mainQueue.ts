import { v } from "convex/values";
import { query } from "../_generated/server";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { DEFAULT_TIERS } from "./tiers";

/**
 * Main Queue Service
 *
 * Combines walk-ins and signed-in user bookings into a unified queue
 * with priority given to signed-in users over walk-ins.
 *
 * Features:
 * - Fetches all barbers for a branch
 * - Gets today's walk-ins from walkIn service
 * - Gets today's bookings from bookings service
 * - Prioritizes signed-in users (bookings) over walk-ins
 * - Groups customers by barber
 * - Validates unique time slots per barber
 */

// Helper: "HH:MM" → minutes since midnight
function timeStringToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

// Helper function to format time for display
function formatTime(timeString: string): string {
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

// Helper function to format date for display
function formatDate(dateString: string): string {
  if (!dateString) return 'N/A';

  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    return dateString;
  }
}

// Get today's date range
function getTodayRange() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartTimestamp = todayStart.getTime();

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const todayEndTimestamp = todayEnd.getTime();

  return { todayStartTimestamp, todayEndTimestamp };
}

/**
 * Get the main unified queue for a branch
 * Combines walk-ins and bookings with priority for signed-in users
 */
export const getMainQueue = query({
  args: {
    branch_id: v.id("branches"),
    status: v.optional(v.string()), // Optional status filter for walk-ins
  },
  handler: async (ctx, args) => {
    const { todayStartTimestamp, todayEndTimestamp } = getTodayRange();

    // Fetch all barbers for this branch
    const barbers = await ctx.db
      .query("barbers")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .filter((q) => q.eq(q.field("is_active"), true))
      .collect();

    // Fetch today's walk-ins
    let allWalkIns: any[] = [];
    try {
      allWalkIns = await ctx.db.query("walkIns").collect();
    } catch (error) {
      console.warn("[getMainQueue] Failed to fetch walk-ins:", error);
    }

    const todaysWalkIns = allWalkIns.filter(
      (w) =>
        w.branch_id === args.branch_id &&
        w.createdAt >= todayStartTimestamp &&
        w.createdAt <= todayEndTimestamp &&
        (args.status ? w.status === args.status : true)
    );

    // Fetch today's bookings (signed-in users)
    let allBookings: any[] = [];
    try {
      allBookings = await ctx.db.query("bookings").collect();
    } catch (error) {
      console.warn("[getMainQueue] Failed to fetch bookings:", error);
    }

    const todaysBookings = allBookings.filter(
      (b) =>
        b.branch_id === args.branch_id &&
        b.date === new Date().toISOString().split('T')[0] && // Today's date in YYYY-MM-DD format
        b.status !== "cancelled" &&
        b.status !== "completed"
    );

    // Get service details for walk-ins
    const walkInsWithServices = await Promise.all(
      todaysWalkIns.map(async (walkIn) => {
        // Determine service name — first try service_id, then notes, then default
        let serviceName = "Walk-in Service";
        let serviceDuration = 30;
        let servicePrice = 0;

        if (walkIn.service_id) {
          try {
            const svc = await ctx.db.get(walkIn.service_id);
            if (svc) {
              serviceName = svc.name;
              serviceDuration = svc.duration_minutes || 30;
              servicePrice = svc.price || 0;
            }
          } catch (_) {}
        } else if (walkIn.notes) {
          const serviceMatch = walkIn.notes.match(/Service:\s*([^\n,]+)/);
          if (serviceMatch) {
            serviceName = serviceMatch[1].trim();
          }
        }

        return {
          ...walkIn,
          serviceName,
          serviceDuration,
          servicePrice,
          isWalkIn: true,
          hasAccount: false,
        };
      })
    );

    // Get service details for bookings with tier information
    const bookingsWithServices = await Promise.all(
      todaysBookings.map(async (booking) => {
        let serviceName = "Service";
        let serviceDuration = 30;
        let servicePrice = booking.price || 0;

        try {
          const service = await ctx.db.get(booking.service);
          if (service) {
            serviceName = service.name;
            serviceDuration = service.duration_minutes;
            servicePrice = service.price;
          }
        } catch (error) {
          console.warn("[getMainQueue] Failed to fetch service:", error);
        }

        // Get tier information for signed-in customers
        let tierInfo = null;
        let lifetimePoints = 0;
        let memberSince = null;

        if (booking.customer) {
          try {
            const user = await ctx.db.get(booking.customer);
            if (user) {
              memberSince = user.createdAt || user._creationTime;

              // Get tier info
              if (user.current_tier_id) {
                const tier = await ctx.db.get(user.current_tier_id);
                if (tier) {
                  tierInfo = {
                    name: tier.name,
                    icon: tier.icon,
                    color: tier.color,
                    display_order: tier.display_order,
                  };
                }
              }

              // If no tier set, use Bronze as default
              if (!tierInfo) {
                const bronzeDefault = DEFAULT_TIERS[0];
                tierInfo = {
                  name: bronzeDefault.name,
                  icon: bronzeDefault.icon,
                  color: bronzeDefault.color,
                  display_order: bronzeDefault.display_order,
                };
              }

              // Get lifetime points
              const ledger = await ctx.db
                .query("points_ledger")
                .withIndex("by_user", (q) => q.eq("user_id", booking.customer!))
                .unique();

              if (ledger) {
                lifetimePoints = ledger.lifetime_earned;
              }
            }
          } catch (error) {
            console.warn("[getMainQueue] Failed to fetch user tier info:", error);
          }
        }

        return {
          ...booking,
          serviceName,
          serviceDuration,
          servicePrice,
          isWalkIn: false,
          hasAccount: !!booking.customer,
          userId: booking.customer || null, // Include user ID for welcome card
          tierInfo,
          lifetimePoints,
          memberSince,
        };
      })
    );

    // Combine walk-ins and bookings
    const allCustomers = [
      ...walkInsWithServices.map((w) => ({
        id: w._id,
        queueNumber: w.queueNumber,
        name: w.name,
        phone: w.number,
        service: w.serviceName,
        servicePrice: w.servicePrice,
        startTime: w.scheduled_time ? formatTime(w.scheduled_time) : (w.startTime ? formatTime(w.startTime) : null),
        date: new Date(w.createdAt).toISOString().split('T')[0],
        time: w.scheduled_time || w.startTime || null,
        waitTime: w.waitTime || "Waiting",
        status: w.status,
        barberId: w.barberId,
        isWalkIn: w.isWalkIn,
        hasAccount: w.hasAccount,
        createdAt: w.createdAt,
        type: "walkin" as const,
        // Walk-ins don't have tier info or userId
        tierInfo: null as {
          name: string;
          icon: string;
          color: string;
          display_order: number;
        } | null,
        lifetimePoints: 0,
        memberSince: null as number | null,
        userId: null as string | null,
      })),
      ...bookingsWithServices.map((b) => ({
        id: b._id,
        queueNumber: null, // Bookings don't have queue numbers
        name: b.customer_name || "Customer",
        phone: b.customer_phone || "",
        service: b.serviceName,
        servicePrice: b.servicePrice,
        startTime: formatTime(b.time),
        date: b.date,
        time: b.time,
        waitTime: null, // Bookings have scheduled times
        status: b.status,
        barberId: b.barber,
        isWalkIn: b.isWalkIn,
        hasAccount: b.hasAccount,
        createdAt: b.createdAt || b._creationTime,
        type: "booking" as const,
        // Include tier information for signed-in customers
        tierInfo: b.tierInfo,
        lifetimePoints: b.lifetimePoints,
        // Include user ID for welcome card
        userId: b.userId,
        memberSince: b.memberSince,
      })),
    ];

    // Sort by scheduled time with 1hr insertion rule for walk-ins
    // Walk-ins arriving within 1hr before a booking are placed before it
    const sortedCustomers = allCustomers.sort((a, b) => {
      const aTime = a.time || null; // "HH:MM" from booking or walk-in scheduled_time
      const bTime = b.time || null;

      // Customers without a time go to the end
      if (!aTime && !bTime) {
        // Both have no time — sort by queue number then creation
        if (a.queueNumber !== null && b.queueNumber !== null) {
          return a.queueNumber - b.queueNumber;
        }
        return a.createdAt - b.createdAt;
      }
      if (!aTime) return 1;
      if (!bTime) return -1;

      // Both have times — compare
      const aMinutes = timeStringToMinutes(aTime);
      const bMinutes = timeStringToMinutes(bTime);

      // If same time: bookings (signed-in) have priority over walk-ins
      if (aMinutes === bMinutes) {
        if (a.hasAccount !== b.hasAccount) return a.hasAccount ? -1 : 1;
        return a.createdAt - b.createdAt;
      }

      // 1hr insertion rule: walk-in within 60min before a booking goes first
      if (a.isWalkIn && !b.isWalkIn) {
        // a is walk-in, b is booking
        const diff = bMinutes - aMinutes;
        if (diff > 0 && diff <= 60) return -1; // walk-in is within 1hr before booking → walk-in first
      }
      if (!a.isWalkIn && b.isWalkIn) {
        // a is booking, b is walk-in
        const diff = aMinutes - bMinutes;
        if (diff > 0 && diff <= 60) return 1; // walk-in is within 1hr before booking → walk-in first
      }

      // Default: sort by time ascending
      return aMinutes - bMinutes;
    });

    // Group by barber
    const queueByBarber = await Promise.all(
      barbers.map(async (barber) => {
        // Get customers assigned to this barber
        const barberCustomers = sortedCustomers.filter(
          (customer) => customer.barberId === barber._id
        );

        // Check for duplicate time slots
        const timeSlots = new Map<string, any[]>();
        barberCustomers.forEach((customer) => {
          if (customer.time) {
            const time = customer.time.substring(0, 5); // HH:MM format
            if (!timeSlots.has(time)) {
              timeSlots.set(time, []);
            }
            timeSlots.get(time)!.push(customer);
          }
        });

        // Find conflicts
        const conflicts: Array<{ time: string; customers: any[] }> = [];
        timeSlots.forEach((customers, time) => {
          if (customers.length > 1) {
            conflicts.push({ time, customers });
          }
        });

        return {
          barberId: barber._id,
          barberName: barber.full_name,
          barberAvatar: barber.full_name.split(' ').map(n => n[0]).join(''),
          barberColor: getBarberColor(barber._id),
          barberStatus: barber.is_active ? 'available' : 'unavailable',
          customers: barberCustomers.map((customer) => ({
            ...customer,
            hasTimeConflict: conflicts.some(c =>
              c.customers.some(conflictCustomer => conflictCustomer.id === customer.id)
            ),
          })),
          stats: {
            total: barberCustomers.length,
            active: barberCustomers.filter(c => c.status === 'active').length,
            waiting: barberCustomers.filter(c => c.status === 'waiting').length,
            signedIn: barberCustomers.filter(c => c.hasAccount).length,
            walkIns: barberCustomers.filter(c => c.isWalkIn).length,
          },
          conflicts: conflicts.map(c => ({
            time: c.time,
            count: c.customers.length,
          })),
        };
      })
    );

    // Calculate overall stats
    const totalStats = {
      totalCustomers: sortedCustomers.length,
      totalSignedIn: sortedCustomers.filter(c => c.hasAccount).length,
      totalWalkIns: sortedCustomers.filter(c => c.isWalkIn).length,
      active: sortedCustomers.filter(c => c.status === 'active').length,
      waiting: sortedCustomers.filter(c => c.status === 'waiting').length,
      completed: sortedCustomers.filter(c => c.status === 'completed').length,
      totalBarbers: barbers.length,
      availableBarbers: barbers.filter(b => b.is_active).length,
    };

    return {
      branch_id: args.branch_id,
      date: new Date().toISOString().split('T')[0],
      queueByBarber,
      allCustomers: sortedCustomers,
      stats: totalStats,
    };
  },
});

/**
 * Get customers for a specific barber from the main queue
 */
export const getBarberQueue = query({
  args: {
    branch_id: v.id("branches"),
    barber_id: v.id("barbers"),
  },
  handler: async (ctx, args) => {
    const mainQueue = await ctx.runQuery(api.services.mainQueue.getMainQueue, {
      branch_id: args.branch_id,
    });

    const barberQueue = mainQueue.queueByBarber.find(
      (bq) => bq.barberId === args.barber_id
    );

    if (!barberQueue) {
      return {
        barberId: args.barber_id,
        customers: [],
        stats: {
          total: 0,
          active: 0,
          waiting: 0,
          signedIn: 0,
          walkIns: 0,
        },
        conflicts: [],
      };
    }

    return barberQueue;
  },
});

/**
 * Validate time slot availability for a barber
 * Checks if a barber has an existing booking/walk-in at the specified time
 */
export const validateTimeSlot = query({
  args: {
    barber_id: v.id("barbers"),
    date: v.string(), // YYYY-MM-DD format
    time: v.string(), // HH:MM format
    exclude_booking_id: v.optional(v.id("bookings")), // Exclude this booking when checking
  },
  handler: async (ctx, args) => {
    // Check for existing bookings
    let allBookings: any[] = [];
    try {
      allBookings = await ctx.db.query("bookings").collect();
    } catch (error) {
      console.warn("[validateTimeSlot] Failed to fetch bookings:", error);
    }

    const existingBooking = allBookings.find(
      (b) =>
        b.barber === args.barber_id &&
        b.date === args.date &&
        b.time.startsWith(args.time) &&
        b.status !== "cancelled" &&
        b.status !== "completed" &&
        (args.exclude_booking_id ? b._id !== args.exclude_booking_id : true)
    );

    if (existingBooking) {
      return {
        available: false,
        reason: "time_slot_taken",
        existingBooking: {
          id: existingBooking._id,
          customerName: existingBooking.customer_name,
          time: existingBooking.time,
          status: existingBooking.status,
        },
      };
    }

    // Check for existing walk-ins with assigned time
    let allWalkIns: any[] = [];
    try {
      allWalkIns = await ctx.db.query("walkIns").collect();
    } catch (error) {
      console.warn("[validateTimeSlot] Failed to fetch walk-ins:", error);
    }

    const { todayStartTimestamp, todayEndTimestamp } = getTodayRange();
    const todayDate = new Date().toISOString().split('T')[0];

    // Only check walk-ins for today
    if (args.date === todayDate) {
      const existingWalkIn = allWalkIns.find(
        (w) =>
          w.barberId === args.barber_id &&
          w.createdAt >= todayStartTimestamp &&
          w.createdAt <= todayEndTimestamp &&
          w.startTime &&
          w.startTime.startsWith(args.time) &&
          w.status !== "cancelled" &&
          w.status !== "completed"
      );

      if (existingWalkIn) {
        return {
          available: false,
          reason: "time_slot_taken",
          existingWalkIn: {
            id: existingWalkIn._id,
            customerName: existingWalkIn.name,
            time: existingWalkIn.startTime,
            status: existingWalkIn.status,
          },
        };
      }
    }

    return {
      available: true,
    };
  },
});

/**
 * Get queue statistics for a branch
 */
export const getQueueStats = query({
  args: {
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const mainQueue = await ctx.runQuery(api.services.mainQueue.getMainQueue, {
      branch_id: args.branch_id,
    });

    return mainQueue.stats;
  },
});

// Helper function to assign colors to barbers
function getBarberColor(barberId: Id<"barbers">): string {
  const colors = [
    "bg-blue-500",
    "bg-purple-500",
    "bg-green-500",
    "bg-pink-500",
    "bg-orange-500",
    "bg-teal-500",
    "bg-red-500",
    "bg-indigo-500",
  ];

  // Use the barber ID to deterministically assign a color
  const idStr = barberId.toString();
  let hash = 0;
  for (let i = 0; i < idStr.length; i++) {
    hash = ((hash << 5) - hash) + idStr.charCodeAt(i);
    hash |= 0;
  }

  return colors[Math.abs(hash) % colors.length];
}

/**
 * Public queue — sanitised data, no auth required.
 * Shows first name only, service, time, status. No phone/payment info.
 */
export const getPublicQueue = query({
  args: {
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    // Reuse getMainQueue for the heavy lifting
    const mainQueue = await ctx.runQuery(api.services.mainQueue.getMainQueue, {
      branch_id: args.branch_id,
    });

    // Get branch name
    const branch = await ctx.db.get(args.branch_id);

    // Strip sensitive data
    const queueByBarber = mainQueue.queueByBarber.map((bq: any) => ({
      barberId: bq.barberId,
      barberName: bq.barberName,
      barberAvatar: bq.barberAvatar,
      barberColor: bq.barberColor,
      customers: bq.customers
        .filter((c: any) => c.status !== "completed" && c.status !== "cancelled")
        .map((c: any, idx: number) => ({
          id: c.id,
          firstName: c.name?.split(" ")[0] || "Customer",
          service: c.service,
          startTime: c.startTime,
          time: c.time,
          status: c.status,
          isWalkIn: c.isWalkIn,
          position: idx + 1,
        })),
      stats: {
        total: bq.stats.total,
        active: bq.stats.active,
        waiting: bq.stats.waiting,
      },
    }));

    return {
      branch_id: args.branch_id,
      branch_name: branch?.name || "Unknown",
      date: mainQueue.date,
      queueByBarber,
      stats: {
        totalCustomers: mainQueue.stats.totalCustomers,
        active: mainQueue.stats.active,
        waiting: mainQueue.stats.waiting,
        totalBarbers: mainQueue.stats.totalBarbers,
      },
    };
  },
});
