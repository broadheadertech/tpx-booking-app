import { v, ConvexError } from "convex/values";
import { query, mutation } from "../_generated/server";

/**
 * Generate order number: PO-YYYY-XXXXX
 */
function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const randomPart = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0");
  return `PO-${year}-${randomPart}`;
}

/**
 * Create a new product order from branch to central warehouse
 */
export const createOrder = mutation({
  args: {
    branch_id: v.id("branches"),
    requested_by: v.id("users"),
    items: v.array(
      v.object({
        catalog_product_id: v.id("productCatalog"),
        quantity_requested: v.number(),
      })
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.items.length === 0) {
      throw new ConvexError({
        code: "EMPTY_ORDER",
        message: "Order must have at least one item",
      });
    }

    // Validate branch exists
    const branch = await ctx.db.get(args.branch_id);
    if (!branch) {
      throw new ConvexError({
        code: "BRANCH_NOT_FOUND",
        message: "Branch not found",
      });
    }

    // Validate user exists
    const user = await ctx.db.get(args.requested_by);
    if (!user) {
      throw new ConvexError({
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
    }

    // Build order items with product details
    let totalAmount = 0;
    const orderItems = [];

    for (const item of args.items) {
      if (item.quantity_requested <= 0) {
        throw new ConvexError({
          code: "INVALID_QUANTITY",
          message: "Quantity must be greater than 0",
        });
      }

      const product = await ctx.db.get(item.catalog_product_id);
      if (!product || !product.is_active) {
        throw new ConvexError({
          code: "PRODUCT_NOT_FOUND",
          message: `Product not found or inactive`,
        });
      }

      const itemTotal = product.price * item.quantity_requested;
      totalAmount += itemTotal;

      orderItems.push({
        catalog_product_id: item.catalog_product_id,
        product_name: product.name,
        quantity_requested: item.quantity_requested,
        quantity_approved: undefined,
        unit_price: product.price,
      });
    }

    const now = Date.now();
    const orderNumber = generateOrderNumber();

    const orderId = await ctx.db.insert("productOrders", {
      order_number: orderNumber,
      branch_id: args.branch_id,
      requested_by: args.requested_by,
      status: "pending",
      items: orderItems,
      total_amount: totalAmount,
      notes: args.notes?.trim(),
      rejection_reason: undefined,
      created_at: now,
      approved_at: undefined,
      approved_by: undefined,
      shipped_at: undefined,
      received_at: undefined,
    });

    return {
      success: true,
      orderId,
      orderNumber,
      totalAmount,
    };
  },
});

/**
 * Approve an order - super admin approves branch request
 */
export const approveOrder = mutation({
  args: {
    order_id: v.id("productOrders"),
    approved_by: v.id("users"),
    items: v.optional(
      v.array(
        v.object({
          catalog_product_id: v.id("productCatalog"),
          quantity_approved: v.number(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.order_id);
    if (!order) {
      throw new ConvexError({
        code: "ORDER_NOT_FOUND",
        message: "Order not found",
      });
    }

    if (order.status !== "pending") {
      throw new ConvexError({
        code: "INVALID_STATUS",
        message: `Cannot approve order with status: ${order.status}`,
      });
    }

    // Update approved quantities if provided
    let updatedItems = order.items;
    if (args.items) {
      updatedItems = order.items.map((item) => {
        const approvedItem = args.items?.find(
          (a) => a.catalog_product_id === item.catalog_product_id
        );
        return {
          ...item,
          quantity_approved: approvedItem?.quantity_approved ?? item.quantity_requested,
        };
      });
    } else {
      // Approve all requested quantities
      updatedItems = order.items.map((item) => ({
        ...item,
        quantity_approved: item.quantity_requested,
      }));
    }

    // Recalculate total based on approved quantities
    const newTotal = updatedItems.reduce(
      (sum, item) => sum + item.unit_price * (item.quantity_approved ?? 0),
      0
    );

    const now = Date.now();
    await ctx.db.patch(args.order_id, {
      status: "approved",
      items: updatedItems,
      total_amount: newTotal,
      approved_at: now,
      approved_by: args.approved_by,
    });

    return { success: true };
  },
});

/**
 * Reject an order with reason
 */
export const rejectOrder = mutation({
  args: {
    order_id: v.id("productOrders"),
    rejected_by: v.id("users"),
    rejection_reason: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.order_id);
    if (!order) {
      throw new ConvexError({
        code: "ORDER_NOT_FOUND",
        message: "Order not found",
      });
    }

    if (order.status !== "pending") {
      throw new ConvexError({
        code: "INVALID_STATUS",
        message: `Cannot reject order with status: ${order.status}`,
      });
    }

    await ctx.db.patch(args.order_id, {
      status: "rejected",
      rejection_reason: args.rejection_reason.trim(),
      approved_by: args.rejected_by, // Using approved_by to track who handled it
      approved_at: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Ship an order - deduct from central warehouse, create branch batches
 */
export const shipOrder = mutation({
  args: {
    order_id: v.id("productOrders"),
    shipped_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.order_id);
    if (!order) {
      throw new ConvexError({
        code: "ORDER_NOT_FOUND",
        message: "Order not found",
      });
    }

    if (order.status !== "approved") {
      throw new ConvexError({
        code: "INVALID_STATUS",
        message: `Cannot ship order with status: ${order.status}`,
      });
    }

    // Check stock availability and deduct from central warehouse
    for (const item of order.items) {
      const product = await ctx.db.get(item.catalog_product_id);
      if (!product) {
        throw new ConvexError({
          code: "PRODUCT_NOT_FOUND",
          message: `Product ${item.product_name} not found`,
        });
      }

      const quantityToShip = item.quantity_approved ?? item.quantity_requested;
      if (product.stock < quantityToShip) {
        throw new ConvexError({
          code: "INSUFFICIENT_STOCK",
          message: `Insufficient stock for ${item.product_name}. Available: ${product.stock}, Needed: ${quantityToShip}`,
        });
      }

      // Deduct stock from central warehouse using FIFO
      const batches = await ctx.db
        .query("inventoryBatches")
        .withIndex("by_product", (q) => q.eq("product_id", item.catalog_product_id))
        .filter((q) => q.gt(q.field("quantity"), 0))
        .collect();

      // Sort by received_at ascending (oldest first)
      batches.sort((a, b) => a.received_at - b.received_at);

      let remaining = quantityToShip;
      for (const batch of batches) {
        if (remaining <= 0) break;
        const take = Math.min(batch.quantity, remaining);
        await ctx.db.patch(batch._id, { quantity: batch.quantity - take });
        remaining -= take;
      }

      // Update product stock
      await ctx.db.patch(item.catalog_product_id, {
        stock: product.stock - quantityToShip,
      });
    }

    const now = Date.now();
    await ctx.db.patch(args.order_id, {
      status: "shipped",
      shipped_at: now,
    });

    return { success: true };
  },
});

/**
 * Receive order - branch confirms receipt
 */
export const receiveOrder = mutation({
  args: {
    order_id: v.id("productOrders"),
    received_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.order_id);
    if (!order) {
      throw new ConvexError({
        code: "ORDER_NOT_FOUND",
        message: "Order not found",
      });
    }

    if (order.status !== "shipped") {
      throw new ConvexError({
        code: "INVALID_STATUS",
        message: `Cannot receive order with status: ${order.status}`,
      });
    }

    const now = Date.now();

    // Create inventory batches for the branch
    for (const item of order.items) {
      const quantityReceived = item.quantity_approved ?? item.quantity_requested;

      // Check if branch already has this product
      const existingProducts = await ctx.db
        .query("products")
        .withIndex("by_branch", (q) => q.eq("branch_id", order.branch_id))
        .collect();

      // Find matching product by name (since branch products have different IDs)
      const catalogProduct = await ctx.db.get(item.catalog_product_id);
      const existingProduct = existingProducts.find(
        (p) => p.name === item.product_name
      );

      if (existingProduct) {
        // Update existing product stock
        await ctx.db.patch(existingProduct._id, {
          stock: existingProduct.stock + quantityReceived,
          updatedAt: now,
        });

        // Create batch for FIFO tracking
        const batchNumber = `BATCH-${new Date().getFullYear()}-${Math.floor(
          Math.random() * 100000
        )
          .toString()
          .padStart(5, "0")}`;

        await ctx.db.insert("inventoryBatches", {
          product_id: existingProduct._id,
          product_type: "branch",
          branch_id: order.branch_id,
          batch_number: batchNumber,
          quantity: quantityReceived,
          initial_quantity: quantityReceived,
          received_at: now,
          expiry_date: undefined,
          cost_per_unit: catalogProduct?.cost,
          supplier: "Central Warehouse",
          notes: `From order ${order.order_number}`,
          created_by: args.received_by,
          created_at: now,
        });
      }
      // If product doesn't exist in branch, they need to create it first
      // This is a design decision - branches manage their own product catalog
    }

    await ctx.db.patch(args.order_id, {
      status: "received",
      received_at: now,
    });

    return { success: true };
  },
});

/**
 * Cancel an order (only pending orders can be cancelled)
 */
export const cancelOrder = mutation({
  args: {
    order_id: v.id("productOrders"),
    cancelled_by: v.id("users"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.order_id);
    if (!order) {
      throw new ConvexError({
        code: "ORDER_NOT_FOUND",
        message: "Order not found",
      });
    }

    if (order.status !== "pending") {
      throw new ConvexError({
        code: "INVALID_STATUS",
        message: `Cannot cancel order with status: ${order.status}`,
      });
    }

    await ctx.db.patch(args.order_id, {
      status: "cancelled",
      rejection_reason: args.reason?.trim() || "Cancelled by user",
    });

    return { success: true };
  },
});

/**
 * Get all orders (for super admin)
 */
export const getAllOrders = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("shipped"),
        v.literal("received"),
        v.literal("rejected"),
        v.literal("cancelled")
      )
    ),
  },
  handler: async (ctx, args) => {
    let orders;
    if (args.status) {
      orders = await ctx.db
        .query("productOrders")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    } else {
      orders = await ctx.db
        .query("productOrders")
        .withIndex("by_created_at")
        .order("desc")
        .collect();
    }

    // Enrich with branch and user details
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        const branch = await ctx.db.get(order.branch_id);
        const requestedBy = await ctx.db.get(order.requested_by);
        const approvedBy = order.approved_by
          ? await ctx.db.get(order.approved_by)
          : null;

        const paidBy = order.paid_by ? await ctx.db.get(order.paid_by) : null;

        return {
          ...order,
          branch_name: branch?.name || "Unknown Branch",
          branch_code: branch?.branch_code,
          requested_by_name: requestedBy?.username || "Unknown User",
          approved_by_name: approvedBy?.username,
          paid_by_name: paidBy?.username,
          is_manual_order: order.is_manual_order || false,
        };
      })
    );

    return enrichedOrders;
  },
});

