import { v } from "convex/values";
import { query } from "../_generated/server";

// ============================================================================
// BRANCH P&L
// Aggregates revenue, expenses, and commission paid to HQ for a single
// branch over a date range. Powers the admin "Branch P&L" tab.
// ============================================================================

export const getBranchPLSummary = query({
  args: {
    branch_id: v.id("branches"),
    start_date: v.number(),
    end_date: v.number(),
  },
  handler: async (ctx, args) => {
    const branch = await ctx.db.get(args.branch_id);

    // ── Sales revenue: completed POS transactions in range ────────────────
    const txns = await ctx.db
      .query("transactions")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    let salesRevenue = 0;
    let serviceRevenue = 0;
    let productRevenue = 0;
    let txnCount = 0;
    let discountTotal = 0;

    for (const t of txns) {
      const ts = t._creationTime;
      if (ts < args.start_date || ts > args.end_date) continue;
      if (t.payment_status !== "completed") continue;
      salesRevenue += t.total_amount || 0;
      discountTotal += t.discount_amount || 0;
      txnCount++;

      const svcSum = (t.services || []).reduce(
        (s: number, sv: any) => s + (sv.price || 0) * (sv.quantity || 1),
        0
      );
      const prodSum = (t.products || []).reduce(
        (s: number, pr: any) => s + (pr.price || 0) * (pr.quantity || 1),
        0
      );
      serviceRevenue += svcSum;
      productRevenue += prodSum;
    }

    // ── Manual branch revenue entries ─────────────────────────────────────
    const manualRevenue = await ctx.db
      .query("branchRevenue")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    let otherRevenue = 0;
    let otherRevenueCount = 0;
    for (const r of manualRevenue) {
      if (r.revenue_date < args.start_date || r.revenue_date > args.end_date) continue;
      otherRevenue += r.amount || 0;
      otherRevenueCount++;
    }

    // ── Expenses (operating + fixed) ──────────────────────────────────────
    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    let fixedExpenses = 0;
    let operatingExpenses = 0;
    let expenseCount = 0;
    const expenseByCategory: Record<string, number> = {};

    for (const e of expenses) {
      if (e.expense_date < args.start_date || e.expense_date > args.end_date) continue;
      const amt = e.amount || 0;
      if (e.expense_type === "fixed") fixedExpenses += amt;
      else operatingExpenses += amt;
      expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + amt;
      expenseCount++;
    }

    // ── Commission paid to HQ (from wallet earnings) ──────────────────────
    const earnings = await ctx.db
      .query("branchWalletEarnings")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    let commissionPaid = 0;
    let walletGross = 0;
    let walletNet = 0;
    let walletPaymentCount = 0;
    for (const e of earnings) {
      if (e.created_at < args.start_date || e.created_at > args.end_date) continue;
      commissionPaid += e.commission_amount || 0;
      walletGross += e.gross_amount || 0;
      walletNet += e.net_amount || 0;
      walletPaymentCount++;
    }

    // ── Totals ────────────────────────────────────────────────────────────
    const totalRevenue = salesRevenue + otherRevenue;
    const totalExpenses = fixedExpenses + operatingExpenses;
    const netIncome = totalRevenue - totalExpenses - commissionPaid;
    const grossMargin =
      totalRevenue > 0 ? ((totalRevenue - commissionPaid) / totalRevenue) * 100 : 0;
    const netMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

    const categoriesSorted = Object.entries(expenseByCategory)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    return {
      branch_id: args.branch_id,
      branch_name: branch?.name || "Unknown branch",
      period: { start: args.start_date, end: args.end_date },
      revenue_breakdown: {
        sales_revenue: salesRevenue,
        service_revenue: serviceRevenue,
        product_revenue: productRevenue,
        other_revenue: otherRevenue,
        discount_total: discountTotal,
      },
      expense_breakdown: {
        fixed_expenses: fixedExpenses,
        operating_expenses: operatingExpenses,
        total: totalExpenses,
        by_category: categoriesSorted,
      },
      commission: {
        paid_to_hq: commissionPaid,
        wallet_gross: walletGross,
        wallet_net: walletNet,
        wallet_payment_count: walletPaymentCount,
      },
      counts: {
        transactions: txnCount,
        other_revenue_entries: otherRevenueCount,
        expense_entries: expenseCount,
      },
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      net_income: netIncome,
      gross_margin: grossMargin,
      net_margin: netMargin,
    };
  },
});

/**
 * Lightweight all-branches comparison (revenue / expenses / net) for the
 * branch picker dropdown — keeps the heavy per-branch query single-branch.
 */
export const compareAllBranches = query({
  args: {
    start_date: v.number(),
    end_date: v.number(),
  },
  handler: async (ctx, args) => {
    const branches = await ctx.db.query("branches").collect();

    const results = [];
    for (const b of branches) {
      const txns = await ctx.db
        .query("transactions")
        .withIndex("by_branch", (q) => q.eq("branch_id", b._id))
        .collect();
      let revenue = 0;
      let txnCount = 0;
      for (const t of txns) {
        const ts = t._creationTime;
        if (ts < args.start_date || ts > args.end_date) continue;
        if (t.payment_status !== "completed") continue;
        revenue += t.total_amount || 0;
        txnCount++;
      }

      const expenses = await ctx.db
        .query("expenses")
        .withIndex("by_branch", (q) => q.eq("branch_id", b._id))
        .collect();
      let expenseTotal = 0;
      for (const e of expenses) {
        if (e.expense_date < args.start_date || e.expense_date > args.end_date) continue;
        expenseTotal += e.amount || 0;
      }

      const earnings = await ctx.db
        .query("branchWalletEarnings")
        .withIndex("by_branch", (q) => q.eq("branch_id", b._id))
        .collect();
      let commissionPaid = 0;
      for (const e of earnings) {
        if (e.created_at < args.start_date || e.created_at > args.end_date) continue;
        commissionPaid += e.commission_amount || 0;
      }

      results.push({
        branch_id: b._id,
        branch_name: b.name,
        is_active: b.is_active,
        revenue,
        expenses: expenseTotal,
        commission_paid: commissionPaid,
        net_income: revenue - expenseTotal - commissionPaid,
        transaction_count: txnCount,
      });
    }

    results.sort((a, b) => b.net_income - a.net_income);
    return results;
  },
});
