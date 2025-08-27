import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";

// Query to get all notifications for a user
export const getUserNotifications = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId, limit = 50, includeArchived = false } = args;
    
    let query = ctx.db
      .query("notifications")
      .withIndex("by_recipient", (q) => q.eq("recipient_id", userId))
      .order("desc");
    
    if (!includeArchived) {
      query = query.filter((q) => q.eq(q.field("is_archived"), false));
    }
    
    const notifications = await query.take(limit);
    
    // Enrich notifications with sender information
    const enrichedNotifications = await Promise.all(
      notifications.map(async (notification) => {
        let senderInfo: {
          _id: Id<"users">;
          username: string;
          email: string;
          role: "staff" | "customer" | "admin";
        } | null = null;
        if (notification.sender_id) {
          const sender = await ctx.db.get(notification.sender_id);
          if (sender) {
            senderInfo = {
              _id: sender._id,
              username: sender.username,
              email: sender.email,
              role: sender.role,
            };
          }
        }
        
        return {
          ...notification,
          sender: senderInfo,
        };
      })
    );
    
    return enrichedNotifications;
  },
});

// Query to get unread notification count
export const getUnreadCount = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const count = await ctx.db
      .query("notifications")
      .withIndex("by_recipient_read", (q) => 
        q.eq("recipient_id", args.userId).eq("is_read", false)
      )
      .filter((q) => q.eq(q.field("is_archived"), false))
      .collect();
    
    return count.length;
  },
});

// Query to get notifications by type
export const getNotificationsByType = query({
  args: {
    userId: v.id("users"),
    type: v.union(
      v.literal("booking"),
      v.literal("payment"),
      v.literal("system"),
      v.literal("promotion"),
      v.literal("reminder"),
      v.literal("alert")
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, type, limit = 20 } = args;
    
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_recipient", (q) => q.eq("recipient_id", userId))
      .filter((q) => 
        q.and(
          q.eq(q.field("type"), type),
          q.eq(q.field("is_archived"), false)
        )
      )
      .order("desc")
      .take(limit);
    
    return notifications;
  },
});

// Mutation to create a new notification
export const createNotification = mutation({
  args: {
    title: v.string(),
    message: v.string(),
    type: v.union(
      v.literal("booking"),
      v.literal("payment"),
      v.literal("system"),
      v.literal("promotion"),
      v.literal("reminder"),
      v.literal("alert")
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    ),
    recipient_id: v.id("users"),
    recipient_type: v.union(v.literal("staff"), v.literal("customer"), v.literal("admin")),
    sender_id: v.optional(v.id("users")),
    action_url: v.optional(v.string()),
    action_label: v.optional(v.string()),
    metadata: v.optional(v.object({
      booking_id: v.optional(v.id("bookings")),
      service_id: v.optional(v.id("services")),
      barber_id: v.optional(v.id("barbers")),
      event_id: v.optional(v.id("events")),
      voucher_id: v.optional(v.id("vouchers")),
    })),
    expires_at: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Validate recipient exists
    const recipient = await ctx.db.get(args.recipient_id);
    if (!recipient) {
      throw new Error("Recipient user not found");
    }
    
    // Validate sender if provided
    if (args.sender_id) {
      const sender = await ctx.db.get(args.sender_id);
      if (!sender) {
        throw new Error("Sender user not found");
      }
    }
    
    const notificationId = await ctx.db.insert("notifications", {
      title: args.title,
      message: args.message,
      type: args.type,
      priority: args.priority,
      recipient_id: args.recipient_id,
      recipient_type: args.recipient_type,
      sender_id: args.sender_id,
      is_read: false,
      is_archived: false,
      action_url: args.action_url,
      action_label: args.action_label,
      metadata: args.metadata,
      expires_at: args.expires_at,
      createdAt: now,
      updatedAt: now,
    });
    
    return notificationId;
  },
});

// Mutation to mark notification as read
export const markAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    
    if (!notification) {
      throw new Error("Notification not found");
    }
    
    if (notification.recipient_id !== args.userId) {
      throw new Error("Unauthorized: You can only mark your own notifications as read");
    }
    
    await ctx.db.patch(args.notificationId, {
      is_read: true,
      updatedAt: Date.now(),
    });
    
    return { success: true };
  },
});

// Mutation to mark all notifications as read
export const markAllAsRead = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_recipient_read", (q) => 
        q.eq("recipient_id", args.userId).eq("is_read", false)
      )
      .collect();
    
    const now = Date.now();
    
    await Promise.all(
      unreadNotifications.map((notification) =>
        ctx.db.patch(notification._id, {
          is_read: true,
          updatedAt: now,
        })
      )
    );
    
    return { success: true, count: unreadNotifications.length };
  },
});

