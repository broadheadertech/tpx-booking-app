/**
 * Feed Algorithm Service
 * BT2: Personalized Feed Algorithm - TikTok-style "For You" ranking
 *
 * Learns from user behavior (saves, views, bookings) and style preferences
 * to deliver personalized content recommendations.
 *
 * @module convex/services/feedAlgorithm
 */

import { v } from "convex/values";
import { query, mutation, internalMutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";

// ============================================================
// CONSTANTS & TYPES
// ============================================================

// Signal weights for scoring
const SIGNAL_WEIGHTS = {
  book: 50,           // Highest signal - booked from post
  bookmark: 20,       // Saved for later
  like: 10,           // Fire reaction
  view_long: 3,       // Viewed > 5 seconds
  view: 1,            // Basic view
  skip: -2,           // Scrolled past quickly
};

// Decay periods in milliseconds
const DECAY_PERIODS = {
  book: 30 * 24 * 60 * 60 * 1000,      // 30 days
  bookmark: 14 * 24 * 60 * 60 * 1000,  // 14 days
  like: 7 * 24 * 60 * 60 * 1000,       // 7 days
  view_long: 3 * 24 * 60 * 60 * 1000,  // 3 days
  view: 1 * 24 * 60 * 60 * 1000,       // 1 day
  skip: 1 * 24 * 60 * 60 * 1000,       // 1 day
};

// Algorithm weights
const ALGO_WEIGHTS = {
  baseEngagement: 0.2,    // Post's overall performance
  styleMatch: 0.3,        // Vibe alignment from Matcher
  barberAffinity: 0.25,   // User's history with this barber
  recencyBoost: 0.15,     // Newer posts get bump
  diversityPenalty: 0.1,  // Prevent same-barber spam
};

// Helper to create URL-friendly slug
const slugify = (name: string) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};

// ============================================================
// INTERACTION TRACKING
// ============================================================

/**
 * Record a feed interaction (view, like, bookmark, etc.)
 */
