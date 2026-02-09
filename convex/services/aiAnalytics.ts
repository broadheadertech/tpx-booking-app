import { v } from "convex/values";
import { query } from "../_generated/server";
import { Id } from "../_generated/dataModel";

// ============================================================================
// AI ANALYTICS SERVICE (Free Tier - No Paid APIs)
// ============================================================================
// Uses statistical methods, rule-based logic, and template-based summaries
// No external AI API costs required
// ============================================================================

// ============================================================================
// 1. TEMPLATE-BASED P&L SUMMARY
// ============================================================================
// Generates human-readable insights from P&L data using templates

export const generatePLSummary = query({
  args: {
    branch_id: v.id("branches"),
    start_date: v.number(),
    end_date: v.number(),
  },
  handler: async (ctx, args) => {
    // Get current period transactions
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    const currentPeriod = transactions.filter(
      (t) =>
        t.payment_status === "completed" &&
        t.createdAt >= args.start_date &&
        t.createdAt <= args.end_date
    );

    // Calculate previous period for comparison
    const periodLength = args.end_date - args.start_date;
    const prevStart = args.start_date - periodLength;
    const prevEnd = args.start_date;

    const previousPeriod = transactions.filter(
      (t) =>
        t.payment_status === "completed" &&
        t.createdAt >= prevStart &&
        t.createdAt < prevEnd
    );

    // Calculate metrics
    const calcRevenue = (txns: typeof transactions) => {
      let services = 0;
      let products = 0;
      for (const t of txns) {
        for (const s of t.services || []) services += s.price * s.quantity;
        for (const p of t.products || []) products += p.price * p.quantity;
      }
      return { services, products, total: services + products };
    };

    const current = calcRevenue(currentPeriod);
    const previous = calcRevenue(previousPeriod);

    // Calculate changes
    const revenueChange = previous.total > 0
      ? ((current.total - previous.total) / previous.total) * 100
      : 0;
    const serviceChange = previous.services > 0
      ? ((current.services - previous.services) / previous.services) * 100
      : 0;
    const productChange = previous.products > 0
      ? ((current.products - previous.products) / previous.products) * 100
      : 0;
    const txnChange = previousPeriod.length > 0
      ? ((currentPeriod.length - previousPeriod.length) / previousPeriod.length) * 100
      : 0;

    // Find top performing service
    const serviceRevenue: Record<string, { name: string; revenue: number; count: number }> = {};
    for (const t of currentPeriod) {
      for (const s of t.services || []) {
        if (!serviceRevenue[s.service_id]) {
          serviceRevenue[s.service_id] = { name: s.service_name, revenue: 0, count: 0 };
        }
        serviceRevenue[s.service_id].revenue += s.price * s.quantity;
        serviceRevenue[s.service_id].count += s.quantity;
      }
    }
    const topService = Object.values(serviceRevenue).sort((a, b) => b.revenue - a.revenue)[0];

    // Find top selling product
    const productRevenue: Record<string, { name: string; revenue: number; count: number }> = {};
    for (const t of currentPeriod) {
      for (const p of t.products || []) {
        if (!productRevenue[p.product_id]) {
          productRevenue[p.product_id] = { name: p.product_name, revenue: 0, count: 0 };
        }
        productRevenue[p.product_id].revenue += p.price * p.quantity;
        productRevenue[p.product_id].count += p.quantity;
      }
    }
    const topProduct = Object.values(productRevenue).sort((a, b) => b.revenue - a.revenue)[0];

    // Generate template-based insights
    const insights: string[] = [];

    // Revenue insight
    if (Math.abs(revenueChange) >= 5) {
      insights.push(
        revenueChange > 0
          ? `📈 Revenue increased ${revenueChange.toFixed(1)}% compared to last period`
          : `📉 Revenue decreased ${Math.abs(revenueChange).toFixed(1)}% compared to last period`
      );
    } else {
      insights.push(`📊 Revenue remained stable (${revenueChange > 0 ? '+' : ''}${revenueChange.toFixed(1)}%)`);
    }

    // Service vs Product breakdown
    const serviceRatio = current.total > 0 ? (current.services / current.total) * 100 : 0;
    insights.push(
      `💇 Services: ₱${current.services.toLocaleString()} (${serviceRatio.toFixed(0)}%) | 🛍️ Products: ₱${current.products.toLocaleString()} (${(100 - serviceRatio).toFixed(0)}%)`
    );

    // Top performers
    if (topService) {
      insights.push(`⭐ Top Service: ${topService.name} (${topService.count} bookings, ₱${topService.revenue.toLocaleString()})`);
    }
    if (topProduct) {
      insights.push(`🏆 Top Product: ${topProduct.name} (${topProduct.count} sold, ₱${topProduct.revenue.toLocaleString()})`);
    }

    // Transaction volume
    insights.push(
      `📋 ${currentPeriod.length} transactions (${txnChange > 0 ? '+' : ''}${txnChange.toFixed(0)}% vs last period)`
    );

    // Recommendations based on data
    const recommendations: string[] = [];

    if (revenueChange < -10) {
      recommendations.push("Consider running a promotion to boost sales");
    }
    if (current.products < current.services * 0.1) {
      recommendations.push("Product sales are low - consider upselling during services");
    }
    if (txnChange < -15) {
      recommendations.push("Transaction volume dropped - review booking availability");
    }
    if (topService && topService.count > currentPeriod.length * 0.5) {
      recommendations.push(`${topService.name} is very popular - ensure adequate staff availability`);
    }

    return {
      summary: {
        total_revenue: current.total,
        service_revenue: current.services,
        product_revenue: current.products,
        transaction_count: currentPeriod.length,
        revenue_change: revenueChange,
        service_change: serviceChange,
        product_change: productChange,
        txn_change: txnChange,
      },
      insights,
      recommendations,
      top_performers: {
        service: topService || null,
        product: topProduct || null,
      },
      comparison: {
        current_period: { start: args.start_date, end: args.end_date },
        previous_period: { start: prevStart, end: prevEnd },
      },
    };
  },
});

// ============================================================================
// 2. ANOMALY DETECTION (Statistical - Isolation Forest Concept)
// ============================================================================
// Detects unusual transactions using statistical methods (z-score based)

export const detectAnomalies = query({
  args: {
    branch_id: v.id("branches"),
    days: v.optional(v.number()), // Default 30 days
  },
  handler: async (ctx, args) => {
    const daysToAnalyze = args.days || 30;
    const now = Date.now();
    const startDate = now - daysToAnalyze * 24 * 60 * 60 * 1000;

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    const recentTxns = transactions.filter(
      (t) => t.payment_status === "completed" && t.createdAt >= startDate
    );

    if (recentTxns.length < 10) {
      return { anomalies: [], message: "Not enough data for anomaly detection (min 10 transactions)" };
    }

    // Calculate transaction totals
    const txnTotals = recentTxns.map((t) => {
      let total = 0;
      for (const s of t.services || []) total += s.price * s.quantity;
      for (const p of t.products || []) total += p.price * p.quantity;
      return { id: t._id, total, createdAt: t.createdAt, services: t.services, products: t.products };
    });

    // Calculate mean and standard deviation
    const values = txnTotals.map((t) => t.total);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    );

    // Detect anomalies (z-score > 2.5 or < -2.5)
    const anomalies = [];
    const threshold = 2.5;

    for (const txn of txnTotals) {
      const zScore = stdDev > 0 ? (txn.total - mean) / stdDev : 0;

      if (Math.abs(zScore) > threshold) {
        anomalies.push({
          transaction_id: txn.id,
          amount: txn.total,
          z_score: zScore,
          type: zScore > 0 ? "unusually_high" : "unusually_low",
          date: txn.createdAt,
          reason: zScore > 0
            ? `Amount ₱${txn.total.toLocaleString()} is ${zScore.toFixed(1)} std devs above average (₱${mean.toFixed(0)})`
            : `Amount ₱${txn.total.toLocaleString()} is ${Math.abs(zScore).toFixed(1)} std devs below average (₱${mean.toFixed(0)})`,
        });
      }
    }

    // Sort by absolute z-score (most anomalous first)
    anomalies.sort((a, b) => Math.abs(b.z_score) - Math.abs(a.z_score));

    // Daily transaction volume anomalies
    const dailyTxns: Record<string, number> = {};
    for (const txn of recentTxns) {
      const date = new Date(txn.createdAt).toISOString().split("T")[0];
      dailyTxns[date] = (dailyTxns[date] || 0) + 1;
    }

    const dailyValues = Object.values(dailyTxns);
    const dailyMean = dailyValues.reduce((a, b) => a + b, 0) / dailyValues.length;
    const dailyStdDev = Math.sqrt(
      dailyValues.reduce((sum, val) => sum + Math.pow(val - dailyMean, 2), 0) / dailyValues.length
    );

    const volumeAnomalies = [];
    for (const [date, count] of Object.entries(dailyTxns)) {
      const zScore = dailyStdDev > 0 ? (count - dailyMean) / dailyStdDev : 0;
      if (Math.abs(zScore) > 2) {
        volumeAnomalies.push({
          date,
          count,
          z_score: zScore,
          type: zScore > 0 ? "high_volume" : "low_volume",
          reason: zScore > 0
            ? `${count} transactions on ${date} is unusually high (avg: ${dailyMean.toFixed(0)}/day)`
            : `${count} transactions on ${date} is unusually low (avg: ${dailyMean.toFixed(0)}/day)`,
        });
      }
    }

    return {
      transaction_anomalies: anomalies.slice(0, 10), // Top 10
      volume_anomalies: volumeAnomalies,
      statistics: {
        mean_transaction: mean,
        std_deviation: stdDev,
        total_analyzed: recentTxns.length,
        anomaly_count: anomalies.length,
        daily_avg: dailyMean,
      },
    };
  },
});

// ============================================================================
// 3. BRANCH HEALTH SCORE (Weighted Scoring Algorithm)
// ============================================================================
// Calculates overall branch performance score (0-100)

