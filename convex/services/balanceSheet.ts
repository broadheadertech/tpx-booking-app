import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// ============================================================================
// BALANCE SHEET SERVICE
// ============================================================================
// Manages branch balance sheet: Assets, Liabilities, and Equity
// Provides financial position reporting for Branch Admins
// ============================================================================

// Validators for asset categories
const assetTypeValidator = v.union(
  v.literal("current"),
  v.literal("fixed"),
  v.literal("intangible")
);

const assetCategoryValidator = v.union(
  v.literal("cash"),
  v.literal("bank_accounts"),
  v.literal("accounts_receivable"),
  v.literal("inventory"),
  v.literal("prepaid_expenses"),
  v.literal("equipment"),
  v.literal("furniture"),
  v.literal("leasehold_improvements"),
  v.literal("vehicles"),
  v.literal("software"),
  v.literal("deposits"),
  v.literal("other")
);

// Validators for liability categories
const liabilityTypeValidator = v.union(
  v.literal("current"),
  v.literal("long_term")
);

const liabilityCategoryValidator = v.union(
  v.literal("accounts_payable"),
  v.literal("wages_payable"),
  v.literal("taxes_payable"),
  v.literal("unearned_revenue"),
  v.literal("credit_card"),
  v.literal("short_term_loan"),
  v.literal("accrued_expenses"),
  v.literal("bank_loan"),
  v.literal("equipment_financing"),
  v.literal("lease_obligations"),
  v.literal("owner_loan"),
  v.literal("other")
);

const paymentFrequencyValidator = v.union(
  v.literal("one_time"),
  v.literal("weekly"),
  v.literal("monthly"),
  v.literal("quarterly"),
  v.literal("annually")
);

// Validators for equity
const equityTypeValidator = v.union(
  v.literal("owner_capital"),
  v.literal("retained_earnings"),
  v.literal("drawings"),
  v.literal("additional_investment"),
  v.literal("other")
);

// ============================================================================
// ASSETS QUERIES & MUTATIONS
// ============================================================================

// Get all assets for a branch
export const getAssetsByBranch = query({
  args: {
    branch_id: v.id("branches"),
    asset_type: v.optional(assetTypeValidator),
  },
  handler: async (ctx, args) => {
    let assets = await ctx.db
      .query("assets")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .filter((q) => q.eq(q.field("is_active"), true))
      .collect();

    if (args.asset_type) {
      assets = assets.filter((a) => a.asset_type === args.asset_type);
    }

    return assets;
  },
});

// Get asset summary by type
export const getAssetSummary = query({
  args: {
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const assets = await ctx.db
      .query("assets")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .filter((q) => q.eq(q.field("is_active"), true))
      .collect();

    let currentAssets = 0;
    let fixedAssets = 0;
    let intangibleAssets = 0;
    const byCategory: Record<string, number> = {};

    for (const asset of assets) {
      const value = asset.current_value;

      if (asset.asset_type === "current") {
        currentAssets += value;
      } else if (asset.asset_type === "fixed") {
        fixedAssets += value;
      } else {
        intangibleAssets += value;
      }

      byCategory[asset.category] = (byCategory[asset.category] || 0) + value;
    }

    const categories = Object.entries(byCategory)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    return {
      current_assets: currentAssets,
      fixed_assets: fixedAssets,
      intangible_assets: intangibleAssets,
      total_assets: currentAssets + fixedAssets + intangibleAssets,
      by_category: categories,
      asset_count: assets.length,
    };
  },
});

// Add a new asset
export const addAsset = mutation({
  args: {
    branch_id: v.id("branches"),
    asset_type: assetTypeValidator,
    category: assetCategoryValidator,
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

    const assetId = await ctx.db.insert("assets", {
      branch_id: args.branch_id,
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
      created_by: args.created_by,
      created_at: now,
      updated_at: now,
    });

    return { success: true, asset_id: assetId };
  },
});

// Update an asset
export const updateAsset = mutation({
  args: {
    asset_id: v.id("assets"),
    asset_type: v.optional(assetTypeValidator),
    category: v.optional(assetCategoryValidator),
    name: v.optional(v.string()),
    purchase_value: v.optional(v.number()),
    current_value: v.optional(v.number()),
    purchase_date: v.optional(v.number()),
    depreciation_rate: v.optional(v.number()),
    accumulated_depreciation: v.optional(v.number()),
    notes: v.optional(v.string()),
    is_active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { asset_id, ...updates } = args;

    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }

    cleanUpdates.updated_at = Date.now();

    await ctx.db.patch(asset_id, cleanUpdates);

    return { success: true };
  },
});

// Delete an asset (soft delete)
export const deleteAsset = mutation({
  args: {
    asset_id: v.id("assets"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.asset_id, {
      is_active: false,
      updated_at: Date.now(),
    });
    return { success: true };
  },
});

// ============================================================================
// LIABILITIES QUERIES & MUTATIONS
// ============================================================================

// Get all liabilities for a branch
export const getLiabilitiesByBranch = query({
  args: {
    branch_id: v.id("branches"),
    liability_type: v.optional(liabilityTypeValidator),
  },
  handler: async (ctx, args) => {
    let liabilities = await ctx.db
      .query("liabilities")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .filter((q) => q.eq(q.field("is_active"), true))
      .collect();

    if (args.liability_type) {
      liabilities = liabilities.filter((l) => l.liability_type === args.liability_type);
    }

    return liabilities;
  },
});

