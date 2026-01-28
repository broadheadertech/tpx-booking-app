import { v, ConvexError } from "convex/values";
import { mutation, query } from "../_generated/server";

// ============================================================================
// CASH ADVANCE SERVICE
// ============================================================================
// Manages barber cash advance requests and approvals
// Features:
// - 50% of avg 2-week earnings limit
// - Only one active advance at a time
// - Privacy: Only barber and branch admin can see details
// ============================================================================

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate barber's average 2-week earnings
 * Uses completed bookings from the last 4 weeks for a more accurate average
 */
async function calculateBarberAverageEarnings(
  ctx: any,
  userId: string,
  branchId: string
): Promise<number> {
  // First, get the barber profile from the user ID
  const barberProfile = await ctx.db
    .query("barbers")
    .withIndex("by_user", (q: any) => q.eq("user", userId))
    .first();

  if (!barberProfile) {
    // No barber profile found, return 0
    return 0;
  }

  const fourWeeksAgo = Date.now() - 28 * 24 * 60 * 60 * 1000;
  // Calculate date string for 4 weeks ago (YYYY-MM-DD format)
  const fourWeeksAgoDate = new Date(fourWeeksAgo).toISOString().split("T")[0];

  // Get completed bookings for this barber in the last 4 weeks
  // The bookings table uses "barber" field (pointing to barbers table)
  const bookings = await ctx.db
    .query("bookings")
    .withIndex("by_branch", (q: any) => q.eq("branch_id", branchId))
    .filter((q: any) =>
      q.and(
        q.eq(q.field("barber"), barberProfile._id),
        q.eq(q.field("status"), "completed"),
        q.gte(q.field("date"), fourWeeksAgoDate)
      )
    )
    .collect();

  // Calculate total earnings using final_price or price
  const totalEarnings = bookings.reduce((sum: number, booking: any) => {
    return sum + (booking.final_price || booking.price || 0);
  }, 0);

  // Calculate average 2-week earnings (4 weeks / 2 = 2 pay periods)
  const avgTwoWeekEarnings = totalEarnings / 2;

  return avgTwoWeekEarnings;
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get barber's current advance status
 * Returns active advance (pending, approved, or paid_out) if exists
 */
export const getBarberAdvanceStatus = query({
  args: {
    barber_id: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get any active advances (not repaid or rejected)
    const activeAdvance = await ctx.db
      .query("cashAdvances")
      .withIndex("by_barber_status", (q) =>
        q.eq("barber_id", args.barber_id)
      )
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "approved"),
          q.eq(q.field("status"), "paid_out")
        )
      )
      .first();

    return activeAdvance;
  },
});

/**
 * Get barber's advance history
 */
export const getBarberAdvanceHistory = query({
  args: {
    barber_id: v.id("users"),
  },
  handler: async (ctx, args) => {
    const advances = await ctx.db
      .query("cashAdvances")
      .withIndex("by_barber", (q) => q.eq("barber_id", args.barber_id))
      .order("desc")
      .collect();

    return advances;
  },
});

/**
 * Get barber's maximum allowed advance amount
 * Returns 50% of average 2-week earnings
 */
export const getMaxAdvanceAmount = query({
  args: {
    barber_id: v.id("users"),
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const avgEarnings = await calculateBarberAverageEarnings(
      ctx,
      args.barber_id,
      args.branch_id
    );

    // 50% of average 2-week earnings
    const maxAllowed = Math.floor(avgEarnings * 0.5);

    return {
      avgTwoWeekEarnings: avgEarnings,
      maxAllowed,
    };
  },
});

/**
 * Get pending advance requests for a branch (Branch Admin view)
 */
export const getPendingAdvances = query({
  args: {
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const advances = await ctx.db
      .query("cashAdvances")
      .withIndex("by_branch_status", (q) =>
        q.eq("branch_id", args.branch_id).eq("status", "pending")
      )
      .order("desc")
      .collect();

    // Enrich with barber details
    const enrichedAdvances = await Promise.all(
      advances.map(async (advance) => {
        const barber = await ctx.db.get(advance.barber_id);
        return {
          ...advance,
          barber_name: barber?.name || "Unknown",
          barber_email: barber?.email || "",
        };
      })
    );

    return enrichedAdvances;
  },
});

/**
 * Get all advances for a branch (Branch Admin history view)
 */
