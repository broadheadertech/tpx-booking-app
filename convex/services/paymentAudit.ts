import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

/**
 * Payment Audit Service (Story 9.1 - FR27, FR28, FR29)
 * Centralized audit logging functions for payment events
 */

// Event type union for TypeScript
export type PaymentEventType =
  | "link_created"
  | "payment_initiated"
  | "payment_completed"
  | "payment_failed"
  | "payment_refunded"
  | "webhook_received"
  | "webhook_verified"
  | "webhook_failed"
  | "cash_collected"
  | "booking_completed";

// ============================================================================
// MUTATIONS - Logging Functions
// ============================================================================

/**
 * Log a payment event (FR27, FR28, FR29)
 * Centralized function for consistent audit logging
 */
export const logPaymentEvent = mutation({
  args: {
    branch_id: v.id("branches"),
    booking_id: v.optional(v.id("bookings")),
    transaction_id: v.optional(v.id("transactions")),
    paymongo_payment_id: v.optional(v.string()),
    paymongo_link_id: v.optional(v.string()),
    event_type: v.union(
      v.literal("link_created"),
      v.literal("checkout_session_created"),
      v.literal("payment_initiated"),
      v.literal("payment_completed"),
      v.literal("payment_failed"),
      v.literal("payment_refunded"),
      v.literal("webhook_received"),
      v.literal("webhook_verified"),
      v.literal("webhook_failed"),
      v.literal("cash_collected"),
      v.literal("booking_completed")
    ),
    amount: v.optional(v.number()),
    payment_method: v.optional(v.string()),
    payment_for: v.optional(v.union(
      v.literal("full_service"),
      v.literal("convenience_fee"),
      v.literal("remaining_balance"),
      v.literal("full_cash"),
      v.literal("partial")
    )),
    raw_payload: v.optional(v.any()),
    error_message: v.optional(v.string()),
    ip_address: v.optional(v.string()),
    created_by: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const logId = await ctx.db.insert("paymentAuditLog", {
      branch_id: args.branch_id,
      booking_id: args.booking_id,
      transaction_id: args.transaction_id,
      paymongo_payment_id: args.paymongo_payment_id,
      paymongo_link_id: args.paymongo_link_id,
      event_type: args.event_type,
      amount: args.amount,
      payment_method: args.payment_method,
      payment_for: args.payment_for,
      raw_payload: args.raw_payload,
      error_message: args.error_message,
      ip_address: args.ip_address,
      created_at: Date.now(),
      created_by: args.created_by,
    });

    return logId;
  },
});

// ============================================================================
// QUERIES - Audit Log Retrieval
// ============================================================================

/**
 * Get audit logs for a specific branch (FR30 - Branch Admin View)
 * Branch admins can only see their own branch's logs
 */
export const getAuditLogByBranch = query({
  args: {
    branch_id: v.id("branches"),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    event_type_filter: v.optional(v.string()),
    start_date: v.optional(v.number()),
    end_date: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const offset = args.offset || 0;

    // Query logs by branch with created_at index for sorting
    let logsQuery = ctx.db
      .query("paymentAuditLog")
      .withIndex("by_branch_created", (q) => q.eq("branch_id", args.branch_id))
      .order("desc");

    // Get all logs first, then filter and paginate
    const allLogs = await logsQuery.collect();

    // Apply filters
    let filteredLogs = allLogs;

    // Filter by event type
    if (args.event_type_filter && args.event_type_filter !== "all") {
      filteredLogs = filteredLogs.filter(
        (log) => log.event_type === args.event_type_filter
      );
    } else {
      // By default (when "all"), exclude webhook events - they're internal/technical
      const webhookEvents = ["webhook_received", "webhook_verified", "webhook_failed"];
      filteredLogs = filteredLogs.filter(
        (log) => !webhookEvents.includes(log.event_type)
      );
    }

    // Filter by date range
    if (args.start_date) {
      filteredLogs = filteredLogs.filter(
        (log) => log.created_at >= args.start_date!
      );
    }
    if (args.end_date) {
      filteredLogs = filteredLogs.filter(
        (log) => log.created_at <= args.end_date!
      );
    }

    // Calculate total before pagination
    const total = filteredLogs.length;

    // Apply pagination
    const paginatedLogs = filteredLogs.slice(offset, offset + limit);

    // Enrich logs with booking info
    const enrichedLogs = await Promise.all(
      paginatedLogs.map(async (log) => {
        let bookingInfo = null;
        if (log.booking_id) {
          const booking = await ctx.db.get(log.booking_id);
          if (booking) {
            bookingInfo = {
              booking_code: booking.booking_code,
              customer_name: booking.customer_name,
              service_name: booking.service_name,
            };
          }
        }

        return {
          ...log,
          booking_info: bookingInfo,
        };
      })
    );

    return {
      logs: enrichedLogs,
      total,
      hasMore: offset + limit < total,
    };
  },
});

