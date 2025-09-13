import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
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

    // Get barber's specific commission rate or use default
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

    const commissionRate = barberCommissionRate?.commission_rate || payrollSettings?.default_commission_rate || 10;


    // Get ALL bookings for this barber, then filter by period
    const allBookings = await ctx.db
      .query("bookings")
      .withIndex("by_barber", (q) => q.eq("barber", args.barber_id))
      .collect();

    // Filter bookings that were completed in the period (regardless of creation date)
    const bookings = allBookings.filter(booking => {
      const isCompleted = booking.status === "completed";
      const isPaid = booking.payment_status === "paid";
      const isInPeriod = booking.updatedAt >= args.period_start && booking.updatedAt <= args.period_end;
      return isCompleted && isPaid && isInPeriod;
    });

    // Get additional booking details
    const bookingsWithDetails = await Promise.all(
      bookings.map(async (booking) => {
        const service = await ctx.db.get(booking.service);
        return {
          ...booking,
          service_name: service?.name || 'Unknown Service',
          service_category: service?.category || 'General'
        };
      })
    );

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

    // Calculate service earnings from bookings
    const totalServices = bookingsWithDetails.length;
    const totalServiceRevenue = bookingsWithDetails.reduce((sum, booking) => sum + booking.price, 0);
    const serviceCommission = (totalServiceRevenue * commissionRate) / 100;

    // Calculate transaction earnings from POS
    const totalTransactions = transactions.length;
    const totalTransactionRevenue = transactions.reduce((sum, transaction) => {
      return sum + transaction.services.reduce((serviceSum, service) => serviceSum + (service.price * service.quantity), 0);
    }, 0);
    const transactionCommission = (totalTransactionRevenue * commissionRate) / 100;

    // Calculate total commission
    const grossCommission = serviceCommission + transactionCommission;
    
    // Calculate deductions
    const taxRate = payrollSettings?.tax_rate || 0;
    const taxDeduction = (grossCommission * taxRate) / 100;
    const totalDeductions = taxDeduction;
    
    // Calculate net pay
    const netPay = grossCommission - totalDeductions;

    return {
      barber_id: args.barber_id,
      barber_name: barber.full_name,
      commission_rate: commissionRate,
      
      // Service earnings
      total_services: totalServices,
      total_service_revenue: totalServiceRevenue,
      service_commission: serviceCommission,
      
      // Transaction earnings
      total_transactions: totalTransactions,
      total_transaction_revenue: totalTransactionRevenue,
      transaction_commission: transactionCommission,
      
      // Totals
      gross_commission: grossCommission,
      tax_deduction: taxDeduction,
      other_deductions: 0,
      total_deductions: totalDeductions,
      net_pay: netPay,
      
      // Details for verification
      bookings: bookingsWithDetails.map(b => ({
        id: b._id,
        booking_code: b.booking_code,
        date: b.date,
        price: b.price,
        service_name: b.service_name,
        service_category: b.service_category,
        completed_at: b.updatedAt
      })),
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
        
        tax_deduction: earnings.tax_deduction,
        other_deductions: earnings.other_deductions,
        total_deductions: earnings.total_deductions,
        
        net_pay: earnings.net_pay,
        status: "calculated",
        
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      totalEarnings += earnings.total_service_revenue + earnings.total_transaction_revenue;
      totalCommissions += earnings.gross_commission;
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