// Get liability summary by type
export const getLiabilitySummary = query({
  args: {
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const liabilities = await ctx.db
      .query("liabilities")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .filter((q) => q.eq(q.field("is_active"), true))
      .collect();

    let currentLiabilities = 0;
    let longTermLiabilities = 0;
    const byCategory: Record<string, number> = {};

    for (const liability of liabilities) {
      const balance = liability.current_balance;

      if (liability.liability_type === "current") {
        currentLiabilities += balance;
      } else {
        longTermLiabilities += balance;
      }

      byCategory[liability.category] = (byCategory[liability.category] || 0) + balance;
    }

    const categories = Object.entries(byCategory)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    return {
      current_liabilities: currentLiabilities,
      long_term_liabilities: longTermLiabilities,
      total_liabilities: currentLiabilities + longTermLiabilities,
      by_category: categories,
      liability_count: liabilities.length,
    };
  },
});

// Add a new liability
export const addLiability = mutation({
  args: {
    branch_id: v.id("branches"),
    liability_type: liabilityTypeValidator,
    category: liabilityCategoryValidator,
    name: v.string(),
    original_amount: v.number(),
    current_balance: v.number(),
    interest_rate: v.optional(v.number()),
    due_date: v.optional(v.number()),
    payment_frequency: v.optional(paymentFrequencyValidator),
    monthly_payment: v.optional(v.number()),
    creditor: v.optional(v.string()),
    notes: v.optional(v.string()),
    created_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const liabilityId = await ctx.db.insert("liabilities", {
      branch_id: args.branch_id,
      liability_type: args.liability_type,
      category: args.category,
      name: args.name,
      original_amount: args.original_amount,
      current_balance: args.current_balance,
      interest_rate: args.interest_rate,
      due_date: args.due_date,
      payment_frequency: args.payment_frequency,
      monthly_payment: args.monthly_payment,
      creditor: args.creditor,
      notes: args.notes,
      is_active: true,
      created_by: args.created_by,
      created_at: now,
      updated_at: now,
    });

    return { success: true, liability_id: liabilityId };
  },
});

// Update a liability
export const updateLiability = mutation({
  args: {
    liability_id: v.id("liabilities"),
    liability_type: v.optional(liabilityTypeValidator),
    category: v.optional(liabilityCategoryValidator),
    name: v.optional(v.string()),
    original_amount: v.optional(v.number()),
    current_balance: v.optional(v.number()),
    interest_rate: v.optional(v.number()),
    due_date: v.optional(v.number()),
    payment_frequency: v.optional(paymentFrequencyValidator),
    monthly_payment: v.optional(v.number()),
    creditor: v.optional(v.string()),
    notes: v.optional(v.string()),
    is_active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { liability_id, ...updates } = args;

    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }

    cleanUpdates.updated_at = Date.now();

    await ctx.db.patch(liability_id, cleanUpdates);

    return { success: true };
  },
});

// Delete a liability (soft delete)
export const deleteLiability = mutation({
  args: {
    liability_id: v.id("liabilities"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.liability_id, {
      is_active: false,
      updated_at: Date.now(),
    });
    return { success: true };
  },
});

// ============================================================================
// EQUITY QUERIES & MUTATIONS
// ============================================================================

// Get all equity entries for a branch
export const getEquityByBranch = query({
  args: {
    branch_id: v.id("branches"),
    equity_type: v.optional(equityTypeValidator),
  },
  handler: async (ctx, args) => {
    let equity = await ctx.db
      .query("equity")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .order("desc")
      .collect();

    if (args.equity_type) {
      equity = equity.filter((e) => e.equity_type === args.equity_type);
    }

    return equity;
  },
});

// Get equity summary
export const getEquitySummary = query({
  args: {
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const equity = await ctx.db
      .query("equity")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    let ownerCapital = 0;
    let retainedEarnings = 0;
    let drawings = 0;
    let additionalInvestment = 0;
    let other = 0;

    for (const entry of equity) {
      switch (entry.equity_type) {
        case "owner_capital":
          ownerCapital += entry.amount;
          break;
        case "retained_earnings":
          retainedEarnings += entry.amount;
          break;
        case "drawings":
          drawings += entry.amount; // Usually negative
          break;
        case "additional_investment":
          additionalInvestment += entry.amount;
          break;
        default:
          other += entry.amount;
      }
    }

    const totalEquity = ownerCapital + retainedEarnings + drawings + additionalInvestment + other;

    return {
      owner_capital: ownerCapital,
      retained_earnings: retainedEarnings,
      drawings: drawings,
      additional_investment: additionalInvestment,
      other: other,
      total_equity: totalEquity,
      entry_count: equity.length,
    };
  },
});

// Add a new equity entry
export const addEquity = mutation({
  args: {
    branch_id: v.id("branches"),
    equity_type: equityTypeValidator,
    description: v.string(),
    amount: v.number(),
    transaction_date: v.number(),
    notes: v.optional(v.string()),
    created_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const equityId = await ctx.db.insert("equity", {
      branch_id: args.branch_id,
      equity_type: args.equity_type,
      description: args.description,
      amount: args.amount,
      transaction_date: args.transaction_date,
      notes: args.notes,
      created_by: args.created_by,
      created_at: now,
      updated_at: now,
    });

    return { success: true, equity_id: equityId };
  },
});

