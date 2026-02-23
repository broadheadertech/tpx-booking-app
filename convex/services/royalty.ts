import { v } from "convex/values";
import { mutation, query, action } from "../_generated/server";
import { Resend } from "resend";
import { api } from "../_generated/api";

const resend = new Resend(process.env.RESEND_API_KEY || "missing_key");

// ============================================================================
// ROYALTY MANAGEMENT SERVICE
// ============================================================================
// Handles royalty configuration, calculation, and payment tracking
// Super Admin configures rates per branch; system calculates dues
// ============================================================================

// Clean up orphaned royalty configs/payments (branch was deleted/re-seeded)
export const cleanOrphanedRoyaltyData = mutation({
  args: {},
  handler: async (ctx) => {
    let deletedConfigs = 0;
    let deletedPayments = 0;

    // Clean orphaned configs
    const configs = await ctx.db.query("royaltyConfig").collect();
    for (const config of configs) {
      const branch = await ctx.db.get(config.branch_id);
      if (!branch) {
        await ctx.db.delete(config._id);
        deletedConfigs++;
      }
    }

    // Clean orphaned payments
    const payments = await ctx.db.query("royaltyPayments").collect();
    for (const payment of payments) {
      const branch = await ctx.db.get(payment.branch_id);
      if (!branch) {
        await ctx.db.delete(payment._id);
        deletedPayments++;
      }
    }

    return { deletedConfigs, deletedPayments };
  },
});

// Set or update royalty configuration for a branch
export const setRoyaltyConfig = mutation({
  args: {
    branch_id: v.id("branches"),
    royalty_type: v.union(v.literal("percentage"), v.literal("fixed")),
    rate: v.number(),
    billing_cycle: v.union(
      v.literal("monthly"),
      v.literal("quarterly"),
      v.literal("annually")
    ),
    billing_day: v.optional(v.number()),
    grace_period_days: v.optional(v.number()),
    late_fee_rate: v.optional(v.number()),
    notes: v.optional(v.string()),
    created_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const timestamp = Date.now();

    // Check if config already exists for this branch
    const existingConfig = await ctx.db
      .query("royaltyConfig")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .first();

    if (existingConfig) {
      // Update existing config
      await ctx.db.patch(existingConfig._id, {
        royalty_type: args.royalty_type,
        rate: args.rate,
        billing_cycle: args.billing_cycle,
        billing_day: args.billing_day ?? 1,
        grace_period_days: args.grace_period_days ?? 7,
        late_fee_rate: args.late_fee_rate ?? 0,
        notes: args.notes,
        is_active: true,
        updated_at: timestamp,
      });
      return existingConfig._id;
    } else {
      // Create new config
      return await ctx.db.insert("royaltyConfig", {
        branch_id: args.branch_id,
        royalty_type: args.royalty_type,
        rate: args.rate,
        billing_cycle: args.billing_cycle,
        billing_day: args.billing_day ?? 1,
        grace_period_days: args.grace_period_days ?? 7,
        late_fee_rate: args.late_fee_rate ?? 0,
        notes: args.notes,
        is_active: true,
        created_by: args.created_by,
        created_at: timestamp,
        updated_at: timestamp,
      });
    }
  },
});

// Get royalty configuration for a branch
export const getRoyaltyConfig = query({
  args: {
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("royaltyConfig")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .first();

    return config;
  },
});

// Get all royalty configurations (for Super Admin dashboard)
export const getAllRoyaltyConfigs = query({
  args: {},
  handler: async (ctx) => {
    const configs = await ctx.db.query("royaltyConfig").collect();

    // Enrich with branch details
    const enrichedConfigs = await Promise.all(
      configs.map(async (config) => {
        const branch = await ctx.db.get(config.branch_id);
        return {
          ...config,
          branch_name: branch?.name ?? "Unknown Branch",
          branch_code: branch?.branch_code ?? "N/A",
        };
      })
    );

    return enrichedConfigs;
  },
});

// Get active royalty configurations only
export const getActiveRoyaltyConfigs = query({
  args: {},
  handler: async (ctx) => {
    const configs = await ctx.db
      .query("royaltyConfig")
      .withIndex("by_active", (q) => q.eq("is_active", true))
      .collect();

    // Enrich with branch details
    const enrichedConfigs = await Promise.all(
      configs.map(async (config) => {
        const branch = await ctx.db.get(config.branch_id);
        return {
          ...config,
          branch_name: branch?.name ?? "Unknown Branch",
          branch_code: branch?.branch_code ?? "N/A",
        };
      })
    );

    return enrichedConfigs;
  },
});

// Deactivate royalty configuration for a branch
export const deactivateRoyaltyConfig = mutation({
  args: {
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("royaltyConfig")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .first();

    if (config) {
      await ctx.db.patch(config._id, {
        is_active: false,
        updated_at: Date.now(),
      });
      return { success: true, message: "Royalty configuration deactivated" };
    }

    return { success: false, message: "No royalty configuration found" };
  },
});

