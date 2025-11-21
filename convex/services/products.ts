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