/**
 * Get all audit logs for a specific booking
 * Shows complete audit trail for a booking
 */
export const getAuditLogByBooking = query({
  args: {
    booking_id: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("paymentAuditLog")
      .withIndex("by_booking", (q) => q.eq("booking_id", args.booking_id))
      .order("asc")
      .collect();

    // Get booking details
    const booking = await ctx.db.get(args.booking_id);

    // Get service details if booking exists
    let serviceName = "Unknown Service";
    if (booking?.service) {
      const service = await ctx.db.get(booking.service);
      serviceName = service?.name || "Unknown Service";
    }

    return {
      logs,
      booking: booking
        ? {
            booking_code: booking.booking_code,
            customer_name: booking.customer_name,
            service_name: serviceName,
            payment_status: booking.payment_status,
            service_price: booking.price || booking.final_price,
            convenience_fee_paid: booking.convenience_fee_paid,
            booking_fee: booking.booking_fee,
          }
        : null,
    };
  },
});

/**
 * Get all audit logs across all branches (FR31 - Super Admin View)
 * Super admins can see all branches' logs
 */
export const getAllAuditLogs = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    branch_filter: v.optional(v.id("branches")),
    event_type_filter: v.optional(v.string()),
    start_date: v.optional(v.number()),
    end_date: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const offset = args.offset || 0;

    // Query all logs by created_at for sorting
    let logsQuery = ctx.db
      .query("paymentAuditLog")
      .withIndex("by_created_at")
      .order("desc");

    const allLogs = await logsQuery.collect();

    // Apply filters
    let filteredLogs = allLogs;

    // Filter by branch
    if (args.branch_filter) {
      filteredLogs = filteredLogs.filter(
        (log) => log.branch_id === args.branch_filter
      );
    }

    // Filter by event type
    if (args.event_type_filter && args.event_type_filter !== "all") {
      filteredLogs = filteredLogs.filter(
        (log) => log.event_type === args.event_type_filter
      );
    }

    // Filter by date range
    if (args.start_date) {
      filteredLogs = filteredLogs.filter(
        (log) => log.created_at >= args.start_date!
      );
    }
    if (args.end_date) {
      filteredLogs = filteredLogs.filter(
        (log) => log.created_at <= args.end_date!
      );
    }

    // Calculate total before pagination
    const total = filteredLogs.length;

    // Apply pagination
    const paginatedLogs = filteredLogs.slice(offset, offset + limit);

    // Enrich logs with booking and branch info
    const enrichedLogs = await Promise.all(
      paginatedLogs.map(async (log) => {
        let bookingInfo = null;
        if (log.booking_id) {
          const booking = await ctx.db.get(log.booking_id);
          if (booking) {
            bookingInfo = {
              booking_code: booking.booking_code,
              customer_name: booking.customer_name,
              service_name: booking.service_name,
            };
          }
        }

        const branch = await ctx.db.get(log.branch_id);

        return {
          ...log,
          booking_info: bookingInfo,
          branch_name: branch?.name || "Unknown Branch",
        };
      })
    );

    return {
      logs: enrichedLogs,
      total,
      hasMore: offset + limit < total,
    };
  },
});

/**
 * Get payment statistics for dashboard
 * Returns summary metrics for payment activity
 */