// Delete royalty configuration
export const deleteRoyaltyConfig = mutation({
  args: {
    config_id: v.id("royaltyConfig"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.config_id);
    return { success: true, message: "Royalty configuration deleted" };
  },
});

// ============================================================================
// ROYALTY PAYMENT FUNCTIONS
// ============================================================================

// Helper: Calculate period based on billing cycle
function calculateBillingPeriod(
  billingCycle: "monthly" | "quarterly" | "annually",
  referenceDate: Date
): { start: Date; end: Date; label: string } {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  if (billingCycle === "monthly") {
    // Previous month
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    const label = start.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    return { start, end, label };
  } else if (billingCycle === "quarterly") {
    // Previous quarter
    const currentQuarter = Math.floor(month / 3);
    const prevQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
    const prevQuarterYear = currentQuarter === 0 ? year - 1 : year;
    const startMonth = prevQuarter * 3;
    const start = new Date(prevQuarterYear, startMonth, 1);
    const end = new Date(prevQuarterYear, startMonth + 3, 0, 23, 59, 59, 999);
    const quarterNames = ["Q1", "Q2", "Q3", "Q4"];
    const label = `${quarterNames[prevQuarter]} ${prevQuarterYear}`;
    return { start, end, label };
  } else {
    // Previous year
    const start = new Date(year - 1, 0, 1);
    const end = new Date(year - 1, 11, 31, 23, 59, 59, 999);
    const label = `${year - 1}`;
    return { start, end, label };
  }
}

// Calculate and create royalty payment for a branch
export const calculateAndCreateRoyaltyPayment = mutation({
  args: {
    branch_id: v.id("branches"),
    created_by: v.id("users"),
    // Optional: Override period (for manual creation or testing)
    period_start: v.optional(v.number()),
    period_end: v.optional(v.number()),
    period_label: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const timestamp = Date.now();

    // Get the royalty config for this branch
    const config = await ctx.db
      .query("royaltyConfig")
      .withIndex("by_branch_active", (q) =>
        q.eq("branch_id", args.branch_id).eq("is_active", true)
      )
      .first();

    if (!config) {
      return {
        success: false,
        message: "No active royalty configuration found for this branch",
      };
    }

    // Determine the billing period
    let periodStart: number;
    let periodEnd: number;
    let periodLabel: string;

    if (args.period_start && args.period_end && args.period_label) {
      periodStart = args.period_start;
      periodEnd = args.period_end;
      periodLabel = args.period_label;
    } else {
      const billingPeriod = calculateBillingPeriod(config.billing_cycle, new Date());
      periodStart = billingPeriod.start.getTime();
      periodEnd = billingPeriod.end.getTime();
      periodLabel = billingPeriod.label;
    }

    // Check if payment already exists for this period
    const existingPayment = await ctx.db
      .query("royaltyPayments")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .filter((q) =>
        q.and(
          q.eq(q.field("period_start"), periodStart),
          q.eq(q.field("period_end"), periodEnd)
        )
      )
      .first();

    if (existingPayment) {
      return {
        success: false,
        message: `Royalty payment already exists for ${periodLabel}`,
        existingPaymentId: existingPayment._id,
      };
    }

    // Calculate branch revenue for the period
    // Get completed transactions for this branch in the period
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .filter((q) =>
        q.and(
          q.eq(q.field("payment_status"), "completed"),
          q.gte(q.field("createdAt"), periodStart),
          q.lte(q.field("createdAt"), periodEnd)
        )
      )
      .collect();

    // Calculate gross revenue (services + products - discounts)
    let grossRevenue = 0;
    for (const t of transactions) {
      let serviceTotal = 0;
      let productTotal = 0;

      for (const service of t.services || []) {
        serviceTotal += service.price * service.quantity;
      }

      for (const product of t.products || []) {
        productTotal += product.price * product.quantity;
      }

      const bookingFee = t.booking_fee || 0;
      const lateFee = t.late_fee || 0;
      const discount = t.discount_amount || 0;

      grossRevenue += serviceTotal + productTotal + bookingFee + lateFee - discount;
    }

    // Calculate royalty amount
    let royaltyAmount: number;
    if (config.royalty_type === "percentage") {
      royaltyAmount = Math.round(grossRevenue * (config.rate / 100) * 100) / 100;
    } else {
      royaltyAmount = config.rate;
    }

    // Calculate due date (billing_day of current month, or next month if already passed)
    const now = new Date();
    const billingDay = config.billing_day || 1;
    let dueDate = new Date(now.getFullYear(), now.getMonth(), billingDay);
    if (dueDate <= now) {
      dueDate = new Date(now.getFullYear(), now.getMonth() + 1, billingDay);
    }

    // Calculate grace period end
    const gracePeriodDays = config.grace_period_days || 7;
    const gracePeriodEnd = new Date(dueDate.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000);

    // Create the royalty payment record
    const paymentId = await ctx.db.insert("royaltyPayments", {
      branch_id: args.branch_id,
      config_id: config._id,
      period_start: periodStart,
      period_end: periodEnd,
      period_label: periodLabel,
      gross_revenue: grossRevenue,
      royalty_type: config.royalty_type,
      rate: config.rate,
      amount: royaltyAmount,
      total_due: royaltyAmount,
      status: "due",
      due_date: dueDate.getTime(),
      grace_period_end: gracePeriodEnd.getTime(),
      created_at: timestamp,
      created_by: args.created_by,
      updated_at: timestamp,
    });

    return {
      success: true,
      message: `Royalty payment created for ${periodLabel}`,
      paymentId,
      details: {
        grossRevenue,
        royaltyType: config.royalty_type,
        rate: config.rate,
        amount: royaltyAmount,
        dueDate: dueDate.toLocaleDateString(),
      },
    };
  },
});

