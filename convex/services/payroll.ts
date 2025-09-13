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
      v.literal("monthly")
    ),
    payout_day: v.number(),
    tax_rate: v.optional(v.number()),
    created_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Validate commission rate
    if (args.default_commission_rate < 0 || args.default_commission_rate > 100) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Commission rate must be between 0 and 100");
    }

    // Validate payout day based on frequency
    if (args.payout_frequency === "weekly" && (args.payout_day < 0 || args.payout_day > 6)) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Weekly payout day must be between 0 (Sunday) and 6 (Saturday)");
    }
    if (args.payout_frequency === "monthly" && (args.payout_day < 1 || args.payout_day > 31)) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Monthly payout day must be between 1 and 31");
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
      .withIndex("by_barber_active", (q) => q.eq("barber_id", args.barber_id).eq("is_active", true))
      .filter((q) => 
        q.and(
          q.lte(q.field("effective_from"), now),
          q.or(
            q.eq(q.field("effective_until"), undefined),
            q.gt(q.field("effective_until"), now)
          )
        )
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
      throwUserError(ERROR_CODES.INVALID_INPUT, "Commission rate must be between 0 and 100");
    }

    const timestamp = Date.now();
    const effectiveFrom = args.effective_from || timestamp;

    // Deactivate any existing active rates
    const existingRates = await ctx.db
      .query("barber_commission_rates")
      .withIndex("by_barber_active", (q) => q.eq("barber_id", args.barber_id).eq("is_active", true))
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
    const transactions = allTransactions.filter(transaction => {
      const isCompleted = transaction.payment_status === "completed";
      const isInPeriod = transaction.createdAt >= args.period_start && transaction.createdAt <= args.period_end;
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
            q.gt(q.field("effective_until"), args.period_start)
          )
        )
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
      .withIndex("by_barber_active", (q) => q.eq("barber_id", args.barber_id).eq("is_active", true))
      .filter((q) => 
        q.and(
          q.lte(q.field("effective_from"), args.period_end),
          q.or(
            q.eq(q.field("effective_until"), undefined),
            q.gt(q.field("effective_until"), args.period_start)
          )
        )
      )
      .first();

    const fallbackRate = barberCommissionRate?.commission_rate || payrollSettings?.default_commission_rate || 10;

    // Compute service-level totals from transactions only
    let totalServices = 0;
    let totalServiceRevenue = 0;
    let serviceCommission = 0;
    // We'll compute days worked from bookings (per request)

    for (const t of transactions) {
      for (const s of t.services || []) {
        const lineRevenue = (s.price || 0) * (s.quantity || 0);
        totalServices += s.quantity || 0;
        totalServiceRevenue += lineRevenue;
        const rate = serviceRateMap.get(String(s.service_id)) ?? fallbackRate;
        serviceCommission += (lineRevenue * rate) / 100;
      }
    }

    const totalTransactions = transactions.length;
    const totalTransactionRevenue = 0; // No separate transaction revenue; accounted in services
    const transactionCommission = 0; // No separate transaction commission

    // Daily rate computation (days with at least one completed & paid booking)
    // Load bookings for the barber and derive unique dates from booking records
    const allBookings = await ctx.db
      .query("bookings")
      .withIndex("by_barber", (q) => q.eq("barber", args.barber_id))
      .collect();
    const bookingDaySet = new Set<string>();
    const bookingsInPeriod: any[] = [];
    for (const b of allBookings) {
      const completed = b.status === "completed";
      const paid = b.payment_status === "paid";
      const inPeriod = b.updatedAt >= args.period_start && b.updatedAt <= args.period_end;
      if (completed && paid && inPeriod) {
        const dateKey = b.date || new Date(new Date(b.updatedAt).toISOString().split('T')[0]).toISOString();
        bookingDaySet.add(dateKey);
        // enrich with details for printing/snapshots
        const service = await ctx.db.get(b.service);
        let customerName = b.customer_name || "Walk-in";
        if (!customerName && b.customer) {
          const customer = await ctx.db.get(b.customer);
          customerName = (customer as any)?.nickname || (customer as any)?.username || (customer as any)?.email || "Customer";
        }
        bookingsInPeriod.push({
          id: b._id,
          booking_code: b.booking_code,
          date: b.date,
          time: b.time,
          price: b.price,
          service_name: service?.name || 'Service',
          customer_name: customerName,
          updatedAt: b.updatedAt,
        });
      }
    }

    // Get active daily rate for barber
    const barberDailyRate = await ctx.db
      .query("barber_daily_rates")
      .withIndex("by_barber_active", (q) => q.eq("barber_id", args.barber_id).eq("is_active", true))
      .filter((q) => 
        q.and(
          q.lte(q.field("effective_from"), args.period_end),
          q.or(
            q.eq(q.field("effective_until"), undefined),
            q.gt(q.field("effective_until"), args.period_start)
          )
        )
      )
      .first();

    const daysWorked = bookingDaySet.size;
    const dailyRate = barberDailyRate?.daily_rate || 0;
    const dailyPay = dailyRate * daysWorked;

    // Commission excludes daily pay; daily pay tracked separately
    const grossCommission = serviceCommission;
    
    // Calculate deductions
    const taxRate = payrollSettings?.tax_rate || 0;
    // Tax is applied to commission + daily pay
    const taxDeduction = ((grossCommission + dailyPay) * taxRate) / 100;
    const totalDeductions = taxDeduction;
    
    // Calculate net pay
    const netPay = grossCommission + dailyPay - totalDeductions;

    return {
      barber_id: args.barber_id,
      barber_name: barber.full_name,
      commission_rate: fallbackRate,
      
      // Service earnings
      total_services: totalServices,
      total_service_revenue: totalServiceRevenue,
      service_commission: serviceCommission,
      
      // Transaction breakdown (legacy fields retained for UI; set to 0)
      total_transactions: totalTransactions,
      total_transaction_revenue: totalTransactionRevenue,
      transaction_commission: transactionCommission,
      
      // Daily rate
      daily_rate: dailyRate,
      days_worked: daysWorked,
      daily_pay: dailyPay,
      
      // Totals
      gross_commission: grossCommission,
      tax_deduction: taxDeduction,
      other_deductions: 0,
      total_deductions: totalDeductions,
      net_pay: netPay,
      
      // Details for verification
      bookings_detail: bookingsInPeriod,
      transactions: transactions.map(t => ({
        id: t._id,
        transaction_id: t.transaction_id,
        receipt_number: t.receipt_number,
        total_amount: t.total_amount,
        service_revenue: t.services.reduce((sum, s) => sum + (s.price * s.quantity), 0)
      }))
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
      throwUserError(ERROR_CODES.INVALID_INPUT, "Commission rate must be between 0 and 100");
    }
    const now = Date.now();
    const effectiveFrom = args.effective_from || now;

    // Deactivate existing active rates for same service in branch
    const existing = await ctx.db
      .query("service_commission_rates")
      .withIndex("by_branch_service", (q) => q.eq("branch_id", args.branch_id).eq("service_id", args.service_id))
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
      .withIndex("by_barber_active", (q) => q.eq("barber_id", args.barber_id).eq("is_active", true))
      .filter((q) => 
        q.and(
          q.lte(q.field("effective_from"), now),
          q.or(
            q.eq(q.field("effective_until"), undefined),
            q.gt(q.field("effective_until"), now)
          )
        )
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
      throwUserError(ERROR_CODES.INVALID_INPUT, "Daily rate must be non-negative");
    }
    const now = Date.now();
    const effectiveFrom = args.effective_from || now;

    // Deactivate existing active daily rates
    const existing = await ctx.db
      .query("barber_daily_rates")
      .withIndex("by_barber_active", (q) => q.eq("barber_id", args.barber_id).eq("is_active", true))
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
      return completed && paid && b.updatedAt >= args.period_start && b.updatedAt <= args.period_end;
    });

    // Populate service + customer display info
    const withDetails = await Promise.all(
      filtered.map(async (b) => {
        const service = await ctx.db.get(b.service);
        let customerName = b.customer_name || "Walk-in";
        if (!customerName && b.customer) {
          const customer = await ctx.db.get(b.customer);
          customerName = customer?.nickname || customer?.username || customer?.email || "Customer";
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
      })
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
    const items = await ctx.runQuery(api.services.payroll.getBookingsByBarberAndPeriod, args as any);
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
    const barber = await ctx.runQuery(api.services.barbers.getBarberById, { id: args.barber_id as any });
    if (!barber) return { groups: [], grandTotalAmount: 0, grandTotalCommission: 0 };

    // Rates: per service + fallback
    const serviceRates = await ctx.runQuery(api.services.payroll.getServiceCommissionRatesByBranch, { branch_id: barber.branch_id });
    const rateMap = new Map<string, number>();
    for (const r of serviceRates || []) rateMap.set(String(r.service_id), r.commission_rate);

    const barberRate = await ctx.runQuery(api.services.payroll.getBarberCommissionRate, { barber_id: args.barber_id as any });
    const settings = await ctx.runQuery(api.services.payroll.getPayrollSettingsByBranch, { branch_id: barber.branch_id });
    const fallbackRate = (barberRate?.commission_rate) || (settings?.default_commission_rate || 10);

    // Bookings
    const items = await ctx.runQuery(api.services.payroll.getBookingsByBarberAndPeriod, args as any);

    // Group by date
    const groupsMap = new Map<string, any>();
    for (const b of items || []) {
      const key = b.date || new Date(b.updatedAt).toISOString().split('T')[0];
      const rate = rateMap.get(String(b.service_id)) ?? fallbackRate;
      const commission = (b.price || 0) * rate / 100;
      if (!groupsMap.has(key)) groupsMap.set(key, { date: key, rows: [], totalAmount: 0, totalCommission: 0 });
      const g = groupsMap.get(key);
      g.rows.push({ ...b, commission, commission_rate: rate });
      g.totalAmount += b.price || 0;
      g.totalCommission += commission;
    }

    const groups = Array.from(groupsMap.values()).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const grandTotalAmount = groups.reduce((s,g) => s + g.totalAmount, 0);
    const grandTotalCommission = groups.reduce((s,g) => s + g.totalCommission, 0);
    return { groups, grandTotalAmount, grandTotalCommission };
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
      .withIndex("by_branch_status", (q) => q.eq("branch_id", args.branch_id).eq("status", "draft"))
      .filter((q) => 
        q.and(
          q.lte(q.field("period_start"), now),
          q.gte(q.field("period_end"), now)
        )
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
      v.literal("monthly")
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

    if (period.status !== "draft") {
      throwUserError(ERROR_CODES.PAYROLL_PERIOD_ALREADY_CALCULATED);
    }

    // Get all active barbers in the branch
    const barbers = await ctx.db
      .query("barbers")
      .withIndex("by_branch", (q) => q.eq("branch_id", period.branch_id))
      .filter((q) => q.eq(q.field("is_active"), true))
      .collect();

    let totalEarnings = 0;
    let totalCommissions = 0;
    let totalDeductions = 0;

    // Calculate earnings for each barber
    for (const barber of barbers) {
      const earnings = await ctx.runQuery(api.services.payroll.calculateBarberEarnings, {
        barber_id: barber._id,
        period_start: period.period_start,
        period_end: period.period_end,
      });

      // Create payroll record for the barber
      await ctx.db.insert("payroll_records", {
        payroll_period_id: args.payroll_period_id,
        barber_id: barber._id,
        branch_id: period.branch_id,
        
        total_services: earnings.total_services,
        total_service_revenue: earnings.total_service_revenue,
        commission_rate: earnings.commission_rate,
        gross_commission: earnings.gross_commission,
        
        total_transactions: earnings.total_transactions,
        total_transaction_revenue: earnings.total_transaction_revenue,
        transaction_commission: earnings.transaction_commission,
        bookings_detail: earnings.bookings_detail,

        // Daily rate
        daily_rate: earnings.daily_rate,
        days_worked: earnings.days_worked,
        daily_pay: earnings.daily_pay,
        
        tax_deduction: earnings.tax_deduction,
        other_deductions: earnings.other_deductions,
        total_deductions: earnings.total_deductions,
        
        net_pay: earnings.net_pay,
        status: "calculated",
        
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      totalEarnings += earnings.total_service_revenue + earnings.total_transaction_revenue;
      // Include daily pay in total payout figure
      totalCommissions += earnings.gross_commission + (earnings.daily_pay || 0);
      totalDeductions += earnings.total_deductions;
    }

    // Update period with calculations
    await ctx.db.patch(args.payroll_period_id, {
      status: "calculated",
      total_earnings: totalEarnings,
      total_commissions: totalCommissions,
      total_deductions: totalDeductions,
      calculated_at: Date.now(),
      calculated_by: args.calculated_by,
      updatedAt: Date.now(),
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
      .withIndex("by_payroll_period", (q) => q.eq("payroll_period_id", args.payroll_period_id))
      .collect();

    // Populate barber details
    const recordsWithBarbers = await Promise.all(
      records.map(async (record) => {
        const barber = await ctx.db.get(record.barber_id);
        return {
          ...record,
          barber_name: barber?.full_name || 'Unknown Barber',
          barber_email: barber?.email || '',
        };
      })
    );

    return recordsWithBarbers;
  },
});

// Get payroll records for barber
export const getPayrollRecordsByBarber = query({
  args: { 
    barber_id: v.id("barbers"),
    limit: v.optional(v.number())
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
      })
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
      v.literal("digital_wallet")
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
      v.literal("correction")
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
      .withIndex("by_payroll_record", (q) => q.eq("payroll_record_id", args.payroll_record_id))
      .collect();

    return adjustments;
  },
});

// PAYROLL SUMMARY AND REPORTS

// Get payroll summary for branch
export const getPayrollSummaryByBranch = query({
  args: { 
    branch_id: v.id("branches"),
    limit: v.optional(v.number())
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
          .withIndex("by_payroll_period", (q) => q.eq("payroll_period_id", period._id))
          .collect();

        return {
          ...period,
          total_barbers: records.length,
          paid_records: records.filter(r => r.status === "paid").length,
          pending_records: records.filter(r => r.status === "calculated").length,
        };
      })
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
      barberDetails: barbers.map(b => ({
        id: b._id,
        name: b.full_name,
        active: b.is_active
      }))
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
        periodStart = now.getTime() - (daysToSubtract * 24 * 60 * 60 * 1000);
      } else {
        // For monthly, start from first of current month
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      }
    }

    // Calculate period end based on frequency
    if (settings.payout_frequency === "weekly") {
      periodEnd = periodStart + (7 * 24 * 60 * 60 * 1000) - 1;
    } else if (settings.payout_frequency === "bi_weekly") {
      periodEnd = periodStart + (14 * 24 * 60 * 60 * 1000) - 1;
    } else { // monthly
      const startDate = new Date(periodStart);
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
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
