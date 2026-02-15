import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";

// ============================================================================
// P&L (Profit & Loss) ACCOUNTING SERVICE
// ============================================================================
// Provides financial reporting queries for Branch Admins
// Data sources: transactions, payroll_records, products
// ============================================================================

// Get P&L Summary for a branch within a date range
export const getPLSummary = query({
  args: {
    branch_id: v.id("branches"),
    start_date: v.number(), // Unix timestamp
    end_date: v.number(), // Unix timestamp
  },
  handler: async (ctx, args) => {
    // ========================================
    // REVENUE - From completed transactions
    // ========================================
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    // Filter by date range and completed status
    const completedTransactions = transactions.filter(
      (t) =>
        t.payment_status === "completed" &&
        t.createdAt >= args.start_date &&
        t.createdAt <= args.end_date
    );

    // Calculate revenue breakdown
    let serviceRevenue = 0;
    let productRevenue = 0;
    let bookingFees = 0;
    let lateFees = 0;
    let discounts = 0;
    let taxes = 0;

    for (const t of completedTransactions) {
      // Service revenue
      for (const service of t.services || []) {
        serviceRevenue += service.price * service.quantity;
      }

      // Product revenue
      for (const product of t.products || []) {
        productRevenue += product.price * product.quantity;
      }

      // Fees
      bookingFees += t.booking_fee || 0;
      lateFees += t.late_fee || 0;

      // Discounts and taxes
      discounts += t.discount_amount || 0;
      taxes += t.tax_amount || 0;
    }

    const grossRevenue = serviceRevenue + productRevenue + bookingFees + lateFees;
    const netRevenue = grossRevenue - discounts;

    // ========================================
    // COST OF GOODS SOLD (COGS)
    // ========================================
    // Calculate cost of products sold
    let cogs = 0;
    for (const t of completedTransactions) {
      for (const product of t.products || []) {
        // Look up product cost
        const productDoc = await ctx.db.get(product.product_id);
        if (productDoc && productDoc.cost) {
          cogs += productDoc.cost * product.quantity;
        }
      }
    }

    const grossProfit = netRevenue - cogs;

    // ========================================
    // OPERATING EXPENSES - Payroll costs (with breakdown)
    // ========================================
    // Get paid payroll records for the period
    // NOTE: We check individual record status instead of period status because
    // marking records as "paid" doesn't automatically update the period status
    const payrollPeriods = await ctx.db
      .query("payroll_periods")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    // Filter periods that overlap with the date range (regardless of period status)
    const relevantPeriods = payrollPeriods.filter(
      (p) =>
        p.period_start <= args.end_date &&
        p.period_end >= args.start_date
    );

    let payrollExpense = 0;
    let salaryExpense = 0;
    let commissionExpense = 0;
    let bonusExpense = 0;
    let allowanceExpense = 0;
    let deductionsTotal = 0;
    let staffPayrollExpense = 0;
    let staffSalaryExpense = 0;

    for (const period of relevantPeriods) {
      // Only include records that have been marked as "paid"
      const records = await ctx.db
        .query("payroll_records")
        .withIndex("by_payroll_period", (q) =>
          q.eq("payroll_period_id", period._id)
        )
        .filter((q) => q.eq(q.field("status"), "paid"))
        .collect();

      for (const record of records) {
        payrollExpense += record.net_pay || 0;
        // NOTE: daily_pay is the TOTAL salary (max of daily rate vs commission per day)
        // It already includes the commission calculation, so we should NOT add gross_commission again
        //
        // Correct breakdown:
        // - Salary = daily_pay (this is the gross pay before deductions)
        // - The daily_pay is calculated as: sum of max(daily_commission, daily_rate) per day worked
        salaryExpense += record.daily_pay || 0;
        // gross_commission is informational only - shows what commission would have been
        // DO NOT add to gross payroll as it's already factored into daily_pay
        commissionExpense += record.gross_commission || 0; // For reference only
        // Product commission - also already included in daily_pay calculation
        bonusExpense += record.product_commission || 0; // For reference only
        // Fees - these ARE added on top if enabled in payroll settings
        allowanceExpense += (record.total_booking_fees || 0) + (record.total_late_fees || 0);
        // Deductions
        deductionsTotal += record.total_deductions || 0;
      }

      // Staff payroll records - also count as payroll expense
      const staffRecords = await ctx.db
        .query("staff_payroll_records")
        .withIndex("by_payroll_period", (q) =>
          q.eq("payroll_period_id", period._id)
        )
        .filter((q) => q.eq(q.field("status"), "paid"))
        .collect();

      for (const record of staffRecords) {
        staffPayrollExpense += record.net_pay || 0;
        staffSalaryExpense += record.daily_pay || 0;
        deductionsTotal += record.total_deductions || 0;
      }
    }

    // Combine barber + staff payroll
    payrollExpense += staffPayrollExpense;
    salaryExpense += staffSalaryExpense;

    // IMPORTANT: Gross Payroll = Salary (daily_pay) + Allowances (fees)
    // Commission and bonus are NOT added because they're already included in daily_pay
    const grossPayroll = salaryExpense + allowanceExpense;

    // ========================================
    // MANUAL EXPENSES - From expenses table
    // ========================================
    const allExpenses = await ctx.db
      .query("expenses")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    // Filter by date range
    const periodExpenses = allExpenses.filter(
      (e) => e.expense_date >= args.start_date && e.expense_date <= args.end_date
    );

    let fixedExpenses = 0;
    let operatingExpenses = 0;
    for (const expense of periodExpenses) {
      if (expense.expense_type === "fixed") {
        fixedExpenses += expense.amount;
      } else {
        operatingExpenses += expense.amount;
      }
    }

    const manualExpenses = fixedExpenses + operatingExpenses;
    const totalExpenses = cogs + payrollExpense + manualExpenses;
    const netIncome = netRevenue - totalExpenses;

    return {
      // Summary
      total_revenue: netRevenue,
      total_expenses: totalExpenses,
      net_income: netIncome,

      // Revenue breakdown
      revenue_breakdown: {
        services: serviceRevenue,
        products: productRevenue,
        booking_fees: bookingFees,
        late_fees: lateFees,
        gross_revenue: grossRevenue,
        discounts: discounts,
        taxes_collected: taxes,
        net_revenue: netRevenue,
      },

      // Expense breakdown
      expense_breakdown: {
        cost_of_goods_sold: cogs,
        payroll: payrollExpense,
        // Payroll breakdown (auto-calculated from payroll records)
        payroll_breakdown: {
          gross_payroll: grossPayroll,
          salary: salaryExpense,
          commission: commissionExpense,
          bonus: bonusExpense,
          allowance: allowanceExpense,
          deductions: deductionsTotal,
          net_pay: payrollExpense,
          // Staff payroll (separate from barber)
          staff_payroll: staffPayrollExpense,
          staff_salary: staffSalaryExpense,
        },
        fixed_expenses: fixedExpenses,
        operating_expenses: operatingExpenses,
        manual_expenses: manualExpenses,
        total: totalExpenses,
      },

      // Profit margins
      gross_profit: grossProfit,
      gross_margin: netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0,
      net_margin: netRevenue > 0 ? (netIncome / netRevenue) * 100 : 0,

      // Transaction count
      transaction_count: completedTransactions.length,

      // Period info
      period: {
        start: args.start_date,
        end: args.end_date,
      },
    };
  },
});

// Get income breakdown by category
export const getIncomeByCategory = query({
  args: {
    branch_id: v.id("branches"),
    start_date: v.number(),
    end_date: v.number(),
  },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    const completedTransactions = transactions.filter(
      (t) =>
        t.payment_status === "completed" &&
        t.createdAt >= args.start_date &&
        t.createdAt <= args.end_date
    );

    // Group by service category
    const serviceCategories: Record<string, number> = {};
    const productCategories: Record<string, number> = {};

    for (const t of completedTransactions) {
      // Services by category
      for (const service of t.services || []) {
        const serviceDoc = await ctx.db.get(service.service_id);
        const category = serviceDoc?.category || "Uncategorized";
        serviceCategories[category] =
          (serviceCategories[category] || 0) + service.price * service.quantity;
      }

      // Products by category
      for (const product of t.products || []) {
        const productDoc = await ctx.db.get(product.product_id);
        const category = productDoc?.category || "uncategorized";
        productCategories[category] =
          (productCategories[category] || 0) + product.price * product.quantity;
      }
    }

    // Convert to arrays for easier consumption
    const services = Object.entries(serviceCategories).map(([category, amount]) => ({
      category,
      amount,
    }));

    const products = Object.entries(productCategories).map(([category, amount]) => ({
      category,
      amount,
    }));

    const totalServices = services.reduce((sum, s) => sum + s.amount, 0);
    const totalProducts = products.reduce((sum, p) => sum + p.amount, 0);

    return {
      services: {
        categories: services.sort((a, b) => b.amount - a.amount),
        total: totalServices,
      },
      products: {
        categories: products.sort((a, b) => b.amount - a.amount),
        total: totalProducts,
      },
      grand_total: totalServices + totalProducts,
    };
  },
});

// Get revenue breakdown by barber
export const getRevenueByBarber = query({
  args: {
    branch_id: v.id("branches"),
    start_date: v.number(),
    end_date: v.number(),
  },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    const completedTransactions = transactions.filter(
      (t) =>
        t.payment_status === "completed" &&
        t.createdAt >= args.start_date &&
        t.createdAt <= args.end_date
    );

    // Group by barber
    const barberRevenue: Record<
      string,
      {
        barber_id: string;
        barber_name: string;
        service_revenue: number;
        product_revenue: number;
        transaction_count: number;
      }
    > = {};

    for (const t of completedTransactions) {
      // Handle retail transactions (no barber) separately
      const barberId = t.barber ? (t.barber as string) : "retail_sales";

      if (!barberRevenue[barberId]) {
        if (t.barber) {
          const barber = await ctx.db.get(t.barber);
          barberRevenue[barberId] = {
            barber_id: barberId,
            barber_name: barber?.full_name || "Unknown Barber",
            service_revenue: 0,
            product_revenue: 0,
            transaction_count: 0,
          };
        } else {
          // Retail sales (no barber)
          barberRevenue[barberId] = {
            barber_id: "retail_sales",
            barber_name: "Retail Sales",
            service_revenue: 0,
            product_revenue: 0,
            transaction_count: 0,
          };
        }
      }

      // Add service revenue
      for (const service of t.services || []) {
        barberRevenue[barberId].service_revenue +=
          service.price * service.quantity;
      }

      // Add product revenue
      for (const product of t.products || []) {
        barberRevenue[barberId].product_revenue +=
          product.price * product.quantity;
      }

      barberRevenue[barberId].transaction_count += 1;
    }

    // Convert to array and add totals
    const barbers = Object.values(barberRevenue).map((b) => ({
      ...b,
      total_revenue: b.service_revenue + b.product_revenue,
    }));

    // Sort by total revenue descending
    barbers.sort((a, b) => b.total_revenue - a.total_revenue);

    const grandTotal = barbers.reduce((sum, b) => sum + b.total_revenue, 0);

    return {
      barbers: barbers.map((b) => ({
        ...b,
        percentage: grandTotal > 0 ? (b.total_revenue / grandTotal) * 100 : 0,
      })),
      grand_total: grandTotal,
      barber_count: barbers.length,
    };
  },
});