export const recordInteraction = mutation({
  args: {
    userId: v.id("users"),
    postId: v.id("branch_posts"),
    interactionType: v.union(
      v.literal("view"),
      v.literal("view_long"),
      v.literal("like"),
      v.literal("bookmark"),
      v.literal("book"),
      v.literal("skip")
    ),
    viewDurationMs: v.optional(v.number()),
    bookingId: v.optional(v.id("bookings")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get the post to extract context
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    // Get barber info from post author
    let barberId: Id<"barbers"> | undefined;
    let styleVibes: string[] | undefined;

    const author = await ctx.db.get(post.author_id);
    if (author && author.role === "barber") {
      const barber = await ctx.db
        .query("barbers")
        .withIndex("by_user", (q) => q.eq("user", author._id))
        .first();
      if (barber) {
        barberId = barber._id;
        styleVibes = barber.style_vibes as string[] | undefined;
      }
    }

    // Calculate expiry based on interaction type
    const decayPeriod = DECAY_PERIODS[args.interactionType] || DECAY_PERIODS.view;
    const expiresAt = now + decayPeriod;

    // Check for existing interaction of same type
    const existing = await ctx.db
      .query("feed_interactions")
      .withIndex("by_user_post", (q) =>
        q.eq("user_id", args.userId).eq("post_id", args.postId)
      )
      .filter((q) => q.eq(q.field("interaction_type"), args.interactionType))
      .first();

    if (existing) {
      // Update existing interaction (refresh timestamp)
      await ctx.db.patch(existing._id, {
        createdAt: now,
        expires_at: expiresAt,
        view_duration_ms: args.viewDurationMs,
        resulted_in_booking: args.bookingId ? true : existing.resulted_in_booking,
        booking_id: args.bookingId || existing.booking_id,
      });
      return { updated: true, interactionId: existing._id };
    }

    // Create new interaction
    const interactionId = await ctx.db.insert("feed_interactions", {
      user_id: args.userId,
      post_id: args.postId,
      interaction_type: args.interactionType,
      barber_id: barberId,
      post_type: post.post_type,
      style_vibes: styleVibes,
      view_duration_ms: args.viewDurationMs,
      resulted_in_booking: args.bookingId ? true : false,
      booking_id: args.bookingId,
      createdAt: now,
      expires_at: expiresAt,
    });

    // Trigger profile update (async)
    await ctx.scheduler.runAfter(0, "services/feedAlgorithm:updateUserFeedProfile", {
      userId: args.userId,
    });

    return { created: true, interactionId };
  },
});

/**
 * Toggle bookmark on a post
 */
export const toggleBookmark = mutation({
  args: {
    userId: v.id("users"),
    postId: v.id("branch_posts"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check existing bookmark
    const existing = await ctx.db
      .query("post_bookmarks")
      .withIndex("by_user_post", (q) =>
        q.eq("user_id", args.userId).eq("post_id", args.postId)
      )
      .first();

    if (existing) {
      // Remove bookmark
      await ctx.db.delete(existing._id);

      // Also remove bookmark interaction
      const interaction = await ctx.db
        .query("feed_interactions")
        .withIndex("by_user_post", (q) =>
          q.eq("user_id", args.userId).eq("post_id", args.postId)
        )
        .filter((q) => q.eq(q.field("interaction_type"), "bookmark"))
        .first();

      if (interaction) {
        await ctx.db.delete(interaction._id);
      }

      return { bookmarked: false };
    }

    // Add bookmark
    await ctx.db.insert("post_bookmarks", {
      user_id: args.userId,
      post_id: args.postId,
      createdAt: now,
    });

    // Record interaction
    await ctx.db.insert("feed_interactions", {
      user_id: args.userId,
      post_id: args.postId,
      interaction_type: "bookmark",
      createdAt: now,
      expires_at: now + DECAY_PERIODS.bookmark,
    });

    return { bookmarked: true };
  },
});

/**
 * Check if user has bookmarked a post
 */
export const hasUserBookmarkedPost = query({
  args: {
    userId: v.id("users"),
    postId: v.id("branch_posts"),
  },
  handler: async (ctx, args) => {
    const bookmark = await ctx.db
      .query("post_bookmarks")
      .withIndex("by_user_post", (q) =>
        q.eq("user_id", args.userId).eq("post_id", args.postId)
      )
      .first();

    return !!bookmark;
  },
});

/**
 * Get user's bookmarked posts
 */
export const getUserBookmarks = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    const bookmarks = await ctx.db
      .query("post_bookmarks")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .order("desc")
      .take(limit);

    // Get full post data
    const posts = await Promise.all(
      bookmarks.map(async (bookmark) => {
        const post = await ctx.db.get(bookmark.post_id);
        if (!post || post.status !== "published") return null;

        const author = await ctx.db.get(post.author_id);
        let barberInfo = null;
        if (author && author.role === "barber") {
          barberInfo = await ctx.db
            .query("barbers")
            .withIndex("by_user", (q) => q.eq("user", author._id))
            .first();
        }

        // For admin posts, use branch name and branding logo
        const isAdminPost = post.author_type === "branch_admin" || post.author_type === "super_admin";
        let authorName = barberInfo?.full_name || author?.nickname || author?.username;
        let authorAvatar = barberInfo?.avatar || author?.avatar_url;
        let authorSlug = barberInfo?.full_name ? slugify(barberInfo.full_name) : null;
        let isBranchPost = false;

        if (isAdminPost) {
          const branch = await ctx.db.get(post.branch_id);
          authorName = branch?.name || "Unknown Branch";
          isBranchPost = true;
          authorSlug = branch?.slug || null;

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
          bookmarkedAt: bookmark.createdAt,
          author: author ? {
            _id: author._id,
            name: authorName,
            avatar: authorAvatar,
            barberId: barberInfo?._id || null,
            slug: authorSlug,
            isBranch: isBranchPost,
          } : null,
        };
      })
    );

    return posts.filter((p): p is NonNullable<typeof p> => p !== null);
  },
});

// ============================================================
// PROFILE MANAGEMENT
// ============================================================

/**
 * Update user's feed profile based on recent interactions
 * This is called async after interactions are recorded
 */