export const getPaymentStatistics = query({
  args: {
    branch_id: v.optional(v.id("branches")),
    start_date: v.optional(v.number()),
    end_date: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Default to last 30 days if no date range specified
    const endDate = args.end_date || Date.now();
    const startDate = args.start_date || endDate - 30 * 24 * 60 * 60 * 1000;

    // Get all logs in date range
    const allLogs = await ctx.db
      .query("paymentAuditLog")
      .withIndex("by_created_at")
      .collect();

    // Filter by date range and optionally by branch
    let filteredLogs = allLogs.filter(
      (log) => log.created_at >= startDate && log.created_at <= endDate
    );

    if (args.branch_id) {
      filteredLogs = filteredLogs.filter(
        (log) => log.branch_id === args.branch_id
      );
    }

    // Calculate statistics
    const totalTransactions = filteredLogs.filter(
      (log) =>
        log.event_type === "payment_completed" ||
        log.event_type === "cash_collected"
    ).length;

    const successfulPayments = filteredLogs.filter(
      (log) => log.event_type === "payment_completed"
    );
    const failedPayments = filteredLogs.filter(
      (log) => log.event_type === "payment_failed"
    );
    const cashCollections = filteredLogs.filter(
      (log) => log.event_type === "cash_collected"
    );

    const totalRevenue = [...successfulPayments, ...cashCollections].reduce(
      (sum, log) => sum + (log.amount || 0),
      0
    );

    const paymongoRevenue = successfulPayments.reduce(
      (sum, log) => sum + (log.amount || 0),
      0
    );

    const cashRevenue = cashCollections.reduce(
      (sum, log) => sum + (log.amount || 0),
      0
    );

    const successRate =
      successfulPayments.length + failedPayments.length > 0
        ? (successfulPayments.length /
            (successfulPayments.length + failedPayments.length)) *
          100
        : 100;

    // Get revenue by payment method
    const revenueByMethod: Record<string, number> = {};
    [...successfulPayments, ...cashCollections].forEach((log) => {
      const method = log.payment_method || "unknown";
      revenueByMethod[method] = (revenueByMethod[method] || 0) + (log.amount || 0);
    });

    // Get today's stats
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayLogs = filteredLogs.filter(
      (log) => log.created_at >= todayStart.getTime()
    );
    const todayTransactions = todayLogs.filter(
      (log) =>
        log.event_type === "payment_completed" ||
        log.event_type === "cash_collected"
    ).length;
    const todayRevenue = todayLogs
      .filter(
        (log) =>
          log.event_type === "payment_completed" ||
          log.event_type === "cash_collected"
      )
      .reduce((sum, log) => sum + (log.amount || 0), 0);

    return {
      totalTransactions,
      totalRevenue,
      paymongoRevenue,
      cashRevenue,
      successRate: Math.round(successRate * 100) / 100,
      successfulPayments: successfulPayments.length,
      failedPayments: failedPayments.length,
      revenueByMethod,
      today: {
        transactions: todayTransactions,
        revenue: todayRevenue,
      },
    };
  },
});

/**
 * Get revenue by branch (for super admin dashboard)
 */
export const getRevenueByBranch = query({
  args: {
    start_date: v.optional(v.number()),
    end_date: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const endDate = args.end_date || Date.now();
    const startDate = args.start_date || endDate - 30 * 24 * 60 * 60 * 1000;
    const limit = args.limit || 5;

    // Get all payment completed and cash collected logs
    const allLogs = await ctx.db
      .query("paymentAuditLog")
      .withIndex("by_created_at")
      .collect();

    const filteredLogs = allLogs.filter(
      (log) =>
        log.created_at >= startDate &&
        log.created_at <= endDate &&
        (log.event_type === "payment_completed" ||
          log.event_type === "cash_collected")
    );

    // Group by branch
    const revenueByBranch: Record<string, number> = {};
    filteredLogs.forEach((log) => {
      const branchId = log.branch_id.toString();
      revenueByBranch[branchId] = (revenueByBranch[branchId] || 0) + (log.amount || 0);
    });

    // Get branch details and sort by revenue
    const branchRevenues = await Promise.all(
      Object.entries(revenueByBranch).map(async ([branchId, revenue]) => {
        const branch = await ctx.db.get(branchId as any);
        return {
          branch_id: branchId,
          branch_name: branch?.name || "Unknown Branch",
          revenue,
        };
      })
    );

    // Sort by revenue descending and limit
    return branchRevenues
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  },
});
