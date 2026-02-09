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
    
    return products;
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