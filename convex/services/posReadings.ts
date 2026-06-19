/**
 * BIR POS Readings — X (mid-day, no reset) and Z (end-of-day, resets the day).
 *
 * X-Reading is computed on the fly for the currently-open period (since the
 * last Z) and changes no state. Z-Reading permanently records the period in
 * `z_readings`, increments the per-branch Z-counter, and rolls the day's gross
 * into the branch's accumulated grand total. Per branch (one machine/branch).
 *
 * @module convex/services/posReadings
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { logAudit } from "./auditLogs";

const Z_ROLES = new Set(["staff", "admin", "branch_admin", "super_admin", "it_admin"]);
const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

// PH (UTC+8, no DST) calendar date for a timestamp.
function phDateString(ts: number): string {
  return new Date(ts + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

// Start / end of a PH calendar date ("YYYY-MM-DD") as epoch ms.
function phStartMs(dateStr: string): number {
  return Date.parse(`${dateStr}T00:00:00.000+08:00`);
}
function phEndMs(dateStr: string): number {
  return Date.parse(`${dateStr}T23:59:59.999+08:00`);
}

/** Most recent Z-reading for a branch (highest z_counter), or null. */
async function getLastZ(ctx: any, branchId: any) {
  return await ctx.db
    .query("z_readings")
    .withIndex("by_branch", (q: any) => q.eq("branch_id", branchId))
    .order("desc")
    .first();
}

/** Aggregate COMPLETED transactions for a branch in (periodStart, periodEnd]. */
async function aggregatePeriod(ctx: any, branchId: any, periodStart: number, periodEnd: number) {
  const txns = await ctx.db
    .query("transactions")
    .withIndex("by_branch_date", (q: any) =>
      q.eq("branch_id", branchId).gt("createdAt", periodStart).lte("createdAt", periodEnd)
    )
    .collect();

  const completed = txns
    .filter((t: any) => t.payment_status === "completed" && !t.voided)
    .sort((a: any, b: any) => a.createdAt - b.createdAt);

  let gross = 0, vatable = 0, vatExempt = 0, zeroRated = 0, vat = 0, discounts = 0, sc = 0, pwd = 0;
  let itemsSold = 0, scTxns = 0, pwdTxns = 0;
  const payMap = new Map<string, { amount: number; count: number }>();

  for (const t of completed) {
    const total = Number(t.total_amount || 0);
    gross += total;
    vatable += Number(t.vatable_sales || 0);
    vatExempt += Number(t.vat_exempt_sales || 0);
    zeroRated += Number(t.zero_rated_sales || 0);
    vat += Number(t.vat_amount || 0);
    const d = Number(t.discount_amount || 0);
    discounts += d;
    if (t.discount_type === "senior") { sc += d; scTxns += 1; }
    else if (t.discount_type === "pwd") { pwd += d; pwdTxns += 1; }
    for (const s of t.services || []) itemsSold += Number(s.quantity || 0);
    for (const p of t.products || []) itemsSold += Number(p.quantity || 0);
    const method = t.payment_method || "unknown";
    const pm = payMap.get(method) || { amount: 0, count: 0 };
    pm.amount += total;
    pm.count += 1;
    payMap.set(method, pm);
  }

  // Returns = refunded transactions in the period.
  const returns = txns
    .filter((t: any) => t.payment_status === "refunded")
    .reduce((sum: number, t: any) => sum + Number(t.total_amount || 0), 0);

  // Discrete POS events (line voids, reprints, …) in the period.
  const events = await ctx.db
    .query("pos_events")
    .withIndex("by_branch_date", (q: any) =>
      q.eq("branch_id", branchId).gt("created_at", periodStart).lte("created_at", periodEnd)
    )
    .collect();
  const detail_counts = {
    line_void: 0,
    transaction_reprint: 0,
    cancelled_transaction: 0,
    no_sale: 0,
    price_override: 0,
    cash_deposit_reprint: 0,
    withdrawal_reprint: 0,
  };
  for (const e of events) {
    if (Object.prototype.hasOwnProperty.call(detail_counts, e.event_type)) {
      (detail_counts as any)[e.event_type] += 1;
    }
  }

  const grossSales = round2(gross);
  const totalDiscounts = round2(discounts);
  const subTotal = round2(grossSales - returns);
  const regularDiscount = round2(totalDiscounts - sc - pwd);

  return {
    transaction_count: completed.length,
    items_sold_count: itemsSold,
    sc_txn_count: scTxns,
    pwd_txn_count: pwdTxns,
    gross_sales: grossSales,
    returns_total: round2(returns),
    sub_total: subTotal,
    net_sales: round2(subTotal - totalDiscounts), // net of returns + discounts
    vatable_sales: round2(vatable),
    vat_exempt_sales: round2(vatExempt),
    zero_rated_sales: round2(zeroRated),
    vat_amount: round2(vat),
    total_discounts: totalDiscounts,
    sc_discount: round2(sc),
    pwd_discount: round2(pwd),
    regular_discount: regularDiscount,
    payment_breakdown: Array.from(payMap.entries()).map(([method, v2]) => ({
      method,
      amount: round2(v2.amount),
      count: v2.count,
    })),
    detail_counts,
    beginning_or_number: completed.length ? completed[0].receipt_number : undefined,
    ending_or_number: completed.length ? completed[completed.length - 1].receipt_number : undefined,
  };
}

