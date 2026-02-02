/**
 * Social Feed Service
 * Instagram-style posts for announcements, showcases, and updates
 *
 * @module convex/services/feed
 */

import { v } from "convex/values";
import { query, mutation } from "../_generated/server";

/**
 * Get feed posts for a branch (public feed)
 * Returns active posts sorted by pinned first, then by creation date
 */
export const getFeedPosts = query({
  args: {
    branchId: v.optional(v.id("branches")),
    limit: v.optional(v.number()),
    postType: v.optional(
      v.union(
        v.literal("announcement"),
        v.literal("showcase"),
        v.literal("promotion"),
        v.literal("event"),
        v.literal("achievement"),
        v.literal("tip")
      )
    ),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    let postsQuery = ctx.db
      .query("branch_posts")
      .withIndex("by_active_created", (q) => q.eq("is_active", true))
      .order("desc");

    const posts = await postsQuery.collect();

    // Filter by branch and type if specified
    let filteredPosts = posts;
    if (args.branchId) {
      filteredPosts = filteredPosts.filter((p) => p.branch_id === args.branchId);
    }
    if (args.postType) {
      filteredPosts = filteredPosts.filter((p) => p.post_type === args.postType);
    }

    // Sort: pinned first, then by date
    filteredPosts.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return b.created_at - a.created_at;
    });

    // Limit results
    const limitedPosts = filteredPosts.slice(0, limit);

    // Enrich with barber info if available
    const enrichedPosts = await Promise.all(
      limitedPosts.map(async (post) => {
        let barber = null;
        if (post.barber_id) {
          barber = await ctx.db.get(post.barber_id);
        }

        // Get image URL from storage if using storage ID
        let imageUrl = post.image_url;
        if (post.image_storage_id) {
          imageUrl = await ctx.storage.getUrl(post.image_storage_id);
        }

        return {
          ...post,
          barber: barber
            ? {
                _id: barber._id,
                first_name: barber.first_name,
                last_name: barber.last_name,
                avatar_url: barber.avatar_url,
              }
            : null,
          imageUrl,
        };
      })
    );

    return enrichedPosts;
  },
});

/**
 * Get a single post by ID
 */
