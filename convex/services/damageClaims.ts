/**
 * Damage Claims Service
 *
 * Manages damage reports for product orders after branch receipt.
 * Flow:
 * 1. Branch admin receives order and finds damaged items
 * 2. Files a damage claim with affected items, quantities, and description
 * 3. Super admin reviews claim (approve or reject)
 * 4. On approval: wallet credit issued, branch inventory adjusted
 *
 * @module convex/services/damageClaims
 */

import { mutation, query } from "../_generated/server";
import { v, ConvexError } from "convex/values";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get damage claims for a specific branch
 */
export const getClaimsByBranch = query({
  args: {
    branch_id: v.id("branches"),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected")
      )
    ),
  },
  handler: async (ctx, args) => {
    let claims = await ctx.db
      .query("damage_claims")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .order("desc")
      .collect();

    if (args.status) {
      claims = claims.filter((c) => c.status === args.status);
    }

    return claims;
  },
});

/**
 * Get all damage claims (for super admin)
 */
export const getAllClaims = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected")
      )
    ),
  },
  handler: async (ctx, args) => {
    let claims;
    if (args.status) {
      claims = await ctx.db
        .query("damage_claims")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    } else {
      claims = await ctx.db
        .query("damage_claims")
        .withIndex("by_submitted_at")
        .order("desc")
        .collect();
    }

    // Enrich with branch info
    const enriched = await Promise.all(
      claims.map(async (claim) => {
        const branch = await ctx.db.get(claim.branch_id);
        const submittedBy = await ctx.db.get(claim.submitted_by);
        const reviewedBy = claim.reviewed_by
          ? await ctx.db.get(claim.reviewed_by)
          : null;

        return {
          ...claim,
          branch_name: branch?.name || "Unknown Branch",
          submitted_by_name: submittedBy?.username || "Unknown",
          reviewed_by_name: reviewedBy?.username,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get damage claims for a specific order
 */
export const getClaimsByOrder = query({
  args: {
    order_id: v.id("productOrders"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("damage_claims")
      .withIndex("by_order", (q) => q.eq("order_id", args.order_id))
      .order("desc")
      .collect();
  },
});

/**
 * Get pending claims count (for badge display)
 */
export const getPendingClaimsCount = query({
  args: {},
  handler: async (ctx) => {
    const claims = await ctx.db
      .query("damage_claims")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    return claims.length;
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Submit a damage claim for a received order
 */
export const submitDamageClaim = mutation({
  args: {
    order_id: v.id("productOrders"),
    items: v.array(
      v.object({
        catalog_product_id: v.id("productCatalog"),
        quantity_damaged: v.number(),
        damage_reason: v.union(
          v.literal("packaging"),
          v.literal("defect"),
          v.literal("shipping"),
          v.literal("expired"),
          v.literal("wrong_item"),
          v.literal("other")
        ),
        reason_note: v.optional(v.string()),
      })
    ),
    description: v.string(),
    images: v.optional(v.array(v.id("_storage"))),
    submitted_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Validate order exists and is received
    const order = await ctx.db.get(args.order_id);
    if (!order) {
      throw new ConvexError({
        code: "ORDER_NOT_FOUND",
        message: "Order not found",
      });
    }

    if (order.status !== "received") {
      throw new ConvexError({
        code: "INVALID_STATUS",
        message: "Damage claims can only be filed for received orders",
      });
    }

    // Check no existing pending/approved claim for this order
    const existingClaims = await ctx.db
      .query("damage_claims")
      .withIndex("by_order", (q) => q.eq("order_id", args.order_id))
      .collect();

    const activeClaim = existingClaims.find(
      (c) => c.status === "pending" || c.status === "approved"
    );
    if (activeClaim) {
      throw new ConvexError({
        code: "CLAIM_EXISTS",
        message: "A damage claim already exists for this order",
      });
    }

    // Validate items and calculate damage amount
    let totalDamageAmount = 0;
    const claimItems = [];

    for (const item of args.items) {
      if (item.quantity_damaged <= 0) {
        throw new ConvexError({
          code: "INVALID_QUANTITY",
          message: "Damaged quantity must be greater than 0",
        });
      }

      // Find matching order item
      const orderItem = order.items.find(
        (oi) => oi.catalog_product_id === item.catalog_product_id
      );
      if (!orderItem) {
        throw new ConvexError({
          code: "ITEM_NOT_IN_ORDER",
          message: "Damaged item not found in original order",
        });
      }

      const receivedQty = orderItem.quantity_approved ?? orderItem.quantity_requested;
      if (item.quantity_damaged > receivedQty) {
        throw new ConvexError({
          code: "EXCEEDS_RECEIVED",
          message: `Cannot claim more damage (${item.quantity_damaged}) than received (${receivedQty}) for ${orderItem.product_name}`,
        });
      }

      const itemDamage = item.quantity_damaged * orderItem.unit_price;
      totalDamageAmount += itemDamage;

      claimItems.push({
        catalog_product_id: item.catalog_product_id,
        product_name: orderItem.product_name,
        quantity_damaged: item.quantity_damaged,
        unit_price: orderItem.unit_price,
        damage_reason: item.damage_reason,
        reason_note: item.reason_note?.trim(),
      });
    }

    const now = Date.now();
    const claimId = await ctx.db.insert("damage_claims", {
      order_id: args.order_id,
      order_number: order.order_number,
      branch_id: order.branch_id,
      items: claimItems,
      total_damage_amount: totalDamageAmount,
      description: args.description.trim(),
      images: args.images,
      status: "pending",
      submitted_by: args.submitted_by,
      submitted_at: now,
    });

    // Create notification for super admin
    await ctx.db.insert("notifications", {
      title: "New Damage Claim",
      message: `Damage claim filed for order ${order.order_number} — ₱${totalDamageAmount.toLocaleString()}`,
      type: "alert" as const,
      priority: "high" as const,
      recipient_type: "admin" as const,
      is_read: false,
      is_archived: false,
      action_label: "Review Claim",
      metadata: {
        claim_id: claimId,
        order_number: order.order_number,
        damage_amount: totalDamageAmount,
      },
      createdAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      claimId,
      totalDamageAmount,
    };
  },
});

/**
 * Approve a damage claim — issues wallet credit and adjusts branch inventory
 */
export const approveDamageClaim = mutation({
  args: {
    claim_id: v.id("damage_claims"),
    approved_by: v.id("users"),
    credit_amount: v.optional(v.number()), // Override amount (partial credit)
  },
  handler: async (ctx, args) => {
    const claim = await ctx.db.get(args.claim_id);
    if (!claim) {
      throw new ConvexError({
        code: "CLAIM_NOT_FOUND",
        message: "Damage claim not found",
      });
    }

    if (claim.status !== "pending") {
      throw new ConvexError({
        code: "INVALID_STATUS",
        message: `Cannot approve claim with status: ${claim.status}`,
      });
    }

    const creditAmount = args.credit_amount ?? claim.total_damage_amount;
    if (creditAmount <= 0) {
      throw new ConvexError({
        code: "INVALID_AMOUNT",
        message: "Credit amount must be greater than 0",
      });
    }

    const now = Date.now();

    // Issue wallet credit
    const wallet = await ctx.db
      .query("branch_wallets")
      .withIndex("by_branch", (q) => q.eq("branch_id", claim.branch_id))
      .first();

    let walletTxnId: string | undefined;

    if (wallet) {
      const newBalance = wallet.balance + creditAmount;
      await ctx.db.patch(wallet._id, {
        balance: newBalance,
        updatedAt: now,
      });

      const txnId = await ctx.db.insert("branch_wallet_transactions", {
        branch_id: claim.branch_id,
        wallet_id: wallet._id,
        type: "credit",
        amount: creditAmount,
        balance_after: newBalance,
        held_balance_after: wallet.held_balance,
        reference_type: "damage_claim",
        reference_id: claim.order_number,
        description: `Damage credit for order ${claim.order_number}`,
        created_by: args.approved_by,
        createdAt: now,
      });
      walletTxnId = txnId;
    }

    // Adjust branch inventory — subtract damaged quantities
    for (const item of claim.items) {
      const branchProducts = await ctx.db
        .query("products")
        .withIndex("by_branch", (q) => q.eq("branch_id", claim.branch_id))
        .collect();

      const branchProduct = branchProducts.find(
        (p) => p.name === item.product_name
      );

      if (branchProduct) {
        const newStock = Math.max(0, branchProduct.stock - item.quantity_damaged);
        await ctx.db.patch(branchProduct._id, {
          stock: newStock,
          updatedAt: now,
        });
      }
    }

    // Update claim status
    await ctx.db.patch(args.claim_id, {
      status: "approved",
      reviewed_by: args.approved_by,
      reviewed_at: now,
      credit_amount: creditAmount,
      wallet_transaction_id: walletTxnId,
    });

    // Notify branch admin
    await ctx.db.insert("notifications", {
      title: "Damage Claim Approved",
      message: `Your damage claim for order ${claim.order_number} has been approved. ₱${creditAmount.toLocaleString()} credited to your wallet.`,
      type: "payment" as const,
      priority: "medium" as const,
      recipient_type: "admin" as const,
      branch_id: claim.branch_id,
      is_read: false,
      is_archived: false,
      metadata: {
        claim_id: args.claim_id,
        order_number: claim.order_number,
        credit_amount: creditAmount,
      },
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, creditAmount };
  },
});

/**
 * Reject a damage claim
 */
export const rejectDamageClaim = mutation({
  args: {
    claim_id: v.id("damage_claims"),
    rejected_by: v.id("users"),
    rejection_reason: v.string(),
  },
  handler: async (ctx, args) => {
    const claim = await ctx.db.get(args.claim_id);
    if (!claim) {
      throw new ConvexError({
        code: "CLAIM_NOT_FOUND",
        message: "Damage claim not found",
      });
    }

    if (claim.status !== "pending") {
      throw new ConvexError({
        code: "INVALID_STATUS",
        message: `Cannot reject claim with status: ${claim.status}`,
      });
    }

    const now = Date.now();

    await ctx.db.patch(args.claim_id, {
      status: "rejected",
      reviewed_by: args.rejected_by,
      reviewed_at: now,
      rejection_reason: args.rejection_reason.trim(),
    });

    // Notify branch admin
    await ctx.db.insert("notifications", {
      title: "Damage Claim Rejected",
      message: `Your damage claim for order ${claim.order_number} was rejected. Reason: ${args.rejection_reason.trim()}`,
      type: "alert" as const,
      priority: "medium" as const,
      recipient_type: "admin" as const,
      branch_id: claim.branch_id,
      is_read: false,
      is_archived: false,
      metadata: {
        claim_id: args.claim_id,
        order_number: claim.order_number,
        rejection_reason: args.rejection_reason.trim(),
      },
      createdAt: now,
      updatedAt: now,
    });

    return { success: true };
  },
});