export const getBranchHealthScore = query({
  args: {
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000;

    // Get transactions for current and previous period
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    const current = transactions.filter(
      (t) => t.payment_status === "completed" && t.createdAt >= thirtyDaysAgo
    );
    const previous = transactions.filter(
      (t) => t.payment_status === "completed" && t.createdAt >= sixtyDaysAgo && t.createdAt < thirtyDaysAgo
    );

    // Get bookings data
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    const recentBookings = bookings.filter((b) => b.createdAt >= thirtyDaysAgo);
    const completedBookings = recentBookings.filter((b) => b.status === "completed");
    const cancelledBookings = recentBookings.filter((b) => b.status === "cancelled");

    // Get products for stock health
    const products = await ctx.db
      .query("products")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    const activeProducts = products.filter((p) => p.status === "active");
    const lowStockProducts = activeProducts.filter(
      (p) => p.stock <= (p.minStock || 5)
    );
    const outOfStock = activeProducts.filter((p) => p.stock === 0);

    // Calculate individual scores (0-100 each)
    const scores: Record<string, { score: number; weight: number; details: string }> = {};

    // 1. Revenue Growth (25% weight)
    const calcTotal = (txns: typeof transactions) => {
      let total = 0;
      for (const t of txns) {
        for (const s of t.services || []) total += s.price * s.quantity;
        for (const p of t.products || []) total += p.price * p.quantity;
      }
      return total;
    };

    const currentRevenue = calcTotal(current);
    const previousRevenue = calcTotal(previous);
    const revenueGrowth = previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : (currentRevenue > 0 ? 100 : 0);

    // Score: +20% growth = 100, 0% = 50, -20% = 0
    const revenueScore = Math.max(0, Math.min(100, 50 + revenueGrowth * 2.5));
    scores.revenue = {
      score: revenueScore,
      weight: 25,
      details: `${revenueGrowth >= 0 ? '+' : ''}${revenueGrowth.toFixed(1)}% growth`,
    };

    // 2. Booking Completion Rate (20% weight)
    const completionRate = recentBookings.length > 0
      ? (completedBookings.length / recentBookings.length) * 100
      : 100;
    scores.bookings = {
      score: completionRate,
      weight: 20,
      details: `${completionRate.toFixed(0)}% completion rate`,
    };

    // 3. Cancellation Rate (15% weight) - Lower is better
    const cancellationRate = recentBookings.length > 0
      ? (cancelledBookings.length / recentBookings.length) * 100
      : 0;
    const cancellationScore = Math.max(0, 100 - cancellationRate * 5); // Each 1% cancellation = -5 points
    scores.cancellations = {
      score: cancellationScore,
      weight: 15,
      details: `${cancellationRate.toFixed(1)}% cancellation rate`,
    };

    // 4. Transaction Volume (20% weight)
    const txnGrowth = previous.length > 0
      ? ((current.length - previous.length) / previous.length) * 100
      : (current.length > 0 ? 100 : 0);
    const txnScore = Math.max(0, Math.min(100, 50 + txnGrowth * 2));
    scores.transactions = {
      score: txnScore,
      weight: 20,
      details: `${current.length} transactions (${txnGrowth >= 0 ? '+' : ''}${txnGrowth.toFixed(0)}%)`,
    };

    // 5. Inventory Health (20% weight)
    const stockHealthRate = activeProducts.length > 0
      ? ((activeProducts.length - lowStockProducts.length) / activeProducts.length) * 100
      : 100;
    scores.inventory = {
      score: stockHealthRate,
      weight: 20,
      details: `${lowStockProducts.length} low stock, ${outOfStock.length} out of stock`,
    };

    // Calculate weighted total
    let totalScore = 0;
    let totalWeight = 0;
    for (const [key, data] of Object.entries(scores)) {
      totalScore += data.score * data.weight;
      totalWeight += data.weight;
    }
    const healthScore = totalWeight > 0 ? totalScore / totalWeight : 0;

    // Determine health status
    let status: string;
    let statusColor: string;
    if (healthScore >= 80) {
      status = "Excellent";
      statusColor = "green";
    } else if (healthScore >= 60) {
      status = "Good";
      statusColor = "blue";
    } else if (healthScore >= 40) {
      status = "Fair";
      statusColor = "yellow";
    } else {
      status = "Needs Attention";
      statusColor = "red";
    }

    // Generate alerts
    const alerts: string[] = [];
    if (revenueScore < 40) alerts.push("⚠️ Revenue declining - review pricing and promotions");
    if (completionRate < 70) alerts.push("⚠️ Low booking completion rate - check service availability");
    if (cancellationRate > 20) alerts.push("⚠️ High cancellation rate - review booking policies");
    if (outOfStock.length > 0) alerts.push(`⚠️ ${outOfStock.length} products out of stock`);
    if (lowStockProducts.length > 3) alerts.push(`⚠️ ${lowStockProducts.length} products need reorder`);

    return {
      health_score: Math.round(healthScore),
      status,
      status_color: statusColor,
      breakdown: scores,
      alerts,
      metrics: {
        current_revenue: currentRevenue,
        previous_revenue: previousRevenue,
        total_bookings: recentBookings.length,
        completed_bookings: completedBookings.length,
        cancelled_bookings: cancelledBookings.length,
        active_products: activeProducts.length,
        low_stock_products: lowStockProducts.length,
        out_of_stock: outOfStock.length,
      },
    };
  },
});

// ============================================================================
// 4. PRODUCT REORDER ALERTS (Threshold Rules)
// ============================================================================
// Identifies products that need to be reordered based on stock levels

export const getReorderAlerts = query({
  args: {
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    const activeProducts = products.filter((p) => p.status === "active");

    // Calculate sales velocity (last 30 days)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    const recentTxns = transactions.filter(
      (t) => t.payment_status === "completed" && t.createdAt >= thirtyDaysAgo
    );

    // Count product sales
    const productSales: Record<string, number> = {};
    for (const t of recentTxns) {
      for (const p of t.products || []) {
        productSales[p.product_id] = (productSales[p.product_id] || 0) + p.quantity;
      }
    }

    // Categorize products
    const outOfStock: typeof products = [];
    const critical: typeof products = [];
    const lowStock: typeof products = [];
    const adequate: typeof products = [];

    for (const product of activeProducts) {
      const reorderLevel = product.minStock || 5;
      const salesVelocity = productSales[product._id] || 0;
      const dailySales = salesVelocity / 30;
      const daysOfStock = dailySales > 0 ? product.stock / dailySales : 999;

      const productWithVelocity = {
        ...product,
        sales_last_30_days: salesVelocity,
        daily_velocity: dailySales,
        days_of_stock: daysOfStock,
      };

      if (product.stock === 0) {
        outOfStock.push(productWithVelocity);
      } else if (product.stock <= reorderLevel / 2 || daysOfStock <= 7) {
        critical.push(productWithVelocity);
      } else if (product.stock <= reorderLevel || daysOfStock <= 14) {
        lowStock.push(productWithVelocity);
      } else {
        adequate.push(productWithVelocity);
      }
    }

    // Generate reorder suggestions
    const suggestions = [...outOfStock, ...critical, ...lowStock].map((p: any) => {
      const suggestedQty = Math.max(
        (p.minStock || 5) * 2,
        Math.ceil(p.daily_velocity * 30) // 30 days of stock
      );

      return {
        product_id: p._id,
        product_name: p.name,
        current_stock: p.stock,
        reorder_level: p.minStock || 5,
        suggested_order: suggestedQty,
        urgency: p.stock === 0 ? "critical" : p.stock <= (p.minStock || 5) / 2 ? "high" : "medium",
        reason: p.stock === 0
          ? "Out of stock"
          : p.days_of_stock <= 7
          ? `Only ${p.days_of_stock.toFixed(0)} days of stock left`
          : `Stock below reorder level (${p.minStock || 5})`,
        sales_velocity: `${p.sales_last_30_days} sold in last 30 days`,
      };
    });

    // Sort by urgency
    suggestions.sort((a, b) => {
      const urgencyOrder = { critical: 0, high: 1, medium: 2 };
      return urgencyOrder[a.urgency as keyof typeof urgencyOrder] - urgencyOrder[b.urgency as keyof typeof urgencyOrder];
    });

    return {
      summary: {
        total_products: activeProducts.length,
        out_of_stock: outOfStock.length,
        critical: critical.length,
        low_stock: lowStock.length,
        adequate: adequate.length,
      },
      alerts: suggestions,
      inventory_health: activeProducts.length > 0
        ? ((adequate.length / activeProducts.length) * 100).toFixed(0) + "%"
        : "N/A",
    };
  },
});

// ============================================================================
// 5. SALES FORECASTING (Simple Moving Average)
// ============================================================================
// Predicts future sales based on historical trends

