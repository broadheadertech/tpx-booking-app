import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

/**
 * Shop Banners Service - Manage promotional carousel banners
 */

// Get all active banners for customer shop (respects scheduling)
export const getActiveBanners = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const banners = await ctx.db
      .query("shopBanners")
      .withIndex("by_active_sort", (q) => q.eq("is_active", true))
      .collect();

    // Filter by date range and sort by order
    const activeBanners = banners
      .filter((b) => {
        if (b.start_date && now < b.start_date) return false;
        if (b.end_date && now > b.end_date) return false;
        return true;
      })
      .sort((a, b) => a.sort_order - b.sort_order);

    // Resolve image URLs from storage
    const bannersWithImages = await Promise.all(
      activeBanners.map(async (banner) => {
        let imageUrl = banner.image_url;
        if (banner.image_storage_id) {
          const url = await ctx.storage.getUrl(banner.image_storage_id);
          if (url) imageUrl = url;
        }

        // If linked to a product, fetch product details
        let product = null;
        if (banner.product_id) {
          const prod = await ctx.db.get(banner.product_id);
          if (prod) {
            let prodImageUrl = (prod as any).image_url;
            if ((prod as any).image_storage_id) {
              const url = await ctx.storage.getUrl((prod as any).image_storage_id);
              if (url) prodImageUrl = url;
            }
            product = {
              _id: prod._id,
              name: (prod as any).name,
              price: (prod as any).price,
              discount_percent: (prod as any).discount_percent,
              imageUrl: prodImageUrl,
            };
          }
        }

        return {
          ...banner,
          imageUrl,
          product,
        };
      })
    );

    return bannersWithImages;
  },
});

// Get all banners for admin management
export const getAllBanners = query({
  args: {},
  handler: async (ctx) => {
    const banners = await ctx.db
      .query("shopBanners")
      .order("asc")
      .collect();

    // Resolve image URLs and add creator info
    const bannersWithDetails = await Promise.all(
      banners.map(async (banner) => {
        let imageUrl = banner.image_url;
        if (banner.image_storage_id) {
          const url = await ctx.storage.getUrl(banner.image_storage_id);
          if (url) imageUrl = url;
        }

        const creator = await ctx.db.get(banner.created_by);

        return {
          ...banner,
          imageUrl,
          creator_name: creator?.username || "Unknown",
        };
      })
    );

    return bannersWithDetails.sort((a, b) => a.sort_order - b.sort_order);
  },
});