async function buildContext(ctx: any, branchId: any) {
  const branch: any = await ctx.db.get(branchId);
  const machine: any = await ctx.db
    .query("machine_ptu")
    .withIndex("by_branch", (q: any) => q.eq("branch_id", branchId))
    .first();
  const isAccredited = machine?.status === "approved";
  return {
    branch,
    isAccredited,
    store_code: branch?.or_branch_code || branch?.branch_code || "",
    terminal_no: "1",
    machine_min: isAccredited ? (machine?.min || "") : "",
    machine_serial: isAccredited ? (machine?.serial_number || "") : "",
  };
}

// ============================================================================
// X-READING — interim, no state change
// ============================================================================

export const getXReading = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const lastZ = await getLastZ(ctx, args.branch_id);
    const periodStart = lastZ?.period_end ?? 0;
    const agg = await aggregatePeriod(ctx, args.branch_id, periodStart, now);
    const ctxInfo = await buildContext(ctx, args.branch_id);
    const accumBegin = lastZ?.accumulated_grand_total_ending ?? 0;

    return {
      type: "X" as const,
      branch_id: args.branch_id,
      branch_name: ctxInfo.branch?.name || "",
      reading_datetime: now,
      period_start: periodStart,
      period_end: now,
      next_z_counter: (lastZ?.z_counter ?? 0) + 1,
      store_code: ctxInfo.store_code,
      terminal_no: ctxInfo.terminal_no,
      machine_min: ctxInfo.machine_min,
      machine_serial: ctxInfo.machine_serial,
      accumulated_grand_total_beginning: round2(accumBegin),
      accumulated_grand_total_ending: round2(accumBegin + agg.gross_sales),
      is_bir_accredited: ctxInfo.isAccredited,
      ...agg,
    };
  },
});

// ============================================================================
// RANGE REPORT — Z-style sales summary for any date range (no reset)
// ============================================================================

