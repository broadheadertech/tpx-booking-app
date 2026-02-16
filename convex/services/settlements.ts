/**
 * Branch Settlements Service
 * Story 25.1: Branch Requests Settlement
 *
 * Manages settlement requests from branches for their accumulated wallet earnings.
 * Implements the settlement state machine: pending → approved → processing → completed
 *
 * @module convex/services/settlements
 */

import { mutation, query } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import { api } from "../_generated/api";
import { SETTLEMENT_STATUS, SETTLEMENT_TRANSITIONS } from "../lib/walletUtils";
import type { SettlementStatus } from "../lib/walletUtils";

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Request a settlement for pending branch earnings
 *
 * AC #4: Creates branchSettlements record with status = "pending"
 * AC #5: Blocks if existing pending settlement
 * AC #6: Validates minimum amount threshold
 * AC #3: Validates payout details configured
 *
 * @param branch_id - Branch requesting settlement
 * @param requested_by - User ID of requester
 */
export const requestSettlement = mutation({
  args: {
    branch_id: v.id("branches"),
    requested_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Step 1: Validate branch exists (AC: branch validation)
    const branch = await ctx.db.get(args.branch_id);
    if (!branch) {
      throw new ConvexError({
        code: "BRANCH_NOT_FOUND",
        message: "Branch not found",
      });
    }

    // Step 2: Check for existing pending settlement (AC #5)
    const existingPending = await ctx.db
      .query("branchSettlements")
      .withIndex("by_branch_status", (q) =>
        q.eq("branch_id", args.branch_id).eq("status", SETTLEMENT_STATUS.PENDING)
      )
      .first();

    if (existingPending) {
      throw new ConvexError({
        code: "SETTLEMENT_PENDING",
        message: "Settlement already pending for this branch",
      });
    }

    // Also check for approved/processing settlements (still in progress)
    const existingApproved = await ctx.db
      .query("branchSettlements")
      .withIndex("by_branch_status", (q) =>
        q.eq("branch_id", args.branch_id).eq("status", SETTLEMENT_STATUS.APPROVED)
      )
      .first();

    const existingProcessing = await ctx.db
      .query("branchSettlements")
      .withIndex("by_branch_status", (q) =>
        q.eq("branch_id", args.branch_id).eq("status", SETTLEMENT_STATUS.PROCESSING)
      )
      .first();

    if (existingApproved || existingProcessing) {
      throw new ConvexError({
        code: "SETTLEMENT_IN_PROGRESS",
        message: "A settlement is already being processed for this branch",
      });
    }

    // Step 3: Get pending earnings total
    const pendingEarnings = await ctx.db
      .query("branchWalletEarnings")
      .withIndex("by_branch_status", (q) =>
        q.eq("branch_id", args.branch_id).eq("status", "pending")
      )
      .collect();

    // Calculate totals
    let totalGross = 0;
    let totalCommission = 0;
    let totalNet = 0;

    for (const earning of pendingEarnings) {
      totalGross += earning.gross_amount;
      totalCommission += earning.commission_amount;
      totalNet += earning.net_amount;
    }

    const pendingTotal = {
      count: pendingEarnings.length,
      totalGross,
      totalCommission,
      totalNet,
    };

    // Check if there are any pending earnings
    if (pendingTotal.count === 0) {
      throw new ConvexError({
        code: "NO_PENDING_EARNINGS",
        message: "No pending earnings to settle",
      });
    }

    // Step 4: Validate minimum amount (AC #6)
    const config = await ctx.db.query("walletConfig").first();
    const minAmount = config?.min_settlement_amount ?? 500;

    if (pendingTotal.totalNet < minAmount) {
      throw new ConvexError({
        code: "MINIMUM_NOT_MET",
        message: `Minimum settlement amount is ₱${minAmount.toLocaleString()}`,
      });
    }

    // Step 5: Validate payout details (AC #3)
    const branchSettings = await ctx.db
      .query("branchWalletSettings")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .first();

    if (!branchSettings?.payout_method) {
      throw new ConvexError({
        code: "PAYOUT_DETAILS_MISSING",
        message: "Please configure payout method before requesting settlement",
      });
    }

    if (!branchSettings?.payout_account_number || !branchSettings?.payout_account_name) {
      throw new ConvexError({
        code: "PAYOUT_DETAILS_MISSING",
        message: "Please configure payout account details before requesting settlement",
      });
    }

    if (branchSettings.payout_method === "bank" && !branchSettings.payout_bank_name) {
      throw new ConvexError({
        code: "PAYOUT_DETAILS_MISSING",
        message: "Bank name is required for bank transfer payouts",
      });
    }

    // Step 6: Create settlement record (AC #4)
    const now = Date.now();
    const settlementId = await ctx.db.insert("branchSettlements", {
      branch_id: args.branch_id,
      requested_by: args.requested_by,
      amount: pendingTotal.totalNet,
      earnings_count: pendingTotal.count,
      payout_method: branchSettings.payout_method,
      payout_account_number: branchSettings.payout_account_number,
      payout_account_name: branchSettings.payout_account_name,
      payout_bank_name: branchSettings.payout_bank_name,
      status: SETTLEMENT_STATUS.PENDING,
      created_at: now,
      updated_at: now,
    });

    // Step 7: Link pending earnings to settlement
    // Use the existing linkEarningsToSettlement mutation from branchEarnings
    await ctx.runMutation(api.services.branchEarnings.linkEarningsToSettlement, {
      branch_id: args.branch_id,
      settlement_id: settlementId,
    });

    console.log("[SETTLEMENTS] Settlement requested:", {
      settlementId,
      branch_id: args.branch_id,
      amount: pendingTotal.totalNet,
      earnings_count: pendingTotal.count,
    });

    // Email SA about new settlement request
    try {
      await ctx.scheduler.runAfter(0, api.services.emailNotifications.sendNotificationToRole, {
        notification_type: "settlement_requested",
        role: "super_admin",
        variables: {
          branch_name: branch.name || "Branch",
          amount: `₱${pendingTotal.totalNet.toLocaleString()}`,
          earnings_count: String(pendingTotal.count),
        },
      });
    } catch (e) { console.error("[SETTLEMENTS] Email failed:", e); }

    return {
      settlementId,
      amount: pendingTotal.totalNet,
      earnings_count: pendingTotal.count,
      status: SETTLEMENT_STATUS.PENDING,
    };
  },
});