// Create a new banner
export const createBanner = mutation({
  args: {
    type: v.union(
      v.literal("product_promo"),
      v.literal("custom_ad"),
      v.literal("external_link")
    ),
    title: v.string(),
    subtitle: v.optional(v.string()),
    badge: v.optional(v.string()),
    image_storage_id: v.optional(v.id("_storage")),
    image_url: v.optional(v.string()),
    link_type: v.union(
      v.literal("product"),
      v.literal("category"),
      v.literal("external"),
      v.literal("none")
    ),
    link_url: v.optional(v.string()),
    product_id: v.optional(v.id("productCatalog")),
    gradient: v.optional(v.string()),
    text_color: v.optional(v.string()),
    is_active: v.boolean(),
    sort_order: v.optional(v.number()),
    start_date: v.optional(v.number()),
    end_date: v.optional(v.number()),
    created_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const timestamp = Date.now();

    // Get max sort_order if not provided
    let sortOrder = args.sort_order;
    if (sortOrder === undefined) {
      const banners = await ctx.db.query("shopBanners").collect();
      const maxOrder = banners.reduce((max, b) => Math.max(max, b.sort_order), 0);
      sortOrder = maxOrder + 1;
    }

    const bannerId = await ctx.db.insert("shopBanners", {
      type: args.type,
      title: args.title.trim(),
      subtitle: args.subtitle?.trim(),
      badge: args.badge?.trim(),
      image_storage_id: args.image_storage_id,
      image_url: args.image_url?.trim(),
      link_type: args.link_type,
      link_url: args.link_url?.trim(),
      product_id: args.product_id,
      gradient: args.gradient || "from-[var(--color-primary)] to-orange-600",
      text_color: args.text_color || "white",
      is_active: args.is_active,
      sort_order: sortOrder,
      start_date: args.start_date,
      end_date: args.end_date,
      click_count: 0,
      impression_count: 0,
      created_by: args.created_by,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return { success: true, bannerId };
  },
});

// Update an existing banner
export const updateBanner = mutation({
  args: {
    banner_id: v.id("shopBanners"),
    type: v.optional(v.union(
      v.literal("product_promo"),
      v.literal("custom_ad"),
      v.literal("external_link")
    )),
    title: v.optional(v.string()),
    subtitle: v.optional(v.string()),
    badge: v.optional(v.string()),
    image_storage_id: v.optional(v.id("_storage")),
    image_url: v.optional(v.string()),
    link_type: v.optional(v.union(
      v.literal("product"),
      v.literal("category"),
      v.literal("external"),
      v.literal("none")
    )),
    link_url: v.optional(v.string()),
    product_id: v.optional(v.id("productCatalog")),
    gradient: v.optional(v.string()),
    text_color: v.optional(v.string()),
    is_active: v.optional(v.boolean()),
    sort_order: v.optional(v.number()),
    start_date: v.optional(v.number()),
    end_date: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const banner = await ctx.db.get(args.banner_id);
    if (!banner) {
      throw new Error("Banner not found");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.type !== undefined) updates.type = args.type;
    if (args.title !== undefined) updates.title = args.title.trim();
    if (args.subtitle !== undefined) updates.subtitle = args.subtitle?.trim();
    if (args.badge !== undefined) updates.badge = args.badge?.trim();
    if (args.image_storage_id !== undefined) updates.image_storage_id = args.image_storage_id;
    if (args.image_url !== undefined) updates.image_url = args.image_url?.trim();
    if (args.link_type !== undefined) updates.link_type = args.link_type;
    if (args.link_url !== undefined) updates.link_url = args.link_url?.trim();
    if (args.product_id !== undefined) updates.product_id = args.product_id;
    if (args.gradient !== undefined) updates.gradient = args.gradient;
    if (args.text_color !== undefined) updates.text_color = args.text_color;
    if (args.is_active !== undefined) updates.is_active = args.is_active;
    if (args.sort_order !== undefined) updates.sort_order = args.sort_order;
    if (args.start_date !== undefined) updates.start_date = args.start_date;
    if (args.end_date !== undefined) updates.end_date = args.end_date;

    await ctx.db.patch(args.banner_id, updates);

    return { success: true };
  },
});

// Delete a banner
export const deleteBanner = mutation({
  args: {
    banner_id: v.id("shopBanners"),
  },
  handler: async (ctx, args) => {
    const banner = await ctx.db.get(args.banner_id);
    if (!banner) {
      throw new Error("Banner not found");
    }

    // Delete associated storage image if exists
    if (banner.image_storage_id) {
      await ctx.storage.delete(banner.image_storage_id);
    }

    await ctx.db.delete(args.banner_id);

    return { success: true };
  },
});

// Toggle banner active status
export const toggleBannerActive = mutation({
  args: {
    banner_id: v.id("shopBanners"),
  },
  handler: async (ctx, args) => {
    const banner = await ctx.db.get(args.banner_id);
    if (!banner) {
      throw new Error("Banner not found");
    }

    await ctx.db.patch(args.banner_id, {
      is_active: !banner.is_active,
      updatedAt: Date.now(),
    });

    return { success: true, is_active: !banner.is_active };
  },
});

// Reorder banners
export const reorderBanners = mutation({
  args: {
    banner_ids: v.array(v.id("shopBanners")),
  },
  handler: async (ctx, args) => {
    const timestamp = Date.now();

    // Update sort_order for each banner based on position in array
    for (let i = 0; i < args.banner_ids.length; i++) {
      await ctx.db.patch(args.banner_ids[i], {
        sort_order: i,
        updatedAt: timestamp,
      });
    }

    return { success: true };
  },
});

// Track banner click
export const trackBannerClick = mutation({
  args: {
    banner_id: v.id("shopBanners"),
  },
  handler: async (ctx, args) => {
    const banner = await ctx.db.get(args.banner_id);
    if (!banner) return { success: false };

    await ctx.db.patch(args.banner_id, {
      click_count: (banner.click_count || 0) + 1,
    });

    return { success: true };
  },
});

// Track banner impression
export const trackBannerImpression = mutation({
  args: {
    banner_id: v.id("shopBanners"),
  },
  handler: async (ctx, args) => {
    const banner = await ctx.db.get(args.banner_id);
    if (!banner) return { success: false };

    await ctx.db.patch(args.banner_id, {
      impression_count: (banner.impression_count || 0) + 1,
    });

    return { success: true };
  },
});

// Get banner analytics
export const getBannerAnalytics = query({
  args: {},
  handler: async (ctx) => {
    const banners = await ctx.db.query("shopBanners").collect();

    const totalImpressions = banners.reduce((sum, b) => sum + (b.impression_count || 0), 0);
    const totalClicks = banners.reduce((sum, b) => sum + (b.click_count || 0), 0);
    const activeBanners = banners.filter((b) => b.is_active).length;

    const bannerStats = banners.map((b) => ({
      _id: b._id,
      title: b.title,
      type: b.type,
      impressions: b.impression_count || 0,
      clicks: b.click_count || 0,
      ctr: b.impression_count ? ((b.click_count || 0) / b.impression_count * 100).toFixed(2) : "0.00",
      is_active: b.is_active,
    }));

    return {
      totalImpressions,
      totalClicks,
      overallCTR: totalImpressions ? (totalClicks / totalImpressions * 100).toFixed(2) : "0.00",
      activeBanners,
      totalBanners: banners.length,
      bannerStats: bannerStats.sort((a, b) => b.clicks - a.clicks),
    };
  },
});
