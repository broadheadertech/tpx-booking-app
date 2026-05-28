import { Id } from "../_generated/dataModel";

// Shared helpers for sequential receipt numbering (BIR NFR11 compliance).
// Two flows are supported:
//   - "official_receipt" : legacy royalty receipts — global yearly counter, format "OR-2026-00001"
//   - "pos_or"           : POS sales receipts    — per-branch yearly counter, format "OR-<CODE>-2026-000001"

// Royalty receipt counter (global, yearly reset). Format: OR-YYYY-NNNNN
export async function getNextReceiptNumber(ctx: any): Promise<string> {
  const year = new Date().getFullYear();
  const counterType = "official_receipt";

  const counter = await ctx.db
    .query("receiptCounters")
    .withIndex("by_type_year", (q: any) =>
      q.eq("counter_type", counterType).eq("year", year)
    )
    .first();

  let nextNumber: number;

  if (counter) {
    nextNumber = counter.last_number + 1;
    await ctx.db.patch(counter._id, {
      last_number: nextNumber,
      updated_at: Date.now(),
    });
  } else {
    nextNumber = 1;
    await ctx.db.insert("receiptCounters", {
      counter_type: counterType,
      year: year,
      last_number: nextNumber,
      updated_at: Date.now(),
    });
  }

  const paddedNumber = String(nextNumber).padStart(5, "0");
  return `OR-${year}-${paddedNumber}`;
}

// POS OR counter (per-branch, yearly reset). Format: OR-<CODE>-YYYY-NNNNNN
// Falls back to the branch's `branch_code` when no `or_branch_code` is configured;
// falls back to "POS" if neither is set.
export async function getNextPosOrNumber(
  ctx: any,
  branchId: Id<"branches">
): Promise<string> {
  const year = new Date().getFullYear();
  const counterType = "pos_or";

  const branch = await ctx.db.get(branchId);
  const codeRaw =
    (branch?.or_branch_code as string | undefined) ||
    (branch?.branch_code as string | undefined) ||
    "POS";
  const code = String(codeRaw).toUpperCase().replace(/[^A-Z0-9]/g, "");

  const counter = await ctx.db
    .query("receiptCounters")
    .withIndex("by_type_year_branch", (q: any) =>
      q.eq("counter_type", counterType).eq("year", year).eq("branch_id", branchId)
    )
    .first();

  let nextNumber: number;

  if (counter) {
    nextNumber = counter.last_number + 1;
    await ctx.db.patch(counter._id, {
      last_number: nextNumber,
      updated_at: Date.now(),
    });
  } else {
    nextNumber = 1;
    await ctx.db.insert("receiptCounters", {
      counter_type: counterType,
      year: year,
      branch_id: branchId,
      last_number: nextNumber,
      updated_at: Date.now(),
    });
  }

  const paddedNumber = String(nextNumber).padStart(6, "0");
  return `OR-${code}-${year}-${paddedNumber}`;
}
