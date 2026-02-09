import { v, ConvexError } from "convex/values";
import { query, mutation } from "../_generated/server";

/**
 * Generate upload URL for product images
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Get image URL from storage ID
 */
export const getImageUrl = query({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

/**
 * Delete image from storage
 */
export const deleteImage = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await ctx.storage.delete(args.storageId);
    return { success: true };
  },
});

/**
 * Add a new product to the central warehouse inventory
 * Only super_admin can add products
 */
export const addProduct = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    price: v.number(),
    cost: v.optional(v.number()),
    category: v.string(),
    brand: v.optional(v.string()),
    sku: v.optional(v.string()),
    image_url: v.optional(v.string()),
    image_storage_id: v.optional(v.id("_storage")),
    stock: v.optional(v.number()),
    minStock: v.optional(v.number()),
    created_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Validate name is not empty
    if (!args.name.trim()) {
      throw new ConvexError({
        code: "INVALID_NAME",
        message: "Product name is required",
      });
    }

    // Validate price is positive
    if (args.price <= 0) {
      throw new ConvexError({
        code: "INVALID_PRICE",
        message: "Price must be greater than 0",
      });
    }

    // Validate category is not empty
    if (!args.category.trim()) {
      throw new ConvexError({
        code: "INVALID_CATEGORY",
        message: "Category is required",
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

    const now = Date.now();
    const productId = await ctx.db.insert("productCatalog", {
      name: args.name.trim(),
      description: args.description?.trim(),
      price: args.price,
      cost: args.cost,
      category: args.category,
      brand: args.brand?.trim(),
      sku: args.sku?.trim(),
      image_url: args.image_url,
      image_storage_id: args.image_storage_id,
      stock: args.stock ?? 0,
      minStock: args.minStock ?? 10,
      is_active: true,
      price_enforced: false,
      created_at: now,
      created_by: args.created_by,
    });

    return {
      success: true,
      productId,
      createdAt: now,
    };
  },
});

/**
 * Update an existing product in the central warehouse
 */
export const updateProduct = mutation({
  args: {
    product_id: v.id("productCatalog"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    original_price: v.optional(v.number()),
    cost: v.optional(v.number()),
    category: v.optional(v.string()),
    brand: v.optional(v.string()),
    sku: v.optional(v.string()),
    image_url: v.optional(v.string()),
    image_storage_id: v.optional(v.id("_storage")),
    minStock: v.optional(v.number()),
    is_active: v.optional(v.boolean()),
    price_enforced: v.optional(v.boolean()),
    // Promo/Discount fields
    discount_percent: v.optional(v.number()),
    promo_label: v.optional(v.string()),
    promo_start: v.optional(v.number()),
    promo_end: v.optional(v.number()),
    promo_quantity_limit: v.optional(v.number()),
    is_featured: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.product_id);
    if (!product) {
      throw new ConvexError({
        code: "PRODUCT_NOT_FOUND",
        message: "Product not found",
      });
    }

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};

    if (args.name !== undefined) {
      if (!args.name.trim()) {
        throw new ConvexError({
          code: "INVALID_NAME",
          message: "Product name cannot be empty",
        });
      }
      updates.name = args.name.trim();
    }

    if (args.description !== undefined) {
      updates.description = args.description?.trim();
    }

    if (args.price !== undefined) {
      if (args.price <= 0) {
        throw new ConvexError({
          code: "INVALID_PRICE",
          message: "Price must be greater than 0",
        });
      }
      updates.price = args.price;
    }

    if (args.cost !== undefined) updates.cost = args.cost;
    if (args.original_price !== undefined) updates.original_price = args.original_price;
    if (args.category !== undefined) updates.category = args.category;
    if (args.brand !== undefined) updates.brand = args.brand?.trim();
    if (args.sku !== undefined) updates.sku = args.sku?.trim();
    if (args.image_url !== undefined) updates.image_url = args.image_url;
    if (args.image_storage_id !== undefined) updates.image_storage_id = args.image_storage_id;
    if (args.minStock !== undefined) updates.minStock = args.minStock;
    if (args.is_active !== undefined) updates.is_active = args.is_active;
    if (args.price_enforced !== undefined) updates.price_enforced = args.price_enforced;
    // Promo/Discount fields
    if (args.discount_percent !== undefined) updates.discount_percent = args.discount_percent;
    if (args.promo_label !== undefined) updates.promo_label = args.promo_label?.trim();
    if (args.promo_start !== undefined) updates.promo_start = args.promo_start;
    if (args.promo_end !== undefined) updates.promo_end = args.promo_end;
    if (args.promo_quantity_limit !== undefined) updates.promo_quantity_limit = args.promo_quantity_limit;
    if (args.is_featured !== undefined) updates.is_featured = args.is_featured;

    await ctx.db.patch(args.product_id, updates);

    return { success: true };
  },
});

