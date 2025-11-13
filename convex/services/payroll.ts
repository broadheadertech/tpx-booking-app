import { v } from "convex/values";
import { mutation, query, action } from "../_generated/server";
import { api } from "../_generated/api";
import { throwUserError, ERROR_CODES, validateInput } from "../utils/errors";

// PAYROLL SETTINGS MANAGEMENT

// Get payroll settings by branch
export const getPayrollSettingsByBranch = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("payroll_settings")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .filter((q) => q.eq(q.field("is_active"), true))
      .first();

    return settings;
  },
});

// Create or update payroll settings
export const createOrUpdatePayrollSettings = mutation({
  args: {
    branch_id: v.id("branches"),
    default_commission_rate: v.number(),
    payout_frequency: v.union(
      v.literal("weekly"),
      v.literal("bi_weekly"),
      v.literal("monthly"),
    ),
    payout_day: v.number(),
    tax_rate: v.optional(v.number()),
    created_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Validate commission rate
    if (
      args.default_commission_rate < 0 ||
      args.default_commission_rate > 100
    ) {
      throwUserError(
        ERROR_CODES.INVALID_INPUT,
        "Commission rate must be between 0 and 100",
      );
    }

    // Validate payout day based on frequency
    if (
      args.payout_frequency === "weekly" &&
      (args.payout_day < 0 || args.payout_day > 6)
    ) {
      throwUserError(
        ERROR_CODES.INVALID_INPUT,
        "Weekly payout day must be between 0 (Sunday) and 6 (Saturday)",
      );
    }
    if (
      args.payout_frequency === "monthly" &&
      (args.payout_day < 1 || args.payout_day > 31)
    ) {
      throwUserError(
        ERROR_CODES.INVALID_INPUT,
        "Monthly payout day must be between 1 and 31",
      );
    }

    const timestamp = Date.now();

    // Check if settings already exist
    const existingSettings = await ctx.db
      .query("payroll_settings")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .filter((q) => q.eq(q.field("is_active"), true))
      .first();

    if (existingSettings) {
      // Update existing settings
      await ctx.db.patch(existingSettings._id, {
        default_commission_rate: args.default_commission_rate,
        payout_frequency: args.payout_frequency,
        payout_day: args.payout_day,
        tax_rate: args.tax_rate,
        updatedAt: timestamp,
      });
      return existingSettings._id;
    } else {
      // Create new settings
      return await ctx.db.insert("payroll_settings", {
        branch_id: args.branch_id,
        default_commission_rate: args.default_commission_rate,
        payout_frequency: args.payout_frequency,
        payout_day: args.payout_day,
        tax_rate: args.tax_rate || 0,
        is_active: true,
        created_by: args.created_by,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
  },
});

// BARBER COMMISSION RATES MANAGEMENT

// Get barber commission rate (current active rate)
export const getBarberCommissionRate = query({
  args: { barber_id: v.id("barbers") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const commissionRate = await ctx.db
      .query("barber_commission_rates")
      .withIndex("by_barber_active", (q) =>
        q.eq("barber_id", args.barber_id).eq("is_active", true),
      )
      .filter((q) =>
        q.and(
          q.lte(q.field("effective_from"), now),
          q.or(
            q.eq(q.field("effective_until"), undefined),
            q.gt(q.field("effective_until"), now),
          ),
        ),
      )
      .first();

    return commissionRate;
  },
});

// Set barber commission rate
export const setBarberCommissionRate = mutation({
  args: {
    barber_id: v.id("barbers"),
    branch_id: v.id("branches"),
    commission_rate: v.number(),
    effective_from: v.optional(v.number()),
    created_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    if (args.commission_rate < 0 || args.commission_rate > 100) {
      throwUserError(
        ERROR_CODES.INVALID_INPUT,
        "Commission rate must be between 0 and 100",
      );
    }

    const timestamp = Date.now();
    const effectiveFrom = args.effective_from || timestamp;

    // Deactivate any existing active rates
    const existingRates = await ctx.db
      .query("barber_commission_rates")
      .withIndex("by_barber_active", (q) =>
        q.eq("barber_id", args.barber_id).eq("is_active", true),
      )
      .collect();

    for (const rate of existingRates) {
      await ctx.db.patch(rate._id, {
        is_active: false,
        effective_until: effectiveFrom,
        updatedAt: timestamp,
      });
    }

    // Create new commission rate
    return await ctx.db.insert("barber_commission_rates", {
      barber_id: args.barber_id,
      branch_id: args.branch_id,
      commission_rate: args.commission_rate,
      effective_from: effectiveFrom,
      is_active: true,
      created_by: args.created_by,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  },
});

// PAYROLL CALCULATION UTILITIES

// Calculate earnings for a barber in a given period
export const calculateBarberEarnings = query({
  args: {
    barber_id: v.id("barbers"),
    period_start: v.number(),
    period_end: v.number(),
  },
  handler: async (ctx, args) => {
    // Get barber details
    const barber = await ctx.db.get(args.barber_id);
    if (!barber) {
      throwUserError(ERROR_CODES.BARBER_NOT_FOUND);
    }

    // Get branch payroll settings
    const payrollSettings = await ctx.db
      .query("payroll_settings")
      .withIndex("by_branch", (q) => q.eq("branch_id", barber.branch_id))
      .filter((q) => q.eq(q.field("is_active"), true))
      .first();

    // Get ALL transactions for this barber, then filter by period
    const allTransactions = await ctx.db
      .query("transactions")
      .withIndex("by_barber", (q) => q.eq("barber", args.barber_id))
      .collect();

    // Filter transactions that were completed in the period
    const transactions = allTransactions.filter((transaction) => {
      const isCompleted = transaction.payment_status === "completed";
      const isInPeriod =
        transaction.createdAt >= args.period_start &&
        transaction.createdAt <= args.period_end;
      return isCompleted && isInPeriod;
    });

    // Load per-service commission rates (active during period) for the barber's branch
    const serviceRates = await ctx.db
      .query("service_commission_rates")
      .withIndex("by_branch", (q) => q.eq("branch_id", barber.branch_id))
      .filter((q) =>
        q.and(
          q.eq(q.field("is_active"), true),
          q.lte(q.field("effective_from"), args.period_end),
          q.or(
            q.eq(q.field("effective_until"), undefined),
            q.gt(q.field("effective_until"), args.period_start),
          ),
        ),
      )
      .collect();

    const serviceRateMap = new Map<string, number>();
    for (const r of serviceRates) {
      // later entries can override; assume latest by updatedAt precedence if needed
      // Convex doesn't let us sort here, but typical dataset small
      // Use as-is
      // @ts-ignore
      serviceRateMap.set(r.service_id as string, r.commission_rate);
    }

    // Fallback commission rate if a service has no specific rate
    const barberCommissionRate = await ctx.db
      .query("barber_commission_rates")
      .withIndex("by_barber_active", (q) =>
        q.eq("barber_id", args.barber_id).eq("is_active", true),
      )
      .filter((q) =>
        q.and(
          q.lte(q.field("effective_from"), args.period_end),
          q.or(
            q.eq(q.field("effective_until"), undefined),
            q.gt(q.field("effective_until"), args.period_start),
          ),
        ),
      )
      .first();

    const fallbackRate =
      barberCommissionRate?.commission_rate ||
      payrollSettings?.default_commission_rate ||
      10;

    // Compute service-level totals from completed bookings within the period
    let totalServices = 0;
    let totalServiceRevenue = 0;
    let serviceCommission = 0;
    // We'll compute days worked from bookings (per request)

    // We'll fill bookingsInPeriod below; use it for totals
    const totalTransactions = transactions.length;
    const totalTransactionRevenue = 0; // No separate transaction revenue; accounted in bookings
    const transactionCommission = 0; // No separate transaction commission

    // Load product commission rates for this branch
    const productRates = await ctx.db
      .query("product_commission_rates")
      .withIndex("by_branch", (q) => q.eq("branch_id", barber.branch_id))
      .filter((q) =>
        q.and(
          q.eq(q.field("is_active"), true),
          q.lte(q.field("effective_from"), args.period_end),
          q.or(
            q.eq(q.field("effective_until"), undefined),
            q.gt(q.field("effective_until"), args.period_start),
          ),
        ),
      )
      .collect();

    const productRateMap = new Map<string, { type: string, rate?: number, amount?: number }>();
    for (const r of productRates) {
      // @ts-ignore
      productRateMap.set(r.product_id as string, {
        type: r.commission_type,
        rate: r.commission_rate,
        amount: r.fixed_amount
      });
    }

    // Calculate product commissions from transactions
    let totalProducts = 0;
    let totalProductRevenue = 0;
    let productCommission = 0;
    const productsDetail: any[] = [];

    for (const transaction of transactions) {
      if (transaction.products) {
        for (const product of transaction.products) {
          totalProducts += product.quantity;
          const productRevenue = product.price * product.quantity;
          totalProductRevenue += productRevenue;

          // Calculate commission for this product based on type
          const productConfig = productRateMap.get(product.product_id);
          let productComm = 0;
          let commissionRate = fallbackRate;
          let commissionType = "percentage";
          
          if (productConfig) {
            commissionType = productConfig.type;
            if (productConfig.type === "fixed_amount" && productConfig.amount !== undefined) {
              // Fixed amount per unit
              productComm = productConfig.amount * product.quantity;
              commissionRate = productConfig.amount; // Store fixed amount in rate field for display
            } else if (productConfig.type === "percentage" && productConfig.rate !== undefined) {
              // Percentage of revenue
              productComm = (productRevenue * productConfig.rate) / 100;
              commissionRate = productConfig.rate;
            } else {
              // Fallback to percentage
              productComm = (productRevenue * fallbackRate) / 100;
            }
          } else {
            // No specific rate, use fallback percentage
            productComm = (productRevenue * fallbackRate) / 100;
          }
          
          productCommission += productComm;

          // Store product details for reporting
          productsDetail.push({
            id: transaction._id,
            transaction_id: transaction.transaction_id,
            date: transaction.createdAt,
            product_name: product.product_name,
            quantity: product.quantity,
            price: product.price,
            total_amount: productRevenue,
            customer_name: transaction.customer_name || "Walk-in",
            commission_type: commissionType,
            commission_rate: commissionRate,
            commission_amount: productComm,
          });
        }
      }
    }

    // Per-day commission and daily rate calculation
    // Load bookings for the barber and group by date
    const allBookings = await ctx.db
      .query("bookings")
      .withIndex("by_barber", (q) => q.eq("barber", args.barber_id))
      .collect();

    // Group bookings by date for per-day calculation
    const bookingsByDate = new Map<string, any[]>();
    const dailyCommissions = new Map<string, number>(); // Track commission earned per day
    const bookingsInPeriod: any[] = [];

    // Also track product commissions by date for daily pay calculation
    const dailyProductCommissions = new Map<string, number>();
    for (const productDetail of productsDetail) {
      const dateKey = new Date(productDetail.date).toISOString().split("T")[0];
      const currentDayProductComm = dailyProductCommissions.get(dateKey) || 0;
      dailyProductCommissions.set(
        dateKey,
        currentDayProductComm + productDetail.commission_amount,
      );
    }

    for (const b of allBookings) {
      const completed = b.status === "completed";
      const paid = b.payment_status === "paid";

      // Convert booking date string to timestamp for period comparison
      // Use booking date instead of updatedAt to ensure payroll reflects actual service dates
      let bookingDateTimestamp = b.updatedAt; // fallback to updatedAt
      if (b.date) {
        try {
          // Convert date string (e.g., "2024-01-15") to timestamp at start of day
          const bookingDate = new Date(b.date + "T00:00:00.000Z");
          bookingDateTimestamp = bookingDate.getTime();
        } catch (error) {
          // If date parsing fails, fall back to updatedAt
          console.warn(
            "Failed to parse booking date:",
            b.date,
            "using updatedAt instead",
          );
        }
      }

      const inPeriod =
        bookingDateTimestamp >= args.period_start &&
        bookingDateTimestamp <= args.period_end;

      if (completed && paid && inPeriod) {
        const dateKey =
          b.date ||
          new Date(
            new Date(b.updatedAt).toISOString().split("T")[0],
          ).toISOString();

        if (!bookingsByDate.has(dateKey)) {
          bookingsByDate.set(dateKey, []);
        }

        // enrich with details for printing/snapshots
        const service = await ctx.db.get(b.service);
        let customerName = b.customer_name || "";
        if (!customerName && b.customer) {
          const customer = await ctx.db.get(b.customer);
          customerName =
            (customer as any)?.nickname ||
            (customer as any)?.username ||
            (customer as any)?.email ||
            "Customer";
        }

        // Store booking details
        const enrichedBooking = {
          id: b._id,
          booking_code: b.booking_code,
          date: b.date,
          time: b.time,
          price: b.price,
          service_name: service?.name || "Service",
          customer_name: customerName,
          updatedAt: b.updatedAt,
        };

        bookingsByDate.get(dateKey)!.push(enrichedBooking);
        bookingsInPeriod.push(enrichedBooking);

        totalServices += 1;
        totalServiceRevenue += b.price || 0;

        // Calculate commission for this booking
        const serviceRate =
          serviceRateMap.get(String(b.service)) ?? fallbackRate;
        const bookingCommission = ((b.price || 0) * (serviceRate || 0)) / 100;
        serviceCommission += bookingCommission;

        // Track commission per day for correct daily pay calculation
        const currentDayCommission = dailyCommissions.get(dateKey) || 0;
        dailyCommissions.set(dateKey, currentDayCommission + bookingCommission);
      }
    }

    // Get active daily rate for barber (prefer a rate effective within the period; if none, fall back to current active)
    let barberDailyRate = await ctx.db
      .query("barber_daily_rates")
      .withIndex("by_barber_active", (q) =>
        q.eq("barber_id", args.barber_id).eq("is_active", true),
      )
      .filter((q) =>
        q.and(
          q.lte(q.field("effective_from"), args.period_end),
          q.or(
            q.eq(q.field("effective_until"), undefined),
            q.gt(q.field("effective_until"), args.period_start),
          ),
        ),
      )
      .first();

    if (!barberDailyRate) {
      // No rate within period; use the currently active rate as a sensible fallback
      barberDailyRate = await ctx.db
        .query("barber_daily_rates")
        .withIndex("by_barber_active", (q) =>
          q.eq("barber_id", args.barber_id).eq("is_active", true),
        )
        .first();
    }

    const dailyRate = barberDailyRate?.daily_rate || 0;
    console.log(
      `Barber ${barber.full_name}: barberDailyRate =`,
      barberDailyRate,
      `dailyRate = ${dailyRate}`,
    );

    // PAYROLL CALCULATION RULES:
    // 
    // 1. Service Earnings: Compare service commission vs daily rate (take higher)
    //    daily_service_pay = max(day_service_commission, daily_rate)
    //
    // 2. Product Commission: ADDED as bonus on top of service pay
    //    daily_total_pay = daily_service_pay + day_product_commission
    //
    // 3. Final Salary: Sum all daily pays across the period
    //
    // Example: Daily Rate = ₱500
    // Day 1: Service Commission ₱0, Product Commission ₱100
    //   → Service Pay = max(₱0, ₱500) = ₱500
    //   → Total Pay = ₱500 + ₱100 = ₱600 ✓
    //
    // Day 2: Service Commission ₱700, Product Commission ₱50
    //   → Service Pay = max(₱700, ₱500) = ₱700
    //   → Total Pay = ₱700 + ₱50 = ₱750 ✓
    //
    // Final Salary = ₱600 + ₱750 = ₱1,350
    //
    // NOTE: Product commission is always added as bonus, not compared with daily rate

    // Merge booking dates and product transaction dates for complete day coverage
    const allWorkDates = new Set([
      ...dailyCommissions.keys(),
      ...dailyProductCommissions.keys(),
    ]);

    let finalSalary = 0;
    if (totalServices > 0 || totalProducts > 0) {
      // Debug logging to check daily rates and commissions
      console.log(
        `Barber ${barber.full_name}: dailyRate = ${dailyRate}, days worked = ${allWorkDates.size}`,
      );
      for (const dateKey of allWorkDates) {
        const dayServiceCommission = dailyCommissions.get(dateKey) || 0;
        const dayProductCommission = dailyProductCommissions.get(dateKey) || 0;
        
        // NEW LOGIC: Product commission is ADDED on top of daily salary
        // Compare service commission vs daily rate, then add product commission
        const dayServicePay = Math.max(dayServiceCommission, dailyRate);
        const dayPay = dayServicePay + dayProductCommission;
        
        console.log(
          `Date ${dateKey}: service comm = ${dayServiceCommission}, product comm = ${dayProductCommission}, service pay = ${dayServicePay}, final dayPay (with product bonus) = ${dayPay}`,
        );
        finalSalary += dayPay;
      }
      console.log(`Total finalSalary = ${finalSalary}`);
    } else {
      // No bookings or products = no salary
      finalSalary = 0;
    }

    const daysWorked = allWorkDates.size;

    // Keep raw service commission for reference
    const grossCommission = serviceCommission + productCommission; // Total commission from services + products

    // Calculate deductions based on the final salary total
    const taxRate = payrollSettings?.tax_rate || 0;
    const taxDeduction = (finalSalary * taxRate) / 100;
    const totalDeductions = taxDeduction;

    // Net pay equals the final salary total minus deductions
    const netPay = finalSalary - totalDeductions;

    return {
      barber_id: args.barber_id,
      barber_name: barber.full_name,
      commission_rate: fallbackRate,

      // Service earnings
      total_services: totalServices,
      total_service_revenue: totalServiceRevenue,
      service_commission: serviceCommission,

      // Product earnings
      total_products: totalProducts,
      total_product_revenue: totalProductRevenue,
      product_commission: productCommission,

      // Transaction breakdown (legacy fields retained for UI; set to 0)
      total_transactions: totalTransactions,
      total_transaction_revenue: totalTransactionRevenue,
      transaction_commission: transactionCommission,

      // Daily rate
      daily_rate: dailyRate,
      days_worked: daysWorked,
      daily_pay: finalSalary,

      // Totals
      gross_commission: grossCommission,
      tax_deduction: taxDeduction,
      other_deductions: 0,
      total_deductions: totalDeductions,
      net_pay: netPay,

      // Details for verification
      bookings_detail: bookingsInPeriod,
      products_detail: productsDetail,
      transactions: transactions.map((t) => ({
        id: t._id,
        transaction_id: t.transaction_id,
        receipt_number: t.receipt_number,
        total_amount: t.total_amount,
        service_revenue: t.services.reduce(
          (sum, s) => sum + s.price * s.quantity,
          0,
        ),
        product_revenue: (t.products || []).reduce(
          (sum, p) => sum + p.price * p.quantity,
          0,
        ),
      })),
    };
  },
});

// SERVICE COMMISSION RATES
export const getServiceCommissionRatesByBranch = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("service_commission_rates")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();
  },
});

// PRODUCT COMMISSION RATES
export const getProductCommissionRatesByBranch = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("product_commission_rates")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();
  },
});