export const getSalesForecast = query({
  args: {
    branch_id: v.id("branches"),
    forecast_days: v.optional(v.number()), // Default 7 days
  },
  handler: async (ctx, args) => {
    const forecastDays = args.forecast_days || 7;
    const now = Date.now();
    const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    const recentTxns = transactions.filter(
      (t) => t.payment_status === "completed" && t.createdAt >= ninetyDaysAgo
    );

    // Group by day
    const dailyRevenue: Record<string, number> = {};
    const dailyTxnCount: Record<string, number> = {};

    for (const t of recentTxns) {
      const date = new Date(t.createdAt).toISOString().split("T")[0];
      let total = 0;
      for (const s of t.services || []) total += s.price * s.quantity;
      for (const p of t.products || []) total += p.price * p.quantity;

      dailyRevenue[date] = (dailyRevenue[date] || 0) + total;
      dailyTxnCount[date] = (dailyTxnCount[date] || 0) + 1;
    }

    // Calculate 7-day and 30-day moving averages
    const dates = Object.keys(dailyRevenue).sort();
    const revenues = dates.map((d) => dailyRevenue[d]);

    const calcMovingAvg = (data: number[], window: number) => {
      if (data.length < window) return data.reduce((a, b) => a + b, 0) / data.length || 0;
      const recent = data.slice(-window);
      return recent.reduce((a, b) => a + b, 0) / window;
    };

    const avg7day = calcMovingAvg(revenues, 7);
    const avg30day = calcMovingAvg(revenues, 30);

    // Day of week patterns
    const dayOfWeekRevenue: Record<number, number[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    for (const date of dates) {
      const dayOfWeek = new Date(date).getDay();
      dayOfWeekRevenue[dayOfWeek].push(dailyRevenue[date]);
    }

    const dayOfWeekAvg: Record<number, number> = {};
    for (const [day, values] of Object.entries(dayOfWeekRevenue)) {
      dayOfWeekAvg[parseInt(day)] = values.length > 0
        ? values.reduce((a, b) => a + b, 0) / values.length
        : avg7day;
    }

    // Generate forecast
    const forecast = [];
    let totalForecast = 0;

    for (let i = 1; i <= forecastDays; i++) {
      const futureDate = new Date(now + i * 24 * 60 * 60 * 1000);
      const dayOfWeek = futureDate.getDay();
      const dateStr = futureDate.toISOString().split("T")[0];

      // Use day-of-week average adjusted by recent trend
      const trendFactor = avg30day > 0 ? avg7day / avg30day : 1;
      const predicted = dayOfWeekAvg[dayOfWeek] * trendFactor;

      forecast.push({
        date: dateStr,
        day_of_week: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dayOfWeek],
        predicted_revenue: Math.round(predicted),
        confidence: revenues.length >= 30 ? "high" : revenues.length >= 14 ? "medium" : "low",
      });

      totalForecast += predicted;
    }

    // Trend analysis
    const trend = avg7day > avg30day * 1.1
      ? "upward"
      : avg7day < avg30day * 0.9
      ? "downward"
      : "stable";

    return {
      forecast,
      total_forecast: Math.round(totalForecast),
      statistics: {
        avg_daily_7day: Math.round(avg7day),
        avg_daily_30day: Math.round(avg30day),
        trend,
        trend_percentage: avg30day > 0 ? ((avg7day - avg30day) / avg30day * 100).toFixed(1) : "0",
        data_points: revenues.length,
      },
      day_patterns: Object.entries(dayOfWeekAvg).map(([day, avg]) => ({
        day: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][parseInt(day)],
        average_revenue: Math.round(avg as number),
      })),
    };
  },
});

// ============================================================================
// 6. CUSTOMER INSIGHTS (Rule-Based Segmentation)
// ============================================================================
// Segments customers based on transaction history

export const getCustomerInsights = query({
  args: {
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    const recentTxns = transactions.filter(
      (t) => t.payment_status === "completed" && t.createdAt >= ninetyDaysAgo && t.customer
    );

    // Aggregate by customer
    const customerStats: Record<string, {
      customer_id: string;
      visit_count: number;
      total_spent: number;
      last_visit: number;
      first_visit: number;
      services_used: Set<string>;
      products_bought: Set<string>;
    }> = {};

    for (const t of recentTxns) {
      if (!t.customer) continue;
      const custId = t.customer as string;

      if (!customerStats[custId]) {
        customerStats[custId] = {
          customer_id: custId,
          visit_count: 0,
          total_spent: 0,
          last_visit: t.createdAt,
          first_visit: t.createdAt,
          services_used: new Set(),
          products_bought: new Set(),
        };
      }

      customerStats[custId].visit_count += 1;
      customerStats[custId].last_visit = Math.max(customerStats[custId].last_visit, t.createdAt);
      customerStats[custId].first_visit = Math.min(customerStats[custId].first_visit, t.createdAt);

      for (const s of t.services || []) {
        customerStats[custId].total_spent += s.price * s.quantity;
        customerStats[custId].services_used.add(s.service_name);
      }
      for (const p of t.products || []) {
        customerStats[custId].total_spent += p.price * p.quantity;
        customerStats[custId].products_bought.add(p.product_name);
      }
    }

    const customers = Object.values(customerStats);

    // RFM-based segmentation (Recency, Frequency, Monetary)
    const segments = {
      vip: [] as typeof customers,
      loyal: [] as typeof customers,
      regular: [] as typeof customers,
      at_risk: [] as typeof customers,
      new: [] as typeof customers,
    };

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    for (const c of customers) {
      const daysSinceVisit = (Date.now() - c.last_visit) / (24 * 60 * 60 * 1000);
      const isRecent = c.last_visit >= thirtyDaysAgo;
      const isNew = c.first_visit >= thirtyDaysAgo && c.visit_count <= 2;
      const avgSpend = c.total_spent / c.visit_count;

      if (isNew) {
        segments.new.push(c);
      } else if (c.visit_count >= 4 && c.total_spent >= 5000 && isRecent) {
        segments.vip.push(c);
      } else if (c.visit_count >= 3 && isRecent) {
        segments.loyal.push(c);
      } else if (isRecent) {
        segments.regular.push(c);
      } else if (daysSinceVisit > 30) {
        segments.at_risk.push(c);
      } else {
        segments.regular.push(c);
      }
    }

    // Calculate segment stats
    const segmentStats = Object.entries(segments).map(([name, custs]) => ({
      segment: name,
      count: custs.length,
      total_revenue: custs.reduce((sum, c) => sum + c.total_spent, 0),
      avg_visits: custs.length > 0 ? custs.reduce((sum, c) => sum + c.visit_count, 0) / custs.length : 0,
      avg_spend: custs.length > 0 ? custs.reduce((sum, c) => sum + c.total_spent, 0) / custs.length : 0,
    }));

    // Insights
    const insights: string[] = [];

    if (segments.vip.length > 0) {
      const vipRevenue = segments.vip.reduce((sum, c) => sum + c.total_spent, 0);
      const totalRevenue = customers.reduce((sum, c) => sum + c.total_spent, 0);
      insights.push(`👑 ${segments.vip.length} VIP customers generate ${((vipRevenue / totalRevenue) * 100).toFixed(0)}% of revenue`);
    }

    if (segments.at_risk.length > 0) {
      insights.push(`⚠️ ${segments.at_risk.length} customers haven't visited in 30+ days - consider re-engagement`);
    }

    if (segments.new.length > 0) {
      insights.push(`🆕 ${segments.new.length} new customers in the last 30 days`);
    }

    return {
      total_customers: customers.length,
      segments: segmentStats,
      insights,
      recommendations: [
        segments.at_risk.length > 5 ? "Send promotional offers to at-risk customers" : null,
        segments.vip.length > 0 ? "Consider VIP loyalty rewards program" : null,
        segments.new.length > segments.loyal.length ? "Focus on retention - many new customers not returning" : null,
      ].filter(Boolean),
    };
  },
});

// ============================================================================
// 7. AI MARKETING STRATEGY GENERATOR
// ============================================================================
// Generates data-driven marketing recommendations

// ============================================================================
// SUPER ADMIN ANALYTICS QUERIES (System-Wide)
// ============================================================================
// These queries provide SA-level insights across all branches

