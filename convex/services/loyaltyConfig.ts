/**
 * Loyalty Configuration Service
 *
 * Manages dynamic configuration for the loyalty program.
 * Super Admin can configure point earning rates, multipliers, and bonuses.
 *
 * Config keys:
 * - base_earning_rate: Points per peso (default 1.0)
 * - wallet_bonus_multiplier: Multiplier for wallet payments (default 1.5)
 * - top_up_bonuses: JSON array of {amount, bonus} tiers
 * - points_enabled: Master toggle for points system
 *
 * @module convex/services/loyaltyConfig
 */

import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

// ============================================================================
// DEFAULT CONFIGURATION VALUES
// ============================================================================

export const DEFAULT_CONFIGS = [
  {
    config_key: "base_earning_rate",
    config_value: "1.0",
    config_type: "number" as const,
    description: "Points earned per peso spent (1.0 = 1 point per peso)",
  },
  {
    config_key: "wallet_bonus_multiplier",
    config_value: "1.5",
    config_type: "number" as const,
    description: "Bonus multiplier for wallet payments (1.5 = 50% bonus points)",
  },
  {
    config_key: "top_up_bonuses",
    config_value: JSON.stringify([
      { amount: 500, bonus: 50 },
      { amount: 1000, bonus: 150 },
    ]),
    config_type: "json" as const,
    description: "Top-up amount tiers and their bonus amounts",
  },
  {
    config_key: "points_enabled",
    config_value: "true",
    config_type: "boolean" as const,
    description: "Master toggle to enable/disable points earning",
  },
  {
    config_key: "min_redemption_points",
    config_value: "10000", // 100 points in ×100 format
    config_type: "number" as const,
    description: "Minimum points required for redemption (×100 format)",
  },
  // Points Expiry Configuration (Story 19.5)
  {
    config_key: "points_expiry_enabled",
    config_value: "false",
    config_type: "boolean" as const,
    description: "Whether points automatically expire after inactivity period",
  },
  {
    config_key: "points_expiry_months",
    config_value: "12",
    config_type: "number" as const,
    description: "Months of inactivity before points expire (0 = never)",
  },
  {
    config_key: "expiry_warning_days",
    config_value: "30",
    config_type: "number" as const,
    description: "Days before expiry to show warning to customers",
  },
];

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get a single configuration value by key
 * Returns parsed value based on config_type
 */
export const getConfig = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("loyalty_config")
      .withIndex("by_key", (q) => q.eq("config_key", args.key))
      .unique();

    if (!config) {
      // Return default if not in database
      const defaultConfig = DEFAULT_CONFIGS.find((c) => c.config_key === args.key);
      if (defaultConfig) {
        return parseConfigValue(defaultConfig.config_value, defaultConfig.config_type);
      }
      return null;
    }

    return parseConfigValue(config.config_value, config.config_type);
  },
});

/**
 * Get all configuration values for admin panel display
 */
export const getAllConfigs = query({
  args: {},
  handler: async (ctx) => {
    const configs = await ctx.db.query("loyalty_config").collect();

    // Merge with defaults to ensure all configs are present
    const configMap = new Map(configs.map((c) => [c.config_key, c]));

    return DEFAULT_CONFIGS.map((defaultConfig) => {
      const dbConfig = configMap.get(defaultConfig.config_key);
      if (dbConfig) {
        return {
          key: dbConfig.config_key,
          value: parseConfigValue(dbConfig.config_value, dbConfig.config_type),
          rawValue: dbConfig.config_value,
          type: dbConfig.config_type,
          description: dbConfig.description,
          updatedAt: dbConfig.updated_at,
          updatedBy: dbConfig.updated_by,
          isDefault: false,
        };
      }
      return {
        key: defaultConfig.config_key,
        value: parseConfigValue(defaultConfig.config_value, defaultConfig.config_type),
        rawValue: defaultConfig.config_value,
        type: defaultConfig.config_type,
        description: defaultConfig.description,
        updatedAt: null,
        updatedBy: null,
        isDefault: true,
      };
    });
  },
});

/**
 * Get config audit history for a specific key
 */
