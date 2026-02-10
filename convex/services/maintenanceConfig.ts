import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { ConvexError } from "convex/values";
import { requireAuthenticatedUser } from "../lib/unifiedAuth";

/**
 * Get maintenance status (public — no auth required)
 * Every visitor checks this to decide whether to show the maintenance page.
 */
export const getMaintenanceStatus = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db.query("maintenanceConfig").first();

    if (!config) {
      return {
        is_enabled: false,
        end_time: null,
        message: null,
      };
    }

    return {
      is_enabled: config.is_enabled,
      end_time: config.end_time ?? null,
      message: config.message ?? null,
    };
  },
});

/**
 * Update maintenance configuration (super_admin only)
 * Upserts the singleton record.
 */
export const updateMaintenanceConfig = mutation({
  args: {
    is_enabled: v.boolean(),
    end_time: v.optional(v.number()),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);

    if (user.role !== "super_admin") {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Only super admins can update maintenance settings",
      });
    }

    const now = Date.now();
    const existing = await ctx.db.query("maintenanceConfig").first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        is_enabled: args.is_enabled,
        end_time: args.end_time,
        message: args.message,
        updated_at: now,
        updated_by: user._id,
      });

      return { success: true, is_update: true };
    } else {
      await ctx.db.insert("maintenanceConfig", {
        is_enabled: args.is_enabled,
        end_time: args.end_time,
        message: args.message,
        updated_at: now,
        updated_by: user._id,
      });

      return { success: true, is_update: false };
    }
  },
});
