/**
 * Branch Wallet Settings Service
 * Story 21.4: Configure Branch Wallet Settings
 *
 * Manages per-branch wallet configuration including:
 * - Commission override (optional, uses global if not set)
 * - Settlement frequency override
 * - Payout method and account details
 *
 * Access Control:
 * - super_admin: can view/edit all branches
 * - branch_admin: can view own branch settings (read-only)
 */

import { v, ConvexError } from "convex/values";
import { query, mutation } from "../_generated/server";
import { checkRole } from "./rbac";

/**
 * Get wallet settings for a specific branch
 * Returns null if no settings configured yet
 *
 * @param branch_id - The branch to get settings for
 * @returns Branch wallet settings or null
 */
export const getBranchWalletSettings = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("branchWalletSettings")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .first();

    return settings;
  },
});

/**
 * List all branch wallet settings (Super Admin only)
 * Returns settings joined with branch name for display
 *
 * @returns Array of branch settings with branch details
 */
export const listAllBranchSettings = query({
  args: {},
  handler: async (ctx) => {
    await checkRole(ctx, "super_admin");

    // Get all branches
    const branches = await ctx.db.query("branches").collect();

    // Get all branch wallet settings
    const allSettings = await ctx.db.query("branchWalletSettings").collect();

    // Map settings by branch_id for quick lookup
    const settingsMap = new Map(
      allSettings.map((s) => [s.branch_id.toString(), s])
    );

    // Join branches with their settings
    return branches.map((branch) => ({
      branch_id: branch._id,
      branch_name: branch.name,
      settings: settingsMap.get(branch._id.toString()) || null,
      has_settings: settingsMap.has(branch._id.toString()),
    }));
  },
});

/**
 * Update branch wallet settings (Super Admin only)
 * Creates new record if doesn't exist, updates if exists (upsert)
 *
 * @param branch_id - The branch to update
 * @param commission_override - Optional commission rate override (0-100)
 * @param settlement_frequency - Optional frequency override
 * @param payout_method - Payout method: gcash, maya, bank
 * @param payout_account_number - Account number for payouts
 * @param payout_account_name - Account holder name
 * @param payout_bank_name - Bank name (required if method is bank)
 */
export const updateBranchWalletSettings = mutation({
  args: {
    branch_id: v.id("branches"),
    commission_override: v.optional(v.union(v.number(), v.null())),
    settlement_frequency: v.optional(v.union(v.string(), v.null())),
    payout_method: v.optional(v.union(v.string(), v.null())),
    payout_account_number: v.optional(v.union(v.string(), v.null())),
    payout_account_name: v.optional(v.union(v.string(), v.null())),
    payout_bank_name: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    // Only super_admin can update branch wallet settings
    await checkRole(ctx, "super_admin");

    // Validate branch exists
    const branch = await ctx.db.get(args.branch_id);
    if (!branch) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Branch not found",
      });
    }

    // Validate commission override if provided
    if (args.commission_override !== undefined && args.commission_override !== null) {
      if (args.commission_override < 0 || args.commission_override > 100) {
        throw new ConvexError({
          code: "VALIDATION_ERROR",
          message: "Commission override must be between 0 and 100",
        });
      }
      if (!Number.isInteger(args.commission_override)) {
        throw new ConvexError({
          code: "VALIDATION_ERROR",
          message: "Commission override must be a whole number",
        });
      }
    }

    // Validate settlement frequency if provided
    const validFrequencies = ["daily", "weekly", "biweekly"];
    if (args.settlement_frequency && !validFrequencies.includes(args.settlement_frequency)) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Settlement frequency must be daily, weekly, or biweekly",
      });
    }

    // Validate payout method if provided
    const validPayoutMethods = ["gcash", "maya", "bank"];
    if (args.payout_method && !validPayoutMethods.includes(args.payout_method)) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Payout method must be gcash, maya, or bank",
      });
    }

    // If payout method is set, require account details
    if (args.payout_method) {
      if (!args.payout_account_number?.trim()) {
        throw new ConvexError({
          code: "VALIDATION_ERROR",
          message: "Account number is required when payout method is set",
        });
      }
      if (!args.payout_account_name?.trim()) {
        throw new ConvexError({
          code: "VALIDATION_ERROR",
          message: "Account name is required when payout method is set",
        });
      }
      // Bank transfer requires bank name
      if (args.payout_method === "bank" && !args.payout_bank_name?.trim()) {
        throw new ConvexError({
          code: "VALIDATION_ERROR",
          message: "Bank name is required for bank transfers",
        });
      }
    }

    const now = Date.now();

    // Check if settings exist (upsert pattern)
    const existingSettings = await ctx.db
      .query("branchWalletSettings")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .first();

    // Prepare the data - convert undefined to null for optional fields
    const settingsData = {
      commission_override: args.commission_override ?? undefined,
      settlement_frequency: args.settlement_frequency ?? undefined,
      payout_method: args.payout_method ?? undefined,
      payout_account_number: args.payout_account_number ?? undefined,
      payout_account_name: args.payout_account_name ?? undefined,
      payout_bank_name: args.payout_bank_name ?? undefined,
    };

    if (existingSettings) {
      // Update existing record
      await ctx.db.patch(existingSettings._id, {
        ...settingsData,
        updated_at: now,
      });

      return {
        success: true,
        message: "Branch wallet settings updated successfully",
        settings_id: existingSettings._id,
        is_update: true,
      };
    } else {
      // Create new record
      const settingsId = await ctx.db.insert("branchWalletSettings", {
        branch_id: args.branch_id,
        ...settingsData,
        created_at: now,
        updated_at: now,
      });

      return {
        success: true,
        message: "Branch wallet settings created successfully",
        settings_id: settingsId,
        is_update: false,
      };
    }
  },
});

