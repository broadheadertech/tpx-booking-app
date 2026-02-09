/**
 * Social Feed Service
 * Instagram-style posts for announcements, showcases, and updates
 *
 * @module convex/services/feed
 */

import { v } from "convex/values";
import { query, mutation } from "../_generated/server";

// Helper to create URL-friendly slug from name
const slugify = (name: string) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};

/**
 * Get feed posts for a branch (public feed)
 * Returns published posts sorted by pinned first, then by creation date
 */
export const getFeedPosts = query({
  args: {
    branchId: v.optional(v.id("branches")),
    limit: v.optional(v.number()),
    postType: v.optional(
      v.union(
        v.literal("announcement"),
        v.literal("showcase"),
        v.literal("promo"),
        v.literal("availability"),
        v.literal("tip"),
        v.literal("vacation")
      )
    ),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    let posts;

    // Use appropriate index based on whether branchId is provided
    if (args.branchId) {
      // Use by_branch_status index for branch-specific queries
      posts = await ctx.db
        .query("branch_posts")
        .withIndex("by_branch_status", (q) =>
          q.eq("branch_id", args.branchId).eq("status", "published")
        )
        .order("desc")
        .collect();
    } else {
      // Get all published posts and sort by createdAt
      posts = await ctx.db
        .query("branch_posts")
        .withIndex("by_created_at")
        .order("desc")
        .collect();

      // Filter to only published posts
      posts = posts.filter((p) => p.status === "published");
    }

    // Filter by type if specified
    if (args.postType) {
      posts = posts.filter((p) => p.post_type === args.postType);
    }

    // Sort: pinned first, then by date
    posts.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.createdAt - a.createdAt;
    });

    // Limit results
    const limitedPosts = posts.slice(0, limit);

    // Enrich with author info (including barber_id for booking)
    const enrichedPosts = await Promise.all(
      limitedPosts.map(async (post) => {
        const author = await ctx.db.get(post.author_id);

        // Get barber info if author is a barber (for Quick Book feature)
        let barberInfo = null;
        if (author && author.role === "barber") {
          barberInfo = await ctx.db
            .query("barbers")
            .withIndex("by_user", (q) => q.eq("user", author._id))
            .first();
        }

        // Get barber avatar URL (from storage if available)
        let barberAvatarUrl = barberInfo?.avatar;
        if (barberInfo?.avatarStorageId) {
          barberAvatarUrl = await ctx.storage.getUrl(barberInfo.avatarStorageId);
        }

        // Resolve storage IDs to URLs for post images
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

        // For admin posts, use branch name and branding logo
        const isAdminPost = post.author_type === "branch_admin" || post.author_type === "super_admin";
        let authorName = barberInfo?.full_name || author?.nickname || author?.username;
        let authorAvatar = barberAvatarUrl || author?.avatar_url;
        let authorSlug = barberInfo?.full_name ? slugify(barberInfo.full_name) : null;
        let isBranchPost = false;

        if (isAdminPost) {
          const branch = await ctx.db.get(post.branch_id);
          authorName = branch?.name || "Unknown Branch";
          isBranchPost = true;
          authorSlug = branch?.slug || null;

          // Get branding logo for branch avatar
          const branding = await ctx.db
            .query("branding")
            .withIndex("by_branch", (q: any) => q.eq("branch_id", post.branch_id))
            .first();

          if (branding?.logo_dark_url) {
            authorAvatar = branding.logo_dark_url;
          } else if (branding?.logo_light_url) {
            authorAvatar = branding.logo_light_url;
          } else if (branch?.logo_dark_url) {
            authorAvatar = branch.logo_dark_url;
          } else if (branch?.logo_light_url) {
            authorAvatar = branch.logo_light_url;
          }
        }

        return {
          ...post,
          images: imageUrls,
          author: author
            ? {
                _id: author._id,
                name: authorName,
                avatar: authorAvatar,
                barberId: barberInfo?._id || null,
                slug: authorSlug,
                isBranch: isBranchPost,
              }
            : null,
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

    const author = await ctx.db.get(post.author_id);

    // Resolve storage IDs to URLs for post images
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
      ...post,
      images: imageUrls,
      author: author
        ? {
            _id: author._id,
            name: author.nickname || author.username,
            avatar: author.avatar_url,
          }
        : null,
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
 * Note: For full post creation with moderation, use branchPosts.createPost instead
 */
export const createPost = mutation({
  args: {
    branchId: v.id("branches"),
    authorId: v.id("users"),
    authorType: v.union(
      v.literal("barber"),
      v.literal("branch_admin"),
      v.literal("super_admin")
    ),
    postType: v.union(
      v.literal("showcase"),
      v.literal("promo"),
      v.literal("availability"),
      v.literal("announcement"),
      v.literal("tip")
    ),
    content: v.string(),
    images: v.optional(v.array(v.string())),
    pinned: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const postId = await ctx.db.insert("branch_posts", {
      branch_id: args.branchId,
      author_id: args.authorId,
      author_type: args.authorType,
      post_type: args.postType,
      content: args.content,
      images: args.images,
      status: "published", // Direct publish for admins
      pinned: args.pinned || false,
      view_count: 0,
      createdAt: now,
      updatedAt: now,
    });

    return postId;
  },
});

/**
 * Seed sample posts for testing
 * Note: Use seed.ts seedBranchPosts for complete seeding with proper schema
 */
export const seedSamplePosts = mutation({
  args: {
    branchId: v.id("branches"),
    authorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    const samplePosts = [
      {
        post_type: "announcement" as const,
        content:
          "Holiday Hours Update! We'll be closed on December 25 & January 1. Book your appointments early to look fresh for the holidays!",
        images: ["https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800"],
        pinned: true,
        createdAt: now - dayMs * 1,
      },
      {
        post_type: "showcase" as const,
        content:
          "Check out this clean mid fade with textured top! Our barbers are ready to give you that fresh look. Book now!",
        images: ["https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800"],
        pinned: false,
        createdAt: now - dayMs * 2,
      },
      {
        post_type: "promo" as const,
        content:
          "Double Stars Week! This week only - earn DOUBLE loyalty stars on all services! The more you groom, the more you earn.",
        images: ["https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=800"],
        pinned: false,
        createdAt: now - dayMs * 3,
      },
      {
        post_type: "tip" as const,
        content:
          "Pro Tip: Keep your fresh cut looking sharp longer! Use a light pomade for styling, and schedule your next trim in 3-4 weeks.",
        images: ["https://images.unsplash.com/photo-1493256338651-d82f7acb2b38?w=800"],
        pinned: false,
        createdAt: now - dayMs * 4,
      },
    ];

    for (const post of samplePosts) {
      await ctx.db.insert("branch_posts", {
        branch_id: args.branchId,
        author_id: args.authorId,
        author_type: "branch_admin",
        post_type: post.post_type,
        content: post.content,
        images: post.images,
        status: "published",
        pinned: post.pinned,
        view_count: Math.floor(Math.random() * 50) + 10,
        createdAt: post.createdAt,
        updatedAt: post.createdAt,
      });
    }

    return { success: true, postsCreated: samplePosts.length };
  },
});

/**
 * Get branches with recent posts (for Stories carousel)
 * Returns branches with posts from the last 24 hours
 * Only shows posts from branch admins and super admins (not barbers)
 */
export const getBarbersWithRecentPosts = query({
  args: {},
  handler: async (ctx) => {
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;

    // Get all published posts from the last 24 hours
    const recentPosts = await ctx.db
      .query("branch_posts")
      .withIndex("by_created_at")
      .order("desc")
      .collect();

    // Filter to recent published posts from branch admins only (not barbers)
    // Stories are only available for branch-level posting
    const filteredPosts = recentPosts.filter(
      (p) => p.status === "published" &&
             p.createdAt >= twentyFourHoursAgo &&
             (p.author_type === "branch_admin" || p.author_type === "super_admin")
    );

    // Group posts by branch (since stories are branch-level now)
    const postsByBranch: Record<string, typeof filteredPosts> = {};
    for (const post of filteredPosts) {
      const branchId = post.branch_id.toString();
      if (!postsByBranch[branchId]) {
        postsByBranch[branchId] = [];
      }
      postsByBranch[branchId].push(post);
    }

    // Get branch details and build result
    const branchesWithPosts = await Promise.all(
      Object.entries(postsByBranch).map(async ([branchId, posts]) => {
        const branch = await ctx.db.get(posts[0].branch_id);
        if (!branch) return null;

        // Get branch logo/image if available
        let branchImage = branch.image_url;
        if (branch.imageStorageId) {
          branchImage = await ctx.storage.getUrl(branch.imageStorageId);
        }

        return {
          _id: branch._id,
          name: branch.name || "Branch",
          avatar: branchImage || null,
          role: "branch", // Indicate this is a branch story
          recentPosts: await Promise.all(posts.slice(0, 5).map(async (p) => {
            const postImageUrls = await Promise.all(
              (p.images || []).map(async (img: string) => {
                try {
                  const url = await ctx.storage.getUrl(img as any);
                  return url || img;
                } catch {
                  return img;
                }
              })
            );
            return {
              _id: p._id,
              content: p.content,
              images: postImageUrls,
              post_type: p.post_type,
              createdAt: p.createdAt,
              likes_count: p.likes_count || 0,
            };
          })),
          postCount: posts.length,
          latestPostAt: posts[0]?.createdAt || 0,
        };
      })
    );

    // Filter out nulls and sort by latest post
    return branchesWithPosts
      .filter((b): b is NonNullable<typeof b> => b !== null)
      .sort((a, b) => b.latestPostAt - a.latestPostAt);
  },
});