// Update an equity entry
export const updateEquity = mutation({
  args: {
    equity_id: v.id("equity"),
    equity_type: v.optional(equityTypeValidator),
    description: v.optional(v.string()),
    amount: v.optional(v.number()),
    transaction_date: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { equity_id, ...updates } = args;

    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }

    cleanUpdates.updated_at = Date.now();

    await ctx.db.patch(equity_id, cleanUpdates);

    return { success: true };
  },
});

// Delete an equity entry
export const deleteEquity = mutation({
  args: {
    equity_id: v.id("equity"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.equity_id);
    return { success: true };
  },
});

// ============================================================================
// AUTO-CALCULATED VALUES FROM P&L
// ============================================================================

// Calculate cumulative retained earnings from P&L data
// This is the KEY integration between P&L and Balance Sheet
export const getCalculatedRetainedEarnings = query({
  args: {
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    // ========================================
    // REVENUE - From all completed transactions
    // ========================================
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    const completedTransactions = transactions.filter(
      (t) => t.payment_status === "completed"
    );

    let totalRevenue = 0;
    let serviceRevenue = 0;
    let productRevenue = 0;
    let feesRevenue = 0;
    let discounts = 0;

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
      feesRevenue += (t.booking_fee || 0) + (t.late_fee || 0);

      // Discounts
      discounts += t.discount_amount || 0;
    }

    totalRevenue = serviceRevenue + productRevenue + feesRevenue - discounts;

    // ========================================
    // COST OF GOODS SOLD (COGS)
    // ========================================
    let cogs = 0;
    for (const t of completedTransactions) {
      for (const product of t.products || []) {
        const productDoc = await ctx.db.get(product.product_id);
        if (productDoc && productDoc.cost) {
          cogs += productDoc.cost * product.quantity;
        }
      }
    }

    // ========================================
    // PAYROLL EXPENSES - From paid payroll records
    // ========================================
    // NOTE: We check individual record status instead of period status because
    // marking records as "paid" doesn't automatically update the period status
    const payrollPeriods = await ctx.db
      .query("payroll_periods")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    let payrollExpense = 0;
    let salaryExpense = 0;
    let commissionExpense = 0;
    let bonusExpense = 0;
    let allowanceExpense = 0;

    for (const period of payrollPeriods) {
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
        // daily_pay is the TOTAL salary (max of daily rate vs commission per day)
        salaryExpense += record.daily_pay || 0;
        // gross_commission is for reference only (already in daily_pay)
        commissionExpense += record.gross_commission || 0;
        // product_commission is for reference only
        bonusExpense += record.product_commission || 0;
        // Fees are added on top
        allowanceExpense += (record.total_booking_fees || 0) + (record.total_late_fees || 0);
      }
    }

    // Gross Payroll = Salary (daily_pay) + Allowances (fees)
    // Commission and bonus are NOT added because they're already included in daily_pay
    const grossPayroll = salaryExpense + allowanceExpense;

    // ========================================
    // MANUAL EXPENSES - From expenses table
    // ========================================
    const allExpenses = await ctx.db
      .query("expenses")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    let fixedExpenses = 0;
    let operatingExpenses = 0;
    for (const expense of allExpenses) {
      if (expense.expense_type === "fixed") {
        fixedExpenses += expense.amount;
      } else {
        operatingExpenses += expense.amount;
      }
    }

    const manualExpenses = fixedExpenses + operatingExpenses;
    const totalExpenses = cogs + payrollExpense + manualExpenses;

    // ========================================
    // CALCULATE RETAINED EARNINGS
    // ========================================
    const retainedEarnings = totalRevenue - totalExpenses;

    return {
      retained_earnings: retainedEarnings,
      breakdown: {
        total_revenue: totalRevenue,
        service_revenue: serviceRevenue,
        product_revenue: productRevenue,
        fees_revenue: feesRevenue,
        discounts: discounts,
        cogs: cogs,
        // Payroll breakdown
        payroll_expense: payrollExpense,
        gross_payroll: grossPayroll,
        salary: salaryExpense,
        commission: commissionExpense,
        bonus: bonusExpense,
        allowance: allowanceExpense,
        // Other expenses
        fixed_expenses: fixedExpenses,
        operating_expenses: operatingExpenses,
        total_expenses: totalExpenses,
      },
      transaction_count: completedTransactions.length,
      expense_count: allExpenses.length,
      payroll_period_count: payrollPeriods.length,
      calculated_at: Date.now(),
    };
  },
});

// Calculate inventory value from actual product stock
export const getCalculatedInventoryValue = query({
  args: {
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .filter((q) => q.neq(q.field("status"), "inactive"))
      .collect();

    let totalValue = 0;
    let totalCost = 0;
    const productDetails = [];

    for (const product of products) {
      const stockValue = product.stock * product.price;
      const stockCost = product.stock * product.cost;
      totalValue += stockValue;
      totalCost += stockCost;

      productDetails.push({
        name: product.name,
        stock: product.stock,
        price: product.price,
        cost: product.cost,
        value: stockValue,
        cost_value: stockCost,
      });
    }

    return {
      inventory_value_at_price: totalValue,
      inventory_value_at_cost: totalCost,
      product_count: products.length,
      total_units: products.reduce((sum, p) => sum + p.stock, 0),
      products: productDetails,
    };
  },
});