export const getRangeReading = query({
  args: {
    branch_id: v.id("branches"),
    start_date: v.string(), // "YYYY-MM-DD"
    end_date: v.string(),   // "YYYY-MM-DD"
  },
  handler: async (ctx, args) => {
    const startTs = phStartMs(args.start_date);
    const endTs = phEndMs(args.end_date);
    if (isNaN(startTs) || isNaN(endTs) || endTs < startTs) {
      throw new Error("Invalid date range.");
    }
    // periodStart is exclusive (>) so subtract 1ms to include the start instant.
    const agg = await aggregatePeriod(ctx, args.branch_id, startTs - 1, endTs);
    const ctxInfo = await buildContext(ctx, args.branch_id);

    return {
      type: "RANGE" as const,
      branch_id: args.branch_id,
      branch_name: ctxInfo.branch?.name || "",
      reading_datetime: Date.now(),
      range_start: args.start_date,
      range_end: args.end_date,
      period_start: startTs,
      period_end: endTs,
      store_code: ctxInfo.store_code,
      terminal_no: ctxInfo.terminal_no,
      machine_min: ctxInfo.machine_min,
      machine_serial: ctxInfo.machine_serial,
      is_bir_accredited: ctxInfo.isAccredited,
      ...agg,
    };
  },
});

// ============================================================================
// Z-READING — end of day, records + resets
// ============================================================================

export const performZReading = mutation({
  args: { branch_id: v.id("branches"), actor_id: v.id("users") },
  handler: async (ctx, args) => {
    const actor = await ctx.db.get(args.actor_id);
    if (!actor) throw new Error("User not found.");
    if (!actor.role || !Z_ROLES.has(actor.role)) {
      throw new Error("Not authorized to run a Z-reading.");
    }

    const now = Date.now();
    const lastZ = await getLastZ(ctx, args.branch_id);
    const periodStart = lastZ?.period_end ?? 0;
    const agg = await aggregatePeriod(ctx, args.branch_id, periodStart, now);

    const zCounter = (lastZ?.z_counter ?? 0) + 1;
    const accumBegin = round2(lastZ?.accumulated_grand_total_ending ?? 0);
    const accumEnd = round2(accumBegin + agg.gross_sales);
    const ctxInfo = await buildContext(ctx, args.branch_id);
    const branch = ctxInfo.branch;
    const isAccredited = ctxInfo.isAccredited;
    const businessDate = phDateString(now);

    const id = await ctx.db.insert("z_readings", {
      branch_id: args.branch_id,
      z_counter: zCounter,
      reading_datetime: now,
      business_date: businessDate,
      period_start: periodStart,
      period_end: now,
      transaction_count: agg.transaction_count,
      items_sold_count: agg.items_sold_count,
      sc_txn_count: agg.sc_txn_count,
      pwd_txn_count: agg.pwd_txn_count,
      beginning_or_number: agg.beginning_or_number,
      ending_or_number: agg.ending_or_number,
      gross_sales: agg.gross_sales,
      returns_total: agg.returns_total,
      net_sales: agg.net_sales,
      vatable_sales: agg.vatable_sales,
      vat_exempt_sales: agg.vat_exempt_sales,
      zero_rated_sales: agg.zero_rated_sales,
      vat_amount: agg.vat_amount,
      total_discounts: agg.total_discounts,
      sc_discount: agg.sc_discount,
      pwd_discount: agg.pwd_discount,
      regular_discount: agg.regular_discount,
      store_code: ctxInfo.store_code,
      terminal_no: ctxInfo.terminal_no,
      machine_min: ctxInfo.machine_min,
      machine_serial: ctxInfo.machine_serial,
      detail_counts: agg.detail_counts,
      payment_breakdown: agg.payment_breakdown,
      accumulated_grand_total_beginning: accumBegin,
      accumulated_grand_total_ending: accumEnd,
      is_bir_accredited: isAccredited,
      performed_by: args.actor_id,
      performed_by_name: actor.name || actor.username,
      created_at: now,
    });

    await logAudit(ctx, {
      user_id: args.actor_id as string,
      user_name: actor.name,
      user_role: actor.role,
      branch_id: args.branch_id as any,
      category: "transaction",
      action: "z_reading.performed",
      description: `Z-Reading #${zCounter} for ${branch?.name || "branch"} — ${agg.transaction_count} txns, gross ₱${agg.gross_sales}`,
      target_type: "z_reading",
      target_id: id as string,
      metadata: { z_counter: zCounter, gross_sales: agg.gross_sales, business_date: businessDate },
    });

    return {
      type: "Z" as const,
      z_reading_id: id,
      z_counter: zCounter,
      branch_id: args.branch_id,
      branch_name: branch?.name || "",
      reading_datetime: now,
      business_date: businessDate,
      period_start: periodStart,
      period_end: now,
      store_code: ctxInfo.store_code,
      terminal_no: ctxInfo.terminal_no,
      machine_min: ctxInfo.machine_min,
      machine_serial: ctxInfo.machine_serial,
      accumulated_grand_total_beginning: accumBegin,
      accumulated_grand_total_ending: accumEnd,
      is_bir_accredited: isAccredited,
      performed_by_name: actor.name || actor.username,
      ...agg,
    };
  },
});