export const getBranchAdvanceHistory = query({
  args: {
    branch_id: v.id("branches"),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected"),
        v.literal("paid_out"),
        v.literal("repaid")
      )
    ),
  },
  handler: async (ctx, args) => {
    let advances;

    if (args.status) {
      advances = await ctx.db
        .query("cashAdvances")
        .withIndex("by_branch_status", (q) =>
          q.eq("branch_id", args.branch_id).eq("status", args.status!)
        )
        .order("desc")
        .collect();
    } else {
      advances = await ctx.db
        .query("cashAdvances")
        .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
        .order("desc")
        .collect();
    }

    // Enrich with barber details
    const enrichedAdvances = await Promise.all(
      advances.map(async (advance) => {
        const barber = await ctx.db.get(advance.barber_id);
        const decidedBy = advance.decided_by
          ? await ctx.db.get(advance.decided_by)
          : null;

        return {
          ...advance,
          barber_name: barber?.name || "Unknown",
          barber_email: barber?.email || "",
          decided_by_name: decidedBy?.name || null,
        };
      })
    );

    return enrichedAdvances;
  },
});

/**
 * Get pending advances count for badge
 */
export const getPendingAdvancesCount = query({
  args: {
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const advances = await ctx.db
      .query("cashAdvances")
      .withIndex("by_branch_status", (q) =>
        q.eq("branch_id", args.branch_id).eq("status", "pending")
      )
      .collect();

    return advances.length;
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Request a cash advance (Barber action)
 */
export const requestAdvance = mutation({
  args: {
    barber_id: v.id("users"),
    branch_id: v.id("branches"),
    amount: v.number(),
    reason: v.optional(v.string()),
    repayment_terms: v.optional(v.number()), // 1, 2, or 3 installments
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Validate amount is positive
    if (args.amount <= 0) {
      throw new ConvexError({
        code: "INVALID_AMOUNT",
        message: "Amount must be greater than 0",
      });
    }

    // Validate repayment terms (1, 2, or 3)
    const repaymentTerms = args.repayment_terms || 1;
    if (repaymentTerms < 1 || repaymentTerms > 3) {
      throw new ConvexError({
        code: "INVALID_REPAYMENT_TERMS",
        message: "Repayment terms must be 1, 2, or 3 installments",
      });
    }

    // Check for existing active advance
    const activeAdvance = await ctx.db
      .query("cashAdvances")
      .withIndex("by_barber", (q) => q.eq("barber_id", args.barber_id))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "approved"),
          q.eq(q.field("status"), "paid_out")
        )
      )
      .first();

    if (activeAdvance) {
      throw new ConvexError({
        code: "ACTIVE_ADVANCE_EXISTS",
        message:
          "You already have an active cash advance. Please wait until it is repaid before requesting a new one.",
      });
    }

    // Calculate max allowed amount (50% of avg 2-week earnings)
    const avgEarnings = await calculateBarberAverageEarnings(
      ctx,
      args.barber_id,
      args.branch_id
    );
    const maxAllowed = Math.floor(avgEarnings * 0.5);

    // Validate amount doesn't exceed limit
    if (args.amount > maxAllowed) {
      throw new ConvexError({
        code: "EXCEEDS_LIMIT",
        message: `Amount exceeds your maximum allowed advance of ₱${maxAllowed.toLocaleString()}. This is 50% of your average 2-week earnings.`,
      });
    }

    // Minimum threshold - must have some earnings history
    if (maxAllowed < 500) {
      throw new ConvexError({
        code: "INSUFFICIENT_HISTORY",
        message:
          "You need more earnings history to request a cash advance. Please complete more bookings first.",
      });
    }

    // Calculate amount per installment (rounded up to avoid rounding issues)
    const amountPerInstallment = Math.ceil(args.amount / repaymentTerms);

    // Create the advance request
    const advanceId = await ctx.db.insert("cashAdvances", {
      barber_id: args.barber_id,
      branch_id: args.branch_id,
      amount: args.amount,
      reason: args.reason,
      status: "pending",
      max_allowed: maxAllowed,
      requested_at: now,
      repayment_terms: repaymentTerms,
      installments_paid: 0,
      amount_per_installment: amountPerInstallment,
      total_repaid: 0,
      created_at: now,
      updated_at: now,
    });

    return {
      success: true,
      advance_id: advanceId,
      message: "Cash advance request submitted successfully",
      repayment_terms: repaymentTerms,
      amount_per_installment: amountPerInstallment,
    };
  },
});

