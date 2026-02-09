/**
 * Barber Matcher Service
 * AI-powered barber recommendation system for "Help Me Choose" feature
 *
 * @module convex/services/barberMatcher
 */

import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";

// Type definitions for matcher
type StyleVibe = "classic" | "trendy" | "edgy" | "clean";
type ConversationStyle = "chatty" | "balanced" | "quiet";
type WorkSpeed = "fast" | "moderate" | "detailed";
type PriceTier = "budget" | "mid" | "premium";
type TimePreference = "weekday_am" | "weekday_pm" | "weekend" | "flexible";

interface MatchResult {
  barberId: Id<"barbers">;
  barberName: string;
  avatar: string | null;
  rating: number;
  totalBookings: number;
  matchScore: number;
  matchReasons: string[];
  specialties: string[];
  bio: string | null;
  tagline: string | null;
}

/**
 * Calculate match score between user preferences and barber profile
 */
function calculateMatchScore(
  userPrefs: {
    vibes?: StyleVibe[];
    conversation?: ConversationStyle;
    speed?: WorkSpeed;
    budget?: PriceTier | "any";
  },
  barber: {
    style_vibes?: StyleVibe[];
    conversation_style?: ConversationStyle;
    work_speed?: WorkSpeed;
    price_tier?: PriceTier;
    rating: number;
    totalBookings: number;
  }
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  let maxPossibleScore = 0;

  // Style vibe matching (40 points max)
  if (userPrefs.vibes && userPrefs.vibes.length > 0 && barber.style_vibes) {
    maxPossibleScore += 40;
    const vibeMatches = userPrefs.vibes.filter((v) =>
      barber.style_vibes?.includes(v)
    );
    const vibeScore = (vibeMatches.length / userPrefs.vibes.length) * 40;
    score += vibeScore;
    if (vibeMatches.length > 0) {
      reasons.push(`Matches your ${vibeMatches.join(", ")} style preference`);
    }
  }

  // Conversation style matching (20 points max)
  if (userPrefs.conversation && barber.conversation_style) {
    maxPossibleScore += 20;
    if (userPrefs.conversation === barber.conversation_style) {
      score += 20;
      reasons.push(
        `${barber.conversation_style === "chatty" ? "Loves to chat" : barber.conversation_style === "quiet" ? "Focused & quiet" : "Balanced conversation"}`
      );
    } else if (
      (userPrefs.conversation === "balanced" &&
        barber.conversation_style !== undefined) ||
      barber.conversation_style === "balanced"
    ) {
      score += 10; // Partial match for balanced
    }
  }

  // Work speed matching (15 points max)
  if (userPrefs.speed && barber.work_speed) {
    maxPossibleScore += 15;
    if (userPrefs.speed === barber.work_speed) {
      score += 15;
      reasons.push(
        `${barber.work_speed === "fast" ? "Quick & efficient" : barber.work_speed === "detailed" ? "Takes time for precision" : "Moderate pace"}`
      );
    } else if (
      (userPrefs.speed === "moderate" && barber.work_speed !== undefined) ||
      barber.work_speed === "moderate"
    ) {
      score += 7; // Partial match for moderate
    }
  }

  // Budget matching (15 points max)
  if (userPrefs.budget && userPrefs.budget !== "any" && barber.price_tier) {
    maxPossibleScore += 15;
    if (userPrefs.budget === barber.price_tier) {
      score += 15;
      reasons.push(
        `Fits your ${barber.price_tier === "budget" ? "budget-friendly" : barber.price_tier === "premium" ? "premium" : "mid-range"} preference`
      );
    }
  } else if (userPrefs.budget === "any") {
    maxPossibleScore += 15;
    score += 15; // Full score if user doesn't care about budget
  }

  // Rating bonus (10 points max)
  maxPossibleScore += 10;
  const ratingScore = (barber.rating / 5) * 10;
  score += ratingScore;
  if (barber.rating >= 4.5) {
    reasons.push(`Highly rated (${barber.rating.toFixed(1)}⭐)`);
  }

  // Normalize to percentage
  const normalizedScore =
    maxPossibleScore > 0 ? Math.round((score / maxPossibleScore) * 100) : 50;

  return {
    score: Math.min(100, Math.max(0, normalizedScore)),
    reasons,
  };
}