// ============================================================================
// SA-1. DESCRIPTIVE ANALYTICS (System-Wide Overview)
// ============================================================================
export const getSADescriptiveAnalytics = query({
  args: {
    start_date: v.number(),
    end_date: v.number(),
  },
  handler: async (ctx, args) => {
    // Fetch all branches
    const branches = await ctx.db.query("branches").collect();
    const activeBranches = branches.filter(b => b.is_active);

    // Fetch transactions for period
    const transactions = await ctx.db.query("transactions").collect();
    const periodTxns = transactions.filter(
      t => t.payment_status === "completed" && t.createdAt >= args.start_date && t.createdAt <= args.end_date
    );

    // Previous period for comparison
    const periodLength = args.end_date - args.start_date;
    const prevStart = args.start_date - periodLength;
    const prevEnd = args.start_date;
    const prevTxns = transactions.filter(
      t => t.payment_status === "completed" && t.createdAt >= prevStart && t.createdAt < prevEnd
    );

    // Calculate system-wide revenue
    const calcRevenue = (txns: typeof transactions) => {
      let services = 0, products = 0;
      for (const t of txns) {
        for (const s of t.services || []) services += s.price * s.quantity;
        for (const p of t.products || []) products += p.price * p.quantity;
      }
      return { services, products, total: services + products };
    };

    const currentRev = calcRevenue(periodTxns);
    const prevRev = calcRevenue(prevTxns);
    const revenueGrowth = prevRev.total > 0 ? ((currentRev.total - prevRev.total) / prevRev.total) * 100 : 0;

    // Fetch royalty payments
    const royaltyPayments = await ctx.db.query("royaltyPayments").collect();
    const periodRoyalties = royaltyPayments.filter(
      r => r.createdAt >= args.start_date && r.createdAt <= args.end_date
    );
    const totalRoyalties = periodRoyalties.reduce((sum, r) => sum + r.amount, 0);
    const paidRoyalties = periodRoyalties.filter(r => r.status === "paid").reduce((sum, r) => sum + r.amount, 0);
    const pendingRoyalties = periodRoyalties.filter(r => r.status === "pending" || r.status === "overdue").reduce((sum, r) => sum + r.amount, 0);

    // Fetch wallet transactions
    const walletTxns = await ctx.db.query("wallet_transactions").collect();
    const periodWalletTxns = walletTxns.filter(
      w => w.createdAt >= args.start_date && w.createdAt <= args.end_date && w.type === "topup"
    );
    const totalTopUps = periodWalletTxns.reduce((sum, w) => sum + w.amount, 0);
    const topUpCount = periodWalletTxns.length;

    // Branch additions
    const newBranches = branches.filter(
      b => b.createdAt >= args.start_date && b.createdAt <= args.end_date
    );

    // SA Product Sales (from productOrders - central warehouse to branches)
    const productOrders = await ctx.db.query("productOrders").collect();
    const periodProductOrders = productOrders.filter(
      o => o.created_at >= args.start_date && o.created_at <= args.end_date
    );
    const completedOrders = periodProductOrders.filter(o => o.status === "received" || o.status === "shipped" || o.status === "approved");
    const totalProductOrderRevenue = completedOrders.reduce((sum, o) => sum + o.total_amount, 0);
    const paidOrders = completedOrders.filter(o => o.is_paid);
    const paidProductRevenue = paidOrders.reduce((sum, o) => sum + o.total_amount, 0);
    const pendingProductPayments = completedOrders.filter(o => !o.is_paid).reduce((sum, o) => sum + o.total_amount, 0);

    // Product catalog stats
    const productCatalog = await ctx.db.query("productCatalog").collect();
    const activeProducts = productCatalog.filter(p => p.is_active);
    const lowStockProducts = activeProducts.filter(p => p.stock <= p.minStock);

    // Per-branch performance
    const branchPerformance = activeBranches.map(branch => {
      const branchTxns = periodTxns.filter(t => t.branch_id === branch._id);
      const branchRev = calcRevenue(branchTxns);
      const branchRoyalties = periodRoyalties.filter(r => r.branch_id === branch._id);
      return {
        branch_id: branch._id,
        branch_name: branch.name,
        branch_code: branch.branch_code,
        revenue: branchRev.total,
        service_revenue: branchRev.services,
        product_revenue: branchRev.products,
        transactions: branchTxns.length,
        royalties_due: branchRoyalties.reduce((sum, r) => sum + r.amount, 0),
        royalties_paid: branchRoyalties.filter(r => r.status === "paid").reduce((sum, r) => sum + r.amount, 0),
      };
    }).sort((a, b) => b.revenue - a.revenue);

    // Generate insights
    const insights: string[] = [];

    insights.push(`📊 System Revenue: ₱${currentRev.total.toLocaleString()} (${revenueGrowth >= 0 ? '+' : ''}${revenueGrowth.toFixed(1)}% vs last period)`);
    insights.push(`💇 Services: ₱${currentRev.services.toLocaleString()} | 🛍️ Branch Products: ₱${currentRev.products.toLocaleString()}`);
    insights.push(`👑 Royalties: ₱${totalRoyalties.toLocaleString()} total (₱${paidRoyalties.toLocaleString()} paid, ₱${pendingRoyalties.toLocaleString()} pending)`);
    insights.push(`💰 Wallet Top-ups: ₱${totalTopUps.toLocaleString()} (${topUpCount} transactions)`);

    // SA Product Sales insights
    insights.push(`📦 SA Product Sales: ₱${totalProductOrderRevenue.toLocaleString()} (${completedOrders.length} orders)`);
    if (pendingProductPayments > 0) {
      insights.push(`⚠️ Pending Product Payments: ₱${pendingProductPayments.toLocaleString()} (${completedOrders.filter(o => !o.is_paid).length} unpaid orders)`);
    }
    if (lowStockProducts.length > 0) {
      insights.push(`📉 Low Stock Alert: ${lowStockProducts.length} products below minimum stock level`);
    }

    if (newBranches.length > 0) {
      insights.push(`🏪 ${newBranches.length} new branch${newBranches.length > 1 ? 'es' : ''} added this period`);
    }

    if (branchPerformance[0]) {
      insights.push(`🏆 Top Branch: ${branchPerformance[0].branch_name} (₱${branchPerformance[0].revenue.toLocaleString()})`);
    }

    return {
      summary: {
        total_revenue: currentRev.total,
        service_revenue: currentRev.services,
        product_revenue: currentRev.products,
        revenue_growth: revenueGrowth,
        total_transactions: periodTxns.length,
        total_royalties: totalRoyalties,
        paid_royalties: paidRoyalties,
        pending_royalties: pendingRoyalties,
        wallet_topups: totalTopUps,
        topup_count: topUpCount,
        active_branches: activeBranches.length,
        new_branches: newBranches.length,
        // SA Product Sales (central warehouse to branches)
        sa_product_orders: {
          total_revenue: totalProductOrderRevenue,
          paid_revenue: paidProductRevenue,
          pending_payments: pendingProductPayments,
          total_orders: periodProductOrders.length,
          completed_orders: completedOrders.length,
          paid_orders: paidOrders.length,
          unpaid_orders: completedOrders.filter(o => !o.is_paid).length,
        },
        // Product Catalog stats
        product_catalog: {
          total_products: productCatalog.length,
          active_products: activeProducts.length,
          low_stock_products: lowStockProducts.length,
        },
      },
      branch_performance: branchPerformance.slice(0, 10),
      insights,
      period: { start: args.start_date, end: args.end_date },
    };
  },
});

