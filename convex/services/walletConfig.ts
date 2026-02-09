/**
 * Wallet Configuration Service
 * Story 21-2: Configure Super Admin PayMongo for Wallet
 *
 * Manages the centralized wallet configuration for the multi-branch wallet payment system.
 * Only super_admin can access these functions.
 *
 * Security:
 * - PayMongo secret keys are encrypted using AES-256-GCM before storage
 * - Decrypted keys are never exposed to frontend (masked in query response)
 * - Uses iv:encrypted format to store both IV and ciphertext in single field
 */

import { v, ConvexError } from "convex/values";
import { query, mutation } from "../_generated/server";
import { encryptApiKey } from "../lib/encryption";
import { checkRole } from "./rbac";
import { DEFAULT_BONUS_TIERS, type BonusTier } from "../lib/walletBonus";

/**
 * Get wallet configuration
 * Returns config with masked secret keys (never expose encrypted values to frontend)
 *
 * @returns Wallet config with masked secrets, or null if not configured
 */
export const getWalletConfig = query({
  args: {},
  handler: async (ctx) => {
    // Check super_admin role
    await checkRole(ctx, "super_admin");

    // Get the singleton config record
    const config = await ctx.db.query("walletConfig").first();

    if (!config) {
      return null;
    }

    // Return config with masked secret keys for security
    // Never expose encrypted values to frontend
    return {
      _id: config._id,
      paymongo_public_key: config.paymongo_public_key,
      paymongo_secret_key: "••••••••", // Masked for security
      paymongo_webhook_secret: "••••••••", // Masked for security
      is_test_mode: config.is_test_mode,
      default_commission_percent: config.default_commission_percent,
      default_settlement_frequency: config.default_settlement_frequency,
      min_settlement_amount: config.min_settlement_amount,
      // Story 23.3: Return bonus tiers configuration
      bonus_tiers: config.bonus_tiers || [],
      // Story 23.4: Monthly bonus cap (0 = unlimited)
      monthly_bonus_cap: config.monthly_bonus_cap ?? 0,
      created_at: config.created_at,
      updated_at: config.updated_at,
      // Flag to indicate secrets are configured (for UI)
      has_secrets_configured:
        config.paymongo_secret_key !== "" &&
        config.paymongo_webhook_secret !== "",
    };
  },
});

/**
 * Update wallet configuration (upsert pattern)
 * Creates new config if none exists, updates existing if found
 *
 * Encrypts secret keys before storage using AES-256-GCM.
 * Stores in format "iv:encrypted" to keep both values in single field.
 *
 * @param public_key - PayMongo public key (pk_live_xxx or pk_test_xxx)
 * @param secret_key - PayMongo secret key (sk_live_xxx or sk_test_xxx)
 * @param webhook_secret - PayMongo webhook secret
 * @param is_test_mode - Whether to use PayMongo test environment
 * @param default_commission_percent - Default commission rate (e.g., 5 for 5%)
 * @param default_settlement_frequency - Default frequency: "daily" | "weekly" | "biweekly"
 * @param min_settlement_amount - Minimum payout amount in whole pesos
 */