// Get expense breakdown by category
export const getExpenseByCategory = query({
  args: {
    branch_id: v.id("branches"),
    start_date: v.number(),
    end_date: v.number(),
  },
  handler: async (ctx, args) => {
    // Get COGS from transactions
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    const completedTransactions = transactions.filter(
      (t) =>
        t.payment_status === "completed" &&
        t.createdAt >= args.start_date &&
        t.createdAt <= args.end_date
    );

    // Calculate COGS by product category
    const cogsByCategory: Record<string, number> = {};
    for (const t of completedTransactions) {
      for (const product of t.products || []) {
        const productDoc = await ctx.db.get(product.product_id);
        if (productDoc && productDoc.cost) {
          const category = productDoc.category || "uncategorized";
          cogsByCategory[category] =
            (cogsByCategory[category] || 0) +
            productDoc.cost * product.quantity;
        }
      }
    }

    // Get payroll expenses from payroll_records
    // NOTE: Check individual record status, not period status
    const payrollPeriods = await ctx.db
      .query("payroll_periods")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    // Filter periods that overlap with date range (regardless of period status)
    const relevantPeriods = payrollPeriods.filter(
      (p) =>
        p.period_start <= args.end_date &&
        p.period_end >= args.start_date
    );

    let commissions = 0;
    let dailyPay = 0;
    let productCommissions = 0;
    let taxDeductions = 0;

    for (const period of relevantPeriods) {
      const records = await ctx.db
        .query("payroll_records")
        .withIndex("by_payroll_period", (q) =>
          q.eq("payroll_period_id", period._id)
        )
        .filter((q) => q.eq(q.field("status"), "paid"))
        .collect();

      for (const record of records) {
        commissions += record.gross_commission || 0;
        dailyPay += record.daily_pay || 0;
        productCommissions += record.product_commission || 0;
        taxDeductions += record.tax_deduction || 0;
      }
    }

    // Build expense categories
    const cogsTotal = Object.values(cogsByCategory).reduce((sum, v) => sum + v, 0);
    const payrollTotal = commissions + dailyPay + productCommissions;

    return {
      cogs: {
        categories: Object.entries(cogsByCategory).map(([category, amount]) => ({
          category,
          amount,
        })),
        total: cogsTotal,
      },
      payroll: {
        commissions: commissions,
        daily_pay: dailyPay,
        product_commissions: productCommissions,
        tax_deductions: taxDeductions,
        total: payrollTotal,
      },
      grand_total: cogsTotal + payrollTotal,
    };
  },
});

// Get daily revenue trend for charts
export const getDailyRevenueTrend = query({
  args: {
    branch_id: v.id("branches"),
    start_date: v.number(),
    end_date: v.number(),
  },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    const completedTransactions = transactions.filter(
      (t) =>
        t.payment_status === "completed" &&
        t.createdAt >= args.start_date &&
        t.createdAt <= args.end_date
    );

    // Group by day
    const dailyRevenue: Record<
      string,
      { date: string; revenue: number; transactions: number }
    > = {};

    for (const t of completedTransactions) {
      const dateKey = new Date(t.createdAt).toISOString().split("T")[0];

      if (!dailyRevenue[dateKey]) {
        dailyRevenue[dateKey] = {
          date: dateKey,
          revenue: 0,
          transactions: 0,
        };
      }

      dailyRevenue[dateKey].revenue += t.total_amount;
      dailyRevenue[dateKey].transactions += 1;
    }

    // Convert to sorted array
    const days = Object.values(dailyRevenue).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return {
      days,
      total_revenue: days.reduce((sum, d) => sum + d.revenue, 0),
      total_transactions: days.reduce((sum, d) => sum + d.transactions, 0),
      average_daily_revenue:
        days.length > 0
          ? days.reduce((sum, d) => sum + d.revenue, 0) / days.length
          : 0,
    };
  },
});

// Get payment method breakdown
export const getPaymentMethodBreakdown = query({
  args: {
    branch_id: v.id("branches"),
    start_date: v.number(),
    end_date: v.number(),
  },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    const completedTransactions = transactions.filter(
      (t) =>
        t.payment_status === "completed" &&
        t.createdAt >= args.start_date &&
        t.createdAt <= args.end_date
    );

    const methods: Record<string, { count: number; amount: number }> = {
      cash: { count: 0, amount: 0 },
      card: { count: 0, amount: 0 },
      digital_wallet: { count: 0, amount: 0 },
      bank_transfer: { count: 0, amount: 0 },
    };

    for (const t of completedTransactions) {
      const method = t.payment_method;
      if (methods[method]) {
        methods[method].count += 1;
        methods[method].amount += t.total_amount;
      }
    }

    const total = completedTransactions.reduce(
      (sum, t) => sum + t.total_amount,
      0
    );

    return {
      methods: Object.entries(methods).map(([method, data]) => ({
        method,
        ...data,
        percentage: total > 0 ? (data.amount / total) * 100 : 0,
      })),
      total_amount: total,
      total_transactions: completedTransactions.length,
    };
  },
});

// ============================================================================
// SYNC BOOKINGS TO TRANSACTIONS
// ============================================================================
// Syncs completed bookings that don't have corresponding transactions
// This allows historical bookings to appear in P&L reports
// ============================================================================

// Helper to generate unique transaction ID
function generateTransactionId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `TXN-${timestamp}-${randomPart}`.toUpperCase();
}