/**
 * Get orders by branch
 */
export const getOrdersByBranch = query({
  args: {
    branch_id: v.id("branches"),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("shipped"),
        v.literal("received"),
        v.literal("rejected"),
        v.literal("cancelled")
      )
    ),
  },
  handler: async (ctx, args) => {
    let orders = await ctx.db
      .query("productOrders")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .order("desc")
      .collect();

    if (args.status) {
      orders = orders.filter((o) => o.status === args.status);
    }

    // Enrich with user details
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        const requestedBy = await ctx.db.get(order.requested_by);
        const approvedBy = order.approved_by
          ? await ctx.db.get(order.approved_by)
          : null;

        return {
          ...order,
          requested_by_name: requestedBy?.username || "Unknown User",
          approved_by_name: approvedBy?.username,
        };
      })
    );

    return enrichedOrders;
  },
});

/**
 * Get pending orders count (for dashboard badge)
 */
export const getPendingOrdersCount = query({
  args: {},
  handler: async (ctx) => {
    const orders = await ctx.db
      .query("productOrders")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    return orders.length;
  },
});

/**
 * Get order by ID with full details
 */
export const getOrderById = query({
  args: {
    order_id: v.id("productOrders"),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.order_id);
    if (!order) return null;

    const branch = await ctx.db.get(order.branch_id);
    const requestedBy = await ctx.db.get(order.requested_by);
    const approvedBy = order.approved_by
      ? await ctx.db.get(order.approved_by)
      : null;

    // Get product images for items
    const itemsWithImages = await Promise.all(
      order.items.map(async (item) => {
        const product = await ctx.db.get(item.catalog_product_id);
        let resolvedImageUrl = product?.image_url;

        if (product?.image_storage_id) {
          const storageUrl = await ctx.storage.getUrl(product.image_storage_id);
          if (storageUrl) {
            resolvedImageUrl = storageUrl;
          }
        }

        return {
          ...item,
          resolvedImageUrl,
          currentStock: product?.stock ?? 0,
        };
      })
    );

    return {
      ...order,
      items: itemsWithImages,
      branch_name: branch?.name || "Unknown Branch",
      branch_code: branch?.branch_code,
      branch_phone: branch?.phone,
      branch_email: branch?.email,
      requested_by_name: requestedBy?.username || "Unknown User",
      requested_by_email: requestedBy?.email,
      approved_by_name: approvedBy?.username,
    };
  },
});

