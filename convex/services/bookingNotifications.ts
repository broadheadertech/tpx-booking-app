import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { api } from "../_generated/api";

// Production-ready notification templates for booking events
export const BOOKING_NOTIFICATION_TEMPLATES = {
  // Customer notifications
  CUSTOMER_BOOKING_CONFIRMED: {
    title: "Booking Confirmed",
    message: "Your appointment has been confirmed! {service_name} at {branch_name} on {date} at {time}.",
    type: "booking" as const,
    priority: "medium" as const,
  },
  CUSTOMER_BOOKING_REMINDER: {
    title: "Appointment Reminder",
    message: "Reminder: Your {service_name} appointment at {branch_name} is tomorrow at {time}.",
    type: "reminder" as const,
    priority: "medium" as const,
  },
  CUSTOMER_BOOKING_CANCELLED: {
    title: "Booking Cancelled",
    message: "Your {service_name} appointment at {branch_name} on {date} has been cancelled.",
    type: "booking" as const,
    priority: "high" as const,
  },
  CUSTOMER_BOOKING_RESCHEDULED: {
    title: "Booking Rescheduled",
    message: "Your appointment has been rescheduled to {new_date} at {new_time} at {branch_name}.",
    type: "booking" as const,
    priority: "medium" as const,
  },
  CUSTOMER_PAYMENT_RECEIVED: {
    title: "Payment Received",
    message: "Payment of ${amount} received for your {service_name} booking.",
    type: "payment" as const,
    priority: "medium" as const,
  },
  CUSTOMER_CHECK_IN_REMINDER: {
    title: "Check-in Reminder",
    message: "Don't forget to check in 15 minutes before your {service_name} appointment at {branch_name}.",
    type: "reminder" as const,
    priority: "medium" as const,
  },
  
  // Staff notifications
  STAFF_NEW_BOOKING: {
    title: "New Booking",
    message: "New {service_name} booking for {customer_name} on {date} at {time}.",
    type: "booking" as const,
    priority: "medium" as const,
  },
  STAFF_BOOKING_CANCELLED: {
    title: "Booking Cancelled",
    message: "{customer_name} cancelled their {service_name} booking on {date}.",
    type: "booking" as const,
    priority: "medium" as const,
  },
  STAFF_BOOKING_MODIFIED: {
    title: "Booking Modified",
    message: "{customer_name}'s {service_name} booking has been modified.",
    type: "booking" as const,
    priority: "medium" as const,
  },
  STAFF_WALKIN_BOOKING: {
    title: "Walk-in Customer",
    message: "Walk-in customer {customer_name} for {service_name}.",
    type: "booking" as const,
    priority: "high" as const,
  },
  STAFF_PAYMENT_ISSUE: {
    title: "Payment Issue",
    message: "Payment issue for {customer_name}'s {service_name} booking. Please assist.",
    type: "alert" as const,
    priority: "high" as const,
  },
  
  // Barber notifications
  BARBER_NEW_ASSIGNMENT: {
    title: "New Appointment",
    message: "You have a new {service_name} appointment with {customer_name} on {date} at {time}.",
    type: "booking" as const,
    priority: "medium" as const,
  },
  BARBER_APPOINTMENT_CANCELLED: {
    title: "Appointment Cancelled",
    message: "{customer_name} cancelled their {service_name} appointment on {date}.",
    type: "booking" as const,
    priority: "medium" as const,
  },
  BARBER_APPOINTMENT_RESCHEDULED: {
    title: "Appointment Rescheduled",
    message: "{customer_name}'s appointment has been rescheduled to {new_date} at {new_time}.",
    type: "booking" as const,
    priority: "medium" as const,
  },
  BARBER_DAILY_SUMMARY: {
    title: "Daily Schedule",
    message: "You have {count} appointments scheduled for {date}.",
    type: "reminder" as const,
    priority: "low" as const,
  },
  BARBER_CUSTOMER_ARRIVAL: {
    title: "Customer Arrived",
    message: "{customer_name} has arrived for their {service_name} appointment.",
    type: "alert" as const,
    priority: "high" as const,
  },
  
  // System notifications
  SYSTEM_MAINTENANCE: {
    title: "System Maintenance",
    message: "System will undergo maintenance from {start_time} to {end_time}. Services may be temporarily unavailable.",
    type: "system" as const,
    priority: "high" as const,
  },
  SYSTEM_FEATURE_UPDATE: {
    title: "New Feature Available",
    message: "Check out our new {feature_name} feature in your booking system!",
    type: "promotion" as const,
    priority: "low" as const,
  },
};