/**
 * Approve a pending settlement request
 * Story 25.3 AC #1, #2: Confirmation dialog, status change, timestamps
 *
 * @param settlement_id - Settlement to approve
 * @param approved_by - User ID of approver (Super Admin)
 * @param notes - Optional approval notes
 */
export const approveSettlement = mutation({
  args: {
    settlement_id: v.id("branchSettlements"),
    approved_by: v.id("users"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Step 1: Get settlement
    const settlement = await ctx.db.get(args.settlement_id);
    if (!settlement) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Settlement not found",
      });
    }

    // Step 2: State machine validation - only pending can be approved
    if (settlement.status !== SETTLEMENT_STATUS.PENDING) {
      throw new ConvexError({
        code: "INVALID_TRANSITION",
        message: `Cannot approve from ${settlement.status} state`,
      });
    }

    // Step 3: Update settlement status
    const now = Date.now();
    await ctx.db.patch(args.settlement_id, {
      status: SETTLEMENT_STATUS.APPROVED,
      approved_by: args.approved_by,
      approved_at: now,
      notes: args.notes,
      updated_at: now,
    });

    // Step 4: Create notification for branch (using existing notification system)
    // Find branch admin to notify
    const branchAdmins = await ctx.db
      .query("users")
      .withIndex("by_branch_role", (q) =>
        q.eq("branch_id", settlement.branch_id).eq("role", "branch_admin")
      )
      .collect();

    // Create notifications for branch admins
    for (const admin of branchAdmins) {
      await ctx.db.insert("notifications", {
        recipient_id: admin._id,
        recipient_type: "admin",
        title: "Settlement Approved",
        message: `Your settlement request for ₱${settlement.amount.toLocaleString()} has been approved and will be processed shortly.`,
        type: "payment",
        priority: "medium",
        is_read: false,
        is_archived: false,
        branch_id: settlement.branch_id,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Email BA about settlement approval
    try {
      await ctx.scheduler.runAfter(0, api.services.emailNotifications.sendNotificationToRole, {
        notification_type: "settlement_approved",
        role: "branch_admin",
        branch_id: settlement.branch_id,
        variables: {
          amount: `₱${settlement.amount.toLocaleString()}`,
        },
      });
    } catch (e) { console.error("[SETTLEMENTS] Approval email failed:", e); }

    console.log("[SETTLEMENTS] Settlement approved:", {
      settlementId: args.settlement_id,
      approved_by: args.approved_by,
      amount: settlement.amount,
    });

    return {
      success: true,
      settlementId: args.settlement_id,
      status: SETTLEMENT_STATUS.APPROVED,
    };
  },
});

/**
 * Reject a pending settlement request
 * Story 25.3 AC #3, #4: Require reason, release earnings, notify branch
 *
 * @param settlement_id - Settlement to reject
 * @param rejected_by - User ID of rejecter (Super Admin)
 * @param rejection_reason - Required reason for rejection
 */
export const rejectSettlement = mutation({
  args: {
    settlement_id: v.id("branchSettlements"),
    rejected_by: v.id("users"),
    rejection_reason: v.string(),
  },
  handler: async (ctx, args) => {
    // Step 1: Validate rejection reason
    if (!args.rejection_reason.trim()) {
      throw new ConvexError({
        code: "VALIDATION",
        message: "Rejection reason is required",
      });
    }

    // Step 2: Get settlement
    const settlement = await ctx.db.get(args.settlement_id);
    if (!settlement) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Settlement not found",
      });
    }

    // Step 3: State machine validation - only pending can be rejected directly
    // (approved and processing can also be rejected per architecture)
    const allowedStatuses = [
      SETTLEMENT_STATUS.PENDING,
      SETTLEMENT_STATUS.APPROVED,
      SETTLEMENT_STATUS.PROCESSING,
    ];
    if (!allowedStatuses.includes(settlement.status as SettlementStatus)) {
      throw new ConvexError({
        code: "INVALID_TRANSITION",
        message: `Cannot reject from ${settlement.status} state`,
      });
    }

    const now = Date.now();

    // Step 4: Release associated earnings (clear settlement_id, reset to pending)
    const earnings = await ctx.db
      .query("branchWalletEarnings")
      .withIndex("by_settlement", (q) => q.eq("settlement_id", args.settlement_id))
      .collect();

    for (const earning of earnings) {
      await ctx.db.patch(earning._id, {
        settlement_id: undefined,
        status: "pending", // Back to pending, can be included in future settlement
      });
    }

    // Step 5: Update settlement status
    await ctx.db.patch(args.settlement_id, {
      status: SETTLEMENT_STATUS.REJECTED,
      rejected_by: args.rejected_by,
      rejected_at: now,
      rejection_reason: args.rejection_reason,
      updated_at: now,
    });

    // Step 6: Create notification for branch with reason
    // Find branch admin to notify
    const branchAdmins = await ctx.db
      .query("users")
      .withIndex("by_branch_role", (q) =>
        q.eq("branch_id", settlement.branch_id).eq("role", "branch_admin")
      )
      .collect();

    // Create notifications for branch admins
    for (const admin of branchAdmins) {
      await ctx.db.insert("notifications", {
        recipient_id: admin._id,
        recipient_type: "admin",
        title: "Settlement Rejected",
        message: `Your settlement request for ₱${settlement.amount.toLocaleString()} was rejected. Reason: ${args.rejection_reason}`,
        type: "alert",
        priority: "high",
        is_read: false,
        is_archived: false,
        branch_id: settlement.branch_id,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Email BA about settlement rejection (urgent)
    try {
      await ctx.scheduler.runAfter(0, api.services.emailNotifications.sendNotificationToRole, {
        notification_type: "settlement_rejected",
        role: "branch_admin",
        branch_id: settlement.branch_id,
        variables: {
          amount: `₱${settlement.amount.toLocaleString()}`,
          rejection_reason: args.rejection_reason,
        },
      });
    } catch (e) { console.error("[SETTLEMENTS] Rejection email failed:", e); }

    console.log("[SETTLEMENTS] Settlement rejected:", {
      settlementId: args.settlement_id,
      rejected_by: args.rejected_by,
      reason: args.rejection_reason,
      earningsReleased: earnings.length,
    });

    return {
      success: true,
      settlementId: args.settlement_id,
      status: SETTLEMENT_STATUS.REJECTED,
      earningsReleased: earnings.length,
    };
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Check if branch has a pending/in-progress settlement (AC #5)
 *
 * @param branch_id - Branch to check
 * @returns Object with hasPending boolean and settlement details if exists
 */
export const hasPendingSettlement = query({
  args: {
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    // Check for pending settlement
    const pendingSettlement = await ctx.db
      .query("branchSettlements")
      .withIndex("by_branch_status", (q) =>
        q.eq("branch_id", args.branch_id).eq("status", SETTLEMENT_STATUS.PENDING)
      )
      .first();

    if (pendingSettlement) {
      return {
        hasPending: true,
        settlement: {
          _id: pendingSettlement._id,
          status: pendingSettlement.status,
          amount: pendingSettlement.amount,
          earnings_count: pendingSettlement.earnings_count,
          created_at: pendingSettlement.created_at,
        },
      };
    }

    // Also check for approved/processing (in progress)
    const approvedSettlement = await ctx.db
      .query("branchSettlements")
      .withIndex("by_branch_status", (q) =>
        q.eq("branch_id", args.branch_id).eq("status", SETTLEMENT_STATUS.APPROVED)
      )
      .first();

    if (approvedSettlement) {
      return {
        hasPending: true,
        settlement: {
          _id: approvedSettlement._id,
          status: approvedSettlement.status,
          amount: approvedSettlement.amount,
          earnings_count: approvedSettlement.earnings_count,
          created_at: approvedSettlement.created_at,
        },
      };
    }

    const processingSettlement = await ctx.db
      .query("branchSettlements")
      .withIndex("by_branch_status", (q) =>
        q.eq("branch_id", args.branch_id).eq("status", SETTLEMENT_STATUS.PROCESSING)
      )
      .first();

    if (processingSettlement) {
      return {
        hasPending: true,
        settlement: {
          _id: processingSettlement._id,
          status: processingSettlement.status,
          amount: processingSettlement.amount,
          earnings_count: processingSettlement.earnings_count,
          created_at: processingSettlement.created_at,
        },
      };
    }

    return {
      hasPending: false,
      settlement: null,
    };
  },
});

/**
 * Get settlement by ID
 *
 * @param settlement_id - Settlement to retrieve
 */
export const getSettlementById = query({
  args: {
    settlement_id: v.id("branchSettlements"),
  },
  handler: async (ctx, args) => {
    const settlement = await ctx.db.get(args.settlement_id);
    if (!settlement) {
      return null;
    }

    // Enrich with requester info
    const requester = await ctx.db.get(settlement.requested_by);
    const branch = await ctx.db.get(settlement.branch_id);

    return {
      ...settlement,
      requester_name: requester?.name || "Unknown",
      branch_name: branch?.name || "Unknown Branch",
    };
  },
});

/**
 * Get all settlements for a branch
 *
 * @param branch_id - Branch to get settlements for
 * @param limit - Maximum number of records (default 50)
 */
export const getBranchSettlements = query({
  args: {
    branch_id: v.id("branches"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const settlements = await ctx.db
      .query("branchSettlements")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .order("desc")
      .take(limit);

    // Enrich with requester info
    const enriched = await Promise.all(
      settlements.map(async (settlement) => {
        const requester = await ctx.db.get(settlement.requested_by);
        return {
          ...settlement,
          requester_name: requester?.username || "Unknown",
        };
      })
    );

    return enriched;
  },
});

/**
 * Get settlements by status (for SA settlement queue)
 *
 * @param status - Status to filter by
 * @param limit - Maximum number of records (default 50)
 */
export const getSettlementsByStatus = query({
  args: {
    status: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const settlements = await ctx.db
      .query("branchSettlements")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .order("desc")
      .take(limit);

    // Enrich with branch and requester info
    const enriched = await Promise.all(
      settlements.map(async (settlement) => {
        const branch = await ctx.db.get(settlement.branch_id);
        const requester = await ctx.db.get(settlement.requested_by);
        return {
          ...settlement,
          branch_name: branch?.name || "Unknown Branch",
          requester_name: requester?.username || "Unknown",
        };
      })
    );

    return enriched;
  },
});

/**
 * Get all settlements with optional status filter (Super Admin)
 * Story 25.2 AC #1, #2: List with tabs for different statuses
 *
 * @param status - Optional status filter
 * @param limit - Maximum number of records (default 100)
 */
export const getAllSettlements = query({
  args: {
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    let settlements;
    if (args.status) {
      settlements = await ctx.db
        .query("branchSettlements")
        .withIndex("by_status", (q) => q.eq("status", args.status))
        .order("desc")
        .take(limit);
    } else {
      settlements = await ctx.db
        .query("branchSettlements")
        .order("desc")
        .take(limit);
    }

    // Enrich with branch and requester info
    const enriched = await Promise.all(
      settlements.map(async (settlement) => {
        const branch = await ctx.db.get(settlement.branch_id);
        const requester = await ctx.db.get(settlement.requested_by);
        return {
          ...settlement,
          branch_name: branch?.name || "Unknown Branch",
          requester_name: requester?.username || "Unknown",
        };
      })
    );

    return enriched;
  },
});

/**
 * Get settlement with all linked earnings (for detail view)
 * Story 25.2 AC #3: Show list of all transactions included
 *
 * @param settlement_id - Settlement to retrieve with earnings
 */
export const getSettlementWithEarnings = query({
  args: {
    settlement_id: v.id("branchSettlements"),
  },
  handler: async (ctx, args) => {
    // Get settlement
    const settlement = await ctx.db.get(args.settlement_id);
    if (!settlement) return null;

    // Enrich with branch and requester
    const branch = await ctx.db.get(settlement.branch_id);
    const requester = await ctx.db.get(settlement.requested_by);

    // Enrich with approver, processor, completer, rejecter names for timeline (Story 25.5)
    let approver_name = null;
    let processor_name = null;
    let completer_name = null;
    let rejecter_name = null;

    if (settlement.approved_by) {
      const approver = await ctx.db.get(settlement.approved_by);
      approver_name = approver?.username || "Admin";
    }
    if (settlement.processed_by) {
      const processor = await ctx.db.get(settlement.processed_by);
      processor_name = processor?.username || "Admin";
    }
    if (settlement.completed_by) {
      const completer = await ctx.db.get(settlement.completed_by);
      completer_name = completer?.username || "Admin";
    }
    if (settlement.rejected_by) {
      const rejecter = await ctx.db.get(settlement.rejected_by);
      rejecter_name = rejecter?.username || "Admin";
    }

    // Get linked earnings
    const earnings = await ctx.db
      .query("branchWalletEarnings")
      .withIndex("by_settlement", (q) => q.eq("settlement_id", args.settlement_id))
      .collect();

    // Calculate totals from linked earnings
    let totalGross = 0;
    let totalCommission = 0;
    let totalNet = 0;

    // Get customer names for each earning and calculate totals
    const enrichedEarnings = await Promise.all(
      earnings.map(async (earning) => {
        const customer = await ctx.db.get(earning.customer_id);
        totalGross += earning.gross_amount;
        totalCommission += earning.commission_amount;
        totalNet += earning.net_amount;
        return {
          ...earning,
          customer_name: customer?.username || "Guest",
        };
      })
    );

    return {
      ...settlement,
      branch_name: branch?.name || "Unknown Branch",
      branch_address: branch?.address || "",
      requester_name: requester?.username || "Unknown",
      approver_name,
      processor_name,
      completer_name,
      rejecter_name,
      payout_details: {
        method: settlement.payout_method,
        account_number: settlement.payout_account_number,
        account_name: settlement.payout_account_name,
        bank_name: settlement.payout_bank_name,
      },
      breakdown: {
        gross: totalGross,
        commission: totalCommission,
        net: totalNet,
      },
      earnings: enrichedEarnings,
    };
  },
});

/**
 * Get settlement summary for dashboard
 * Returns counts by status for quick overview
 */
export const getSettlementSummary = query({
  args: {},
  handler: async (ctx) => {
    const allSettlements = await ctx.db.query("branchSettlements").collect();

    const summary = {
      pending: 0,
      approved: 0,
      processing: 0,
      completed: 0,
      rejected: 0,
      total: allSettlements.length,
      totalPendingAmount: 0,
    };

    for (const settlement of allSettlements) {
      switch (settlement.status) {
        case SETTLEMENT_STATUS.PENDING:
          summary.pending++;
          summary.totalPendingAmount += settlement.amount;
          break;
        case SETTLEMENT_STATUS.APPROVED:
          summary.approved++;
          summary.totalPendingAmount += settlement.amount;
          break;
        case SETTLEMENT_STATUS.PROCESSING:
          summary.processing++;
          summary.totalPendingAmount += settlement.amount;
          break;
        case SETTLEMENT_STATUS.COMPLETED:
          summary.completed++;
          break;
        case SETTLEMENT_STATUS.REJECTED:
          summary.rejected++;
          break;
      }
    }

    return summary;
  },
});

/**
 * Mark an approved settlement as processing (transfer initiated)
 * Story 25.4 AC #1: Status change from approved to processing
 *
 * @param settlement_id - Settlement to mark as processing
 * @param processed_by - User ID of processor (Super Admin)
 */
export const markAsProcessing = mutation({
  args: {
    settlement_id: v.id("branchSettlements"),
    processed_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Step 1: Get settlement
    const settlement = await ctx.db.get(args.settlement_id);
    if (!settlement) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Settlement not found",
      });
    }

    // Step 2: State machine validation - only approved can be marked as processing
    if (settlement.status !== SETTLEMENT_STATUS.APPROVED) {
      throw new ConvexError({
        code: "INVALID_TRANSITION",
        message: `Cannot process from ${settlement.status} state`,
      });
    }

    // Step 3: Update settlement status
    const now = Date.now();
    await ctx.db.patch(args.settlement_id, {
      status: SETTLEMENT_STATUS.PROCESSING,
      processed_by: args.processed_by,
      processing_started_at: now,
      updated_at: now,
    });

    // Step 4: Create notification for branch admins
    const branchAdmins = await ctx.db
      .query("users")
      .withIndex("by_branch_role", (q) =>
        q.eq("branch_id", settlement.branch_id).eq("role", "branch_admin")
      )
      .collect();

    for (const admin of branchAdmins) {
      await ctx.db.insert("notifications", {
        recipient_id: admin._id,
        recipient_type: "admin",
        title: "Settlement Processing",
        message: `Your settlement of ₱${settlement.amount.toLocaleString()} is now being processed. Transfer will be completed shortly.`,
        type: "payment",
        priority: "medium",
        is_read: false,
        is_archived: false,
        branch_id: settlement.branch_id,
        createdAt: now,
        updatedAt: now,
      });
    }

    console.log("[SETTLEMENTS] Settlement marked as processing:", {
      settlementId: args.settlement_id,
      processed_by: args.processed_by,
      amount: settlement.amount,
    });

    return {
      success: true,
      settlementId: args.settlement_id,
      status: SETTLEMENT_STATUS.PROCESSING,
    };
  },
});

/**
 * Complete a settlement transfer
 * Story 25.4 AC #2, #3: Require transfer reference, update earnings, notify branch
 *
 * @param settlement_id - Settlement to complete
 * @param completed_by - User ID of completer (Super Admin)
 * @param transfer_reference - Bank transfer reference number
 */
export const completeSettlement = mutation({
  args: {
    settlement_id: v.id("branchSettlements"),
    completed_by: v.id("users"),
    transfer_reference: v.string(),
  },
  handler: async (ctx, args) => {
    // Step 1: Validate transfer reference
    if (!args.transfer_reference.trim()) {
      throw new ConvexError({
        code: "VALIDATION",
        message: "Transfer reference is required",
      });
    }

    // Step 2: Get settlement
    const settlement = await ctx.db.get(args.settlement_id);
    if (!settlement) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Settlement not found",
      });
    }

    // Step 3: State machine validation - only processing can be completed
    if (settlement.status !== SETTLEMENT_STATUS.PROCESSING) {
      throw new ConvexError({
        code: "INVALID_TRANSITION",
        message: `Cannot complete from ${settlement.status} state`,
      });
    }

    const now = Date.now();

    // Step 4: Update all linked earnings to "settled"
    const earnings = await ctx.db
      .query("branchWalletEarnings")
      .withIndex("by_settlement", (q) => q.eq("settlement_id", args.settlement_id))
      .collect();

    for (const earning of earnings) {
      await ctx.db.patch(earning._id, {
        status: "settled",
      });
    }

    // Step 4b: Record commission as SA income
    const totalCommission = earnings.reduce(
      (sum, e) => sum + (e.commission_amount || 0), 0
    );

    if (totalCommission > 0) {
      const branch = await ctx.db.get(settlement.branch_id);
      await ctx.db.insert("superAdminRevenue", {
        category: "commission_income",
        description: `Settlement commission from ${branch?.name || "branch"}`,
        amount: totalCommission,
        revenue_date: now,
        reference_id: args.transfer_reference.trim(),
        settlement_id: args.settlement_id,
        notes: `${earnings.length} earnings settled`,
        is_automated: true,
        received_to_sales_cash: true,
        created_by: args.completed_by,
        created_at: now,
        updated_at: now,
      });
    }

    // Step 5: Update settlement status
    await ctx.db.patch(args.settlement_id, {
      status: SETTLEMENT_STATUS.COMPLETED,
      completed_by: args.completed_by,
      completed_at: now,
      transfer_reference: args.transfer_reference.trim(),
      updated_at: now,
    });

    // Step 6: Create notification for branch admins
    const branchAdmins = await ctx.db
      .query("users")
      .withIndex("by_branch_role", (q) =>
        q.eq("branch_id", settlement.branch_id).eq("role", "branch_admin")
      )
      .collect();

    for (const admin of branchAdmins) {
      await ctx.db.insert("notifications", {
        recipient_id: admin._id,
        recipient_type: "admin",
        title: "Settlement Completed",
        message: `Your settlement of ₱${settlement.amount.toLocaleString()} has been transferred. Reference: ${args.transfer_reference.trim()}`,
        type: "payment",
        priority: "medium",
        is_read: false,
        is_archived: false,
        branch_id: settlement.branch_id,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Email SA + BA about settlement completion
    try {
      const settlementBranch = await ctx.db.get(settlement.branch_id);
      await ctx.scheduler.runAfter(0, api.services.emailNotifications.sendNotificationToRole, {
        notification_type: "settlement_completed",
        role: "super_admin",
        variables: {
          branch_name: settlementBranch?.name || "Branch",
          amount: `₱${settlement.amount.toLocaleString()}`,
          transfer_reference: args.transfer_reference.trim(),
        },
      });
      await ctx.scheduler.runAfter(0, api.services.emailNotifications.sendNotificationToRole, {
        notification_type: "settlement_completed",
        role: "branch_admin",
        branch_id: settlement.branch_id,
        variables: {
          amount: `₱${settlement.amount.toLocaleString()}`,
          transfer_reference: args.transfer_reference.trim(),
        },
      });
    } catch (e) { console.error("[SETTLEMENTS] Completion email failed:", e); }

    console.log("[SETTLEMENTS] Settlement completed:", {
      settlementId: args.settlement_id,
      completed_by: args.completed_by,
      amount: settlement.amount,
      transfer_reference: args.transfer_reference.trim(),
      earningsSettled: earnings.length,
    });

    return {
      success: true,
      settlementId: args.settlement_id,
      status: SETTLEMENT_STATUS.COMPLETED,
      earningsSettled: earnings.length,
    };
  },
});

/**
 * Get branch settlement history with filters
 * Story 25.5 AC #1, #2, #3: List settlements with date/status filters
 *
 * @param branch_id - Branch to get settlements for
 * @param status - Optional status filter
 * @param startDate - Optional start date (unix timestamp)
 * @param endDate - Optional end date (unix timestamp)
 * @param limit - Maximum number of records (default 50)
 */
export const getBranchSettlementHistory = query({
  args: {
    branch_id: v.id("branches"),
    status: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    let settlements;

    // Use appropriate index based on filters
    if (args.status) {
      // Filter by branch and status
      settlements = await ctx.db
        .query("branchSettlements")
        .withIndex("by_branch_status", (q) =>
          q.eq("branch_id", args.branch_id).eq("status", args.status)
        )
        .order("desc")
        .collect();
    } else {
      // Filter by branch only
      settlements = await ctx.db
        .query("branchSettlements")
        .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
        .order("desc")
        .collect();
    }

    // Apply date filters if provided
    if (args.startDate || args.endDate) {
      settlements = settlements.filter((s) => {
        const date = s.created_at;
        if (args.startDate && date < args.startDate) return false;
        if (args.endDate && date > args.endDate) return false;
        return true;
      });
    }

    // Apply limit after filtering
    settlements = settlements.slice(0, limit);

    // Enrich with requester info and approver info
    const enriched = await Promise.all(
      settlements.map(async (settlement) => {
        const requester = await ctx.db.get(settlement.requested_by);
        let approverName = null;
        let completedByName = null;
        let rejectedByName = null;

        if (settlement.approved_by) {
          const approver = await ctx.db.get(settlement.approved_by);
          approverName = approver?.username || "Unknown";
        }

        if (settlement.completed_by) {
          const completer = await ctx.db.get(settlement.completed_by);
          completedByName = completer?.username || "Unknown";
        }

        if (settlement.rejected_by) {
          const rejecter = await ctx.db.get(settlement.rejected_by);
          rejectedByName = rejecter?.username || "Unknown";
        }

        return {
          ...settlement,
          requester_name: requester?.username || "Unknown",
          approver_name: approverName,
          completed_by_name: completedByName,
          rejected_by_name: rejectedByName,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get pending earnings breakdown by payment source
 * Returns totals split between online (PayMongo) and wallet payments
 * Used in the settlement queue header for source visibility
 */
export const getPendingEarningsSourceSummary = query({
  args: {},
  handler: async (ctx) => {
    const pendingEarnings = await ctx.db
      .query("branchWalletEarnings")
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    let onlineTotal = 0;
    let walletTotal = 0;
    let onlineCount = 0;
    let walletCount = 0;

    for (const earning of pendingEarnings) {
      if (earning.payment_source === "online_paymongo") {
        onlineTotal += earning.net_amount;
        onlineCount++;
      } else {
        // Default to wallet for existing records without payment_source
        walletTotal += earning.net_amount;
        walletCount++;
      }
    }

    return {
      online: { total: onlineTotal, count: onlineCount },
      wallet: { total: walletTotal, count: walletCount },
      combined: { total: onlineTotal + walletTotal, count: onlineCount + walletCount },
    };
  },
});

// ============================================================================
// STATE MACHINE HELPERS
// ============================================================================

/**
 * Validate if a status transition is allowed
 *
 * @param currentStatus - Current settlement status
 * @param newStatus - Target status
 * @returns Boolean indicating if transition is valid
 */
export function isValidTransition(
  currentStatus: SettlementStatus,
  newStatus: SettlementStatus
): boolean {
  const allowedTransitions = SETTLEMENT_TRANSITIONS[currentStatus];
  return allowedTransitions.includes(newStatus);
}
