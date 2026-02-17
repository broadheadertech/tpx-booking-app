/**
 * Error Monitoring Service
 *
 * Provides system error tracking and resolution for IT administrators.
 * Logs errors from various sources (convex functions, HTTP endpoints,
 * scheduled jobs, client errors, webhooks) and allows IT admins to
 * review and resolve them.
 *
 * @module convex/services/errorMonitoring
 */

import { v } from "convex/values";
import { query, mutation } from "../_generated/server";

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Log a new error to the system.
 * Called internally from other services - no role check needed.
 */
export const logError = mutation({
  args: {
    source: v.union(
      v.literal("convex_function"),
      v.literal("http_endpoint"),
      v.literal("scheduled_job"),
      v.literal("client_error"),
      v.literal("webhook")
    ),
    severity: v.union(
      v.literal("info"),
      v.literal("warning"),
      v.literal("error"),
      v.literal("critical")
    ),
    function_name: v.string(),
    message: v.string(),
    stack_trace: v.optional(v.string()),
    user_id: v.optional(v.id("users")),
    branch_id: v.optional(v.id("branches")),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const errorId = await ctx.db.insert("error_logs", {
      source: args.source,
      severity: args.severity,
      function_name: args.function_name,
      message: args.message,
      stack_trace: args.stack_trace,
      user_id: args.user_id,
      branch_id: args.branch_id,
      metadata: args.metadata,
      resolved: false,
      createdAt: Date.now(),
    });

    return errorId;
  },
});

/**
 * Resolve a single error log entry.
 * Only IT administrators can resolve errors.
 */
export const resolveError = mutation({
  args: {
    errorId: v.id("error_logs"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || user.role !== "it_admin") {
      throw new Error("Unauthorized: IT Administrator access required");
    }

    const error = await ctx.db.get(args.errorId);
    if (!error) {
      throw new Error("Error log not found");
    }

    await ctx.db.patch(args.errorId, {
      resolved: true,
      resolved_by: args.userId,
      resolved_at: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Bulk resolve multiple error log entries.
 * Only IT administrators can resolve errors.
 */
export const bulkResolveErrors = mutation({
  args: {
    errorIds: v.array(v.id("error_logs")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || user.role !== "it_admin") {
      throw new Error("Unauthorized: IT Administrator access required");
    }

    const now = Date.now();
    let resolvedCount = 0;

    for (const errorId of args.errorIds) {
      const error = await ctx.db.get(errorId);
      if (error && !error.resolved) {
        await ctx.db.patch(errorId, {
          resolved: true,
          resolved_by: args.userId,
          resolved_at: now,
        });
        resolvedCount++;
      }
    }

    return { success: true, resolvedCount };
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get error logs with optional filters.
 * Returns errors sorted by creation time (newest first).
 */
export const getErrors = query({
  args: {
    severity: v.optional(
      v.union(
        v.literal("info"),
        v.literal("warning"),
        v.literal("error"),
        v.literal("critical")
      )
    ),
    source: v.optional(
      v.union(
        v.literal("convex_function"),
        v.literal("http_endpoint"),
        v.literal("scheduled_job"),
        v.literal("client_error"),
        v.literal("webhook")
      )
    ),
    resolved: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    // Use the most specific index available based on filters
    let errors;

    if (args.severity) {
      errors = await ctx.db
        .query("error_logs")
        .withIndex("by_severity", (q) => q.eq("severity", args.severity!))
        .order("desc")
        .collect();
    } else if (args.source) {
      errors = await ctx.db
        .query("error_logs")
        .withIndex("by_source", (q) => q.eq("source", args.source!))
        .order("desc")
        .collect();
    } else if (args.resolved !== undefined) {
      errors = await ctx.db
        .query("error_logs")
        .withIndex("by_resolved", (q) => q.eq("resolved", args.resolved!))
        .order("desc")
        .collect();
    } else {
      errors = await ctx.db
        .query("error_logs")
        .withIndex("by_created_at")
        .order("desc")
        .collect();
    }

    // Apply remaining filters that weren't used as the primary index
    if (args.severity && args.source) {
      errors = errors.filter((e) => e.source === args.source);
    }
    if (args.severity && args.resolved !== undefined) {
      errors = errors.filter((e) => e.resolved === args.resolved);
    }
    if (args.source && args.resolved !== undefined) {
      errors = errors.filter((e) => e.resolved === args.resolved);
    }
    if (!args.severity && !args.source && args.resolved === undefined) {
      // No additional filtering needed
    }

    // Apply limit
    return errors.slice(0, limit);
  },
});

/**
 * Get aggregated error statistics.
 * Returns counts for the last 24 hours and 7 days, plus resolution rate.
 */
export const getErrorStats = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    const allErrors = await ctx.db
      .query("error_logs")
      .withIndex("by_created_at")
      .order("desc")
      .collect();

    // Last 24 hours stats
    const last24h = allErrors.filter((e) => e.createdAt > oneDayAgo);
    const total24h = last24h.length;
    const critical24h = last24h.filter((e) => e.severity === "critical").length;
    const error24h = last24h.filter((e) => e.severity === "error").length;
    const warning24h = last24h.filter((e) => e.severity === "warning").length;
    const info24h = last24h.filter((e) => e.severity === "info").length;

    // Unresolved total (all time)
    const unresolvedTotal = allErrors.filter((e) => !e.resolved).length;

    // Resolution rate (last 7 days)
    const last7d = allErrors.filter((e) => e.createdAt > sevenDaysAgo);
    const total7d = last7d.length;
    const resolved7d = last7d.filter((e) => e.resolved === true).length;
    const resolutionRate = total7d > 0 ? (resolved7d / total7d) * 100 : 0;

    return {
      total: total24h,
      critical: critical24h,
      error: error24h,
      warning: warning24h,
      info: info24h,
      unresolvedTotal,
      resolutionRate: Math.round(resolutionRate * 100) / 100,
    };
  },
});
