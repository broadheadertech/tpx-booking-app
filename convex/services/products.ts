import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { throwUserError, ERROR_CODES, validateInput } from "../utils/errors";
import { Id } from "../_generated/dataModel";

// Get all products
export const getAllProducts = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db
      .query("products")
      .order("desc")
      .collect();

    // Attach oldest batch info (FIFO hint) for POS picking guidance
    const productsWithBatch = await Promise.all(
      products.map(async (product) => {
        const batches = await ctx.db
          .query("inventoryBatches")
          .withIndex("by_product", (q) => q.eq("product_id", product._id))
          .filter((q) => q.gt(q.field("quantity"), 0))
          .collect();
        batches.sort((a, b) => a.received_at - b.received_at);
        const oldest = batches[0] ?? null;
        return {
          ...product,
          oldest_batch: oldest
            ? {
                batch_number: oldest.batch_number,
                quantity: oldest.quantity,
                received_at: oldest.received_at,
                expiry_date: oldest.expiry_date,
              }
            : null,
        };
      })
    );

    return productsWithBatch;
  },
});

// Get products by category
export const getProductsByCategory = query({
  args: {
    category: v.union(
      v.literal("hair-care"),
      v.literal("beard-care"),
      v.literal("shaving"),
      v.literal("tools"),
      v.literal("accessories")
    ),
  },
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();
    
    return products;
  },
});

// Get product by ID
export const getProductById = query({
  args: {
    id: v.id("products"),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    return product;
  },
});

// Create new product
export const createProduct = mutation({
  args: {
    branch_id: v.id("branches"), // Required: which branch this product belongs to
    name: v.string(),
    description: v.string(),
    price: v.number(),
    cost: v.number(),
    category: v.union(
      v.literal("hair-care"),
      v.literal("beard-care"),
      v.literal("shaving"),
      v.literal("tools"),
      v.literal("accessories")
    ),
    brand: v.string(),
    sku: v.string(),
    stock: v.number(),
    minStock: v.number(),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    status: v.optional(v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("out-of-stock")
    )),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Check if SKU already exists
    const existingProduct = await ctx.db
      .query("products")
      .withIndex("by_sku", (q) => q.eq("sku", args.sku))
      .first();
    
    if (existingProduct) {
      throwUserError(ERROR_CODES.PRODUCT_SKU_EXISTS);
    }
    
    // Determine status based on stock
    let status = args.status || "active";
    if (args.stock === 0) {
      status = "out-of-stock";
    }

    if (args.price < 0) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Invalid price", "Price cannot be negative.");
    }
    if (args.cost < 0) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Invalid cost", "Cost cannot be negative.");
    }
    if (args.stock < 0) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Invalid stock", "Stock cannot be negative.");
    }
    
    const productData: any = {
      branch_id: args.branch_id,
      name: args.name,
      description: args.description,
      price: args.price,
      cost: args.cost,
      category: args.category,
      brand: args.brand,
      sku: args.sku,
      stock: args.stock,
      minStock: args.minStock,
      status,
      soldThisMonth: 0,
      createdAt: now,
      updatedAt: now,
    };
    
    if (args.imageUrl) {
      productData.imageUrl = args.imageUrl;
    }
    
    if (args.imageStorageId) {
      productData.imageStorageId = args.imageStorageId;
    }
    
    const productId = await ctx.db.insert("products", productData);
    
    return productId;
  },
});