export const updateWalletConfig = mutation({
  args: {
    public_key: v.string(),
    secret_key: v.string(),
    webhook_secret: v.string(),
    is_test_mode: v.boolean(),
    default_commission_percent: v.number(),
    default_settlement_frequency: v.string(),
    min_settlement_amount: v.number(),
    // Story 23.3: Configurable bonus tiers
    bonus_tiers: v.optional(v.array(v.object({
      minAmount: v.number(),
      bonus: v.number(),
    }))),
    // Story 23.4: Monthly bonus cap (0 = unlimited)
    monthly_bonus_cap: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check super_admin role
    await checkRole(ctx, "super_admin");

    // Validate inputs
    if (args.default_commission_percent < 0 || args.default_commission_percent > 100) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Commission percent must be between 0 and 100",
      });
    }

    if (args.min_settlement_amount < 0) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Minimum settlement amount cannot be negative",
      });
    }

    const validFrequencies = ["daily", "weekly", "biweekly"];
    if (!validFrequencies.includes(args.default_settlement_frequency)) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Settlement frequency must be daily, weekly, or biweekly",
      });
    }

    // Story 23.3: Validate bonus tiers if provided
    if (args.bonus_tiers && args.bonus_tiers.length > 0) {
      const seenAmounts = new Set<number>();
      for (const tier of args.bonus_tiers) {
        if (tier.minAmount <= 0) {
          throw new ConvexError({
            code: "VALIDATION_ERROR",
            message: "Bonus tier minimum amount must be greater than 0",
          });
        }
        if (tier.bonus < 0) {
          throw new ConvexError({
            code: "VALIDATION_ERROR",
            message: "Bonus amount cannot be negative",
          });
        }
        if (seenAmounts.has(tier.minAmount)) {
          throw new ConvexError({
            code: "VALIDATION_ERROR",
            message: `Duplicate tier threshold: ₱${tier.minAmount}. Each tier must have a unique minimum amount.`,
          });
        }
        seenAmounts.add(tier.minAmount);
      }
    }

    // Check if config exists (upsert pattern)
    const existingConfig = await ctx.db.query("walletConfig").first();

    // Handle "___UNCHANGED___" marker for secrets
    // When user doesn't enter new values, UI sends this marker to keep existing secrets
    const isSecretUnchanged = args.secret_key === "___UNCHANGED___";
    const isWebhookUnchanged = args.webhook_secret === "___UNCHANGED___";

    // Validate: new config requires actual secrets
    if (!existingConfig && isSecretUnchanged) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Secret Key is required for new configuration",
      });
    }
    if (!existingConfig && isWebhookUnchanged) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Webhook Secret is required for new configuration",
      });
    }

    // Determine encrypted values to use
    let secretKeyEncrypted: string;
    let webhookSecretEncrypted: string;

    if (isSecretUnchanged && existingConfig) {
      // Keep existing encrypted secret
      secretKeyEncrypted = existingConfig.paymongo_secret_key;
    } else {
      // Encrypt new secret
      const encryptionKey = process.env.PAYMONGO_ENCRYPTION_KEY;
      if (!encryptionKey) {
        throw new ConvexError({
          code: "CONFIG_ERROR",
          message: "Encryption key not configured. Please set PAYMONGO_ENCRYPTION_KEY environment variable.",
        });
      }
      const secretKeyResult = await encryptApiKey(args.secret_key, encryptionKey);
      secretKeyEncrypted = `${secretKeyResult.iv}:${secretKeyResult.encrypted}`;
    }

    if (isWebhookUnchanged && existingConfig) {
      // Keep existing encrypted webhook secret
      webhookSecretEncrypted = existingConfig.paymongo_webhook_secret;
    } else {
      // Encrypt new webhook secret
      const encryptionKey = process.env.PAYMONGO_ENCRYPTION_KEY;
      if (!encryptionKey) {
        throw new ConvexError({
          code: "CONFIG_ERROR",
          message: "Encryption key not configured. Please set PAYMONGO_ENCRYPTION_KEY environment variable.",
        });
      }
      const webhookSecretResult = await encryptApiKey(args.webhook_secret, encryptionKey);
      webhookSecretEncrypted = `${webhookSecretResult.iv}:${webhookSecretResult.encrypted}`;
    }

    const now = Date.now();

    if (existingConfig) {
      // Update existing record
      await ctx.db.patch(existingConfig._id, {
        paymongo_public_key: args.public_key,
        paymongo_secret_key: secretKeyEncrypted,
        paymongo_webhook_secret: webhookSecretEncrypted,
        is_test_mode: args.is_test_mode,
        default_commission_percent: args.default_commission_percent,
        default_settlement_frequency: args.default_settlement_frequency,
        min_settlement_amount: args.min_settlement_amount,
        // Story 23.3: Save bonus tiers
        bonus_tiers: args.bonus_tiers,
        // Story 23.4: Monthly bonus cap
        monthly_bonus_cap: args.monthly_bonus_cap ?? 0,
        updated_at: now,
      });

      return {
        success: true,
        message: "Wallet configuration updated successfully",
        config_id: existingConfig._id,
        is_update: true,
      };
    } else {
      // Create new record
      const configId = await ctx.db.insert("walletConfig", {
        paymongo_public_key: args.public_key,
        paymongo_secret_key: secretKeyEncrypted,
        paymongo_webhook_secret: webhookSecretEncrypted,
        is_test_mode: args.is_test_mode,
        default_commission_percent: args.default_commission_percent,
        default_settlement_frequency: args.default_settlement_frequency,
        min_settlement_amount: args.min_settlement_amount,
        // Story 23.3: Save bonus tiers
        bonus_tiers: args.bonus_tiers,
        // Story 23.4: Monthly bonus cap
        monthly_bonus_cap: args.monthly_bonus_cap ?? 0,
        created_at: now,
        updated_at: now,
      });

      return {
        success: true,
        message: "Wallet configuration created successfully",
        config_id: configId,
        is_update: false,
      };
    }
  },
});