/**
 * Get matched barbers based on user preferences
 */
export const getMatchedBarbers = query({
  args: {
    userId: v.optional(v.id("users")),
    branchId: v.optional(v.id("branches")),
    // Quiz inputs (if not using stored preferences)
    vibes: v.optional(
      v.array(
        v.union(
          v.literal("classic"),
          v.literal("trendy"),
          v.literal("edgy"),
          v.literal("clean")
        )
      )
    ),
    conversation: v.optional(
      v.union(v.literal("chatty"), v.literal("balanced"), v.literal("quiet"))
    ),
    speed: v.optional(
      v.union(v.literal("fast"), v.literal("moderate"), v.literal("detailed"))
    ),
    budget: v.optional(
      v.union(
        v.literal("budget"),
        v.literal("mid"),
        v.literal("premium"),
        v.literal("any")
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 5;

    // Get user's stored preferences if userId provided and no direct inputs
    let userPrefs = {
      vibes: args.vibes,
      conversation: args.conversation,
      speed: args.speed,
      budget: args.budget,
    };

    if (
      args.userId &&
      !args.vibes &&
      !args.conversation &&
      !args.speed &&
      !args.budget
    ) {
      const storedPrefs = await ctx.db
        .query("user_style_preferences")
        .withIndex("by_user", (q) => q.eq("user_id", args.userId!))
        .first();

      if (storedPrefs) {
        userPrefs = {
          vibes: storedPrefs.preferred_vibes as StyleVibe[] | undefined,
          conversation: storedPrefs.preferred_conversation as
            | ConversationStyle
            | undefined,
          speed: storedPrefs.preferred_speed as WorkSpeed | undefined,
          budget: storedPrefs.budget_preference as
            | PriceTier
            | "any"
            | undefined,
        };
      }
    }

    // Get active barbers
    let barbers;
    if (args.branchId) {
      barbers = await ctx.db
        .query("barbers")
        .withIndex("by_branch", (q) => q.eq("branch_id", args.branchId!))
        .filter((q) => q.eq(q.field("is_active"), true))
        .collect();
    } else {
      barbers = await ctx.db
        .query("barbers")
        .withIndex("by_active", (q) => q.eq("is_active", true))
        .collect();
    }

    // Filter to only barbers accepting bookings
    barbers = barbers.filter(
      (b) => b.is_accepting_bookings === undefined || b.is_accepting_bookings
    );

    // Calculate match scores for each barber
    const matchedBarbers: MatchResult[] = [];

    for (const barber of barbers) {
      const { score, reasons } = calculateMatchScore(userPrefs, {
        style_vibes: barber.style_vibes as StyleVibe[] | undefined,
        conversation_style: barber.conversation_style as
          | ConversationStyle
          | undefined,
        work_speed: barber.work_speed as WorkSpeed | undefined,
        price_tier: barber.price_tier as PriceTier | undefined,
        rating: barber.rating,
        totalBookings: barber.totalBookings,
      });

      // Get barber's avatar URL
      let avatarUrl = barber.avatar;
      if (barber.avatarStorageId) {
        avatarUrl = await ctx.storage.getUrl(barber.avatarStorageId);
      }

      matchedBarbers.push({
        barberId: barber._id,
        barberName: barber.full_name,
        avatar: avatarUrl || null,
        rating: barber.rating,
        totalBookings: barber.totalBookings,
        matchScore: score,
        matchReasons: reasons,
        specialties: barber.specialties,
        bio: barber.bio || null,
        tagline: barber.matcher_tagline || null,
      });
    }

    // Sort by match score (highest first)
    matchedBarbers.sort((a, b) => b.matchScore - a.matchScore);

    return matchedBarbers.slice(0, limit);
  },
});

/**
 * Save user's quiz results/preferences
 */
export const saveUserPreferences = mutation({
  args: {
    userId: v.id("users"),
    vibes: v.optional(
      v.array(
        v.union(
          v.literal("classic"),
          v.literal("trendy"),
          v.literal("edgy"),
          v.literal("clean")
        )
      )
    ),
    conversation: v.optional(
      v.union(v.literal("chatty"), v.literal("balanced"), v.literal("quiet"))
    ),
    speed: v.optional(
      v.union(v.literal("fast"), v.literal("moderate"), v.literal("detailed"))
    ),
    budget: v.optional(
      v.union(
        v.literal("budget"),
        v.literal("mid"),
        v.literal("premium"),
        v.literal("any")
      )
    ),
    timePreference: v.optional(
      v.union(
        v.literal("weekday_am"),
        v.literal("weekday_pm"),
        v.literal("weekend"),
        v.literal("flexible")
      )
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if preferences already exist
    const existing = await ctx.db
      .query("user_style_preferences")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .first();

    if (existing) {
      // Update existing preferences
      await ctx.db.patch(existing._id, {
        preferred_vibes: args.vibes,
        preferred_conversation: args.conversation,
        preferred_speed: args.speed,
        budget_preference: args.budget,
        time_preference: args.timePreference,
        quiz_completed_at: now,
        updatedAt: now,
      });
      return { success: true, preferencesId: existing._id };
    } else {
      // Create new preferences
      const preferencesId = await ctx.db.insert("user_style_preferences", {
        user_id: args.userId,
        preferred_vibes: args.vibes,
        preferred_conversation: args.conversation,
        preferred_speed: args.speed,
        budget_preference: args.budget,
        time_preference: args.timePreference,
        swipe_count: 0,
        quiz_completed_at: now,
        createdAt: now,
        updatedAt: now,
      });
      return { success: true, preferencesId };
    }
  },
});

/**
 * Record a style swipe (for learning user preferences)
 */
export const recordSwipe = mutation({
  args: {
    userId: v.id("users"),
    imageUrl: v.string(),
    barberId: v.optional(v.id("barbers")),
    liked: v.boolean(),
    styleTags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Record the swipe
    await ctx.db.insert("style_swipe_history", {
      user_id: args.userId,
      image_url: args.imageUrl,
      barber_id: args.barberId,
      liked: args.liked,
      style_tags: args.styleTags,
      createdAt: now,
    });

    // Update swipe count in preferences
    const prefs = await ctx.db
      .query("user_style_preferences")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .first();

    if (prefs) {
      await ctx.db.patch(prefs._id, {
        swipe_count: (prefs.swipe_count || 0) + 1,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

/**
 * Record a match result (for analytics)
 */
export const recordMatchResult = mutation({
  args: {
    userId: v.id("users"),
    barberId: v.id("barbers"),
    matchScore: v.number(),
    matchReasons: v.array(v.string()),
    resultedInBooking: v.optional(v.boolean()),
    bookingId: v.optional(v.id("bookings")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.insert("barber_match_history", {
      user_id: args.userId,
      barber_id: args.barberId,
      match_score: args.matchScore,
      match_reasons: args.matchReasons,
      resulted_in_booking: args.resultedInBooking,
      booking_id: args.bookingId,
      createdAt: now,
    });

    // Update user's last matched barber
    const prefs = await ctx.db
      .query("user_style_preferences")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .first();

    if (prefs) {
      await ctx.db.patch(prefs._id, {
        last_matched_barber_id: args.barberId,
        last_match_score: args.matchScore,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

/**
 * Get user's style preferences
 */
export const getUserPreferences = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const prefs = await ctx.db
      .query("user_style_preferences")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .first();

    return prefs;
  },
});

/**
 * Get showcase images for swipe cards (from all barbers or specific branch)
 */
export const getShowcaseImages = query({
  args: {
    branchId: v.optional(v.id("branches")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    // Get active barbers
    let barbers;
    if (args.branchId) {
      barbers = await ctx.db
        .query("barbers")
        .withIndex("by_branch", (q) => q.eq("branch_id", args.branchId!))
        .filter((q) => q.eq(q.field("is_active"), true))
        .collect();
    } else {
      barbers = await ctx.db
        .query("barbers")
        .withIndex("by_active", (q) => q.eq("is_active", true))
        .collect();
    }

    // Collect showcase images from barbers
    const images: {
      imageUrl: string;
      barberId: Id<"barbers">;
      barberName: string;
      styleTags: string[];
    }[] = [];

    for (const barber of barbers) {
      if (barber.showcase_images && barber.showcase_images.length > 0) {
        for (const img of barber.showcase_images) {
          images.push({
            imageUrl: img,
            barberId: barber._id,
            barberName: barber.full_name,
            styleTags: barber.style_vibes || [],
          });
        }
      }
    }

    // Also get images from recent showcase posts
    const showcasePosts = await ctx.db
      .query("branch_posts")
      .withIndex("by_created_at")
      .order("desc")
      .filter((q) =>
        q.and(
          q.eq(q.field("post_type"), "showcase"),
          q.eq(q.field("status"), "published")
        )
      )
      .take(20);

    for (const post of showcasePosts) {
      if (post.images && post.images.length > 0) {
        // Get barber info for this post
        const author = await ctx.db.get(post.author_id);
        if (author && author.role === "barber") {
          const barber = await ctx.db
            .query("barbers")
            .withIndex("by_user", (q) => q.eq("user", author._id))
            .first();

          if (barber) {
            for (const img of post.images) {
              images.push({
                imageUrl: img,
                barberId: barber._id,
                barberName: barber.full_name,
                styleTags: barber.style_vibes || [],
              });
            }
          }
        }
      }
    }

    // Shuffle and limit
    const shuffled = images.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, limit);
  },
});

/**
 * Get barbers with matcher profiles (for admin/setup)
 */
export const getBarbersWithMatcherProfiles = query({
  args: {
    branchId: v.optional(v.id("branches")),
  },
  handler: async (ctx, args) => {
    let barbers;
    if (args.branchId) {
      barbers = await ctx.db
        .query("barbers")
        .withIndex("by_branch", (q) => q.eq("branch_id", args.branchId!))
        .collect();
    } else {
      barbers = await ctx.db.query("barbers").collect();
    }

    return barbers.map((b) => ({
      _id: b._id,
      full_name: b.full_name,
      is_active: b.is_active,
      style_vibes: b.style_vibes,
      conversation_style: b.conversation_style,
      work_speed: b.work_speed,
      price_tier: b.price_tier,
      matcher_tagline: b.matcher_tagline,
      showcase_images: b.showcase_images,
      hasMatcherProfile: !!(
        b.style_vibes ||
        b.conversation_style ||
        b.work_speed ||
        b.price_tier
      ),
    }));
  },
});

/**
 * Update barber's matcher profile
 */
export const updateBarberMatcherProfile = mutation({
  args: {
    barberId: v.id("barbers"),
    styleVibes: v.optional(
      v.array(
        v.union(
          v.literal("classic"),
          v.literal("trendy"),
          v.literal("edgy"),
          v.literal("clean")
        )
      )
    ),
    conversationStyle: v.optional(
      v.union(v.literal("chatty"), v.literal("balanced"), v.literal("quiet"))
    ),
    workSpeed: v.optional(
      v.union(v.literal("fast"), v.literal("moderate"), v.literal("detailed"))
    ),
    priceTier: v.optional(
      v.union(v.literal("budget"), v.literal("mid"), v.literal("premium"))
    ),
    matcherTagline: v.optional(v.string()),
    showcaseImages: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.patch(args.barberId, {
      style_vibes: args.styleVibes,
      conversation_style: args.conversationStyle,
      work_speed: args.workSpeed,
      price_tier: args.priceTier,
      matcher_tagline: args.matcherTagline,
      showcase_images: args.showcaseImages,
      updatedAt: now,
    });

    return { success: true };
  },
});