// Generate royalty payments for all active branches (batch operation)
export const generateAllRoyaltyPayments = mutation({
  args: {
    created_by: v.id("users"),
    period_start: v.optional(v.number()),
    period_end: v.optional(v.number()),
    period_label: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get all active royalty configs
    const configs = await ctx.db
      .query("royaltyConfig")
      .withIndex("by_active", (q) => q.eq("is_active", true))
      .collect();

    const results = [];

    for (const config of configs) {
      const timestamp = Date.now();

      // Determine the billing period
      let periodStart: number;
      let periodEnd: number;
      let periodLabel: string;

      if (args.period_start && args.period_end && args.period_label) {
        periodStart = args.period_start;
        periodEnd = args.period_end;
        periodLabel = args.period_label;
      } else {
        const billingPeriod = calculateBillingPeriod(config.billing_cycle, new Date());
        periodStart = billingPeriod.start.getTime();
        periodEnd = billingPeriod.end.getTime();
        periodLabel = billingPeriod.label;
      }

      // Check if payment already exists
      const existingPayment = await ctx.db
        .query("royaltyPayments")
        .withIndex("by_branch", (q) => q.eq("branch_id", config.branch_id))
        .filter((q) =>
          q.and(
            q.eq(q.field("period_start"), periodStart),
            q.eq(q.field("period_end"), periodEnd)
          )
        )
        .first();

      if (existingPayment) {
        const branch = await ctx.db.get(config.branch_id);
        results.push({
          branch_id: config.branch_id,
          branch_name: branch?.name ?? "Unknown",
          success: false,
          message: `Already exists for ${periodLabel}`,
        });
        continue;
      }

      // Calculate revenue
      const transactions = await ctx.db
        .query("transactions")
        .withIndex("by_branch", (q) => q.eq("branch_id", config.branch_id))
        .filter((q) =>
          q.and(
            q.eq(q.field("payment_status"), "completed"),
            q.gte(q.field("createdAt"), periodStart),
            q.lte(q.field("createdAt"), periodEnd)
          )
        )
        .collect();

      let grossRevenue = 0;
      for (const t of transactions) {
        let serviceTotal = 0;
        let productTotal = 0;

        for (const service of t.services || []) {
          serviceTotal += service.price * service.quantity;
        }

        for (const product of t.products || []) {
          productTotal += product.price * product.quantity;
        }

        const bookingFee = t.booking_fee || 0;
        const lateFee = t.late_fee || 0;
        const discount = t.discount_amount || 0;

        grossRevenue += serviceTotal + productTotal + bookingFee + lateFee - discount;
      }

      // Calculate royalty
      let royaltyAmount: number;
      if (config.royalty_type === "percentage") {
        royaltyAmount = Math.round(grossRevenue * (config.rate / 100) * 100) / 100;
      } else {
        royaltyAmount = config.rate;
      }

      // Due date
      const now = new Date();
      const billingDay = config.billing_day || 1;
      let dueDate = new Date(now.getFullYear(), now.getMonth(), billingDay);
      if (dueDate <= now) {
        dueDate = new Date(now.getFullYear(), now.getMonth() + 1, billingDay);
      }

      const gracePeriodDays = config.grace_period_days || 7;
      const gracePeriodEnd = new Date(dueDate.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000);

      // Create payment
      await ctx.db.insert("royaltyPayments", {
        branch_id: config.branch_id,
        config_id: config._id,
        period_start: periodStart,
        period_end: periodEnd,
        period_label: periodLabel,
        gross_revenue: grossRevenue,
        royalty_type: config.royalty_type,
        rate: config.rate,
        amount: royaltyAmount,
        total_due: royaltyAmount,
        status: "due",
        due_date: dueDate.getTime(),
        grace_period_end: gracePeriodEnd.getTime(),
        created_at: timestamp,
        created_by: args.created_by,
        updated_at: timestamp,
      });

      const branch = await ctx.db.get(config.branch_id);
      results.push({
        branch_id: config.branch_id,
        branch_name: branch?.name ?? "Unknown",
        success: true,
        amount: royaltyAmount,
        period: periodLabel,
      });
    }

    return {
      success: true,
      total: configs.length,
      created: results.filter((r) => r.success).length,
      skipped: results.filter((r) => !r.success).length,
      results,
    };
  },
});