/**
 * Approve a cash advance (Branch Admin action)
 */
export const approveAdvance = mutation({
  args: {
    advance_id: v.id("cashAdvances"),
    approved_by: v.id("users"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const advance = await ctx.db.get(args.advance_id);
    if (!advance) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Cash advance request not found",
      });
    }

    if (advance.status !== "pending") {
      throw new ConvexError({
        code: "INVALID_STATUS",
        message: `Cannot approve advance with status: ${advance.status}`,
      });
    }

    await ctx.db.patch(args.advance_id, {
      status: "approved",
      decided_at: now,
      decided_by: args.approved_by,
      notes: args.notes,
      updated_at: now,
    });

    return {
      success: true,
      message: "Cash advance approved",
    };
  },
});

/**
 * Reject a cash advance (Branch Admin action)
 */
export const rejectAdvance = mutation({
  args: {
    advance_id: v.id("cashAdvances"),
    rejected_by: v.id("users"),
    rejection_reason: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const advance = await ctx.db.get(args.advance_id);
    if (!advance) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Cash advance request not found",
      });
    }

    if (advance.status !== "pending") {
      throw new ConvexError({
        code: "INVALID_STATUS",
        message: `Cannot reject advance with status: ${advance.status}`,
      });
    }

    await ctx.db.patch(args.advance_id, {
      status: "rejected",
      decided_at: now,
      decided_by: args.rejected_by,
      rejection_reason: args.rejection_reason,
      updated_at: now,
    });

    return {
      success: true,
      message: "Cash advance rejected",
    };
  },
});

/**
 * Mark advance as paid out (Branch Admin action)
 * Called when cash is physically given to barber
 */
export const markAsPaidOut = mutation({
  args: {
    advance_id: v.id("cashAdvances"),
    paid_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const advance = await ctx.db.get(args.advance_id);
    if (!advance) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Cash advance not found",
      });
    }

    if (advance.status !== "approved") {
      throw new ConvexError({
        code: "INVALID_STATUS",
        message: `Can only mark approved advances as paid out. Current status: ${advance.status}`,
      });
    }

    await ctx.db.patch(args.advance_id, {
      status: "paid_out",
      paid_out_at: now,
      updated_at: now,
    });

    return {
      success: true,
      message: "Cash advance marked as paid out",
    };
  },
});

/**
 * Mark advance as repaid (Called by payroll system)
 */
export const markAsRepaid = mutation({
  args: {
    advance_id: v.id("cashAdvances"),
    payroll_id: v.optional(v.id("payroll")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const advance = await ctx.db.get(args.advance_id);
    if (!advance) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Cash advance not found",
      });
    }

    if (advance.status !== "paid_out") {
      throw new ConvexError({
        code: "INVALID_STATUS",
        message: `Can only mark paid_out advances as repaid. Current status: ${advance.status}`,
      });
    }

    await ctx.db.patch(args.advance_id, {
      status: "repaid",
      repaid_at: now,
      payroll_id: args.payroll_id,
      updated_at: now,
    });

    return {
      success: true,
      message: "Cash advance marked as repaid",
    };
  },
});

/**
 * Cancel a pending advance request (Barber action)
 */
export const cancelAdvance = mutation({
  args: {
    advance_id: v.id("cashAdvances"),
    barber_id: v.id("users"),
  },
  handler: async (ctx, args) => {
    const advance = await ctx.db.get(args.advance_id);
    if (!advance) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Cash advance not found",
      });
    }

    // Only the requesting barber can cancel
    if (advance.barber_id !== args.barber_id) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "You can only cancel your own advance requests",
      });
    }

    if (advance.status !== "pending") {
      throw new ConvexError({
        code: "INVALID_STATUS",
        message: "Only pending advances can be cancelled",
      });
    }

    // Delete the advance request
    await ctx.db.delete(args.advance_id);

    return {
      success: true,
      message: "Cash advance request cancelled",
    };
  },
});

/**
 * Get active advances for payroll deduction
 */
export const getActiveAdvancesForPayroll = query({
  args: {
    barber_id: v.id("users"),
  },
  handler: async (ctx, args) => {
    const activeAdvance = await ctx.db
      .query("cashAdvances")
      .withIndex("by_barber", (q) => q.eq("barber_id", args.barber_id))
      .filter((q) => q.eq(q.field("status"), "paid_out"))
      .first();

    return activeAdvance;
  },
});