export const setProductCommissionRate = mutation({
  args: {
    branch_id: v.id("branches"),
    product_id: v.id("products"),
    commission_type: v.union(v.literal("percentage"), v.literal("fixed_amount")),
    commission_rate: v.optional(v.number()),
    fixed_amount: v.optional(v.number()),
    effective_from: v.optional(v.number()),
    created_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Validate based on commission type
    if (args.commission_type === "percentage") {
      if (args.commission_rate === undefined || args.commission_rate < 0 || args.commission_rate > 100) {
        throwUserError(
          ERROR_CODES.INVALID_INPUT,
          "Commission rate must be between 0 and 100 for percentage type",
        );
      }
    } else if (args.commission_type === "fixed_amount") {
      if (args.fixed_amount === undefined || args.fixed_amount < 0) {
        throwUserError(
          ERROR_CODES.INVALID_INPUT,
          "Fixed amount must be a non-negative number",
        );
      }
    }

    const now = Date.now();
    const effectiveFrom = args.effective_from || now;

    // Deactivate existing active rates for same product in branch
    const existing = await ctx.db
      .query("product_commission_rates")
      .withIndex("by_branch_product", (q) =>
        q.eq("branch_id", args.branch_id).eq("product_id", args.product_id),
      )
      .filter((q) => q.eq(q.field("is_active"), true))
      .collect();

    for (const r of existing) {
      await ctx.db.patch(r._id, {
        is_active: false,
        effective_until: effectiveFrom,
        updatedAt: now,
      });
    }

    return await ctx.db.insert("product_commission_rates", {
      branch_id: args.branch_id,
      product_id: args.product_id,
      commission_type: args.commission_type,
      commission_rate: args.commission_rate,
      fixed_amount: args.fixed_amount,
      effective_from: effectiveFrom,
      is_active: true,
      created_by: args.created_by,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getBarberCommissionRatesByBranch = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("barber_commission_rates")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();
  },
});

export const setServiceCommissionRate = mutation({
  args: {
    branch_id: v.id("branches"),
    service_id: v.id("services"),
    commission_rate: v.number(),
    effective_from: v.optional(v.number()),
    created_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    if (args.commission_rate < 0 || args.commission_rate > 100) {
      throwUserError(
        ERROR_CODES.INVALID_INPUT,
        "Commission rate must be between 0 and 100",
      );
    }
    const now = Date.now();
    const effectiveFrom = args.effective_from || now;

    // Deactivate existing active rates for same service in branch
    const existing = await ctx.db
      .query("service_commission_rates")
      .withIndex("by_branch_service", (q) =>
        q.eq("branch_id", args.branch_id).eq("service_id", args.service_id),
      )
      .filter((q) => q.eq(q.field("is_active"), true))
      .collect();

    for (const r of existing) {
      await ctx.db.patch(r._id, {
        is_active: false,
        effective_until: effectiveFrom,
        updatedAt: now,
      });
    }

    return await ctx.db.insert("service_commission_rates", {
      branch_id: args.branch_id,
      service_id: args.service_id,
      commission_rate: args.commission_rate,
      effective_from: effectiveFrom,
      is_active: true,
      created_by: args.created_by,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// BARBER DAILY RATES
export const getBarberDailyRate = query({
  args: { barber_id: v.id("barbers") },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db
      .query("barber_daily_rates")
      .withIndex("by_barber_active", (q) =>
        q.eq("barber_id", args.barber_id).eq("is_active", true),
      )
      .filter((q) =>
        q.and(
          q.lte(q.field("effective_from"), now),
          q.or(
            q.eq(q.field("effective_until"), undefined),
            q.gt(q.field("effective_until"), now),
          ),
        ),
      )
      .first();
  },
});

export const setBarberDailyRate = mutation({
  args: {
    barber_id: v.id("barbers"),
    branch_id: v.id("branches"),
    daily_rate: v.number(),
    effective_from: v.optional(v.number()),
    created_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    if (args.daily_rate < 0) {
      throwUserError(
        ERROR_CODES.INVALID_INPUT,
        "Daily rate must be non-negative",
      );
    }
    const now = Date.now();
    const effectiveFrom = args.effective_from || now;

    // Deactivate existing active daily rates
    const existing = await ctx.db
      .query("barber_daily_rates")
      .withIndex("by_barber_active", (q) =>
        q.eq("barber_id", args.barber_id).eq("is_active", true),
      )
      .collect();
    for (const r of existing) {
      await ctx.db.patch(r._id, {
        is_active: false,
        effective_until: effectiveFrom,
        updatedAt: now,
      });
    }

    return await ctx.db.insert("barber_daily_rates", {
      barber_id: args.barber_id,
      branch_id: args.branch_id,
      daily_rate: args.daily_rate,
      effective_from: effectiveFrom,
      is_active: true,
      created_by: args.created_by,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getBarberDailyRatesByBranch = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("barber_daily_rates")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();
  },
});

// BOOKINGS VIEW FOR PAYROLL (display only)
export const getBookingsByBarberAndPeriod = query({
  args: {
    barber_id: v.id("barbers"),
    period_start: v.number(),
    period_end: v.number(),
  },
  handler: async (ctx, args) => {
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_barber", (q) => q.eq("barber", args.barber_id))
      .collect();

    const filtered = bookings.filter((b) => {
      const completed = b.status === "completed";
      const paid = b.payment_status === "paid";

      // Convert booking date string to timestamp for period comparison
      // Use booking date instead of updatedAt to ensure payroll reflects actual service dates
      let bookingDateTimestamp = b.updatedAt; // fallback to updatedAt
      if (b.date) {
        try {
          // Convert date string (e.g., "2024-01-15") to timestamp at start of day
          const bookingDate = new Date(b.date + "T00:00:00.000Z");
          bookingDateTimestamp = bookingDate.getTime();
        } catch (error) {
          // If date parsing fails, fall back to updatedAt
          console.warn(
            "Failed to parse booking date:",
            b.date,
            "using updatedAt instead",
          );
        }
      }

      return (
        completed &&
        paid &&
        bookingDateTimestamp >= args.period_start &&
        bookingDateTimestamp <= args.period_end
      );
    });

    // Populate service + customer display info
    const withDetails = await Promise.all(
      filtered.map(async (b) => {
        const service = await ctx.db.get(b.service);
        let customerName = b.customer_name || "";
        if (!customerName && b.customer) {
          const customer = await ctx.db.get(b.customer);
          customerName =
            customer?.nickname ||
            customer?.username ||
            customer?.email ||
            "Customer";
        }
        return {
          id: b._id,
          booking_code: b.booking_code,
          date: b.date,
          time: b.time,
          price: b.price,
          service_id: b.service,
          service_name: service?.name || "Service",
          customer_name: customerName,
          updatedAt: b.updatedAt,
        };
      }),
    );

    return withDetails;
  },
});

// ACTION: Obtain bookings for print (imperative use from client)
export const getBookingsForPrint = action({
  args: {
    barber_id: v.id("barbers"),
    period_start: v.number(),
    period_end: v.number(),
  },
  handler: async (ctx, args) => {
    // Reuse the query logic by invoking it via runQuery
    const items = await ctx.runQuery(
      api.services.payroll.getBookingsByBarberAndPeriod,
      args as any,
    );
    return items || [];
  },
});

// ACTION: Grouped bookings with per-date totals and commissions for print
export const getBookingsSummaryForPrint = action({
  args: {
    barber_id: v.id("barbers"),
    period_start: v.number(),
    period_end: v.number(),
  },
  handler: async (ctx, args) => {
    // Barber and branch
    const barber = await ctx.runQuery(api.services.barbers.getBarberById, {
      id: args.barber_id as any,
    });
    if (!barber)
      return { groups: [], grandTotalAmount: 0, grandTotalCommission: 0 };

    // We base final salary on daily total sales; no percentage commission required here

    // Bookings
    const items = await ctx.runQuery(
      api.services.payroll.getBookingsByBarberAndPeriod,
      args as any,
    );

    // Group by date
    const groupsMap = new Map<string, any>();
    for (const b of items || []) {
      const key = b.date || new Date(b.updatedAt).toISOString().split("T")[0];
      const sale = b.price || 0;
      if (!groupsMap.has(key))
        groupsMap.set(key, {
          date: key,
          rows: [],
          totalAmount: 0,
          totalCommission: 0,
        });
      const g = groupsMap.get(key);
      g.rows.push({ ...b, commission: sale, commission_rate: undefined });
      g.totalAmount += sale;
      g.totalCommission += sale; // treat "commission" as daily sales for compatibility with UI
    }

    const groups = Array.from(groupsMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    const grandTotalAmount = groups.reduce((s, g) => s + g.totalAmount, 0);
    const grandTotalCommission = groups.reduce(
      (s, g) => s + g.totalCommission,
      0,
    );
    // Determine active daily rate during the period (simple approach: current active rate)
    // For print display purposes, use the same effective rate as calculation logic used
    let dailyRate = 0;
    {
      const nowRate = await ctx.runQuery(
        api.services.payroll.getBarberDailyRate,
        { barber_id: args.barber_id as any },
      );
      dailyRate = nowRate?.daily_rate || 0;
    }
    // Compute final per-day pay as max(dailyRate, day sales)
    for (const g of groups) {
      g.dailyRate = dailyRate;
      g.selectedPay = Math.max(dailyRate, g.totalAmount);
    }
    const grandTotalSelectedPay = groups.reduce(
      (s, g) => s + (g.selectedPay || 0),
      0,
    );
    return {
      groups,
      grandTotalAmount,
      grandTotalCommission,
      dailyRate,
      grandTotalSelectedPay,
    };
  },
});

// PAYROLL PERIODS MANAGEMENT

// Get payroll periods by branch
export const getPayrollPeriodsByBranch = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    const periods = await ctx.db
      .query("payroll_periods")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .order("desc")
      .collect();

    return periods;
  },
});

// Get current payroll period
export const getCurrentPayrollPeriod = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const period = await ctx.db
      .query("payroll_periods")
      .withIndex("by_branch_status", (q) =>
        q.eq("branch_id", args.branch_id).eq("status", "draft"),
      )
      .filter((q) =>
        q.and(
          q.lte(q.field("period_start"), now),
          q.gte(q.field("period_end"), now),
        ),
      )
      .first();

    return period;
  },
});

// Create new payroll period
export const createPayrollPeriod = mutation({
  args: {
    branch_id: v.id("branches"),
    period_start: v.number(),
    period_end: v.number(),
    period_type: v.union(
      v.literal("weekly"),
      v.literal("bi_weekly"),
      v.literal("monthly"),
    ),
    created_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const timestamp = Date.now();

    return await ctx.db.insert("payroll_periods", {
      branch_id: args.branch_id,
      period_start: args.period_start,
      period_end: args.period_end,
      period_type: args.period_type,
      status: "draft",
      total_earnings: 0,
      total_commissions: 0,
      total_deductions: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  },
});

// Calculate payroll for period
export const calculatePayrollForPeriod = mutation({
  args: {
    payroll_period_id: v.id("payroll_periods"),
    calculated_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const period = await ctx.db.get(args.payroll_period_id);
    if (!period) {
      throwUserError(ERROR_CODES.PAYROLL_PERIOD_NOT_FOUND);
    }

    if (period.status === "paid") {
      throwUserError(
        ERROR_CODES.INVALID_INPUT,
        "Cannot recalculate a payroll period that has already been paid.",
        "Create a new payroll period for additional adjustments.",
      );
    }

    // Load existing records to support recalculation
    const existingRecords = await ctx.db
      .query("payroll_records")
      .withIndex("by_payroll_period", (q) =>
        q.eq("payroll_period_id", args.payroll_period_id),
      )
      .collect();

    // Prevent recalculation when any record has already been paid
    const hasPaidRecords = existingRecords.some(
      (record) => record.status === "paid",
    );
    if (hasPaidRecords) {
      throwUserError(
        ERROR_CODES.INVALID_INPUT,
        "Cannot recalculate a payroll period with paid records.",
        "Revert the paid status before recalculating or create a new payroll period.",
      );
    }

    // Get all active barbers in the branch
    const activeBarbers = await ctx.db
      .query("barbers")
      .withIndex("by_branch", (q) => q.eq("branch_id", period.branch_id))
      .filter((q) => q.eq(q.field("is_active"), true))
      .collect();

    // Merge active barbers with any barbers that already have records for this period
    const barberMap = new Map(
      activeBarbers.map((barber) => [barber._id, barber]),
    );
    for (const record of existingRecords) {
      if (!barberMap.has(record.barber_id)) {
        const barber = await ctx.db.get(record.barber_id);
        if (barber) {
          barberMap.set(barber._id, barber);
        }
      }
    }

    const barbers = Array.from(barberMap.values());
    const existingRecordMap = new Map(
      existingRecords.map((record) => [record.barber_id, record]),
    );

    let totalEarnings = 0;
    let totalCommissions = 0;
    let totalDeductions = 0;
    const timestamp = Date.now();

    // Calculate earnings for each barber
    for (const barber of barbers) {
      const earnings = await ctx.runQuery(
        api.services.payroll.calculateBarberEarnings,
        {
          barber_id: barber._id,
          period_start: period.period_start,
          period_end: period.period_end,
        },
      );

      const recordPayload: any = {
        total_services: earnings.total_services,
        total_service_revenue: earnings.total_service_revenue,
        commission_rate: earnings.commission_rate,
        gross_commission: earnings.gross_commission,
        total_transactions: earnings.total_transactions,
        total_transaction_revenue: earnings.total_transaction_revenue,
        transaction_commission: earnings.transaction_commission,
        total_products: earnings.total_products || 0,
        total_product_revenue: earnings.total_product_revenue || 0,
        product_commission: earnings.product_commission || 0,
        bookings_detail: earnings.bookings_detail,
        products_detail: earnings.products_detail || [],
        daily_rate: earnings.daily_rate,
        days_worked: earnings.days_worked,
        daily_pay: earnings.daily_pay,
        tax_deduction: earnings.tax_deduction,
        other_deductions: earnings.other_deductions,
        total_deductions: earnings.total_deductions,
        net_pay: earnings.net_pay,
        status: "calculated" as const,
        updatedAt: timestamp,
      };

      const existingRecord = existingRecordMap.get(barber._id);
      if (existingRecord) {
        await ctx.db.patch(existingRecord._id, recordPayload);
        existingRecordMap.delete(barber._id);
      } else {
        await ctx.db.insert("payroll_records", {
          payroll_period_id: args.payroll_period_id,
          barber_id: barber._id,
          branch_id: period.branch_id,
          ...recordPayload,
          createdAt: timestamp,
        });
      }

      totalEarnings +=
        earnings.total_service_revenue + earnings.total_transaction_revenue;
      // New rule: commissions total equals the final daily salary total (not commission + daily rate)
      totalCommissions += earnings.daily_pay || 0;
      totalDeductions += earnings.total_deductions;
    }

    // Remove records for barbers that are no longer part of this calculation
    for (const leftoverRecord of existingRecordMap.values()) {
      await ctx.db.delete(leftoverRecord._id);
    }

    // Update period with calculations
    await ctx.db.patch(args.payroll_period_id, {
      status: "calculated",
      total_earnings: totalEarnings,
      total_commissions: totalCommissions,
      total_deductions: totalDeductions,
      calculated_at: timestamp,
      calculated_by: args.calculated_by,
      updatedAt: timestamp,
    });

    return {
      total_barbers: barbers.length,
      total_earnings: totalEarnings,
      total_commissions: totalCommissions,
      total_deductions: totalDeductions,
    };
  },
});

// PAYROLL RECORDS MANAGEMENT

// Get payroll records for period
export const getPayrollRecordsByPeriod = query({
  args: { payroll_period_id: v.id("payroll_periods") },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("payroll_records")
      .withIndex("by_payroll_period", (q) =>
        q.eq("payroll_period_id", args.payroll_period_id),
      )
      .collect();

    // Populate barber details
    const recordsWithBarbers = await Promise.all(
      records.map(async (record) => {
        const barber = await ctx.db.get(record.barber_id);
        return {
          ...record,
          barber_name: barber?.full_name || "Unknown Barber",
          barber_email: barber?.email || "",
        };
      }),
    );

    return recordsWithBarbers;
  },
});

// Delete a payroll period and all its related records (if not paid)
export const deletePayrollPeriod = mutation({
  args: { payroll_period_id: v.id("payroll_periods") },
  handler: async (ctx, args) => {
    const period = await ctx.db.get(args.payroll_period_id);
    if (!period) {
      throwUserError(ERROR_CODES.PAYROLL_PERIOD_NOT_FOUND);
    }
    if (period.status === "paid") {
      throwUserError(
        ERROR_CODES.INVALID_INPUT,
        "Cannot delete a paid payroll period",
      );
    }

    // Fetch all payroll records for this period
    const records = await ctx.db
      .query("payroll_records")
      .withIndex("by_payroll_period", (q) =>
        q.eq("payroll_period_id", args.payroll_period_id),
      )
      .collect();

    // Delete adjustments for each record, then the record
    for (const rec of records) {
      const adjustments = await ctx.db
        .query("payroll_adjustments")
        .withIndex("by_payroll_record", (q) =>
          q.eq("payroll_record_id", rec._id),
        )
        .collect();
      for (const adj of adjustments) {
        await ctx.db.delete(adj._id);
      }
      await ctx.db.delete(rec._id);
    }

    // Finally delete the period
    await ctx.db.delete(args.payroll_period_id);
    return { success: true };
  },
});

// Get payroll records for barber
export const getPayrollRecordsByBarber = query({
  args: {
    barber_id: v.id("barbers"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const query = ctx.db
      .query("payroll_records")
      .withIndex("by_barber", (q) => q.eq("barber_id", args.barber_id))
      .order("desc");

    const records = args.limit
      ? await query.take(args.limit)
      : await query.collect();

    // Populate period details
    const recordsWithPeriods = await Promise.all(
      records.map(async (record) => {
        const period = await ctx.db.get(record.payroll_period_id);
        return {
          ...record,
          period_start: period?.period_start,
          period_end: period?.period_end,
          period_type: period?.period_type,
        };
      }),
    );

    return recordsWithPeriods;
  },
});

// Mark payroll record as paid
export const markPayrollRecordAsPaid = mutation({
  args: {
    payroll_record_id: v.id("payroll_records"),
    payment_method: v.union(
      v.literal("cash"),
      v.literal("bank_transfer"),
      v.literal("check"),
      v.literal("digital_wallet"),
    ),
    payment_reference: v.optional(v.string()),
    paid_by: v.id("users"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.payroll_record_id);
    if (!record) {
      throwUserError(ERROR_CODES.PAYROLL_RECORD_NOT_FOUND);
    }

    if (record.status === "paid") {
      throwUserError(ERROR_CODES.PAYROLL_RECORD_ALREADY_PAID);
    }

    const timestamp = Date.now();

    await ctx.db.patch(args.payroll_record_id, {
      status: "paid",
      payment_method: args.payment_method,
      payment_reference: args.payment_reference,
      paid_at: timestamp,
      paid_by: args.paid_by,
      notes: args.notes,
      updatedAt: timestamp,
    });

    return { success: true };
  },
});

// PAYROLL ADJUSTMENTS

// Add payroll adjustment
export const addPayrollAdjustment = mutation({
  args: {
    payroll_record_id: v.id("payroll_records"),
    adjustment_type: v.union(
      v.literal("bonus"),
      v.literal("deduction"),
      v.literal("correction"),
    ),
    amount: v.number(),
    reason: v.string(),
    description: v.optional(v.string()),
    applied_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.payroll_record_id);
    if (!record) {
      throwUserError(ERROR_CODES.PAYROLL_RECORD_NOT_FOUND);
    }

    const timestamp = Date.now();

    const adjustmentId = await ctx.db.insert("payroll_adjustments", {
      payroll_record_id: args.payroll_record_id,
      barber_id: record.barber_id,
      branch_id: record.branch_id,
      adjustment_type: args.adjustment_type,
      amount: args.amount,
      reason: args.reason,
      description: args.description,
      applied_by: args.applied_by,
      is_approved: true, // Auto-approve for now, can add approval workflow later
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    // Update the payroll record with the adjustment
    const newNetPay = record.net_pay + args.amount;
    await ctx.db.patch(args.payroll_record_id, {
      net_pay: newNetPay,
      updatedAt: timestamp,
    });

    return adjustmentId;
  },
});

// Get adjustments for payroll record
export const getAdjustmentsByPayrollRecord = query({
  args: { payroll_record_id: v.id("payroll_records") },
  handler: async (ctx, args) => {
    const adjustments = await ctx.db
      .query("payroll_adjustments")
      .withIndex("by_payroll_record", (q) =>
        q.eq("payroll_record_id", args.payroll_record_id),
      )
      .collect();

    return adjustments;
  },
});

// PAYROLL SUMMARY AND REPORTS

// Get payroll summary for branch
export const getPayrollSummaryByBranch = query({
  args: {
    branch_id: v.id("branches"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const query = ctx.db
      .query("payroll_periods")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .order("desc");

    const periods = args.limit
      ? await query.take(args.limit || 10)
      : await query.collect();

    const summaryData = await Promise.all(
      periods.map(async (period) => {
        const records = await ctx.db
          .query("payroll_records")
          .withIndex("by_payroll_period", (q) =>
            q.eq("payroll_period_id", period._id),
          )
          .collect();

        return {
          ...period,
          total_barbers: records.length,
          paid_records: records.filter((r) => r.status === "paid").length,
          pending_records: records.filter((r) => r.status === "calculated")
            .length,
        };
      }),
    );

    return summaryData;
  },
});

// Test function to check barbers in branch
export const testBarbersInBranch = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    const barbers = await ctx.db
      .query("barbers")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    return {
      branch_id: args.branch_id,
      barbers: barbers.length,
      bookings: bookings.length,
      transactions: transactions.length,
      barberDetails: barbers.map((b) => ({
        id: b._id,
        name: b.full_name,
        active: b.is_active,
      })),
    };
  },
});

// Auto-generate next payroll period based on settings
export const generateNextPayrollPeriod = mutation({
  args: {
    branch_id: v.id("branches"),
    created_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("payroll_settings")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .filter((q) => q.eq(q.field("is_active"), true))
      .first();

    if (!settings) {
      throwUserError(ERROR_CODES.PAYROLL_SETTINGS_NOT_FOUND);
    }

    // Find the last period
    const lastPeriod = await ctx.db
      .query("payroll_periods")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .order("desc")
      .first();

    // Calculate next period dates
    let periodStart: number;
    let periodEnd: number;

    if (lastPeriod) {
      periodStart = lastPeriod.period_end + 1; // Start after last period ends
    } else {
      // First period - start from beginning of current week/month
      const now = new Date();
      if (settings.payout_frequency === "weekly") {
        const dayOfWeek = now.getDay();
        const daysToSubtract = (dayOfWeek - settings.payout_day + 7) % 7;
        periodStart = now.getTime() - daysToSubtract * 24 * 60 * 60 * 1000;
      } else {
        // For monthly, start from first of current month
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      }
    }

    // Calculate period end based on frequency
    if (settings.payout_frequency === "weekly") {
      periodEnd = periodStart + 7 * 24 * 60 * 60 * 1000 - 1;
    } else if (settings.payout_frequency === "bi_weekly") {
      periodEnd = periodStart + 14 * 24 * 60 * 60 * 1000 - 1;
    } else {
      // monthly
      const startDate = new Date(periodStart);
      const endDate = new Date(
        startDate.getFullYear(),
        startDate.getMonth() + 1,
        0,
      );
      periodEnd = endDate.getTime();
    }

    return await ctx.runMutation(api.services.payroll.createPayrollPeriod, {
      branch_id: args.branch_id,
      period_start: periodStart,
      period_end: periodEnd,
      period_type: settings.payout_frequency,
      created_by: args.created_by,
    });
  },
});

// ACTION: Get product commission summary for payroll print
export const getProductCommissionSummary = action({
  args: {
    barber_id: v.id("barbers"),
    period_start: v.number(),
    period_end: v.number(),
  },
  handler: async (ctx, args) => {
    // Get barber details to find branch
    const barber = await ctx.runQuery(api.services.barbers.getBarberById, {
      id: args.barber_id as any,
    });
    if (!barber)
      return { products: [], totals: { quantity: 0, revenue: 0, commission: 0 } };

    // Get product commission rates for the branch
    const productRates = await ctx.runQuery(
      api.services.payroll.getProductCommissionRatesByBranch,
      { branch_id: barber.branch_id },
    );

    // Get barber's commission rate as fallback
    const barberCommissionRate = await ctx.runQuery(
      api.services.payroll.getBarberCommissionRate,
      { barber_id: args.barber_id },
    );

    // Create product rate map for quick lookup
    const productRateMap = new Map();
    (Array.isArray(productRates) ? productRates : []).forEach((rate) => {
      if (rate.is_active) {
        productRateMap.set(rate.product_id, {
          type: rate.commission_type,
          rate: rate.commission_rate,
          amount: rate.fixed_amount
        });
      }
    });

    const fallbackRate = barberCommissionRate?.commission_rate || 10; // Default 10%

    // Get transactions for the barber in the period
    const allTransactions = await ctx.runQuery(
      api.services.transactions.getTransactionsByBarber,
      { barber_id: args.barber_id as any },
    );

    // Filter transactions by period and completed status
    const transactions = (allTransactions || []).filter((t) => {
      return (
        t.payment_status === "completed" &&
        t.createdAt >= args.period_start &&
        t.createdAt <= args.period_end
      );
    });

    // Group products by product ID
    const productMap = new Map<
      string,
      {
        product_id: any;
        product_name: string;
        quantity: number;
        total_revenue: number;
        total_commission: number;
        commission_type: string;
        commission_value: number;
      }
    >();

    for (const transaction of transactions) {
      if (transaction.products) {
        for (const product of transaction.products) {
          const productId = product.product_id;
          const productName = product.product_name || "Unknown Product";
          const revenue = product.price * product.quantity;

          // Calculate commission based on product-specific rate or barber's fallback rate
          const productConfig = productRateMap.get(productId);
          let commissionAmount = 0;
          let commissionType = "percentage";
          let commissionValue = fallbackRate;
          
          if (productConfig) {
            commissionType = productConfig.type;
            if (productConfig.type === "fixed_amount" && productConfig.amount !== undefined) {
              // Fixed amount per unit
              commissionAmount = productConfig.amount * product.quantity;
              commissionValue = productConfig.amount;
            } else if (productConfig.type === "percentage" && productConfig.rate !== undefined) {
              // Percentage of revenue
              commissionAmount = (revenue * productConfig.rate) / 100;
              commissionValue = productConfig.rate;
            } else {
              // Fallback to percentage
              commissionAmount = (revenue * fallbackRate) / 100;
            }
          } else {
            // No specific rate, use fallback percentage
            commissionAmount = (revenue * fallbackRate) / 100;
          }

          if (!productMap.has(productId)) {
            productMap.set(productId, {
              product_id: productId,
              product_name: productName,
              quantity: 0,
              total_revenue: 0,
              total_commission: 0,
              commission_type: commissionType,
              commission_value: commissionValue,
            });
          }

          const productEntry = productMap.get(productId)!;
          productEntry.quantity += product.quantity;
          productEntry.total_revenue += revenue;
          productEntry.total_commission += commissionAmount;
        }
      }
    }

    // Convert to array and sort by commission amount (descending)
    const summary = Array.from(productMap.values()).sort(
      (a, b) => b.total_commission - a.total_commission,
    );

    // Calculate totals
    const totalQuantity = summary.reduce(
      (sum, product) => sum + product.quantity,
      0,
    );
    const totalRevenue = summary.reduce(
      (sum, product) => sum + product.total_revenue,
      0,
    );
    const totalCommission = summary.reduce(
      (sum, product) => sum + product.total_commission,
      0,
    );

    return {
      products: summary,
      totals: {
        quantity: totalQuantity,
        revenue: totalRevenue,
        commission: totalCommission,
      },
    };
  },
});

// ACTION: Get service commission summary for payroll print
export const getServiceCommissionSummary = action({
  args: {
    barber_id: v.id("barbers"),
    period_start: v.number(),
    period_end: v.number(),
  },
  handler: async (ctx, args) => {
    // Get barber details to find branch
    const barber = await ctx.runQuery(api.services.barbers.getBarberById, {
      id: args.barber_id as any,
    });
    if (!barber)
      return { services: [], totals: { quantity: 0, commission: 0 } };

    // Get service commission rates for the branch
    const serviceRates = await ctx.runQuery(
      api.services.payroll.getServiceCommissionRatesByBranch,
      { branch_id: barber.branch_id },
    );

    // Get barber's commission rate as fallback
    const barberCommissionRate = await ctx.runQuery(
      api.services.payroll.getBarberCommissionRate,
      { barber_id: args.barber_id },
    );

    // Get barber's daily rate
    // Create service rate map for quick lookup
    const serviceRateMap = new Map();
    (Array.isArray(serviceRates) ? serviceRates : []).forEach((rate) => {
      if (rate.is_active) {
        serviceRateMap.set(rate.service_id, rate.commission_rate);
      }
    });

    const fallbackRate = barberCommissionRate?.commission_rate || 10; // Default 10%

    // Get bookings for the barber in the period
    const bookings = await ctx.runQuery(
      api.services.payroll.getBookingsByBarberAndPeriod,
      args as any,
    );

    // Group bookings by service
    const serviceMap = new Map<
      string,
      {
        service_id: any;
        service_name: string;
        quantity: number;
        total_commission: number;
      }
    >();

    for (const booking of bookings || []) {
      const serviceId = booking.service_id;
      const serviceName = booking.service_name || "Unknown Service";
      const price = booking.price || 0;

      if (!serviceMap.has(serviceId)) {
        serviceMap.set(serviceId, {
          service_id: serviceId,
          service_name: serviceName,
          quantity: 0,
          total_commission: 0,
        });
      }

      const service = serviceMap.get(serviceId)!;
      service.quantity += 1;

      // Calculate commission based on service-specific rate or barber's fallback rate
      const commissionRate = serviceRateMap.get(serviceId) ?? fallbackRate;
      const commissionAmount = (price * commissionRate) / 100;
      service.total_commission += commissionAmount;
    }

    // Convert to array and sort by commission amount (descending)
    const summary = Array.from(serviceMap.values()).sort(
      (a, b) => b.total_commission - a.total_commission,
    );

    // Calculate totals
    const totalQuantity = summary.reduce(
      (sum, service) => sum + service.quantity,
      0,
    );

    const totalCommission = summary.reduce(
      (sum, service) => sum + service.total_commission,
      0,
    );

    return {
      services: summary,
      totals: {
        quantity: totalQuantity,
        commission: totalCommission,
      },
    };
  },
});
