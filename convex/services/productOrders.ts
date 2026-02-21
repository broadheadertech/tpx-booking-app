import { v, ConvexError } from "convex/values";
import { query, mutation } from "../_generated/server";
import { api } from "../_generated/api";

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

      // Validate stock availability (total stock minus reserved)
      const reservedStock = product.reserved_stock ?? 0;
      const availableStock = product.stock - reservedStock;
      if (availableStock < item.quantity_requested) {
        throw new ConvexError({
          code: "INSUFFICIENT_STOCK",
          message: `Insufficient stock for ${product.name}. Available: ${availableStock}, Requested: ${item.quantity_requested}`,
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

    // Branch Wallet payment is mandatory — check balance and create escrow hold
    const wallet = await ctx.db
      .query("branch_wallets")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .first();

    if (!wallet) {
      throw new ConvexError({
        code: "NO_WALLET",
        message: "Branch wallet not found. Please top up your wallet first.",
      });
    }

    if (wallet.balance < totalAmount) {
      throw new ConvexError({
        code: "INSUFFICIENT_BALANCE",
        message: `Insufficient wallet balance. Available: ₱${wallet.balance.toLocaleString()}, Required: ₱${totalAmount.toLocaleString()}. Please top up your wallet.`,
      });
    }

    // Create hold: move from balance to held_balance
    const newBalance = wallet.balance - totalAmount;
    const newHeld = wallet.held_balance + totalAmount;

    await ctx.db.patch(wallet._id, {
      balance: newBalance,
      held_balance: newHeld,
      updatedAt: now,
    });

    // Create hold transaction record
    const walletTransactionId = await ctx.db.insert("branch_wallet_transactions", {
      branch_id: args.branch_id,
      wallet_id: wallet._id,
      type: "hold",
      amount: -totalAmount,
      balance_after: newBalance,
      held_balance_after: newHeld,
      reference_type: "product_order",
      reference_id: orderNumber,
      description: `Hold for order ${orderNumber}`,
      created_by: args.requested_by,
      createdAt: now,
    });

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
      wallet_hold_amount: totalAmount,
      wallet_transaction_id: walletTransactionId,
    });

    // Email SA about new product order
    try {
      await ctx.scheduler.runAfter(0, api.services.emailNotifications.sendNotificationToRole, {
        notification_type: "new_product_order",
        role: "super_admin",
        variables: {
          order_number: orderNumber,
          branch_name: branch.name || "Branch",
          amount: `₱${totalAmount.toLocaleString()}`,
        },
      });
    } catch (e) { console.error("[PRODUCT_ORDERS] Email failed:", e); }

    // In-app notification for SA
    try {
      await ctx.db.insert("notifications", {
        title: "New Product Order",
        message: `${branch.name} placed order #${orderNumber} — ₱${totalAmount.toLocaleString()} (${orderItems.length} items)`,
        type: "alert" as const,
        priority: "high" as const,
        recipient_type: "admin" as const,
        is_read: false,
        is_archived: false,
        action_label: "Review Order",
        metadata: {
          order_id: orderId,
          order_number: orderNumber,
          branch_id: args.branch_id,
          total_amount: totalAmount,
        },
        createdAt: now,
        updatedAt: now,
      });
    } catch (e) { console.error("[PRODUCT_ORDERS] In-app notification failed:", e); }

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

    // Validate stock availability for approved quantities
    for (const item of updatedItems) {
      const qty = item.quantity_approved ?? 0;
      if (qty > 0) {
        const product = await ctx.db.get(item.catalog_product_id);
        if (product) {
          const currentReserved = product.reserved_stock ?? 0;
          const currentAvailable = product.stock - currentReserved;
          if (currentAvailable < qty) {
            throw new ConvexError({
              code: "INSUFFICIENT_STOCK",
              message: `Insufficient stock for ${item.product_name}. Available: ${currentAvailable}, Approved: ${qty}`,
            });
          }
        }
      }
    }

    // Recalculate total based on approved quantities
    const newTotal = updatedItems.reduce(
      (sum, item) => sum + item.unit_price * (item.quantity_approved ?? 0),
      0
    );

    const now = Date.now();

    // Adjust wallet hold if total changed
    let updatedWalletHold = order.wallet_hold_amount;
    if (order.wallet_hold_amount && newTotal !== order.wallet_hold_amount) {
      const wallet = await ctx.db
        .query("branch_wallets")
        .withIndex("by_branch", (q) => q.eq("branch_id", order.branch_id))
        .first();

      if (wallet) {
        const difference = order.wallet_hold_amount - newTotal;
        if (difference > 0) {
          // Total decreased: release excess hold back to balance
          await ctx.db.patch(wallet._id, {
            balance: wallet.balance + difference,
            held_balance: wallet.held_balance - difference,
            updatedAt: now,
          });
          await ctx.db.insert("branch_wallet_transactions", {
            branch_id: order.branch_id,
            wallet_id: wallet._id,
            type: "release_hold",
            amount: difference,
            balance_after: wallet.balance + difference,
            held_balance_after: wallet.held_balance - difference,
            reference_type: "product_order",
            reference_id: order.order_number,
            description: `Hold adjusted: order ${order.order_number} total reduced to ₱${newTotal.toLocaleString()}`,
            created_by: args.approved_by,
            createdAt: now,
          });
        } else if (difference < 0) {
          // Total increased: need to hold more
          const additionalHold = Math.abs(difference);
          if (wallet.balance < additionalHold) {
            throw new ConvexError({
              code: "INSUFFICIENT_BALANCE",
              message: `Branch wallet has insufficient balance for the adjusted order total. Need additional ₱${additionalHold.toLocaleString()}, available: ₱${wallet.balance.toLocaleString()}`,
            });
          }
          await ctx.db.patch(wallet._id, {
            balance: wallet.balance - additionalHold,
            held_balance: wallet.held_balance + additionalHold,
            updatedAt: now,
          });
          await ctx.db.insert("branch_wallet_transactions", {
            branch_id: order.branch_id,
            wallet_id: wallet._id,
            type: "hold",
            amount: -additionalHold,
            balance_after: wallet.balance - additionalHold,
            held_balance_after: wallet.held_balance + additionalHold,
            reference_type: "product_order",
            reference_id: order.order_number,
            description: `Additional hold: order ${order.order_number} total increased to ₱${newTotal.toLocaleString()}`,
            created_by: args.approved_by,
            createdAt: now,
          });
        }
        updatedWalletHold = newTotal;
      }
    }

    await ctx.db.patch(args.order_id, {
      status: "approved",
      items: updatedItems,
      total_amount: newTotal,
      approved_at: now,
      approved_by: args.approved_by,
      ...(updatedWalletHold !== undefined && updatedWalletHold !== order.wallet_hold_amount
        ? { wallet_hold_amount: updatedWalletHold }
        : {}),
    });

    // Reserve stock for approved items in central warehouse
    for (const item of updatedItems) {
      const qty = item.quantity_approved ?? 0;
      if (qty > 0) {
        const product = await ctx.db.get(item.catalog_product_id);
        if (product) {
          await ctx.db.patch(item.catalog_product_id, {
            reserved_stock: (product.reserved_stock ?? 0) + qty,
          });
        }
      }
    }

    // Email BA about order approval
    try {
      await ctx.scheduler.runAfter(0, api.services.emailNotifications.sendNotificationToRole, {
        notification_type: "order_approved",
        role: "branch_admin",
        branch_id: order.branch_id,
        variables: {
          order_number: order.order_number,
          amount: `₱${newTotal.toLocaleString()}`,
        },
      });
    } catch (e) { console.error("[PRODUCT_ORDERS] Approval email failed:", e); }

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

    const now = Date.now();

    // Release wallet hold if applicable
    if (order.wallet_hold_amount) {
      const wallet = await ctx.db
        .query("branch_wallets")
        .withIndex("by_branch", (q) => q.eq("branch_id", order.branch_id))
        .first();

      if (wallet) {
        await ctx.db.patch(wallet._id, {
          balance: wallet.balance + order.wallet_hold_amount,
          held_balance: wallet.held_balance - order.wallet_hold_amount,
          updatedAt: now,
        });
        await ctx.db.insert("branch_wallet_transactions", {
          branch_id: order.branch_id,
          wallet_id: wallet._id,
          type: "release_hold",
          amount: order.wallet_hold_amount,
          balance_after: wallet.balance + order.wallet_hold_amount,
          held_balance_after: wallet.held_balance - order.wallet_hold_amount,
          reference_type: "product_order",
          reference_id: order.order_number,
          description: `Hold released: order ${order.order_number} rejected`,
          created_by: args.rejected_by,
          createdAt: now,
        });
      }
    }

    await ctx.db.patch(args.order_id, {
      status: "rejected",
      rejection_reason: args.rejection_reason.trim(),
      approved_by: args.rejected_by, // Using approved_by to track who handled it
      approved_at: now,
    });

    // Email BA about order rejection
    try {
      await ctx.scheduler.runAfter(0, api.services.emailNotifications.sendNotificationToRole, {
        notification_type: "order_rejected",
        role: "branch_admin",
        branch_id: order.branch_id,
        variables: {
          order_number: order.order_number,
          rejection_reason: args.rejection_reason.trim(),
        },
      });
    } catch (e) { console.error("[PRODUCT_ORDERS] Rejection email failed:", e); }

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

      // Update product stock and release reservation
      await ctx.db.patch(item.catalog_product_id, {
        stock: product.stock - quantityToShip,
        reserved_stock: Math.max(0, (product.reserved_stock ?? 0) - quantityToShip),
      });
    }

    const now = Date.now();
    await ctx.db.patch(args.order_id, {
      status: "shipped",
      shipped_at: now,
    });

    // Email BA about order shipment
    try {
      await ctx.scheduler.runAfter(0, api.services.emailNotifications.sendNotificationToRole, {
        notification_type: "order_shipped",
        role: "branch_admin",
        branch_id: order.branch_id,
        variables: {
          order_number: order.order_number,
        },
      });
    } catch (e) { console.error("[PRODUCT_ORDERS] Shipment email failed:", e); }

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

    // Create inventory batches for the branch and restock products
    for (const item of order.items) {
      const quantityReceived = item.quantity_approved ?? item.quantity_requested;
      const catalogProduct = await ctx.db.get(item.catalog_product_id);

      // Find matching branch product by catalog_product_id (preferred) or name (fallback)
      const branchProducts = await ctx.db
        .query("products")
        .withIndex("by_branch", (q) => q.eq("branch_id", order.branch_id))
        .collect();

      let existingProduct = branchProducts.find(
        (p) => p.catalog_product_id === item.catalog_product_id
      );
      // Fallback to name matching for older products without catalog link
      if (!existingProduct) {
        existingProduct = branchProducts.find(
          (p) => p.name === item.product_name
        );
      }

      let productId: string;

      if (existingProduct) {
        // Restock: Update existing product stock and refresh buying price from this order
        const newStock = existingProduct.stock + quantityReceived;
        await ctx.db.patch(existingProduct._id, {
          stock: newStock,
          cost: item.unit_price, // Update to the price branch paid in this order
          status: newStock > 0 ? "active" : existingProduct.status,
          updatedAt: now,
        });
        productId = existingProduct._id;
      } else {
        // Product doesn't exist in branch yet — create it with received stock
        const VALID_CATEGORIES = ["hair-care", "beard-care", "shaving", "tools", "accessories"] as const;
        type ProductCategory = (typeof VALID_CATEGORIES)[number];
        const cat = (catalogProduct?.category ?? "accessories") as string;
        const category = VALID_CATEGORIES.includes(cat as ProductCategory)
          ? (cat as ProductCategory)
          : ("accessories" as ProductCategory);

        const buyingPrice = item.unit_price;
        const defaultSellingPrice = Math.ceil(buyingPrice * 1.10); // 10% markup
        productId = await ctx.db.insert("products", {
          branch_id: order.branch_id,
          catalog_product_id: item.catalog_product_id,
          name: item.product_name,
          description: catalogProduct?.description || "",
          price: defaultSellingPrice, // Default selling price = buying + 10% (branch admin can change)
          cost: buyingPrice, // Buying price = catalog price (what branch pays HQ)
          category,
          brand: catalogProduct?.brand || "",
          sku: catalogProduct?.sku || "",
          stock: quantityReceived,
          minStock: catalogProduct?.minStock ?? 10,
          imageUrl: catalogProduct?.image_url,
          imageStorageId: catalogProduct?.image_storage_id,
          status: "active",
          soldThisMonth: 0,
          createdAt: now,
          updatedAt: now,
        });
      }

      // Create batch for FIFO tracking (labeled by batch)
      const batchNumber = `BATCH-${new Date().getFullYear()}-${Math.floor(
        Math.random() * 100000
      )
        .toString()
        .padStart(5, "0")}`;

      await ctx.db.insert("inventoryBatches", {
        product_id: productId,
        product_type: "branch",
        branch_id: order.branch_id,
        batch_number: batchNumber,
        quantity: quantityReceived,
        initial_quantity: quantityReceived,
        received_at: now,
        expiry_date: undefined,
        cost_per_unit: item.unit_price, // Branch buying price, not HQ's supplier cost
        supplier: "Central Warehouse",
        notes: `From order ${order.order_number}`,
        created_by: args.received_by,
        created_at: now,
      });
    }

    // Auto-deduct wallet payment on receipt
    if (order.wallet_hold_amount) {
      const wallet = await ctx.db
        .query("branch_wallets")
        .withIndex("by_branch", (q) => q.eq("branch_id", order.branch_id))
        .first();

      if (wallet) {
        const deductAmount = order.wallet_hold_amount;
        await ctx.db.patch(wallet._id, {
          held_balance: wallet.held_balance - deductAmount,
          total_spent: wallet.total_spent + deductAmount,
          updatedAt: now,
        });

        await ctx.db.insert("branch_wallet_transactions", {
          branch_id: order.branch_id,
          wallet_id: wallet._id,
          type: "payment",
          amount: -deductAmount,
          balance_after: wallet.balance,
          held_balance_after: wallet.held_balance - deductAmount,
          reference_type: "product_order",
          reference_id: order.order_number,
          description: `Payment for order ${order.order_number} (received & confirmed)`,
          created_by: args.received_by,
          createdAt: now,
        });
      }
    }

    await ctx.db.patch(args.order_id, {
      status: "received",
      received_at: now,
      // Auto-mark as paid if wallet-funded
      ...(order.wallet_hold_amount
        ? {
            is_paid: true,
            paid_at: now,
            paid_by: args.received_by,
            payment_method: "branch_wallet" as const,
            payment_notes: "Auto-paid from branch wallet on receipt confirmation",
          }
        : {}),
    });

    // Email BA about order delivery confirmation
    try {
      await ctx.scheduler.runAfter(0, api.services.emailNotifications.sendNotificationToRole, {
        notification_type: "order_delivered",
        role: "branch_admin",
        branch_id: order.branch_id,
        variables: {
          order_number: order.order_number,
        },
      });
    } catch (e) { console.error("[PRODUCT_ORDERS] Delivery email failed:", e); }

    return { success: true };
  },
});

