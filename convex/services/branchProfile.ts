import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * Branch Profile Service
 * Public queries for branch profile pages (no auth required)
 */

/**
 * Get branch by slug for public profile
 */
export const getBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const branch = await ctx.db
      .query("branches")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .filter((q) => q.eq(q.field("is_active"), true))
      .first();

    if (!branch) {
      return null;
    }

    // Get branding for this branch
    const branding = await ctx.db
      .query("branding")
      .withIndex("by_branch", (q) => q.eq("branch_id", branch._id))
      .first();

    return {
      ...branch,
      branding: branding || null,
    };
  },
});

/**
 * Get all active branches with slugs (for sitemap/discovery)
 */
export const getAllPublicBranches = query({
  args: {},
  handler: async (ctx) => {
    const branches = await ctx.db
      .query("branches")
      .withIndex("by_active", (q) => q.eq("is_active", true))
      .collect();

    // Only return branches that have slugs (public profiles enabled)
    return branches
      .filter((b) => b.slug)
      .map((b) => ({
        _id: b._id,
        name: b.name,
        slug: b.slug,
        address: b.address,
        phone: b.phone,
      }));
  },
});

/**
 * Get barbers for a branch (public view)
 */
export const getBranchBarbers = query({
  args: {
    branchId: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const barbers = await ctx.db
      .query("barbers")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branchId))
      .filter((q) => q.eq(q.field("is_active"), true))
      .collect();

    // Return public-safe barber info with resolved avatar URLs
    return Promise.all(
      barbers.map(async (barber) => {
        let avatarUrl = barber.avatar || null;
        if (barber.avatarStorageId) {
          avatarUrl = await ctx.storage.getUrl(barber.avatarStorageId);
        }
        return {
          _id: barber._id,
          name: barber.full_name,
          avatar: avatarUrl,
          specialties: barber.specialties || [],
          bio: barber.bio || null,
          experience: barber.experience || null,
          rating: barber.rating || null,
          totalBookings: barber.totalBookings || 0,
        };
      })
    );
  },
});

/**
 * Get services for a branch (public view)
 */
export const getBranchServices = query({
  args: {
    branchId: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const services = await ctx.db
      .query("services")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branchId))
      .filter((q) => q.eq(q.field("is_active"), true))
      .collect();

    // Group by category for display
    const grouped: Record<
      string,
      Array<{
        _id: string;
        name: string;
        description: string | null;
        price: number;
        duration: number | null;
        category: string;
      }>
    > = {};

    for (const service of services) {
      const category = service.category || "Other";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push({
        _id: service._id,
        name: service.name,
        description: service.description || null,
        price: service.price,
        duration: service.duration || null,
        category,
      });
    }

    return {
      services: services.map((s) => ({
        _id: s._id,
        name: s.name,
        description: s.description || null,
        price: s.price,
        duration: s.duration || null,
        category: s.category || "Other",
      })),
      grouped,
      categories: Object.keys(grouped),
    };
  },
});

/**
 * Get published posts for a branch (public view)
 */