/**
 * Get effective commission rate for a branch
 * Returns override if set, otherwise returns global rate
 *
 * @param branch_id - The branch to get commission for
 * @returns Commission rate (integer percentage)
 */
export const getEffectiveCommissionRate = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    // Get branch-specific settings
    const branchSettings = await ctx.db
      .query("branchWalletSettings")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .first();

    // If branch has override, use it
    if (branchSettings?.commission_override !== undefined && branchSettings?.commission_override !== null) {
      return {
        commission_percent: branchSettings.commission_override,
        is_override: true,
        source: "branch",
      };
    }

    // Otherwise, get global rate from walletConfig
    const globalConfig = await ctx.db.query("walletConfig").first();

    if (globalConfig) {
      return {
        commission_percent: globalConfig.default_commission_percent,
        is_override: false,
        source: "global",
      };
    }

    // Default to 5% if nothing configured
    return {
      commission_percent: 5,
      is_override: false,
      source: "default",
    };
  },
});

/**
 * Check if branch has payout details configured
 * Used to determine if branch can request settlement
 *
 * @param branch_id - The branch to check
 * @returns Boolean indicating if payout details are complete
 */
export const hasPayoutDetailsConfigured = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("branchWalletSettings")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .first();

    if (!settings) {
      return { configured: false, reason: "No wallet settings configured" };
    }

    if (!settings.payout_method) {
      return { configured: false, reason: "Payout method not set" };
    }

    if (!settings.payout_account_number || !settings.payout_account_name) {
      return { configured: false, reason: "Account details incomplete" };
    }

    if (settings.payout_method === "bank" && !settings.payout_bank_name) {
      return { configured: false, reason: "Bank name required for bank transfers" };
    }

    return { configured: true, reason: null };
  },
});

/**
 * Check if branch can request settlement
 * Validates payout details and minimum amount threshold.
 *
 * Story 21.5: Configure Settlement Parameters
 *
 * @param branch_id - The branch requesting settlement
 * @param pending_amount - The amount pending for settlement (in whole pesos)
 * @returns Object with canRequest boolean and reason if false
 */
export const canRequestSettlement = query({
  args: {
    branch_id: v.id("branches"),
    pending_amount: v.number(),
  },
  handler: async (ctx, args) => {
    // Step 1: Check if payout details are configured
    const settings = await ctx.db
      .query("branchWalletSettings")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .first();

    if (!settings) {
      return {
        canRequest: false,
        reason: "Payout details not configured. Please set up payout method first.",
      };
    }

    if (!settings.payout_method) {
      return {
        canRequest: false,
        reason: "Payout method not set. Please configure payout details.",
      };
    }

    if (!settings.payout_account_number || !settings.payout_account_name) {
      return {
        canRequest: false,
        reason: "Account details incomplete. Please complete payout configuration.",
      };
    }

    if (settings.payout_method === "bank" && !settings.payout_bank_name) {
      return {
        canRequest: false,
        reason: "Bank name required for bank transfers.",
      };
    }

    // Step 2: Check minimum settlement amount
    const globalConfig = await ctx.db.query("walletConfig").first();
    const minAmount = globalConfig?.min_settlement_amount ?? 500; // Default ₱500

    if (args.pending_amount < minAmount) {
      return {
        canRequest: false,
        reason: `Minimum settlement amount is ₱${minAmount.toLocaleString()}. Your pending balance is ₱${args.pending_amount.toLocaleString()}.`,
      };
    }

    // All checks passed
    return {
      canRequest: true,
      reason: null,
      min_settlement_amount: minAmount,
    };
  },
});

/**
 * Get effective settlement frequency for a branch
 * Returns override if set, otherwise returns global default
 *
 * Story 21.5: Configure Settlement Parameters
 *
 * @param branch_id - The branch to get frequency for
 * @returns Settlement frequency string
 */
export const getEffectiveSettlementFrequency = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    // Get branch-specific settings
    const branchSettings = await ctx.db
      .query("branchWalletSettings")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .first();

    // If branch has override, use it
    if (branchSettings?.settlement_frequency) {
      return {
        frequency: branchSettings.settlement_frequency,
        is_override: true,
        source: "branch",
      };
    }

    // Otherwise, get global default from walletConfig
    const globalConfig = await ctx.db.query("walletConfig").first();

    if (globalConfig) {
      return {
        frequency: globalConfig.default_settlement_frequency,
        is_override: false,
        source: "global",
      };
    }

    // Default to weekly if nothing configured
    return {
      frequency: "weekly",
      is_override: false,
      source: "default",
    };
  },
});