export const updateUserFeedProfile = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get recent non-expired interactions
    const interactions = await ctx.db
      .query("feed_interactions")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .filter((q) =>
        q.or(
          q.eq(q.field("expires_at"), undefined),
          q.gte(q.field("expires_at"), now)
        )
      )
      .collect();

    // Calculate barber affinities
    const barberScores: Map<string, {
      score: number;
      lastInteraction: number;
      bookingCount: number;
      likeCount: number;
    }> = new Map();

    for (const interaction of interactions) {
      if (!interaction.barber_id) continue;

      const barberId = interaction.barber_id.toString();
      const current = barberScores.get(barberId) || {
        score: 0,
        lastInteraction: 0,
        bookingCount: 0,
        likeCount: 0,
      };

      const weight = SIGNAL_WEIGHTS[interaction.interaction_type] || 0;
      current.score += weight;
      current.lastInteraction = Math.max(current.lastInteraction, interaction.createdAt);

      if (interaction.interaction_type === "book") {
        current.bookingCount++;
      }
      if (interaction.interaction_type === "like") {
        current.likeCount++;
      }

      barberScores.set(barberId, current);
    }

    // Convert to array and sort by score
    const barberAffinities = Array.from(barberScores.entries())
      .map(([barberId, data]) => ({
        barber_id: barberId as Id<"barbers">,
        score: Math.min(100, Math.max(0, data.score)), // Clamp to 0-100
        last_interaction: data.lastInteraction,
        booking_count: data.bookingCount,
        like_count: data.likeCount,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20); // Keep top 20

    // Calculate vibe scores from interactions
    const vibeScores: Record<string, number> = {
      classic: 0,
      trendy: 0,
      edgy: 0,
      clean: 0,
    };

    for (const interaction of interactions) {
      if (!interaction.style_vibes) continue;
      const weight = SIGNAL_WEIGHTS[interaction.interaction_type] || 0;

      for (const vibe of interaction.style_vibes) {
        if (vibeScores[vibe] !== undefined) {
          vibeScores[vibe] += weight;
        }
      }
    }

    // Normalize vibe scores to 0-100
    const maxVibeScore = Math.max(...Object.values(vibeScores), 1);
    const normalizedVibes: Record<string, number> = {};
    for (const [vibe, score] of Object.entries(vibeScores)) {
      normalizedVibes[vibe] = Math.round((score / maxVibeScore) * 100);
    }

    // Determine preferred vibes (score > 25)
    const preferredVibes = Object.entries(normalizedVibes)
      .filter(([_, score]) => score > 25)
      .sort((a, b) => b[1] - a[1])
      .map(([vibe]) => vibe) as Array<"classic" | "trendy" | "edgy" | "clean">;

    // Count post types
    const postTypeCounts: Record<string, number> = {};
    for (const interaction of interactions) {
      if (!interaction.post_type) continue;
      const weight = SIGNAL_WEIGHTS[interaction.interaction_type] || 0;
      postTypeCounts[interaction.post_type] = (postTypeCounts[interaction.post_type] || 0) + weight;
    }

    const preferredPostTypes = Object.entries(postTypeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type]) => type);

    // Get existing profile
    const existingProfile = await ctx.db
      .query("user_feed_profile")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .first();

    // Also check for Matcher preferences to merge
    const matcherPrefs = await ctx.db
      .query("user_style_preferences")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .first();

    // Merge Matcher vibes with learned vibes (Matcher gets priority)
    let finalPreferredVibes = preferredVibes;
    if (matcherPrefs?.vibes && matcherPrefs.vibes.length > 0) {
      // Combine: Matcher vibes first, then learned vibes that aren't duplicates
      const matcherVibeSet = new Set(matcherPrefs.vibes);
      const uniqueLearnedVibes = preferredVibes.filter(v => !matcherVibeSet.has(v));
      finalPreferredVibes = [...matcherPrefs.vibes, ...uniqueLearnedVibes].slice(0, 4) as Array<"classic" | "trendy" | "edgy" | "clean">;
    }

    const profileData = {
      barber_affinities: barberAffinities,
      preferred_vibes: finalPreferredVibes.length > 0 ? finalPreferredVibes : undefined,
      vibe_scores: normalizedVibes,
      preferred_post_types: preferredPostTypes.length > 0 ? preferredPostTypes : undefined,
      total_interactions: interactions.length,
      last_feed_view: now,
      profile_version: (existingProfile?.profile_version || 0) + 1,
      updatedAt: now,
    };

    if (existingProfile) {
      await ctx.db.patch(existingProfile._id, profileData);
    } else {
      await ctx.db.insert("user_feed_profile", {
        user_id: args.userId,
        ...profileData,
        createdAt: now,
      });
    }

    return { success: true };
  },
});

/**
 * Get user's feed profile
 */
export const getUserFeedProfile = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("user_feed_profile")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .first();
  },
});

// ============================================================
// PERSONALIZED FEED (FOR YOU)
// ============================================================

/**
 * Get personalized "For You" feed
 * Uses scoring algorithm to rank posts based on user preferences
 */
