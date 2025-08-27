import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";

// Get all notifications for a user
export const getUserNotifications = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, limit = 50 } = args;
    
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_recipient", (q) => q.eq("recipient_id", userId))
      .order("desc")
      .take(limit);
    
    return notifications;
  },
});

// Get unread notification count
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
      .collect();
    
    return count.length;
  },
});

// Create a new notification
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
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
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
      createdAt: now,
      updatedAt: now,
    });
    
    return notificationId;
  },
});

// Mark notification as read
export const markAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    
    if (!notification || notification.recipient_id !== args.userId) {
      throw new Error("Notification not found or unauthorized");
    }
    
    await ctx.db.patch(args.notificationId, {
      is_read: true,
      updatedAt: Date.now(),
    });
    
    return { success: true };
  },
});

// Mark all notifications as read
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

// Delete notification
export const deleteNotification = mutation({
  args: {
    notificationId: v.id("notifications"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    
    if (!notification || notification.recipient_id !== args.userId) {
      throw new Error("Notification not found or unauthorized");
    }
    
    await ctx.db.delete(args.notificationId);
    
    return { success: true };
  },
});