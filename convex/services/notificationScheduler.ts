import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { api } from "../_generated/api";

// Send automated booking reminders
export const sendBookingReminders = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const tomorrow = new Date(now + 24 * 60 * 60 * 1000);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    console.log(`[NOTIFICATION SCHEDULER] Running booking reminders for ${tomorrowStr}`);
    
    // Get all bookings for tomorrow that haven't had reminders sent
    const tomorrowBookings = await ctx.db
      .query("bookings")
      .filter((q) => 
        q.and(
          q.eq(q.field("date"), tomorrowStr),
          q.in(q.field("status"), ["pending", "confirmed", "booked"]),
          q.eq(q.field("reminder_sent"), false)
        )
      )
      .collect();
    
    console.log(`[NOTIFICATION SCHEDULER] Found ${tomorrowBookings.length} bookings to remind`);
    
    let reminderCount = 0;
    
    for (const booking of tomorrowBookings) {
      try {
        // Get related data
        const [customer, service, branch] = await Promise.all([
          booking.customer ? ctx.db.get(booking.customer) : null,
          ctx.db.get(booking.service),
          ctx.db.get(booking.branch_id),
        ]);
        
        if (!customer || !service || !branch) {
          console.log(`[NOTIFICATION SCHEDULER] Skipping booking ${booking._id} - missing data`);
          continue;
        }
        
        // Send reminder notification
        await ctx.runMutation(api.services.bookingNotifications.sendBookingNotifications, {
          bookingId: booking._id,
          notificationType: "CUSTOMER_BOOKING_REMINDER",
          recipients: [
            { type: "customer", userId: booking.customer },
          ],
          metadata: {
            service_name: service.name,
            branch_name: branch.name,
            time: booking.time,
          }
        });
        
        // Also send to barber if assigned
        if (booking.barber) {
          await ctx.runMutation(api.services.bookingNotifications.sendBookingNotifications, {
            bookingId: booking._id,
            notificationType: "BARBER_DAILY_SUMMARY",
            recipients: [
              { type: "barber", userId: booking.barber },
            ],
            metadata: {
              count: 1, // This specific booking
              date: tomorrowStr,
            }
          });
        }
        
        // Mark reminder as sent
        await ctx.db.patch(booking._id, {
          reminder_sent: true,
          updatedAt: now,
        });
        
        reminderCount++;
        console.log(`[NOTIFICATION SCHEDULER] Sent reminder for booking ${booking.booking_code}`);
        
      } catch (error) {
        console.error(`[NOTIFICATION SCHEDULER] Failed to send reminder for booking ${booking._id}:`, error);
      }
    }
    
    console.log(`[NOTIFICATION SCHEDULER] Completed - sent ${reminderCount} reminders`);
    return { success: true, remindersSent: reminderCount };
  },
});

// Send check-in reminders (15 minutes before appointment)
export const sendCheckInReminders = mutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const todayStr = now.toISOString().split('T')[0];
    
    console.log(`[NOTIFICATION SCHEDULER] Running check-in reminders at ${currentMinutes} minutes`);
    
    // Get bookings for today that are within 15-30 minutes from now
    const bookings = await ctx.db
      .query("bookings")
      .filter((q) => 
        q.and(
          q.eq(q.field("date"), todayStr),
          q.in(q.field("status"), ["pending", "confirmed", "booked"]),
          q.eq(q.field("check_in_reminder_sent"), false)
        )
      )
      .collect();
    
    let checkInCount = 0;
    
    for (const booking of bookings) {
      try {
        // Parse booking time
        const [hours, minutes] = booking.time.split(':').map(Number);
        const bookingMinutes = hours * 60 + minutes;
        const timeDiff = bookingMinutes - currentMinutes;
        
        // Send check-in reminder if appointment is in 15-30 minutes
        if (timeDiff >= 15 && timeDiff <= 30) {
          const [customer, service, branch] = await Promise.all([
            booking.customer ? ctx.db.get(booking.customer) : null,
            ctx.db.get(booking.service),
            ctx.db.get(booking.branch_id),
          ]);
          
          if (!customer || !service || !branch) {
            continue;
          }
          
          await ctx.runMutation(api.services.bookingNotifications.sendBookingNotifications, {
            bookingId: booking._id,
            notificationType: "CUSTOMER_CHECK_IN_REMINDER",
            recipients: [
              { type: "customer", userId: booking.customer },
            ],
            metadata: {
              service_name: service.name,
              branch_name: branch.name,
              time: booking.time,
            }
          });
          
          // Mark check-in reminder as sent
          await ctx.db.patch(booking._id, {
            check_in_reminder_sent: true,
            updatedAt: now.getTime(),
          });
          
          checkInCount++;
          console.log(`[NOTIFICATION SCHEDULER] Sent check-in reminder for booking ${booking.booking_code}`);
        }
      } catch (error) {
        console.error(`[NOTIFICATION SCHEDULER] Failed to send check-in reminder for booking ${booking._id}:`, error);
      }
    }
    
    console.log(`[NOTIFICATION SCHEDULER] Completed - sent ${checkInCount} check-in reminders`);
    return { success: true, checkInRemindersSent: checkInCount };
  },
});