// Update product
export const updateProduct = mutation({
  args: {
    id: v.id("products"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    cost: v.optional(v.number()),
    category: v.optional(v.union(
      v.literal("hair-care"),
      v.literal("beard-care"),
      v.literal("shaving"),
      v.literal("tools"),
      v.literal("accessories")
    )),
    brand: v.optional(v.string()),
    sku: v.optional(v.string()),
    stock: v.optional(v.number()),
    minStock: v.optional(v.number()),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    status: v.optional(v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("out-of-stock")
    )),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    // Check if product exists
    const existingProduct = await ctx.db.get(id);
    if (!existingProduct) {
      throwUserError(ERROR_CODES.PRODUCT_NOT_FOUND);
    }
    
    // Check SKU uniqueness if SKU is being updated
    if (updates.sku) {
      const skuExists = await ctx.db
        .query("products")
        .withIndex("by_sku", (q) => q.eq("sku", updates.sku!))
        .first();
      
      if (skuExists && skuExists._id !== id) {
        throwUserError(ERROR_CODES.PRODUCT_SKU_EXISTS);
      }
    }

    if (updates.price !== undefined && updates.price < 0) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Invalid price", "Price cannot be negative.");
    }
    if (updates.cost !== undefined && updates.cost < 0) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Invalid cost", "Cost cannot be negative.");
    }
    if (updates.stock !== undefined && updates.stock < 0) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Invalid stock", "Stock cannot be negative.");
    }
    
    // Auto-update status based on stock
    if (updates.stock !== undefined) {
      if (updates.stock === 0) {
        updates.status = "out-of-stock";
      } else if (existingProduct.status === "out-of-stock" && updates.stock > 0) {
        updates.status = "active";
      }
    }
    
    const patchData: any = {
      updatedAt: Date.now(),
    };
    
    // Only include defined fields in the update
    Object.keys(updates).forEach(key => {
      if (updates[key as keyof typeof updates] !== undefined) {
        patchData[key] = updates[key as keyof typeof updates];
      }
    });
    
    await ctx.db.patch(id, patchData);
    
    return { success: true };
  },
});

// Delete product
export const deleteProduct = mutation({
  args: {
    id: v.id("products"),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    
    if (!product) {
      throwUserError(ERROR_CODES.PRODUCT_NOT_FOUND);
    }
    
    await ctx.db.delete(args.id);
    
    return { success: true };
  },
});

// Update product stock (for sales/restocking)
export const updateProductStock = mutation({
  args: {
    id: v.id("products"),
    stockChange: v.number(), // positive for restock, negative for sale
    updateSoldCount: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    
    if (!product) {
      throwUserError(ERROR_CODES.PRODUCT_NOT_FOUND);
    }
    
    const newStock = Math.max(0, product.stock + args.stockChange);
    const updates: any = {
      stock: newStock,
      updatedAt: Date.now(),
    };
    
    // Update sold count if it's a sale
    if (args.updateSoldCount && args.stockChange < 0) {
      updates.soldThisMonth = product.soldThisMonth + Math.abs(args.stockChange);
    }
    
    // Update status based on new stock level
    if (newStock === 0) {
      updates.status = "out-of-stock";
    } else if (product.status === "out-of-stock" && newStock > 0) {
      updates.status = "active";
    }
    
    await ctx.db.patch(args.id, updates);
    
    return { success: true, newStock };
  },
});

// Generate upload URL for product images
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Get image URL from storage ID
export const getImageUrl = query({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Delete image from storage
export const deleteImage = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await ctx.storage.delete(args.storageId);
    return { success: true };
  },
});

// ============================================
// Branch Inventory Queries (for Super Admin)
// ============================================

/**
 * Get all products for a specific branch
 */
export const getProductsByBranch = query({
  args: {
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    // Resolve image URLs
    const productsWithImages = await Promise.all(
      products.map(async (product) => {
        let resolvedImageUrl = product.imageUrl;
        if (product.imageStorageId) {
          const storageUrl = await ctx.storage.getUrl(product.imageStorageId);
          if (storageUrl) {
            resolvedImageUrl = storageUrl;
          }
        }

        // Determine stock status
        let stockStatus: "in-stock" | "low-stock" | "out-of-stock" = "in-stock";
        if (product.stock === 0) {
          stockStatus = "out-of-stock";
        } else if (product.stock <= product.minStock) {
          stockStatus = "low-stock";
        }

        return {
          ...product,
          resolvedImageUrl,
          stockStatus,
        };
      })
    );

    return productsWithImages;
  },
});

/**
 * Get low stock products for a specific branch
 */