// Get all royalty payments (for Super Admin dashboard)
export const getAllRoyaltyPayments = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("due"),
        v.literal("overdue"),
        v.literal("paid"),
        v.literal("waived")
      )
    ),
  },
  handler: async (ctx, args) => {
    let payments;

    if (args.status) {
      payments = await ctx.db
        .query("royaltyPayments")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    } else {
      payments = await ctx.db
        .query("royaltyPayments")
        .order("desc")
        .collect();
    }

    // Enrich with branch details
    const enrichedPayments = await Promise.all(
      payments.map(async (payment) => {
        const branch = await ctx.db.get(payment.branch_id);
        return {
          ...payment,
          branch_name: branch?.name ?? "Unknown Branch",
          branch_code: branch?.branch_code ?? "N/A",
        };
      })
    );

    return enrichedPayments;
  },
});

// Get royalty payments for a specific branch
export const getRoyaltyPaymentsByBranch = query({
  args: {
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const payments = await ctx.db
      .query("royaltyPayments")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .order("desc")
      .collect();

    return payments;
  },
});

// Get pending (due + overdue) royalty payments
export const getPendingRoyaltyPayments = query({
  args: {},
  handler: async (ctx) => {
    const duePayments = await ctx.db
      .query("royaltyPayments")
      .withIndex("by_status", (q) => q.eq("status", "due"))
      .collect();

    const overduePayments = await ctx.db
      .query("royaltyPayments")
      .withIndex("by_status", (q) => q.eq("status", "overdue"))
      .collect();

    const allPending = [...duePayments, ...overduePayments];

    // Enrich with branch details
    const enrichedPayments = await Promise.all(
      allPending.map(async (payment) => {
        const branch = await ctx.db.get(payment.branch_id);
        return {
          ...payment,
          branch_name: branch?.name ?? "Unknown Branch",
          branch_code: branch?.branch_code ?? "N/A",
        };
      })
    );

    // Sort by due date
    return enrichedPayments.sort((a, b) => a.due_date - b.due_date);
  },
});

// Update overdue status (can be called by scheduled job or manually)
export const updateOverduePayments = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Get all "due" payments past grace period
    const duePayments = await ctx.db
      .query("royaltyPayments")
      .withIndex("by_status", (q) => q.eq("status", "due"))
      .collect();

    let updatedCount = 0;

    for (const payment of duePayments) {
      if (now > payment.grace_period_end) {
        // Calculate late fee
        const config = await ctx.db.get(payment.config_id);
        const lateFeeRate = config?.late_fee_rate || 0;
        const lateFee = Math.round(payment.amount * (lateFeeRate / 100) * 100) / 100;

        await ctx.db.patch(payment._id, {
          status: "overdue",
          late_fee: lateFee,
          total_due: payment.amount + lateFee,
          updated_at: now,
        });
        updatedCount++;
      }
    }

    return {
      success: true,
      updatedCount,
      message: `Updated ${updatedCount} payment(s) to overdue status`,
    };
  },
});

// ============================================================================
// EMAIL NOTIFICATION FUNCTIONS
// ============================================================================