// Helper to generate receipt number
function generateReceiptNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().split("T")[0].replace(/-/g, "");
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RCP-${dateStr}-${randomPart}`;
}

// Sync completed bookings to transactions
export const syncBookingsToTransactions = mutation({
  args: {
    branch_id: v.id("branches"),
    start_date: v.number(),
    end_date: v.number(),
    synced_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const timestamp = Date.now();

    // Get all completed bookings in the date range
    const allBookings = await ctx.db
      .query("bookings")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    // Filter by date range and completed status
    const completedBookings = allBookings.filter((booking) => {
      const bookingDate = new Date(booking.date).getTime();
      return (
        booking.status === "completed" &&
        bookingDate >= args.start_date &&
        bookingDate <= args.end_date
      );
    });

    // Get all existing transactions to check for duplicates
    const existingTransactions = await ctx.db
      .query("transactions")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    // Create a set of booking codes that already have transactions
    // We'll use a combination of date + barber + customer_name to match
    const existingKeys = new Set<string>();
    for (const tx of existingTransactions) {
      // Create a key based on date, barber, and approximate amount
      const dateKey = new Date(tx.createdAt).toDateString();
      const key = `${dateKey}-${tx.barber}-${tx.total_amount}`;
      existingKeys.add(key);
    }

    let synced = 0;
    let skipped = 0;
    const syncedBookings: string[] = [];

    for (const booking of completedBookings) {
      // Skip if no barber assigned
      if (!booking.barber) {
        skipped++;
        continue;
      }

      // Check if this booking might already have a transaction
      const bookingDateKey = new Date(booking.date).toDateString();
      const bookingKey = `${bookingDateKey}-${booking.barber}-${booking.final_price || booking.price}`;

      if (existingKeys.has(bookingKey)) {
        skipped++;
        continue;
      }

      // Get service details
      const service = await ctx.db.get(booking.service);
      if (!service) {
        skipped++;
        continue;
      }

      // Get barber details
      const barber = await ctx.db.get(booking.barber);

      // Create transaction record
      const transactionId = generateTransactionId();
      const receiptNumber = generateReceiptNumber();

      const transactionData = {
        transaction_id: transactionId,
        branch_id: args.branch_id,
        customer: booking.customer || undefined,
        customer_name: booking.customer_name || undefined,
        customer_phone: booking.customer_phone || undefined,
        customer_email: booking.customer_email || undefined,
        barber: booking.barber,
        services: [
          {
            service_id: booking.service,
            service_name: service.name,
            price: booking.price,
            quantity: 1,
          },
        ],
        products: [] as { product_id: Id<"products">; product_name: string; price: number; quantity: number }[],
        subtotal: booking.price,
        discount_amount: booking.discount_amount || 0,
        voucher_applied: booking.voucher_id || undefined,
        booking_fee: booking.booking_fee || 0,
        late_fee: booking.late_fee || 0,
        tax_amount: 0, // No tax on synced bookings
        total_amount: booking.final_price || booking.price,
        payment_method: "cash" as const, // Default to cash for synced bookings
        payment_status: "completed" as const,
        notes: `Synced from booking ${booking.booking_code}`,
        receipt_number: receiptNumber,
        processed_by: args.synced_by,
        createdAt: new Date(booking.date).getTime(), // Use booking date
        updatedAt: timestamp,
      };

      await ctx.db.insert("transactions", transactionData);
      synced++;
      syncedBookings.push(booking.booking_code);

      // Add to existing keys to prevent duplicates in same batch
      existingKeys.add(bookingKey);
    }

    return {
      success: true,
      synced,
      skipped,
      total_bookings: completedBookings.length,
      synced_bookings: syncedBookings,
      message: `Synced ${synced} bookings to transactions. ${skipped} skipped (already synced or missing data).`,
    };
  },
});

// Debug query to show detailed revenue breakdown by transaction
export const getRevenueDetails = query({
  args: {
    branch_id: v.id("branches"),
    start_date: v.number(),
    end_date: v.number(),
  },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    // Filter by date range and completed status
    const completedTransactions = transactions.filter(
      (t) =>
        t.payment_status === "completed" &&
        t.createdAt >= args.start_date &&
        t.createdAt <= args.end_date
    );

    // Calculate detailed breakdown
    const details = completedTransactions.map((t) => {
      let serviceRevenue = 0;
      let productRevenue = 0;

      for (const service of t.services || []) {
        serviceRevenue += service.price * service.quantity;
      }

      for (const product of t.products || []) {
        productRevenue += product.price * product.quantity;
      }

      const bookingFee = t.booking_fee || 0;
      const lateFee = t.late_fee || 0;
      const discount = t.discount_amount || 0;
      const gross = serviceRevenue + productRevenue + bookingFee + lateFee;
      const net = gross - discount;

      return {
        transaction_id: t.transaction_id,
        receipt_number: t.receipt_number,
        date: new Date(t.createdAt).toLocaleDateString(),
        timestamp: t.createdAt,
        customer_name: t.customer_name || "Walk-in",
        services: serviceRevenue,
        products: productRevenue,
        booking_fee: bookingFee,
        late_fee: lateFee,
        gross: gross,
        discount: discount,
        net: net,
      };
    });

    // Sort by date
    details.sort((a, b) => a.timestamp - b.timestamp);

    // Calculate totals
    const totals = details.reduce(
      (acc, t) => ({
        services: acc.services + t.services,
        products: acc.products + t.products,
        booking_fees: acc.booking_fees + t.booking_fee,
        late_fees: acc.late_fees + t.late_fee,
        gross: acc.gross + t.gross,
        discounts: acc.discounts + t.discount,
        net: acc.net + t.net,
      }),
      { services: 0, products: 0, booking_fees: 0, late_fees: 0, gross: 0, discounts: 0, net: 0 }
    );

    return {
      transaction_count: details.length,
      transactions: details,
      totals,
      period: {
        start: new Date(args.start_date).toLocaleDateString(),
        end: new Date(args.end_date).toLocaleDateString(),
      },
    };
  },
});

// ============================================================================
// SUPER ADMIN OWN ACCOUNTING (NOT BRANCH AGGREGATION)
// ============================================================================
// Super Admin has their own separate P&L and Balance Sheet
// Income sources: Royalty payments, Product order payments, Manual entries
// NOT a consolidation of branch financials
// ============================================================================

// Get Super Admin's own P&L Summary
export const getConsolidatedPLSummary = query({
  args: {
    start_date: v.number(),
    end_date: v.number(),
  },
  handler: async (ctx, args) => {
    // ========================================
    // AUTOMATED REVENUE - Royalty Payments
    // ========================================
    const royaltyPayments = await ctx.db.query("royaltyPayments").collect();
    const paidRoyalties = royaltyPayments.filter(
      (r) =>
        r.status === "paid" &&
        r.paid_at &&
        r.paid_at >= args.start_date &&
        r.paid_at <= args.end_date
    );

    let royaltyIncome = 0;
    const royaltyByBranch: Record<string, { branch_name: string; amount: number; count: number }> = {};

    for (const royalty of paidRoyalties) {
      royaltyIncome += royalty.amount || 0;
      const branchId = royalty.branch_id as string;
      if (!royaltyByBranch[branchId]) {
        const branch = await ctx.db.get(royalty.branch_id);
        royaltyByBranch[branchId] = {
          branch_name: branch?.name || "Unknown Branch",
          amount: 0,
          count: 0,
        };
      }
      royaltyByBranch[branchId].amount += royalty.amount || 0;
      royaltyByBranch[branchId].count += 1;
    }

    // ========================================
    // AUTOMATED REVENUE - Product Order Payments
    // ========================================
    // Revenue is recognized when order is PAID (not just received)
    // Use paid_at date if available, otherwise fall back to received_at or created_at
    const productOrders = await ctx.db.query("productOrders").collect();
    const paidOrders = productOrders.filter((o) => {
      if (o.is_paid !== true) return false;
      // Use paid_at if available, otherwise fall back to received_at or created_at
      const paymentDate = o.paid_at || o.received_at || o.created_at;
      return paymentDate >= args.start_date && paymentDate <= args.end_date;
    });

    let productOrderIncome = 0;
    const ordersByBranch: Record<string, { branch_name: string; amount: number; count: number }> = {};

    for (const order of paidOrders) {
      productOrderIncome += order.total_amount || 0;
      const branchId = order.branch_id as string;
      if (!ordersByBranch[branchId]) {
        const branch = await ctx.db.get(order.branch_id);
        ordersByBranch[branchId] = {
          branch_name: branch?.name || "Unknown Branch",
          amount: 0,
          count: 0,
        };
      }
      ordersByBranch[branchId].amount += order.total_amount || 0;
      ordersByBranch[branchId].count += 1;
    }

    // ========================================
    // MANUAL REVENUE - From superAdminRevenue table
    // ========================================
    const manualRevenue = await ctx.db.query("superAdminRevenue").collect();
    const periodManualRevenue = manualRevenue.filter(
      (r) =>
        !r.is_automated &&
        r.revenue_date >= args.start_date &&
        r.revenue_date <= args.end_date
    );

    let otherRevenue = 0;
    const revenueByCategory: Record<string, number> = {};

    for (const rev of periodManualRevenue) {
      otherRevenue += rev.amount || 0;
      revenueByCategory[rev.category] = (revenueByCategory[rev.category] || 0) + rev.amount;
    }

    // ========================================
    // EXPENSES - From superAdminExpenses table
    // ========================================
    const allExpenses = await ctx.db.query("superAdminExpenses").collect();
    const periodExpenses = allExpenses.filter(
      (e) => e.expense_date >= args.start_date && e.expense_date <= args.end_date
    );

    let fixedExpenses = 0;
    let operatingExpenses = 0;
    const expenseByCategory: Record<string, number> = {};

    for (const expense of periodExpenses) {
      if (expense.expense_type === "fixed") {
        fixedExpenses += expense.amount;
      } else {
        operatingExpenses += expense.amount;
      }
      expenseByCategory[expense.category] = (expenseByCategory[expense.category] || 0) + expense.amount;
    }

    // ========================================
    // CALCULATE TOTALS
    // ========================================
    const totalAutomatedRevenue = royaltyIncome + productOrderIncome;
    const totalRevenue = totalAutomatedRevenue + otherRevenue;
    const totalExpenses = fixedExpenses + operatingExpenses;
    const netIncome = totalRevenue - totalExpenses;

    return {
      // Summary
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      net_income: netIncome,

      // Revenue breakdown
      revenue_breakdown: {
        royalty_income: royaltyIncome,
        product_order_income: productOrderIncome,
        other_revenue: otherRevenue,
        automated_total: totalAutomatedRevenue,
        by_category: revenueByCategory,
      },

      // Expense breakdown
      expense_breakdown: {
        fixed_expenses: fixedExpenses,
        operating_expenses: operatingExpenses,
        total: totalExpenses,
        by_category: expenseByCategory,
      },

      // Profit margins
      gross_margin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0,
      net_margin: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0,

      // Royalty breakdown by branch
      royalty_by_branch: Object.entries(royaltyByBranch).map(([id, data]) => ({
        branch_id: id,
        ...data,
      })).sort((a, b) => b.amount - a.amount),

      // Product order breakdown by branch
      orders_by_branch: Object.entries(ordersByBranch).map(([id, data]) => ({
        branch_id: id,
        ...data,
      })).sort((a, b) => b.amount - a.amount),

      // Counts
      royalty_payment_count: paidRoyalties.length,
      product_order_count: paidOrders.length,
      manual_revenue_count: periodManualRevenue.length,
      expense_count: periodExpenses.length,

      // Period info
      period: {
        start: args.start_date,
        end: args.end_date,
      },
    };
  },
});

// Get Super Admin's own Balance Sheet
export const getConsolidatedBalanceSheet = query({
  args: {
    as_of_date: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const asOfDate = args.as_of_date || Date.now();

    // ========================================
    // MANUAL ASSETS - From superAdminAssets table
    // ========================================
    const assets = await ctx.db
      .query("superAdminAssets")
      .filter((q) => q.eq(q.field("is_active"), true))
      .collect();

    let currentAssets = 0;
    let fixedAssets = 0;
    let intangibleAssets = 0;
    const assetsByCategory: Record<string, number> = {};
    const assetDetails: Array<{ name: string; category: string; value: number }> = [];

    for (const asset of assets) {
      const value = asset.current_value || 0;
      assetsByCategory[asset.category] = (assetsByCategory[asset.category] || 0) + value;
      assetDetails.push({ name: asset.name, category: asset.category, value });

      if (asset.asset_type === "current") {
        currentAssets += value;
      } else if (asset.asset_type === "fixed") {
        fixedAssets += value;
      } else {
        intangibleAssets += value;
      }
    }

    // ========================================
    // AUTOMATED CURRENT ASSETS - Cash & Receivables
    // ========================================
    const royaltyPayments = await ctx.db.query("royaltyPayments").collect();
    const productOrders = await ctx.db.query("productOrders").collect();

    // --- CASH FROM PAID ROYALTIES ---
    // When royalties are PAID, the cash is received (Asset: Cash increases)
    const paidRoyalties = royaltyPayments.filter(
      (r) => r.status === "paid" && r.paid_at && r.paid_at <= asOfDate
    );
    let royaltyCashReceived = 0;
    for (const royalty of paidRoyalties) {
      royaltyCashReceived += royalty.amount || 0;
    }

    // --- CASH FROM PAID PRODUCT ORDERS ---
    // When product orders are PAID, the cash is received (Asset: Cash increases)
    const paidOrders = productOrders.filter((o) => {
      if (o.is_paid !== true) return false;
      const paymentDate = o.paid_at || o.received_at || o.created_at;
      return paymentDate <= asOfDate;
    });
    let productOrderCashReceived = 0;
    for (const order of paidOrders) {
      productOrderCashReceived += order.total_amount || 0;
    }

    // ========================================
    // MANUAL REVENUE RECEIVED TO SALES CASH
    // ========================================
    // When manual revenue is received to sales cash, it increases the sales cash pool
    const allManualRevenueForCash = await ctx.db.query("superAdminRevenue").collect();
    const relevantManualRevenue = allManualRevenueForCash.filter((r) => r.revenue_date <= asOfDate);

    let manualRevenueToSalesCash = 0;
    const manualRevenueByAssetId: Record<string, number> = {};

    for (const revenue of relevantManualRevenue) {
      if (revenue.received_to_sales_cash) {
        // Received to automated sales cash pool
        manualRevenueToSalesCash += revenue.amount || 0;
      } else if (revenue.received_to_asset_id) {
        // Received to a specific manual asset
        const assetIdStr = revenue.received_to_asset_id as string;
        manualRevenueByAssetId[assetIdStr] = (manualRevenueByAssetId[assetIdStr] || 0) + (revenue.amount || 0);
      }
      // Revenue without a destination doesn't affect asset values (only equity via retained earnings)
    }

    // Total automated sales cash (from paid royalties + paid product orders + manual revenue to sales cash)
    const totalSalesCash = royaltyCashReceived + productOrderCashReceived + manualRevenueToSalesCash;

    // --- RECEIVABLES (UNPAID) ---
    // Royalty receivables (unpaid royalties - still owed to us)
    const unpaidRoyalties = royaltyPayments.filter(
      (r) => r.status === "due" || r.status === "overdue"
    );
    let royaltyReceivables = 0;
    for (const royalty of unpaidRoyalties) {
      royaltyReceivables += royalty.total_due || royalty.amount || 0;
    }

    // Product order receivables (approved, shipped, or received but NOT PAID)
    const unpaidOrders = productOrders.filter(
      (o) =>
        (o.status === "approved" || o.status === "shipped" || o.status === "received") &&
        o.is_paid !== true
    );
    let orderReceivables = 0;
    for (const order of unpaidOrders) {
      orderReceivables += order.total_amount || 0;
    }

    // ========================================
    // EXPENSE OUTFLOWS - Deduct from Cash/Assets
    // ========================================
    // For proper double-entry accounting:
    // - When expense is recorded: Debit Expense (P&L), Credit Cash (Balance Sheet)
    // - Expenses reduce both Equity (via Retained Earnings) AND Cash (Assets)
    const allExpensesForCash = await ctx.db.query("superAdminExpenses").collect();
    const relevantExpenses = allExpensesForCash.filter((e) => e.expense_date <= asOfDate);

    // Calculate expenses paid from automated sales cash
    let expensesPaidFromSalesCash = 0;
    const expensesByAssetId: Record<string, number> = {};

    for (const expense of relevantExpenses) {
      if (expense.paid_from_sales_cash) {
        // Paid from automated sales cash (royalty + product order cash)
        expensesPaidFromSalesCash += expense.amount || 0;
      } else if (expense.paid_from_asset_id) {
        // Paid from a specific manual asset
        const assetIdStr = expense.paid_from_asset_id as string;
        expensesByAssetId[assetIdStr] = (expensesByAssetId[assetIdStr] || 0) + (expense.amount || 0);
      }
      // Expenses without a source don't affect asset values (only equity via retained earnings)
    }

    // Net sales cash after expense outflows
    const netSalesCash = totalSalesCash - expensesPaidFromSalesCash;

    // Calculate total adjustments to manual current assets (revenue in - expenses out)
    let manualAssetNetAdjustments = 0;
    for (const asset of assets) {
      const assetIdStr = asset._id as string;
      const revenueToAsset = manualRevenueByAssetId[assetIdStr] || 0;
      const expensesFromAsset = expensesByAssetId[assetIdStr] || 0;
      // Net adjustment = revenue received - expenses paid
      manualAssetNetAdjustments += (revenueToAsset - expensesFromAsset);
    }

    // Add automated assets to current assets:
    // - Net Sales Cash (sales cash MINUS expenses paid from it)
    // - Receivables (unpaid royalties + unpaid product orders)
    // - Net adjustments to manual assets (revenue received - expenses paid)
    currentAssets += netSalesCash + royaltyReceivables + orderReceivables + manualAssetNetAdjustments;

    // ========================================
    // MANUAL LIABILITIES - From superAdminLiabilities table
    // ========================================
    const liabilities = await ctx.db
      .query("superAdminLiabilities")
      .filter((q) => q.eq(q.field("is_active"), true))
      .collect();

    let currentLiabilities = 0;
    let longTermLiabilities = 0;
    const liabilitiesByCategory: Record<string, number> = {};
    const liabilityDetails: Array<{ name: string; category: string; balance: number }> = [];

    for (const liability of liabilities) {
      const balance = liability.current_balance || 0;
      liabilitiesByCategory[liability.category] = (liabilitiesByCategory[liability.category] || 0) + balance;
      liabilityDetails.push({ name: liability.name, category: liability.category, balance });

      if (liability.liability_type === "current") {
        currentLiabilities += balance;
      } else {
        longTermLiabilities += balance;
      }
    }

    // ========================================
    // MANUAL EQUITY - From superAdminEquity table
    // ========================================
    const equityEntries = await ctx.db.query("superAdminEquity").collect();
    // Filter entries up to as_of_date
    const relevantEquity = equityEntries.filter((e) => e.transaction_date <= asOfDate);

    let totalEquity = 0;
    const equityByType: Record<string, number> = {};

    for (const entry of relevantEquity) {
      totalEquity += entry.amount || 0;
      equityByType[entry.equity_type] = (equityByType[entry.equity_type] || 0) + entry.amount;
    }

    // ========================================
    // RETAINED EARNINGS (Cumulative Net Income)
    // ========================================
    // Calculate retained earnings from all-time P&L
    // Revenue: paid royalties + received product orders + manual revenue
    const allRoyaltyIncome = royaltyPayments
      .filter((r) => r.status === "paid" && r.paid_at && r.paid_at <= asOfDate)
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    // Use is_paid for revenue recognition (not just received status)
    // Use paid_at if available, otherwise fall back to received_at or created_at
    const allOrderIncome = productOrders
      .filter((o) => {
        if (o.is_paid !== true) return false;
        const paymentDate = o.paid_at || o.received_at || o.created_at;
        return paymentDate <= asOfDate;
      })
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);

    // IMPORTANT: For Balance Sheet to stay balanced, only include manual revenue/expenses
    // that have a payment destination/source specified (double-entry accounting).
    // Untracked entries only show in P&L, not in Balance Sheet retained earnings.
    const allManualRevenue = await ctx.db.query("superAdminRevenue").collect();

    // Only include manual revenue that has a payment destination tracked
    const trackedManualRevenueTotal = allManualRevenue
      .filter((r) => r.revenue_date <= asOfDate && (r.received_to_sales_cash || r.received_to_asset_id))
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    const allExpenses = await ctx.db.query("superAdminExpenses").collect();

    // Only include expenses that have a payment source tracked
    const trackedExpensesTotal = allExpenses
      .filter((e) => e.expense_date <= asOfDate && (e.paid_from_sales_cash || e.paid_from_asset_id))
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    // Also calculate untracked amounts for display purposes (P&L only, not in Balance Sheet)
    const untrackedManualRevenueTotal = allManualRevenue
      .filter((r) => r.revenue_date <= asOfDate && !r.received_to_sales_cash && !r.received_to_asset_id)
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    const untrackedExpensesTotal = allExpenses
      .filter((e) => e.expense_date <= asOfDate && !e.paid_from_sales_cash && !e.paid_from_asset_id)
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    // Retained Earnings = Automated Income + Tracked Manual Revenue - Tracked Expenses
    const retainedEarnings = allRoyaltyIncome + allOrderIncome + trackedManualRevenueTotal - trackedExpensesTotal;
    totalEquity += retainedEarnings;
    equityByType["retained_earnings"] = retainedEarnings;

    // ========================================
    // CALCULATE TOTALS & RATIOS
    // ========================================
    const totalAssets = currentAssets + fixedAssets + intangibleAssets;
    const totalLiabilities = currentLiabilities + longTermLiabilities;

    const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : undefined;
    const debtToEquity = totalEquity > 0 ? totalLiabilities / totalEquity : undefined;
    const workingCapital = currentAssets - currentLiabilities;

    return {
      // Summary
      total_assets: totalAssets,
      total_liabilities: totalLiabilities,
      total_equity: totalEquity,

      // Accounting equation check
      is_balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,

      // Assets breakdown
      assets: {
        current: currentAssets,
        fixed: fixedAssets,
        intangible: intangibleAssets,
        by_category: assetsByCategory,
        details: assetDetails,
        // Automated CASH from paid sales (double-entry: Asset increases when paid)
        royalty_cash_received: royaltyCashReceived,
        product_order_cash_received: productOrderCashReceived,
        total_sales_cash: totalSalesCash,
        // Manual revenue received to sales cash (double-entry: increases cash)
        manual_revenue_to_sales_cash: manualRevenueToSalesCash,
        // Expense outflows from sales cash (double-entry: reduces cash)
        expenses_from_sales_cash: expensesPaidFromSalesCash,
        net_sales_cash: netSalesCash,
        // Net adjustments to manual assets (revenue received - expenses paid)
        manual_asset_net_adjustments: manualAssetNetAdjustments,
        // Automated RECEIVABLES (still owed to us)
        royalty_receivables: royaltyReceivables,
        order_receivables: orderReceivables,
      },

      // Liabilities breakdown
      liabilities: {
        current: currentLiabilities,
        long_term: longTermLiabilities,
        by_category: liabilitiesByCategory,
        details: liabilityDetails,
      },

      // Equity breakdown
      equity: {
        total: totalEquity,
        by_type: equityByType,
        retained_earnings: retainedEarnings,
        // Tracked vs untracked breakdown (untracked = P&L only, not in Balance Sheet)
        tracked_manual_revenue: trackedManualRevenueTotal,
        untracked_manual_revenue: untrackedManualRevenueTotal,
        tracked_expenses: trackedExpensesTotal,
        untracked_expenses: untrackedExpensesTotal,
      },

      // Financial ratios
      ratios: {
        current_ratio: currentRatio,
        debt_to_equity: debtToEquity,
        working_capital: workingCapital,
      },

      // Counts
      asset_count: assets.length,
      liability_count: liabilities.length,
      equity_entry_count: relevantEquity.length,
      // Paid counts (cash received)
      paid_royalty_count: paidRoyalties.length,
      paid_order_count: paidOrders.length,
      // Pending counts (receivables)
      pending_royalty_count: unpaidRoyalties.length,
      pending_order_count: unpaidOrders.length,

      // As of date
      as_of_date: asOfDate,
    };
  },
});

// ========================================
// SUPER ADMIN FINANCIAL ENTRY MUTATIONS
// ========================================

// Add manual revenue entry
export const addSuperAdminRevenue = mutation({
  args: {
    category: v.union(
      v.literal("consulting"),
      v.literal("franchise_fee"),
      v.literal("training_fee"),
      v.literal("marketing_fee"),
      v.literal("other")
    ),
    description: v.string(),
    amount: v.number(),
    revenue_date: v.number(),
    notes: v.optional(v.string()),
    // NEW: Track where the revenue cash goes (double-entry: debit cash/asset, credit revenue)
    received_to_asset_id: v.optional(v.id("superAdminAssets")),
    received_to_sales_cash: v.optional(v.boolean()), // true = goes to automated sales cash pool
    created_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // If received to a manual asset, validate it exists and is a current asset (cash/bank)
    if (args.received_to_asset_id) {
      const asset = await ctx.db.get(args.received_to_asset_id);
      if (!asset || !asset.is_active) {
        throw new Error("Selected asset not found or inactive");
      }
      if (asset.asset_type !== "current") {
        throw new Error("Revenue can only be received into current assets (cash, bank accounts)");
      }
    }

    return await ctx.db.insert("superAdminRevenue", {
      category: args.category,
      description: args.description,
      amount: args.amount,
      revenue_date: args.revenue_date,
      notes: args.notes,
      is_automated: false,
      received_to_asset_id: args.received_to_asset_id,
      received_to_sales_cash: args.received_to_sales_cash,
      created_by: args.created_by,
      created_at: now,
      updated_at: now,
    });
  },
});

// Add manual expense entry
export const addSuperAdminExpense = mutation({
  args: {
    expense_type: v.union(v.literal("fixed"), v.literal("operating")),
    category: v.union(
      v.literal("office_rent"),
      v.literal("utilities"),
      v.literal("insurance"),
      v.literal("salaries"),
      v.literal("subscriptions"),
      v.literal("supplies"),
      v.literal("travel"),
      v.literal("marketing"),
      v.literal("legal_accounting"),
      v.literal("training_costs"),
      v.literal("warehouse_costs"),
      v.literal("miscellaneous")
    ),
    description: v.string(),
    amount: v.number(),
    expense_date: v.number(),
    notes: v.optional(v.string()),
    is_recurring: v.boolean(),
    recurring_day: v.optional(v.number()),
    // NEW: Track which asset the expense was paid from
    paid_from_asset_id: v.optional(v.id("superAdminAssets")),
    paid_from_sales_cash: v.optional(v.boolean()), // true = paid from automated sales cash
    created_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // If paid from a manual asset, validate it exists and is a current asset (cash/bank)
    if (args.paid_from_asset_id) {
      const asset = await ctx.db.get(args.paid_from_asset_id);
      if (!asset || !asset.is_active) {
        throw new Error("Selected asset not found or inactive");
      }
      if (asset.asset_type !== "current") {
        throw new Error("Can only pay expenses from current assets (cash, bank accounts)");
      }
    }

    return await ctx.db.insert("superAdminExpenses", {
      expense_type: args.expense_type,
      category: args.category,
      description: args.description,
      amount: args.amount,
      expense_date: args.expense_date,
      notes: args.notes,
      is_recurring: args.is_recurring,
      recurring_day: args.recurring_day,
      paid_from_asset_id: args.paid_from_asset_id,
      paid_from_sales_cash: args.paid_from_sales_cash,
      created_by: args.created_by,
      created_at: now,
      updated_at: now,
    });
  },
});

// Add manual asset entry
export const addSuperAdminAsset = mutation({
  args: {
    asset_type: v.union(v.literal("current"), v.literal("fixed"), v.literal("intangible")),
    category: v.union(
      v.literal("cash"),
      v.literal("bank_accounts"),
      v.literal("accounts_receivable"),
      v.literal("prepaid_expenses"),
      v.literal("equipment"),
      v.literal("furniture"),
      v.literal("vehicles"),
      v.literal("warehouse_equipment"),
      v.literal("software"),
      v.literal("trademarks"),
      v.literal("franchise_rights"),
      v.literal("deposits"),
      v.literal("other")
    ),
    name: v.string(),
    purchase_value: v.number(),
    current_value: v.number(),
    purchase_date: v.optional(v.number()),
    depreciation_rate: v.optional(v.number()),
    notes: v.optional(v.string()),
    created_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("superAdminAssets", {
      asset_type: args.asset_type,
      category: args.category,
      name: args.name,
      purchase_value: args.purchase_value,
      current_value: args.current_value,
      purchase_date: args.purchase_date,
      depreciation_rate: args.depreciation_rate,
      accumulated_depreciation: 0,
      notes: args.notes,
      is_active: true,
      is_automated: false,
      created_by: args.created_by,
      created_at: now,
      updated_at: now,
    });
  },
});

// Add manual liability entry
export const addSuperAdminLiability = mutation({
  args: {
    liability_type: v.union(v.literal("current"), v.literal("long_term")),
    category: v.union(
      v.literal("accounts_payable"),
      v.literal("wages_payable"),
      v.literal("taxes_payable"),
      v.literal("credit_card"),
      v.literal("short_term_loan"),
      v.literal("accrued_expenses"),
      v.literal("bank_loan"),
      v.literal("equipment_financing"),
      v.literal("owner_loan"),
      v.literal("other")
    ),
    name: v.string(),
    original_amount: v.number(),
    current_balance: v.number(),
    interest_rate: v.optional(v.number()),
    due_date: v.optional(v.number()),
    creditor: v.optional(v.string()),
    notes: v.optional(v.string()),
    created_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("superAdminLiabilities", {
      liability_type: args.liability_type,
      category: args.category,
      name: args.name,
      original_amount: args.original_amount,
      current_balance: args.current_balance,
      interest_rate: args.interest_rate,
      due_date: args.due_date,
      creditor: args.creditor,
      notes: args.notes,
      is_active: true,
      created_by: args.created_by,
      created_at: now,
      updated_at: now,
    });
  },
});

// Add manual equity entry
export const addSuperAdminEquity = mutation({
  args: {
    equity_type: v.union(
      v.literal("owner_capital"),
      v.literal("drawings"),
      v.literal("additional_investment"),
      v.literal("other")
    ),
    description: v.string(),
    amount: v.number(),
    transaction_date: v.number(),
    notes: v.optional(v.string()),
    created_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("superAdminEquity", {
      equity_type: args.equity_type,
      description: args.description,
      amount: args.amount,
      transaction_date: args.transaction_date,
      notes: args.notes,
      created_by: args.created_by,
      created_at: now,
      updated_at: now,
    });
  },
});

// Get all Super Admin revenue entries
export const getSuperAdminRevenueEntries = query({
  args: {
    start_date: v.optional(v.number()),
    end_date: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let entries = await ctx.db.query("superAdminRevenue").collect();

    if (args.start_date && args.end_date) {
      entries = entries.filter(
        (e) => e.revenue_date >= args.start_date! && e.revenue_date <= args.end_date!
      );
    }

    return entries.sort((a, b) => b.revenue_date - a.revenue_date);
  },
});

// Get all Super Admin expense entries
export const getSuperAdminExpenseEntries = query({
  args: {
    start_date: v.optional(v.number()),
    end_date: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let entries = await ctx.db.query("superAdminExpenses").collect();

    if (args.start_date && args.end_date) {
      entries = entries.filter(
        (e) => e.expense_date >= args.start_date! && e.expense_date <= args.end_date!
      );
    }

    return entries.sort((a, b) => b.expense_date - a.expense_date);
  },
});

// Get all Super Admin assets
export const getSuperAdminAssets = query({
  args: {
    include_inactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let assets = await ctx.db.query("superAdminAssets").collect();

    if (!args.include_inactive) {
      assets = assets.filter((a) => a.is_active);
    }

    return assets.sort((a, b) => b.current_value - a.current_value);
  },
});

// Get payment source options for expenses (current assets + sales cash option)
export const getExpensePaymentSources = query({
  args: {},
  handler: async (ctx) => {
    // Get current assets (cash, bank accounts) that can be used to pay expenses
    const currentAssets = await ctx.db
      .query("superAdminAssets")
      .filter((q) =>
        q.and(
          q.eq(q.field("is_active"), true),
          q.eq(q.field("asset_type"), "current")
        )
      )
      .collect();

    // Calculate available sales cash (royalty + product order cash - already spent)
    const royaltyPayments = await ctx.db.query("royaltyPayments").collect();
    const productOrders = await ctx.db.query("productOrders").collect();
    const expenses = await ctx.db.query("superAdminExpenses").collect();

    const paidRoyaltyCash = royaltyPayments
      .filter((r) => r.status === "paid" && r.paid_at)
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    const paidOrderCash = productOrders
      .filter((o) => o.is_paid === true)
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);

    const expensesFromSalesCash = expenses
      .filter((e) => e.paid_from_sales_cash === true)
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const availableSalesCash = paidRoyaltyCash + paidOrderCash - expensesFromSalesCash;

    // Return payment source options
    return {
      sales_cash: {
        id: "sales_cash",
        name: "Sales Cash (Royalties + Product Orders)",
        available: availableSalesCash,
        type: "automated",
      },
      manual_assets: currentAssets.map((asset) => {
        // Calculate expenses already paid from this asset
        const expensesFromAsset = expenses
          .filter((e) => e.paid_from_asset_id === asset._id)
          .reduce((sum, e) => sum + (e.amount || 0), 0);

        return {
          id: asset._id,
          name: asset.name,
          category: asset.category,
          available: asset.current_value - expensesFromAsset,
          type: "manual",
        };
      }),
    };
  },
});

// Get all Super Admin liabilities
export const getSuperAdminLiabilities = query({
  args: {
    include_inactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let liabilities = await ctx.db.query("superAdminLiabilities").collect();

    if (!args.include_inactive) {
      liabilities = liabilities.filter((l) => l.is_active);
    }

    return liabilities.sort((a, b) => b.current_balance - a.current_balance);
  },
});

// Get all Super Admin equity entries
export const getSuperAdminEquityEntries = query({
  args: {},
  handler: async (ctx) => {
    const entries = await ctx.db.query("superAdminEquity").collect();
    return entries.sort((a, b) => b.transaction_date - a.transaction_date);
  },
});

// Delete Super Admin revenue entry
export const deleteSuperAdminRevenue = mutation({
  args: { id: v.id("superAdminRevenue") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// Update Super Admin revenue entry
export const updateSuperAdminRevenue = mutation({
  args: {
    id: v.id("superAdminRevenue"),
    category: v.union(
      v.literal("consulting"),
      v.literal("franchise_fee"),
      v.literal("training_fee"),
      v.literal("marketing_fee"),
      v.literal("other")
    ),
    description: v.string(),
    amount: v.number(),
    revenue_date: v.number(),
    notes: v.optional(v.string()),
    // Payment destination tracking
    received_to_asset_id: v.optional(v.id("superAdminAssets")),
    received_to_sales_cash: v.optional(v.boolean()),
    // Flag to clear payment destination
    clear_payment_destination: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, clear_payment_destination, ...updates } = args;

    // If received to a manual asset, validate it exists and is a current asset
    if (updates.received_to_asset_id) {
      const asset = await ctx.db.get(updates.received_to_asset_id);
      if (!asset || !asset.is_active) {
        throw new Error("Selected asset not found or inactive");
      }
      if (asset.asset_type !== "current") {
        throw new Error("Revenue can only be received into current assets (cash, bank accounts)");
      }
    }

    // Build the patch object
    const patchData: Record<string, any> = {
      ...updates,
      updated_at: Date.now(),
    };

    // If clearing payment destination, explicitly set both to undefined
    if (clear_payment_destination) {
      patchData.received_to_asset_id = undefined;
      patchData.received_to_sales_cash = undefined;
    }

    await ctx.db.patch(id, patchData);
    return { success: true };
  },
});

// Get payment destination options for revenue (current assets + sales cash option)
export const getRevenuePaymentDestinations = query({
  args: {},
  handler: async (ctx) => {
    // Get current assets (cash, bank accounts) where revenue can be received
    const currentAssets = await ctx.db
      .query("superAdminAssets")
      .filter((q) =>
        q.and(
          q.eq(q.field("is_active"), true),
          q.eq(q.field("asset_type"), "current")
        )
      )
      .collect();

    // Calculate current sales cash balance (royalty + product order cash - expenses)
    const royaltyPayments = await ctx.db.query("royaltyPayments").collect();
    const productOrders = await ctx.db.query("productOrders").collect();
    const expenses = await ctx.db.query("superAdminExpenses").collect();
    const revenues = await ctx.db.query("superAdminRevenue").collect();

    const paidRoyaltyCash = royaltyPayments
      .filter((r) => r.status === "paid" && r.paid_at)
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    const paidOrderCash = productOrders
      .filter((o) => o.is_paid === true)
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);

    const expensesFromSalesCash = expenses
      .filter((e) => e.paid_from_sales_cash === true)
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    // Add manual revenue that went to sales cash
    const revenueToSalesCash = revenues
      .filter((r) => r.received_to_sales_cash === true)
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    const currentSalesCashBalance = paidRoyaltyCash + paidOrderCash + revenueToSalesCash - expensesFromSalesCash;

    // Return payment destination options
    return {
      sales_cash: {
        id: "sales_cash",
        name: "Sales Cash (Royalties + Product Orders)",
        balance: currentSalesCashBalance,
        type: "automated",
      },
      manual_assets: currentAssets.map((asset) => {
        // Calculate net balance of asset (original + revenue received - expenses paid)
        const revenueToAsset = revenues
          .filter((r) => r.received_to_asset_id === asset._id)
          .reduce((sum, r) => sum + (r.amount || 0), 0);

        const expensesFromAsset = expenses
          .filter((e) => e.paid_from_asset_id === asset._id)
          .reduce((sum, e) => sum + (e.amount || 0), 0);

        return {
          id: asset._id,
          name: asset.name,
          category: asset.category,
          balance: asset.current_value + revenueToAsset - expensesFromAsset,
          type: "manual",
        };
      }),
    };
  },
});

// Update Super Admin expense entry
export const updateSuperAdminExpense = mutation({
  args: {
    id: v.id("superAdminExpenses"),
    expense_type: v.union(v.literal("fixed"), v.literal("operating")),
    category: v.union(
      v.literal("office_rent"),
      v.literal("utilities"),
      v.literal("insurance"),
      v.literal("salaries"),
      v.literal("subscriptions"),
      v.literal("supplies"),
      v.literal("travel"),
      v.literal("marketing"),
      v.literal("legal_accounting"),
      v.literal("training_costs"),
      v.literal("warehouse_costs"),
      v.literal("miscellaneous")
    ),
    description: v.string(),
    amount: v.number(),
    expense_date: v.number(),
    notes: v.optional(v.string()),
    is_recurring: v.boolean(),
    recurring_day: v.optional(v.number()),
    // Payment source tracking
    paid_from_asset_id: v.optional(v.id("superAdminAssets")),
    paid_from_sales_cash: v.optional(v.boolean()),
    // Flag to clear payment source
    clear_payment_source: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, clear_payment_source, ...updates } = args;

    // If paid from a manual asset, validate it exists and is a current asset
    if (updates.paid_from_asset_id) {
      const asset = await ctx.db.get(updates.paid_from_asset_id);
      if (!asset || !asset.is_active) {
        throw new Error("Selected asset not found or inactive");
      }
      if (asset.asset_type !== "current") {
        throw new Error("Can only pay expenses from current assets (cash, bank accounts)");
      }
    }

    // Build the patch object
    const patchData: Record<string, any> = {
      ...updates,
      updated_at: Date.now(),
    };

    // If clearing payment source, explicitly set both to undefined
    if (clear_payment_source) {
      patchData.paid_from_asset_id = undefined;
      patchData.paid_from_sales_cash = undefined;
    }

    await ctx.db.patch(id, patchData);
    return { success: true };
  },
});

// Delete Super Admin expense entry
export const deleteSuperAdminExpense = mutation({
  args: { id: v.id("superAdminExpenses") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// Deactivate Super Admin asset
export const deactivateSuperAdminAsset = mutation({
  args: { id: v.id("superAdminAssets") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { is_active: false, updated_at: Date.now() });
    return { success: true };
  },
});

// Deactivate Super Admin liability
export const deactivateSuperAdminLiability = mutation({
  args: { id: v.id("superAdminLiabilities") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { is_active: false, updated_at: Date.now() });
    return { success: true };
  },
});

// Update Super Admin asset entry
export const updateSuperAdminAsset = mutation({
  args: {
    id: v.id("superAdminAssets"),
    asset_type: v.union(v.literal("current"), v.literal("fixed"), v.literal("intangible")),
    category: v.union(
      v.literal("cash"),
      v.literal("bank_accounts"),
      v.literal("accounts_receivable"),
      v.literal("prepaid_expenses"),
      v.literal("equipment"),
      v.literal("furniture"),
      v.literal("vehicles"),
      v.literal("warehouse_equipment"),
      v.literal("software"),
      v.literal("trademarks"),
      v.literal("franchise_rights"),
      v.literal("deposits"),
      v.literal("other")
    ),
    name: v.string(),
    purchase_value: v.number(),
    current_value: v.number(),
    purchase_date: v.optional(v.number()),
    depreciation_rate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updated_at: Date.now(),
    });
    return { success: true };
  },
});

// Update Super Admin liability entry
export const updateSuperAdminLiability = mutation({
  args: {
    id: v.id("superAdminLiabilities"),
    liability_type: v.union(v.literal("current"), v.literal("long_term")),
    category: v.union(
      v.literal("accounts_payable"),
      v.literal("wages_payable"),
      v.literal("taxes_payable"),
      v.literal("credit_card"),
      v.literal("short_term_loan"),
      v.literal("accrued_expenses"),
      v.literal("bank_loan"),
      v.literal("equipment_financing"),
      v.literal("owner_loan"),
      v.literal("other")
    ),
    name: v.string(),
    original_amount: v.number(),
    current_balance: v.number(),
    interest_rate: v.optional(v.number()),
    due_date: v.optional(v.number()),
    creditor: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updated_at: Date.now(),
    });
    return { success: true };
  },
});

// Update Super Admin equity entry
export const updateSuperAdminEquity = mutation({
  args: {
    id: v.id("superAdminEquity"),
    equity_type: v.union(
      v.literal("owner_capital"),
      v.literal("drawings"),
      v.literal("additional_investment"),
      v.literal("other")
    ),
    description: v.string(),
    amount: v.number(),
    transaction_date: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updated_at: Date.now(),
    });
    return { success: true };
  },
});

// Delete Super Admin equity entry
export const deleteSuperAdminEquity = mutation({
  args: { id: v.id("superAdminEquity") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// Get royalty income summary for Super Admin
export const getRoyaltyIncomeSummary = query({
  args: {
    start_date: v.number(),
    end_date: v.number(),
  },
  handler: async (ctx, args) => {
    const royaltyPayments = await ctx.db.query("royaltyPayments").collect();

    // Filter paid royalties in the date range
    const paidRoyalties = royaltyPayments.filter(
      (r) =>
        r.status === "paid" &&
        r.paid_at &&
        r.paid_at >= args.start_date &&
        r.paid_at <= args.end_date
    );

    // Group by branch
    const branchRoyalties: Record<string, {
      branch_id: string;
      branch_name: string;
      total_collected: number;
      payment_count: number;
    }> = {};

    for (const royalty of paidRoyalties) {
      const branchId = royalty.branch_id as string;
      if (!branchRoyalties[branchId]) {
        const branch = await ctx.db.get(royalty.branch_id);
        branchRoyalties[branchId] = {
          branch_id: branchId,
          branch_name: branch?.name || "Unknown Branch",
          total_collected: 0,
          payment_count: 0,
        };
      }
      branchRoyalties[branchId].total_collected += royalty.amount || 0;
      branchRoyalties[branchId].payment_count += 1;
    }

    const byBranch = Object.values(branchRoyalties).sort(
      (a, b) => b.total_collected - a.total_collected
    );

    const totalCollected = byBranch.reduce((sum, b) => sum + b.total_collected, 0);

    // Get pending royalties
    const pendingRoyalties = royaltyPayments.filter(
      (r) => r.status === "due" || r.status === "overdue"
    );
    let totalPending = 0;
    for (const royalty of pendingRoyalties) {
      totalPending += royalty.total_due || royalty.amount || 0;
    }

    return {
      total_collected: totalCollected,
      total_pending: totalPending,
      payment_count: paidRoyalties.length,
      by_branch: byBranch,
      period: {
        start: args.start_date,
        end: args.end_date,
      },
    };
  },
});

// Preview sync - shows what would be synced without actually syncing
export const previewSyncBookings = query({
  args: {
    branch_id: v.id("branches"),
    start_date: v.number(),
    end_date: v.number(),
  },
  handler: async (ctx, args) => {
    // Get all completed bookings in the date range
    const allBookings = await ctx.db
      .query("bookings")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    // Filter by date range and completed status
    const completedBookings = allBookings.filter((booking) => {
      const bookingDate = new Date(booking.date).getTime();
      return (
        booking.status === "completed" &&
        bookingDate >= args.start_date &&
        bookingDate <= args.end_date
      );
    });

    // Get all existing transactions
    const existingTransactions = await ctx.db
      .query("transactions")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    // Create a set of existing transaction keys
    const existingKeys = new Set<string>();
    for (const tx of existingTransactions) {
      const dateKey = new Date(tx.createdAt).toDateString();
      const key = `${dateKey}-${tx.barber}-${tx.total_amount}`;
      existingKeys.add(key);
    }

    let toSync = 0;
    let alreadySynced = 0;
    let missingData = 0;
    let totalAmount = 0;

    const bookingsToSync: Array<{
      booking_code: string;
      date: string;
      amount: number;
      barber_id: string | null;
    }> = [];

    for (const booking of completedBookings) {
      if (!booking.barber) {
        missingData++;
        continue;
      }

      const bookingDateKey = new Date(booking.date).toDateString();
      const bookingKey = `${bookingDateKey}-${booking.barber}-${booking.final_price || booking.price}`;

      if (existingKeys.has(bookingKey)) {
        alreadySynced++;
        continue;
      }

      toSync++;
      totalAmount += booking.final_price || booking.price;
      bookingsToSync.push({
        booking_code: booking.booking_code,
        date: booking.date,
        amount: booking.final_price || booking.price,
        barber_id: booking.barber as string,
      });
    }

    return {
      total_completed_bookings: completedBookings.length,
      bookings_to_sync: toSync,
      already_synced: alreadySynced,
      missing_data: missingData,
      total_amount: totalAmount,
      bookings: bookingsToSync.slice(0, 20), // Show first 20 for preview
    };
  },
});

// ========================================
// SUPER ADMIN ACCOUNTING PERIODS
// ========================================
// Lock-in periods for financial reporting with frozen snapshots

// Get all accounting periods
export const getSuperAdminAccountingPeriods = query({
  args: {
    status: v.optional(v.union(
      v.literal("open"),
      v.literal("closing"),
      v.literal("closed")
    )),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let periods = await ctx.db
      .query("superAdminAccountingPeriods")
      .order("desc")
      .collect();

    if (args.status) {
      periods = periods.filter((p) => p.status === args.status);
    }

    if (args.limit) {
      periods = periods.slice(0, args.limit);
    }

    return periods;
  },
});

// Get current open period
export const getCurrentOpenSuperAdminPeriod = query({
  args: {},
  handler: async (ctx) => {
    const period = await ctx.db
      .query("superAdminAccountingPeriods")
      .filter((q) => q.eq(q.field("status"), "open"))
      .order("desc")
      .first();

    return period;
  },
});

// Get a single accounting period
export const getSuperAdminAccountingPeriod = query({
  args: {
    period_id: v.id("superAdminAccountingPeriods"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.period_id);
  },
});

// Create a new accounting period
export const createSuperAdminAccountingPeriod = mutation({
  args: {
    period_name: v.string(),
    period_type: v.union(
      v.literal("monthly"),
      v.literal("quarterly"),
      v.literal("yearly")
    ),
    start_date: v.number(),
    end_date: v.number(),
    notes: v.optional(v.string()),
    created_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check for overlapping periods
    const existingPeriods = await ctx.db
      .query("superAdminAccountingPeriods")
      .collect();

    for (const period of existingPeriods) {
      const overlaps =
        (args.start_date >= period.start_date && args.start_date <= period.end_date) ||
        (args.end_date >= period.start_date && args.end_date <= period.end_date) ||
        (args.start_date <= period.start_date && args.end_date >= period.end_date);

      if (overlaps) {
        throw new Error(
          `Period overlaps with existing period: ${period.period_name}`
        );
      }
    }

    const now = Date.now();

    const periodId = await ctx.db.insert("superAdminAccountingPeriods", {
      period_name: args.period_name,
      period_type: args.period_type,
      start_date: args.start_date,
      end_date: args.end_date,
      status: "open",
      notes: args.notes,
      created_by: args.created_by,
      created_at: now,
      updated_at: now,
    });

    return { success: true, period_id: periodId };
  },
});

// Helper function to calculate Super Admin period snapshot
async function calculateSuperAdminPeriodSnapshot(
  ctx: any,
  startDate: number,
  endDate: number
) {
  // Get all data needed for snapshot
  const royaltyPayments = await ctx.db.query("royaltyPayments").collect();
  const productOrders = await ctx.db.query("productOrders").collect();

  // --- CASH FROM PAID ROYALTIES in period ---
  const paidRoyaltiesInPeriod = royaltyPayments.filter(
    (r: any) =>
      r.status === "paid" &&
      r.paid_at &&
      r.paid_at >= startDate &&
      r.paid_at <= endDate
  );
  let royaltyCashReceived = 0;
  for (const royalty of paidRoyaltiesInPeriod) {
    royaltyCashReceived += royalty.amount || 0;
  }

  // --- CASH FROM PAID PRODUCT ORDERS in period ---
  const paidOrdersInPeriod = productOrders.filter((o: any) => {
    if (o.is_paid !== true) return false;
    const paymentDate = o.paid_at || o.received_at || o.created_at;
    return paymentDate >= startDate && paymentDate <= endDate;
  });
  let productOrderCashReceived = 0;
  for (const order of paidOrdersInPeriod) {
    productOrderCashReceived += order.total_amount || 0;
  }

  const totalSalesCash = royaltyCashReceived + productOrderCashReceived;

  // --- RECEIVABLES at period end ---
  const unpaidRoyalties = royaltyPayments.filter(
    (r: any) => r.status === "due" || r.status === "overdue"
  );
  let royaltyReceivables = 0;
  for (const royalty of unpaidRoyalties) {
    royaltyReceivables += royalty.total_due || royalty.amount || 0;
  }

  const unpaidOrders = productOrders.filter(
    (o: any) =>
      (o.status === "approved" || o.status === "shipped" || o.status === "received") &&
      o.is_paid !== true
  );
  let orderReceivables = 0;
  for (const order of unpaidOrders) {
    orderReceivables += order.total_amount || 0;
  }

  // --- MANUAL ASSETS ---
  const assets = await ctx.db
    .query("superAdminAssets")
    .filter((q: any) => q.eq(q.field("is_active"), true))
    .collect();

  // Separate manual assets by type (excluding cash which we'll calculate)
  let manualCurrentAssets = 0;
  let manualCash = 0;
  let fixedAssets = 0;
  let intangibleAssets = 0;

  for (const asset of assets) {
    const value = asset.current_value || 0;
    if (asset.asset_type === "current") {
      // Track manual cash separately
      if (asset.category === "cash" || asset.category === "bank_accounts") {
        manualCash += value;
      } else {
        manualCurrentAssets += value;
      }
    } else if (asset.asset_type === "fixed") {
      fixedAssets += value;
    } else {
      intangibleAssets += value;
    }
  }

  // --- LIABILITIES ---
  const liabilities = await ctx.db
    .query("superAdminLiabilities")
    .filter((q: any) => q.eq(q.field("is_active"), true))
    .collect();

  let currentLiabilities = 0;
  let longTermLiabilities = 0;

  for (const liability of liabilities) {
    const balance = liability.current_balance || 0;
    if (liability.liability_type === "current") {
      currentLiabilities += balance;
    } else {
      longTermLiabilities += balance;
    }
  }

  const totalLiabilities = currentLiabilities + longTermLiabilities;

  // --- EQUITY ---
  const equityEntries = await ctx.db.query("superAdminEquity").collect();
  const relevantEquity = equityEntries.filter((e: any) => e.transaction_date <= endDate);

  let manualEquity = 0;
  for (const entry of relevantEquity) {
    manualEquity += entry.amount || 0;
  }

  // --- RETAINED EARNINGS (cumulative profits up to period end) ---
  const allRoyaltyIncome = royaltyPayments
    .filter((r: any) => r.status === "paid" && r.paid_at && r.paid_at <= endDate)
    .reduce((sum: number, r: any) => sum + (r.amount || 0), 0);

  const allOrderIncome = productOrders
    .filter((o: any) => {
      if (o.is_paid !== true) return false;
      const paymentDate = o.paid_at || o.received_at || o.created_at;
      return paymentDate <= endDate;
    })
    .reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0);

  const allManualRevenue = await ctx.db.query("superAdminRevenue").collect();
  const manualRevenueTotal = allManualRevenue
    .filter((r: any) => r.revenue_date <= endDate)
    .reduce((sum: number, r: any) => sum + (r.amount || 0), 0);

  const allExpenses = await ctx.db.query("superAdminExpenses").collect();
  const expensesTotal = allExpenses
    .filter((e: any) => e.expense_date <= endDate)
    .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

  const retainedEarnings = allRoyaltyIncome + allOrderIncome + manualRevenueTotal - expensesTotal;
  const totalEquity = manualEquity + retainedEarnings;

  // --- P&L for period ---
  const periodManualRevenue = allManualRevenue
    .filter((r: any) => r.revenue_date >= startDate && r.revenue_date <= endDate)
    .reduce((sum: number, r: any) => sum + (r.amount || 0), 0);

  const periodExpenses = allExpenses
    .filter((e: any) => e.expense_date >= startDate && e.expense_date <= endDate)
    .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

  const totalRevenue = royaltyCashReceived + productOrderCashReceived + periodManualRevenue;
  const netIncome = totalRevenue - periodExpenses;

  // --- BALANCE SHEET BALANCING ---
  // The accounting equation: Assets = Liabilities + Equity
  //
  // When revenue is earned, it increases both:
  // 1. Retained Earnings (Equity side) - which we calculated
  // 2. Cash or Receivables (Asset side) - which must balance
  //
  // Non-cash assets = Fixed + Intangible + Manual Current (excl. cash) + Receivables
  const nonCashAssets = fixedAssets + intangibleAssets + manualCurrentAssets +
                        royaltyReceivables + orderReceivables;

  // Cash & Equivalents = (Liabilities + Equity) - Non-Cash Assets
  // This ensures the balance sheet always balances
  const cashAndEquivalents = (totalLiabilities + totalEquity) - nonCashAssets;

  // Current Assets = Non-cash current assets + Receivables + Cash & Equivalents
  const currentAssets = manualCurrentAssets + royaltyReceivables + orderReceivables + cashAndEquivalents;

  // --- TOTALS & RATIOS ---
  const totalAssets = currentAssets + fixedAssets + intangibleAssets;

  const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : undefined;
  const debtToEquityRatio = totalEquity > 0 ? totalLiabilities / totalEquity : undefined;
  const workingCapital = currentAssets - currentLiabilities;

  return {
    total_assets: totalAssets,
    total_liabilities: totalLiabilities,
    total_equity: totalEquity,
    current_assets: currentAssets,
    fixed_assets: fixedAssets,
    intangible_assets: intangibleAssets,
    current_liabilities: currentLiabilities,
    long_term_liabilities: longTermLiabilities,
    retained_earnings: retainedEarnings,
    cash_and_equivalents: cashAndEquivalents,
    royalty_cash_received: royaltyCashReceived,
    product_order_cash_received: productOrderCashReceived,
    total_sales_cash: totalSalesCash,
    royalty_receivables: royaltyReceivables,
    order_receivables: orderReceivables,
    total_revenue: totalRevenue,
    total_expenses: periodExpenses,
    net_income: netIncome,
    working_capital: workingCapital,
    current_ratio: currentRatio,
    debt_to_equity_ratio: debtToEquityRatio,
  };
}

// Mark period as "closing" (under review)
export const markSuperAdminPeriodClosing = mutation({
  args: {
    period_id: v.id("superAdminAccountingPeriods"),
  },
  handler: async (ctx, args) => {
    const period = await ctx.db.get(args.period_id);
    if (!period) {
      throw new Error("Period not found");
    }

    if (period.status === "closed") {
      throw new Error("Cannot modify a closed period");
    }

    await ctx.db.patch(args.period_id, {
      status: "closing",
      updated_at: Date.now(),
    });

    return { success: true };
  },
});

// Close an accounting period (creates frozen snapshot)
export const closeSuperAdminAccountingPeriod = mutation({
  args: {
    period_id: v.id("superAdminAccountingPeriods"),
    notes: v.optional(v.string()),
    closed_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const period = await ctx.db.get(args.period_id);
    if (!period) {
      throw new Error("Period not found");
    }

    if (period.status === "closed") {
      throw new Error("Period is already closed");
    }

    // Calculate and freeze the snapshot
    const snapshot = await calculateSuperAdminPeriodSnapshot(
      ctx,
      period.start_date,
      period.end_date
    );

    const now = Date.now();

    await ctx.db.patch(args.period_id, {
      status: "closed",
      snapshot: snapshot,
      notes: args.notes || period.notes,
      closed_by: args.closed_by,
      closed_at: now,
      updated_at: now,
    });

    // Also create a balance sheet snapshot for the historical record
    await ctx.db.insert("superAdminBalanceSheetSnapshots", {
      snapshot_date: period.end_date,
      period_id: args.period_id,
      total_assets: snapshot.total_assets,
      total_liabilities: snapshot.total_liabilities,
      total_equity: snapshot.total_equity,
      current_assets: snapshot.current_assets,
      fixed_assets: snapshot.fixed_assets,
      intangible_assets: snapshot.intangible_assets,
      current_liabilities: snapshot.current_liabilities,
      long_term_liabilities: snapshot.long_term_liabilities,
      cash_and_equivalents: snapshot.cash_and_equivalents,
      royalty_cash_received: snapshot.royalty_cash_received,
      product_order_cash_received: snapshot.product_order_cash_received,
      total_sales_cash: snapshot.total_sales_cash,
      working_capital: snapshot.working_capital,
      current_ratio: snapshot.current_ratio,
      debt_to_equity_ratio: snapshot.debt_to_equity_ratio,
      notes: `Period Close: ${period.period_name}`,
      created_by: args.closed_by,
      created_at: now,
    });

    return { success: true, snapshot };
  },
});

// Reopen a closed period (requires confirmation)
export const reopenSuperAdminAccountingPeriod = mutation({
  args: {
    period_id: v.id("superAdminAccountingPeriods"),
    reason: v.string(),
    reopened_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const period = await ctx.db.get(args.period_id);
    if (!period) {
      throw new Error("Period not found");
    }

    if (period.status !== "closed") {
      throw new Error("Only closed periods can be reopened");
    }

    const now = Date.now();

    await ctx.db.patch(args.period_id, {
      status: "open",
      notes: `${period.notes || ""}\n\n[REOPENED ${new Date(now).toISOString()}] Reason: ${args.reason}`,
      updated_at: now,
    });

    return { success: true };
  },
});

// Delete an accounting period (only if open)
export const deleteSuperAdminAccountingPeriod = mutation({
  args: {
    period_id: v.id("superAdminAccountingPeriods"),
  },
  handler: async (ctx, args) => {
    const period = await ctx.db.get(args.period_id);
    if (!period) {
      throw new Error("Period not found");
    }

    if (period.status === "closed") {
      throw new Error("Cannot delete a closed period");
    }

    await ctx.db.delete(args.period_id);

    return { success: true };
  },
});

// Get balance sheet snapshots
export const getSuperAdminBalanceSheetSnapshots = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let snapshots = await ctx.db
      .query("superAdminBalanceSheetSnapshots")
      .order("desc")
      .collect();

    if (args.limit) {
      snapshots = snapshots.slice(0, args.limit);
    }

    return snapshots;
  },
});

// Compare two periods
export const compareSuperAdminPeriods = query({
  args: {
    period_id_1: v.id("superAdminAccountingPeriods"),
    period_id_2: v.id("superAdminAccountingPeriods"),
  },
  handler: async (ctx, args) => {
    const period1 = await ctx.db.get(args.period_id_1);
    const period2 = await ctx.db.get(args.period_id_2);

    if (!period1 || !period2) {
      throw new Error("One or both periods not found");
    }

    if (!period1.snapshot || !period2.snapshot) {
      throw new Error("Both periods must be closed to compare");
    }

    const s1 = period1.snapshot;
    const s2 = period2.snapshot;

    // Calculate changes with full detail (matching BA format)
    const calculateChange = (v1: number, v2: number) => ({
      value_1: v1,
      value_2: v2,
      change: v2 - v1,
      change_percent: v1 !== 0 ? ((v2 - v1) / Math.abs(v1)) * 100 : null,
    });

    return {
      period_1: {
        id: period1._id,
        name: period1.period_name,
        start_date: period1.start_date,
        end_date: period1.end_date,
      },
      period_2: {
        id: period2._id,
        name: period2.period_name,
        start_date: period2.start_date,
        end_date: period2.end_date,
      },
      comparison: {
        total_assets: calculateChange(s1.total_assets, s2.total_assets),
        total_liabilities: calculateChange(s1.total_liabilities, s2.total_liabilities),
        total_equity: calculateChange(s1.total_equity, s2.total_equity),
        revenue: calculateChange(s1.total_revenue, s2.total_revenue),
        expenses: calculateChange(s1.total_expenses, s2.total_expenses),
        net_income: calculateChange(s1.net_income, s2.net_income),
        working_capital: calculateChange(s1.working_capital, s2.working_capital),
      },
    };
  },
});

// Generate suggested periods for Super Admin (helper for UI)
export const getSuggestedPeriodsForSuperAdmin = query({
  args: {
    year: v.number(),
  },
  handler: async (ctx, args) => {
    const existingPeriods = await ctx.db
      .query("superAdminAccountingPeriods")
      .collect();

    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    const suggestions = [];

    // Monthly periods
    for (let i = 0; i < 12; i++) {
      const startDate = new Date(args.year, i, 1).getTime();
      const endDate = new Date(args.year, i + 1, 0, 23, 59, 59, 999).getTime();

      const exists = existingPeriods.some(
        (p) => p.start_date === startDate && p.end_date === endDate
      );

      suggestions.push({
        period_name: `${months[i]} ${args.year}`,
        period_type: "monthly" as const,
        start_date: startDate,
        end_date: endDate,
        exists,
      });
    }

    // Quarterly periods
    const quarters = [
      { name: "Q1", months: [0, 2] },
      { name: "Q2", months: [3, 5] },
      { name: "Q3", months: [6, 8] },
      { name: "Q4", months: [9, 11] },
    ];

    for (const q of quarters) {
      const startDate = new Date(args.year, q.months[0], 1).getTime();
      const endDate = new Date(args.year, q.months[1] + 1, 0, 23, 59, 59, 999).getTime();

      const exists = existingPeriods.some(
        (p) => p.start_date === startDate && p.end_date === endDate
      );

      suggestions.push({
        period_name: `${q.name} ${args.year}`,
        period_type: "quarterly" as const,
        start_date: startDate,
        end_date: endDate,
        exists,
      });
    }

    // Yearly period
    const yearStart = new Date(args.year, 0, 1).getTime();
    const yearEnd = new Date(args.year, 11, 31, 23, 59, 59, 999).getTime();

    const yearExists = existingPeriods.some(
      (p) => p.start_date === yearStart && p.end_date === yearEnd
    );

    suggestions.push({
      period_name: `FY ${args.year}`,
      period_type: "yearly" as const,
      start_date: yearStart,
      end_date: yearEnd,
      exists: yearExists,
    });

    return suggestions;
  },
});
