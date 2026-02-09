import { v } from "convex/values";
import { query, mutation } from "../_generated/server";

// Get all portfolio items for a barber
export const getBarberPortfolio = query({
  args: {
    barber_id: v.id("barbers"),
  },
  handler: async (ctx, args) => {
    const portfolioItems = await ctx.db
      .query("barber_portfolio")
      .withIndex("by_barber", (q) => q.eq("barber_id", args.barber_id))
      .order("desc")
      .collect();

    // Get image URLs for each portfolio item
    const itemsWithUrls = await Promise.all(
      portfolioItems.map(async (item) => {
        const imageUrl = await ctx.storage.getUrl(item.image_storage_id);
        return {
          ...item,
          imageUrl,
        };
      })
    );

    return itemsWithUrls;
  },
});

// Get featured portfolio items for a barber
export const getFeaturedPortfolio = query({
  args: {
    barber_id: v.id("barbers"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 6;
    const portfolioItems = await ctx.db
      .query("barber_portfolio")
      .withIndex("by_barber", (q) => q.eq("barber_id", args.barber_id))
      .filter((q) => q.eq(q.field("is_featured"), true))
      .order("desc")
      .take(limit);

    const itemsWithUrls = await Promise.all(
      portfolioItems.map(async (item) => {
        const imageUrl = await ctx.storage.getUrl(item.image_storage_id);
        return {
          ...item,
          imageUrl,
        };
      })
    );

    return itemsWithUrls;
  },
});

// Add portfolio item
export const addPortfolioItem = mutation({
  args: {
    barber_id: v.id("barbers"),
    branch_id: v.id("branches"),
    image_storage_id: v.id("_storage"),
    caption: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    is_featured: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("barber_portfolio", {
      barber_id: args.barber_id,
      branch_id: args.branch_id,
      image_storage_id: args.image_storage_id,
      caption: args.caption || "",
      tags: args.tags || [],
      likes_count: 0,
      is_featured: args.is_featured || false,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

// Update portfolio item
export const updatePortfolioItem = mutation({
  args: {
    id: v.id("barber_portfolio"),
    caption: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    is_featured: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

// Delete portfolio item
export const deletePortfolioItem = mutation({
  args: {
    id: v.id("barber_portfolio"),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (item) {
      // Delete the storage file
      await ctx.storage.delete(item.image_storage_id);
      await ctx.db.delete(args.id);
    }
    return { success: true };
  },
});

// Get all achievements for a barber
export const getBarberAchievements = query({
  args: {
    barber_id: v.id("barbers"),
  },
  handler: async (ctx, args) => {
    const achievements = await ctx.db
      .query("barber_achievements")
      .withIndex("by_barber", (q) => q.eq("barber_id", args.barber_id))
      .order("desc")
      .collect();

    const achievementsWithUrls = await Promise.all(
      achievements.map(async (item) => {
        let imageUrl = null;
        if (item.image_storage_id) {
          imageUrl = await ctx.storage.getUrl(item.image_storage_id);
        }
        return {
          ...item,
          imageUrl,
        };
      })
    );

    return achievementsWithUrls;
  },
});

// Add achievement
export const addAchievement = mutation({
  args: {
    barber_id: v.id("barbers"),
    title: v.string(),
    description: v.optional(v.string()),
    achievement_type: v.union(
      v.literal("certification"),
      v.literal("award"),
      v.literal("milestone"),
      v.literal("training")
    ),
    date_earned: v.optional(v.string()),
    issuer: v.optional(v.string()),
    image_storage_id: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("barber_achievements", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

// Delete achievement
export const deleteAchievement = mutation({
  args: {
    id: v.id("barber_achievements"),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (item) {
      if (item.image_storage_id) {
        await ctx.storage.delete(item.image_storage_id);
      }
      await ctx.db.delete(args.id);
    }
    return { success: true };
  },
});

// Get public barber profile by slug (URL-friendly name)
export const getPublicBarberProfileBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    // Find barber by matching the slug against full_name converted to slug format
    const allBarbers = await ctx.db
      .query("barbers")
      .withIndex("by_active", (q) => q.eq("is_active", true))
      .collect();

    // Convert name to slug format for matching
    const slugify = (name: string) => {
      return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    };

    const barber = allBarbers.find(b => slugify(b.full_name) === args.slug.toLowerCase());
    if (!barber) return null;

    // Get user info
    const user = await ctx.db.get(barber.user);

    // Get avatar URL
    let avatarUrl = barber.avatar;
    if (barber.avatarStorageId) {
      avatarUrl = await ctx.storage.getUrl(barber.avatarStorageId);
    }

    // Get cover photo URL
    let coverPhotoUrl = null;
    if (barber.coverPhotoStorageId) {
      coverPhotoUrl = await ctx.storage.getUrl(barber.coverPhotoStorageId);
    }

    // Get services
    const services = await Promise.all(
      barber.services.map(async (serviceId) => {
        const service = await ctx.db.get(serviceId);
        return service;
      })
    );

    // Get portfolio
    const portfolio = await ctx.db
      .query("barber_portfolio")
      .withIndex("by_barber", (q) => q.eq("barber_id", barber._id))
      .order("desc")
      .take(12);

    const portfolioWithUrls = await Promise.all(
      portfolio.map(async (item) => {
        const imageUrl = await ctx.storage.getUrl(item.image_storage_id);
        return { ...item, imageUrl };
      })
    );

    // Get achievements
    const achievements = await ctx.db
      .query("barber_achievements")
      .withIndex("by_barber", (q) => q.eq("barber_id", barber._id))
      .order("desc")
      .collect();

    const achievementsWithUrls = await Promise.all(
      achievements.map(async (item) => {
        let imageUrl = null;
        if (item.image_storage_id) {
          imageUrl = await ctx.storage.getUrl(item.image_storage_id);
        }
        return { ...item, imageUrl };
      })
    );

    // Get ratings
    const ratings = await ctx.db
      .query("ratings")
      .withIndex("by_barber", (q) => q.eq("barber_id", barber._id))
      .order("desc")
      .take(10);

    const ratingsWithCustomers = await Promise.all(
      ratings.map(async (rating) => {
        const customer = await ctx.db.get(rating.customer_id);
        return {
          ...rating,
          customerName: customer?.nickname || customer?.username || "Customer",
          customerAvatar: customer?.avatar,
        };
      })
    );

    return {
      ...barber,
      name: barber.full_name,
      email: user?.email,
      avatarUrl,
      coverPhotoUrl,
      services: services.filter(Boolean),
      portfolio: portfolioWithUrls,
      achievements: achievementsWithUrls,
      reviews: ratingsWithCustomers,
    };
  },
});

// Get public barber profile with all details
export const getPublicBarberProfile = query({
  args: {
    barber_id: v.id("barbers"),
  },
  handler: async (ctx, args) => {
    const barber = await ctx.db.get(args.barber_id);
    if (!barber || !barber.is_active) return null;

    // Get user info
    const user = await ctx.db.get(barber.user);

    // Get avatar URL
    let avatarUrl = barber.avatar;
    if (barber.avatarStorageId) {
      avatarUrl = await ctx.storage.getUrl(barber.avatarStorageId);
    }

    // Get cover photo URL
    let coverPhotoUrl = null;
    if (barber.coverPhotoStorageId) {
      coverPhotoUrl = await ctx.storage.getUrl(barber.coverPhotoStorageId);
    }

    // Get services
    const services = await Promise.all(
      barber.services.map(async (serviceId) => {
        const service = await ctx.db.get(serviceId);
        return service;
      })
    );

    // Get portfolio
    const portfolio = await ctx.db
      .query("barber_portfolio")
      .withIndex("by_barber", (q) => q.eq("barber_id", args.barber_id))
      .order("desc")
      .take(12);

    const portfolioWithUrls = await Promise.all(
      portfolio.map(async (item) => {
        const imageUrl = await ctx.storage.getUrl(item.image_storage_id);
        return { ...item, imageUrl };
      })
    );

    // Get achievements
    const achievements = await ctx.db
      .query("barber_achievements")
      .withIndex("by_barber", (q) => q.eq("barber_id", args.barber_id))
      .order("desc")
      .collect();

    const achievementsWithUrls = await Promise.all(
      achievements.map(async (item) => {
        let imageUrl = null;
        if (item.image_storage_id) {
          imageUrl = await ctx.storage.getUrl(item.image_storage_id);
        }
        return { ...item, imageUrl };
      })
    );

    // Get ratings
    const ratings = await ctx.db
      .query("ratings")
      .withIndex("by_barber", (q) => q.eq("barber_id", args.barber_id))
      .order("desc")
      .take(10);

    const ratingsWithCustomers = await Promise.all(
      ratings.map(async (rating) => {
        const customer = await ctx.db.get(rating.customer_id);
        return {
          ...rating,
          customerName: customer?.nickname || customer?.username || "Customer",
          customerAvatar: customer?.avatar,
        };
      })
    );

    return {
      ...barber,
      name: barber.full_name,
      email: user?.email,
      avatarUrl,
      coverPhotoUrl,
      services: services.filter(Boolean),
      portfolio: portfolioWithUrls,
      achievements: achievementsWithUrls,
      reviews: ratingsWithCustomers,
    };
  },
});

// Get all active barbers for public listing
export const getPublicBarbers = query({
  args: {
    branch_id: v.optional(v.id("branches")),
  },
  handler: async (ctx, args) => {
    let barbers;
    if (args.branch_id) {
      barbers = await ctx.db
        .query("barbers")
        .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
        .filter((q) => q.eq(q.field("is_active"), true))
        .collect();
    } else {
      barbers = await ctx.db
        .query("barbers")
        .withIndex("by_active", (q) => q.eq("is_active", true))
        .collect();
    }

    const barbersWithDetails = await Promise.all(
      barbers.map(async (barber) => {
        let avatarUrl = barber.avatar;
        if (barber.avatarStorageId) {
          avatarUrl = await ctx.storage.getUrl(barber.avatarStorageId);
        }

        // Get portfolio count
        const portfolioCount = (await ctx.db
          .query("barber_portfolio")
          .withIndex("by_barber", (q) => q.eq("barber_id", barber._id))
          .collect()).length;

        // Get featured portfolio item
        const featuredItem = await ctx.db
          .query("barber_portfolio")
          .withIndex("by_barber", (q) => q.eq("barber_id", barber._id))
          .order("desc")
          .first();

        let featuredImageUrl = null;
        if (featuredItem) {
          featuredImageUrl = await ctx.storage.getUrl(featuredItem.image_storage_id);
        }

        return {
          _id: barber._id,
          name: barber.full_name,
          avatarUrl,
          rating: barber.rating,
          experience: barber.experience,
          specialties: barber.specialties,
          totalBookings: barber.totalBookings,
          portfolioCount,
          featuredImageUrl,
          is_accepting_bookings: barber.is_accepting_bookings ?? true,
        };
      })
    );

    return barbersWithDetails;
  },
});