/**
 * Get commission rate for wallet payments
 * Helper query for other services to retrieve the current commission rate.
 * Used by wallet payment processing to calculate commission deductions.
 *
 * Story 21.3: Configure Global Commission Rate
 *
 * @returns Commission rate object with percent value, or default 5% if not configured
 */
export const getCommissionRate = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db.query("walletConfig").first();

    if (!config) {
      // Return default commission rate if not configured
      return {
        commission_percent: 5, // Default 5%
        is_configured: false,
      };
    }

    return {
      commission_percent: config.default_commission_percent,
      is_configured: true,
    };
  },
});

/**
 * Get settlement parameters for wallet payouts
 * Helper query for settlement processing and validation.
 *
 * Story 21.5: Configure Settlement Parameters
 *
 * @returns Settlement params with min amount and frequency, or defaults if not configured
 */
export const getSettlementParams = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db.query("walletConfig").first();

    if (!config) {
      // Return defaults if not configured
      return {
        min_settlement_amount: 500, // Default ₱500
        default_frequency: "weekly",
        is_configured: false,
      };
    }

    return {
      min_settlement_amount: config.min_settlement_amount,
      default_frequency: config.default_settlement_frequency,
      is_configured: true,
    };
  },
});

/**
 * Get decrypted wallet config (internal use only)
 * This should only be called from server-side actions that need the actual credentials.
 *
 * WARNING: Never expose decrypted keys to frontend. This is for internal service use only.
 *
 * @internal
 */
export const getDecryptedWalletConfig = query({
  args: {},
  handler: async (ctx) => {
    // This is for internal server-side use only
    // The decryption will happen in actions that need PayMongo API calls
    const config = await ctx.db.query("walletConfig").first();

    if (!config) {
      return null;
    }

    // Return raw config - decryption handled by caller
    // This allows actions to decrypt using decryptApiKey
    return config;
  },
});

/**
 * Get bonus tiers for wallet top-ups (public, no auth required)
 * Story 23.3: Configurable bonus tiers for wallet top-ups
 * Story 23.4: Includes monthly bonus cap info
 *
 * Returns configured bonus tiers or default tiers if none configured.
 * This is a public query - no role check required as customers need to see available bonuses.
 *
 * @returns Object with tiers array, isConfigured flag, and monthly cap
 */
export const getBonusTiers = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db.query("walletConfig").first();

    // If no config or no bonus_tiers, return defaults
    if (!config?.bonus_tiers || config.bonus_tiers.length === 0) {
      return {
        tiers: DEFAULT_BONUS_TIERS,
        isConfigured: false,
        // Story 23.4: Monthly bonus cap (0 = unlimited)
        monthlyBonusCap: config?.monthly_bonus_cap ?? 0,
      };
    }

    // Return configured tiers sorted by minAmount descending (highest first)
    const sortedTiers = [...config.bonus_tiers].sort((a, b) => b.minAmount - a.minAmount);

    return {
      tiers: sortedTiers,
      isConfigured: true,
      // Story 23.4: Monthly bonus cap (0 = unlimited)
      monthlyBonusCap: config.monthly_bonus_cap ?? 0,
    };
  },
});