// Send daily schedule summary to barbers
export const sendDailySchedules = mutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const tomorrowStr = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    console.log(`[NOTIFICATION SCHEDULER] Running daily schedule summaries for ${tomorrowStr}`);
    
    // Get all active barbers
    const barbers = await ctx.db
      .query("barbers")
      .filter((q) => q.eq(q.field("is_active"), true))
      .collect();
    
    let summaryCount = 0;
    
    for (const barber of barbers) {
      try {
        // Count barber's appointments for tomorrow
        const tomorrowAppointments = await ctx.db
          .query("bookings")
          .filter((q) => 
            q.and(
              q.eq(q.field("barber"), barber._id),
              q.eq(q.field("date"), tomorrowStr),
              q.in(q.field("status"), ["pending", "confirmed", "booked"])
            )
          )
          .collect();
        
        if (tomorrowAppointments.length > 0) {
          await ctx.runMutation(api.services.bookingNotifications.sendBookingNotifications, {
            bookingId: tomorrowAppointments[0]._id, // Use first booking as reference
            notificationType: "BARBER_DAILY_SUMMARY",
            recipients: [
              { type: "barber", userId: barber.user },
            ],
            metadata: {
              count: tomorrowAppointments.length,
              date: tomorrowStr,
            }
          });
          
          summaryCount++;
          console.log(`[NOTIFICATION SCHEDULER] Sent daily summary to barber ${barber.full_name} - ${tomorrowAppointments.length} appointments`);
        }
      } catch (error) {
        console.error(`[NOTIFICATION SCHEDULER] Failed to send daily summary to barber ${barber._id}:`, error);
      }
    }
    
    console.log(`[NOTIFICATION SCHEDULER] Completed - sent ${summaryCount} daily summaries`);
    return { success: true, summariesSent: summaryCount };
  },
});

// Clean up old notifications (production ready)
export const cleanupOldNotifications = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    
    console.log(`[NOTIFICATION SCHEDULER] Cleaning up notifications older than 30 days`);
    
    // Get expired notifications
    const expiredNotifications = await ctx.db
      .query("notifications")
      .filter((q) => q.or(
        q.lt(q.field("expires_at"), now),
        q.lt(q.field("createdAt"), thirtyDaysAgo)
      ))
      .collect();
    
    const deleteCount = expiredNotifications.length;
    
    // Delete expired notifications
    for (const notification of expiredNotifications) {
      try {
        await ctx.db.delete(notification._id);
      } catch (error) {
        console.error(`[NOTIFICATION SCHEDULER] Failed to delete notification ${notification._id}:`, error);
      }
    }
    
    console.log(`[NOTIFICATION SCHEDULER] Completed - cleaned up ${deleteCount} old notifications`);
    return { success: true, deletedCount: deleteCount };
  },
});

// Reset daily reminder flags (run at midnight)
export const resetDailyReminderFlags = mutation({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().split('T')[0];
    
    console.log(`[NOTIFICATION SCHEDULER] Resetting reminder flags for ${today}`);
    
    // Reset reminder_sent and check_in_reminder_sent flags for today's bookings
    const todayBookings = await ctx.db
      .query("bookings")
      .filter((q) => q.eq(q.field("date"), today))
      .collect();
    
    let resetCount = 0;
    
    for (const booking of todayBookings) {
      try {
        await ctx.db.patch(booking._id, {
          reminder_sent: false,
          check_in_reminder_sent: false,
          updatedAt: Date.now(),
        });
        resetCount++;
      } catch (error) {
        console.error(`[NOTIFICATION SCHEDULER] Failed to reset flags for booking ${booking._id}:`, error);
      }
    }
    
    console.log(`[NOTIFICATION SCHEDULER] Completed - reset flags for ${resetCount} bookings`);
    return { success: true, resetCount };
  },
});

// Get scheduler statistics
export const getSchedulerStats = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(now + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Count pending reminders
    const pendingReminders = await ctx.db
      .query("bookings")
      .filter((q) => 
        q.and(
          q.eq(q.field("date"), tomorrow),
          q.eq(q.field("reminder_sent"), false),
          q.in(q.field("status"), ["pending", "confirmed", "booked"])
        )
      )
      .collect();
    
    // Count old notifications
    const oldNotifications = await ctx.db
      .query("notifications")
      .filter((q) => q.lt(q.field("createdAt"), now - (30 * 24 * 60 * 60 * 1000)))
      .collect();
    
    // Count total notifications
    const totalNotifications = await ctx.db
      .query("notifications")
      .collect();
    
    return {
      pendingReminders: pendingReminders.length,
      oldNotifications: oldNotifications.length,
      totalNotifications: totalNotifications.length,
      schedulerLastRun: now, // This would ideally be stored in the database
    };
  },
});