/**
 * Cancel an order (pending or approved orders can be cancelled)
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

    // Allow cancellation of pending and approved orders (not shipped/received)
    if (order.status !== "pending" && order.status !== "approved") {
      throw new ConvexError({
        code: "INVALID_STATUS",
        message: `Cannot cancel order with status: ${order.status}`,
      });
    }

    const now = Date.now();

    // Release stock reservation if order was approved
    if (order.status === "approved") {
      for (const item of order.items) {
        const qty = item.quantity_approved ?? item.quantity_requested;
        const product = await ctx.db.get(item.catalog_product_id);
        if (product) {
          await ctx.db.patch(item.catalog_product_id, {
            reserved_stock: Math.max(0, (product.reserved_stock ?? 0) - qty),
          });
        }
      }
    }

    // Release wallet hold if applicable
    if (order.wallet_hold_amount) {
      const wallet = await ctx.db
        .query("branch_wallets")
        .withIndex("by_branch", (q) => q.eq("branch_id", order.branch_id))
        .first();

      if (wallet) {
        await ctx.db.patch(wallet._id, {
          balance: wallet.balance + order.wallet_hold_amount,
          held_balance: wallet.held_balance - order.wallet_hold_amount,
          updatedAt: now,
        });
        await ctx.db.insert("branch_wallet_transactions", {
          branch_id: order.branch_id,
          wallet_id: wallet._id,
          type: "release_hold",
          amount: order.wallet_hold_amount,
          balance_after: wallet.balance + order.wallet_hold_amount,
          held_balance_after: wallet.held_balance - order.wallet_hold_amount,
          reference_type: "product_order",
          reference_id: order.order_number,
          description: `Hold released: order ${order.order_number} cancelled`,
          created_by: args.cancelled_by,
          createdAt: now,
        });
      }
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
    payment_method: v.optional(v.literal("branch_wallet")),
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
    // Option to mark as already paid via branch wallet
    mark_as_paid: v.optional(v.boolean()),
    payment_method: v.optional(v.literal("branch_wallet")),
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

// ============================================================
// TWO-SIDED RECONCILIATION
// ============================================================

/**
 * Receive an order with per-item actual quantities for reconciliation.
 * Creates a discrepancy report if any item quantity doesn't match what was shipped.
 */
