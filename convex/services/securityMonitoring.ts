/**
 * Security Monitoring Service
 *
 * Tracks and manages security events across the platform.
 * Monitors login attempts, brute force detection, suspicious transactions,
 * role escalation attempts, and other security-relevant activities.
 * IT administrators can review and resolve security events.
 *
 * @module convex/services/securityMonitoring
 */

import { v } from "convex/values";
import { query, mutation } from "../_generated/server";

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Log a new security event.
 * Called internally from auth flows and other services - no role check needed.
 */
export const logSecurityEvent = mutation({
  args: {
    event_type: v.union(
      v.literal("login_attempt"),
      v.literal("login_failed"),
      v.literal("brute_force_detected"),
      v.literal("unusual_transaction"),
      v.literal("suspicious_ip"),
      v.literal("role_escalation_attempt"),
      v.literal("data_export"),
      v.literal("bulk_operation"),
      v.literal("api_abuse")
    ),
    severity: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical")
    ),
    user_id: v.optional(v.id("users")),
    branch_id: v.optional(v.id("branches")),
    ip_address: v.optional(v.string()),
    user_agent: v.optional(v.string()),
    description: v.string(),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const eventId = await ctx.db.insert("security_events", {
      event_type: args.event_type,
      severity: args.severity,
      user_id: args.user_id,
      branch_id: args.branch_id,
      ip_address: args.ip_address,
      user_agent: args.user_agent,
      description: args.description,
      metadata: args.metadata,
      is_resolved: false,
      createdAt: Date.now(),
    });

    return eventId;
  },
});

/**
 * Resolve a security event.
 * Only IT administrators can resolve security events.
 */
export const resolveSecurityEvent = mutation({
  args: {
    eventId: v.id("security_events"),
    userId: v.id("users"),
    resolution_notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || user.role !== "it_admin") {
      throw new Error("Unauthorized: IT Administrator access required");
    }

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Security event not found");
    }

    await ctx.db.patch(args.eventId, {
      is_resolved: true,
      resolved_by: args.userId,
      resolved_at: Date.now(),
      resolution_notes: args.resolution_notes,
    });

    return { success: true };
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get security events with optional filters.
 * Returns events sorted by creation time (newest first).
 */
export const getSecurityEvents = query({
  args: {
    event_type: v.optional(
      v.union(
        v.literal("login_attempt"),
        v.literal("login_failed"),
        v.literal("brute_force_detected"),
        v.literal("unusual_transaction"),
        v.literal("suspicious_ip"),
        v.literal("role_escalation_attempt"),
        v.literal("data_export"),
        v.literal("bulk_operation"),
        v.literal("api_abuse")
      )
    ),
    severity: v.optional(
      v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("critical")
      )
    ),
    is_resolved: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    // Use the most specific index available based on filters
    let events;

    if (args.event_type) {
      events = await ctx.db
        .query("security_events")
        .withIndex("by_event_type", (q) => q.eq("event_type", args.event_type!))
        .order("desc")
        .collect();
    } else if (args.severity) {
      events = await ctx.db
        .query("security_events")
        .withIndex("by_severity", (q) => q.eq("severity", args.severity!))
        .order("desc")
        .collect();
    } else if (args.is_resolved !== undefined) {
      events = await ctx.db
        .query("security_events")
        .withIndex("by_resolved", (q) => q.eq("is_resolved", args.is_resolved!))
        .order("desc")
        .collect();
    } else {
      events = await ctx.db
        .query("security_events")
        .withIndex("by_created_at")
        .order("desc")
        .collect();
    }

    // Apply remaining filters not used as the primary index
    if (args.event_type && args.severity) {
      events = events.filter((e) => e.severity === args.severity);
    }
    if (args.event_type && args.is_resolved !== undefined) {
      events = events.filter((e) => e.is_resolved === args.is_resolved);
    }
    if (args.severity && args.is_resolved !== undefined) {
      events = events.filter((e) => e.is_resolved === args.is_resolved);
    }

    // Apply limit
    return events.slice(0, limit);
  },
});

/**
 * Get aggregated security statistics.
 * Returns event counts for the last 24 hours and 7 days,
 * active threat count, and breakdowns by type and severity.
 */
export const getSecurityStats = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    const allEvents = await ctx.db
      .query("security_events")
      .withIndex("by_created_at")
      .order("desc")
      .collect();

    // Total events in last 24 hours
    const last24h = allEvents.filter((e) => e.createdAt > oneDayAgo);
    const total24h = last24h.length;

    // Active threats: unresolved high + critical severity
    const activeThreats = allEvents.filter(
      (e) =>
        !e.is_resolved &&
        (e.severity === "high" || e.severity === "critical")
    ).length;

    // Events by type (last 7 days)
    const last7d = allEvents.filter((e) => e.createdAt > sevenDaysAgo);
    const eventsByType: Record<string, number> = {};
    for (const event of last7d) {
      eventsByType[event.event_type] = (eventsByType[event.event_type] || 0) + 1;
    }

    // Events by severity (last 24 hours)
    const eventsBySeverity: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };
    for (const event of last24h) {
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
    }

    return {
      total: total24h,
      activeThreats,
      eventsByType,
      eventsBySeverity,
    };
  },
});

/**
 * Get active threats - unresolved events with high or critical severity.
 * Sorted by creation time (newest first).
 */
export const getActiveThreats = query({
  args: {},
  handler: async (ctx) => {
    // Query unresolved events
    const unresolvedEvents = await ctx.db
      .query("security_events")
      .withIndex("by_resolved", (q) => q.eq("is_resolved", false))
      .order("desc")
      .collect();

    // Filter to high and critical severity only
    const activeThreats = unresolvedEvents.filter(
      (e) => e.severity === "high" || e.severity === "critical"
    );

    return activeThreats;
  },
});
