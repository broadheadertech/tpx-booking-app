/**
 * Smart Ordering Service
 *
 * Analyzes branch sales data and inventory to suggest optimal reorder quantities.
 * Uses sales velocity, current stock, and order history to generate suggestions.
 *
 * @module convex/services/smartOrdering
 */

import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get smart reorder suggestions for a branch.
 *
 * Algorithm:
 * 1. Fetch completed transactions for the branch (last 30 days)
 * 2. Aggregate product sales: product_name → total qty sold
 * 3. Fetch current branch inventory (products table)
 * 4. Match catalog products to branch products by name
 * 5. Calculate daily sales rate, days of supply, suggested qty
 * 6. Sort by urgency (lowest days of supply first)
 */
export const getSmartSuggestions = query({
  args: {
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    // 1. Get completed transactions for this branch (last 30 days)
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    const recentTransactions = transactions.filter(
      (t) => t.payment_status === "completed" && t.createdAt >= thirtyDaysAgo
    );

    // 2. Aggregate product sales by name
    const salesByName: Record<
      string,
      { totalQty: number; totalRevenue: number; transactionCount: number }
    > = {};

    for (const txn of recentTransactions) {
      if (!txn.products) continue;
      for (const product of txn.products) {
        const name = product.product_name;
        if (!salesByName[name]) {
          salesByName[name] = { totalQty: 0, totalRevenue: 0, transactionCount: 0 };
        }
        salesByName[name].totalQty += product.quantity;
        salesByName[name].totalRevenue += product.price * product.quantity;
        salesByName[name].transactionCount += 1;
      }
    }

    // 3. Get current branch inventory
    const branchProducts = await ctx.db
      .query("products")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    const inventoryByName: Record<
      string,
      { stock: number; minStock: number; cost: number }
    > = {};
    for (const p of branchProducts) {
      if (p.status !== "inactive") {
        inventoryByName[p.name] = {
          stock: p.stock,
          minStock: p.minStock,
          cost: p.cost,
        };
      }
    }

    // 4. Get catalog products (available to order)
    const catalogProducts = await ctx.db
      .query("productCatalog")
      .withIndex("by_is_active", (q) => q.eq("is_active", true))
      .collect();

    // 5. Calculate past order lead times for this branch
    const branchOrders = await ctx.db
      .query("productOrders")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    const receivedOrders = branchOrders.filter(
      (o) => o.status === "received" && o.received_at && o.created_at
    );

    // Average lead time in days (order created → received)
    let avgLeadTimeDays = 3; // default 3 days
    if (receivedOrders.length > 0) {
      const totalLeadMs = receivedOrders.reduce(
        (sum, o) => sum + (o.received_at! - o.created_at),
        0
      );
      avgLeadTimeDays = Math.max(
        1,
        Math.round(totalLeadMs / receivedOrders.length / (24 * 60 * 60 * 1000))
      );
    }

    // 6. Generate suggestions per catalog product
    const TARGET_DAYS_SUPPLY = 14; // Keep 2 weeks of stock
    const daysSinceStart = Math.max(
      1,
      (now - thirtyDaysAgo) / (24 * 60 * 60 * 1000)
    );

    const suggestions = catalogProducts
      .map((catalog) => {
        const sales = salesByName[catalog.name];
        const inventory = inventoryByName[catalog.name];
        const currentStock = inventory?.stock ?? 0;
        const minStock = inventory?.minStock ?? 0;

        // Daily sales rate
        const dailySalesRate = sales
          ? sales.totalQty / daysSinceStart
          : 0;

        // Days of supply remaining
        const daysOfSupply =
          dailySalesRate > 0
            ? Math.round(currentStock / dailySalesRate)
            : currentStock > 0
              ? 999
              : 0;

        // Suggested quantity: enough for TARGET_DAYS_SUPPLY + lead time buffer
        const targetStock = Math.ceil(
          dailySalesRate * (TARGET_DAYS_SUPPLY + avgLeadTimeDays)
        );
        const suggestedQty = Math.max(0, targetStock - currentStock);

        // Urgency score (lower = more urgent)
        // 0 = out of stock with sales, higher = less urgent
        let urgency: "critical" | "low" | "reorder" | "healthy";
        if (currentStock === 0 && dailySalesRate > 0) {
          urgency = "critical";
        } else if (daysOfSupply <= avgLeadTimeDays) {
          urgency = "critical";
        } else if (currentStock <= minStock || daysOfSupply <= 7) {
          urgency = "low";
        } else if (daysOfSupply <= TARGET_DAYS_SUPPLY) {
          urgency = "reorder";
        } else {
          urgency = "healthy";
        }

        // Reason text
        let reason = "";
        if (urgency === "critical" && currentStock === 0) {
          reason = "Out of stock — selling ~" + dailySalesRate.toFixed(1) + "/day";
        } else if (urgency === "critical") {
          reason = `Only ${daysOfSupply}d supply left (lead time: ${avgLeadTimeDays}d)`;
        } else if (urgency === "low") {
          reason = `Low stock — ${daysOfSupply}d supply remaining`;
        } else if (urgency === "reorder") {
          reason = `${daysOfSupply}d supply — reorder to maintain ${TARGET_DAYS_SUPPLY}d buffer`;
        } else {
          reason = `${daysOfSupply}d supply — well stocked`;
        }

        // Available stock in central warehouse
        const warehouseAvailable = Math.max(
          0,
          catalog.stock - (catalog.reserved_stock ?? 0)
        );

        return {
          catalog_product_id: catalog._id,
          product_name: catalog.name,
          category: catalog.category,
          unit_price: catalog.price,
          current_stock: currentStock,
          daily_sales_rate: Math.round(dailySalesRate * 10) / 10,
          days_of_supply: daysOfSupply,
          suggested_qty: suggestedQty,
          urgency,
          reason,
          warehouse_available: warehouseAvailable,
          total_sold_30d: sales?.totalQty ?? 0,
          revenue_30d: sales?.totalRevenue ?? 0,
        };
      })
      // Only suggest products that have sales or are running low
      .filter(
        (s) =>
          s.suggested_qty > 0 &&
          s.warehouse_available > 0 &&
          (s.total_sold_30d > 0 || s.current_stock <= s.current_stock) // has history
      )
      // Sort: critical first, then low, then reorder
      .sort((a, b) => {
        const urgencyOrder = { critical: 0, low: 1, reorder: 2, healthy: 3 };
        const diff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
        if (diff !== 0) return diff;
        return a.days_of_supply - b.days_of_supply;
      });

    return {
      suggestions,
      meta: {
        avg_lead_time_days: avgLeadTimeDays,
        target_days_supply: TARGET_DAYS_SUPPLY,
        analysis_period_days: 30,
        total_transactions_analyzed: recentTransactions.length,
      },
    };
  },
});