// ============================================================================
// SA-2. DIAGNOSTIC ANALYTICS (Why Analysis)
// ============================================================================
export const getSADiagnosticAnalytics = query({
  args: {
    start_date: v.number(),
    end_date: v.number(),
  },
  handler: async (ctx, args) => {
    const branches = await ctx.db.query("branches").collect();
    const activeBranches = branches.filter(b => b.is_active);

    const transactions = await ctx.db.query("transactions").collect();
    const periodTxns = transactions.filter(
      t => t.payment_status === "completed" && t.createdAt >= args.start_date && t.createdAt <= args.end_date
    );

    const periodLength = args.end_date - args.start_date;
    const prevStart = args.start_date - periodLength;
    const prevTxns = transactions.filter(
      t => t.payment_status === "completed" && t.createdAt >= prevStart && t.createdAt < args.start_date
    );

    // Royalty analysis
    const royaltyPayments = await ctx.db.query("royaltyPayments").collect();
    const royaltyConfigs = await ctx.db.query("royaltyConfig").collect();

    const overdueRoyalties = royaltyPayments.filter(
      r => r.status === "overdue" && r.createdAt <= args.end_date
    );

    // Branch with payment issues
    const branchRoyaltyIssues = activeBranches.map(branch => {
      const branchOverdue = overdueRoyalties.filter(r => r.branch_id === branch._id);
      return {
        branch_id: branch._id,
        branch_name: branch.name,
        overdue_count: branchOverdue.length,
        overdue_amount: branchOverdue.reduce((sum, r) => sum + r.amount, 0),
      };
    }).filter(b => b.overdue_count > 0).sort((a, b) => b.overdue_amount - a.overdue_amount);

    // Product sales analysis
    const productStats: Record<string, { name: string; revenue: number; count: number; branches: Set<string> }> = {};
    for (const t of periodTxns) {
      for (const p of t.products || []) {
        if (!productStats[p.product_name]) {
          productStats[p.product_name] = { name: p.product_name, revenue: 0, count: 0, branches: new Set() };
        }
        productStats[p.product_name].revenue += p.price * p.quantity;
        productStats[p.product_name].count += p.quantity;
        productStats[p.product_name].branches.add(t.branch_id);
      }
    }

    const topProducts = Object.values(productStats)
      .map(p => ({
        name: p.name,
        revenue: p.revenue,
        count: p.count,
        branch_count: p.branches.size
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Branch performance decline analysis
    const calcBranchRevenue = (txns: typeof transactions, branchId: string) => {
      return txns.filter(t => t.branch_id === branchId).reduce((sum, t) => {
        let total = 0;
        for (const s of t.services || []) total += s.price * s.quantity;
        for (const p of t.products || []) total += p.price * p.quantity;
        return sum + total;
      }, 0);
    };

    const branchDeclines = activeBranches.map(branch => {
      const currentRev = calcBranchRevenue(periodTxns, branch._id);
      const prevRev = calcBranchRevenue(prevTxns, branch._id);
      const change = prevRev > 0 ? ((currentRev - prevRev) / prevRev) * 100 : 0;
      return {
        branch_id: branch._id,
        branch_name: branch.name,
        current_revenue: currentRev,
        previous_revenue: prevRev,
        change_percent: change,
      };
    }).filter(b => b.change_percent < -10).sort((a, b) => a.change_percent - b.change_percent);

    // Wallet top-up patterns
    const walletTxns = await ctx.db.query("wallet_transactions").collect();
    const topUps = walletTxns.filter(
      w => w.type === "topup" && w.createdAt >= args.start_date && w.createdAt <= args.end_date
    );

    const topUpByAmount: Record<string, number> = {};
    for (const t of topUps) {
      const bracket = t.amount <= 500 ? "100-500" : t.amount <= 1000 ? "501-1000" : t.amount <= 2000 ? "1001-2000" : "2000+";
      topUpByAmount[bracket] = (topUpByAmount[bracket] || 0) + 1;
    }

    // SA Product Order Analysis (central warehouse to branches)
    const productOrders = await ctx.db.query("productOrders").collect();
    const periodProductOrders = productOrders.filter(
      o => o.created_at >= args.start_date && o.created_at <= args.end_date
    );

    // Order fulfillment analysis
    const ordersByStatus: Record<string, number> = {};
    for (const o of periodProductOrders) {
      ordersByStatus[o.status] = (ordersByStatus[o.status] || 0) + 1;
    }

    const completedOrders = periodProductOrders.filter(o => o.status === "received" || o.status === "shipped" || o.status === "approved");
    const fulfilledOrders = periodProductOrders.filter(o => o.status === "received");
    const fulfillmentRate = periodProductOrders.length > 0 ? (fulfilledOrders.length / periodProductOrders.length) * 100 : 0;

    // Unpaid orders analysis
    const unpaidOrders = completedOrders.filter(o => !o.is_paid);
    const unpaidAmount = unpaidOrders.reduce((sum, o) => sum + o.total_amount, 0);

    // Branches with unpaid orders
    const branchUnpaidOrders = activeBranches.map(branch => {
      const branchUnpaid = unpaidOrders.filter(o => o.branch_id === branch._id);
      return {
        branch_id: branch._id,
        branch_name: branch.name,
        unpaid_count: branchUnpaid.length,
        unpaid_amount: branchUnpaid.reduce((sum, o) => sum + o.total_amount, 0),
      };
    }).filter(b => b.unpaid_count > 0).sort((a, b) => b.unpaid_amount - a.unpaid_amount);

    // Popular products across branches
    const saProductStats: Record<string, { name: string; quantity: number; revenue: number; branch_count: number; branches: Set<string> }> = {};
    for (const o of completedOrders) {
      for (const item of o.items || []) {
        const key = item.product_id;
        if (!saProductStats[key]) {
          saProductStats[key] = { name: item.product_name, quantity: 0, revenue: 0, branch_count: 0, branches: new Set() };
        }
        saProductStats[key].quantity += item.quantity;
        saProductStats[key].revenue += item.quantity * item.price;
        saProductStats[key].branches.add(o.branch_id);
      }
    }

    const topSAProducts = Object.values(saProductStats)
      .map(p => ({
        name: p.name,
        quantity: p.quantity,
        revenue: p.revenue,
        branch_count: p.branches.size
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Product Catalog stock analysis
    const productCatalog = await ctx.db.query("productCatalog").collect();
    const activeProducts = productCatalog.filter(p => p.is_active);
    const lowStockProducts = activeProducts.filter(p => p.stock <= p.minStock);
    const outOfStockProducts = activeProducts.filter(p => p.stock === 0);

    // Generate diagnostic insights
    const diagnostics: Array<{ issue: string; analysis: string; severity: "high" | "medium" | "low"; action: string }> = [];

    if (overdueRoyalties.length > 0) {
      diagnostics.push({
        issue: `${overdueRoyalties.length} overdue royalty payments (₱${overdueRoyalties.reduce((s, r) => s + r.amount, 0).toLocaleString()})`,
        analysis: branchRoyaltyIssues[0]
          ? `${branchRoyaltyIssues[0].branch_name} has the highest overdue (₱${branchRoyaltyIssues[0].overdue_amount.toLocaleString()})`
          : "Multiple branches have overdue payments",
        severity: "high",
        action: "Send payment reminders and review branch cash flow",
      });
    }

    if (branchDeclines.length > 0) {
      diagnostics.push({
        issue: `${branchDeclines.length} branches with >10% revenue decline`,
        analysis: branchDeclines[0]
          ? `${branchDeclines[0].branch_name} dropped ${Math.abs(branchDeclines[0].change_percent).toFixed(1)}%`
          : "Multiple branches underperforming",
        severity: branchDeclines.length > 3 ? "high" : "medium",
        action: "Review branch operations and staffing levels",
      });
    }

    const productRevenue = periodTxns.reduce((sum, t) => {
      return sum + (t.products || []).reduce((s, p) => s + p.price * p.quantity, 0);
    }, 0);
    const totalRevenue = periodTxns.reduce((sum, t) => {
      let total = 0;
      for (const s of t.services || []) total += s.price * s.quantity;
      for (const p of t.products || []) total += p.price * p.quantity;
      return sum + total;
    }, 0);
    const productRatio = totalRevenue > 0 ? (productRevenue / totalRevenue) * 100 : 0;

    if (productRatio < 15) {
      diagnostics.push({
        issue: `Product sales only ${productRatio.toFixed(1)}% of total revenue`,
        analysis: "Industry average is 20-30%. Staff may not be upselling products.",
        severity: "medium",
        action: "Train staff on product recommendations and create bundle promotions",
      });
    }

    // SA Product Order diagnostics
    if (unpaidOrders.length > 0) {
      diagnostics.push({
        issue: `${unpaidOrders.length} unpaid product orders (₱${unpaidAmount.toLocaleString()})`,
        analysis: branchUnpaidOrders[0]
          ? `${branchUnpaidOrders[0].branch_name} has ${branchUnpaidOrders[0].unpaid_count} unpaid orders (₱${branchUnpaidOrders[0].unpaid_amount.toLocaleString()})`
          : "Multiple branches have unpaid product orders",
        severity: unpaidAmount > 50000 ? "high" : "medium",
        action: "Follow up on unpaid orders and enforce payment terms",
      });
    }

    if (fulfillmentRate < 80 && periodProductOrders.length > 5) {
      diagnostics.push({
        issue: `Low order fulfillment rate: ${fulfillmentRate.toFixed(1)}%`,
        analysis: `Only ${fulfilledOrders.length} of ${periodProductOrders.length} orders fully received`,
        severity: fulfillmentRate < 50 ? "high" : "medium",
        action: "Review supply chain and improve order processing time",
      });
    }

    if (outOfStockProducts.length > 0) {
      diagnostics.push({
        issue: `${outOfStockProducts.length} products out of stock`,
        analysis: `Out of stock: ${outOfStockProducts.slice(0, 3).map(p => p.name).join(", ")}${outOfStockProducts.length > 3 ? "..." : ""}`,
        severity: "high",
        action: "Restock immediately to prevent branch order delays",
      });
    } else if (lowStockProducts.length > 3) {
      diagnostics.push({
        issue: `${lowStockProducts.length} products below minimum stock`,
        analysis: `Low stock: ${lowStockProducts.slice(0, 3).map(p => p.name).join(", ")}${lowStockProducts.length > 3 ? "..." : ""}`,
        severity: "medium",
        action: "Plan restock for low inventory items",
      });
    }

    return {
      royalty_analysis: {
        overdue_count: overdueRoyalties.length,
        overdue_amount: overdueRoyalties.reduce((s, r) => s + r.amount, 0),
        branches_with_issues: branchRoyaltyIssues,
      },
      product_analysis: {
        top_products: topProducts,
        product_revenue_ratio: productRatio,
      },
      // SA Product Order Analysis
      sa_product_analysis: {
        top_products: topSAProducts,
        order_status_distribution: ordersByStatus,
        fulfillment_rate: fulfillmentRate,
        unpaid_orders: {
          count: unpaidOrders.length,
          amount: unpaidAmount,
          branches_with_unpaid: branchUnpaidOrders,
        },
        inventory_health: {
          active_products: activeProducts.length,
          low_stock: lowStockProducts.length,
          out_of_stock: outOfStockProducts.length,
          low_stock_items: lowStockProducts.slice(0, 5).map(p => ({ name: p.name, stock: p.stock, minStock: p.minStock })),
        },
      },
      branch_performance: {
        declining_branches: branchDeclines,
      },
      wallet_analysis: {
        topup_distribution: topUpByAmount,
        total_topups: topUps.length,
      },
      diagnostics,
    };
  },
});

// ============================================================================
// SA-3. PREDICTIVE ANALYTICS (Forecasting)
// ============================================================================
export const getSAPredictiveAnalytics = query({
  args: {
    forecast_months: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const forecastMonths = args.forecast_months || 3;
    const now = Date.now();

    // Get historical data (last 6 months)
    const sixMonthsAgo = now - 180 * 24 * 60 * 60 * 1000;

    const transactions = await ctx.db.query("transactions").collect();
    const recentTxns = transactions.filter(
      t => t.payment_status === "completed" && t.createdAt >= sixMonthsAgo
    );

    // Monthly revenue data
    const monthlyData: Record<string, { revenue: number; products: number; services: number; txnCount: number }> = {};
    for (const t of recentTxns) {
      const month = new Date(t.createdAt).toISOString().slice(0, 7); // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = { revenue: 0, products: 0, services: 0, txnCount: 0 };
      }
      for (const s of t.services || []) monthlyData[month].services += s.price * s.quantity;
      for (const p of t.products || []) monthlyData[month].products += p.price * p.quantity;
      monthlyData[month].revenue += monthlyData[month].services + monthlyData[month].products;
      monthlyData[month].txnCount += 1;
    }

    const months = Object.keys(monthlyData).sort();
    const revenues = months.map(m => monthlyData[m].revenue);

    // Simple linear regression for forecasting
    const n = revenues.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += revenues[i];
      sumXY += i * revenues[i];
      sumX2 += i * i;
    }
    const slope = n > 1 ? (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) : 0;
    const intercept = n > 0 ? (sumY - slope * sumX) / n : 0;

    // Generate forecasts
    const forecasts = [];
    for (let i = 1; i <= forecastMonths; i++) {
      const futureDate = new Date(now);
      futureDate.setMonth(futureDate.getMonth() + i);
      const predicted = Math.max(0, intercept + slope * (n + i - 1));
      forecasts.push({
        month: futureDate.toISOString().slice(0, 7),
        month_name: futureDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        predicted_revenue: Math.round(predicted),
        confidence: n >= 4 ? "high" : n >= 2 ? "medium" : "low",
      });
    }

    // Royalty forecast
    const royaltyPayments = await ctx.db.query("royaltyPayments").collect();
    const recentRoyalties = royaltyPayments.filter(r => r.createdAt >= sixMonthsAgo);
    const monthlyRoyalties: Record<string, number> = {};
    for (const r of recentRoyalties) {
      const month = new Date(r.createdAt).toISOString().slice(0, 7);
      monthlyRoyalties[month] = (monthlyRoyalties[month] || 0) + r.amount;
    }
    const avgMonthlyRoyalty = Object.values(monthlyRoyalties).length > 0
      ? Object.values(monthlyRoyalties).reduce((a, b) => a + b, 0) / Object.values(monthlyRoyalties).length
      : 0;

    // Branch growth forecast
    const branches = await ctx.db.query("branches").collect();
    const branchesByMonth: Record<string, number> = {};
    for (const b of branches) {
      const month = new Date(b.createdAt).toISOString().slice(0, 7);
      branchesByMonth[month] = (branchesByMonth[month] || 0) + 1;
    }
    const recentBranchGrowth = Object.entries(branchesByMonth)
      .filter(([month]) => new Date(month).getTime() >= sixMonthsAgo)
      .map(([_, count]) => count);
    const avgBranchGrowth = recentBranchGrowth.length > 0
      ? recentBranchGrowth.reduce((a, b) => a + b, 0) / recentBranchGrowth.length
      : 0;

    // Wallet top-up forecast
    const walletTxns = await ctx.db.query("wallet_transactions").collect();
    const topUps = walletTxns.filter(w => w.type === "topup" && w.createdAt >= sixMonthsAgo);
    const monthlyTopUps: Record<string, number> = {};
    for (const t of topUps) {
      const month = new Date(t.createdAt).toISOString().slice(0, 7);
      monthlyTopUps[month] = (monthlyTopUps[month] || 0) + t.amount;
    }
    const avgMonthlyTopUp = Object.values(monthlyTopUps).length > 0
      ? Object.values(monthlyTopUps).reduce((a, b) => a + b, 0) / Object.values(monthlyTopUps).length
      : 0;

    // SA Product Order forecast (central warehouse to branches)
    const productOrders = await ctx.db.query("productOrders").collect();
    const recentProductOrders = productOrders.filter(o => o.created_at >= sixMonthsAgo);
    const monthlyProductOrders: Record<string, { revenue: number; count: number }> = {};
    for (const o of recentProductOrders) {
      const month = new Date(o.created_at).toISOString().slice(0, 7);
      if (!monthlyProductOrders[month]) {
        monthlyProductOrders[month] = { revenue: 0, count: 0 };
      }
      monthlyProductOrders[month].revenue += o.total_amount;
      monthlyProductOrders[month].count += 1;
    }

    const productOrderMonths = Object.keys(monthlyProductOrders).sort();
    const productOrderRevenues = productOrderMonths.map(m => monthlyProductOrders[m].revenue);

    // Linear regression for product orders
    const poN = productOrderRevenues.length;
    let poSumX = 0, poSumY = 0, poSumXY = 0, poSumX2 = 0;
    for (let i = 0; i < poN; i++) {
      poSumX += i;
      poSumY += productOrderRevenues[i];
      poSumXY += i * productOrderRevenues[i];
      poSumX2 += i * i;
    }
    const poSlope = poN > 1 ? (poN * poSumXY - poSumX * poSumY) / (poN * poSumX2 - poSumX * poSumX) : 0;
    const poIntercept = poN > 0 ? (poSumY - poSlope * poSumX) / poN : 0;

    const avgMonthlyProductOrder = Object.values(monthlyProductOrders).length > 0
      ? Object.values(monthlyProductOrders).reduce((a, b) => a + b.revenue, 0) / Object.values(monthlyProductOrders).length
      : 0;

    const avgMonthlyOrderCount = Object.values(monthlyProductOrders).length > 0
      ? Object.values(monthlyProductOrders).reduce((a, b) => a + b.count, 0) / Object.values(monthlyProductOrders).length
      : 0;

    // Product order trend
    const poTrend = poSlope > 0 ? "upward" : poSlope < 0 ? "downward" : "stable";

    // Trend analysis
    const trend = slope > 0 ? "upward" : slope < 0 ? "downward" : "stable";
    const trendPercent = revenues.length > 1 && revenues[0] > 0
      ? ((revenues[revenues.length - 1] - revenues[0]) / revenues[0]) * 100
      : 0;

    // Generate product order forecasts
    const productOrderForecasts = [];
    for (let i = 1; i <= forecastMonths; i++) {
      const futureDate = new Date(now);
      futureDate.setMonth(futureDate.getMonth() + i);
      const predicted = Math.max(0, poIntercept + poSlope * (poN + i - 1));
      productOrderForecasts.push({
        month: futureDate.toISOString().slice(0, 7),
        month_name: futureDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        predicted_revenue: Math.round(predicted),
        confidence: poN >= 4 ? "high" : poN >= 2 ? "medium" : "low",
      });
    }

    return {
      revenue_forecast: forecasts,
      royalty_forecast: {
        expected_monthly: Math.round(avgMonthlyRoyalty),
        next_quarter: Math.round(avgMonthlyRoyalty * 3),
      },
      branch_growth_forecast: {
        avg_monthly_additions: avgBranchGrowth.toFixed(1),
        expected_next_quarter: Math.round(avgBranchGrowth * 3),
        current_total: branches.length,
      },
      wallet_forecast: {
        expected_monthly_topups: Math.round(avgMonthlyTopUp),
        next_quarter: Math.round(avgMonthlyTopUp * 3),
      },
      // SA Product Order Forecast
      product_order_forecast: {
        forecast: productOrderForecasts,
        expected_monthly_revenue: Math.round(avgMonthlyProductOrder),
        expected_monthly_orders: Math.round(avgMonthlyOrderCount),
        next_quarter_revenue: Math.round(avgMonthlyProductOrder * 3),
        trend: poTrend,
        data_points: poN,
      },
      trend_analysis: {
        overall_trend: trend,
        trend_percent: trendPercent.toFixed(1),
        data_points: n,
      },
      historical_data: months.map(m => ({
        month: m,
        revenue: monthlyData[m].revenue,
        services: monthlyData[m].services,
        products: monthlyData[m].products,
      })),
      // SA Product Order historical data
      product_order_historical: productOrderMonths.map(m => ({
        month: m,
        revenue: monthlyProductOrders[m].revenue,
        order_count: monthlyProductOrders[m].count,
      })),
    };
  },
});

// ============================================================================
// SA-4. PRESCRIPTIVE ANALYTICS (Strategic Recommendations)
// ============================================================================
export const getSAPrescriptiveAnalytics = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000;

    // Fetch data
    const branches = await ctx.db.query("branches").collect();
    const activeBranches = branches.filter(b => b.is_active);

    const transactions = await ctx.db.query("transactions").collect();
    const recentTxns = transactions.filter(t => t.payment_status === "completed" && t.createdAt >= thirtyDaysAgo);
    const prevTxns = transactions.filter(t => t.payment_status === "completed" && t.createdAt >= sixtyDaysAgo && t.createdAt < thirtyDaysAgo);

    const royaltyPayments = await ctx.db.query("royaltyPayments").collect();
    const walletTxns = await ctx.db.query("wallet_transactions").collect();

    // SA Product Orders and Catalog
    const productOrders = await ctx.db.query("productOrders").collect();
    const recentProductOrders = productOrders.filter(o => o.created_at >= thirtyDaysAgo);
    const productCatalog = await ctx.db.query("productCatalog").collect();
    const activeProducts = productCatalog.filter(p => p.is_active);

    // Strategic recommendations
    const strategies: Array<{
      category: string;
      title: string;
      description: string;
      impact: string;
      priority: "high" | "medium" | "low";
      action_items: string[];
    }> = [];

    // 1. Branch Expansion Strategy
    const branchGrowth = branches.filter(b => b.createdAt >= thirtyDaysAgo).length;
    const avgBranchRevenue = activeBranches.length > 0
      ? recentTxns.reduce((sum, t) => {
          let total = 0;
          for (const s of t.services || []) total += s.price * s.quantity;
          for (const p of t.products || []) total += p.price * p.quantity;
          return sum + total;
        }, 0) / activeBranches.length
      : 0;

    if (avgBranchRevenue > 100000 && branchGrowth === 0) {
      strategies.push({
        category: "expansion",
        title: "Branch Expansion Opportunity",
        description: "Strong per-branch revenue suggests market demand for more locations.",
        impact: `₱${(avgBranchRevenue * 0.8).toLocaleString()} potential monthly revenue per new branch`,
        priority: "high",
        action_items: [
          "Identify high-potential areas using customer location data",
          "Prepare franchise offering package",
          "Set target: 2-3 new branches next quarter",
        ],
      });
    }

    // 2. Royalty Collection Strategy
    const overdueRoyalties = royaltyPayments.filter(r => r.status === "overdue");
    const overdueAmount = overdueRoyalties.reduce((sum, r) => sum + r.amount, 0);

    if (overdueAmount > 10000) {
      strategies.push({
        category: "finance",
        title: "Royalty Collection Improvement",
        description: `₱${overdueAmount.toLocaleString()} in overdue royalties needs attention.`,
        impact: "Improve cash flow and maintain branch accountability",
        priority: "high",
        action_items: [
          "Implement automated payment reminders (7, 3, 1 days before due)",
          "Offer early payment discount (2% for paying 5 days early)",
          "Schedule calls with branches having 2+ late payments",
        ],
      });
    }

    // 3. Wallet Adoption Strategy
    const walletTopUps = walletTxns.filter(w => w.type === "topup" && w.createdAt >= thirtyDaysAgo);
    const walletPayments = recentTxns.filter(t => t.payment_method === "wallet");
    const walletAdoption = recentTxns.length > 0 ? (walletPayments.length / recentTxns.length) * 100 : 0;

    if (walletAdoption < 20) {
      strategies.push({
        category: "digital",
        title: "Increase Wallet Adoption",
        description: `Only ${walletAdoption.toFixed(1)}% of transactions use wallet. Target: 30%+`,
        impact: "Reduce cash handling, improve customer loyalty, and prepaid revenue",
        priority: "medium",
        action_items: [
          "Launch \"Top-up ₱500, Get ₱50 bonus\" promotion",
          "Train staff to promote wallet during checkout",
          "Add wallet balance display on customer receipts",
          "Create referral bonus for wallet sign-ups",
        ],
      });
    }

    // 4. Product Sales Strategy
    const productRevenue = recentTxns.reduce((sum, t) => {
      return sum + (t.products || []).reduce((s, p) => s + p.price * p.quantity, 0);
    }, 0);
    const totalRevenue = recentTxns.reduce((sum, t) => {
      let total = 0;
      for (const s of t.services || []) total += s.price * s.quantity;
      for (const p of t.products || []) total += p.price * p.quantity;
      return sum + total;
    }, 0);
    const productRatio = totalRevenue > 0 ? (productRevenue / totalRevenue) * 100 : 0;

    if (productRatio < 20) {
      strategies.push({
        category: "revenue",
        title: "Boost Product Sales System-Wide",
        description: `Products are ${productRatio.toFixed(1)}% of revenue. Industry benchmark: 25-30%`,
        impact: `Potential ₱${Math.round(totalRevenue * 0.1).toLocaleString()} additional monthly revenue`,
        priority: "medium",
        action_items: [
          "Create \"Service + Product\" bundle discounts",
          "Set product sales targets for each branch (10% of service revenue)",
          "Implement product commission for staff (5% of product sales)",
          "Run monthly \"Product of the Month\" promotion",
        ],
      });
    }

    // 5. SA Product Order Strategy (Central Warehouse to Branches)
    const completedProductOrders = recentProductOrders.filter(o => o.status === "received" || o.status === "shipped" || o.status === "approved");
    const unpaidProductOrders = completedProductOrders.filter(o => !o.is_paid);
    const unpaidProductAmount = unpaidProductOrders.reduce((sum, o) => sum + o.total_amount, 0);
    const lowStockProducts = activeProducts.filter(p => p.stock <= p.minStock);
    const outOfStockProducts = activeProducts.filter(p => p.stock === 0);

    // Unpaid product orders strategy
    if (unpaidProductAmount > 20000) {
      strategies.push({
        category: "finance",
        title: "Collect Unpaid Product Orders",
        description: `₱${unpaidProductAmount.toLocaleString()} in unpaid product orders from ${unpaidProductOrders.length} orders.`,
        impact: "Improve cash flow and reduce credit exposure",
        priority: "high",
        action_items: [
          "Review payment terms with branches having multiple unpaid orders",
          "Implement payment-on-delivery policy for new orders",
          "Send payment reminders to branches with outstanding balances",
          "Consider limiting new orders until payment received",
        ],
      });
    }

    // Inventory management strategy
    if (outOfStockProducts.length > 0) {
      strategies.push({
        category: "inventory",
        title: "Restock Out-of-Stock Products",
        description: `${outOfStockProducts.length} products out of stock. Branches cannot order these items.`,
        impact: "Prevent lost sales and branch dissatisfaction",
        priority: "high",
        action_items: [
          `Restock immediately: ${outOfStockProducts.slice(0, 3).map(p => p.name).join(", ")}`,
          "Review supplier lead times and reorder points",
          "Set up automatic low-stock alerts",
          "Negotiate bulk discounts for high-volume products",
        ],
      });
    } else if (lowStockProducts.length > 3) {
      strategies.push({
        category: "inventory",
        title: "Proactive Inventory Restocking",
        description: `${lowStockProducts.length} products below minimum stock level.`,
        impact: "Avoid stockouts and maintain branch supply",
        priority: "medium",
        action_items: [
          `Plan restock: ${lowStockProducts.slice(0, 3).map(p => p.name).join(", ")}`,
          "Review demand patterns and adjust minStock levels",
          "Consider seasonal inventory adjustments",
        ],
      });
    }

    // Product catalog optimization
    const totalProductOrderRevenue = completedProductOrders.reduce((sum, o) => sum + o.total_amount, 0);
    const avgOrderValue = completedProductOrders.length > 0 ? totalProductOrderRevenue / completedProductOrders.length : 0;

    if (avgOrderValue < 5000 && completedProductOrders.length > 5) {
      strategies.push({
        category: "revenue",
        title: "Increase Branch Order Values",
        description: `Average product order is only ₱${avgOrderValue.toLocaleString()}. Encourage larger orders.`,
        impact: "Reduce shipping costs per peso and increase revenue",
        priority: "medium",
        action_items: [
          "Offer tiered discounts (5% off orders > ₱10,000)",
          "Bundle related products for combo pricing",
          "Minimum order value for free delivery",
          "Monthly specials on slow-moving inventory",
        ],
      });
    }

    // 6. Underperforming Branch Strategy
    const branchPerf = activeBranches.map(branch => {
      const currentRev = recentTxns.filter(t => t.branch_id === branch._id).reduce((sum, t) => {
        let total = 0;
        for (const s of t.services || []) total += s.price * s.quantity;
        for (const p of t.products || []) total += p.price * p.quantity;
        return sum + total;
      }, 0);
      const prevRev = prevTxns.filter(t => t.branch_id === branch._id).reduce((sum, t) => {
        let total = 0;
        for (const s of t.services || []) total += s.price * s.quantity;
        for (const p of t.products || []) total += p.price * p.quantity;
        return sum + total;
      }, 0);
      return { branch, currentRev, prevRev, change: prevRev > 0 ? ((currentRev - prevRev) / prevRev) * 100 : 0 };
    });

    const underperforming = branchPerf.filter(b => b.change < -15);
    if (underperforming.length > 0) {
      strategies.push({
        category: "operations",
        title: "Address Underperforming Branches",
        description: `${underperforming.length} branch(es) with >15% revenue decline need intervention.`,
        impact: "Prevent further losses and identify systemic issues",
        priority: "high",
        action_items: underperforming.slice(0, 3).map(b =>
          `Review ${b.branch.name}: ${b.change.toFixed(1)}% decline (₱${b.currentRev.toLocaleString()} current)`
        ).concat([
          "Schedule operational audits",
          "Review staffing levels and barber performance",
          "Analyze local competition and adjust pricing",
        ]),
      });
    }

    // 6. Marketing Campaign Suggestions
    const dayOfWeek = new Date().getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    strategies.push({
      category: "marketing",
      title: isWeekend ? "Weekend Rush Optimization" : "Midweek Traffic Boost",
      description: isWeekend
        ? "Maximize revenue during peak weekend hours"
        : "Drive traffic during slower weekday periods",
      impact: "+15-25% transaction volume",
      priority: "medium",
      action_items: isWeekend ? [
        "Ensure full staffing on weekends",
        "No discounts during 10AM-6PM peak",
        "Push premium services (hot towel, facial)",
      ] : [
        "Run \"Tuesday-Wednesday 15% off\" campaign",
        "Send SMS blast to at-risk customers",
        "Offer booking incentive: \"Book before noon, save 10%\"",
      ],
    });

    // Sort by priority
    strategies.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.priority] - order[b.priority];
    });

    // Summary stats
    const summary = {
      total_strategies: strategies.length,
      high_priority: strategies.filter(s => s.priority === "high").length,
      categories: [...new Set(strategies.map(s => s.category))],
      quick_wins: strategies.filter(s => s.priority === "medium").slice(0, 2),
    };

    return {
      strategies,
      summary,
      kpis: {
        wallet_adoption: `${walletAdoption.toFixed(1)}%`,
        product_ratio: `${productRatio.toFixed(1)}%`,
        avg_branch_revenue: `₱${Math.round(avgBranchRevenue).toLocaleString()}`,
        overdue_royalties: `₱${overdueAmount.toLocaleString()}`,
        underperforming_branches: underperforming.length,
        // SA Product Order KPIs
        sa_product_orders: {
          total_orders: recentProductOrders.length,
          total_revenue: `₱${totalProductOrderRevenue.toLocaleString()}`,
          unpaid_amount: `₱${unpaidProductAmount.toLocaleString()}`,
          avg_order_value: `₱${Math.round(avgOrderValue).toLocaleString()}`,
          out_of_stock: outOfStockProducts.length,
          low_stock: lowStockProducts.length,
        },
      },
    };
  },
});

