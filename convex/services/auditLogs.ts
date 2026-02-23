import { v } from "convex/values";
import { mutation, query, internalMutation } from "../_generated/server";
import type { MutationCtx } from "../_generated/server";

/**
 * System Audit Logs Service
 * Comprehensive action tracking for every user operation.
 * SA sees all logs; BA sees only their branch logs.
 */

// ============================================================================
// CATEGORIES — Used for filtering in the UI
// ============================================================================

export const AUDIT_CATEGORIES = {
  auth: "Auth",
  booking: "Booking",
  transaction: "Transaction",
  payment: "Payment",
  product: "Product",
  inventory: "Inventory",
  voucher: "Voucher",
  user: "User",
  settings: "Settings",
  finance: "Finance",
  marketing: "Marketing",
  system: "System",
} as const;

// ============================================================================
// HELPER — Call from within any mutation to log an action
// ============================================================================

/**
 * Log an audit event from within a mutation handler.
 * Usage:  await logAudit(ctx, { ... })
 *
 * This inserts directly into the same transaction — atomic with the mutation.
 */
export async function logAudit(
  ctx: MutationCtx,
  args: {
    user_id?: string;
    user_name?: string;
    user_role?: string;
    branch_id?: string;
    branch_name?: string;
    category: string;
    action: string;
    description: string;
    target_type?: string;
    target_id?: string;
    metadata?: any;
  }
) {
  await ctx.db.insert("audit_logs", {
    user_id: args.user_id as any,
    user_name: args.user_name,
    user_role: args.user_role,
    branch_id: args.branch_id as any,
    branch_name: args.branch_name,
    category: args.category,
    action: args.action,
    description: args.description,
    target_type: args.target_type,
    target_id: args.target_id,
    metadata: args.metadata,
    created_at: Date.now(),
  });
}

// ============================================================================
// MUTATIONS — For frontend / scheduled logging
// ============================================================================

/**
 * Log an action from the frontend (e.g. login, page visit).
 */
export const logActionFromClient = mutation({
  args: {
    user_id: v.optional(v.id("users")),
    user_name: v.optional(v.string()),
    user_role: v.optional(v.string()),
    branch_id: v.optional(v.id("branches")),
    branch_name: v.optional(v.string()),
    category: v.string(),
    action: v.string(),
    description: v.string(),
    target_type: v.optional(v.string()),
    target_id: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("audit_logs", {
      ...args,
      created_at: Date.now(),
    });
  },
});

/**
 * Internal mutation for scheduled / server-side logging.
 */
export const logActionInternal = internalMutation({
  args: {
    user_id: v.optional(v.id("users")),
    user_name: v.optional(v.string()),
    user_role: v.optional(v.string()),
    branch_id: v.optional(v.id("branches")),
    branch_name: v.optional(v.string()),
    category: v.string(),
    action: v.string(),
    description: v.string(),
    target_type: v.optional(v.string()),
    target_id: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("audit_logs", {
      ...args,
      created_at: Date.now(),
    });
  },
});

// ============================================================================
// QUERIES — Paginated, date-filtered, role-scoped
// ============================================================================

/**
 * Get audit logs — SA (all) or BA (branch-scoped).
 * Paginated (100 per page), filterable by category and date range.
 */
export const getAuditLogs = query({
  args: {
    branch_id: v.optional(v.id("branches")),  // If provided, scope to this branch (BA view)
    category: v.optional(v.string()),
    search: v.optional(v.string()),
    start_date: v.optional(v.number()),
    end_date: v.optional(v.number()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit || 100, 100);
    const offset = args.offset || 0;

    // Pick the right index based on filters
    let logsQuery;
    if (args.branch_id) {
      logsQuery = ctx.db
        .query("audit_logs")
        .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id!))
        .order("desc");
    } else if (args.category) {
      logsQuery = ctx.db
        .query("audit_logs")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .order("desc");
    } else {
      logsQuery = ctx.db
        .query("audit_logs")
        .withIndex("by_created_at")
        .order("desc");
    }

    // Collect — we cap at 5000 to avoid memory issues, then filter in-memory
    const allLogs = await logsQuery.take(5000);

    // Apply filters
    let filtered = allLogs;

    // Category filter (when not already index-filtered)
    if (args.category && args.branch_id) {
      filtered = filtered.filter((l) => l.category === args.category);
    }

    // Date range
    if (args.start_date) {
      filtered = filtered.filter((l) => l.created_at >= args.start_date!);
    }
    if (args.end_date) {
      filtered = filtered.filter((l) => l.created_at <= args.end_date!);
    }

    // Text search (description, user_name, action)
    if (args.search) {
      const s = args.search.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.description?.toLowerCase().includes(s) ||
          l.user_name?.toLowerCase().includes(s) ||
          l.action?.toLowerCase().includes(s)
      );
    }

    const total = filtered.length;
    const entries = filtered.slice(offset, offset + limit);

    return { entries, total, limit, offset };
  },
});

/**
 * Get category counts for the filter sidebar.
 */
export const getAuditLogStats = query({
  args: {
    branch_id: v.optional(v.id("branches")),
  },
  handler: async (ctx, args) => {
    let logsQuery;
    if (args.branch_id) {
      logsQuery = ctx.db
        .query("audit_logs")
        .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id!))
        .order("desc");
    } else {
      logsQuery = ctx.db
        .query("audit_logs")
        .withIndex("by_created_at")
        .order("desc");
    }

    const logs = await logsQuery.take(5000);
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    const byCategory: Record<string, number> = {};
    let last24Hours = 0;
    let last7Days = 0;

    for (const log of logs) {
      byCategory[log.category] = (byCategory[log.category] || 0) + 1;
      if (log.created_at >= oneDayAgo) last24Hours++;
      if (log.created_at >= sevenDaysAgo) last7Days++;
    }

    return {
      total: logs.length,
      last24Hours,
      last7Days,
      byCategory,
    };
  },
});
