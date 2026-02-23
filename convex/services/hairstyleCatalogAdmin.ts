import { v } from "convex/values";
import { query, mutation } from "../_generated/server";

// ============================================================================
// Hairstyle Catalog Admin — CRUD for managing hairstyle overlays
// ============================================================================

// Get all hairstyles (including inactive) for admin management
export const getAllHairstyles = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db
      .query("hairstyle_catalog")
      .order("desc")
      .collect();

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

// Add a new hairstyle to the catalog
export const addHairstyle = mutation({
  args: {
    name: v.string(),
    category: v.union(
      v.literal("fade"),
      v.literal("undercut"),
      v.literal("classic"),
      v.literal("modern"),
      v.literal("long"),
      v.literal("buzz"),
      v.literal("textured")
    ),
    description: v.optional(v.string()),
    face_shape_scores: v.object({
      oval: v.number(),
      round: v.number(),
      square: v.number(),
      heart: v.number(),
      diamond: v.number(),
      oblong: v.number(),
    }),
    overlay_image_id: v.id("_storage"),
    thumbnail_image_id: v.optional(v.id("_storage")),
    recommended_product_ids: v.optional(v.array(v.id("products"))),
    maintenance_level: v.optional(v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high")
    )),
    style_tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("hairstyle_catalog", {
      ...args,
      try_count: 0,
      save_count: 0,
      is_active: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update a hairstyle
export const updateHairstyle = mutation({
  args: {
    id: v.id("hairstyle_catalog"),
    name: v.optional(v.string()),
    category: v.optional(v.union(
      v.literal("fade"),
      v.literal("undercut"),
      v.literal("classic"),
      v.literal("modern"),
      v.literal("long"),
      v.literal("buzz"),
      v.literal("textured")
    )),
    description: v.optional(v.string()),
    face_shape_scores: v.optional(v.object({
      oval: v.number(),
      round: v.number(),
      square: v.number(),
      heart: v.number(),
      diamond: v.number(),
      oblong: v.number(),
    })),
    overlay_image_id: v.optional(v.id("_storage")),
    thumbnail_image_id: v.optional(v.id("_storage")),
    recommended_product_ids: v.optional(v.array(v.id("products"))),
    maintenance_level: v.optional(v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high")
    )),
    style_tags: v.optional(v.array(v.string())),
    is_active: v.optional(v.boolean()),
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

// Delete a hairstyle (and its storage files)
export const deleteHairstyle = mutation({
  args: {
    id: v.id("hairstyle_catalog"),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (item) {
      await ctx.storage.delete(item.overlay_image_id);
      if (item.thumbnail_image_id) {
        await ctx.storage.delete(item.thumbnail_image_id);
      }
      await ctx.db.delete(args.id);
    }
    return { success: true };
  },
});