export const getMarketingStrategies = query({
  args: {
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000;
    const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;

    // Fetch all necessary data
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    const products = await ctx.db
      .query("products")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    const completedTxns = transactions.filter((t) => t.payment_status === "completed");
    const recentTxns = completedTxns.filter((t) => t.createdAt >= thirtyDaysAgo);
    const prevTxns = completedTxns.filter((t) => t.createdAt >= sixtyDaysAgo && t.createdAt < thirtyDaysAgo);

    // ========================================
    // 1. PROMOTIONAL CAMPAIGN SUGGESTIONS
    // ========================================
    const promotions: Array<{
      type: string;
      title: string;
      description: string;
      target_audience: string;
      suggested_discount: string;
      best_timing: string;
      expected_impact: string;
      priority: "high" | "medium" | "low";
    }> = [];

    // Analyze service performance
    const serviceStats: Record<string, { name: string; revenue: number; count: number; avgPrice: number }> = {};
    for (const t of recentTxns) {
      for (const s of t.services || []) {
        if (!serviceStats[s.service_id]) {
          serviceStats[s.service_id] = { name: s.service_name, revenue: 0, count: 0, avgPrice: 0 };
        }
        serviceStats[s.service_id].revenue += s.price * s.quantity;
        serviceStats[s.service_id].count += s.quantity;
      }
    }

    const serviceList = Object.values(serviceStats);
    serviceList.forEach(s => s.avgPrice = s.count > 0 ? s.revenue / s.count : 0);
    const topServices = serviceList.sort((a, b) => b.revenue - a.revenue);
    const lowServices = serviceList.filter(s => s.count < 5).sort((a, b) => a.count - b.count);

    // Analyze product performance
    const productStats: Record<string, { name: string; revenue: number; count: number }> = {};
    for (const t of recentTxns) {
      for (const p of t.products || []) {
        if (!productStats[p.product_id]) {
          productStats[p.product_id] = { name: p.product_name, revenue: 0, count: 0 };
        }
        productStats[p.product_id].revenue += p.price * p.quantity;
        productStats[p.product_id].count += p.quantity;
      }
    }
    const productList = Object.values(productStats);
    const topProducts = productList.sort((a, b) => b.revenue - a.revenue);

    // Revenue trend analysis
    const currentRevenue = recentTxns.reduce((sum, t) => {
      let total = 0;
      for (const s of t.services || []) total += s.price * s.quantity;
      for (const p of t.products || []) total += p.price * p.quantity;
      return sum + total;
    }, 0);

    const prevRevenue = prevTxns.reduce((sum, t) => {
      let total = 0;
      for (const s of t.services || []) total += s.price * s.quantity;
      for (const p of t.products || []) total += p.price * p.quantity;
      return sum + total;
    }, 0);

    const revenueGrowth = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    // Generate promotional campaigns based on data
    if (revenueGrowth < -10) {
      promotions.push({
        type: "flash_sale",
        title: "Revenue Recovery Flash Sale",
        description: "Run a limited-time discount to boost declining revenue. Create urgency with countdown timers.",
        target_audience: "All customers",
        suggested_discount: "20-30% off selected services",
        best_timing: "This weekend",
        expected_impact: "15-25% revenue increase",
        priority: "high",
      });
    }

    if (lowServices.length > 0) {
      promotions.push({
        type: "bundle",
        title: `Bundle Promotion: ${lowServices[0]?.name || 'Low-performing service'}`,
        description: `Pair underperforming services with popular ones to increase exposure. "${lowServices[0]?.name}" has only ${lowServices[0]?.count} bookings.`,
        target_audience: "Existing customers",
        suggested_discount: "15% off when bundled with top service",
        best_timing: "Mid-week (Tue-Thu)",
        expected_impact: "Increase service bookings by 30%",
        priority: "medium",
      });
    }

    if (topServices[0]) {
      promotions.push({
        type: "loyalty",
        title: `VIP Reward: ${topServices[0].name} Loyalty`,
        description: `Reward frequent customers of your top service. After 5 visits, offer a free upgrade or discount.`,
        target_audience: "Repeat customers",
        suggested_discount: "6th service 50% off",
        best_timing: "Ongoing program",
        expected_impact: "Increase retention by 40%",
        priority: "high",
      });
    }

    // Seasonal/timing based
    const dayOfWeek = new Date().getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 3) { // Mon-Wed
      promotions.push({
        type: "slow_day",
        title: "Midweek Special",
        description: "Boost slow midweek traffic with special offers valid only Tuesday-Wednesday.",
        target_audience: "Price-conscious customers",
        suggested_discount: "15% off all services",
        best_timing: "Tuesday-Wednesday only",
        expected_impact: "Fill 20% more slots",
        priority: "medium",
      });
    }

    // Product upsell campaign
    if (topProducts[0] && productList.length > 0) {
      promotions.push({
        type: "upsell",
        title: "Service + Product Bundle",
        description: `Recommend ${topProducts[0].name} during service checkout. Train staff to mention product benefits.`,
        target_audience: "Service customers",
        suggested_discount: "10% off product with any service",
        best_timing: "At checkout",
        expected_impact: "Increase product revenue by 25%",
        priority: "medium",
      });
    }

    // ========================================
    // 2. CUSTOMER TARGETING STRATEGIES
    // ========================================
    const targetingStrategies: Array<{
      segment: string;
      strategy: string;
      action: string;
      message_template: string;
      channel: string;
      urgency: "immediate" | "this_week" | "this_month";
    }> = [];

    // Analyze customer behavior
    const customerData: Record<string, {
      visits: number;
      totalSpent: number;
      lastVisit: number;
      avgTicket: number;
    }> = {};

    for (const t of completedTxns) {
      if (!t.customer) continue;
      const custId = t.customer as string;
      let txnTotal = 0;
      for (const s of t.services || []) txnTotal += s.price * s.quantity;
      for (const p of t.products || []) txnTotal += p.price * p.quantity;

      if (!customerData[custId]) {
        customerData[custId] = { visits: 0, totalSpent: 0, lastVisit: t.createdAt, avgTicket: 0 };
      }
      customerData[custId].visits += 1;
      customerData[custId].totalSpent += txnTotal;
      customerData[custId].lastVisit = Math.max(customerData[custId].lastVisit, t.createdAt);
    }

    const customers = Object.entries(customerData);
    const atRiskCustomers = customers.filter(([_, d]) => d.lastVisit < thirtyDaysAgo && d.lastVisit >= ninetyDaysAgo);
    const lostCustomers = customers.filter(([_, d]) => d.lastVisit < ninetyDaysAgo);
    const vipCustomers = customers.filter(([_, d]) => d.visits >= 4 && d.totalSpent >= 5000);
    const newCustomers = customers.filter(([_, d]) => d.visits === 1 && d.lastVisit >= thirtyDaysAgo);

    if (atRiskCustomers.length > 0) {
      targetingStrategies.push({
        segment: `At-Risk Customers (${atRiskCustomers.length})`,
        strategy: "Win-Back Campaign",
        action: "Send personalized re-engagement offer",
        message_template: "We miss you! 🥺 It's been a while since your last visit. Here's 20% off your next service - valid this week only!",
        channel: "SMS + Email",
        urgency: "immediate",
      });
    }

    if (lostCustomers.length > 0) {
      targetingStrategies.push({
        segment: `Lost Customers (${lostCustomers.length})`,
        strategy: "Reactivation Campaign",
        action: "Aggressive win-back with high-value offer",
        message_template: "We want you back! 🎁 Enjoy 30% off + FREE product sample on your return visit. Limited slots available!",
        channel: "SMS + Email + Call",
        urgency: "this_week",
      });
    }

    if (vipCustomers.length > 0) {
      targetingStrategies.push({
        segment: `VIP Customers (${vipCustomers.length})`,
        strategy: "VIP Appreciation",
        action: "Exclusive perks and early access",
        message_template: "You're a VIP! 👑 As our valued customer, enjoy priority booking and exclusive 15% off on new services.",
        channel: "Personalized SMS",
        urgency: "this_month",
      });
    }

    if (newCustomers.length > 0) {
      targetingStrategies.push({
        segment: `New Customers (${newCustomers.length})`,
        strategy: "Second Visit Incentive",
        action: "Convert one-time visitors to regulars",
        message_template: "Thanks for visiting! 🌟 Book your 2nd appointment this month and get 15% off. We'd love to see you again!",
        channel: "SMS + App Push",
        urgency: "immediate",
      });
    }

    // ========================================
    // 3. PRICING OPTIMIZATION SUGGESTIONS
    // ========================================
    const pricingInsights: Array<{
      type: string;
      suggestion: string;
      rationale: string;
      potential_impact: string;
    }> = [];

    // Analyze average ticket
    const avgTicket = recentTxns.length > 0 ? currentRevenue / recentTxns.length : 0;
    const prevAvgTicket = prevTxns.length > 0 ? prevRevenue / prevTxns.length : 0;
    const ticketGrowth = prevAvgTicket > 0 ? ((avgTicket - prevAvgTicket) / prevAvgTicket) * 100 : 0;

    if (ticketGrowth < -5) {
      pricingInsights.push({
        type: "upsell_training",
        suggestion: "Train staff on upselling techniques",
        rationale: `Average ticket dropped ${Math.abs(ticketGrowth).toFixed(1)}%. Staff should recommend add-ons and premium options.`,
        potential_impact: "+₱50-100 per transaction",
      });
    }

    // Product pricing analysis
    const productRevRatio = productList.reduce((sum, p) => sum + p.revenue, 0) / (currentRevenue || 1);
    if (productRevRatio < 0.15) {
      pricingInsights.push({
        type: "product_promotion",
        suggestion: "Increase product visibility and staff incentives",
        rationale: `Products only contribute ${(productRevRatio * 100).toFixed(1)}% of revenue. Industry average is 20-30%.`,
        potential_impact: "+15-20% product sales",
      });
    }

    // Service pricing
    if (topServices[0] && topServices[0].count > 20) {
      pricingInsights.push({
        type: "premium_pricing",
        suggestion: `Consider premium pricing for "${topServices[0].name}"`,
        rationale: `High demand (${topServices[0].count} bookings) suggests room for 5-10% price increase without losing customers.`,
        potential_impact: `+₱${Math.round(topServices[0].avgPrice * 0.07 * topServices[0].count)} monthly`,
      });
    }

    // ========================================
    // 4. OPTIMAL TIMING RECOMMENDATIONS
    // ========================================
    const timingRecommendations: Array<{
      insight: string;
      recommendation: string;
      action: string;
    }> = [];

    // Analyze booking patterns by day
    const dayBookings: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    for (const b of bookings.filter(b => b.createdAt >= thirtyDaysAgo)) {
      const day = new Date(b.createdAt).getDay();
      dayBookings[day] += 1;
    }

    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const sortedDays = Object.entries(dayBookings).sort((a, b) => Number(b[1]) - Number(a[1]));
    const busiestDay = dayNames[Number(sortedDays[0]?.[0] || 0)];
    const slowestDay = dayNames[Number(sortedDays[sortedDays.length - 1]?.[0] || 0)];

    timingRecommendations.push({
      insight: `${busiestDay} is your busiest day`,
      recommendation: "Maximize revenue on peak days",
      action: `Schedule your best staff on ${busiestDay}. Consider premium pricing or no discounts on this day.`,
    });

    timingRecommendations.push({
      insight: `${slowestDay} has lowest traffic`,
      recommendation: "Run promotions on slow days",
      action: `Offer "${slowestDay} Special" discounts to fill empty slots. Target price-conscious customers.`,
    });

    // Analyze booking patterns by hour
    const hourBookings: Record<number, number> = {};
    for (const b of bookings.filter(b => b.createdAt >= thirtyDaysAgo && b.time)) {
      const hour = parseInt(b.time.split(':')[0] || '10');
      hourBookings[hour] = (hourBookings[hour] || 0) + 1;
    }

    const sortedHours = Object.entries(hourBookings).sort((a, b) => Number(b[1]) - Number(a[1]));
    if (sortedHours.length > 0) {
      const peakHour = Number(sortedHours[0][0]);
      const slowHour = Number(sortedHours[sortedHours.length - 1]?.[0] || peakHour);

      timingRecommendations.push({
        insight: `Peak booking hour: ${peakHour}:00`,
        recommendation: "Send promotional SMS before peak hours",
        action: `Schedule marketing messages at ${peakHour - 2}:00 to capture customers planning their visit.`,
      });

      if (slowHour !== peakHour) {
        timingRecommendations.push({
          insight: `Low traffic hour: ${slowHour}:00`,
          recommendation: "Create early bird/late deals",
          action: `Offer 10% off for appointments at ${slowHour}:00 to improve utilization.`,
        });
      }
    }

    // ========================================
    // 5. CROSS-SELL & UPSELL MATRIX
    // ========================================
    const crossSellMatrix: Array<{
      if_customer_buys: string;
      recommend: string;
      reason: string;
      success_rate: string;
    }> = [];

    // Analyze what products are commonly bought together
    const servicePairings: Record<string, Record<string, number>> = {};
    for (const t of recentTxns) {
      const services = t.services || [];
      const prods = t.products || [];

      for (const s of services) {
        if (!servicePairings[s.service_name]) servicePairings[s.service_name] = {};
        for (const p of prods) {
          servicePairings[s.service_name][p.product_name] = (servicePairings[s.service_name][p.product_name] || 0) + 1;
        }
      }
    }

    // Generate cross-sell recommendations
    for (const [service, products] of Object.entries(servicePairings)) {
      const topPairing = Object.entries(products).sort((a, b) => b[1] - a[1])[0];
      if (topPairing && topPairing[1] >= 3) {
        crossSellMatrix.push({
          if_customer_buys: service,
          recommend: topPairing[0],
          reason: `${topPairing[1]} customers bought this combo in the last 30 days`,
          success_rate: `${Math.min(95, 50 + topPairing[1] * 5)}% likely to accept`,
        });
      }
    }

    // Default recommendations if no data
    if (crossSellMatrix.length === 0 && topServices[0] && topProducts[0]) {
      crossSellMatrix.push({
        if_customer_buys: topServices[0].name,
        recommend: topProducts[0].name,
        reason: "Top service + top product pairing",
        success_rate: "Train staff to mention during checkout",
      });
    }

    return {
      promotions: promotions.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }),
      targeting_strategies: targetingStrategies,
      pricing_insights: pricingInsights,
      timing_recommendations: timingRecommendations,
      cross_sell_matrix: crossSellMatrix,
      summary: {
        total_campaigns: promotions.length,
        high_priority: promotions.filter(p => p.priority === "high").length,
        customers_to_target: atRiskCustomers.length + lostCustomers.length + newCustomers.length,
        revenue_trend: revenueGrowth,
        avg_ticket: avgTicket,
      },
    };
  },
});