export const getPost = query({
  args: { postId: v.id("branch_posts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) return null;

    let barber = null;
    if (post.barber_id) {
      barber = await ctx.db.get(post.barber_id);
    }

    let imageUrl = post.image_url;
    if (post.image_storage_id) {
      imageUrl = await ctx.storage.getUrl(post.image_storage_id);
    }

    return {
      ...post,
      barber: barber
        ? {
            _id: barber._id,
            first_name: barber.first_name,
            last_name: barber.last_name,
            avatar_url: barber.avatar_url,
          }
        : null,
      imageUrl,
    };
  },
});

/**
 * Check if a user has liked a post
 */
export const hasUserLikedPost = query({
  args: {
    postId: v.id("branch_posts"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const like = await ctx.db
      .query("post_likes")
      .withIndex("by_post_user", (q) =>
        q.eq("post_id", args.postId).eq("user_id", args.userId)
      )
      .first();

    return !!like;
  },
});

/**
 * Toggle like on a post
 */
export const toggleLike = mutation({
  args: {
    postId: v.id("branch_posts"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    // Check if already liked
    const existingLike = await ctx.db
      .query("post_likes")
      .withIndex("by_post_user", (q) =>
        q.eq("post_id", args.postId).eq("user_id", args.userId)
      )
      .first();

    if (existingLike) {
      // Unlike
      await ctx.db.delete(existingLike._id);
      await ctx.db.patch(args.postId, {
        likes_count: Math.max(0, (post.likes_count || 0) - 1),
      });
      return { liked: false, likesCount: Math.max(0, (post.likes_count || 0) - 1) };
    } else {
      // Like
      await ctx.db.insert("post_likes", {
        post_id: args.postId,
        user_id: args.userId,
        created_at: Date.now(),
      });
      await ctx.db.patch(args.postId, {
        likes_count: (post.likes_count || 0) + 1,
      });
      return { liked: true, likesCount: (post.likes_count || 0) + 1 };
    }
  },
});

/**
 * Create a new post (admin/staff only)
 */
export const createPost = mutation({
  args: {
    branchId: v.id("branches"),
    authorId: v.optional(v.id("users")),
    barberId: v.optional(v.id("barbers")),
    postType: v.union(
      v.literal("announcement"),
      v.literal("showcase"),
      v.literal("promotion"),
      v.literal("event"),
      v.literal("achievement"),
      v.literal("tip")
    ),
    title: v.optional(v.string()),
    content: v.string(),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    tags: v.optional(v.array(v.string())),
    isPinned: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const postId = await ctx.db.insert("branch_posts", {
      branch_id: args.branchId,
      author_id: args.authorId,
      barber_id: args.barberId,
      post_type: args.postType,
      title: args.title,
      content: args.content,
      image_url: args.imageUrl,
      image_storage_id: args.imageStorageId,
      tags: args.tags,
      likes_count: 0,
      is_pinned: args.isPinned || false,
      is_active: true,
      created_at: now,
      updated_at: now,
    });

    return postId;
  },
});

/**
 * Seed sample posts for testing
 */
export const seedSamplePosts = mutation({
  args: { branchId: v.id("branches") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    // Get a barber for showcase posts
    const barber = await ctx.db.query("barbers").first();

    const samplePosts = [
      {
        post_type: "announcement" as const,
        title: "Holiday Hours Update 🎄",
        content:
          "We'll be closed on December 25 & January 1. Book your appointments early to look fresh for the holidays! Walk-ins welcome on all other days.",
        image_url: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800",
        is_pinned: true,
        tags: ["holiday", "announcement"],
        created_at: now - dayMs * 1,
      },
      {
        post_type: "showcase" as const,
        title: "Fresh Fade Friday ✂️",
        content:
          "Check out this clean mid fade with textured top! Our barbers are ready to give you that fresh look. Book now!",
        image_url: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800",
        barber_id: barber?._id,
        tags: ["fade", "haircut", "fresh"],
        created_at: now - dayMs * 2,
      },
      {
        post_type: "event" as const,
        title: "Community Donation Drive 🤝",
        content:
          "Join us this Saturday for our annual school supplies donation drive! For every haircut booked, we'll donate ₱50 to local schools. Let's give back together!",
        image_url: "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=800",
        is_pinned: true,
        tags: ["donation", "community", "event"],
        created_at: now - dayMs * 3,
      },
      {
        post_type: "promotion" as const,
        title: "Double Stars Week! ⭐⭐",
        content:
          "This week only - earn DOUBLE loyalty stars on all services! The more you groom, the more you earn. Don't miss out!",
        image_url: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=800",
        tags: ["promo", "loyalty", "stars"],
        created_at: now - dayMs * 4,
      },
      {
        post_type: "showcase" as const,
        title: "Beard Game Strong 🧔",
        content:
          "Nothing beats a well-groomed beard. Our beard trim & shape service includes hot towel treatment for that premium experience.",
        image_url: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800",
        barber_id: barber?._id,
        tags: ["beard", "grooming", "style"],
        created_at: now - dayMs * 5,
      },
      {
        post_type: "tip" as const,
        title: "Pro Tip: Post-Haircut Care 💡",
        content:
          "Keep your fresh cut looking sharp longer! Use a light pomade for styling, and schedule your next trim in 3-4 weeks to maintain the shape.",
        image_url: "https://images.unsplash.com/photo-1493256338651-d82f7acb2b38?w=800",
        tags: ["tip", "haircare", "grooming"],
        created_at: now - dayMs * 6,
      },
      {
        post_type: "achievement" as const,
        title: "1000+ Happy Customers! 🎉",
        content:
          "We just hit a huge milestone - over 1000 satisfied customers! Thank you for trusting us with your grooming needs. Here's to many more!",
        image_url: "https://images.unsplash.com/photo-1560264280-88b68371db39?w=800",
        tags: ["milestone", "thankyou", "community"],
        created_at: now - dayMs * 7,
      },
    ];

    for (const post of samplePosts) {
      await ctx.db.insert("branch_posts", {
        branch_id: args.branchId,
        post_type: post.post_type,
        title: post.title,
        content: post.content,
        image_url: post.image_url,
        barber_id: post.barber_id,
        tags: post.tags,
        likes_count: Math.floor(Math.random() * 50) + 10,
        is_pinned: post.is_pinned || false,
        is_active: true,
        created_at: post.created_at,
        updated_at: post.created_at,
      });
    }

    return { success: true, postsCreated: samplePosts.length };
  },
});