export const getLowStockByBranch = query({
  args: {
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    // Filter low stock products
    const lowStockProducts = products.filter(
      (p) => p.stock <= p.minStock
    );

    // Resolve image URLs
    const productsWithImages = await Promise.all(
      lowStockProducts.map(async (product) => {
        let resolvedImageUrl = product.imageUrl;
        if (product.imageStorageId) {
          const storageUrl = await ctx.storage.getUrl(product.imageStorageId);
          if (storageUrl) {
            resolvedImageUrl = storageUrl;
          }
        }

        const stockStatus = product.stock === 0 ? "out-of-stock" : "low-stock";

        return {
          ...product,
          resolvedImageUrl,
          stockStatus,
        };
      })
    );

    return productsWithImages;
  },
});

/**
 * Get inventory summary for all branches (for super admin dashboard)
 */
export const getAllBranchInventorySummary = query({
  args: {},
  handler: async (ctx) => {
    // Get all branches
    const branches = await ctx.db
      .query("branches")
      .withIndex("by_active", (q) => q.eq("is_active", true))
      .collect();

    // Get inventory summary for each branch
    const branchSummaries = await Promise.all(
      branches.map(async (branch) => {
        const products = await ctx.db
          .query("products")
          .withIndex("by_branch", (q) => q.eq("branch_id", branch._id))
          .collect();

        const totalProducts = products.length;
        const inStock = products.filter((p) => p.stock > p.minStock).length;
        const lowStock = products.filter(
          (p) => p.stock > 0 && p.stock <= p.minStock
        ).length;
        const outOfStock = products.filter((p) => p.stock === 0).length;
        const totalValue = products.reduce(
          (sum, p) => sum + p.price * p.stock,
          0
        );

        return {
          branch_id: branch._id,
          branch_name: branch.name,
          branch_code: branch.branch_code,
          branch_phone: branch.phone,
          branch_email: branch.email,
          totalProducts,
          inStock,
          lowStock,
          outOfStock,
          totalValue,
          hasLowStockAlert: lowStock > 0 || outOfStock > 0,
        };
      })
    );

    // Sort by low stock alerts first
    branchSummaries.sort((a, b) => {
      if (a.hasLowStockAlert && !b.hasLowStockAlert) return -1;
      if (!a.hasLowStockAlert && b.hasLowStockAlert) return 1;
      return a.branch_name.localeCompare(b.branch_name);
    });

    return branchSummaries;
  },
});

/**
 * Get all low stock products across all branches (for super admin alerts)
 */
export const getAllBranchLowStock = query({
  args: {},
  handler: async (ctx) => {
    // Get all branches
    const branches = await ctx.db
      .query("branches")
      .withIndex("by_active", (q) => q.eq("is_active", true))
      .collect();

    const branchMap = new Map(branches.map((b) => [b._id, b]));

    // Get all products
    const allProducts = await ctx.db.query("products").collect();

    // Filter low stock products
    const lowStockProducts = allProducts.filter(
      (p) => p.stock <= p.minStock && p.branch_id
    );

    // Group by branch and enrich
    const productsWithBranch = await Promise.all(
      lowStockProducts.map(async (product) => {
        const branch = product.branch_id ? branchMap.get(product.branch_id) : null;

        let resolvedImageUrl = product.imageUrl;
        if (product.imageStorageId) {
          const storageUrl = await ctx.storage.getUrl(product.imageStorageId);
          if (storageUrl) {
            resolvedImageUrl = storageUrl;
          }
        }

        const stockStatus = product.stock === 0 ? "out-of-stock" : "low-stock";

        return {
          ...product,
          resolvedImageUrl,
          stockStatus,
          branch_name: branch?.name || "Unknown Branch",
          branch_code: branch?.branch_code,
          branch_phone: branch?.phone,
          branch_email: branch?.email,
        };
      })
    );

    // Sort by stock level (most critical first)
    productsWithBranch.sort((a, b) => a.stock - b.stock);

    return productsWithBranch;
  },
});

/**
 * Get branch inventory with batches for FIFO view
 */
