import { v } from "convex/values";
import { mutation, query, internalMutation } from "../_generated/server";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

// ============================================================================
// CUSTOMER-BRANCH ACTIVITY TRACKING SERVICE
// Marketing, Promotions, and Churn Prevention
// ============================================================================

// Status thresholds (in days)
const ACTIVE_THRESHOLD = 12;      // 0-12 days = active
const AT_RISK_THRESHOLD = 30;     // 13-30 days = at_risk
// 31+ days = churned

/**
 * Calculate customer status based on days since last visit
 */
function calculateStatus(
  daysSinceLastVisit: number,
  previousStatus?: string
): "new" | "active" | "at_risk" | "churned" | "win_back" {
  // Active: visited within 12 days
  if (daysSinceLastVisit <= ACTIVE_THRESHOLD) {
    // If was churned and came back, mark as win_back
    if (previousStatus === "churned") {
      return "win_back";
    }
    return "active";
  }

  // At-risk: 13-30 days without visit
  if (daysSinceLastVisit <= AT_RISK_THRESHOLD) {
    return "at_risk";
  }

  // Churned: 31+ days without visit
  return "churned";
}

/**
 * Calculate days between two timestamps
 */
function daysBetween(timestamp1: number, timestamp2: number): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor(Math.abs(timestamp2 - timestamp1) / msPerDay);
}

// ============================================================================
// CORE MUTATIONS
// ============================================================================

/**
 * Update or create customer-branch activity record
 * Called after each completed booking
 */
export const upsertActivity = mutation({
  args: {
    customerId: v.id("users"),
    branchId: v.id("branches"),
    bookingAmount: v.number(),
    bookingDate: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check for existing record
    const existing = await ctx.db
      .query("customer_branch_activity")
      .withIndex("by_customer_branch", (q) =>
        q.eq("customer_id", args.customerId).eq("branch_id", args.branchId)
      )
      .first();

    if (existing) {
      // Update existing record
      const daysSinceVisit = daysBetween(args.bookingDate, now);
      const newStatus = calculateStatus(daysSinceVisit, existing.status);

      await ctx.db.patch(existing._id, {
        last_visit_date: args.bookingDate,
        total_bookings: existing.total_bookings + 1,
        total_spent: existing.total_spent + args.bookingAmount,
        status: newStatus,
        days_since_last_visit: daysSinceVisit,
        updatedAt: now,
      });

      return { action: "updated", id: existing._id, status: newStatus };
    } else {
      // Create new record
      const id = await ctx.db.insert("customer_branch_activity", {
        customer_id: args.customerId,
        branch_id: args.branchId,
        first_visit_date: args.bookingDate,
        last_visit_date: args.bookingDate,
        total_bookings: 1,
        total_spent: args.bookingAmount,
        status: "active",
        days_since_last_visit: 0,
        opted_in_marketing: true, // Default opt-in
        createdAt: now,
        updatedAt: now,
      });

      return { action: "created", id, status: "active" };
    }
  },
});

/**
 * Update marketing preferences for a customer at a branch
 */
