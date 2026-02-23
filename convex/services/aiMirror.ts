import { v } from "convex/values";
import { query, mutation } from "../_generated/server";

// ============================================================================
// AI Mirror Service — Hairstyle catalog, saved looks, face profiles
// ============================================================================

// Generate upload URL for images (overlay, composite, reference photo)
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Get full hairstyle catalog (active only)
export const getHairstyleCatalog = query({
  args: {
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let items;
    if (args.category) {
      items = await ctx.db
        .query("hairstyle_catalog")
        .withIndex("by_category", (q) => q.eq("category", args.category as any))
        .filter((q) => q.eq(q.field("is_active"), true))
        .collect();
    } else {
      items = await ctx.db
        .query("hairstyle_catalog")
        .withIndex("by_active", (q) => q.eq("is_active", true))
        .collect();
    }

    return await Promise.all(
      items.map(async (item) => {
        const overlayUrl = await ctx.storage.getUrl(item.overlay_image_id);
        const thumbnailUrl = item.thumbnail_image_id
          ? await ctx.storage.getUrl(item.thumbnail_image_id)
          : overlayUrl;
        return { ...item, overlayUrl, thumbnailUrl };
      })
    );
  },
});

// Get hairstyles sorted by compatibility for a face shape
export const getHairstylesForFaceShape = query({
  args: {
    face_shape: v.string(),
  },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("hairstyle_catalog")
      .withIndex("by_active", (q) => q.eq("is_active", true))
      .collect();

    const shape = args.face_shape as keyof typeof items[0]["face_shape_scores"];

    const withUrls = await Promise.all(
      items.map(async (item) => {
        const overlayUrl = await ctx.storage.getUrl(item.overlay_image_id);
        const thumbnailUrl = item.thumbnail_image_id
          ? await ctx.storage.getUrl(item.thumbnail_image_id)
          : overlayUrl;
        const score = item.face_shape_scores[shape] ?? 50;
        return { ...item, overlayUrl, thumbnailUrl, compatibilityScore: score };
      })
    );

    // Sort by compatibility score descending
    return withUrls.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
  },
});

// Increment try count when user previews a hairstyle
export const incrementTryCount = mutation({
  args: {
    hairstyle_id: v.id("hairstyle_catalog"),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.hairstyle_id);
    if (item) {
      await ctx.db.patch(args.hairstyle_id, {
        try_count: item.try_count + 1,
      });
    }
  },
});

// Save a look (composite image with hairstyle overlay)
export const saveLook = mutation({
  args: {
    user_id: v.id("users"),
    hairstyle_id: v.id("hairstyle_catalog"),
    composite_image_id: v.id("_storage"),
    face_shape: v.string(),
    compatibility_score: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Increment save count on the hairstyle
    const hairstyle = await ctx.db.get(args.hairstyle_id);
    if (hairstyle) {
      await ctx.db.patch(args.hairstyle_id, {
        save_count: hairstyle.save_count + 1,
      });
    }

    return await ctx.db.insert("mirror_saved_looks", {
      user_id: args.user_id,
      hairstyle_id: args.hairstyle_id,
      composite_image_id: args.composite_image_id,
      face_shape: args.face_shape,
      compatibility_score: args.compatibility_score,
      notes: args.notes,
      is_favorite: false,
      createdAt: Date.now(),
    });
  },
});

// Get user's saved looks
export const getUserLooks = query({
  args: {
    user_id: v.id("users"),
    favorites_only: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let looks;
    if (args.favorites_only) {
      looks = await ctx.db
        .query("mirror_saved_looks")
        .withIndex("by_user_favorite", (q) =>
          q.eq("user_id", args.user_id).eq("is_favorite", true)
        )
        .collect();
    } else {
      looks = await ctx.db
        .query("mirror_saved_looks")
        .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
        .order("desc")
        .collect();
    }

    return await Promise.all(
      looks.map(async (look) => {
        const compositeUrl = await ctx.storage.getUrl(look.composite_image_id);
        const hairstyle = await ctx.db.get(look.hairstyle_id);
        return {
          ...look,
          compositeUrl,
          hairstyleName: hairstyle?.name ?? "Unknown",
          hairstyleCategory: hairstyle?.category,
        };
      })
    );
  },
});

// Toggle favorite on a saved look
export const toggleFavorite = mutation({
  args: {
    look_id: v.id("mirror_saved_looks"),
  },
  handler: async (ctx, args) => {
    const look = await ctx.db.get(args.look_id);
    if (look) {
      await ctx.db.patch(args.look_id, {
        is_favorite: !look.is_favorite,
      });
    }
    return { success: true };
  },
});

// Delete a saved look
export const deleteLook = mutation({
  args: {
    look_id: v.id("mirror_saved_looks"),
  },
  handler: async (ctx, args) => {
    const look = await ctx.db.get(args.look_id);
    if (look) {
      await ctx.storage.delete(look.composite_image_id);
      await ctx.db.delete(args.look_id);
    }
    return { success: true };
  },
});

// Save user face profile (detected face shape + measurements)
export const saveUserFaceProfile = mutation({
  args: {
    user_id: v.id("users"),
    face_shape: v.union(
      v.literal("oval"),
      v.literal("round"),
      v.literal("square"),
      v.literal("heart"),
      v.literal("diamond"),
      v.literal("oblong")
    ),
    measurements: v.object({
      jaw_width: v.number(),
      forehead_width: v.number(),
      cheekbone_width: v.number(),
      face_length: v.number(),
    }),
    confidence: v.number(),
    reference_photo_id: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    // Check if profile already exists
    const existing = await ctx.db
      .query("user_face_profile")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        face_shape: args.face_shape,
        measurements: args.measurements,
        confidence: args.confidence,
        reference_photo_id: args.reference_photo_id,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("user_face_profile", {
        user_id: args.user_id,
        face_shape: args.face_shape,
        measurements: args.measurements,
        confidence: args.confidence,
        reference_photo_id: args.reference_photo_id,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// Get user face profile
export const getUserFaceProfile = query({
  args: {
    user_id: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("user_face_profile")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .first();
  },
});