/**
 * Get order summary statistics
 */
export const getOrdersSummary = query({
  args: {},
  handler: async (ctx) => {
    const orders = await ctx.db.query("productOrders").collect();

    const pending = orders.filter((o) => o.status === "pending").length;
    const approved = orders.filter((o) => o.status === "approved").length;
    const shipped = orders.filter((o) => o.status === "shipped").length;
    const received = orders.filter((o) => o.status === "received").length;
    const rejected = orders.filter((o) => o.status === "rejected").length;
    const cancelled = orders.filter((o) => o.status === "cancelled").length;

    const totalValue = orders
      .filter((o) => o.status === "received")
      .reduce((sum, o) => sum + o.total_amount, 0);

    // Payment stats
    const paidOrders = orders.filter((o) => o.is_paid === true).length;
    const unpaidOrders = orders.filter(
      (o) => o.is_paid !== true && o.status !== "cancelled" && o.status !== "rejected"
    ).length;

    return {
      pending,
      approved,
      shipped,
      received,
      rejected,
      cancelled,
      total: orders.length,
      totalValue,
      paidOrders,
      unpaidOrders,
    };
  },
});

/**
 * Debug: Get payment status summary for product orders
 */
export const getPaymentStatusDebug = query({
  handler: async (ctx) => {
    const orders = await ctx.db.query("productOrders").collect();

    const summary = {
      total: orders.length,
      paidWithPaidAt: orders.filter(o => o.is_paid === true && o.paid_at).length,
      paidWithoutPaidAt: orders.filter(o => o.is_paid === true && !o.paid_at).length,
      receivedButUnpaid: orders.filter(o => o.status === "received" && o.is_paid !== true).length,
      pendingPayment: orders.filter(o => (o.status === "approved" || o.status === "shipped") && o.is_paid !== true).length,
    };

    // Get sample of paid orders for debugging
    const paidOrders = orders
      .filter(o => o.is_paid === true)
      .slice(0, 5)
      .map(o => ({
        order_number: o.order_number,
        is_paid: o.is_paid,
        paid_at: o.paid_at,
        paid_at_readable: o.paid_at ? new Date(o.paid_at).toISOString() : null,
        status: o.status,
        total_amount: o.total_amount,
      }));

    return {
      summary,
      sample_paid_orders: paidOrders,
    };
  },
});

