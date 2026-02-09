import { v } from "convex/values";
import { query, mutation } from "../_generated/server";

/**
 * Wishlist Service - Customer product favorites
 */

// Add product to wishlist
export const addToWishlist = mutation({
  args: {
    user_id: v.id("users"),
    product_id: v.union(v.id("products"), v.id("productCatalog")),
  },
  handler: async (ctx, args) => {
    // Check if already in wishlist
    const existing = await ctx.db
      .query("wishlists")
      .withIndex("by_user_product", (q) =>
        q.eq("user_id", args.user_id).eq("product_id", args.product_id)
      )
      .first();

    if (existing) {
      return { success: true, alreadyExists: true, wishlistId: existing._id };
    }

    // Verify product exists (check both tables)
    const product = await ctx.db.get(args.product_id);
    if (!product) {
      throw new Error("Product not found");
    }

    // Add to wishlist
    const wishlistId = await ctx.db.insert("wishlists", {
      user_id: args.user_id,
      product_id: args.product_id,
      createdAt: Date.now(),
    });

    return { success: true, alreadyExists: false, wishlistId };
  },
});

// Remove product from wishlist
export const removeFromWishlist = mutation({
  args: {
    user_id: v.id("users"),
    product_id: v.union(v.id("products"), v.id("productCatalog")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("wishlists")
      .withIndex("by_user_product", (q) =>
        q.eq("user_id", args.user_id).eq("product_id", args.product_id)
      )
      .first();

    if (!existing) {
      return { success: true, wasRemoved: false };
    }

    await ctx.db.delete(existing._id);
    return { success: true, wasRemoved: true };
  },
});

// Toggle wishlist (add if not present, remove if present)
export const toggleWishlist = mutation({
  args: {
    user_id: v.id("users"),
    product_id: v.union(v.id("products"), v.id("productCatalog")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("wishlists")
      .withIndex("by_user_product", (q) =>
        q.eq("user_id", args.user_id).eq("product_id", args.product_id)
      )
      .first();

    if (existing) {
      // Remove from wishlist
      await ctx.db.delete(existing._id);
      return { isWishlisted: false };
    } else {
      // Verify product exists
      const product = await ctx.db.get(args.product_id);
      if (!product) {
        throw new Error("Product not found");
      }

      // Add to wishlist
      await ctx.db.insert("wishlists", {
        user_id: args.user_id,
        product_id: args.product_id,
        createdAt: Date.now(),
      });
      return { isWishlisted: true };
    }
  },
});

// Get user's wishlist with product details
export const getUserWishlist = query({
  args: {
    user_id: v.id("users"),
  },
  handler: async (ctx, args) => {
    const wishlistItems = await ctx.db
      .query("wishlists")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .order("desc")
      .collect();

    // Fetch product details for each wishlist item (supports both products and productCatalog)
    const itemsWithProducts = await Promise.all(
      wishlistItems.map(async (item) => {
        const product = await ctx.db.get(item.product_id);
        if (!product) {
          return { ...item, product: null };
        }

        // Resolve image URL for catalog products
        let imageUrl = (product as any).imageUrl || (product as any).image_url;
        const storageId = (product as any).imageStorageId || (product as any).image_storage_id;
        if (storageId) {
          const resolvedUrl = await ctx.storage.getUrl(storageId);
          if (resolvedUrl) imageUrl = resolvedUrl;
        }

        // Normalize product fields for consistent frontend usage
        return {
          ...item,
          product: {
            ...product,
            imageUrl,
            status: (product as any).status || ((product as any).is_active ? 'active' : 'inactive'),
          },
        };
      })
    );

    // Filter out items where product no longer exists
    return itemsWithProducts.filter((item) => item.product !== null);
  },
});

// Check if product is in user's wishlist
export const isProductWishlisted = query({
  args: {
    user_id: v.id("users"),
    product_id: v.union(v.id("products"), v.id("productCatalog")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("wishlists")
      .withIndex("by_user_product", (q) =>
        q.eq("user_id", args.user_id).eq("product_id", args.product_id)
      )
      .first();

    return { isWishlisted: !!existing };
  },
});

// Get user's wishlisted product IDs (for efficient bulk checking)
export const getUserWishlistIds = query({
  args: {
    user_id: v.id("users"),
  },
  handler: async (ctx, args) => {
    const wishlistItems = await ctx.db
      .query("wishlists")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .collect();

    return wishlistItems.map((item) => item.product_id);
  },
});

// Get wishlist count for a user
export const getWishlistCount = query({
  args: {
    user_id: v.id("users"),
  },
  handler: async (ctx, args) => {
    const wishlistItems = await ctx.db
      .query("wishlists")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .collect();

    return wishlistItems.length;
  },
});