// Helper function to format notification messages
function formatMessage(template: string, data: Record<string, any>): string {
  let message = template;
  Object.entries(data).forEach(([key, value]) => {
    message = message.replace(new RegExp(`{${key}}`, 'g'), String(value || ''));
  });
  return message;
}

// Send booking notification to multiple recipients (Production Ready)
export const sendBookingNotifications = mutation({
  args: {
    bookingId: v.id("bookings"),
    notificationType: v.union(
      v.literal("CUSTOMER_BOOKING_CONFIRMED"),
      v.literal("CUSTOMER_BOOKING_REMINDER"),
      v.literal("CUSTOMER_BOOKING_CANCELLED"),
      v.literal("CUSTOMER_BOOKING_RESCHEDULED"),
      v.literal("CUSTOMER_PAYMENT_RECEIVED"),
      v.literal("CUSTOMER_CHECK_IN_REMINDER"),
      v.literal("STAFF_NEW_BOOKING"),
      v.literal("STAFF_BOOKING_CANCELLED"),
      v.literal("STAFF_BOOKING_MODIFIED"),
      v.literal("STAFF_WALKIN_BOOKING"),
      v.literal("STAFF_PAYMENT_ISSUE"),
      v.literal("BARBER_NEW_ASSIGNMENT"),
      v.literal("BARBER_APPOINTMENT_CANCELLED"),
      v.literal("BARBER_APPOINTMENT_RESCHEDULED"),
      v.literal("BARBER_DAILY_SUMMARY"),
      v.literal("BARBER_CUSTOMER_ARRIVAL"),
      v.literal("SYSTEM_MAINTENANCE"),
      v.literal("SYSTEM_FEATURE_UPDATE")
    ),
    recipients: v.array(v.object({
      type: v.union(v.literal("customer"), v.literal("staff"), v.literal("barber"), v.literal("admin")),
      userId: v.optional(v.id("users")),
      branchId: v.optional(v.id("branches")),
    })),
    metadata: v.optional(v.object({
      new_date: v.optional(v.string()),
      new_time: v.optional(v.string()),
      amount: v.optional(v.number()),
      reason: v.optional(v.string()),
      start_time: v.optional(v.string()),
      end_time: v.optional(v.string()),
      feature_name: v.optional(v.string()),
      receipt_number: v.optional(v.string()),
      count: v.optional(v.number()),
      date: v.optional(v.string()),
      time: v.optional(v.string()),
      customer_name: v.optional(v.string()),
      service_name: v.optional(v.string()),
      payment_method: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const { bookingId, notificationType, recipients, metadata } = args;
    
    try {
      // Validate input
      if (!bookingId || !notificationType || !recipients || recipients.length === 0) {
        throw new Error("Invalid notification parameters");
      }
      
      // Get booking details with error handling
      const booking = await ctx.db.get(bookingId);
      if (!booking) {
        console.error(`Booking not found: ${bookingId}`);
        return { success: false, error: "Booking not found", sentCount: 0 };
      }
      
      // Get related data with error handling
      const [service, branch, customer, barber] = await Promise.allSettled([
        ctx.db.get(booking.service),
        ctx.db.get(booking.branch_id),
        booking.customer ? ctx.db.get(booking.customer) : Promise.resolve(null),
        booking.barber ? ctx.db.get(booking.barber) : Promise.resolve(null),
      ]);
      
      // Validate required data
      if (!service.value || !branch.value) {
        console.error(`Required booking data not found for booking: ${bookingId}`);
        return { success: false, error: "Required booking data not found", sentCount: 0 };
      }
      
      // Check if any data retrieval failed
      const dataErrors = [service, branch, customer, barber]
        .filter(result => result.status === "rejected")
        .map(result => result.reason);
      
      if (dataErrors.length > 0) {
        console.error("Data retrieval errors:", dataErrors);
        // Continue with available data rather than failing
      }
      
      const template = BOOKING_NOTIFICATION_TEMPLATES[notificationType];
      const now = Date.now();
      
      // Prepare notification data with fallbacks
      const notificationData = {
        service_name: service.value?.name || "Service",
        branch_name: branch.value?.name || "Branch",
        date: booking.date,
        time: booking.time,
        customer_name: customer.value?.username || booking.customer_name || 
                         customer.value?.nickname || "Customer",
        customer_email: customer.value?.email || booking.customer_email || "",
        ...(metadata || {}),
      };
      
      // Format message with error handling
      let formattedMessage: string;
      try {
        formattedMessage = formatMessage(template.message, notificationData);
      } catch (error) {
        console.error("Message formatting error:", error);
        formattedMessage = template.message; // Use unformatted message as fallback
      }
      
      // Send notifications to all recipients with error handling
      const notificationPromises = recipients.map(async (recipient) => {
        try {
          let userId: Id<"users"> | undefined;
          
          // Determine recipient user ID
          if (recipient.userId) {
            // Validate user exists and is active
            const user = await ctx.db.get(recipient.userId);
            if (!user || !user.is_active) {
              console.log(`Skipping inactive user: ${recipient.userId}`);
              return null;
            }
            userId = recipient.userId;
          } else if (recipient.type === "customer" && booking.customer) {
            userId = booking.customer;
          } else if (recipient.type === "barber" && booking.barber) {
            userId = booking.barber;
          } else if (recipient.type === "staff") {
            // For staff, send to all active staff in the branch
            return sendToBranchStaff(ctx, {
              template,
              notificationData,
              bookingId,
              branchId: booking.branch_id,
              recipientType: recipient.type,
              now,
              metadata,
            });
          } else if (recipient.type === "admin") {
            // For admin, send to all branch admins and super admins
            return sendToAdminUsers(ctx, {
              template,
              notificationData,
              bookingId,
              branchId: booking.branch_id,
              now,
              metadata,
            });
          }
          
          if (!userId) {
            console.log(`No valid user ID found for recipient: ${recipient.type}`);
            return null;
          }
          
          // Check if user has notifications muted (optional feature)
          const user = await ctx.db.get(userId);
          if (user && user.preferences?.notifications_muted) {
            console.log(`Skipping muted user: ${userId}`);
            return null;
          }
          
          // Create individual notification
          const notificationData = {
            title: template.title,
            message: formattedMessage,
            type: template.type,
            priority: template.priority,
            recipient_id: userId,
            recipient_type: recipient.type,
            sender_id: undefined, // System notification
            is_read: false,
            is_archived: false,
            action_url: booking.booking_code ? `/bookings/${booking.booking_code}` : undefined,
            action_label: "View Booking",
            metadata: {
              booking_id: bookingId,
              service_id: booking.service,
              barber_id: booking.barber,
              branch_id: booking.branch_id,
              event_id: undefined,
              voucher_id: undefined,
              ...metadata,
            },
            expires_at: calculateExpirationDate(now, template.type),
            createdAt: now,
            updatedAt: now,
          };
          
          return await ctx.db.insert("notifications", notificationData);
        } catch (error) {
          console.error(`Failed to send notification to ${recipient.type}:`, error);
          return null;
        }
      });
      
      const results = await Promise.allSettled(notificationPromises);
      const successful = results.filter(r => r.status === "fulfilled" && r.value !== null).length;
      const failed = results.filter(r => r.status === "rejected").length;
      
      if (failed > 0) {
        console.log(`${failed} notifications failed to send`);
      }
      
      return { 
        success: true, 
        sentCount: successful, 
        failedCount: failed,
        notificationType,
        bookingId: booking.booking_code
      };
      
    } catch (error) {
      console.error("Critical error in sendBookingNotifications:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error",
        sentCount: 0,
        notificationType,
        bookingId
      };
    }
  },
});

// Helper function to send notifications to branch staff
async function sendToBranchStaff(ctx: any, params: any) {
  const { template, notificationData, bookingId, branchId, recipientType, now, metadata } = params;
  
  // Get all active staff in the branch
  const staffUsers = await ctx.db
    .query("users")
    .withIndex("by_branch_role", (q) => 
      q.eq("branch_id", branchId).eq("role", "staff")
    )
    .filter(q => q.eq(q.field("is_active"), true))
    .collect();
  
  const notifications = staffUsers.map(staff => 
    ctx.db.insert("notifications", {
      title: template.title,
      message: formatMessage(template.message, notificationData),
      type: template.type,
      priority: template.priority,
      recipient_id: staff._id,
      recipient_type,
      sender_id: undefined,
      is_read: false,
      is_archived: false,
      action_url: `/bookings/${bookingId}`,
      action_label: "View Booking",
      metadata: {
        booking_id: bookingId,
        ...metadata,
      },
      expires_at: calculateExpirationDate(now, template.type),
      createdAt: now,
      updatedAt: now,
    })
  );
  
  return Promise.all(notifications);
}

// Helper function to send notifications to admin users
async function sendToAdminUsers(ctx: any, params: any) {
  const { template, notificationData, bookingId, branchId, recipientType, now, metadata } = params;
  
  // Get branch admins
  const branchAdmins = await ctx.db
    .query("users")
    .withIndex("by_branch_role", (q) => 
      q.eq("branch_id", branchId).eq("role", "branch_admin")
    )
    .filter(q => q.eq(q.field("is_active"), true))
    .collect();
  
  // Get super admins
  const superAdmins = await ctx.db
    .query("users")
    .withIndex("by_role", (q) => q.eq("role", "super_admin"))
    .filter(q => q.eq(q.field("is_active"), true))
    .collect();
  
  const adminUsers = [...branchAdmins, ...superAdmins];
  
  const notifications = adminUsers.map(admin => 
    ctx.db.insert("notifications", {
      title: template.title,
      message: formatMessage(template.message, notificationData),
      type: template.type,
      priority: template.priority,
      recipient_id: admin._id,
      recipient_type,
      sender_id: undefined,
      is_read: false,
      is_archived: false,
      action_url: `/bookings/${bookingId}`,
      action_label: "View Booking",
      metadata: {
        booking_id: bookingId,
        ...metadata,
      },
      expires_at: calculateExpirationDate(now, template.type),
      createdAt: now,
      updatedAt: now,
    })
  );
  
  return Promise.all(notifications);
}

// Calculate expiration date based on notification type
function calculateExpirationDate(now: number, type: string): number {
  const expirationPeriods = {
    booking: 7 * 24 * 60 * 60 * 1000, // 7 days
    payment: 30 * 24 * 60 * 60 * 1000, // 30 days
    system: 14 * 24 * 60 * 60 * 1000, // 14 days
    promotion: 7 * 24 * 60 * 60 * 1000, // 7 days
    reminder: 24 * 60 * 60 * 1000, // 24 hours
    alert: 3 * 24 * 60 * 60 * 1000, // 3 days
  };
  
  return now + (expirationPeriods[type as keyof typeof expirationPeriods] || expirationPeriods.booking);
}

// Get recent notifications for a user with filtering
export const getRecentNotifications = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
    type: v.optional(v.union(
      v.literal("booking"),
      v.literal("payment"),
      v.literal("system"),
      v.literal("promotion"),
      v.literal("reminder"),
      v.literal("alert")
    )),
    unreadOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId, limit = 20, type, unreadOnly = false } = args;
    
    let query = ctx.db
      .query("notifications")
      .withIndex("by_recipient", (q) => q.eq("recipient_id", userId))
      .order("desc");
    
    // Apply filters
    if (type) {
      query = query.filter(q => q.eq(q.field("type"), type));
    }
    
    if (unreadOnly) {
      query = query.filter(q => q.eq(q.field("is_read"), false));
    }
    
    const notifications = await query.take(limit);
    
    // Filter out expired notifications
    const now = Date.now();
    return notifications.filter(notification => 
      !notification.expires_at || notification.expires_at > now
    );
  },
});