/**
 * Backfill: Mark all received orders as paid (for orders before this feature)
 */
export const backfillReceivedOrdersAsPaid = mutation({
  args: {
    admin_id: v.id("users"),
  },
  handler: async (ctx, args) => {
    const orders = await ctx.db.query("productOrders").collect();

    // Find orders that are received but not marked as paid
    const ordersToBackfill = orders.filter(
      o => o.status === "received" && o.is_paid !== true
    );

    const now = Date.now();
    let updated = 0;

    for (const order of ordersToBackfill) {
      // Use received_at as the payment date for backfill
      await ctx.db.patch(order._id, {
        is_paid: true,
        paid_at: order.received_at || order.created_at || now,
        paid_by: args.admin_id,
        payment_notes: "Backfilled from received status",
      });
      updated++;
    }

    return {
      success: true,
      backfilled: updated,
      message: `Marked ${updated} received orders as paid`,
    };
  },
});

/**
 * Mark an order as paid (separate from shipping status)
 */
export const markOrderAsPaid = mutation({
  args: {
    order_id: v.id("productOrders"),
    paid_by: v.id("users"),
    payment_method: v.optional(
      v.union(
        v.literal("cash"),
        v.literal("bank_transfer"),
        v.literal("check"),
        v.literal("gcash"),
        v.literal("maya")
      )
    ),
    payment_reference: v.optional(v.string()),
    payment_notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.order_id);
    if (!order) {
      throw new ConvexError({
        code: "ORDER_NOT_FOUND",
        message: "Order not found",
      });
    }

    // Can only mark as paid if order is approved, shipped, or received
    if (order.status === "pending" || order.status === "cancelled" || order.status === "rejected") {
      throw new ConvexError({
        code: "INVALID_STATUS",
        message: `Cannot mark order as paid with status: ${order.status}`,
      });
    }

    if (order.is_paid) {
      throw new ConvexError({
        code: "ALREADY_PAID",
        message: "Order is already marked as paid",
      });
    }

    const now = Date.now();
    await ctx.db.patch(args.order_id, {
      is_paid: true,
      paid_at: now,
      paid_by: args.paid_by,
      payment_method: args.payment_method,
      payment_reference: args.payment_reference?.trim(),
      payment_notes: args.payment_notes?.trim(),
    });

    return { success: true };
  },
});

