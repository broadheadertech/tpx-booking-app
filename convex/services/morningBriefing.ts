/**
 * AI Morning Briefing Service
 *
 * Aggregates key branch data into a personalized morning briefing:
 * - Today's schedule overview
 * - Yesterday's performance summary
 * - Action items (low stock, pending tasks)
 * - Forecast & trends
 *
 * @module convex/services/morningBriefing
 */

import { query } from "../_generated/server";
import { v } from "convex/values";

export const getMorningBriefing = query({
  args: {
    branch_id: v.id("branches"),
    user_id: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000 - 1;
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
    const yesterdayEnd = todayStart - 1;
    const sevenDaysAgo = todayStart - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = todayStart - 30 * 24 * 60 * 60 * 1000;

    // Get user info for greeting
    const user = await ctx.db.get(args.user_id);
    const branch = await ctx.db.get(args.branch_id);

    // ================================================================
    // 1. TODAY'S SCHEDULE
    // ================================================================
    const allBookings = await ctx.db
      .query("bookings")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    const todaysBookings = allBookings.filter(
      (b) => {
        const bookingDate = new Date(b.date);
        const bookingDateStart = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate()).getTime();
        return bookingDateStart >= todayStart && bookingDateStart <= todayEnd;
      }
    );

    const confirmedToday = todaysBookings.filter((b) => b.status === "confirmed" || b.status === "pending");
    const completedToday = todaysBookings.filter((b) => b.status === "completed");

    // Sort by time to find first/last
    const sortedBookings = [...confirmedToday].sort((a, b) => {
      const timeA = a.time || "";
      const timeB = b.time || "";
      return timeA.localeCompare(timeB);
    });

    const firstBookingTime = sortedBookings[0]?.time || null;
    const lastBookingTime = sortedBookings[sortedBookings.length - 1]?.time || null;

    // ================================================================
    // 2. YESTERDAY'S PERFORMANCE
    // ================================================================
    const branchTransactions = await ctx.db
      .query("transactions")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    const yesterdayTransactions = branchTransactions.filter(
      (t) => t.createdAt >= yesterdayStart && t.createdAt <= yesterdayEnd && t.payment_status === "completed"
    );

    const yesterdayRevenue = yesterdayTransactions.reduce(
      (sum, t) => sum + t.total_amount, 0
    );
    const yesterdayTransactionCount = yesterdayTransactions.length;

    // Compare to 7-day average
    const last7Transactions = branchTransactions.filter(
      (t) => t.createdAt >= sevenDaysAgo && t.createdAt < todayStart && t.payment_status === "completed"
    );
    const last7Revenue = last7Transactions.reduce((sum, t) => sum + t.total_amount, 0);
    const avgDailyRevenue7d = last7Revenue / 7;
    const revenueVsAvg = avgDailyRevenue7d > 0
      ? Math.round(((yesterdayRevenue - avgDailyRevenue7d) / avgDailyRevenue7d) * 100)
      : 0;

    // Top service yesterday
    const serviceRevenue: Record<string, { name: string; revenue: number; count: number }> = {};
    for (const t of yesterdayTransactions) {
      if (t.services) {
        for (const s of t.services) {
          if (!serviceRevenue[s.service_name]) {
            serviceRevenue[s.service_name] = { name: s.service_name, revenue: 0, count: 0 };
          }
          serviceRevenue[s.service_name].revenue += s.price * s.quantity;
          serviceRevenue[s.service_name].count += s.quantity;
        }
      }
    }
    const topService = Object.values(serviceRevenue).sort((a, b) => b.revenue - a.revenue)[0] || null;

    // ================================================================
    // 3. TODAY'S REVENUE (so far)
    // ================================================================
    const todayTransactions = branchTransactions.filter(
      (t) => t.createdAt >= todayStart && t.createdAt <= todayEnd && t.payment_status === "completed"
    );
    const todayRevenue = todayTransactions.reduce((sum, t) => sum + t.total_amount, 0);

    // ================================================================
    // 4. LOW STOCK ALERTS
    // ================================================================
    const branchProducts = await ctx.db
      .query("products")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    const outOfStock = branchProducts.filter((p) => p.stock === 0 && p.status !== "inactive");
    const lowStock = branchProducts.filter(
      (p) => p.stock > 0 && p.stock <= p.minStock && p.status !== "inactive"
    );

    // ================================================================
    // 5. ACTIVE BARBERS
    // ================================================================
    const barbers = await ctx.db
      .query("barbers")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();
    const activeBarbers = barbers.filter((b) => b.is_active);

    // ================================================================
    // 6. PENDING TASKS / ACTION ITEMS
    // ================================================================
    // Pending product orders
    const pendingOrders = await ctx.db
      .query("productOrders")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();
    const shippedOrders = pendingOrders.filter((o) => o.status === "shipped");

    // Pending settlements
    const pendingSettlements = await ctx.db
      .query("branchSettlements")
      .withIndex("by_branch_status", (q) =>
        q.eq("branch_id", args.branch_id).eq("status", "pending")
      )
      .collect();

    // Pending damage claims
    const pendingClaims = await ctx.db
      .query("damage_claims")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();
    const pendingDamageClaims = pendingClaims.filter((c) => c.status === "pending");

    // ================================================================
    // 7. TREND (30-day revenue direction)
    // ================================================================
    const last30Transactions = branchTransactions.filter(
      (t) => t.createdAt >= thirtyDaysAgo && t.createdAt < todayStart && t.payment_status === "completed"
    );

    // Split into first half vs second half
    const midpoint = thirtyDaysAgo + 15 * 24 * 60 * 60 * 1000;
    const firstHalfRevenue = last30Transactions
      .filter((t) => t.createdAt < midpoint)
      .reduce((sum, t) => sum + t.total_amount, 0);
    const secondHalfRevenue = last30Transactions
      .filter((t) => t.createdAt >= midpoint)
      .reduce((sum, t) => sum + t.total_amount, 0);

    let trendDirection: "up" | "down" | "stable" = "stable";
    if (firstHalfRevenue > 0) {
      const change = ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100;
      if (change > 5) trendDirection = "up";
      else if (change < -5) trendDirection = "down";
    }

    // ================================================================
    // 8. GREETING
    // ================================================================
    const hour = today.getHours();
    let greeting = "Good morning";
    if (hour >= 12 && hour < 17) greeting = "Good afternoon";
    else if (hour >= 17) greeting = "Good evening";

    const firstName = user?.username?.split(" ")[0] || user?.username || "Boss";

    // Day of week pattern (busiest day insight)
    const dayOfWeek = today.toLocaleDateString("en-PH", { weekday: "long" });
    const todayDayNum = today.getDay();

    // Count bookings by day of week (last 30 days)
    const bookingsByDay: number[] = [0, 0, 0, 0, 0, 0, 0];
    const recentBookings = allBookings.filter(
      (b) => {
        const d = new Date(b.date).getTime();
        return d >= thirtyDaysAgo && d < todayStart;
      }
    );
    for (const b of recentBookings) {
      const d = new Date(b.date).getDay();
      bookingsByDay[d]++;
    }
    const avgBookingsForToday = Math.round(bookingsByDay[todayDayNum] / 4); // ~4 weeks
    const busiestDay = bookingsByDay.indexOf(Math.max(...bookingsByDay));
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    // ================================================================
    // BUILD ACTION ITEMS
    // ================================================================
    const actionItems: { type: string; message: string; urgency: "high" | "medium" | "low" }[] = [];

    if (outOfStock.length > 0) {
      actionItems.push({
        type: "stock",
        message: `${outOfStock.length} product${outOfStock.length > 1 ? "s" : ""} out of stock`,
        urgency: "high",
      });
    }
    if (lowStock.length > 0) {
      actionItems.push({
        type: "stock",
        message: `${lowStock.length} product${lowStock.length > 1 ? "s" : ""} running low`,
        urgency: "medium",
      });
    }
    if (shippedOrders.length > 0) {
      actionItems.push({
        type: "order",
        message: `${shippedOrders.length} order${shippedOrders.length > 1 ? "s" : ""} shipped — confirm receipt`,
        urgency: "medium",
      });
    }
    if (pendingSettlements.length > 0) {
      actionItems.push({
        type: "settlement",
        message: "Settlement request pending approval",
        urgency: "low",
      });
    }
    if (pendingDamageClaims.length > 0) {
      actionItems.push({
        type: "damage",
        message: `${pendingDamageClaims.length} damage claim${pendingDamageClaims.length > 1 ? "s" : ""} awaiting review`,
        urgency: "low",
      });
    }

    // ================================================================
    // BUILD BRIEFING
    // ================================================================
    return {
      greeting: `${greeting}, ${firstName}!`,
      date: today.toLocaleDateString("en-PH", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      branch_name: branch?.name || "Your Branch",

      schedule: {
        total_bookings: confirmedToday.length,
        completed: completedToday.length,
        first_booking: firstBookingTime,
        last_booking: lastBookingTime,
        avg_for_day: avgBookingsForToday,
        is_above_average: confirmedToday.length > avgBookingsForToday,
      },

      yesterday: {
        revenue: yesterdayRevenue,
        transactions: yesterdayTransactionCount,
        vs_avg_percent: revenueVsAvg,
        top_service: topService,
      },

      today_so_far: {
        revenue: todayRevenue,
        transactions: todayTransactions.length,
      },

      staff: {
        active_barbers: activeBarbers.length,
        total_barbers: barbers.length,
      },

      inventory: {
        out_of_stock: outOfStock.length,
        low_stock: lowStock.length,
        out_of_stock_items: outOfStock.slice(0, 3).map((p) => p.name),
      },

      action_items: actionItems,

      trends: {
        direction: trendDirection,
        busiest_day: dayNames[busiestDay],
        is_busiest_day: todayDayNum === busiestDay,
      },
    };
  },
});