// Mark notifications as read in bulk
export const markNotificationsAsRead = mutation({
  args: {
    userId: v.id("users"),
    notificationIds: v.optional(v.array(v.id("notifications"))),
    type: v.optional(v.union(
      v.literal("booking"),
      v.literal("payment"),
      v.literal("system"),
      v.literal("promotion"),
      v.literal("reminder"),
      v.literal("alert")
    )),
  },
  handler: async (ctx, args) => {
    const { userId, notificationIds, type } = args;
    
    let notificationsToUpdate: any[] = [];
    
    if (notificationIds && notificationIds.length > 0) {
      // Mark specific notifications as read
      notificationsToUpdate = await Promise.all(
        notificationIds.map(id => ctx.db.get(id))
      );
    } else if (type) {
      // Mark all notifications of a specific type as read
      notificationsToUpdate = await ctx.db
        .query("notifications")
        .withIndex("by_recipient_type", (q) => 
          q.eq("recipient_id", userId).eq("type", type)
        )
        .filter(q => q.eq(q.field("is_read"), false))
        .collect();
    } else {
      // Mark all notifications as read
      notificationsToUpdate = await ctx.db
        .query("notifications")
        .withIndex("by_recipient_read", (q) => 
          q.eq("recipient_id", userId).eq("is_read", false)
        )
        .collect();
    }
    
    const now = Date.now();
    const updatePromises = notificationsToUpdate
      .filter(notification => notification && notification.recipient_id === userId)
      .map(notification =>
        ctx.db.patch(notification._id, {
          is_read: true,
          updatedAt: now,
        })
      );
    
    await Promise.all(updatePromises);
    
    return { success: true, count: updatePromises.length };
  },
});