export const reconcileOrderReceipt = mutation({
  args: {
    order_id: v.id("productOrders"),
    received_by: v.id("users"),
    received_items: v.array(
      v.object({
        catalog_product_id: v.id("productCatalog"),
        quantity_received: v.number(),
        expiry_date: v.optional(v.number()),
      })
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.order_id);
    if (!order) {
      throw new ConvexError({ code: "ORDER_NOT_FOUND", message: "Order not found" });
    }
    if (order.status !== "shipped") {
      throw new ConvexError({ code: "INVALID_STATUS", message: `Cannot receive order with status: ${order.status}` });
    }

    const now = Date.now();
    const receivedMap = new Map(
      args.received_items.map((i) => [i.catalog_product_id, i])
    );
    const discrepancyItems: {
      catalog_product_id: string;
      product_name: string;
      quantity_shipped: number;
      quantity_received: number;
      discrepancy: number;
      unit_price: number;
    }[] = [];

    for (const item of order.items) {
      const quantityShipped = item.quantity_approved ?? item.quantity_requested;
      const received = receivedMap.get(item.catalog_product_id);
      const quantityReceived = received?.quantity_received ?? quantityShipped;
      const expiryDate = received?.expiry_date;

      // Record discrepancy if quantities differ
      const discrepancy = quantityShipped - quantityReceived;
      if (discrepancy !== 0) {
        discrepancyItems.push({
          catalog_product_id: item.catalog_product_id,
          product_name: item.product_name,
          quantity_shipped: quantityShipped,
          quantity_received: quantityReceived,
          discrepancy,
          unit_price: item.unit_price,
        });
      }

      if (quantityReceived <= 0) continue;

      const catalogProduct = await ctx.db.get(item.catalog_product_id);
      const branchProducts = await ctx.db
        .query("products")
        .withIndex("by_branch", (q) => q.eq("branch_id", order.branch_id))
        .collect();

      let existingProduct = branchProducts.find(
        (p) => p.catalog_product_id === item.catalog_product_id
      );
      if (!existingProduct) {
        existingProduct = branchProducts.find((p) => p.name === item.product_name);
      }

      let productId: string;
      let effectiveQtyToAdd = quantityReceived; // may be reduced if already barcode-received
      let stockBefore = 0;

      if (existingProduct) {
        // Deduct any units already received via barcode scan for this order
        const barcodeMovements = await ctx.db
          .query("stockMovements")
          .withIndex("by_product", (q) => q.eq("product_id", existingProduct._id as string))
          .filter((q) =>
            q.and(
              q.eq(q.field("reference_id"), order.order_number),
              q.eq(q.field("type"), "received")
            )
          )
          .collect();
        const alreadyBarcodeReceived = barcodeMovements.reduce((sum, m) => sum + m.quantity_change, 0);

        effectiveQtyToAdd = Math.max(0, quantityReceived - alreadyBarcodeReceived);
        stockBefore = existingProduct.stock;

        if (effectiveQtyToAdd > 0) {
          const newStock = existingProduct.stock + effectiveQtyToAdd;
          await ctx.db.patch(existingProduct._id, {
            stock: newStock,
            cost: item.unit_price,
            status: newStock > 0 ? "active" : existingProduct.status,
            updatedAt: now,
          });
        } else {
          // All units already received via barcode — just refresh the cost
          await ctx.db.patch(existingProduct._id, { cost: item.unit_price, updatedAt: now });
        }
        productId = existingProduct._id;
      } else {
        const VALID_CATEGORIES = ["hair-care", "beard-care", "shaving", "tools", "accessories"] as const;
        type ProductCategory = (typeof VALID_CATEGORIES)[number];
        const cat = (catalogProduct?.category ?? "accessories") as string;
        const category = VALID_CATEGORIES.includes(cat as ProductCategory)
          ? (cat as ProductCategory)
          : ("accessories" as ProductCategory);
        const buyingPrice = item.unit_price;
        const defaultSellingPrice = Math.ceil(buyingPrice * 1.1);
        productId = await ctx.db.insert("products", {
          branch_id: order.branch_id,
          catalog_product_id: item.catalog_product_id,
          name: item.product_name,
          description: catalogProduct?.description || "",
          price: defaultSellingPrice,
          cost: buyingPrice,
          category,
          brand: catalogProduct?.brand || "",
          sku: catalogProduct?.sku || "",
          stock: effectiveQtyToAdd,
          minStock: catalogProduct?.minStock ?? 10,
          imageUrl: catalogProduct?.image_url,
          imageStorageId: catalogProduct?.image_storage_id,
          status: "active",
          soldThisMonth: 0,
          createdAt: now,
          updatedAt: now,
        });
      }

      // Only create batch and audit log if there's effective quantity to add
      if (effectiveQtyToAdd > 0) {
        const batchNumber = `BATCH-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000).toString().padStart(5, "0")}`;
        await ctx.db.insert("inventoryBatches", {
          product_id: productId,
          product_type: "branch",
          branch_id: order.branch_id,
          batch_number: batchNumber,
          quantity: effectiveQtyToAdd,
          initial_quantity: effectiveQtyToAdd,
          received_at: now,
          expiry_date: expiryDate,
          cost_per_unit: item.unit_price,
          supplier: "Central Warehouse",
          notes: `From order ${order.order_number}`,
          created_by: args.received_by,
          created_at: now,
        });

        await ctx.db.insert("stockMovements", {
          branch_id: order.branch_id,
          product_id: productId,
          product_name: item.product_name,
          type: "received_from_order",
          quantity_change: effectiveQtyToAdd,
          quantity_before: stockBefore,
          quantity_after: stockBefore + effectiveQtyToAdd,
          reference_id: order.order_number,
          notes: `Received from order ${order.order_number}`,
          created_by: args.received_by,
          created_at: now,
        });
      }
    }

    // Auto-create discrepancy report if any item mismatched
    if (discrepancyItems.length > 0) {
      const totalUnits = discrepancyItems.reduce((s, i) => s + Math.abs(i.discrepancy), 0);
      const totalAmount = discrepancyItems.reduce((s, i) => s + Math.abs(i.discrepancy) * i.unit_price, 0);
      await ctx.db.insert("shipmentDiscrepancies", {
        order_id: args.order_id,
        order_number: order.order_number,
        branch_id: order.branch_id,
        items: discrepancyItems,
        total_discrepancy_units: totalUnits,
        total_discrepancy_amount: totalAmount,
        status: "pending",
        notes: args.notes,
        submitted_by: args.received_by,
        submitted_at: now,
      });
    }

    // Auto-deduct wallet payment (same as receiveOrder)
    if (order.wallet_hold_amount) {
      const wallet = await ctx.db
        .query("branch_wallets")
        .withIndex("by_branch", (q) => q.eq("branch_id", order.branch_id))
        .first();
      if (wallet) {
        const deductAmount = order.wallet_hold_amount;
        await ctx.db.patch(wallet._id, {
          held_balance: wallet.held_balance - deductAmount,
          total_spent: wallet.total_spent + deductAmount,
          updatedAt: now,
        });
        await ctx.db.insert("branch_wallet_transactions", {
          branch_id: order.branch_id,
          wallet_id: wallet._id,
          type: "payment",
          amount: -deductAmount,
          balance_after: wallet.balance,
          held_balance_after: wallet.held_balance - deductAmount,
          reference_type: "product_order",
          reference_id: order.order_number,
          description: `Payment for order ${order.order_number} (received & reconciled)`,
          created_by: args.received_by,
          createdAt: now,
        });
      }
    }

    await ctx.db.patch(args.order_id, {
      status: "received",
      received_at: now,
      ...(order.wallet_hold_amount
        ? {
            is_paid: true,
            paid_at: now,
            paid_by: args.received_by,
            payment_method: "branch_wallet" as const,
            payment_notes: "Auto-paid from branch wallet on receipt confirmation",
          }
        : {}),
    });

    try {
      await ctx.scheduler.runAfter(0, api.services.emailNotifications.sendNotificationToRole, {
        notification_type: "order_delivered",
        role: "branch_admin",
        branch_id: order.branch_id,
        variables: { order_number: order.order_number },
      });
    } catch (e) {
      console.error("[PRODUCT_ORDERS] Delivery email failed:", e);
    }

    return { success: true, hasDiscrepancy: discrepancyItems.length > 0 };
  },
});

