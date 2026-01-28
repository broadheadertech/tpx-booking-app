import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// ============================================================================
// EXPENSES SERVICE
// ============================================================================
// Manages branch expenses for P&L tracking
// Categories: Fixed (rent, utilities, insurance) and Operating (supplies, marketing)
// ============================================================================

// Expense category type
const expenseCategoryValidator = v.union(
  v.literal("rent"),
  v.literal("utilities"),
  v.literal("insurance"),
  v.literal("salaries"),
  v.literal("subscriptions"),
  v.literal("supplies"),
  v.literal("maintenance"),
  v.literal("marketing"),
  v.literal("equipment"),
  v.literal("transportation"),
  v.literal("miscellaneous")
);

const expenseTypeValidator = v.union(
  v.literal("fixed"),
  v.literal("operating")
);

// ============================================================================
// QUERIES
// ============================================================================

// Get all expenses for a branch
export const getExpensesByBranch = query({
  args: {
    branch_id: v.id("branches"),
    start_date: v.optional(v.number()),
    end_date: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let expenses = await ctx.db
      .query("expenses")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .order("desc")
      .collect();

    // Filter by date range if provided
    if (args.start_date && args.end_date) {
      expenses = expenses.filter(
        (e) => e.expense_date >= args.start_date! && e.expense_date <= args.end_date!
      );
    }

    return expenses;
  },
});

// Get expenses by category
export const getExpensesByCategory = query({
  args: {
    branch_id: v.id("branches"),
    category: expenseCategoryValidator,
  },
  handler: async (ctx, args) => {
    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .filter((q) => q.eq(q.field("category"), args.category))
      .order("desc")
      .collect();

    return expenses;
  },
});

// Get expenses by type (fixed or operating)
export const getExpensesByType = query({
  args: {
    branch_id: v.id("branches"),
    expense_type: expenseTypeValidator,
  },
  handler: async (ctx, args) => {
    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .filter((q) => q.eq(q.field("expense_type"), args.expense_type))
      .order("desc")
      .collect();

    return expenses;
  },
});

// Get expense summary for a period
export const getExpenseSummary = query({
  args: {
    branch_id: v.id("branches"),
    start_date: v.number(),
    end_date: v.number(),
  },
  handler: async (ctx, args) => {
    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    // Filter by date range
    const periodExpenses = expenses.filter(
      (e) => e.expense_date >= args.start_date && e.expense_date <= args.end_date
    );

    // Calculate totals by type
    let fixedTotal = 0;
    let operatingTotal = 0;
    const byCategory: Record<string, number> = {};

    for (const expense of periodExpenses) {
      if (expense.expense_type === "fixed") {
        fixedTotal += expense.amount;
      } else {
        operatingTotal += expense.amount;
      }

      byCategory[expense.category] = (byCategory[expense.category] || 0) + expense.amount;
    }

    // Convert to array and sort by amount
    const categories = Object.entries(byCategory)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    return {
      fixed_expenses: fixedTotal,
      operating_expenses: operatingTotal,
      total_expenses: fixedTotal + operatingTotal,
      expense_count: periodExpenses.length,
      by_category: categories,
      period: {
        start: args.start_date,
        end: args.end_date,
      },
    };
  },
});

// Get recurring expenses for a branch
export const getRecurringExpenses = query({
  args: {
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .filter((q) => q.eq(q.field("is_recurring"), true))
      .collect();

    return expenses;
  },
});