// Delete expired notifications
export const cleanupExpiredNotifications = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    const expiredNotifications = await ctx.db
      .query("notifications")
      .filter(q => q.lt(q.field("expires_at"), now))
      .collect();
    
    const deletePromises = expiredNotifications.map(notification =>
      ctx.db.delete(notification._id)
    );
    
    await Promise.all(deletePromises);
    
    return { success: true, deletedCount: expiredNotifications.length };
  },
});

// Get notification statistics for a user
export const getNotificationStats = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId } = args;
    
    const [allNotifications, unreadNotifications, byType] = await Promise.all([
      // Get all notifications count
      ctx.db
        .query("notifications")
        .withIndex("by_recipient", (q) => q.eq("recipient_id", userId))
        .collect(),
      
      // Get unread notifications count
      ctx.db
        .query("notifications")
        .withIndex("by_recipient_read", (q) => 
          q.eq("recipient_id", userId).eq("is_read", false)
        )
        .collect(),
      
      // Get notifications grouped by type
      Promise.all(
        ["booking", "payment", "system", "promotion", "reminder", "alert"].map(type =>
          ctx.db
            .query("notifications")
            .withIndex("by_recipient", (q) => q.eq("recipient_id", userId))
            .filter((q) => q.eq(q.field("type"), type))
            .collect()
        )
      ),
    ]);
    
    const now = Date.now();
    
    // Filter out expired notifications
    const filterExpired = (notifications: any[]) =>
      notifications.filter(n => !n.expires_at || n.expires_at > now);
    
    const validAll = filterExpired(allNotifications);
    const validUnread = filterExpired(unreadNotifications);
    const validByType = byType.map(filterExpired);
    
    return {
      totalCount: validAll.length,
      unreadCount: validUnread.length,
      readCount: validAll.length - validUnread.length,
      byType: {
        booking: validByType[0].length,
        payment: validByType[1].length,
        system: validByType[2].length,
        promotion: validByType[3].length,
        reminder: validByType[4].length,
        alert: validByType[5].length,
      },
    };
  },
});