/**
 * Get all discrepancy reports (for HQ super admin view)
 */
export const getPendingDiscrepancies = query({
  args: {},
  handler: async (ctx) => {
    const discrepancies = await ctx.db
      .query("shipmentDiscrepancies")
      .withIndex("by_submitted_at")
      .order("desc")
      .collect();
    return await Promise.all(
      discrepancies.map(async (d) => {
        const branch = await ctx.db.get(d.branch_id);
        return { ...d, branch_name: branch?.name || "Unknown Branch" };
      })
    );
  },
});

/**
 * Count of pending discrepancies (for badge on HQ tab)
 */
export const getPendingDiscrepanciesCount = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db
      .query("shipmentDiscrepancies")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    return items.length;
  },
});

/**
 * Resolve or waive a discrepancy report (super admin only)
 */
export const resolveDiscrepancy = mutation({
  args: {
    discrepancy_id: v.id("shipmentDiscrepancies"),
    resolution: v.union(v.literal("resolved"), v.literal("waived")),
    resolution_notes: v.optional(v.string()),
    resolved_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.discrepancy_id, {
      status: args.resolution,
      resolved_by: args.resolved_by,
      resolved_at: Date.now(),
      resolution_notes: args.resolution_notes,
    });
    return { success: true };
  },
});