/**
 * Record a discrete POS event (line void, reprint, …). Counted into the next
 * X/Z reading for the branch. Fire-and-forget from the POS UI.
 */
export const logPosEvent = mutation({
  args: {
    branch_id: v.id("branches"),
    event_type: v.union(
      v.literal("line_void"),
      v.literal("transaction_reprint"),
      v.literal("cancelled_transaction"),
      v.literal("no_sale"),
      v.literal("price_override"),
      v.literal("cash_deposit_reprint"),
      v.literal("withdrawal_reprint")
    ),
    performed_by: v.optional(v.id("users")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("pos_events", {
      branch_id: args.branch_id,
      event_type: args.event_type,
      performed_by: args.performed_by,
      note: args.note,
      created_at: Date.now(),
    });
    return { success: true };
  },
});

/**
 * Void a completed transaction (cashier cancellation). Marks it voided so it's
 * excluded from X/Z sales, logs a "cancelled_transaction" event for the count,
 * restores branch-product stock (best effort), and audits the void.
 */
export const voidTransaction = mutation({
  args: {
    transaction_id: v.id("transactions"),
    actor_id: v.id("users"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await ctx.db.get(args.actor_id);
    if (!actor) throw new Error("User not found.");
    if (!actor.role || !Z_ROLES.has(actor.role)) {
      throw new Error("Not authorized to void a transaction.");
    }
    if (!args.reason.trim()) throw new Error("A void reason is required.");

    const txn: any = await ctx.db.get(args.transaction_id);
    if (!txn) throw new Error("Transaction not found.");
    if (txn.voided) throw new Error("This transaction is already voided.");

    const now = Date.now();
    await ctx.db.patch(args.transaction_id, {
      voided: true,
      voided_at: now,
      voided_by: args.actor_id,
      void_reason: args.reason.trim(),
      updatedAt: now,
    });

    // Best-effort: restore branch-product stock for any products on the sale.
    for (const p of txn.products || []) {
      try {
        const prod: any = await ctx.db.get(p.product_id);
        if (prod && "stock" in prod) {
          await ctx.db.patch(p.product_id, {
            stock: (Number(prod.stock) || 0) + Number(p.quantity || 0),
            updatedAt: now,
          });
        }
      } catch {
        // ignore — stock can be reconciled manually
      }
    }

    // Count this void in the current reading period.
    await ctx.db.insert("pos_events", {
      branch_id: txn.branch_id,
      event_type: "cancelled_transaction",
      performed_by: args.actor_id,
      note: txn.receipt_number || txn.transaction_id,
      created_at: now,
    });

    await logAudit(ctx, {
      user_id: args.actor_id as string,
      user_name: actor.name,
      user_role: actor.role,
      branch_id: txn.branch_id,
      category: "transaction",
      action: "transaction.voided",
      description: `Voided transaction ${txn.receipt_number || txn.transaction_id} (₱${txn.total_amount}) — ${args.reason.trim()}`,
      target_type: "transaction",
      target_id: args.transaction_id as string,
      metadata: { reason: args.reason.trim(), total: txn.total_amount },
    });

    return { success: true };
  },
});

export const listZReadings = query({
  args: { branch_id: v.id("branches"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("z_readings")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .order("desc")
      .take(args.limit || 30);
  },
});