export const getBranchProductWithBatches = query({
  args: {
    product_id: v.id("products"),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.product_id);
    if (!product) return null;

    // Get batches sorted by received_at (oldest first)
    const batches = await ctx.db
      .query("inventoryBatches")
      .withIndex("by_product", (q) => q.eq("product_id", args.product_id))
      .filter((q) => q.gt(q.field("quantity"), 0))
      .collect();

    // Sort by received_at ascending
    batches.sort((a, b) => a.received_at - b.received_at);

    let resolvedImageUrl = product.imageUrl;
    if (product.imageStorageId) {
      const storageUrl = await ctx.storage.getUrl(product.imageStorageId);
      if (storageUrl) {
        resolvedImageUrl = storageUrl;
      }
    }

    // Determine stock status
    let stockStatus: "in-stock" | "low-stock" | "out-of-stock" = "in-stock";
    if (product.stock === 0) {
      stockStatus = "out-of-stock";
    } else if (product.stock <= product.minStock) {
      stockStatus = "low-stock";
    }

    // Calculate oldest batch date
    const oldestBatchDate = batches.length > 0 ? batches[0].received_at : null;

    return {
      ...product,
      resolvedImageUrl,
      stockStatus,
      batches,
      oldestBatchDate,
    };
  },
});

/**
 * Look up a branch product by SKU (used by barcode scanner).
 * Returns { product, pendingOrder } if found, or null if SKU not in branch catalog.
 * pendingOrder is null if the product has no approved/shipped order — indicating a ghost product.
 */
export const getProductBySku = query({
  args: {
    sku: v.string(),
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db
      .query("products")
      .withIndex("by_sku", (q) => q.eq("sku", args.sku.trim()))
      .filter((q) => q.eq(q.field("branch_id"), args.branch_id))
      .first();

    if (!product) return null;

    // No catalog link means it was never ordered through the system
    if (!product.catalog_product_id) {
      return { product, pendingOrder: null };
    }

    // Find an approved or shipped order for this branch containing this product
    const orders = await ctx.db
      .query("productOrders")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "approved"),
          q.eq(q.field("status"), "shipped")
        )
      )
      .collect();

    const pendingOrder =
      orders.find((order) =>
        order.items.some(
          (item) => item.catalog_product_id === product.catalog_product_id
        )
      ) || null;

    if (!pendingOrder) return { product, pendingOrder: null, alreadyReceived: 0 };

    // Sum how many units of this product have already been received against this order
    const movements = await ctx.db
      .query("stockMovements")
      .withIndex("by_product", (q) => q.eq("product_id", product._id as string))
      .filter((q) => q.eq(q.field("reference_id"), pendingOrder.order_number))
      .collect();

    const alreadyReceived = movements.reduce((sum, m) => sum + m.quantity_change, 0);

    return { product, pendingOrder, alreadyReceived };
  },
});

/**
 * Receive branch stock — creates a new FIFO batch for a branch product
 */