export const getConfigAuditHistory = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const audits = await ctx.db
      .query("loyalty_config_audit")
      .withIndex("by_key", (q) => q.eq("config_key", args.key))
      .order("desc")
      .take(20);

    // Get user names for audit entries
    const userIds = [...new Set(audits.map((a) => a.changed_by))];
    const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));
    const userMap = new Map(users.filter(Boolean).map((u) => [u!._id, u]));

    return audits.map((audit) => {
      const user = userMap.get(audit.changed_by);
      return {
        ...audit,
        changedByName: user?.nickname || user?.username || user?.email || "Unknown",
      };
    });
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Set a configuration value with audit logging
 */
export const setConfig = mutation({
  args: {
    key: v.string(),
    value: v.string(),
    userId: v.id("users"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find the config type from defaults
    const defaultConfig = DEFAULT_CONFIGS.find((c) => c.config_key === args.key);
    if (!defaultConfig) {
      throw new Error(`Unknown config key: ${args.key}`);
    }

    // Validate the value based on type
    validateConfigValue(args.value, defaultConfig.config_type);

    // Check if config exists
    const existing = await ctx.db
      .query("loyalty_config")
      .withIndex("by_key", (q) => q.eq("config_key", args.key))
      .unique();

    const oldValue = existing?.config_value || null;

    if (existing) {
      // Update existing config
      await ctx.db.patch(existing._id, {
        config_value: args.value,
        updated_at: now,
        updated_by: args.userId,
      });
    } else {
      // Insert new config
      await ctx.db.insert("loyalty_config", {
        config_key: args.key,
        config_value: args.value,
        config_type: defaultConfig.config_type,
        description: defaultConfig.description,
        updated_at: now,
        updated_by: args.userId,
      });
    }

    // Record audit log
    await ctx.db.insert("loyalty_config_audit", {
      config_key: args.key,
      old_value: oldValue || undefined,
      new_value: args.value,
      changed_by: args.userId,
      changed_at: now,
      change_reason: args.reason,
    });

    console.log(`[LOYALTY_CONFIG] Updated ${args.key}: ${oldValue} → ${args.value}`);

    return {
      success: true,
      key: args.key,
      newValue: parseConfigValue(args.value, defaultConfig.config_type),
      oldValue: oldValue ? parseConfigValue(oldValue, defaultConfig.config_type) : null,
    };
  },
});

/**
 * Seed default configuration values (run once on setup)
 */
export const seedDefaultConfigs = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let seeded = 0;

    for (const config of DEFAULT_CONFIGS) {
      // Check if already exists
      const existing = await ctx.db
        .query("loyalty_config")
        .withIndex("by_key", (q) => q.eq("config_key", config.config_key))
        .unique();

      if (!existing) {
        await ctx.db.insert("loyalty_config", {
          config_key: config.config_key,
          config_value: config.config_value,
          config_type: config.config_type,
          description: config.description,
          updated_at: now,
          updated_by: undefined,
        });
        seeded++;
        console.log(`[LOYALTY_CONFIG] Seeded default: ${config.config_key}`);
      }
    }

    return {
      success: true,
      seededCount: seeded,
      totalConfigs: DEFAULT_CONFIGS.length,
    };
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse config value from string based on type
 */
function parseConfigValue(
  value: string,
  type: "number" | "boolean" | "string" | "json"
): number | boolean | string | unknown {
  switch (type) {
    case "number":
      return parseFloat(value);
    case "boolean":
      return value === "true";
    case "json":
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    default:
      return value;
  }
}

/**
 * Validate config value format based on type
 */
function validateConfigValue(value: string, type: "number" | "boolean" | "string" | "json"): void {
  switch (type) {
    case "number":
      if (isNaN(parseFloat(value))) {
        throw new Error(`Invalid number value: ${value}`);
      }
      break;
    case "boolean":
      if (value !== "true" && value !== "false") {
        throw new Error(`Invalid boolean value: ${value}. Must be "true" or "false"`);
      }
      break;
    case "json":
      try {
        JSON.parse(value);
      } catch {
        throw new Error(`Invalid JSON value: ${value}`);
      }
      break;
    // string type accepts any value
  }
}