export const getForYouFeed = query({
  args: {
    userId: v.optional(v.id("users")),
    branchId: v.optional(v.id("branches")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    const now = Date.now();

    // Get all published posts (we'll score and sort them)
    let posts;
    if (args.branchId) {
      posts = await ctx.db
        .query("branch_posts")
        .withIndex("by_branch_status", (q) =>
          q.eq("branch_id", args.branchId).eq("status", "published")
        )
        .order("desc")
        .take(100); // Get more posts to rank
    } else {
      posts = await ctx.db
        .query("branch_posts")
        .withIndex("by_created_at")
        .order("desc")
        .take(100);
      posts = posts.filter((p) => p.status === "published");
    }

    // Get user profile if logged in
    let userProfile = null;
    let userInteractions: Map<string, string> = new Map(); // postId -> interaction type

    if (args.userId) {
      userProfile = await ctx.db
        .query("user_feed_profile")
        .withIndex("by_user", (q) => q.eq("user_id", args.userId))
        .first();

      // Get recent interactions to avoid showing already-engaged posts too high
      const recentInteractions = await ctx.db
        .query("feed_interactions")
        .withIndex("by_user", (q) => q.eq("user_id", args.userId))
        .order("desc")
        .take(100);

      for (const interaction of recentInteractions) {
        const existing = userInteractions.get(interaction.post_id.toString());
        // Keep highest-value interaction
        if (!existing || SIGNAL_WEIGHTS[interaction.interaction_type] > SIGNAL_WEIGHTS[existing as keyof typeof SIGNAL_WEIGHTS]) {
          userInteractions.set(interaction.post_id.toString(), interaction.interaction_type);
        }
      }
    }

    // Enrich posts and calculate scores
    const scoredPosts = await Promise.all(
      posts.map(async (post) => {
        // Get author and barber info
        const author = await ctx.db.get(post.author_id);
        let barberInfo = null;
        let barberAvatarUrl = null;

        if (author && author.role === "barber") {
          barberInfo = await ctx.db
            .query("barbers")
            .withIndex("by_user", (q) => q.eq("user", author._id))
            .first();

          if (barberInfo?.avatarStorageId) {
            barberAvatarUrl = await ctx.storage.getUrl(barberInfo.avatarStorageId);
          }
        }

        // Calculate score components
        let score = 0;

        // 1. Base Engagement (20%) - Likes and views
        const engagementScore = Math.min(100,
          ((post.likes_count || 0) * 2) +
          Math.log10((post.view_count || 1)) * 10
        );
        score += engagementScore * ALGO_WEIGHTS.baseEngagement;

        // 2. Style Match (30%) - Match user's vibes
        if (userProfile?.preferred_vibes && barberInfo?.style_vibes) {
          const userVibes = new Set(userProfile.preferred_vibes);
          const barberVibes = barberInfo.style_vibes || [];
          const matchCount = barberVibes.filter((v: string) => userVibes.has(v)).length;
          const styleScore = (matchCount / Math.max(userVibes.size, 1)) * 100;
          score += styleScore * ALGO_WEIGHTS.styleMatch;
        } else {
          // No preference data - give neutral score
          score += 50 * ALGO_WEIGHTS.styleMatch;
        }

        // 3. Barber Affinity (25%) - History with this barber
        if (userProfile?.barber_affinities && barberInfo) {
          const affinity = userProfile.barber_affinities.find(
            (a: { barber_id: Id<"barbers"> }) => a.barber_id === barberInfo._id
          );
          const affinityScore = affinity?.score || 0;
          score += affinityScore * ALGO_WEIGHTS.barberAffinity;
        } else {
          score += 30 * ALGO_WEIGHTS.barberAffinity; // Neutral for new users
        }

        // 4. Recency Boost (15%) - Newer posts score higher
        const ageHours = (now - post.createdAt) / (1000 * 60 * 60);
        const recencyScore = Math.max(0, 100 - (ageHours * 2)); // Decays over ~50 hours
        score += recencyScore * ALGO_WEIGHTS.recencyBoost;

        // 5. Pinned posts get a boost
        if (post.pinned) {
          score += 20;
        }

        // 6. Penalize vacation posts (they're informational, not engaging)
        if (post.post_type === "vacation") {
          score -= 30;
        }

        // For admin posts, use branch name and branding logo
        const isAdminPost = post.author_type === "branch_admin" || post.author_type === "super_admin";
        let authorName = barberInfo?.full_name || author?.nickname || author?.username;
        let authorAvatar = barberAvatarUrl || barberInfo?.avatar || author?.avatar_url;
        let authorSlug = barberInfo?.full_name ? slugify(barberInfo.full_name) : null;
        let isBranchPost = false;

        if (isAdminPost) {
          const branch = await ctx.db.get(post.branch_id);
          authorName = branch?.name || "Unknown Branch";
          isBranchPost = true;
          authorSlug = branch?.slug || null;

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
          author: author ? {
            _id: author._id,
            name: authorName,
            avatar: authorAvatar,
            barberId: barberInfo?._id || null,
            slug: authorSlug,
            isBranch: isBranchPost,
          } : null,
          _score: score,
          _alreadyInteracted: userInteractions.get(post._id.toString()),
        };
      })
    );

    // Sort by score, with diversity injection
    scoredPosts.sort((a, b) => b._score - a._score);

    // Apply diversity: don't show same barber 3 times in top 10
    const diversified = [];
    const barberCounts: Map<string, number> = new Map();

    for (const post of scoredPosts) {
      if (diversified.length >= limit) break;

      const barberId = post.author?.barberId?.toString() || "branch";
      const count = barberCounts.get(barberId) || 0;

      // Allow max 2 posts from same barber in top results
      if (count < 2 || diversified.length >= 10) {
        diversified.push(post);
        barberCounts.set(barberId, count + 1);
      }
    }

    // Remove internal scoring fields from response
    return diversified.map(({ _score, _alreadyInteracted, ...post }) => ({
      ...post,
      // Add personalization indicators for UI
      _personalized: !!args.userId && !!userProfile,
    }));
  },
});

// ============================================================
// COLD START & TRENDING
// ============================================================

/**
 * Get trending posts for new users (cold start)
 * Based purely on recent engagement, not personalization
 */
export const getTrendingPosts = query({
  args: {
    branchId: v.optional(v.id("branches")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    // Get recent posts
    let posts;
    if (args.branchId) {
      posts = await ctx.db
        .query("branch_posts")
        .withIndex("by_branch_status", (q) =>
          q.eq("branch_id", args.branchId).eq("status", "published")
        )
        .order("desc")
        .take(50);
    } else {
      posts = await ctx.db
        .query("branch_posts")
        .withIndex("by_created_at")
        .order("desc")
        .take(50);
      posts = posts.filter((p) => p.status === "published");
    }

    // Filter to recent posts only
    const recentPosts = posts.filter((p) => p.createdAt >= weekAgo);

    // Score by engagement rate (likes + views weighted)
    const scored = recentPosts.map((post) => ({
      ...post,
      _trendScore: ((post.likes_count || 0) * 5) + (post.view_count || 0),
    }));

    // Sort by trend score
    scored.sort((a, b) => b._trendScore - a._trendScore);

    // Enrich with author info
    const enriched = await Promise.all(
      scored.slice(0, limit).map(async (post) => {
        const author = await ctx.db.get(post.author_id);
        let barberInfo = null;

        if (author && author.role === "barber") {
          barberInfo = await ctx.db
            .query("barbers")
            .withIndex("by_user", (q) => q.eq("user", author._id))
            .first();
        }

        // For admin posts, use branch name and branding logo
        const isAdminPost = post.author_type === "branch_admin" || post.author_type === "super_admin";
        let authorName = barberInfo?.full_name || author?.nickname || author?.username;
        let authorAvatar = barberInfo?.avatar || author?.avatar_url;
        let authorSlug = barberInfo?.full_name ? slugify(barberInfo.full_name) : null;
        let isBranchPost = false;

        if (isAdminPost) {
          const branch = await ctx.db.get(post.branch_id);
          authorName = branch?.name || "Unknown Branch";
          isBranchPost = true;
          authorSlug = branch?.slug || null;

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

        const { _trendScore, ...postData } = post;
        return {
          ...postData,
          author: author ? {
            _id: author._id,
            name: authorName,
            avatar: authorAvatar,
            barberId: barberInfo?._id || null,
            slug: authorSlug,
            isBranch: isBranchPost,
          } : null,
          _trending: true,
        };
      })
    );

    return enriched;
  },
});

// ============================================================
// ANALYTICS HELPERS
// ============================================================

/**
 * Get user's style taste profile (for display)
 */
export const getUserTasteProfile = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("user_feed_profile")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .first();

    // Also get Matcher preferences for complete picture
    const matcherPrefs = await ctx.db
      .query("user_style_preferences")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .first();

    if (!profile && !matcherPrefs) {
      return null;
    }

    return {
      vibeScores: profile?.vibe_scores || {},
      preferredVibes: profile?.preferred_vibes || matcherPrefs?.vibes || [],
      preferredPostTypes: profile?.preferred_post_types || [],
      topBarbers: profile?.barber_affinities?.slice(0, 5) || [],
      totalInteractions: profile?.total_interactions || 0,
      matcherConversation: matcherPrefs?.conversation,
      matcherSpeed: matcherPrefs?.speed,
      matcherBudget: matcherPrefs?.budget,
    };
  },
});