/**
 * Soft delete a product (set is_active to false)
 */
export const deleteProduct = mutation({
  args: {
    product_id: v.id("productCatalog"),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.product_id);
    if (!product) {
      throw new ConvexError({
        code: "PRODUCT_NOT_FOUND",
        message: "Product not found",
      });
    }

    await ctx.db.patch(args.product_id, { is_active: false });
    return { success: true };
  },
});

/**
 * Update stock level directly (for adjustments)
 */
export const updateStock = mutation({
  args: {
    product_id: v.id("productCatalog"),
    adjustment: v.number(), // Positive to add, negative to subtract
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.product_id);
    if (!product) {
      throw new ConvexError({
        code: "PRODUCT_NOT_FOUND",
        message: "Product not found",
      });
    }

    const newStock = product.stock + args.adjustment;
    if (newStock < 0) {
      throw new ConvexError({
        code: "INSUFFICIENT_STOCK",
        message: "Cannot reduce stock below 0",
      });
    }

    await ctx.db.patch(args.product_id, { stock: newStock });

    return {
      success: true,
      previousStock: product.stock,
      newStock,
    };
  },
});

/**
 * Receive stock - creates a new batch for FIFO tracking
 */
export const receiveStock = mutation({
  args: {
    product_id: v.id("productCatalog"),
    quantity: v.number(),
    cost_per_unit: v.optional(v.number()),
    supplier: v.optional(v.string()),
    expiry_date: v.optional(v.number()),
    notes: v.optional(v.string()),
    created_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    if (args.quantity <= 0) {
      throw new ConvexError({
        code: "INVALID_QUANTITY",
        message: "Quantity must be greater than 0",
      });
    }

    const product = await ctx.db.get(args.product_id);
    if (!product) {
      throw new ConvexError({
        code: "PRODUCT_NOT_FOUND",
        message: "Product not found",
      });
    }

    const now = Date.now();

    // Generate batch number: BATCH-YYYY-XXXXX
    const year = new Date().getFullYear();
    const randomPart = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, "0");
    const batchNumber = `BATCH-${year}-${randomPart}`;

    // Create inventory batch for FIFO tracking
    const batchId = await ctx.db.insert("inventoryBatches", {
      product_id: args.product_id,
      product_type: "central",
      branch_id: undefined,
      batch_number: batchNumber,
      quantity: args.quantity,
      initial_quantity: args.quantity,
      received_at: now,
      expiry_date: args.expiry_date,
      cost_per_unit: args.cost_per_unit,
      supplier: args.supplier?.trim(),
      notes: args.notes?.trim(),
      created_by: args.created_by,
      created_at: now,
    });

    // Update product total stock
    const newStock = product.stock + args.quantity;
    await ctx.db.patch(args.product_id, { stock: newStock });

    return {
      success: true,
      batchId,
      batchNumber,
      previousStock: product.stock,
      newStock,
    };
  },
});

/**
 * Consume stock using FIFO (First In, First Out)
 * Takes from oldest batches first
 */