// Send royalty due email notification to branch admin
export const sendRoyaltyDueEmail = action({
  args: {
    payment_id: v.id("royaltyPayments"),
  },
  handler: async (ctx, args) => {
    // Get payment details
    const payment = await ctx.runQuery(api.services.royalty.getRoyaltyPaymentById, {
      payment_id: args.payment_id,
    });

    if (!payment) {
      return { success: false, message: "Payment not found" };
    }

    // Get branch details
    const branch = await ctx.runQuery(api.services.branches.getBranchById, {
      branchId: payment.branch_id,
    });

    if (!branch) {
      return { success: false, message: "Branch not found" };
    }

    // Get branch admin(s) - users with branch_admin role for this branch
    const branchAdmins = await ctx.runQuery(api.services.auth.getUsersByBranch, {
      branch_id: payment.branch_id,
    });

    const admins = branchAdmins?.filter(
      (u: { role: string }) => u.role === "branch_admin" || u.role === "admin"
    ) || [];

    if (admins.length === 0) {
      return { success: false, message: "No branch admin found" };
    }

    // Get branding for email styling
    const branding = await ctx.runQuery(api.services.branding.getGlobalBranding, {});

    const primaryColor = branding?.primary_color || "#F97316";
    const accentColor = branding?.accent_color || "#EA580C";
    const bgColor = branding?.bg_color || "#0A0A0A";
    const brandName = branding?.display_name || "TipunoX";

    // Format dates and amounts
    const dueDate = new Date(payment.due_date).toLocaleDateString("en-PH", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const gracePeriodEnd = new Date(payment.grace_period_end).toLocaleDateString("en-PH", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const amount = payment.total_due.toLocaleString("en-PH", {
      style: "currency",
      currency: "PHP",
    });
    const revenue = payment.gross_revenue.toLocaleString("en-PH", {
      style: "currency",
      currency: "PHP",
    });

    const rateDisplay =
      payment.royalty_type === "percentage"
        ? `${payment.rate}% of revenue`
        : `Fixed amount`;

    // Send email to each admin
    const results = [];

    for (const admin of admins) {
      if (!admin.email) continue;

      const emailData = {
        from: `${brandName} <no-reply@tipunoxph.com>`,
        to: admin.email,
        subject: `Royalty Payment Due - ${payment.period_label}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Royalty Payment Due - ${brandName}</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background-color: ${bgColor};
                color: #ffffff;
                margin: 0;
                padding: 0;
                line-height: 1.6;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 40px 20px;
              }
              .header {
                text-align: center;
                margin-bottom: 40px;
              }
              .logo {
                font-size: 28px;
                font-weight: bold;
                color: ${primaryColor};
              }
              .content {
                background: linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%);
                border-radius: 16px;
                padding: 40px;
                border: 1px solid #333;
                box-shadow: 0 10px 30px rgba(0,0,0,0.5);
              }
              .title {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 20px;
                color: ${primaryColor};
                text-align: center;
              }
              .amount-box {
                background: linear-gradient(135deg, ${primaryColor}20 0%, ${accentColor}20 100%);
                border: 2px solid ${primaryColor};
                border-radius: 12px;
                padding: 24px;
                text-align: center;
                margin: 24px 0;
              }
              .amount {
                font-size: 36px;
                font-weight: bold;
                color: ${primaryColor};
              }
              .amount-label {
                color: #888;
                font-size: 14px;
                margin-top: 8px;
              }
              .details {
                margin: 24px 0;
              }
              .detail-row {
                display: flex;
                justify-content: space-between;
                padding: 12px 0;
                border-bottom: 1px solid #333;
              }
              .detail-label {
                color: #888;
              }
              .detail-value {
                color: #fff;
                font-weight: 500;
              }
              .warning {
                background: #7f1d1d40;
                border: 1px solid #dc2626;
                border-radius: 8px;
                padding: 16px;
                margin: 24px 0;
                color: #fca5a5;
                font-size: 14px;
              }
              .payment-info {
                background: #14532d40;
                border: 1px solid #22c55e;
                border-radius: 8px;
                padding: 16px;
                margin: 24px 0;
                color: #86efac;
              }
              .payment-info h4 {
                margin: 0 0 12px 0;
                color: #22c55e;
              }
              .footer {
                text-align: center;
                margin-top: 30px;
                color: #666;
                font-size: 14px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">${brandName}</div>
              </div>

              <div class="content">
                <div class="title">Royalty Payment Due</div>

                <p style="color: #ccc; text-align: center;">
                  Hello ${admin.first_name || "Admin"},<br>
                  Your royalty payment for <strong>${branch.name}</strong> is now due.
                </p>

                <div class="amount-box">
                  <div class="amount">${amount}</div>
                  <div class="amount-label">Amount Due for ${payment.period_label}</div>
                </div>

                <div class="details">
                  <div class="detail-row">
                    <span class="detail-label">Period</span>
                    <span class="detail-value">${payment.period_label}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Branch Revenue</span>
                    <span class="detail-value">${revenue}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Royalty Rate</span>
                    <span class="detail-value">${rateDisplay}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Due Date</span>
                    <span class="detail-value">${dueDate}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Grace Period Until</span>
                    <span class="detail-value">${gracePeriodEnd}</span>
                  </div>
                </div>

                <div class="warning">
                  <strong>Important:</strong> Late payments after ${gracePeriodEnd} may incur additional fees.
                </div>

                <div class="payment-info">
                  <h4>Payment Instructions</h4>
                  <p style="margin: 0;">
                    Please coordinate with the Super Admin for payment details and instructions.
                    Once payment is made, you will receive an official receipt via email.
                  </p>
                </div>
              </div>

              <div class="footer">
                <p>This is an automated notification from ${brandName}.</p>
                <p>If you have questions, please contact your account manager.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      };

      try {
        // Check if in dev mode
        const isDev = process.env.NODE_ENV === "development";

        if (isDev && !process.env.RESEND_API_KEY) {
          console.log("DEV MODE: Would send royalty due email to:", admin.email);
          results.push({
            email: admin.email,
            success: true,
            isDev: true,
            messageId: "dev-mock-" + Date.now(),
          });
          continue;
        }

        const result = await resend.emails.send(emailData as any);

        if (result.error) {
          console.error("Royalty email service error:", result.error);
          results.push({
            email: admin.email,
            success: false,
            error: result.error.message,
          });
        } else {
          results.push({
            email: admin.email,
            success: true,
            messageId: result.data?.id,
          });
        }
      } catch (error: any) {
        console.error("Royalty email error:", error);
        results.push({
          email: admin.email,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    // Create in-app notification for branch admin
    for (const admin of admins) {
      await ctx.runMutation(api.services.notifications.createNotification, {
        title: "Royalty Payment Due",
        message: `Your royalty payment of ${amount} for ${payment.period_label} is due on ${dueDate}.`,
        type: "payment",
        priority: "high",
        recipient_id: admin._id,
        recipient_type: "admin",
        branch_id: payment.branch_id,
        metadata: {
          payment_id: args.payment_id,
          amount: payment.total_due,
          due_date: payment.due_date,
        },
      });
    }

    return {
      success: successCount > 0,
      message: `Sent ${successCount}/${admins.length} royalty due emails`,
      results,
    };
  },
});

// Query to get a single royalty payment by ID (needed for action)
export const getRoyaltyPaymentById = query({
  args: {
    payment_id: v.id("royaltyPayments"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.payment_id);
  },
});

// ============================================================================
// OFFICIAL RECEIPT FUNCTIONS (Story 5-5)
// ============================================================================

// Helper: Generate next sequential receipt number (NFR11 compliance)
async function getNextReceiptNumber(ctx: any): Promise<string> {
  const year = new Date().getFullYear();
  const counterType = "official_receipt";

  // Get or create counter for this year
  const counter = await ctx.db
    .query("receiptCounters")
    .withIndex("by_type_year", (q: any) =>
      q.eq("counter_type", counterType).eq("year", year)
    )
    .first();

  let nextNumber: number;

  if (counter) {
    // Increment existing counter
    nextNumber = counter.last_number + 1;
    await ctx.db.patch(counter._id, {
      last_number: nextNumber,
      updated_at: Date.now(),
    });
  } else {
    // Create new counter for this year (reset to 1)
    nextNumber = 1;
    await ctx.db.insert("receiptCounters", {
      counter_type: counterType,
      year: year,
      last_number: nextNumber,
      updated_at: Date.now(),
    });
  }

  // Format: OR-2026-00001
  const paddedNumber = String(nextNumber).padStart(5, "0");
  return `OR-${year}-${paddedNumber}`;
}

// Mark royalty payment as paid and generate official receipt
export const markRoyaltyAsPaid = mutation({
  args: {
    payment_id: v.id("royaltyPayments"),
    paid_amount: v.number(),
    payment_method: v.string(),
    payment_reference: v.optional(v.string()),
    notes: v.optional(v.string()),
    issued_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const timestamp = Date.now();

    // Get the payment
    const payment = await ctx.db.get(args.payment_id);
    if (!payment) {
      return { success: false, message: "Payment not found" };
    }

    if (payment.status === "paid") {
      return { success: false, message: "Payment is already marked as paid" };
    }

    // Generate sequential receipt number
    const receiptNumber = await getNextReceiptNumber(ctx);

    // Create official receipt
    const receiptId = await ctx.db.insert("officialReceipts", {
      receipt_number: receiptNumber,
      payment_id: args.payment_id,
      branch_id: payment.branch_id,
      amount: args.paid_amount,
      payment_method: args.payment_method,
      payment_reference: args.payment_reference,
      period_label: payment.period_label,
      issued_at: timestamp,
      issued_by: args.issued_by,
      notes: args.notes,
      created_at: timestamp,
    });

    // Update payment status to paid
    await ctx.db.patch(args.payment_id, {
      status: "paid",
      paid_at: timestamp,
      paid_amount: args.paid_amount,
      payment_method: args.payment_method,
      payment_reference: args.payment_reference,
      receipt_id: receiptId,
      notes: args.notes,
      updated_at: timestamp,
      updated_by: args.issued_by,
    });

    // Get branch name for response
    const branch = await ctx.db.get(payment.branch_id);

    return {
      success: true,
      message: `Payment marked as paid. Receipt ${receiptNumber} generated.`,
      receiptId,
      receiptNumber,
      branchName: branch?.name ?? "Unknown Branch",
    };
  },
});

// Get official receipt by ID
export const getOfficialReceipt = query({
  args: {
    receipt_id: v.id("officialReceipts"),
  },
  handler: async (ctx, args) => {
    const receipt = await ctx.db.get(args.receipt_id);
    if (!receipt) return null;

    // Enrich with branch and payment details
    const branch = await ctx.db.get(receipt.branch_id);
    const payment = await ctx.db.get(receipt.payment_id);
    const issuedBy = await ctx.db.get(receipt.issued_by);

    return {
      ...receipt,
      branch_name: branch?.name ?? "Unknown Branch",
      branch_code: branch?.branch_code ?? "N/A",
      branch_address: branch?.address ?? "",
      gross_revenue: payment?.gross_revenue ?? 0,
      royalty_rate: payment?.rate ?? 0,
      royalty_type: payment?.royalty_type ?? "percentage",
      period_start: payment?.period_start,
      period_end: payment?.period_end,
      issued_by_name: issuedBy?.username ?? "Unknown",
    };
  },
});

// Get all official receipts (for reporting)
export const getAllOfficialReceipts = query({
  args: {
    branch_id: v.optional(v.id("branches")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let receipts;

    if (args.branch_id) {
      receipts = await ctx.db
        .query("officialReceipts")
        .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id!))
        .order("desc")
        .take(args.limit ?? 100);
    } else {
      receipts = await ctx.db
        .query("officialReceipts")
        .order("desc")
        .take(args.limit ?? 100);
    }

    // Enrich with branch details
    const enrichedReceipts = await Promise.all(
      receipts.map(async (receipt) => {
        const branch = await ctx.db.get(receipt.branch_id);
        return {
          ...receipt,
          branch_name: branch?.name ?? "Unknown Branch",
          branch_code: branch?.branch_code ?? "N/A",
        };
      })
    );

    return enrichedReceipts;
  },
});

// Send official receipt email to branch admin
export const sendReceiptEmail = action({
  args: {
    receipt_id: v.id("officialReceipts"),
  },
  handler: async (ctx, args) => {
    // Get receipt details
    const receipt = await ctx.runQuery(api.services.royalty.getOfficialReceipt, {
      receipt_id: args.receipt_id,
    });

    if (!receipt) {
      return { success: false, message: "Receipt not found" };
    }

    // Get branch admins
    const branchAdmins = await ctx.runQuery(api.services.auth.getUsersByBranch, {
      branch_id: receipt.branch_id,
    });

    const admins = branchAdmins?.filter(
      (u: { role: string }) => u.role === "branch_admin" || u.role === "admin"
    ) || [];

    if (admins.length === 0) {
      return { success: false, message: "No branch admin found" };
    }

    // Get branding
    const branding = await ctx.runQuery(api.services.branding.getGlobalBranding, {});

    const primaryColor = branding?.primary_color || "#F97316";
    const accentColor = branding?.accent_color || "#EA580C";
    const bgColor = branding?.bg_color || "#0A0A0A";
    const brandName = branding?.display_name || "TipunoX";

    // Format values
    const amount = receipt.amount.toLocaleString("en-PH", {
      style: "currency",
      currency: "PHP",
    });
    const issuedDate = new Date(receipt.issued_at).toLocaleDateString("en-PH", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const revenue = (receipt.gross_revenue ?? 0).toLocaleString("en-PH", {
      style: "currency",
      currency: "PHP",
    });
    const rateDisplay =
      receipt.royalty_type === "percentage"
        ? `${receipt.royalty_rate}% of revenue`
        : `Fixed amount`;

    const results = [];

    for (const admin of admins) {
      if (!admin.email) continue;

      const emailData = {
        from: `${brandName} <no-reply@tipunoxph.com>`,
        to: admin.email,
        subject: `Official Receipt ${receipt.receipt_number} - Royalty Payment`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Official Receipt - ${brandName}</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background-color: ${bgColor};
                color: #ffffff;
                margin: 0;
                padding: 0;
                line-height: 1.6;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 40px 20px;
              }
              .header {
                text-align: center;
                margin-bottom: 40px;
              }
              .logo {
                font-size: 28px;
                font-weight: bold;
                color: ${primaryColor};
              }
              .receipt {
                background: linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%);
                border-radius: 16px;
                padding: 40px;
                border: 1px solid #333;
                box-shadow: 0 10px 30px rgba(0,0,0,0.5);
              }
              .receipt-header {
                text-align: center;
                border-bottom: 2px solid ${primaryColor};
                padding-bottom: 20px;
                margin-bottom: 24px;
              }
              .receipt-number {
                font-size: 14px;
                color: #888;
                margin-bottom: 8px;
              }
              .receipt-title {
                font-size: 28px;
                font-weight: bold;
                color: ${primaryColor};
              }
              .amount-box {
                background: linear-gradient(135deg, #14532d40 0%, #16a34a20 100%);
                border: 2px solid #22c55e;
                border-radius: 12px;
                padding: 24px;
                text-align: center;
                margin: 24px 0;
              }
              .amount {
                font-size: 42px;
                font-weight: bold;
                color: #22c55e;
              }
              .amount-label {
                color: #86efac;
                font-size: 14px;
                margin-top: 8px;
              }
              .details {
                margin: 24px 0;
              }
              .detail-row {
                display: flex;
                justify-content: space-between;
                padding: 12px 0;
                border-bottom: 1px solid #333;
              }
              .detail-label {
                color: #888;
              }
              .detail-value {
                color: #fff;
                font-weight: 500;
              }
              .success-badge {
                background: #22c55e;
                color: #fff;
                padding: 8px 16px;
                border-radius: 20px;
                font-weight: bold;
                display: inline-block;
                margin: 16px 0;
              }
              .footer {
                text-align: center;
                margin-top: 30px;
                color: #666;
                font-size: 14px;
              }
              .thank-you {
                text-align: center;
                font-size: 18px;
                color: ${primaryColor};
                margin-top: 24px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">${brandName}</div>
              </div>

              <div class="receipt">
                <div class="receipt-header">
                  <div class="receipt-number">${receipt.receipt_number}</div>
                  <div class="receipt-title">OFFICIAL RECEIPT</div>
                  <span class="success-badge">PAID</span>
                </div>

                <div class="amount-box">
                  <div class="amount">${amount}</div>
                  <div class="amount-label">Payment Received</div>
                </div>

                <div class="details">
                  <div class="detail-row">
                    <span class="detail-label">Branch</span>
                    <span class="detail-value">${receipt.branch_name}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Period</span>
                    <span class="detail-value">${receipt.period_label}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Branch Revenue</span>
                    <span class="detail-value">${revenue}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Royalty Rate</span>
                    <span class="detail-value">${rateDisplay}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Payment Method</span>
                    <span class="detail-value">${receipt.payment_method || "N/A"}</span>
                  </div>
                  ${receipt.payment_reference ? `
                  <div class="detail-row">
                    <span class="detail-label">Reference</span>
                    <span class="detail-value">${receipt.payment_reference}</span>
                  </div>
                  ` : ""}
                  <div class="detail-row">
                    <span class="detail-label">Issue Date</span>
                    <span class="detail-value">${issuedDate}</span>
                  </div>
                </div>

                <div class="thank-you">
                  Thank you for your payment!
                </div>
              </div>

              <div class="footer">
                <p>This is an official receipt from ${brandName}.</p>
                <p>Please keep this email for your records.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      };

      try {
        const isDev = process.env.NODE_ENV === "development";

        if (isDev && !process.env.RESEND_API_KEY) {
          console.log("DEV MODE: Would send receipt email to:", admin.email);
          results.push({
            email: admin.email,
            success: true,
            isDev: true,
            messageId: "dev-mock-" + Date.now(),
          });
          continue;
        }

        const result = await resend.emails.send(emailData as any);

        if (result.error) {
          console.error("Receipt email service error:", result.error);
          results.push({
            email: admin.email,
            success: false,
            error: result.error.message,
          });
        } else {
          results.push({
            email: admin.email,
            success: true,
            messageId: result.data?.id,
          });
        }
      } catch (error: any) {
        console.error("Receipt email error:", error);
        results.push({
          email: admin.email,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    // Create in-app notification
    for (const admin of admins) {
      await ctx.runMutation(api.services.notifications.createNotification, {
        title: "Official Receipt Issued",
        message: `Receipt ${receipt.receipt_number} for ${amount} (${receipt.period_label}) has been issued.`,
        type: "payment",
        priority: "medium",
        recipient_id: admin._id,
        recipient_type: "admin",
        branch_id: receipt.branch_id,
        metadata: {
          receipt_id: args.receipt_id,
          receipt_number: receipt.receipt_number,
          amount: receipt.amount,
        },
      });
    }

    return {
      success: successCount > 0,
      message: `Sent ${successCount}/${admins.length} receipt emails`,
      results,
    };
  },
});

// Waive royalty payment (Super Admin only)
export const waiveRoyaltyPayment = mutation({
  args: {
    payment_id: v.id("royaltyPayments"),
    notes: v.string(),
    waived_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.payment_id);
    if (!payment) {
      return { success: false, message: "Payment not found" };
    }

    if (payment.status === "paid") {
      return { success: false, message: "Cannot waive a paid payment" };
    }

    await ctx.db.patch(args.payment_id, {
      status: "waived",
      notes: args.notes,
      updated_at: Date.now(),
      updated_by: args.waived_by,
    });

    return {
      success: true,
      message: "Royalty payment has been waived",
    };
  },
});