// ============================================================================
// BALANCE SHEET SUMMARY
// ============================================================================

// Get complete balance sheet summary WITH auto-calculated values
export const getBalanceSheetSummary = query({
  args: {
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    // ========================================
    // AUTO-CALCULATE RETAINED EARNINGS FROM P&L
    // ========================================
    // Get all completed transactions for revenue
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    const completedTransactions = transactions.filter(
      (t) => t.payment_status === "completed"
    );

    let totalRevenue = 0;
    let cogs = 0;

    for (const t of completedTransactions) {
      // Revenue from services
      for (const service of t.services || []) {
        totalRevenue += service.price * service.quantity;
      }
      // Revenue from products
      for (const product of t.products || []) {
        totalRevenue += product.price * product.quantity;
        // COGS
        const productDoc = await ctx.db.get(product.product_id);
        if (productDoc && productDoc.cost) {
          cogs += productDoc.cost * product.quantity;
        }
      }
      // Fees
      totalRevenue += (t.booking_fee || 0) + (t.late_fee || 0);
      // Deduct discounts
      totalRevenue -= t.discount_amount || 0;
    }

    // Payroll expenses - broken down by type
    // NOTE: We check individual record status instead of period status because
    // marking records as "paid" doesn't automatically update the period status
    const payrollPeriods = await ctx.db
      .query("payroll_periods")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    let payrollExpense = 0;
    let salaryExpense = 0;      // daily_pay (includes commission calculation)
    let commissionExpense = 0;  // For reference only (already in daily_pay)
    let bonusExpense = 0;       // For reference only (product_commission)
    let allowanceExpense = 0;   // Fees added on top

    for (const period of payrollPeriods) {
      // Only include records that have been marked as "paid"
      const records = await ctx.db
        .query("payroll_records")
        .withIndex("by_payroll_period", (q) => q.eq("payroll_period_id", period._id))
        .filter((q) => q.eq(q.field("status"), "paid"))
        .collect();
      for (const record of records) {
        payrollExpense += record.net_pay || 0;
        // daily_pay is the TOTAL salary (max of daily rate vs commission per day)
        salaryExpense += record.daily_pay || 0;
        // gross_commission is for reference only (already in daily_pay)
        commissionExpense += record.gross_commission || 0;
        // product_commission is for reference only
        bonusExpense += record.product_commission || 0;
        // Fees are added on top
        allowanceExpense += (record.total_booking_fees || 0) + (record.total_late_fees || 0);
      }
    }

    // Gross Payroll = Salary (daily_pay) + Allowances (fees)
    // Commission and bonus are NOT added because they're already included in daily_pay
    const grossPayroll = salaryExpense + allowanceExpense;

    // Manual expenses
    const allExpenses = await ctx.db
      .query("expenses")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    let manualExpenses = 0;
    for (const expense of allExpenses) {
      manualExpenses += expense.amount;
    }

    const totalExpenses = cogs + payrollExpense + manualExpenses;
    const calculatedRetainedEarnings = totalRevenue - totalExpenses;

    // ========================================
    // AUTO-CALCULATE INVENTORY VALUE
    // ========================================
    const products = await ctx.db
      .query("products")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .filter((q) => q.neq(q.field("status"), "inactive"))
      .collect();

    let inventoryValue = 0;
    for (const product of products) {
      inventoryValue += product.stock * product.cost; // Use cost for balance sheet
    }

    // ========================================
    // GET MANUAL ASSETS
    // ========================================
    const assets = await ctx.db
      .query("assets")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .filter((q) => q.eq(q.field("is_active"), true))
      .collect();

    let manualCurrentAssets = 0;
    let fixedAssets = 0;
    let intangibleAssets = 0;
    let manualInventoryValue = 0;
    let manualCash = 0;

    for (const asset of assets) {
      // Skip manual inventory entries - we'll use calculated value
      if (asset.category === "inventory") {
        manualInventoryValue += asset.current_value;
        continue;
      }

      // Track manual cash entries separately
      if (asset.category === "cash" || asset.category === "bank_accounts") {
        manualCash += asset.current_value;
      }

      if (asset.asset_type === "current") {
        manualCurrentAssets += asset.current_value;
      } else if (asset.asset_type === "fixed") {
        fixedAssets += asset.current_value;
      } else {
        intangibleAssets += asset.current_value;
      }
    }

    // ========================================
    // GET LIABILITIES
    // ========================================
    const liabilities = await ctx.db
      .query("liabilities")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .filter((q) => q.eq(q.field("is_active"), true))
      .collect();

    let currentLiabilities = 0;
    let longTermLiabilities = 0;

    for (const liability of liabilities) {
      if (liability.liability_type === "current") {
        currentLiabilities += liability.current_balance;
      } else {
        longTermLiabilities += liability.current_balance;
      }
    }

    const totalLiabilities = currentLiabilities + longTermLiabilities;

    // ========================================
    // GET MANUAL EQUITY (excluding retained_earnings)
    // ========================================
    const equity = await ctx.db
      .query("equity")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    let manualEquity = 0;
    let manualRetainedEarnings = 0;
    let ownerCapital = 0;
    let drawings = 0;
    let additionalInvestment = 0;

    for (const entry of equity) {
      if (entry.equity_type === "retained_earnings") {
        manualRetainedEarnings += entry.amount;
      } else {
        manualEquity += entry.amount;
        if (entry.equity_type === "owner_capital") {
          ownerCapital += entry.amount;
        } else if (entry.equity_type === "drawings") {
          drawings += entry.amount;
        } else if (entry.equity_type === "additional_investment") {
          additionalInvestment += entry.amount;
        }
      }
    }

    // Total equity = Manual equity entries + Auto-calculated retained earnings
    const totalEquity = manualEquity + calculatedRetainedEarnings;

    // ========================================
    // AUTO-CALCULATE BALANCING CASH/CAPITAL
    // ========================================
    // The accounting equation must hold: Assets = Liabilities + Equity
    //
    // When someone adds:
    // - Owner's Capital (Equity) → implies cash came INTO the business
    // - A Loan (Liability) → implies cash came INTO the business
    // - Fixed Asset (Asset) → implies cash went OUT of the business
    //
    // To make the balance sheet balance, we calculate the implied "Cash & Equivalents"
    // that must exist to satisfy the accounting equation:
    //
    // Cash = (Liabilities + Equity) - (Fixed Assets + Intangible Assets + Inventory + Other Current Assets)
    //
    // This represents ALL cash effects:
    // - Cash from Operations (Retained Earnings = Revenue - Expenses)
    // - Cash from Financing (Owner investments + Loans)
    // - Cash used for Investing (Equipment purchases)

    // Non-cash assets
    const nonCashAssets = fixedAssets + intangibleAssets + inventoryValue +
      (manualCurrentAssets - manualCash); // Exclude manual cash to avoid double counting

    // Calculate implied cash balance to make everything balance
    // Cash = (Liabilities + Equity) - Non-Cash Assets
    const impliedCash = (totalLiabilities + totalEquity) - nonCashAssets;

    // Total current assets = Manual current assets (excluding cash) + Manual cash + Implied cash adjustment + Inventory
    // But for clarity, let's break it down:
    // - Manual non-cash current assets (accounts receivable, prepaid, etc.)
    // - Inventory (auto-calculated from products)
    // - Cash & Equivalents (manual cash + implied adjustment)

    const manualNonCashCurrentAssets = manualCurrentAssets - manualCash;
    const cashAndEquivalents = impliedCash; // This is the balancing entry

    // Current assets = Non-cash current + Inventory + Cash & Equivalents
    const currentAssets = manualNonCashCurrentAssets + inventoryValue + cashAndEquivalents;

    const totalAssets = currentAssets + fixedAssets + intangibleAssets;

    // ========================================
    // CALCULATE FINANCIAL RATIOS
    // ========================================
    const workingCapital = currentAssets - currentLiabilities;
    const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : null;
    const debtToEquityRatio = totalEquity > 0 ? totalLiabilities / totalEquity : null;
    const quickRatio = currentLiabilities > 0
      ? (currentAssets - inventoryValue) / currentLiabilities
      : null;

    // Balance check (Assets = Liabilities + Equity)
    // This should now ALWAYS be balanced
    const isBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01;

    return {
      // Assets
      assets: {
        current: currentAssets,
        fixed: fixedAssets,
        intangible: intangibleAssets,
        total: totalAssets,
        // Breakdown of current assets
        current_breakdown: {
          manual_non_cash: manualNonCashCurrentAssets,
          inventory: inventoryValue,
          cash_and_equivalents: cashAndEquivalents,
          // Sub-breakdown of cash
          cash_details: {
            manual_cash: manualCash,
            cash_from_operations: calculatedRetainedEarnings,
            cash_from_financing: manualEquity + totalLiabilities, // Owner capital + Loans
            cash_used_for_assets: -(fixedAssets + intangibleAssets), // Cash spent on assets
          },
        },
      },
      // Liabilities
      liabilities: {
        current: currentLiabilities,
        long_term: longTermLiabilities,
        total: totalLiabilities,
      },
      // Equity with breakdown
      equity: {
        owner_capital: ownerCapital,
        additional_investment: additionalInvestment,
        drawings: drawings,
        manual_retained_earnings: manualRetainedEarnings,
        calculated_retained_earnings: calculatedRetainedEarnings,
        manual_total: manualEquity,
        total: totalEquity,
      },
      // Auto-calculated values
      auto_calculated: {
        retained_earnings: calculatedRetainedEarnings,
        inventory_value: inventoryValue,
        cash_and_equivalents: cashAndEquivalents,
        revenue_to_date: totalRevenue,
        expenses_to_date: totalExpenses,
        cogs: cogs,
        payroll_expense: payrollExpense,
        // Payroll breakdown (Gross Income components)
        payroll_breakdown: {
          gross_payroll: grossPayroll,
          salary: salaryExpense,
          commission: commissionExpense,
          bonus: bonusExpense,
          allowance: allowanceExpense,
          net_pay: payrollExpense, // After deductions
        },
        manual_expenses: manualExpenses,
      },
      // Financial Ratios
      ratios: {
        working_capital: workingCapital,
        current_ratio: currentRatio,
        quick_ratio: quickRatio,
        debt_to_equity_ratio: debtToEquityRatio,
      },
      // Balance check
      is_balanced: isBalanced,
      balance_difference: totalAssets - (totalLiabilities + totalEquity),
      // Counts
      counts: {
        assets: assets.length,
        liabilities: liabilities.length,
        equity_entries: equity.length,
        products: products.length,
        transactions: completedTransactions.length,
      },
      // Timestamp
      as_of: Date.now(),
    };
  },
});

