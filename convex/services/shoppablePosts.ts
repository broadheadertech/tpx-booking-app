/**
 * Shoppable Posts Service
 * BT3: In-feed product commerce - tag products in posts for direct purchase
 *
 * @module convex/services/shoppablePosts
 */

import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";

// ============================================================
// PRODUCT TAGGING
// ============================================================

/**
 * Tag products in a post
 * Can be called when creating or editing a post
 */
export const tagProductsInPost = mutation({
  args: {
    postId: v.id("branch_posts"),
    products: v.array(v.object({
      product_id: v.id("products"),
      position: v.optional(v.object({
        x: v.number(),
        y: v.number(),
      })),
      note: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerk_user_id", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    // Only author or admin can tag products
    const isAuthor = post.author_id === user._id;
    const isAdmin = user.role === "super_admin" || user.role === "branch_admin" || user.role === "admin";

    if (!isAuthor && !isAdmin) {
      throw new Error("You can only tag products in your own posts");
    }

    // Validate all products exist and belong to the same branch
    for (const item of args.products) {
      const product = await ctx.db.get(item.product_id);
      if (!product) {
        throw new Error(`Product ${item.product_id} not found`);
      }
      if (product.branch_id !== post.branch_id) {
        throw new Error("Products must belong to the same branch as the post");
      }
      if (product.status !== "active") {
        throw new Error(`Product "${product.name}" is not available`);
      }
    }

    await ctx.db.patch(args.postId, {
      tagged_products: args.products,
      is_shoppable: args.products.length > 0,
      updatedAt: Date.now(),
    });

    return { success: true, productCount: args.products.length };
  },
});

/**
 * Remove product tags from a post
 */
export const removeProductTags = mutation({
  args: {
    postId: v.id("branch_posts"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerk_user_id", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    const isAuthor = post.author_id === user._id;
    const isAdmin = user.role === "super_admin" || user.role === "branch_admin" || user.role === "admin";

    if (!isAuthor && !isAdmin) {
      throw new Error("You can only modify your own posts");
    }

    await ctx.db.patch(args.postId, {
      tagged_products: undefined,
      is_shoppable: false,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================================
// PRODUCT QUERIES
// ============================================================

/**
 * Get products for a branch (for tagging UI)
 */
export const getBranchProductsForTagging = query({
  args: {
    branchId: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_branch_status", (q) =>
        q.eq("branch_id", args.branchId).eq("status", "active")
      )
      .collect();

    // Return simplified product info for tagging UI
    return products.map((p) => ({
      _id: p._id,
      name: p.name,
      price: p.price,
      imageUrl: p.imageUrl,
      category: p.category,
      brand: p.brand,
      stock: p.stock,
    }));
  },
});

/**
 * Get full product details for tagged products in a post
 */
export const getTaggedProductDetails = query({
  args: {
    postId: v.id("branch_posts"),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post || !post.tagged_products || post.tagged_products.length === 0) {
      return [];
    }

    const products = await Promise.all(
      post.tagged_products.map(async (tag) => {
        const product = await ctx.db.get(tag.product_id);
        if (!product || product.status !== "active") return null;

        // Get image URL from storage if available
        let imageUrl = product.imageUrl;
        if (product.imageStorageId) {
          imageUrl = await ctx.storage.getUrl(product.imageStorageId);
        }

        return {
          _id: product._id,
          name: product.name,
          description: product.description,
          price: product.price,
          imageUrl,
          category: product.category,
          brand: product.brand,
          stock: product.stock,
          inStock: product.stock > 0,
          // Tag-specific data
          position: tag.position,
          note: tag.note,
        };
      })
    );

    return products.filter((p): p is NonNullable<typeof p> => p !== null);
  },
});

/**
 * Get shoppable posts for a branch
 */
export const getShoppablePosts = query({
  args: {
    branchId: v.optional(v.id("branches")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    let posts;
    if (args.branchId) {
      posts = await ctx.db
        .query("branch_posts")
        .withIndex("by_branch_shoppable", (q) =>
          q.eq("branch_id", args.branchId).eq("is_shoppable", true)
        )
        .order("desc")
        .take(limit);
    } else {
      // Get all shoppable posts
      posts = await ctx.db
        .query("branch_posts")
        .withIndex("by_created_at")
        .order("desc")
        .filter((q) =>
          q.and(
            q.eq(q.field("status"), "published"),
            q.eq(q.field("is_shoppable"), true)
          )
        )
        .take(limit);
    }

    // Filter to only published
    posts = posts.filter((p) => p.status === "published");

    // Enrich with product and author info
    const enriched = await Promise.all(
      posts.map(async (post) => {
        const author = await ctx.db.get(post.author_id);
        let barberInfo = null;

        if (author && author.role === "barber") {
          barberInfo = await ctx.db
            .query("barbers")
            .withIndex("by_user", (q) => q.eq("user", author._id))
            .first();
        }

        // Get product summaries
        const productSummaries = await Promise.all(
          (post.tagged_products || []).map(async (tag) => {
            const product = await ctx.db.get(tag.product_id);
            if (!product) return null;

            let imageUrl = product.imageUrl;
            if (product.imageStorageId) {
              imageUrl = await ctx.storage.getUrl(product.imageStorageId);
            }

            return {
              _id: product._id,
              name: product.name,
              price: product.price,
              imageUrl,
              inStock: product.stock > 0,
            };
          })
        );

        return {
          ...post,
          author: author ? {
            _id: author._id,
            name: barberInfo?.full_name || author.nickname || author.username,
            avatar: barberInfo?.avatar || author.avatar_url,
          } : null,
          products: productSummaries.filter((p) => p !== null),
          totalProductValue: productSummaries
            .filter((p) => p !== null)
            .reduce((sum, p) => sum + (p?.price || 0), 0),
        };
      })
    );

    return enriched;
  },
});

// ============================================================
// ENGAGEMENT TRACKING
// ============================================================

/**
 * Track when a user clicks on a product in a post
 */
export const trackProductClick = mutation({
  args: {
    postId: v.id("branch_posts"),
    productId: v.id("products"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) return { success: false };

    await ctx.db.patch(args.postId, {
      product_clicks: (post.product_clicks || 0) + 1,
    });

    return { success: true };
  },
});

/**
 * Record a purchase from a shoppable post
 */
export const recordPostPurchase = mutation({
  args: {
    postId: v.id("branch_posts"),
    productId: v.id("products"),
    userId: v.optional(v.id("users")),
    quantity: v.number(),
    unitPrice: v.number(),
    transactionId: v.optional(v.id("transactions")),
    source: v.union(
      v.literal("feed_quick_buy"),
      v.literal("feed_add_to_cart"),
      v.literal("product_modal")
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Record the purchase
    await ctx.db.insert("post_product_purchases", {
      post_id: args.postId,
      product_id: args.productId,
      user_id: args.userId,
      transaction_id: args.transactionId,
      quantity: args.quantity,
      unit_price: args.unitPrice,
      total_price: args.unitPrice * args.quantity,
      source: args.source,
      createdAt: now,
    });

    // Update post's purchase count
    const post = await ctx.db.get(args.postId);
    if (post) {
      await ctx.db.patch(args.postId, {
        product_purchases: (post.product_purchases || 0) + 1,
      });
    }

    return { success: true };
  },
});

// ============================================================
// QUICK PURCHASE
// ============================================================

/**
 * Add product from post to user's cart/pending purchase
 * This creates a lightweight "cart item" that can be completed at checkout
 */
export const addToCartFromPost = mutation({
  args: {
    postId: v.id("branch_posts"),
    productId: v.id("products"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Please log in to add items to cart");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerk_user_id", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    if (product.status !== "active") {
      throw new Error("Product is not available");
    }

    if (product.stock < args.quantity) {
      throw new Error(`Only ${product.stock} items in stock`);
    }

    // Track the click
    await ctx.db.patch(args.postId, {
      product_clicks: ((await ctx.db.get(args.postId))?.product_clicks || 0) + 1,
    });

    // Return product info for cart (actual cart storage is client-side)
    return {
      success: true,
      cartItem: {
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: args.quantity,
        imageUrl: product.imageUrl,
        branchId: product.branch_id,
        sourcePostId: args.postId,
      },
    };
  },
});

// ============================================================
// ANALYTICS
// ============================================================

/**
 * Get shoppable post analytics for a branch
 */
export const getShoppablePostAnalytics = query({
  args: {
    branchId: v.id("branches"),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days || 30;
    const startDate = Date.now() - days * 24 * 60 * 60 * 1000;

    // Get all shoppable posts for the branch
    const posts = await ctx.db
      .query("branch_posts")
      .withIndex("by_branch_shoppable", (q) =>
        q.eq("branch_id", args.branchId).eq("is_shoppable", true)
      )
      .collect();

    // Get all purchases for these posts in the date range
    const allPurchases = await ctx.db
      .query("post_product_purchases")
      .withIndex("by_created", (q) => q.gte("createdAt", startDate))
      .collect();

    // Filter to this branch's posts
    const postIds = new Set(posts.map((p) => p._id.toString()));
    const branchPurchases = allPurchases.filter((p) =>
      postIds.has(p.post_id.toString())
    );

    // Calculate metrics
    const totalClicks = posts.reduce((sum, p) => sum + (p.product_clicks || 0), 0);
    const totalPurchases = branchPurchases.length;
    const totalRevenue = branchPurchases.reduce((sum, p) => sum + p.total_price, 0);
    const conversionRate = totalClicks > 0 ? (totalPurchases / totalClicks) * 100 : 0;

    // Top performing posts
    const postPerformance = posts
      .map((post) => {
        const postPurchases = branchPurchases.filter(
          (p) => p.post_id.toString() === post._id.toString()
        );
        return {
          postId: post._id,
          content: post.content.slice(0, 50) + "...",
          clicks: post.product_clicks || 0,
          purchases: postPurchases.length,
          revenue: postPurchases.reduce((sum, p) => sum + p.total_price, 0),
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Top selling products from posts
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
    for (const purchase of branchPurchases) {
      const key = purchase.product_id.toString();
      if (!productSales[key]) {
        const product = await ctx.db.get(purchase.product_id);
        productSales[key] = {
          name: product?.name || "Unknown",
          quantity: 0,
          revenue: 0,
        };
      }
      productSales[key].quantity += purchase.quantity;
      productSales[key].revenue += purchase.total_price;
    }

    const topProducts = Object.entries(productSales)
      .map(([id, data]) => ({ productId: id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      summary: {
        totalShoppablePosts: posts.length,
        totalClicks,
        totalPurchases,
        totalRevenue,
        conversionRate: conversionRate.toFixed(2) + "%",
        avgOrderValue: totalPurchases > 0 ? totalRevenue / totalPurchases : 0,
      },
      topPosts: postPerformance,
      topProducts,
      periodDays: days,
    };
  },
});

/**
 * Get post conversion funnel data
 */
export const getPostConversionFunnel = query({
  args: {
    postId: v.id("branch_posts"),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) return null;

    const purchases = await ctx.db
      .query("post_product_purchases")
      .withIndex("by_post", (q) => q.eq("post_id", args.postId))
      .collect();

    return {
      views: post.view_count || 0,
      productClicks: post.product_clicks || 0,
      purchases: purchases.length,
      revenue: purchases.reduce((sum, p) => sum + p.total_price, 0),
      viewToClickRate: post.view_count
        ? (((post.product_clicks || 0) / post.view_count) * 100).toFixed(2) + "%"
        : "0%",
      clickToPurchaseRate: (post.product_clicks || 0)
        ? ((purchases.length / (post.product_clicks || 1)) * 100).toFixed(2) + "%"
        : "0%",
    };
  },
});