export const receiveBranchStock = mutation({
  args: {
    product_id: v.id("products"),
    quantity: v.number(),
    cost_per_unit: v.optional(v.number()),
    supplier: v.optional(v.string()),
    expiry_date: v.optional(v.number()),
    notes: v.optional(v.string()),
    created_by: v.id("users"),
    scanned_barcode: v.optional(v.string()),
    order_number: v.optional(v.string()), // Links this receipt to a specific order
  },
  handler: async (ctx, args) => {
    if (args.quantity <= 0) {
      throw new Error("Quantity must be greater than 0");
    }

    const product = await ctx.db.get(args.product_id);
    if (!product) throw new Error("Product not found");

    const now = Date.now();
    const year = new Date().getFullYear();
    const randomPart = Math.floor(Math.random() * 100000).toString().padStart(5, "0");
    const batchNumber = `BATCH-${year}-${randomPart}`;

    const batchId = await ctx.db.insert("inventoryBatches", {
      product_id: args.product_id,
      product_type: "branch" as const,
      branch_id: product.branch_id,
      batch_number: batchNumber,
      quantity: args.quantity,
      initial_quantity: args.quantity,
      received_at: now,
      expiry_date: args.expiry_date,
      cost_per_unit: args.cost_per_unit,
      supplier: args.supplier?.trim(),
      notes: args.notes?.trim() || (args.scanned_barcode ? `Scanned: ${args.scanned_barcode}` : ""),
      created_by: args.created_by,
      created_at: now,
    });

    const newStock = product.stock + args.quantity;
    await ctx.db.patch(args.product_id, { stock: newStock });

    // Audit log — use order_number as reference_id when provided so we can
    // sum cumulative received quantities against that order
    await ctx.db.insert("stockMovements", {
      branch_id: product.branch_id,
      product_id: args.product_id,
      product_name: product.name,
      type: "received",
      quantity_change: args.quantity,
      quantity_before: product.stock,
      quantity_after: newStock,
      reference_id: args.order_number ?? batchNumber,
      notes: args.notes?.trim() || (args.scanned_barcode ? `Barcode: ${args.scanned_barcode}` : undefined),
      created_by: args.created_by,
      created_at: now,
    });

    // Auto-mark the order as received once every item has been fully received via barcode
    if (args.order_number) {
      const order = await ctx.db
        .query("productOrders")
        .withIndex("by_order_number", (q) => q.eq("order_number", args.order_number!))
        .first();

      if (order && (order.status === "shipped" || order.status === "approved")) {
        let allFullyReceived = true;

        for (const orderItem of order.items) {
          const orderedQty = orderItem.quantity_approved ?? orderItem.quantity_requested;

          const branchProduct = await ctx.db
            .query("products")
            .withIndex("by_branch_catalog", (q) =>
              q.eq("branch_id", order.branch_id).eq("catalog_product_id", orderItem.catalog_product_id)
            )
            .first();

          if (!branchProduct) {
            allFullyReceived = false;
            break;
          }

          const movements = await ctx.db
            .query("stockMovements")
            .withIndex("by_product", (q) => q.eq("product_id", branchProduct._id as string))
            .filter((q) => q.eq(q.field("reference_id"), args.order_number!))
            .collect();

          const totalReceived = movements.reduce((sum, m) => sum + m.quantity_change, 0);

          if (totalReceived < orderedQty) {
            allFullyReceived = false;
            break;
          }
        }

        if (allFullyReceived) {
          await ctx.db.patch(order._id, {
            status: "received",
            received_at: now,
          });
        }
      }
    }

    return {
      success: true,
      batchId,
      batchNumber,
      previousStock: product.stock,
      newStock,
    };
  },
});

// ============================================================
// STOCK MOVEMENT QUERY
// ============================================================

/**
 * Paginated stock movement audit log for a branch.
 */
export const getStockMovements = query({
  args: {
    branch_id: v.id("branches"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const movements = await ctx.db
      .query("stockMovements")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .order("desc")
      .take(args.limit ?? 50);
    return movements;
  },
});

// ============================================================
// EXPIRY ALERT QUERIES
// ============================================================

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Summary counts of expiring/expired batches for a branch (for badges/widgets).
 */
export const getExpiryAlertSummary = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const batches = await ctx.db
      .query("inventoryBatches")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .filter((q) => q.gt(q.field("quantity"), 0))
      .collect();

    const withExpiry = batches.filter((b) => b.expiry_date != null);
    const expired = withExpiry.filter((b) => b.expiry_date! < now).length;
    const critical = withExpiry.filter(
      (b) => b.expiry_date! >= now && b.expiry_date! < now + 7 * DAY_MS
    ).length;
    const warning = withExpiry.filter(
      (b) => b.expiry_date! >= now + 7 * DAY_MS && b.expiry_date! < now + 30 * DAY_MS
    ).length;

    return { expired, critical, warning, total: expired + critical + warning };
  },
});

/**
 * Products with batches expiring within 90 days (or already expired), sorted by urgency.
 */
