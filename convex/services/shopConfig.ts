import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { ConvexError } from "convex/values";

/**
 * Shop Configuration Service
 *
 * Manages global shop settings including:
 * - Delivery fee configuration
 * - Free delivery threshold
 * - Minimum order amount
 * - Delivery/pickup toggles
 */

// Default configuration values
const DEFAULT_CONFIG = {
  delivery_fee: 50, // ₱50 default
  free_delivery_threshold: 0, // 0 = disabled
  min_order_amount: 0, // 0 = no minimum
  enable_delivery: true,
  enable_pickup: true,
  estimated_delivery_days: 3,
};

/**
 * Get shop configuration (public - for customer checkout)
 * Returns config or defaults if not configured
 */
export const getShopConfig = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db.query("shopConfig").first();

    if (!config) {
      return {
        ...DEFAULT_CONFIG,
        isConfigured: false,
      };
    }

    return {
      delivery_fee: config.delivery_fee,
      free_delivery_threshold: config.free_delivery_threshold ?? 0,
      min_order_amount: config.min_order_amount ?? 0,
      enable_delivery: config.enable_delivery,
      enable_pickup: config.enable_pickup,
      estimated_delivery_days: config.estimated_delivery_days ?? 3,
      isConfigured: true,
    };
  },
});

/**
 * Get full shop configuration (admin only)
 * Returns complete config with metadata
 */
export const getShopConfigAdmin = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db.query("shopConfig").first();

    if (!config) {
      return null;
    }

    return {
      _id: config._id,
      delivery_fee: config.delivery_fee,
      free_delivery_threshold: config.free_delivery_threshold ?? 0,
      min_order_amount: config.min_order_amount ?? 0,
      enable_delivery: config.enable_delivery,
      enable_pickup: config.enable_pickup,
      estimated_delivery_days: config.estimated_delivery_days ?? 3,
      created_at: config.created_at,
      updated_at: config.updated_at,
    };
  },
});

/**
 * Save shop configuration (create or update)
 * Super admin only
 */
export const saveShopConfig = mutation({
  args: {
    delivery_fee: v.number(),
    free_delivery_threshold: v.optional(v.number()),
    min_order_amount: v.optional(v.number()),
    enable_delivery: v.boolean(),
    enable_pickup: v.boolean(),
    estimated_delivery_days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Validate delivery fee is not negative
    if (args.delivery_fee < 0) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Delivery fee cannot be negative",
      });
    }

    // Validate at least one fulfillment option is enabled
    if (!args.enable_delivery && !args.enable_pickup) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "At least one fulfillment option (delivery or pickup) must be enabled",
      });
    }

    const existingConfig = await ctx.db.query("shopConfig").first();

    if (existingConfig) {
      // Update existing config
      await ctx.db.patch(existingConfig._id, {
        delivery_fee: args.delivery_fee,
        free_delivery_threshold: args.free_delivery_threshold ?? 0,
        min_order_amount: args.min_order_amount ?? 0,
        enable_delivery: args.enable_delivery,
        enable_pickup: args.enable_pickup,
        estimated_delivery_days: args.estimated_delivery_days ?? 3,
        updated_at: now,
      });

      return {
        success: true,
        message: "Shop configuration updated successfully",
        config_id: existingConfig._id,
        is_update: true,
      };
    } else {
      // Create new config
      const configId = await ctx.db.insert("shopConfig", {
        delivery_fee: args.delivery_fee,
        free_delivery_threshold: args.free_delivery_threshold ?? 0,
        min_order_amount: args.min_order_amount ?? 0,
        enable_delivery: args.enable_delivery,
        enable_pickup: args.enable_pickup,
        estimated_delivery_days: args.estimated_delivery_days ?? 3,
        created_at: now,
        updated_at: now,
      });

      return {
        success: true,
        message: "Shop configuration created successfully",
        config_id: configId,
        is_update: false,
      };
    }
  },
});

/**
 * Calculate delivery fee for an order
 * Takes order subtotal and returns applicable delivery fee
 * Returns 0 if free delivery threshold is met
 */
export const calculateDeliveryFee = query({
  args: {
    subtotal: v.number(),
  },
  handler: async (ctx, args) => {
    const config = await ctx.db.query("shopConfig").first();

    // Use defaults if not configured
    const deliveryFee = config?.delivery_fee ?? DEFAULT_CONFIG.delivery_fee;
    const freeThreshold = config?.free_delivery_threshold ?? 0;

    // Check if order qualifies for free delivery
    if (freeThreshold > 0 && args.subtotal >= freeThreshold) {
      return {
        delivery_fee: 0,
        original_fee: deliveryFee,
        free_delivery_applied: true,
        free_delivery_threshold: freeThreshold,
      };
    }

    return {
      delivery_fee: deliveryFee,
      original_fee: deliveryFee,
      free_delivery_applied: false,
      free_delivery_threshold: freeThreshold,
    };
  },
});