/**
 * Get user's remaining bonus eligibility for the current month
 * Story 23.4: Monthly bonus cap tracking
 *
 * @param userId - User ID to check
 * @returns Remaining amount eligible for bonus this month
 */
export const getUserBonusEligibility = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const config = await ctx.db.query("walletConfig").first();
    const monthlyBonusCap = config?.monthly_bonus_cap ?? 0;

    // If no cap (0 = unlimited), return unlimited eligibility
    if (monthlyBonusCap === 0) {
      return {
        monthlyBonusCap: 0,
        usedThisMonth: 0,
        remainingEligible: Infinity,
        isUnlimited: true,
      };
    }

    // Get user's wallet
    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .first();

    if (!wallet) {
      return {
        monthlyBonusCap,
        usedThisMonth: 0,
        remainingEligible: monthlyBonusCap,
        isUnlimited: false,
      };
    }

    // Check if we need to reset (new month)
    const now = Date.now();
    const currentMonthStart = getMonthStart(now);
    const walletMonthStart = wallet.bonus_month_started ?? 0;

    // If wallet's month start is before current month, treat as reset
    if (walletMonthStart < currentMonthStart) {
      return {
        monthlyBonusCap,
        usedThisMonth: 0,
        remainingEligible: monthlyBonusCap,
        isUnlimited: false,
      };
    }

    // Calculate remaining eligibility
    const usedThisMonth = wallet.bonus_topup_this_month ?? 0;
    const remainingEligible = Math.max(0, monthlyBonusCap - usedThisMonth);

    return {
      monthlyBonusCap,
      usedThisMonth,
      remainingEligible,
      isUnlimited: false,
    };
  },
});

/**
 * Helper to get the start of the current month (timestamp)
 */
function getMonthStart(timestamp: number): number {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
}

/**
 * Update only bonus tiers (separate mutation for admin convenience)
 * Story 23.3: Configurable bonus tiers for wallet top-ups
 *
 * Allows Super Admin to update just the bonus tiers without touching other config.
 */
export const updateBonusTiers = mutation({
  args: {
    bonus_tiers: v.array(v.object({
      minAmount: v.number(),
      bonus: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    // Check super_admin role
    await checkRole(ctx, "super_admin");

    // Validate bonus tiers
    const seenAmounts = new Set<number>();
    for (const tier of args.bonus_tiers) {
      if (tier.minAmount <= 0) {
        throw new ConvexError({
          code: "VALIDATION_ERROR",
          message: "Bonus tier minimum amount must be greater than 0",
        });
      }
      if (tier.bonus < 0) {
        throw new ConvexError({
          code: "VALIDATION_ERROR",
          message: "Bonus amount cannot be negative",
        });
      }
      if (seenAmounts.has(tier.minAmount)) {
        throw new ConvexError({
          code: "VALIDATION_ERROR",
          message: `Duplicate tier threshold: ₱${tier.minAmount}. Each tier must have a unique minimum amount.`,
        });
      }
      seenAmounts.add(tier.minAmount);
    }

    const now = Date.now();
    const existingConfig = await ctx.db.query("walletConfig").first();

    if (!existingConfig) {
      throw new ConvexError({
        code: "CONFIG_NOT_FOUND",
        message: "Wallet configuration not found. Please configure wallet settings first.",
      });
    }

    await ctx.db.patch(existingConfig._id, {
      bonus_tiers: args.bonus_tiers,
      updated_at: now,
    });

    return {
      success: true,
      message: "Bonus tiers updated successfully",
      tiers_count: args.bonus_tiers.length,
    };
  },
});
