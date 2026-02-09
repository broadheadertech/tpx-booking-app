import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

/**
 * Branch Posts Service
 * CRUD operations for barber/admin posts
 */

const postTypeValidator = v.union(
  v.literal("showcase"),
  v.literal("promo"),
  v.literal("availability"),
  v.literal("announcement"),
  v.literal("tip"),
  v.literal("vacation")
);

const statusValidator = v.union(
  v.literal("pending"),
  v.literal("published"),
  v.literal("archived"),
  v.literal("rejected")
);

/**
 * Create a new post
 */
export const createPost = mutation({
  args: {
    branch_id: v.id("branches"),
    post_type: postTypeValidator,
    content: v.string(),
    images: v.optional(v.array(v.string())),
    expires_at: v.optional(v.number()),
    // Vacation/closure date range
    vacation_start: v.optional(v.number()),
    vacation_end: v.optional(v.number()),
    // BT3: Shoppable Posts - Product tagging
    tagged_products: v.optional(v.array(v.object({
      product_id: v.id("products"),
      position: v.optional(v.object({
        x: v.number(),
        y: v.number(),
      })),
      note: v.optional(v.string()),
    }))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get user from Clerk ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerk_user_id", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Determine author type and check permissions
    // Only branch admins and super admins can create branch posts
    // Barbers should post to their portfolio instead
    let authorType: "branch_admin" | "super_admin";
    const shouldAutoPublish = true; // Both admin types auto-publish

    if (user.role === "super_admin") {
      authorType = "super_admin";
    } else if (user.role === "branch_admin" || user.role === "admin") {
      // Check if user is admin for this branch
      if (user.branch_id !== args.branch_id) {
        throw new Error("You can only post to your assigned branch");
      }
      authorType = "branch_admin";
    } else if (user.role === "barber") {
      // Barbers cannot create branch posts - they should use their portfolio
      throw new Error("Barbers cannot create branch posts. Please use your portfolio to showcase your work.");
    } else {
      throw new Error("You do not have permission to create posts");
    }

    const now = Date.now();

    const postId = await ctx.db.insert("branch_posts", {
      branch_id: args.branch_id,
      author_id: user._id,
      author_type: authorType,
      post_type: args.post_type,
      content: args.content,
      images: args.images || [],
      status: shouldAutoPublish ? "published" : "pending",
      pinned: false,
      expires_at: args.expires_at,
      // Vacation date range
      vacation_start: args.vacation_start,
      vacation_end: args.vacation_end,
      // BT3: Shoppable posts
      tagged_products: args.tagged_products,
      is_shoppable: args.tagged_products && args.tagged_products.length > 0,
      view_count: 0,
      createdAt: now,
      updatedAt: now,
    });

    return {
      postId,
      status: shouldAutoPublish ? "published" : "pending",
      message: shouldAutoPublish
        ? "Post published successfully"
        : "Post submitted for approval",
    };
  },
});

/**
 * Update a post (author only, before approval)
 */
export const updatePost = mutation({
  args: {
    postId: v.id("branch_posts"),
    content: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    post_type: v.optional(postTypeValidator),
    expires_at: v.optional(v.number()),
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

    // Only author can update, and only if pending
    const isAuthor = post.author_id === user._id;
    const isAdmin = user.role === "super_admin" || user.role === "branch_admin";

    if (!isAuthor && !isAdmin) {
      throw new Error("You can only edit your own posts");
    }

    // Authors can only edit pending posts, admins can edit any
    if (isAuthor && !isAdmin && post.status !== "pending") {
      throw new Error("You can only edit posts that are pending approval");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.content !== undefined) updates.content = args.content;
    if (args.images !== undefined) updates.images = args.images;
    if (args.post_type !== undefined) updates.post_type = args.post_type;
    if (args.expires_at !== undefined) updates.expires_at = args.expires_at;

    await ctx.db.patch(args.postId, updates);

    return { success: true };
  },
});

/**
 * Delete a post
 */
export const deletePost = mutation({
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

    // Author or admin can delete
    const isAuthor = post.author_id === user._id;
    const isAdmin = user.role === "super_admin" || user.role === "branch_admin";

    if (!isAuthor && !isAdmin) {
      throw new Error("You can only delete your own posts");
    }

    await ctx.db.delete(args.postId);

    return { success: true };
  },
});

/**
 * Moderate a post (approve/reject) - Admin only
 */
export const moderatePost = mutation({
  args: {
    postId: v.id("branch_posts"),
    action: v.union(v.literal("approve"), v.literal("reject")),
    reason: v.optional(v.string()),
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

    // Only admins can moderate
    if (user.role !== "super_admin" && user.role !== "branch_admin" && user.role !== "admin") {
      throw new Error("Only admins can moderate posts");
    }

    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    // Branch admins can only moderate their branch
    if (user.role !== "super_admin" && user.branch_id !== post.branch_id) {
      throw new Error("You can only moderate posts in your branch");
    }

    const updates: Record<string, unknown> = {
      status: args.action === "approve" ? "published" : "rejected",
      updatedAt: Date.now(),
    };

    if (args.action === "reject" && args.reason) {
      updates.rejection_reason = args.reason;
    }

    await ctx.db.patch(args.postId, updates);

    return {
      success: true,
      newStatus: args.action === "approve" ? "published" : "rejected",
    };
  },
});

/**
 * Pin/unpin a post - Admin only
 */
export const togglePinPost = mutation({
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

    if (user.role !== "super_admin" && user.role !== "branch_admin" && user.role !== "admin") {
      throw new Error("Only admins can pin posts");
    }

    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    await ctx.db.patch(args.postId, {
      pinned: !post.pinned,
      updatedAt: Date.now(),
    });

    return { success: true, pinned: !post.pinned };
  },
});