export const getExpiringProducts = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const WINDOW = 90 * DAY_MS;

    const batches = await ctx.db
      .query("inventoryBatches")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .filter((q) => q.gt(q.field("quantity"), 0))
      .collect();

    // Only batches that have an expiry date within the 90-day window (or expired)
    const relevant = batches.filter(
      (b) => b.expiry_date != null && b.expiry_date < now + WINDOW
    );
    if (relevant.length === 0) return [];

    // Group by product_id
    const byProduct = new Map<string, typeof relevant>();
    for (const batch of relevant) {
      const list = byProduct.get(batch.product_id) ?? [];
      list.push(batch);
      byProduct.set(batch.product_id, list);
    }

    const result: {
      product_id: string;
      product_name: string;
      stock: number;
      urgency: "expired" | "critical" | "warning" | "notice";
      days_left: number;
      batches: { batch_number: string; expiry_date: number; quantity: number }[];
    }[] = [];

    for (const [productId, productBatches] of byProduct) {
      const product = await ctx.db.get(productId as any);
      if (!product) continue;

      const sortedBatches = [...productBatches].sort(
        (a, b) => (a.expiry_date ?? 0) - (b.expiry_date ?? 0)
      );
      const minExpiry = sortedBatches[0].expiry_date!;
      const daysLeft = Math.ceil((minExpiry - now) / DAY_MS);
      const urgency =
        daysLeft <= 0 ? "expired" :
        daysLeft <= 7 ? "critical" :
        daysLeft <= 30 ? "warning" : "notice";

      result.push({
        product_id: productId,
        product_name: (product as any).name,
        stock: (product as any).stock,
        urgency,
        days_left: daysLeft,
        batches: sortedBatches.map((b) => ({
          batch_number: b.batch_number,
          expiry_date: b.expiry_date!,
          quantity: b.quantity,
        })),
      });
    }

    return result.sort((a, b) => a.days_left - b.days_left);
  },
});

/**
 * Count of active branch products at or below minStock (for badge).
 */
export const getLowStockCount = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
    return products.filter((p) => p.stock <= p.minStock).length;
  },
});

/**
 * Generate initial batch for existing products that have stock but no batch records.
 * Creates a single FIFO batch using the product's current stock and cost.
 */
export const generateInitialBatch = mutation({
  args: {
    product_id: v.id("products"),
    created_by: v.id("users"),
    expiry_date: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.product_id);
    if (!product) throw new Error("Product not found");
    if (product.stock <= 0) throw new Error("Product has no stock to batch");

    // Check if product already has active batches
    const existingBatches = await ctx.db
      .query("inventoryBatches")
      .withIndex("by_product", (q) => q.eq("product_id", args.product_id))
      .filter((q) => q.gt(q.field("quantity"), 0))
      .collect();

    if (existingBatches.length > 0) {
      throw new Error("Product already has active batches");
    }

    const now = Date.now();
    const batchNumber = `BATCH-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000).toString().padStart(5, "0")}`;

    await ctx.db.insert("inventoryBatches", {
      product_id: args.product_id,
      product_type: "branch" as const,
      branch_id: product.branch_id,
      batch_number: batchNumber,
      quantity: product.stock,
      initial_quantity: product.stock,
      received_at: product.createdAt ?? now,
      expiry_date: args.expiry_date,
      cost_per_unit: product.cost,
      supplier: "Initial Stock",
      notes: "Auto-generated batch for existing inventory",
      created_by: args.created_by,
      created_at: now,
    });

    return { batchNumber, quantity: product.stock };
  },
});

/**
 * Bulk-generate initial batches for all branch products missing batch records.
 */
export const generateInitialBatchesForBranch = mutation({
  args: {
    branch_id: v.id("branches"),
    created_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .filter((q) => q.gt(q.field("stock"), 0))
      .collect();

    const now = Date.now();
    let created = 0;

    for (const product of products) {
      const existingBatches = await ctx.db
        .query("inventoryBatches")
        .withIndex("by_product", (q) => q.eq("product_id", product._id))
        .filter((q) => q.gt(q.field("quantity"), 0))
        .collect();

      if (existingBatches.length > 0) continue;

      const batchNumber = `BATCH-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000).toString().padStart(5, "0")}`;

      await ctx.db.insert("inventoryBatches", {
        product_id: product._id,
        product_type: "branch" as const,
        branch_id: args.branch_id,
        batch_number: batchNumber,
        quantity: product.stock,
        initial_quantity: product.stock,
        received_at: product.createdAt ?? now,
        expiry_date: undefined,
        cost_per_unit: product.cost,
        supplier: "Initial Stock",
        notes: "Auto-generated batch for existing inventory",
        created_by: args.created_by,
        created_at: now,
      });
      created++;
    }

    return { created, total: products.length };
  },
});