// Mutation to archive notification
export const archiveNotification = mutation({
  args: {
    notificationId: v.id("notifications"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    
    if (!notification) {
      throw new Error("Notification not found");
    }
    
    if (notification.recipient_id !== args.userId) {
      throw new Error("Unauthorized: You can only archive your own notifications");
    }
    
    await ctx.db.patch(args.notificationId, {
      is_archived: true,
      updatedAt: Date.now(),
    });
    
    return { success: true };
  },
});

// Mutation to delete notification (admin only)
export const deleteNotification = mutation({
  args: {
    notificationId: v.id("notifications"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized: Only admins can delete notifications");
    }
    
    const notification = await ctx.db.get(args.notificationId);
    
    if (!notification) {
      throw new Error("Notification not found");
    }
    
    await ctx.db.delete(args.notificationId);
    
    return { success: true };
  },
});

// Mutation to create booking-related notifications
export const createBookingNotification = mutation({
  args: {
    bookingId: v.id("bookings"),
    type: v.union(
      v.literal("booking_created"),
      v.literal("booking_confirmed"),
      v.literal("booking_cancelled"),
      v.literal("booking_completed"),
      v.literal("booking_reminder")
    ),
    recipientId: v.optional(v.id("users")),
    senderId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    
    if (!booking) {
      throw new Error("Booking not found");
    }
    
    const service = await ctx.db.get(booking.service);
    const customer = await ctx.db.get(booking.customer);
    
    let title = "";
    let message = "";
    let priority: "low" | "medium" | "high" | "urgent" = "medium";
    let recipientId = args.recipientId || booking.customer;
    
    switch (args.type) {
      case "booking_created":
        title = "New Booking Created";
        message = `Your booking for ${service?.name} on ${booking.date} at ${booking.time} has been created.`;
        priority = "medium";
        break;
      case "booking_confirmed":
        title = "Booking Confirmed";
        message = `Your booking for ${service?.name} on ${booking.date} at ${booking.time} has been confirmed.`;
        priority = "high";
        break;
      case "booking_cancelled":
        title = "Booking Cancelled";
        message = `Your booking for ${service?.name} on ${booking.date} at ${booking.time} has been cancelled.`;
        priority = "high";
        break;
      case "booking_completed":
        title = "Service Completed";
        message = `Your ${service?.name} service has been completed. Thank you for choosing us!`;
        priority = "medium";
        break;
      case "booking_reminder":
        title = "Upcoming Appointment";
        message = `Reminder: You have a ${service?.name} appointment tomorrow at ${booking.time}.`;
        priority = "high";
        break;
    }
    
    const notificationId = await ctx.db.insert("notifications", {
      title,
      message,
      type: "booking",
      priority,
      recipient_id: recipientId,
      recipient_type: customer?.role || "customer",
      sender_id: args.senderId,
      is_read: false,
      is_archived: false,
      action_url: `/bookings/${booking._id}`,
      action_label: "View Booking",
      metadata: {
        booking_id: booking._id,
        service_id: booking.service,
        barber_id: booking.barber,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    return notificationId;
  },
});

// Mutation to broadcast notification to all users of a specific type
export const broadcastNotification = mutation({
  args: {
    title: v.string(),
    message: v.string(),
    type: v.union(
      v.literal("system"),
      v.literal("promotion"),
      v.literal("alert")
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    ),
    recipient_type: v.union(v.literal("staff"), v.literal("customer"), v.literal("admin"), v.literal("all")),
    sender_id: v.id("users"),
    action_url: v.optional(v.string()),
    action_label: v.optional(v.string()),
    expires_at: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const sender = await ctx.db.get(args.sender_id);
    
    if (!sender || sender.role !== "admin") {
      throw new Error("Unauthorized: Only admins can broadcast notifications");
    }
    
    let users;
    
    if (args.recipient_type === "all") {
      users = await ctx.db.query("users").collect();
    } else {
      users = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("role"), args.recipient_type))
        .collect();
    }
    
    const now = Date.now();
    
    const notificationIds = await Promise.all(
      users.map((user) =>
        ctx.db.insert("notifications", {
          title: args.title,
          message: args.message,
          type: args.type,
          priority: args.priority,
          recipient_id: user._id,
          recipient_type: user.role,
          sender_id: args.sender_id,
          is_read: false,
          is_archived: false,
          action_url: args.action_url,
          action_label: args.action_label,
          expires_at: args.expires_at,
          createdAt: now,
          updatedAt: now,
        })
      )
    );
    
    return { success: true, count: notificationIds.length };
  },
});

// Query to get notification statistics (admin only)
export const getNotificationStats = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized: Only admins can view notification statistics");
    }
    
    const allNotifications = await ctx.db.query("notifications").collect();
    
    const stats = {
      total: allNotifications.length,
      unread: allNotifications.filter(n => !n.is_read).length,
      archived: allNotifications.filter(n => n.is_archived).length,
      byType: {
        booking: allNotifications.filter(n => n.type === "booking").length,
        payment: allNotifications.filter(n => n.type === "payment").length,
        system: allNotifications.filter(n => n.type === "system").length,
        promotion: allNotifications.filter(n => n.type === "promotion").length,
        reminder: allNotifications.filter(n => n.type === "reminder").length,
        alert: allNotifications.filter(n => n.type === "alert").length,
      },
      byPriority: {
        low: allNotifications.filter(n => n.priority === "low").length,
        medium: allNotifications.filter(n => n.priority === "medium").length,
        high: allNotifications.filter(n => n.priority === "high").length,
        urgent: allNotifications.filter(n => n.priority === "urgent").length,
      },
    };
    
    return stats;
  },
});