// Save balance sheet snapshot for historical tracking
export const saveBalanceSheetSnapshot = mutation({
  args: {
    branch_id: v.id("branches"),
    notes: v.optional(v.string()),
    created_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get all assets
    const assets = await ctx.db
      .query("assets")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .filter((q) => q.eq(q.field("is_active"), true))
      .collect();

    let currentAssets = 0;
    let fixedAssets = 0;
    let intangibleAssets = 0;

    for (const asset of assets) {
      if (asset.asset_type === "current") {
        currentAssets += asset.current_value;
      } else if (asset.asset_type === "fixed") {
        fixedAssets += asset.current_value;
      } else {
        intangibleAssets += asset.current_value;
      }
    }

    const totalAssets = currentAssets + fixedAssets + intangibleAssets;

    // Get all liabilities
    const liabilities = await ctx.db
      .query("liabilities")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .filter((q) => q.eq(q.field("is_active"), true))
      .collect();

    let currentLiabilities = 0;
    let longTermLiabilities = 0;

    for (const liability of liabilities) {
      if (liability.liability_type === "current") {
        currentLiabilities += liability.current_balance;
      } else {
        longTermLiabilities += liability.current_balance;
      }
    }

    const totalLiabilities = currentLiabilities + longTermLiabilities;

    // Get all equity
    const equity = await ctx.db
      .query("equity")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    let totalEquity = 0;
    for (const entry of equity) {
      totalEquity += entry.amount;
    }

    // Calculate ratios
    const workingCapital = currentAssets - currentLiabilities;
    const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : undefined;
    const debtToEquityRatio = totalEquity > 0 ? totalLiabilities / totalEquity : undefined;

    const now = Date.now();

    const snapshotId = await ctx.db.insert("balance_sheet_snapshots", {
      branch_id: args.branch_id,
      snapshot_date: now,
      total_assets: totalAssets,
      total_liabilities: totalLiabilities,
      total_equity: totalEquity,
      current_assets: currentAssets,
      fixed_assets: fixedAssets,
      intangible_assets: intangibleAssets,
      current_liabilities: currentLiabilities,
      long_term_liabilities: longTermLiabilities,
      working_capital: workingCapital,
      current_ratio: currentRatio,
      debt_to_equity_ratio: debtToEquityRatio,
      notes: args.notes,
      created_by: args.created_by,
      created_at: now,
    });

    return { success: true, snapshot_id: snapshotId };
  },
});