// Get payment assets (cash/bank accounts) for expense payment dropdown
export const getPaymentAssets = query({
  args: {
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    // Get all active current assets that can be used for payments (cash, bank_accounts)
    const assets = await ctx.db
      .query("assets")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .filter((q) => q.eq(q.field("is_active"), true))
      .collect();

    // Filter to only include payment assets (cash and bank accounts)
    const paymentAssets = assets.filter(
      (asset) => asset.category === "cash" || asset.category === "bank_accounts"
    );

    return paymentAssets;
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

// Add a new expense
export const addExpense = mutation({
  args: {
    branch_id: v.id("branches"),
    expense_type: expenseTypeValidator,
    category: expenseCategoryValidator,
    description: v.string(),
    amount: v.number(),
    expense_date: v.number(),
    receipt_url: v.optional(v.string()),
    receipt_storage_id: v.optional(v.id("_storage")),
    notes: v.optional(v.string()),
    is_recurring: v.boolean(),
    recurring_day: v.optional(v.number()),
    paid_from_asset_id: v.optional(v.id("assets")), // Asset to deduct from (cash/bank)
    created_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // If paid_from_asset_id is provided, deduct the expense amount from that asset
    if (args.paid_from_asset_id) {
      const asset = await ctx.db.get(args.paid_from_asset_id);
      if (!asset) {
        throw new Error("Selected asset account not found");
      }
      if (!asset.is_active) {
        throw new Error("Selected asset account is not active");
      }
      // Deduct expense amount from asset's current value (double-entry accounting)
      const newValue = asset.current_value - args.amount;
      await ctx.db.patch(args.paid_from_asset_id, {
        current_value: newValue,
      });
    }

    const expenseId = await ctx.db.insert("expenses", {
      branch_id: args.branch_id,
      expense_type: args.expense_type,
      category: args.category,
      description: args.description,
      amount: args.amount,
      expense_date: args.expense_date,
      receipt_url: args.receipt_url,
      receipt_storage_id: args.receipt_storage_id,
      notes: args.notes,
      is_recurring: args.is_recurring,
      recurring_day: args.recurring_day,
      paid_from_asset_id: args.paid_from_asset_id,
      created_by: args.created_by,
      created_at: now,
      updated_at: now,
    });

    return { success: true, expense_id: expenseId };
  },
});

// Update an expense
export const updateExpense = mutation({
  args: {
    expense_id: v.id("expenses"),
    expense_type: v.optional(expenseTypeValidator),
    category: v.optional(expenseCategoryValidator),
    description: v.optional(v.string()),
    amount: v.optional(v.number()),
    expense_date: v.optional(v.number()),
    receipt_url: v.optional(v.string()),
    receipt_storage_id: v.optional(v.id("_storage")),
    notes: v.optional(v.string()),
    is_recurring: v.optional(v.boolean()),
    recurring_day: v.optional(v.number()),
    paid_from_asset_id: v.optional(v.id("assets")),
  },
  handler: async (ctx, args) => {
    const { expense_id, ...updates } = args;

    // Get the existing expense to handle asset adjustments
    const existingExpense = await ctx.db.get(expense_id);
    if (!existingExpense) {
      throw new Error("Expense not found");
    }

    // Handle asset balance adjustments for double-entry accounting
    const oldAssetId = existingExpense.paid_from_asset_id;
    const newAssetId = updates.paid_from_asset_id;
    const oldAmount = existingExpense.amount;
    const newAmount = updates.amount ?? oldAmount;

    // If the asset or amount changed, we need to adjust balances
    const assetChanged = newAssetId !== undefined && newAssetId !== oldAssetId;
    const amountChanged = updates.amount !== undefined && updates.amount !== oldAmount;

    if (assetChanged || amountChanged) {
      // Restore the old amount to the old asset (if there was one)
      if (oldAssetId) {
        const oldAsset = await ctx.db.get(oldAssetId);
        if (oldAsset) {
          await ctx.db.patch(oldAssetId, {
            current_value: oldAsset.current_value + oldAmount,
          });
        }
      }

      // Deduct the new amount from the new asset (if there is one)
      const assetToDeduct = newAssetId !== undefined ? newAssetId : oldAssetId;
      if (assetToDeduct) {
        const asset = await ctx.db.get(assetToDeduct);
        if (asset && asset.is_active) {
          await ctx.db.patch(assetToDeduct, {
            current_value: asset.current_value - newAmount,
          });
        }
      }
    }

    // Filter out undefined values
    const cleanUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }

    cleanUpdates.updated_at = Date.now();

    await ctx.db.patch(expense_id, cleanUpdates);

    return { success: true };
  },
});

// Delete an expense
export const deleteExpense = mutation({
  args: {
    expense_id: v.id("expenses"),
  },
  handler: async (ctx, args) => {
    // Get the expense to restore asset balance if needed
    const expense = await ctx.db.get(args.expense_id);
    if (!expense) {
      throw new Error("Expense not found");
    }

    // Restore the amount to the asset if this expense was paid from an asset
    if (expense.paid_from_asset_id) {
      const asset = await ctx.db.get(expense.paid_from_asset_id);
      if (asset) {
        await ctx.db.patch(expense.paid_from_asset_id, {
          current_value: asset.current_value + expense.amount,
        });
      }
    }

    await ctx.db.delete(args.expense_id);
    return { success: true };
  },
});

// Bulk add recurring expenses for a month
export const generateRecurringExpenses = mutation({
  args: {
    branch_id: v.id("branches"),
    target_month: v.number(), // Unix timestamp for start of month
    created_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const recurringExpenses = await ctx.db
      .query("expenses")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .filter((q) => q.eq(q.field("is_recurring"), true))
      .collect();

    const now = Date.now();
    const targetDate = new Date(args.target_month);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();

    let created = 0;

    for (const recurring of recurringExpenses) {
      // Calculate the expense date for this month
      const day = recurring.recurring_day || 1;
      const expenseDate = new Date(year, month, day).getTime();

      // Check if this expense already exists for this month
      const existingExpenses = await ctx.db
        .query("expenses")
        .withIndex("by_branch_date", (q) =>
          q.eq("branch_id", args.branch_id).eq("expense_date", expenseDate)
        )
        .filter((q) =>
          q.and(
            q.eq(q.field("category"), recurring.category),
            q.eq(q.field("description"), recurring.description)
          )
        )
        .first();

      if (!existingExpenses) {
        await ctx.db.insert("expenses", {
          branch_id: args.branch_id,
          expense_type: recurring.expense_type,
          category: recurring.category,
          description: recurring.description,
          amount: recurring.amount,
          expense_date: expenseDate,
          notes: `Auto-generated from recurring expense`,
          is_recurring: false, // The generated expense itself is not recurring
          created_by: args.created_by,
          created_at: now,
          updated_at: now,
        });
        created++;
      }
    }

    return { success: true, created_count: created };
  },
});

// ============================================================================
// BRANCH REVENUE - Manual revenue tracking for branches
// ============================================================================

// Revenue category validator
const revenueCategoryValidator = v.union(
  v.literal("service_tips"),
  v.literal("product_sales"),
  v.literal("event_income"),
  v.literal("gift_card_sales"),
  v.literal("rental_income"),
  v.literal("training_income"),
  v.literal("other")
);

// Get all revenue entries for a branch
export const getRevenueByBranch = query({
  args: {
    branch_id: v.id("branches"),
    start_date: v.optional(v.number()),
    end_date: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let revenue = await ctx.db
      .query("branchRevenue")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .order("desc")
      .collect();

    // Filter by date range if provided
    if (args.start_date && args.end_date) {
      revenue = revenue.filter(
        (r) => r.revenue_date >= args.start_date! && r.revenue_date <= args.end_date!
      );
    }

    return revenue;
  },
});

// Get revenue summary for a period
export const getRevenueSummary = query({
  args: {
    branch_id: v.id("branches"),
    start_date: v.number(),
    end_date: v.number(),
  },
  handler: async (ctx, args) => {
    const revenue = await ctx.db
      .query("branchRevenue")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    // Filter by date range
    const periodRevenue = revenue.filter(
      (r) => r.revenue_date >= args.start_date && r.revenue_date <= args.end_date
    );

    // Calculate totals by category
    const byCategory: Record<string, number> = {};
    let totalRevenue = 0;

    for (const rev of periodRevenue) {
      totalRevenue += rev.amount;
      byCategory[rev.category] = (byCategory[rev.category] || 0) + rev.amount;
    }

    // Convert to array and sort by amount
    const categories = Object.entries(byCategory)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    return {
      total_revenue: totalRevenue,
      revenue_count: periodRevenue.length,
      by_category: categories,
      period: {
        start: args.start_date,
        end: args.end_date,
      },
    };
  },
});

// Get revenue payment destinations (cash/bank accounts)
export const getRevenuePaymentDestinations = query({
  args: {
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    // Get all active current assets that can receive revenue (cash, bank_accounts)
    const assets = await ctx.db
      .query("assets")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .filter((q) => q.eq(q.field("is_active"), true))
      .collect();

    // Filter to only include payment assets (cash and bank accounts)
    const paymentAssets = assets.filter(
      (asset) => asset.category === "cash" || asset.category === "bank_accounts"
    );

    return paymentAssets;
  },
});

// Add a new revenue entry
export const addRevenue = mutation({
  args: {
    branch_id: v.id("branches"),
    category: revenueCategoryValidator,
    description: v.string(),
    amount: v.number(),
    revenue_date: v.number(),
    notes: v.optional(v.string()),
    received_to_asset_id: v.optional(v.id("assets")), // Asset to credit (cash/bank)
    received_to_cash: v.optional(v.boolean()), // true = received to cash on hand
    created_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // If received_to_asset_id is provided, add the revenue amount to that asset
    if (args.received_to_asset_id) {
      const asset = await ctx.db.get(args.received_to_asset_id);
      if (!asset) {
        throw new Error("Selected asset account not found");
      }
      if (!asset.is_active) {
        throw new Error("Selected asset account is not active");
      }
      // Add revenue amount to asset's current value (double-entry accounting)
      const newValue = asset.current_value + args.amount;
      await ctx.db.patch(args.received_to_asset_id, {
        current_value: newValue,
      });
    }

    const revenueId = await ctx.db.insert("branchRevenue", {
      branch_id: args.branch_id,
      category: args.category,
      description: args.description,
      amount: args.amount,
      revenue_date: args.revenue_date,
      notes: args.notes,
      received_to_asset_id: args.received_to_asset_id,
      received_to_cash: args.received_to_cash,
      created_by: args.created_by,
      created_at: now,
      updated_at: now,
    });

    return { success: true, revenue_id: revenueId };
  },
});

// Update a revenue entry
export const updateRevenue = mutation({
  args: {
    revenue_id: v.id("branchRevenue"),
    category: v.optional(revenueCategoryValidator),
    description: v.optional(v.string()),
    amount: v.optional(v.number()),
    revenue_date: v.optional(v.number()),
    notes: v.optional(v.string()),
    received_to_asset_id: v.optional(v.id("assets")),
    received_to_cash: v.optional(v.boolean()),
    clear_payment_destination: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { revenue_id, clear_payment_destination, ...updates } = args;

    // Get the existing revenue to handle asset adjustments
    const existingRevenue = await ctx.db.get(revenue_id);
    if (!existingRevenue) {
      throw new Error("Revenue entry not found");
    }

    // Handle asset balance adjustments for double-entry accounting
    const oldAssetId = existingRevenue.received_to_asset_id;
    const newAssetId = clear_payment_destination ? undefined : (updates.received_to_asset_id ?? oldAssetId);
    const oldAmount = existingRevenue.amount;
    const newAmount = updates.amount ?? oldAmount;

    // If the asset or amount changed, we need to adjust balances
    const assetChanged = newAssetId !== oldAssetId;
    const amountChanged = updates.amount !== undefined && updates.amount !== oldAmount;

    if (assetChanged || amountChanged) {
      // Subtract the old amount from the old asset (if there was one)
      if (oldAssetId) {
        const oldAsset = await ctx.db.get(oldAssetId);
        if (oldAsset) {
          await ctx.db.patch(oldAssetId, {
            current_value: oldAsset.current_value - oldAmount,
          });
        }
      }

      // Add the new amount to the new asset (if there is one)
      if (newAssetId) {
        const asset = await ctx.db.get(newAssetId);
        if (asset && asset.is_active) {
          await ctx.db.patch(newAssetId, {
            current_value: asset.current_value + newAmount,
          });
        }
      }
    }

    // Filter out undefined values
    const cleanUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }

    // Handle clearing payment destination
    if (clear_payment_destination) {
      cleanUpdates.received_to_asset_id = undefined;
      cleanUpdates.received_to_cash = undefined;
    }

    cleanUpdates.updated_at = Date.now();

    await ctx.db.patch(revenue_id, cleanUpdates);

    return { success: true };
  },
});

// Delete a revenue entry
export const deleteRevenue = mutation({
  args: {
    revenue_id: v.id("branchRevenue"),
  },
  handler: async (ctx, args) => {
    // Get the revenue to restore asset balance if needed
    const revenue = await ctx.db.get(args.revenue_id);
    if (!revenue) {
      throw new Error("Revenue entry not found");
    }

    // Subtract the amount from the asset if this revenue was received to an asset
    if (revenue.received_to_asset_id) {
      const asset = await ctx.db.get(revenue.received_to_asset_id);
      if (asset) {
        await ctx.db.patch(revenue.received_to_asset_id, {
          current_value: asset.current_value - revenue.amount,
        });
      }
    }

    await ctx.db.delete(args.revenue_id);
    return { success: true };
  },
});