export const getBranchPosts = query({
  args: {
    branchId: v.id("branches"),
    limit: v.optional(v.number()),
    postType: v.optional(
      v.union(
        v.literal("showcase"),
        v.literal("promo"),
        v.literal("availability"),
        v.literal("announcement"),
        v.literal("tip")
      )
    ),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    const now = Date.now();

    let postsQuery = ctx.db
      .query("branch_posts")
      .withIndex("by_branch_status", (q) =>
        q.eq("branch_id", args.branchId).eq("status", "published")
      );

    let posts = await postsQuery.order("desc").collect();

    // Filter by post type if specified
    if (args.postType) {
      posts = posts.filter((p) => p.post_type === args.postType);
    }

    // Filter out expired posts
    posts = posts.filter((p) => !p.expires_at || p.expires_at > now);

    // Sort: pinned first, then by date
    posts.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.createdAt - a.createdAt;
    });

    // Limit results
    posts = posts.slice(0, limit);

    // Enrich with author info
    const enriched = await Promise.all(
      posts.map(async (post) => {
        const author = await ctx.db.get(post.author_id);

        // If author is a barber, get barber profile
        let barberInfo = null;
        if (post.author_type === "barber" && author) {
          const barber = await ctx.db
            .query("barbers")
            .withIndex("by_user", (q) => q.eq("user", author._id))
            .first();
          if (barber) {
            barberInfo = {
              _id: barber._id,
              name: barber.name,
              avatar: barber.avatar,
            };
          }
        }

        // Resolve storage IDs to URLs
        const imageUrls = await Promise.all(
          (post.images || []).map(async (img: string) => {
            try {
              const url = await ctx.storage.getUrl(img as any);
              return url || img;
            } catch {
              return img;
            }
          })
        );

        return {
          _id: post._id,
          post_type: post.post_type,
          content: post.content,
          images: imageUrls,
          pinned: post.pinned || false,
          view_count: post.view_count || 0,
          createdAt: post.createdAt,
          author: {
            type: post.author_type,
            name: barberInfo?.name || author?.nickname || author?.username || "Staff",
            avatar: barberInfo?.avatar || author?.avatar || null,
            barber_id: barberInfo?._id || null,
          },
        };
      })
    );

    return enriched;
  },
});

/**
 * Get branch profile summary (all data for profile page)
 */
export const getBranchProfileSummary = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    // Get branch
    const branch = await ctx.db
      .query("branches")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .filter((q) => q.eq(q.field("is_active"), true))
      .first();

    if (!branch) {
      return null;
    }

    // Get branding
    const branding = await ctx.db
      .query("branding")
      .withIndex("by_branch", (q) => q.eq("branch_id", branch._id))
      .first();

    // Get barbers count
    const barbers = await ctx.db
      .query("barbers")
      .withIndex("by_branch", (q) => q.eq("branch_id", branch._id))
      .filter((q) => q.eq(q.field("is_active"), true))
      .collect();

    // Get services count
    const services = await ctx.db
      .query("services")
      .withIndex("by_branch", (q) => q.eq("branch_id", branch._id))
      .filter((q) => q.eq(q.field("is_active"), true))
      .collect();

    // Get recent posts count
    const posts = await ctx.db
      .query("branch_posts")
      .withIndex("by_branch_status", (q) =>
        q.eq("branch_id", branch._id).eq("status", "published")
      )
      .collect();

    // Get completed bookings count for social proof
    const completedBookings = await ctx.db
      .query("bookings")
      .withIndex("by_branch", (q) => q.eq("branch_id", branch._id))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    // Determine open/closed status based on current time and branch hours
    const now = new Date();
    const currentHour = now.getHours();
    const startHour = branch.booking_start_hour || 10;
    const endHour = branch.booking_end_hour || 20;
    const isOpen = currentHour >= startHour && currentHour < endHour;

    return {
      branch: {
        _id: branch._id,
        name: branch.name,
        slug: branch.slug,
        address: branch.address,
        phone: branch.phone,
        email: branch.email,
        description: branch.description || null,
        social_links: branch.social_links || null,
        booking_start_hour: branch.booking_start_hour || 10,
        booking_end_hour: branch.booking_end_hour || 20,
        profile_photo: branch.profile_photo || null,
        cover_photo: branch.cover_photo || null,
      },
      branding: branding
        ? {
            display_name: branding.display_name,
            primary_color: branding.primary_color,
            logo_light_url: branding.logo_light_url,
            logo_dark_url: branding.logo_dark_url,
            hero_image_url: branding.hero_image_url,
            banner_url: branding.banner_url,
          }
        : null,
      stats: {
        barbers_count: barbers.length,
        services_count: services.length,
        posts_count: posts.length,
        bookings_count: completedBookings.length,
        is_open: isOpen,
      },
    };
  },
});

/**
 * Increment post view count
 */
export const incrementPostView = query({
  args: {
    postId: v.id("branch_posts"),
  },
  handler: async (ctx, args) => {
    // Note: This should ideally be a mutation, but for simplicity
    // we're using it as a query that tracks views client-side
    // In production, use a separate mutation with rate limiting
    const post = await ctx.db.get(args.postId);
    return post ? { view_count: (post.view_count || 0) + 1 } : null;
  },
});