export const consumeStock = mutation({
  args: {
    product_id: v.id("productCatalog"),
    quantity: v.number(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.quantity <= 0) {
      throw new ConvexError({
        code: "INVALID_QUANTITY",
        message: "Quantity must be greater than 0",
      });
    }

    const product = await ctx.db.get(args.product_id);
    if (!product) {
      throw new ConvexError({
        code: "PRODUCT_NOT_FOUND",
        message: "Product not found",
      });
    }

    if (product.stock < args.quantity) {
      throw new ConvexError({
        code: "INSUFFICIENT_STOCK",
        message: `Insufficient stock. Available: ${product.stock}, Requested: ${args.quantity}`,
      });
    }

    // Get batches sorted by received_at (oldest first - FIFO)
    const batches = await ctx.db
      .query("inventoryBatches")
      .withIndex("by_product", (q) => q.eq("product_id", args.product_id))
      .filter((q) => q.gt(q.field("quantity"), 0))
      .collect();

    // Sort by received_at ascending (oldest first)
    batches.sort((a, b) => a.received_at - b.received_at);

    // Consume from oldest batches first
    let remaining = args.quantity;
    const consumedBatches: Array<{ batchId: string; consumed: number }> = [];

    for (const batch of batches) {
      if (remaining <= 0) break;

      const take = Math.min(batch.quantity, remaining);
      await ctx.db.patch(batch._id, { quantity: batch.quantity - take });
      consumedBatches.push({ batchId: batch._id, consumed: take });
      remaining -= take;
    }

    // Update product total stock
    const newStock = product.stock - args.quantity;
    await ctx.db.patch(args.product_id, { stock: newStock });

    return {
      success: true,
      previousStock: product.stock,
      newStock,
      consumedBatches,
    };
  },
});

/**
 * Get all active products in the catalog with image URLs resolved
 * Available to all authenticated users
 */
export const getCatalogProducts = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db
      .query("productCatalog")
      .withIndex("by_is_active", (q) => q.eq("is_active", true))
      .order("asc")
      .collect();

    // Resolve image URLs for products with storage IDs
    const productsWithImages = await Promise.all(
      products.map(async (product) => {
        let resolvedImageUrl = product.image_url;

        if (product.image_storage_id) {
          const storageUrl = await ctx.storage.getUrl(product.image_storage_id);
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
 * Get a single product by ID with its batches
 */
export const getProductById = query({
  args: {
    product_id: v.id("productCatalog"),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.product_id);
    if (!product) return null;

    let resolvedImageUrl = product.image_url;
    if (product.image_storage_id) {
      const storageUrl = await ctx.storage.getUrl(product.image_storage_id);
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
  },
});

/**
 * Get product with its inventory batches (for FIFO view)
 */
export const getProductWithBatches = query({
  args: {
    product_id: v.id("productCatalog"),
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

    let resolvedImageUrl = product.image_url;
    if (product.image_storage_id) {
      const storageUrl = await ctx.storage.getUrl(product.image_storage_id);
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
 * Get products by category
 */
export const getProductsByCategory = query({
  args: {
    category: v.string(),
  },
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("productCatalog")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .filter((q) => q.eq(q.field("is_active"), true))
      .collect();

    // Resolve image URLs
    const productsWithImages = await Promise.all(
      products.map(async (product) => {
        let resolvedImageUrl = product.image_url;

        if (product.image_storage_id) {
          const storageUrl = await ctx.storage.getUrl(product.image_storage_id);
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
 * Get low stock products (stock <= minStock)
 */
export const getLowStockProducts = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db
      .query("productCatalog")
      .withIndex("by_is_active", (q) => q.eq("is_active", true))
      .collect();

    // Filter low stock products
    const lowStockProducts = products.filter(
      (p) => p.stock <= p.minStock
    );

    // Resolve image URLs
    const productsWithImages = await Promise.all(
      lowStockProducts.map(async (product) => {
        let resolvedImageUrl = product.image_url;

        if (product.image_storage_id) {
          const storageUrl = await ctx.storage.getUrl(product.image_storage_id);
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
 * Get inventory summary statistics
 */
export const getInventorySummary = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db
      .query("productCatalog")
      .withIndex("by_is_active", (q) => q.eq("is_active", true))
      .collect();

    const totalProducts = products.length;
    const inStock = products.filter((p) => p.stock > p.minStock).length;
    const lowStock = products.filter(
      (p) => p.stock > 0 && p.stock <= p.minStock
    ).length;
    const outOfStock = products.filter((p) => p.stock === 0).length;
    const totalValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);
    const totalCost = products.reduce(
      (sum, p) => sum + (p.cost ?? 0) * p.stock,
      0
    );

    return {
      totalProducts,
      inStock,
      lowStock,
      outOfStock,
      totalValue,
      totalCost,
      potentialProfit: totalValue - totalCost,
    };
  },
});