// Get balance sheet snapshots history
export const getBalanceSheetSnapshots = query({
  args: {
    branch_id: v.id("branches"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let snapshots = await ctx.db
      .query("balance_sheet_snapshots")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .order("desc")
      .collect();

    if (args.limit) {
      snapshots = snapshots.slice(0, args.limit);
    }

    return snapshots;
  },
});

// ============================================================================
// ACCOUNTING PERIODS - PERIOD CLOSE FEATURE
// ============================================================================

// Validators for accounting periods
const periodTypeValidator = v.union(
  v.literal("monthly"),
  v.literal("quarterly"),
  v.literal("yearly")
);

const periodStatusValidator = v.union(
  v.literal("open"),
  v.literal("closing"),
  v.literal("closed")
);

// Get all accounting periods for a branch
export const getAccountingPeriods = query({
  args: {
    branch_id: v.id("branches"),
    status: v.optional(periodStatusValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let periods = await ctx.db
      .query("accounting_periods")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
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

// Get a single accounting period with details
export const getAccountingPeriod = query({
  args: {
    period_id: v.id("accounting_periods"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.period_id);
  },
});

// Get current open period for a branch
export const getCurrentOpenPeriod = query({
  args: {
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const periods = await ctx.db
      .query("accounting_periods")
      .withIndex("by_branch_status", (q) =>
        q.eq("branch_id", args.branch_id).eq("status", "open")
      )
      .order("desc")
      .first();

    return periods;
  },
});

// Create a new accounting period
export const createAccountingPeriod = mutation({
  args: {
    branch_id: v.id("branches"),
    period_name: v.string(),
    period_type: periodTypeValidator,
    start_date: v.number(),
    end_date: v.number(),
    notes: v.optional(v.string()),
    created_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check for overlapping periods
    const existingPeriods = await ctx.db
      .query("accounting_periods")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    // Check for overlap with existing periods
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

    const periodId = await ctx.db.insert("accounting_periods", {
      branch_id: args.branch_id,
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

// Helper function to calculate period snapshot data
async function calculatePeriodSnapshot(
  ctx: any,
  branchId: any,
  startDate: number,
  endDate: number
) {
  // ========================================
  // REVENUE - From transactions in period
  // ========================================
  const transactions = await ctx.db
    .query("transactions")
    .withIndex("by_branch", (q: any) => q.eq("branch_id", branchId))
    .collect();

  const periodTransactions = transactions.filter(
    (t: any) =>
      t.payment_status === "completed" &&
      t.createdAt >= startDate &&
      t.createdAt <= endDate
  );

  let totalRevenue = 0;
  let cogs = 0;

  for (const t of periodTransactions) {
    for (const service of t.services || []) {
      totalRevenue += service.price * service.quantity;
    }
    for (const product of t.products || []) {
      totalRevenue += product.price * product.quantity;
      const productDoc = await ctx.db.get(product.product_id);
      if (productDoc && productDoc.cost) {
        cogs += productDoc.cost * product.quantity;
      }
    }
    totalRevenue += (t.booking_fee || 0) + (t.late_fee || 0);
    totalRevenue -= t.discount_amount || 0;
  }

  // ========================================
  // PAYROLL - From paid payroll in period
  // ========================================
  const payrollPeriods = await ctx.db
    .query("payroll_periods")
    .withIndex("by_branch", (q: any) => q.eq("branch_id", branchId))
    .collect();

  const periodPayrolls = payrollPeriods.filter(
    (p: any) =>
      p.status === "paid" &&
      p.paid_at &&
      p.paid_at >= startDate &&
      p.paid_at <= endDate
  );

  let payrollExpense = 0;
  for (const period of periodPayrolls) {
    const records = await ctx.db
      .query("payroll_records")
      .withIndex("by_payroll_period", (q: any) =>
        q.eq("payroll_period_id", period._id)
      )
      .filter((q: any) => q.eq(q.field("status"), "paid"))
      .collect();

    for (const record of records) {
      payrollExpense += record.net_pay || 0;
    }
  }

  // ========================================
  // EXPENSES - From expenses in period
  // ========================================
  const allExpenses = await ctx.db
    .query("expenses")
    .withIndex("by_branch", (q: any) => q.eq("branch_id", branchId))
    .collect();

  const periodExpenses = allExpenses.filter(
    (e: any) => e.expense_date >= startDate && e.expense_date <= endDate
  );

  let manualExpenses = 0;
  for (const expense of periodExpenses) {
    manualExpenses += expense.amount;
  }

  const totalExpenses = cogs + payrollExpense + manualExpenses;
  const netIncome = totalRevenue - totalExpenses;

  // ========================================
  // BALANCE SHEET VALUES (at period end)
  // ========================================
  const assets = await ctx.db
    .query("assets")
    .withIndex("by_branch", (q: any) => q.eq("branch_id", branchId))
    .filter((q: any) => q.eq(q.field("is_active"), true))
    .collect();

  // Separate manual assets by type (excluding cash which we'll calculate)
  let manualCurrentAssets = 0;
  let manualCash = 0;
  let fixedAssets = 0;
  let intangibleAssets = 0;

  for (const asset of assets) {
    if (asset.category === "inventory") continue; // Skip manual inventory - use calculated
    if (asset.asset_type === "current") {
      // Track manual cash separately
      if (asset.category === "cash" || asset.category === "bank_accounts") {
        manualCash += asset.current_value;
      } else {
        manualCurrentAssets += asset.current_value;
      }
    } else if (asset.asset_type === "fixed") {
      fixedAssets += asset.current_value;
    } else {
      intangibleAssets += asset.current_value;
    }
  }

  // Inventory value from products
  const products = await ctx.db
    .query("products")
    .withIndex("by_branch", (q: any) => q.eq("branch_id", branchId))
    .filter((q: any) => q.neq(q.field("status"), "inactive"))
    .collect();

  let inventoryValue = 0;
  for (const product of products) {
    inventoryValue += product.stock * product.cost;
  }

  // Liabilities
  const liabilities = await ctx.db
    .query("liabilities")
    .withIndex("by_branch", (q: any) => q.eq("branch_id", branchId))
    .filter((q: any) => q.eq(q.field("is_active"), true))
    .collect();

  let currentLiabilities = 0;
  let longTermLiabilities = 0;

  for (const liability of liabilities) {
    if (liability.liability_type === "current") {
      currentLiabilities += liability.current_balance;
    } else {
      longTermLiabilities += liability.current_balance;
    }
  }

  const totalLiabilities = currentLiabilities + longTermLiabilities;

  // Equity (manual entries + calculated retained earnings)
  const equity = await ctx.db
    .query("equity")
    .withIndex("by_branch", (q: any) => q.eq("branch_id", branchId))
    .collect();

  let manualEquity = 0;
  for (const entry of equity) {
    if (entry.equity_type !== "retained_earnings") {
      manualEquity += entry.amount;
    }
  }

  // Calculate cumulative retained earnings up to period end
  const allTransactions = transactions.filter(
    (t: any) => t.payment_status === "completed" && t.createdAt <= endDate
  );

  let cumulativeRevenue = 0;
  let cumulativeCogs = 0;

  for (const t of allTransactions) {
    for (const service of t.services || []) {
      cumulativeRevenue += service.price * service.quantity;
    }
    for (const product of t.products || []) {
      cumulativeRevenue += product.price * product.quantity;
      const productDoc = await ctx.db.get(product.product_id);
      if (productDoc && productDoc.cost) {
        cumulativeCogs += productDoc.cost * product.quantity;
      }
    }
    cumulativeRevenue += (t.booking_fee || 0) + (t.late_fee || 0);
    cumulativeRevenue -= t.discount_amount || 0;
  }

  // Cumulative payroll
  const cumulativePayrolls = payrollPeriods.filter(
    (p: any) => p.status === "paid" && p.paid_at && p.paid_at <= endDate
  );

  let cumulativePayroll = 0;
  for (const period of cumulativePayrolls) {
    const records = await ctx.db
      .query("payroll_records")
      .withIndex("by_payroll_period", (q: any) =>
        q.eq("payroll_period_id", period._id)
      )
      .filter((q: any) => q.eq(q.field("status"), "paid"))
      .collect();

    for (const record of records) {
      cumulativePayroll += record.net_pay || 0;
    }
  }

  // Cumulative expenses
  const cumulativeExpenses = allExpenses.filter(
    (e: any) => e.expense_date <= endDate
  );

  let cumulativeManualExpenses = 0;
  for (const expense of cumulativeExpenses) {
    cumulativeManualExpenses += expense.amount;
  }

  const cumulativeTotalExpenses =
    cumulativeCogs + cumulativePayroll + cumulativeManualExpenses;
  const retainedEarnings = cumulativeRevenue - cumulativeTotalExpenses;

  const totalEquity = manualEquity + retainedEarnings;

  // ========================================
  // BALANCE SHEET BALANCING
  // ========================================
  // The accounting equation: Assets = Liabilities + Equity
  //
  // When revenue is earned, it increases both:
  // 1. Retained Earnings (Equity side) - which we calculated
  // 2. Cash or Receivables (Asset side) - which must balance
  //
  // Non-cash assets = Fixed + Intangible + Manual Current (excl. cash) + Inventory
  const nonCashAssets = fixedAssets + intangibleAssets + manualCurrentAssets + inventoryValue;

  // Cash & Equivalents = (Liabilities + Equity) - Non-Cash Assets
  // This ensures the balance sheet always balances
  const cashAndEquivalents = (totalLiabilities + totalEquity) - nonCashAssets;

  // Current Assets = Non-cash current assets + Inventory + Cash & Equivalents
  const currentAssets = manualCurrentAssets + inventoryValue + cashAndEquivalents;

  const totalAssets = currentAssets + fixedAssets + intangibleAssets;

  // Ratios
  const workingCapital = currentAssets - currentLiabilities;
  const currentRatio =
    currentLiabilities > 0 ? currentAssets / currentLiabilities : undefined;
  const debtToEquityRatio =
    totalEquity > 0 ? totalLiabilities / totalEquity : undefined;

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
    inventory_value: inventoryValue,
    revenue: totalRevenue,
    expenses: totalExpenses,
    net_income: netIncome,
    working_capital: workingCapital,
    current_ratio: currentRatio,
    debt_to_equity_ratio: debtToEquityRatio,
  };
}

// Close an accounting period (creates frozen snapshot)
export const closeAccountingPeriod = mutation({
  args: {
    period_id: v.id("accounting_periods"),
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
    const snapshot = await calculatePeriodSnapshot(
      ctx,
      period.branch_id,
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
    await ctx.db.insert("balance_sheet_snapshots", {
      branch_id: period.branch_id,
      snapshot_date: period.end_date,
      total_assets: snapshot.total_assets,
      total_liabilities: snapshot.total_liabilities,
      total_equity: snapshot.total_equity,
      current_assets: snapshot.current_assets,
      fixed_assets: snapshot.fixed_assets,
      intangible_assets: snapshot.intangible_assets,
      current_liabilities: snapshot.current_liabilities,
      long_term_liabilities: snapshot.long_term_liabilities,
      cash_and_equivalents: snapshot.cash_and_equivalents,
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

// Mark period as "closing" (under review)
export const markPeriodClosing = mutation({
  args: {
    period_id: v.id("accounting_periods"),
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

// Reopen a closed period (requires confirmation)
export const reopenAccountingPeriod = mutation({
  args: {
    period_id: v.id("accounting_periods"),
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
export const deleteAccountingPeriod = mutation({
  args: {
    period_id: v.id("accounting_periods"),
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

// Get period comparison (compare two periods)
export const comparePeriods = query({
  args: {
    period_id_1: v.id("accounting_periods"),
    period_id_2: v.id("accounting_periods"),
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

    // Calculate changes
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
        revenue: calculateChange(s1.revenue, s2.revenue),
        expenses: calculateChange(s1.expenses, s2.expenses),
        net_income: calculateChange(s1.net_income, s2.net_income),
        retained_earnings: calculateChange(s1.retained_earnings, s2.retained_earnings),
        inventory_value: calculateChange(s1.inventory_value, s2.inventory_value),
        working_capital: calculateChange(s1.working_capital, s2.working_capital),
      },
    };
  },
});

// Generate suggested periods (helper for UI)
export const getSuggestedPeriods = query({
  args: {
    branch_id: v.id("branches"),
    year: v.number(),
  },
  handler: async (ctx, args) => {
    const existingPeriods = await ctx.db
      .query("accounting_periods")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
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