/**
 * Archive a post
 */
export const archivePost = mutation({
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
    const isAdmin = user.role === "super_admin" || user.role === "branch_admin";

    if (!isAuthor && !isAdmin) {
      throw new Error("You can only archive your own posts");
    }

    await ctx.db.patch(args.postId, {
      status: "archived",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Get pending posts for moderation (Admin view)
 */
export const getPendingPosts = query({
  args: {
    branchId: v.optional(v.id("branches")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerk_user_id", identity.subject))
      .first();

    if (!user) {
      return [];
    }

    if (user.role !== "super_admin" && user.role !== "branch_admin" && user.role !== "admin") {
      return [];
    }

    let posts;
    if (user.role === "super_admin" && !args.branchId) {
      // Super admin sees all pending posts
      posts = await ctx.db
        .query("branch_posts")
        .filter((q) => q.eq(q.field("status"), "pending"))
        .order("desc")
        .collect();
    } else {
      // Branch admin sees only their branch
      const branchId = args.branchId || user.branch_id;
      if (!branchId) return [];

      posts = await ctx.db
        .query("branch_posts")
        .withIndex("by_branch_status", (q) =>
          q.eq("branch_id", branchId).eq("status", "pending")
        )
        .order("desc")
        .collect();
    }

    // Enrich with author info
    const enriched = await Promise.all(
      posts.map(async (post) => {
        const author = await ctx.db.get(post.author_id);
        const branch = await ctx.db.get(post.branch_id);

        let barberInfo = null;
        if (post.author_type === "barber" && author) {
          const barber = await ctx.db
            .query("barbers")
            .withIndex("by_user", (q) => q.eq("user", author._id))
            .first();
          barberInfo = barber;
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
          ...post,
          images: imageUrls,
          author_name: (post.author_type === "branch_admin" || post.author_type === "super_admin")
            ? branch?.name || "Unknown Branch"
            : barberInfo?.name || author?.nickname || author?.username || "Unknown",
          author_avatar: barberInfo?.avatar || author?.avatar,
          branch_name: branch?.name || "Unknown Branch",
        };
      })
    );

    return enriched;
  },
});

/**
 * Get my posts (for barber/author view)
 */
export const getMyPosts = query({
  args: {
    status: v.optional(statusValidator),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerk_user_id", identity.subject))
      .first();

    if (!user) {
      return [];
    }

    let posts = await ctx.db
      .query("branch_posts")
      .withIndex("by_author", (q) => q.eq("author_id", user._id))
      .order("desc")
      .collect();

    if (args.status) {
      posts = posts.filter((p) => p.status === args.status);
    }

    // Enrich with branch info
    const enriched = await Promise.all(
      posts.map(async (post) => {
        const branch = await ctx.db.get(post.branch_id);
        return {
          ...post,
          branch_name: branch?.name || "Unknown Branch",
        };
      })
    );

    return enriched;
  },
});

/**
 * Create a post as branch admin (no Clerk auth required)
 * Auto-publishes since the admin is creating it themselves
 */
export const createAdminPost = mutation({
  args: {
    author_id: v.id("users"),
    branch_id: v.id("branches"),
    post_type: postTypeValidator,
    content: v.string(),
    images: v.optional(v.array(v.string())),
    expires_at: v.optional(v.number()),
    vacation_start: v.optional(v.number()),
    vacation_end: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.author_id);
    if (!user) throw new Error("User not found");

    if (
      user.role !== "super_admin" &&
      user.role !== "branch_admin" &&
      user.role !== "admin"
    ) {
      throw new Error("Only admins can create posts with this method");
    }

    if (user.role !== "super_admin" && user.branch_id !== args.branch_id) {
      throw new Error("You can only post to your assigned branch");
    }

    const authorType =
      user.role === "super_admin" ? "super_admin" : "branch_admin";

    const now = Date.now();

    const postId = await ctx.db.insert("branch_posts", {
      branch_id: args.branch_id,
      author_id: args.author_id,
      author_type: authorType,
      post_type: args.post_type,
      content: args.content,
      images: args.images || [],
      status: "published", // Auto-publish for admins
      pinned: false,
      expires_at: args.expires_at,
      vacation_start: args.vacation_start,
      vacation_end: args.vacation_end,
      view_count: 0,
      createdAt: now,
      updatedAt: now,
    });

    return {
      postId,
      status: "published",
      message: "Post published successfully",
    };
  },
});

/**
 * Get published posts for a branch (for admin to see their posts)
 */
export const getBranchPublishedPosts = query({
  args: {
    branchId: v.id("branches"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    const posts = await ctx.db
      .query("branch_posts")
      .withIndex("by_branch_status", (q) =>
        q.eq("branch_id", args.branchId).eq("status", "published")
      )
      .order("desc")
      .take(limit);

    // Enrich with author info
    const enriched = await Promise.all(
      posts.map(async (post) => {
        const author = await ctx.db.get(post.author_id);
        const branch = await ctx.db.get(post.branch_id);

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
          ...post,
          images: imageUrls,
          author_name: branch?.name || "Unknown Branch",
          branch_name: branch?.name || "Unknown Branch",
        };
      })
    );

    return enriched;
  },
});

/**
 * Increment view count (mutation version for actual tracking)
 */
export const trackPostView = mutation({
  args: {
    postId: v.id("branch_posts"),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post || post.status !== "published") {
      return null;
    }

    await ctx.db.patch(args.postId, {
      view_count: (post.view_count || 0) + 1,
    });

    return { success: true };
  },
});