/**
 * Create a manual order (super admin creates order on behalf of branch or for direct sale)
 */
export const createManualOrder = mutation({
  args: {
    branch_id: v.id("branches"),
    created_by: v.id("users"), // Super admin creating the order
    items: v.array(
      v.object({
        catalog_product_id: v.id("productCatalog"),
        quantity: v.number(),
      })
    ),
    notes: v.optional(v.string()),
    // Option to auto-approve the order
    auto_approve: v.optional(v.boolean()),
    // Option to mark as already paid
    mark_as_paid: v.optional(v.boolean()),
    payment_method: v.optional(
      v.union(
        v.literal("cash"),
        v.literal("bank_transfer"),
        v.literal("check"),
        v.literal("gcash"),
        v.literal("maya")
      )
    ),
    payment_reference: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.items.length === 0) {
      throw new ConvexError({
        code: "EMPTY_ORDER",
        message: "Order must have at least one item",
      });
    }

    // Validate branch exists
    const branch = await ctx.db.get(args.branch_id);
    if (!branch) {
      throw new ConvexError({
        code: "BRANCH_NOT_FOUND",
        message: "Branch not found",
      });
    }

    // Validate user exists
    const user = await ctx.db.get(args.created_by);
    if (!user) {
      throw new ConvexError({
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
    }

    // Build order items with product details
    let totalAmount = 0;
    const orderItems = [];

    for (const item of args.items) {
      if (item.quantity <= 0) {
        throw new ConvexError({
          code: "INVALID_QUANTITY",
          message: "Quantity must be greater than 0",
        });
      }

      const product = await ctx.db.get(item.catalog_product_id);
      if (!product || !product.is_active) {
        throw new ConvexError({
          code: "PRODUCT_NOT_FOUND",
          message: `Product not found or inactive`,
        });
      }

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        catalog_product_id: item.catalog_product_id,
        product_name: product.name,
        quantity_requested: item.quantity,
        quantity_approved: args.auto_approve ? item.quantity : undefined,
        unit_price: product.price,
      });
    }

    const now = Date.now();
    const orderNumber = generateOrderNumber();

    const orderId = await ctx.db.insert("productOrders", {
      order_number: orderNumber,
      branch_id: args.branch_id,
      requested_by: args.created_by, // Use admin as requester
      status: args.auto_approve ? "approved" : "pending",
      items: orderItems,
      total_amount: totalAmount,
      notes: args.notes?.trim(),
      rejection_reason: undefined,
      created_at: now,
      approved_at: args.auto_approve ? now : undefined,
      approved_by: args.auto_approve ? args.created_by : undefined,
      shipped_at: undefined,
      received_at: undefined,
      // Mark as manual order
      is_manual_order: true,
      created_by_admin: args.created_by,
      // Payment info if provided
      is_paid: args.mark_as_paid || undefined,
      paid_at: args.mark_as_paid ? now : undefined,
      paid_by: args.mark_as_paid ? args.created_by : undefined,
      payment_method: args.mark_as_paid ? args.payment_method : undefined,
      payment_reference: args.mark_as_paid ? args.payment_reference?.trim() : undefined,
    });

    return {
      success: true,
      orderId,
      orderNumber,
      totalAmount,
    };
  },
});
