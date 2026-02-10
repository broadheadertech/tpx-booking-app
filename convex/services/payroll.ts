import { v } from "convex/values";
import { mutation, query, action } from "../_generated/server";
import { api } from "../_generated/api";
import { throwUserError, ERROR_CODES, validateInput } from "../utils/errors";
import { Id } from "../_generated/dataModel";

// ============================================================================
// ATTENDANCE OT/UT/LATE HELPERS
// ============================================================================

const PHT_OFFSET = 8 * 60 * 60 * 1000; // UTC+8 in ms

/** Convert "HH:MM" to minutes since midnight */
function timeStringToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

/** Convert UTC ms timestamp to "HH:MM" in PHT */
function timestampToPHTTimeString(timestamp: number): string {
  const phtDate = new Date(timestamp + PHT_OFFSET);
  const h = String(phtDate.getUTCHours()).padStart(2, "0");
  const m = String(phtDate.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/** Convert UTC ms timestamp to "YYYY-MM-DD" in PHT */
function timestampToPHTDateString(timestamp: number): string {
  const phtDate = new Date(timestamp + PHT_OFFSET);
  return phtDate.toISOString().split("T")[0];
}

interface DailyAttendanceDetail {
  date: string;
  scheduled_start: string;
  scheduled_end: string;
  actual_clock_in: string;
  actual_clock_out: string;
  late_minutes: number;
  undertime_minutes: number;
  overtime_minutes: number;
}

interface AttendanceSummary {
  total_late_minutes: number;
  total_undertime_minutes: number;
  total_overtime_minutes: number;
  total_ot_pay: number;
  total_late_penalty: number;
  total_ut_penalty: number;
  total_penalty: number;
  days_late: number;
  days_undertime: number;
  days_overtime: number;
  daily_details: DailyAttendanceDetail[];
}

/** Map a PHT date string to its lowercase weekday name for schedule lookup */
const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

function getWeekdayName(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return DAY_NAMES[date.getUTCDay()];
}

interface BarberSchedule {
  [day: string]: { available: boolean; start: string; end: string };
}

/**
 * Calculate OT/UT/Late for a barber over approved attendance records.
 * Uses the barber's per-day booking schedule (from BarberManagement) as shift reference.
 * Groups by PHT date, takes earliest clock_in and latest clock_out per day.
 */
function calculateAttendanceSummary(
  approvedRecords: Array<{ clock_in: number; clock_out?: number }>,
  schedule: BarberSchedule,
  otHourlyRate: number,
  penaltyHourlyRate: number,
): AttendanceSummary {
  // Group by PHT date: earliest clock_in, latest clock_out
  const byDate = new Map<string, { earliestIn: number; latestOut: number }>();

  for (const record of approvedRecords) {
    if (!record.clock_out) continue;
    const dateKey = timestampToPHTDateString(record.clock_in);
    const existing = byDate.get(dateKey);
    if (existing) {
      existing.earliestIn = Math.min(existing.earliestIn, record.clock_in);
      existing.latestOut = Math.max(existing.latestOut, record.clock_out);
    } else {
      byDate.set(dateKey, { earliestIn: record.clock_in, latestOut: record.clock_out });
    }
  }

  const dailyDetails: DailyAttendanceDetail[] = [];
  let totalLate = 0, totalUT = 0, totalOT = 0;
  let daysLate = 0, daysUT = 0, daysOT = 0;

  for (const [dateStr, { earliestIn, latestOut }] of byDate) {
    // Look up this day's scheduled shift from the barber's booking schedule
    const dayName = getWeekdayName(dateStr);
    const daySchedule = schedule[dayName];

    // Skip days where the barber has no schedule or is marked unavailable
    if (!daySchedule || !daySchedule.available) continue;

    const schedStartMin = timeStringToMinutes(daySchedule.start);
    const schedEndMin = timeStringToMinutes(daySchedule.end);

    const actualInMin = timeStringToMinutes(timestampToPHTTimeString(earliestIn));
    const actualOutMin = timeStringToMinutes(timestampToPHTTimeString(latestOut));

    const lateMin = Math.max(0, actualInMin - schedStartMin);
    const undertimeMin = Math.max(0, schedEndMin - actualOutMin);
    const overtimeMin = Math.max(0, actualOutMin - schedEndMin);

    if (lateMin > 0) daysLate++;
    if (undertimeMin > 0) daysUT++;
    if (overtimeMin > 0) daysOT++;

    totalLate += lateMin;
    totalUT += undertimeMin;
    totalOT += overtimeMin;

    dailyDetails.push({
      date: dateStr,
      scheduled_start: daySchedule.start,
      scheduled_end: daySchedule.end,
      actual_clock_in: timestampToPHTTimeString(earliestIn),
      actual_clock_out: timestampToPHTTimeString(latestOut),
      late_minutes: lateMin,
      undertime_minutes: undertimeMin,
      overtime_minutes: overtimeMin,
    });
  }

  dailyDetails.sort((a, b) => a.date.localeCompare(b.date));

  const totalOtPay = (totalOT / 60) * otHourlyRate;
  const totalLatePenalty = (totalLate / 60) * penaltyHourlyRate;
  const totalUtPenalty = (totalUT / 60) * penaltyHourlyRate;
  const totalPenalty = totalLatePenalty + totalUtPenalty;

  return {
    total_late_minutes: totalLate,
    total_undertime_minutes: totalUT,
    total_overtime_minutes: totalOT,
    total_ot_pay: Math.round(totalOtPay * 100) / 100,
    total_late_penalty: Math.round(totalLatePenalty * 100) / 100,
    total_ut_penalty: Math.round(totalUtPenalty * 100) / 100,
    total_penalty: Math.round(totalPenalty * 100) / 100,
    days_late: daysLate,
    days_undertime: daysUT,
    days_overtime: daysOT,
    daily_details: dailyDetails,
  };
}

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
    include_booking_fee: v.optional(v.boolean()),
    booking_fee_percentage: v.optional(v.number()), // Percentage for barber (default 100%)
    include_late_fee: v.optional(v.boolean()),
    late_fee_percentage: v.optional(v.number()), // Percentage for barber (default 100%)
    include_convenience_fee: v.optional(v.boolean()),
    convenience_fee_percentage: v.optional(v.number()), // Percentage for barber (default 100%)
    zero_day_source: v.optional(v.string()), // "disabled" | "manual" | "attendance"
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

    // Validate fee percentages (0-100)
    const validatePercentage = (value: number | undefined, name: string) => {
      if (value !== undefined && (value < 0 || value > 100)) {
        throwUserError(
          ERROR_CODES.INVALID_INPUT,
          `${name} must be between 0 and 100`,
        );
      }
    };
    validatePercentage(args.booking_fee_percentage, "Booking fee percentage");
    validatePercentage(args.late_fee_percentage, "Late fee percentage");
    validatePercentage(args.convenience_fee_percentage, "Convenience fee percentage");

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
        include_booking_fee: args.include_booking_fee,
        booking_fee_percentage: args.booking_fee_percentage,
        include_late_fee: args.include_late_fee,
        late_fee_percentage: args.late_fee_percentage,
        include_convenience_fee: args.include_convenience_fee,
        convenience_fee_percentage: args.convenience_fee_percentage,
        zero_day_source: args.zero_day_source,
        updatedAt: timestamp,
      });
      return existingSettings._id;
    } else {
      return await ctx.db.insert("payroll_settings", {
        branch_id: args.branch_id,
        default_commission_rate: args.default_commission_rate,
        payout_frequency: args.payout_frequency,
        payout_day: args.payout_day,
        tax_rate: args.tax_rate || 0,
        include_booking_fee: args.include_booking_fee || false,
        booking_fee_percentage: args.booking_fee_percentage ?? 100, // Default 100% to barber
        include_late_fee: args.include_late_fee || false,
        late_fee_percentage: args.late_fee_percentage ?? 100, // Default 100% to barber
        include_convenience_fee: args.include_convenience_fee || false,
        convenience_fee_percentage: args.convenience_fee_percentage ?? 100, // Default 100% to barber
        zero_day_source: args.zero_day_source || "disabled",
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

    // Load per-service commission rates (active) for the barber's branch
    // We fetch ALL active rates regardless of date to allow for retroactive corrections
    const serviceRates = await ctx.db
      .query("service_commission_rates")
      .withIndex("by_branch", (q) => q.eq("branch_id", barber.branch_id))
      .filter((q) => q.eq(q.field("is_active"), true))
      .collect();

    const serviceRateMap = new Map<string, any[]>();
    for (const r of serviceRates) {
      const rates = serviceRateMap.get(r.service_id as string) || [];
      rates.push(r);
      serviceRateMap.set(r.service_id as string, rates);
    }

    // Fallback commission rate if a service has no specific rate
    // Get latest active barber commission rate
    const barberCommissionRates = await ctx.db
      .query("barber_commission_rates")
      .withIndex("by_barber_active", (q) =>
        q.eq("barber_id", args.barber_id).eq("is_active", true),
      )
      .collect();

    // Sort by effective_from desc to get latest rate
    const barberCommissionRate = barberCommissionRates.slice().sort((a, b) => b.effective_from - a.effective_from)[0];

    const fallbackRate =
      barberCommissionRate?.commission_rate ||
      payrollSettings?.default_commission_rate ||
      10;

    // Compute service-level totals from completed bookings within the period
    let totalServices = 0;
    let totalServiceRevenue = 0;
    let serviceCommission = 0;
    let totalBookingFees = 0;
    let totalLateFees = 0;
    let totalConvenienceFees = 0;
    // We'll compute days worked from bookings (per request)

    // We'll fill bookingsInPeriod below; use it for totals
    const totalTransactions = transactions.length;
    const totalTransactionRevenue = 0; // No separate transaction revenue; accounted in bookings
    const transactionCommission = 0; // No separate transaction commission

    // Load product commission rates for this branch
    // Fetch ALL active rates regardless of date
    const productRates = await ctx.db
      .query("product_commission_rates")
      .withIndex("by_branch", (q) => q.eq("branch_id", barber.branch_id))
      .filter((q) => q.eq(q.field("is_active"), true))
      .collect();

    const productRateMap = new Map<string, any[]>();
    for (const r of productRates) {
      const rates = productRateMap.get(r.product_id as string) || [];
      rates.push(r);
      productRateMap.set(r.product_id as string, rates);
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
          const rates = productRateMap.get(product.product_id) || [];
          // ALWAYS use the latest active rate to allow retroactive corrections
          // This assumes the user wants the currently configured rate to apply to the period being calculated
          const activeRate = rates.sort((a, b) => b.effective_from - a.effective_from)[0];

          let productComm = 0;
          let commissionRate = fallbackRate;
          let commissionType = "percentage";

          if (activeRate) {
            commissionType = activeRate.commission_type;
            if (activeRate.commission_type === "fixed_amount" && activeRate.fixed_amount !== undefined) {
              // Fixed amount per unit
              productComm = activeRate.fixed_amount * product.quantity;
              commissionRate = activeRate.fixed_amount; // Store fixed amount in rate field for display
            } else if (activeRate.commission_type === "percentage" && activeRate.commission_rate !== undefined) {
              // Percentage of revenue
              productComm = (productRevenue * activeRate.commission_rate) / 100;
              commissionRate = activeRate.commission_rate;
            } else {
              // Fallback to percentage
              productComm = (productRevenue * fallbackRate) / 100;
            }
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
        const dateKey = b.date; // Use the YYYY-MM-DD string directly

        if (!dateKey) continue; // Should not happen with current schema/logic but safe

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

        // Calculate commission for this booking
        const rates = serviceRateMap.get(String(b.service)) || [];
        // Sort rates by effective_from DESC and take the most recent one (retroactive rule)
        const activeRate = rates.slice().sort((a, b) => (b.effective_from || 0) - (a.effective_from || 0))[0];

        const serviceRate = activeRate ? activeRate.commission_rate : fallbackRate;
        const bookingCommission = ((b.price || 0) * (serviceRate || 0)) / 100;
        serviceCommission += bookingCommission;

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
          commission: bookingCommission,
          commission_rate: serviceRate,
          booking_fee: b.booking_fee || 0,
          late_fee: b.late_fee || 0,
        };

        bookingsByDate.get(dateKey)!.push(enrichedBooking);
        bookingsInPeriod.push(enrichedBooking);

        totalServices += 1;
        totalServiceRevenue += b.price || 0;
        totalBookingFees += b.booking_fee || 0;
        totalLateFees += b.late_fee || 0;
        totalConvenienceFees += b.convenience_fee_paid || 0;

        // Track commission per day for correct daily pay calculation
        const currentDayCommission = dailyCommissions.get(dateKey) || 0;
        dailyCommissions.set(dateKey, currentDayCommission + bookingCommission);
      }
    }

    // Get active daily rates for barber overlapping the period
    // Fetch ALL active rates to allow retroactive application
    const barberDailyRates = await ctx.db
      .query("barber_daily_rates")
      .withIndex("by_barber_active", (q) =>
        q.eq("barber_id", args.barber_id).eq("is_active", true),
      )
      .collect();

    // Use the latest rate as the "display" rate for the summary, or 0 if none
    const latestDailyRate = barberDailyRates
      .slice()
      .sort((a, b) => b.effective_from - a.effective_from)[0];
    const displayDailyRate = latestDailyRate?.daily_rate || 0;

    console.log(
      `Barber ${barber.full_name}: found ${barberDailyRates.length} daily rates. Display rate = ${displayDailyRate}`,
    );

    const dailyRate = displayDailyRate;
    console.log(
      `Barber ${barber.full_name}: dailyRate = ${dailyRate}`,
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
    // Track barber's share of fees (for display in payroll)
    let barberBookingFees = 0;
    let barberLateFees = 0;
    let barberConvenienceFees = 0;
    // Get fee percentages (default to 100% if not set)
    const bookingFeePercentage = payrollSettings?.booking_fee_percentage ?? 100;
    const lateFeePercentage = payrollSettings?.late_fee_percentage ?? 100;
    const convenienceFeePercentage = payrollSettings?.convenience_fee_percentage ?? 100;

    if (totalServices > 0 || totalProducts > 0) {
      // Pre-sort daily rates to find the latest active one (retroactive rule)
      const currentRateDoc = barberDailyRates.slice().sort((a, b) => b.effective_from - a.effective_from)[0];
      const currentDailyRate = currentRateDoc?.daily_rate || 0;

      // Debug logging to check daily rates and commissions
      console.log(
        `Barber ${barber.full_name}: currentDailyRate = ${currentDailyRate}, days worked = ${allWorkDates.size}`,
      );
      for (const dateKey of allWorkDates) {
        const dayServiceCommission = dailyCommissions.get(dateKey) || 0;
        const dayProductCommission = dailyProductCommissions.get(dateKey) || 0;

        // NEW LOGIC: Product commission is ADDED on top of daily salary
        // Compare service commission vs daily rate, then add product commission
        let dayServicePay = Math.max(dayServiceCommission, currentDailyRate);

        // Add fees if enabled in payroll settings


        const dayPay = dayServicePay + dayProductCommission;
        finalSalary += dayPay;

        console.log(
          `Date ${dateKey}: service comm = ${dayServiceCommission}, product comm = ${dayProductCommission}, service pay = ${dayServicePay}, final dayPay (with product bonus) = ${dayPay}`,
        );
      }

      // Add booking, late, and convenience fees if enabled (with percentage)
      if (payrollSettings?.include_booking_fee) {
        barberBookingFees = (totalBookingFees * bookingFeePercentage) / 100;
        finalSalary += barberBookingFees;
        console.log(`Added booking fees: ${totalBookingFees} x ${bookingFeePercentage}% = ${barberBookingFees}`);
      }
      if (payrollSettings?.include_late_fee) {
        barberLateFees = (totalLateFees * lateFeePercentage) / 100;
        finalSalary += barberLateFees;
        console.log(`Added late fees: ${totalLateFees} x ${lateFeePercentage}% = ${barberLateFees}`);
      }
      if (payrollSettings?.include_convenience_fee) {
        barberConvenienceFees = (totalConvenienceFees * convenienceFeePercentage) / 100;
        finalSalary += barberConvenienceFees;
        console.log(`Added convenience fees: ${totalConvenienceFees} x ${convenienceFeePercentage}% = ${barberConvenienceFees}`);
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

      // Fees (total amounts collected)
      total_booking_fees: totalBookingFees,
      total_late_fees: totalLateFees,
      total_convenience_fees: totalConvenienceFees,
      // Fee percentages for barber
      booking_fee_percentage: bookingFeePercentage,
      late_fee_percentage: lateFeePercentage,
      convenience_fee_percentage: convenienceFeePercentage,
      // Barber's calculated share of fees
      barber_booking_fees: barberBookingFees,
      barber_late_fees: barberLateFees,
      barber_convenience_fees: barberConvenienceFees,

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
export const getBookingsForPrint = query({
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

    const items = bookings
      .filter((b) => {
        const completed = b.status === "completed";
        const paid = b.payment_status === "paid";

        let bookingDateTimestamp = b.updatedAt;
        if (b.date) {
          try {
            const bookingDate = new Date(b.date + "T00:00:00.000Z");
            bookingDateTimestamp = bookingDate.getTime();
          } catch (error) {
            // ignore
          }
        }

        return completed && paid &&
          bookingDateTimestamp >= args.period_start &&
          bookingDateTimestamp <= args.period_end;
      })
      .map((b) => ({
        id: b._id,
        booking_code: b.booking_code,
        date: b.date,
        time: b.time,
        price: b.price,
        status: b.status,
        payment_status: b.payment_status,
        updatedAt: b.updatedAt,
      }));

    return items;
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

// Check for overlapping periods before creating
export const checkPeriodOverlap = query({
  args: {
    branch_id: v.id("branches"),
    period_start: v.number(),
    period_end: v.number(),
  },
  handler: async (ctx, args) => {
    const existingPeriods = await ctx.db
      .query("payroll_periods")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    const overlappingPeriods = [];

    for (const existing of existingPeriods) {
      const hasOverlap =
        args.period_start <= existing.period_end &&
        args.period_end >= existing.period_start;

      if (hasOverlap) {
        overlappingPeriods.push({
          id: existing._id,
          period_start: existing.period_start,
          period_end: existing.period_end,
          status: existing.status,
          period_type: existing.period_type,
        });
      }
    }

    return {
      hasOverlap: overlappingPeriods.length > 0,
      overlappingPeriods,
      message: overlappingPeriods.length > 0
        ? `This period overlaps with ${overlappingPeriods.length} existing period(s). Creating overlapping periods can result in double payments.`
        : null,
    };
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
    // Validate that period_start is before period_end
    if (args.period_start >= args.period_end) {
      throwUserError(
        ERROR_CODES.INVALID_INPUT,
        "Period start date must be before period end date.",
      );
    }

    // Check for overlapping periods to prevent double-pay
    // Two periods overlap if: new_start <= existing_end AND new_end >= existing_start
    const existingPeriods = await ctx.db
      .query("payroll_periods")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    for (const existing of existingPeriods) {
      const hasOverlap =
        args.period_start <= existing.period_end &&
        args.period_end >= existing.period_start;

      if (hasOverlap) {
        // Format dates for error message
        const existingStartDate = new Date(existing.period_start).toLocaleDateString();
        const existingEndDate = new Date(existing.period_end).toLocaleDateString();
        const newStartDate = new Date(args.period_start).toLocaleDateString();
        const newEndDate = new Date(args.period_end).toLocaleDateString();

        throwUserError(
          ERROR_CODES.INVALID_INPUT,
          `Cannot create payroll period (${newStartDate} - ${newEndDate}) because it overlaps with an existing period (${existingStartDate} - ${existingEndDate}).`,
          "Please choose dates that don't overlap with existing payroll periods to prevent double payments.",
        );
      }
    }

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

    // Check if period is locked
    if (period.is_locked) {
      throwUserError(
        ERROR_CODES.INVALID_INPUT,
        "Cannot recalculate a locked payroll period.",
        "Unlock the period first if you need to make changes.",
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
    const branchIdValue = period.branch_id;
    let barbersToProcess = await ctx.db
      .query("barbers")
      .withIndex("by_branch", (q) => q.eq("branch_id", branchIdValue))
      .filter((q) => q.eq(q.field("is_active"), true))
      .collect();

    // Merge active barbers with any barbers that already have records for this period
    const barberMap = new Map(
      barbersToProcess.map((barber) => [barber._id, barber]),
    );
    for (const record of existingRecords) {
      if (!barberMap.has(record.barber_id)) {
        const barber = await ctx.db.get(record.barber_id);
        if (barber) {
          barberMap.set(barber._id, barber);
        }
      }
    }

    const barbersToCalculate = Array.from(barberMap.values());
    const existingRecordMap = new Map(
      existingRecords.map((record) => [record.barber_id, record]),
    );

    // Load payroll settings for zero-day pay check
    const payrollSettings = await ctx.db
      .query("payroll_settings")
      .withIndex("by_branch", (q) => q.eq("branch_id", period.branch_id))
      .filter((q) => q.eq(q.field("is_active"), true))
      .first();
    const zeroDayPayEnabled = payrollSettings?.zero_day_source === "manual" || payrollSettings?.zero_day_source === "attendance";

    let totalEarnings = 0;
    let totalServiceRevenue = 0;
    let totalProductRevenue = 0;
    let totalCommissions = 0;
    let totalDeductions = 0;
    const timestamp = Date.now();

    // Calculate earnings for each barber
    for (const barber of barbersToCalculate) {
      const earnings = await ctx.runQuery(
        api.services.payroll.calculateBarberEarnings,
        {
          barber_id: barber._id,
          period_start: period.period_start,
          period_end: period.period_end,
        },
      );

      // Get cash advance deductions for this barber
      const cashAdvanceData = await ctx.runQuery(
        api.services.payroll.getCashAdvanceDeductions,
        { barber_id: barber._id },
      );

      // Check for approved zero-day claims matching current mode
      let zeroDayPay = 0;
      let zeroServiceDays = 0;
      if (zeroDayPayEnabled) {
        const currentSource = payrollSettings?.zero_day_source; // "manual" | "attendance"
        const zeroDayClaims = await ctx.db
          .query("payroll_zero_day_claims")
          .withIndex("by_period_barber", (q) =>
            q
              .eq("payroll_period_id", args.payroll_period_id)
              .eq("barber_id", barber._id),
          )
          .collect();

        // Only use claims whose source matches the current mode
        const zeroDayClaim = zeroDayClaims.find(
          (c) => c.status === "approved" && (c.source === currentSource || (!c.source && currentSource === "manual"))
        );

        if (zeroDayClaim) {
          zeroServiceDays = zeroDayClaim.zero_days;
          zeroDayPay = zeroDayClaim.total_amount;
        }
      }

      // --- OT/UT/Late calculation (attendance mode only, barber must have a schedule) ---
      let attendanceSummary: AttendanceSummary | undefined = undefined;
      let otPay = 0;
      if (
        payrollSettings?.zero_day_source === "attendance" &&
        barber.schedule
      ) {
        const allAttendance = await ctx.db
          .query("timeAttendance")
          .withIndex("by_barber", (q) => q.eq("barber_id", barber._id))
          .collect();

        const approvedRecords = allAttendance.filter((r: any) => {
          const status = r.status || (r.clock_out ? "approved_out" : "approved_in");
          return (
            status === "approved_out" &&
            r.clock_out &&
            r.clock_in >= period.period_start &&
            r.clock_in <= period.period_end
          );
        });

        if (approvedRecords.length > 0) {
          attendanceSummary = calculateAttendanceSummary(
            approvedRecords,
            barber.schedule as BarberSchedule,
            barber.ot_hourly_rate || 0,
            barber.penalty_hourly_rate || 0,
          );
          otPay = attendanceSummary.total_ot_pay;
        }
      }

      // Calculate totals including cash advance (using installment amount for this period)
      const cashAdvanceDeduction = cashAdvanceData.installmentTotal;
      const penaltyDeduction = attendanceSummary?.total_penalty || 0;
      const dailyPayWithZeroDays = earnings.daily_pay + zeroDayPay + otPay;
      const totalDeductionsWithAdvance = earnings.total_deductions + cashAdvanceDeduction + penaltyDeduction;
      const netPayWithAdvance = dailyPayWithZeroDays - totalDeductionsWithAdvance;

      // Map cash advance details to schema-compatible format
      // Using only base fields for backward compatibility with older schema versions
      // The installment tracking is handled by the cashAdvances table directly
      const cashAdvanceDetailsForSchema = cashAdvanceData.advances.map((adv: any) => ({
        id: adv.id,
        amount: adv.installment_amount || adv.amount, // Use installment amount for this period
        requested_at: adv.requested_at,
        paid_out_at: adv.paid_out_at,
      }));

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
        days_worked: earnings.days_worked + zeroServiceDays,
        daily_pay: dailyPayWithZeroDays,
        zero_service_days: zeroServiceDays,
        zero_day_pay: zeroDayPay,
        attendance_summary: attendanceSummary,
        total_booking_fees: earnings.total_booking_fees,
        total_late_fees: earnings.total_late_fees,
        total_convenience_fees: earnings.total_convenience_fees,
        // Fee percentages
        booking_fee_percentage: earnings.booking_fee_percentage,
        late_fee_percentage: earnings.late_fee_percentage,
        convenience_fee_percentage: earnings.convenience_fee_percentage,
        // Barber's share of fees
        barber_booking_fees: earnings.barber_booking_fees,
        barber_late_fees: earnings.barber_late_fees,
        barber_convenience_fees: earnings.barber_convenience_fees,
        tax_deduction: earnings.tax_deduction,
        cash_advance_deduction: cashAdvanceDeduction,
        cash_advance_details: cashAdvanceDetailsForSchema,
        other_deductions: earnings.other_deductions,
        total_deductions: totalDeductionsWithAdvance,
        net_pay: netPayWithAdvance,
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
        earnings.total_service_revenue + earnings.total_transaction_revenue + (earnings.total_product_revenue || 0);
      totalServiceRevenue += earnings.total_service_revenue || 0;
      totalProductRevenue += earnings.total_product_revenue || 0;
      // New rule: commissions total equals the final daily salary total (including zero-day pay)
      totalCommissions += dailyPayWithZeroDays || 0;
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
      total_service_revenue: totalServiceRevenue,
      total_product_revenue: totalProductRevenue,
      total_commissions: totalCommissions,
      total_deductions: totalDeductions,
      calculated_at: timestamp,
      calculated_by: args.calculated_by,
      updatedAt: timestamp,
    });

    return {
      total_barbers: barbersToCalculate.length,
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

// Delete a payroll period and all its related records (if not paid or locked)
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
    if (period.is_locked) {
      throwUserError(
        ERROR_CODES.INVALID_INPUT,
        "Cannot delete a locked payroll period",
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

// Lock a payroll period to prevent recalculation
export const lockPayrollPeriod = mutation({
  args: {
    payroll_period_id: v.id("payroll_periods"),
    locked_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const period = await ctx.db.get(args.payroll_period_id);
    if (!period) {
      throwUserError(ERROR_CODES.PAYROLL_PERIOD_NOT_FOUND);
    }

    if (period.is_locked) {
      throwUserError(
        ERROR_CODES.INVALID_INPUT,
        "This payroll period is already locked.",
      );
    }

    // Only allow locking if period is calculated or paid
    if (period.status === "draft") {
      throwUserError(
        ERROR_CODES.INVALID_INPUT,
        "Cannot lock a draft payroll period. Calculate it first.",
      );
    }

    const timestamp = Date.now();
    await ctx.db.patch(args.payroll_period_id, {
      is_locked: true,
      locked_at: timestamp,
      locked_by: args.locked_by,
      updatedAt: timestamp,
    });

    return { success: true };
  },
});

// Unlock a payroll period to allow recalculation (admin only)
export const unlockPayrollPeriod = mutation({
  args: {
    payroll_period_id: v.id("payroll_periods"),
    unlocked_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const period = await ctx.db.get(args.payroll_period_id);
    if (!period) {
      throwUserError(ERROR_CODES.PAYROLL_PERIOD_NOT_FOUND);
    }

    if (!period.is_locked) {
      throwUserError(
        ERROR_CODES.INVALID_INPUT,
        "This payroll period is not locked.",
      );
    }

    // Cannot unlock a paid period
    if (period.status === "paid") {
      throwUserError(
        ERROR_CODES.INVALID_INPUT,
        "Cannot unlock a paid payroll period.",
      );
    }

    const timestamp = Date.now();
    await ctx.db.patch(args.payroll_period_id, {
      is_locked: false,
      locked_at: undefined,
      locked_by: undefined,
      updatedAt: timestamp,
    });

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

    // Mark the payroll record as paid
    await ctx.db.patch(args.payroll_record_id, {
      status: "paid",
      payment_method: args.payment_method,
      payment_reference: args.payment_reference,
      paid_at: timestamp,
      paid_by: args.paid_by,
      notes: args.notes,
      updatedAt: timestamp,
    });

    // Process cash advance repayment if there was a deduction
    if (record.cash_advance_deduction && record.cash_advance_deduction > 0) {
      // Get the barber's user ID and process installment repayment
      const barber = await ctx.db.get(record.barber_id);
      if (barber?.user) {
        // Get active advances (paid_out status) and update installments
        const activeAdvances = await ctx.db
          .query("cashAdvances")
          .withIndex("by_barber", (q) => q.eq("barber_id", barber.user as Id<"users">))
          .filter((q) => q.eq(q.field("status"), "paid_out"))
          .collect();

        for (const advance of activeAdvances) {
          const repaymentTerms = advance.repayment_terms || 1;
          const installmentsPaid = (advance.installments_paid || 0) + 1;
          const totalRepaid = (advance.total_repaid || 0) + (advance.amount_per_installment || advance.amount);

          // Check if all installments are paid
          const isFullyRepaid = installmentsPaid >= repaymentTerms;

          if (isFullyRepaid) {
            // Mark as fully repaid
            // Note: payroll_id field removed due to schema sync issues
            await ctx.db.patch(advance._id, {
              status: "repaid",
              repaid_at: timestamp,
              installments_paid: installmentsPaid,
              total_repaid: advance.amount, // Set to full amount
              updated_at: timestamp,
            });
          } else {
            // Update installment progress (stay in paid_out status)
            await ctx.db.patch(advance._id, {
              installments_paid: installmentsPaid,
              total_repaid: Math.min(totalRepaid, advance.amount), // Don't exceed total
              updated_at: timestamp,
            });
          }
        }
      }
    }

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

    // Check for overlapping periods to prevent double-pay
    const existingPeriods = await ctx.db
      .query("payroll_periods")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    for (const existing of existingPeriods) {
      const hasOverlap =
        periodStart <= existing.period_end &&
        periodEnd >= existing.period_start;

      if (hasOverlap) {
        const existingStartDate = new Date(existing.period_start).toLocaleDateString();
        const existingEndDate = new Date(existing.period_end).toLocaleDateString();
        const newStartDate = new Date(periodStart).toLocaleDateString();
        const newEndDate = new Date(periodEnd).toLocaleDateString();

        throwUserError(
          ERROR_CODES.INVALID_INPUT,
          `Cannot generate payroll period (${newStartDate} - ${newEndDate}) because it overlaps with an existing period (${existingStartDate} - ${existingEndDate}).`,
          "The auto-generated period conflicts with an existing one. Delete the conflicting period or manually create a period with different dates.",
        );
      }
    }

    const timestamp = Date.now();
    return await ctx.db.insert("payroll_periods", {
      branch_id: args.branch_id,
      period_start: periodStart,
      period_end: periodEnd,
      period_type: settings.payout_frequency,
      status: "draft",
      total_earnings: 0,
      total_commissions: 0,
      total_deductions: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
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
      { barberId: args.barber_id },
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

// ============================================================================
// CASH ADVANCE INTEGRATION FOR PAYROLL
// ============================================================================

/**
 * Get active cash advances that should be deducted from payroll
 * Returns advances that are in "paid_out" status (given to barber, awaiting repayment)
 * Supports installment-based repayment (1, 2, or 3 installments)
 */
export const getCashAdvanceDeductions = query({
  args: {
    barber_id: v.id("barbers"),
  },
  handler: async (ctx, args) => {
    // Get the barber to find their user ID
    const barber = await ctx.db.get(args.barber_id);
    if (!barber || !barber.user) {
      return { advances: [], total: 0, installmentTotal: 0 };
    }

    // Get active advances (paid_out status means cash given, awaiting repayment)
    const activeAdvances = await ctx.db
      .query("cashAdvances")
      .withIndex("by_barber", (q) => q.eq("barber_id", barber.user as Id<"users">))
      .filter((q) => q.eq(q.field("status"), "paid_out"))
      .collect();

    // Calculate installment amount for this payroll period
    let installmentTotal = 0;
    const advancesWithInstallment = activeAdvances.map((adv) => {
      const repaymentTerms = adv.repayment_terms || 1;
      const installmentsPaid = adv.installments_paid || 0;
      const remainingInstallments = repaymentTerms - installmentsPaid;

      // Calculate amount for this installment
      // For the last installment, use remaining amount to handle rounding
      const totalRepaid = adv.total_repaid || 0;
      const remainingAmount = adv.amount - totalRepaid;
      let installmentAmount = adv.amount_per_installment || adv.amount;

      // If this is the last installment, pay the remaining amount
      if (remainingInstallments === 1) {
        installmentAmount = remainingAmount;
      }

      // Don't exceed remaining amount
      installmentAmount = Math.min(installmentAmount, remainingAmount);

      if (remainingInstallments > 0) {
        installmentTotal += installmentAmount;
      }

      return {
        id: adv._id,
        amount: adv.amount,
        installment_amount: installmentAmount,
        repayment_terms: repaymentTerms,
        installments_paid: installmentsPaid,
        remaining_installments: remainingInstallments,
        total_repaid: totalRepaid,
        remaining_amount: remainingAmount,
        requested_at: adv.requested_at,
        paid_out_at: adv.paid_out_at,
      };
    }).filter(adv => adv.remaining_installments > 0);

    return {
      advances: advancesWithInstallment,
      total: activeAdvances.reduce((sum, adv) => sum + adv.amount, 0),
      installmentTotal, // This is what should be deducted this payroll period
    };
  },
});

/**
 * Calculate barber earnings with cash advance deduction included
 * This extends the basic calculation to include cash advance in deductions
 */
export const calculateBarberEarningsWithAdvance = query({
  args: {
    barber_id: v.id("barbers"),
    period_start: v.number(),
    period_end: v.number(),
  },
  handler: async (ctx, args) => {
    // Get basic earnings calculation
    const earnings = await ctx.runQuery(
      api.services.payroll.calculateBarberEarnings,
      args
    );

    // Get cash advance deductions
    const cashAdvanceData = await ctx.runQuery(
      api.services.payroll.getCashAdvanceDeductions,
      { barber_id: args.barber_id }
    );

    // Calculate new totals with cash advance deduction (using installment amount for this period)
    const cashAdvanceDeduction = cashAdvanceData.installmentTotal;
    const newTotalDeductions = earnings.total_deductions + cashAdvanceDeduction;
    const newNetPay = earnings.daily_pay - newTotalDeductions;

    return {
      ...earnings,
      // Cash advance specific
      cash_advance_deduction: cashAdvanceDeduction,
      cash_advance_details: cashAdvanceData.advances,
      // Updated totals
      total_deductions: newTotalDeductions,
      net_pay: newNetPay,
    };
  },
});

/**
 * Process cash advance repayment when payroll is paid
 * Marks the cash advance as repaid and links it to the payroll record
 */
export const processCashAdvanceRepayment = mutation({
  args: {
    barber_id: v.id("barbers"),
    payroll_record_id: v.optional(v.id("payroll_records")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get the barber to find their user ID
    const barber = await ctx.db.get(args.barber_id);
    if (!barber || !barber.user) {
      return { success: false, message: "Barber not found" };
    }

    // Get active advances (paid_out status)
    const activeAdvances = await ctx.db
      .query("cashAdvances")
      .withIndex("by_barber", (q) => q.eq("barber_id", barber.user as Id<"users">))
      .filter((q) => q.eq(q.field("status"), "paid_out"))
      .collect();

    if (activeAdvances.length === 0) {
      return { success: true, message: "No active advances to repay", repaid: 0 };
    }

    // Mark all active advances as repaid
    let totalRepaid = 0;
    for (const advance of activeAdvances) {
      await ctx.db.patch(advance._id, {
        status: "repaid",
        repaid_at: now,
        updated_at: now,
      });
      totalRepaid += advance.amount;
    }

    return {
      success: true,
      message: `Repaid ${activeAdvances.length} advance(s)`,
      repaid: totalRepaid,
      count: activeAdvances.length,
    };
  },
});

// ─── Zero-Service Day Claims ─────────────────────────────────────────────────

/**
 * Get zero-day claims for a payroll period
 */
export const getZeroDayClaimsByPeriod = query({
  args: {
    payroll_period_id: v.id("payroll_periods"),
  },
  handler: async (ctx, args) => {
    const claims = await ctx.db
      .query("payroll_zero_day_claims")
      .withIndex("by_period", (q) =>
        q.eq("payroll_period_id", args.payroll_period_id),
      )
      .collect();

    // Enrich with barber names
    const enriched = await Promise.all(
      claims.map(async (claim) => {
        const barber = await ctx.db.get(claim.barber_id);
        return {
          ...claim,
          barber_name: barber?.full_name || "Unknown",
        };
      }),
    );

    return enriched;
  },
});

/**
 * Add or update a zero-service day claim for a barber in a payroll period.
 * One claim per barber per period — upserts if a pending/rejected claim exists.
 */
export const addZeroDayClaim = mutation({
  args: {
    payroll_period_id: v.id("payroll_periods"),
    barber_id: v.id("barbers"),
    zero_days: v.number(),
    notes: v.optional(v.string()),
    requested_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    if (args.zero_days <= 0) {
      throwUserError(
        ERROR_CODES.INVALID_INPUT,
        "Zero-service days must be greater than 0.",
      );
    }

    // Validate period exists and is not paid/locked
    const period = await ctx.db.get(args.payroll_period_id);
    if (!period) {
      throwUserError(ERROR_CODES.PAYROLL_PERIOD_NOT_FOUND);
    }
    if (period.status === "paid") {
      throwUserError(
        ERROR_CODES.INVALID_INPUT,
        "Cannot add zero-day claims to a paid payroll period.",
      );
    }
    if (period.is_locked) {
      throwUserError(
        ERROR_CODES.INVALID_INPUT,
        "Cannot add zero-day claims to a locked payroll period.",
      );
    }

    // Validate barber exists
    const barber = await ctx.db.get(args.barber_id);
    if (!barber) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Barber not found.");
    }

    // Look up barber's current daily rate
    const barberDailyRates = await ctx.db
      .query("barber_daily_rates")
      .withIndex("by_barber_active", (q) =>
        q.eq("barber_id", args.barber_id).eq("is_active", true),
      )
      .collect();

    const latestRate = barberDailyRates
      .slice()
      .sort((a, b) => b.effective_from - a.effective_from)[0];
    const dailyRate = latestRate?.daily_rate || 0;

    if (dailyRate === 0) {
      throwUserError(
        ERROR_CODES.INVALID_INPUT,
        "Barber has no active daily rate configured. Set a daily rate first.",
      );
    }

    const totalAmount = args.zero_days * dailyRate;
    const now = Date.now();

    // Check for existing claim (upsert pattern)
    const existingClaim = await ctx.db
      .query("payroll_zero_day_claims")
      .withIndex("by_period_barber", (q) =>
        q
          .eq("payroll_period_id", args.payroll_period_id)
          .eq("barber_id", args.barber_id),
      )
      .first();

    if (existingClaim) {
      // Can only update pending or rejected claims
      if (existingClaim.status === "approved") {
        throwUserError(
          ERROR_CODES.INVALID_INPUT,
          "An approved claim already exists for this barber. Reject or delete it first.",
        );
      }

      await ctx.db.patch(existingClaim._id, {
        zero_days: args.zero_days,
        daily_rate_applied: dailyRate,
        total_amount: totalAmount,
        source: "manual",
        notes: args.notes,
        status: "pending",
        requested_by: args.requested_by,
        rejection_reason: undefined,
        updatedAt: now,
      });

      return {
        success: true,
        claim_id: existingClaim._id,
        is_update: true,
        total_amount: totalAmount,
        daily_rate: dailyRate,
      };
    }

    const claimId = await ctx.db.insert("payroll_zero_day_claims", {
      payroll_period_id: args.payroll_period_id,
      barber_id: args.barber_id,
      branch_id: period.branch_id,
      zero_days: args.zero_days,
      daily_rate_applied: dailyRate,
      total_amount: totalAmount,
      source: "manual",
      notes: args.notes,
      status: "pending",
      requested_by: args.requested_by,
      createdAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      claim_id: claimId,
      is_update: false,
      total_amount: totalAmount,
      daily_rate: dailyRate,
    };
  },
});

/**
 * Approve a pending zero-day claim (branch_admin only)
 */
export const approveZeroDayClaim = mutation({
  args: {
    claim_id: v.id("payroll_zero_day_claims"),
    approved_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const claim = await ctx.db.get(args.claim_id);
    if (!claim) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Claim not found.");
    }

    if (claim.status !== "pending") {
      throwUserError(
        ERROR_CODES.INVALID_INPUT,
        `Cannot approve a claim with status "${claim.status}".`,
      );
    }

    const now = Date.now();
    await ctx.db.patch(args.claim_id, {
      status: "approved",
      approved_by: args.approved_by,
      approved_at: now,
      updatedAt: now,
    });

    return { success: true };
  },
});

/**
 * Reject a pending zero-day claim
 */
export const rejectZeroDayClaim = mutation({
  args: {
    claim_id: v.id("payroll_zero_day_claims"),
    rejected_by: v.id("users"),
    rejection_reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const claim = await ctx.db.get(args.claim_id);
    if (!claim) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Claim not found.");
    }

    if (claim.status !== "pending") {
      throwUserError(
        ERROR_CODES.INVALID_INPUT,
        `Cannot reject a claim with status "${claim.status}".`,
      );
    }

    const now = Date.now();
    await ctx.db.patch(args.claim_id, {
      status: "rejected",
      approved_by: args.rejected_by,
      rejection_reason: args.rejection_reason,
      updatedAt: now,
    });

    return { success: true };
  },
});

/**
 * Auto-populate zero-day claims from attendance records.
 * Cross-references timeAttendance (approved clock-ins) with bookings/products
 * to find days barbers were present but had no completed services.
 */
export const autoPopulateZeroDayClaims = mutation({
  args: {
    payroll_period_id: v.id("payroll_periods"),
    requested_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const period = await ctx.db.get(args.payroll_period_id);
    if (!period) {
      throwUserError(ERROR_CODES.PAYROLL_PERIOD_NOT_FOUND);
    }
    if (period.status === "paid") {
      throwUserError(
        ERROR_CODES.INVALID_INPUT,
        "Cannot add claims to a paid payroll period.",
      );
    }
    if (period.is_locked) {
      throwUserError(
        ERROR_CODES.INVALID_INPUT,
        "Cannot add claims to a locked payroll period.",
      );
    }

    // Get all active barbers in the branch
    const barbers = await ctx.db
      .query("barbers")
      .withIndex("by_branch", (q) => q.eq("branch_id", period.branch_id))
      .filter((q) => q.eq(q.field("is_active"), true))
      .collect();

    const now = Date.now();
    let totalClaimsCreated = 0;
    let totalZeroDays = 0;
    const claimSummary: { barber_name: string; zero_days: number }[] = [];

    for (const barber of barbers) {
      // 1. Get approved attendance records for this barber within the period
      const attendanceRecords = await ctx.db
        .query("timeAttendance")
        .withIndex("by_barber", (q) => q.eq("barber_id", barber._id))
        .collect();

      // Filter to approved records within the period
      const approvedInPeriod = attendanceRecords.filter((r) => {
        const status = r.status || (r.clock_out ? "approved_out" : "approved_in");
        const isApproved = status === "approved_in" || status === "approved_out";
        const inPeriod =
          r.clock_in >= period.period_start && r.clock_in <= period.period_end;
        return isApproved && inPeriod;
      });

      // Extract unique attendance dates (YYYY-MM-DD in PHT / UTC+8)
      const attendanceDates = new Set<string>();
      for (const record of approvedInPeriod) {
        const dateObj = new Date(record.clock_in + 8 * 60 * 60 * 1000);
        const dateKey = dateObj.toISOString().split("T")[0];
        attendanceDates.add(dateKey);
      }

      if (attendanceDates.size === 0) continue;

      // 2. Get completed bookings for this barber within the period
      const allBookings = await ctx.db
        .query("bookings")
        .withIndex("by_barber", (q) => q.eq("barber", barber._id))
        .collect();

      const workDates = new Set<string>();
      for (const b of allBookings) {
        if (b.status !== "completed" || b.payment_status !== "paid") continue;

        let bookingDateTimestamp = b.updatedAt;
        if (b.date) {
          try {
            bookingDateTimestamp = new Date(b.date + "T00:00:00.000Z").getTime();
          } catch {
            // fallback
          }
        }

        if (
          bookingDateTimestamp >= period.period_start &&
          bookingDateTimestamp <= period.period_end
        ) {
          if (b.date) workDates.add(b.date);
        }
      }

      // 3. Get product transaction dates for this barber within the period
      const allTransactions = await ctx.db
        .query("transactions")
        .withIndex("by_barber", (q) => q.eq("barber", barber._id))
        .collect();

      for (const t of allTransactions) {
        if (t.payment_status !== "completed") continue;
        if (t.createdAt < period.period_start || t.createdAt > period.period_end) continue;
        if (t.products && t.products.length > 0) {
          const dateKey = new Date(t.createdAt).toISOString().split("T")[0];
          workDates.add(dateKey);
        }
      }

      // 4. Zero-service days = attendance dates minus work dates
      const zeroDays = [...attendanceDates].filter(
        (date) => !workDates.has(date),
      );

      if (zeroDays.length === 0) continue;

      // 5. Look up barber's daily rate
      const barberDailyRates = await ctx.db
        .query("barber_daily_rates")
        .withIndex("by_barber_active", (q) =>
          q.eq("barber_id", barber._id).eq("is_active", true),
        )
        .collect();

      const latestRate = barberDailyRates
        .slice()
        .sort((a, b) => b.effective_from - a.effective_from)[0];
      const dailyRate = latestRate?.daily_rate || 0;

      if (dailyRate === 0) continue;

      const totalAmount = zeroDays.length * dailyRate;

      // 6. Upsert claim (one per barber per period)
      const existingClaim = await ctx.db
        .query("payroll_zero_day_claims")
        .withIndex("by_period_barber", (q) =>
          q
            .eq("payroll_period_id", args.payroll_period_id)
            .eq("barber_id", barber._id),
        )
        .first();

      if (existingClaim) {
        if (existingClaim.status === "approved") continue;
        await ctx.db.patch(existingClaim._id, {
          zero_days: zeroDays.length,
          daily_rate_applied: dailyRate,
          total_amount: totalAmount,
          source: "attendance",
          notes: `Auto: ${zeroDays.length} attendance day(s) with no services`,
          status: "pending",
          requested_by: args.requested_by,
          rejection_reason: undefined,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("payroll_zero_day_claims", {
          payroll_period_id: args.payroll_period_id,
          barber_id: barber._id,
          branch_id: period.branch_id,
          zero_days: zeroDays.length,
          daily_rate_applied: dailyRate,
          total_amount: totalAmount,
          source: "attendance",
          notes: `Auto: ${zeroDays.length} attendance day(s) with no services`,
          status: "pending",
          requested_by: args.requested_by,
          createdAt: now,
          updatedAt: now,
        });
      }

      totalClaimsCreated++;
      totalZeroDays += zeroDays.length;
      claimSummary.push({
        barber_name: barber.full_name,
        zero_days: zeroDays.length,
      });
    }

    return {
      success: true,
      claims_created: totalClaimsCreated,
      total_zero_days: totalZeroDays,
      summary: claimSummary,
    };
  },
});
