import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { throwUserError, ERROR_CODES, validateInput } from "../utils/errors";
import { Id } from "../_generated/dataModel";

// Get all notifications for a user (including branch-scoped for staff)
export const getUserNotifications = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, limit = 50 } = args;
    
    // Get the user to determine their role and branch
    const user = await ctx.db.get(userId);
    if (!user) return [];
    
    let notifications = [];
    
    // Get notifications specifically for this user (matching both user ID and type)
    const directNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_recipient", (q) => q.eq("recipient_id", userId))
      .order("desc")
      .collect();
    
    // Filter to only include notifications that match the user's role/type
    const roleMapping = {
      'customer': 'customer',
      'staff': 'staff',
      'branch_admin': 'admin',
      'super_admin': 'admin',
      'barber': 'barber',
      'admin': 'admin'
    };
    
    const userType = roleMapping[user.role] || user.role;
    const filteredDirectNotifications = directNotifications
      .filter(n => n.recipient_type === userType)
      .slice(0, limit);
    
    notifications.push(...filteredDirectNotifications);
    
    // If user is staff, branch_admin, or barber, also get branch-wide notifications
    if (['staff', 'branch_admin', 'barber'].includes(user.role) && user.branch_id) {
      const branchNotifications = await ctx.db
        .query("notifications")
        .withIndex("by_branch_type", (q) => 
          q.eq("branch_id", user.branch_id).eq("recipient_type", "staff")
        )
        .order("desc")
        .take(limit);
      
      // Add branch notifications that aren't already in direct notifications
      const existingIdsStaff = new Set(filteredDirectNotifications.map(n => n._id));
      const newBranchNotifications = branchNotifications.filter(n => !existingIdsStaff.has(n._id));
      
      notifications.push(...newBranchNotifications);
    }
    
    // If user is super_admin, get all admin notifications
    if (user.role === 'super_admin') {
      const adminNotifications = await ctx.db
        .query("notifications")
        .withIndex("by_recipient_type", (q) => 
          q.eq("recipient_type", "admin")
        )
        .order("desc")
        .take(limit);
      
      // Add admin notifications that aren't already included
      const existingIdsAdmin = new Set(notifications.map(n => n._id));
      const newAdminNotifications = adminNotifications.filter(n => !existingIdsAdmin.has(n._id));
      
      notifications.push(...newAdminNotifications);
    }
    
    // Sort all notifications by creation date and limit
    notifications.sort((a, b) => b.createdAt - a.createdAt);
    
    return notifications.slice(0, limit);
  },
});

// Get unread notification count (including branch-scoped for staff)
export const getUnreadCount = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get the user to determine their role and branch
    const user = await ctx.db.get(args.userId);
    if (!user) return 0;
    
    let allNotifications = [];
    
    // Get unread notifications specifically for this user
    const directNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_recipient_read", (q) => 
        q.eq("recipient_id", args.userId).eq("is_read", false)
      )
      .collect();
    
    allNotifications.push(...directNotifications);
    
    // If user is staff, branch_admin, or barber, also get unread branch-wide notifications
    if (['staff', 'branch_admin', 'barber'].includes(user.role) && user.branch_id) {
      const branchNotifications = await ctx.db
        .query("notifications")
        .withIndex("by_branch_read", (q) => 
          q.eq("branch_id", user.branch_id).eq("is_read", false)
        )
        .filter(q => q.eq(q.field("recipient_type"), "staff"))
        .collect();
      
      // Add branch notifications that aren't already in direct notifications
      const existingIds = new Set(directNotifications.map(n => n._id));
      const newBranchNotifications = branchNotifications.filter(n => !existingIds.has(n._id));
      
      allNotifications.push(...newBranchNotifications);
    }
    
    // If user is super_admin, get all unread admin notifications
    if (user.role === 'super_admin') {
      const adminNotifications = await ctx.db
        .query("notifications")
        .withIndex("by_recipient_type", (q) => 
          q.eq("recipient_type", "admin")
        )
        .filter(q => q.eq(q.field("is_read"), false))
        .collect();
      
      // Add admin notifications that aren't already included
      const existingIds = new Set(allNotifications.map(n => n._id));
      const newAdminNotifications = adminNotifications.filter(n => !existingIds.has(n._id));
      
      allNotifications.push(...newAdminNotifications);
    }
    
    return allNotifications.length;
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
    recipient_id: v.optional(v.id("users")),
    recipient_type: v.union(v.literal("staff"), v.literal("customer"), v.literal("admin"), v.literal("barber")),
    sender_id: v.optional(v.id("users")),
    branch_id: v.optional(v.id("branches")),
    action_url: v.optional(v.string()),
    action_label: v.optional(v.string()),
    metadata: v.optional(v.any()),
    expires_at: v.optional(v.number()),
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
      branch_id: args.branch_id,
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

// Mark notification as read
export const markAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    
    if (!notification || notification.recipient_id !== args.userId) {
      throwUserError(ERROR_CODES.PERMISSION_DENIED, "Notification not accessible.", "You don't have permission to access this notification.");
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
      throwUserError(ERROR_CODES.PERMISSION_DENIED, "Notification not accessible.", "You don't have permission to delete this notification.");
    }
    
    await ctx.db.delete(args.notificationId);
    
    return { success: true };
  },
});

// Clear all notifications for a user - regenerated
export const clearAllNotifications = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get the user to determine their role and branch
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throwUserError(ERROR_CODES.USER_NOT_FOUND, "User not found.", "User not found.");
    }
    
    let notificationsToDelete = [];
    
    // Get all notifications for this user (direct notifications)
    const directNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_recipient", (q) => q.eq("recipient_id", args.userId))
      .collect();
    
    notificationsToDelete.push(...directNotifications);
    
    // If user is staff, branch_admin, or barber, also get branch-wide notifications
    if (['staff', 'branch_admin', 'barber'].includes(user.role) && user.branch_id) {
      const branchNotifications = await ctx.db
        .query("notifications")
        .withIndex("by_branch_type", (q) => 
          q.eq("branch_id", user.branch_id).eq("recipient_type", "staff")
        )
        .collect();
      
      // Add branch notifications that aren't already in direct notifications
      const existingIds = new Set(directNotifications.map(n => n._id));
      const newBranchNotifications = branchNotifications.filter(n => !existingIds.has(n._id));
      
      notificationsToDelete.push(...newBranchNotifications);
    }
    
    // If user is super_admin, get all admin notifications
    if (user.role === 'super_admin') {
      const adminNotifications = await ctx.db
        .query("notifications")
        .withIndex("by_recipient_type", (q) => 
          q.eq("recipient_type", "admin")
        )
        .collect();
      
      // Add admin notifications that aren't already included
      const existingIds = new Set(notificationsToDelete.map(n => n._id));
      const newAdminNotifications = adminNotifications.filter(n => !existingIds.has(n._id));
      
      notificationsToDelete.push(...newAdminNotifications);
    }
    
    // Delete all notifications
    await Promise.all(
      notificationsToDelete.map((notification) =>
        ctx.db.delete(notification._id)
      )
    );
    
    return { success: true, count: notificationsToDelete.length };
  },
});