export const updateMarketingPreferences = mutation({
  args: {
    customerId: v.id("users"),
    branchId: v.id("branches"),
    optedIn: v.boolean(),
    preferredContact: v.optional(
      v.union(
        v.literal("sms"),
        v.literal("email"),
        v.literal("push"),
        v.literal("none")
      )
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("customer_branch_activity")
      .withIndex("by_customer_branch", (q) =>
        q.eq("customer_id", args.customerId).eq("branch_id", args.branchId)
      )
      .first();

    if (!existing) {
      throw new Error("Customer-branch relationship not found");
    }

    await ctx.db.patch(existing._id, {
      opted_in_marketing: args.optedIn,
      preferred_contact: args.preferredContact,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all branches a customer has visited
 */
export const getCustomerBranches = query({
  args: {
    customerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const activities = await ctx.db
      .query("customer_branch_activity")
      .withIndex("by_customer", (q) => q.eq("customer_id", args.customerId))
      .collect();

    // Enrich with branch names
    const enriched = await Promise.all(
      activities.map(async (activity) => {
        const branch = await ctx.db.get(activity.branch_id);
        return {
          ...activity,
          branch_name: branch?.name || "Unknown Branch",
        };
      })
    );

    return enriched;
  },
});

/**
 * Get customers for a branch with optional filters
 */
export const getBranchCustomers = query({
  args: {
    branchId: v.id("branches"),
    status: v.optional(
      v.union(
        v.literal("new"),
        v.literal("active"),
        v.literal("at_risk"),
        v.literal("churned"),
        v.literal("win_back")
      )
    ),
    optedInOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query;

    if (args.status) {
      query = ctx.db
        .query("customer_branch_activity")
        .withIndex("by_branch_status", (q) =>
          q.eq("branch_id", args.branchId).eq("status", args.status!)
        );
    } else {
      query = ctx.db
        .query("customer_branch_activity")
        .withIndex("by_branch", (q) => q.eq("branch_id", args.branchId));
    }

    let results = await query.collect();

    // Filter by marketing opt-in if requested
    if (args.optedInOnly) {
      results = results.filter((r) => r.opted_in_marketing);
    }

    // Limit results
    if (args.limit && results.length > args.limit) {
      results = results.slice(0, args.limit);
    }

    // Enrich with customer info
    const enriched = await Promise.all(
      results.map(async (activity) => {
        const customer = await ctx.db.get(activity.customer_id);
        // Use nickname (actual name) for guests, otherwise username
        const displayName = customer?.is_guest
          ? customer?.nickname || "Guest"
          : customer?.nickname || customer?.username || "Unknown";
        return {
          ...activity,
          customer_name: displayName,
          customer_email: customer?.email || "",
          customer_phone: customer?.mobile_number || "",
          is_guest: customer?.is_guest || false,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get specific customer-branch relationship
 */
export const getCustomerStatus = query({
  args: {
    customerId: v.id("users"),
    branchId: v.id("branches"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("customer_branch_activity")
      .withIndex("by_customer_branch", (q) =>
        q.eq("customer_id", args.customerId).eq("branch_id", args.branchId)
      )
      .first();
  },
});

/**
 * Get churn metrics for a branch
 */
export const getBranchChurnMetrics = query({
  args: {
    branchId: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const activities = await ctx.db
      .query("customer_branch_activity")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branchId))
      .collect();

    const metrics = {
      total: activities.length,
      new: 0,
      active: 0,
      at_risk: 0,
      churned: 0,
      win_back: 0,
      opted_in_marketing: 0,
      total_revenue: 0,
      guest_count: 0,
      registered_count: 0,
    };

    // Get customer data to check is_guest status
    for (const activity of activities) {
      const customer = await ctx.db.get(activity.customer_id);

      metrics[activity.status]++;
      if (activity.opted_in_marketing) {
        metrics.opted_in_marketing++;
      }
      metrics.total_revenue += activity.total_spent;

      // Count guests vs registered
      if (customer?.is_guest) {
        metrics.guest_count++;
      } else {
        metrics.registered_count++;
      }
    }

    // Calculate percentages
    const total = metrics.total || 1;
    return {
      ...metrics,
      active_rate: Math.round((metrics.active / total) * 100),
      at_risk_rate: Math.round((metrics.at_risk / total) * 100),
      churn_rate: Math.round((metrics.churned / total) * 100),
      win_back_rate: Math.round((metrics.win_back / total) * 100),
      guest_rate: Math.round((metrics.guest_count / total) * 100),
    };
  },
});

/**
 * Get top customers by spending for a branch
 */
export const getTopCustomers = query({
  args: {
    branchId: v.id("branches"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    const activities = await ctx.db
      .query("customer_branch_activity")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branchId))
      .collect();

    // Sort by total_spent descending
    const sorted = activities.sort((a, b) => b.total_spent - a.total_spent);
    const top = sorted.slice(0, limit);

    // Enrich with customer info
    const enriched = await Promise.all(
      top.map(async (activity) => {
        const customer = await ctx.db.get(activity.customer_id);
        // Use nickname (actual name) for guests, otherwise username
        const displayName = customer?.is_guest
          ? customer?.nickname || "Guest"
          : customer?.nickname || customer?.username || "Unknown";
        return {
          ...activity,
          customer_name: displayName,
          customer_email: customer?.email || "",
          customer_phone: customer?.mobile_number || "",
          is_guest: customer?.is_guest || false,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get at-risk customers for win-back campaigns
 */
export const getAtRiskCustomers = query({
  args: {
    branchId: v.id("branches"),
    optedInOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const activities = await ctx.db
      .query("customer_branch_activity")
      .withIndex("by_branch_status", (q) =>
        q.eq("branch_id", args.branchId).eq("status", "at_risk")
      )
      .collect();

    let filtered = activities;
    if (args.optedInOnly) {
      filtered = activities.filter((a) => a.opted_in_marketing);
    }

    // Enrich with customer info
    const enriched = await Promise.all(
      filtered.map(async (activity) => {
        const customer = await ctx.db.get(activity.customer_id);
        // Use nickname (actual name) for guests, otherwise username
        const displayName = customer?.is_guest
          ? customer?.nickname || "Guest"
          : customer?.nickname || customer?.username || "Unknown";
        return {
          ...activity,
          customer_name: displayName,
          customer_email: customer?.email || "",
          customer_phone: customer?.mobile_number || "",
          is_guest: customer?.is_guest || false,
        };
      })
    );

    return enriched;
  },
});

// ============================================================================
// SCHEDULED JOB - Daily Status Update
// ============================================================================

/**
 * Update all customer statuses based on days since last visit
 * Run daily via cron job
 */
export const updateAllStatuses = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let updated = 0;
    let errors = 0;

    // Get all activity records
    const activities = await ctx.db
      .query("customer_branch_activity")
      .collect();

    for (const activity of activities) {
      try {
        const daysSinceVisit = daysBetween(activity.last_visit_date, now);
        const newStatus = calculateStatus(daysSinceVisit, activity.status);

        // Only update if status changed or days changed
        if (
          activity.status !== newStatus ||
          activity.days_since_last_visit !== daysSinceVisit
        ) {
          await ctx.db.patch(activity._id, {
            status: newStatus,
            days_since_last_visit: daysSinceVisit,
            updatedAt: now,
          });
          updated++;
        }
      } catch (error) {
        console.error(
          `[CustomerBranchActivity] Error updating ${activity._id}:`,
          error
        );
        errors++;
      }
    }

    console.log(
      `[CustomerBranchActivity] Status update complete: ${updated} updated, ${errors} errors`
    );

    return { updated, errors, total: activities.length };
  },
});

// ============================================================================
// DATA MIGRATION - Backfill from existing bookings
// ============================================================================

/**
 * Backfill activity records from existing bookings
 * Run once to populate initial data
 */
export const backfillFromBookings = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let created = 0;
    let skipped = 0;

    // Get all completed bookings with customers
    const bookings = await ctx.db.query("bookings").collect();

    // Group by customer + branch
    const customerBranchMap = new Map<
      string,
      {
        customer_id: Id<"users">;
        branch_id: Id<"branches">;
        bookings: Array<{ date: number; price: number }>;
      }
    >();

    for (const booking of bookings) {
      // Skip bookings without customers (walk-ins without account)
      if (!booking.customer) continue;

      // Skip non-completed bookings
      if (booking.status !== "completed") continue;

      const key = `${booking.customer}-${booking.branch_id}`;

      if (!customerBranchMap.has(key)) {
        customerBranchMap.set(key, {
          customer_id: booking.customer,
          branch_id: booking.branch_id,
          bookings: [],
        });
      }

      customerBranchMap.get(key)!.bookings.push({
        date: booking.createdAt || booking._creationTime,
        price: booking.final_price || booking.price || 0,
      });
    }

    // Create activity records
    for (const [key, data] of customerBranchMap) {
      // Check if record already exists
      const existing = await ctx.db
        .query("customer_branch_activity")
        .withIndex("by_customer_branch", (q) =>
          q
            .eq("customer_id", data.customer_id)
            .eq("branch_id", data.branch_id)
        )
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      // Calculate metrics
      const sortedBookings = data.bookings.sort((a, b) => a.date - b.date);
      const firstVisit = sortedBookings[0].date;
      const lastVisit = sortedBookings[sortedBookings.length - 1].date;
      const totalSpent = sortedBookings.reduce((sum, b) => sum + b.price, 0);
      const daysSinceVisit = daysBetween(lastVisit, now);
      const status = calculateStatus(daysSinceVisit);

      await ctx.db.insert("customer_branch_activity", {
        customer_id: data.customer_id,
        branch_id: data.branch_id,
        first_visit_date: firstVisit,
        last_visit_date: lastVisit,
        total_bookings: sortedBookings.length,
        total_spent: totalSpent,
        status,
        days_since_last_visit: daysSinceVisit,
        opted_in_marketing: true,
        createdAt: now,
        updatedAt: now,
      });

      created++;
    }

    console.log(
      `[CustomerBranchActivity] Backfill complete: ${created} created, ${skipped} skipped`
    );

    return { created, skipped };
  },
});
