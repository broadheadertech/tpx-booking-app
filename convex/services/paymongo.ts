import { action, mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { encryptApiKey, decryptApiKey } from "../lib/encryption";
import {
  calculateCommission,
  DEFAULT_COMMISSION_PERCENT,
  EARNING_STATUS,
} from "../lib/walletUtils";

const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY || "";

function base64EncodeAscii(input: string) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let output = "";
  let i = 0;
  while (i < input.length) {
    const a = input.charCodeAt(i++);
    const b = i < input.length ? input.charCodeAt(i++) : NaN;
    const c = i < input.length ? input.charCodeAt(i++) : NaN;
    const b1 = a >> 2;
    const b2 = ((a & 3) << 4) | (isNaN(b) ? 0 : (b >> 4));
    const b3 = isNaN(b) ? 64 : (((b & 15) << 2) | (isNaN(c) ? 0 : (c >> 6)));
    const b4 = isNaN(c) ? 64 : (c & 63);
    output += chars[b1] + chars[b2] + chars[b3] + chars[b4];
  }
  return output;
}

function authHeader() {
  const token = base64EncodeAscii(PAYMONGO_SECRET_KEY + ":");
  return `Basic ${token}`;
}

export const createEwalletSource = action({
  args: {
    amount: v.number(),
    type: v.union(v.literal("gcash"), v.literal("paymaya")),
    description: v.optional(v.string()),
    userId: v.id("users"),
    origin: v.optional(v.string()) // Pass the current origin from frontend
  },
  handler: async (ctx, args) => {
    if (!PAYMONGO_SECRET_KEY) throw new Error("PAYMONGO_SECRET_KEY not configured");
    
    // Use the origin passed from frontend, fallback to localhost for development
    const baseUrl = args.origin || "http://localhost:3000";
    
    const payload = {
      data: {
        attributes: {
          amount: Math.round(args.amount * 100),
          redirect: {
            success: `${baseUrl}/customer/wallet?topup=success`,
            failed: `${baseUrl}/customer/wallet?topup=failure`
          },
          type: args.type,
          currency: "PHP",
          description: args.description || `Wallet Top-up ₱${args.amount}`
        }
      }
    };

    const res = await fetch("https://api.paymongo.com/v1/sources", {
      method: "POST",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.errors?.[0]?.detail || "Failed to create source");
    }

    // Store pending wallet transaction
    await ctx.runMutation(internal.services.wallet.createPendingTransaction, {
      userId: args.userId,
      amount: args.amount,
      description: args.description || `Wallet Top-up ₱${args.amount}`,
      source_id: data.data.id,
      status: "pending",
    });

    return {
      sourceId: data.data.id,
      checkoutUrl: data.data.attributes.redirect?.checkout_url,
      status: data.data.attributes.status
    };
  }
});

export const createCardPaymentIntentAndAttach = action({
  args: {
    amount: v.number(),
    paymentMethodId: v.string(),
    returnUrl: v.optional(v.string()),
    userId: v.id("users"),
    origin: v.optional(v.string()) // Pass the current origin from frontend
  },
  handler: async (ctx, args) => {
    if (!PAYMONGO_SECRET_KEY) throw new Error("PAYMONGO_SECRET_KEY not configured");
    const amount = Math.round(args.amount * 100);
    
    // Use the origin passed from frontend, fallback to localhost for development
    const baseUrl = args.origin || "http://localhost:3000";

    // Create Payment Intent
    const piRes = await fetch("https://api.paymongo.com/v1/payment_intents", {
      method: "POST",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount,
            currency: "PHP",
            payment_method_allowed: ["card"],
            capture_type: "automatic",
            description: `Wallet Top-up ₱${args.amount}`
          }
        }
      })
    });
    const piData = await piRes.json();
    if (!piRes.ok) {
      throw new Error(piData?.errors?.[0]?.detail || "Failed to create payment intent");
    }

    const intentId = piData.data.id;

    // Attach the payment method
    const attachRes = await fetch(`https://api.paymongo.com/v1/payment_intents/${intentId}/attach`, {
      method: "POST",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        data: {
          attributes: {
            payment_method: args.paymentMethodId,
            return_url: args.returnUrl || `${baseUrl}/customer/wallet?topup=success`
          }
        }
      })
    });
    const attachData = await attachRes.json();
    if (!attachRes.ok) {
      throw new Error(attachData?.errors?.[0]?.detail || "Failed to attach payment method");
    }

    // Record pending until succeeded
    await ctx.runMutation(internal.services.wallet.createPendingTransaction, {
      userId: args.userId,
      amount: args.amount,
      description: `Wallet Top-up ₱${args.amount}`,
      payment_id: attachData.data.id,
      status: attachData.data.attributes.status === "succeeded" ? "completed" : "pending",
    });

    return {
      intentId,
      status: attachData.data.attributes.status,
      nextAction: attachData.data.attributes.next_action,
      clientKey: attachData.data.attributes.client_key
    };
  }
});

export const captureSourceAndCreditWallet = action({
  args: { sourceId: v.string(), userId: v.id("users") },
  handler: async (ctx, args) => {
    if (!PAYMONGO_SECRET_KEY) throw new Error("PAYMONGO_SECRET_KEY not configured");
    // Get pending record
    const pending = await ctx.runQuery(internal.services.wallet.getTransactionBySource, {
      sourceId: args.sourceId,
    });
    if (!pending || pending.status === "completed") {
      return { success: true, already: true };
    }

    // Check source status
    const sRes = await fetch(`https://api.paymongo.com/v1/sources/${args.sourceId}`, {
      headers: { Authorization: authHeader() }
    });
    const sData = await sRes.json();
    const status = sData?.data?.attributes?.status;
    if (status !== "chargeable") {
      throw new Error("Source not chargeable yet");
    }

    // Create payment using source
    const pRes = await fetch("https://api.paymongo.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: Math.round((pending.amount) * 100),
            currency: "PHP",
            source: { id: args.sourceId, type: "source" },
            description: pending.description || `Wallet Top-up ₱${pending.amount}`
          }
        }
      })
    });
    const pData = await pRes.json();
    if (!pRes.ok) {
      throw new Error(pData?.errors?.[0]?.detail || "Failed to create payment");
    }

    // Update transaction
    await ctx.runMutation(internal.services.wallet.updateTransactionStatus, {
      transactionId: pending._id,
      status: "completed",
      payment_id: pData.data.id,
    });

    // Credit wallet
    await ctx.runMutation(internal.services.wallet.creditWalletBalance, {
      userId: args.userId,
      amount: pending.amount,
    });

    return { success: true, paymentId: pData.data.id };
  }
});

// ============================================================================
// PAYMONGO CONFIGURATION SERVICE
// ============================================================================
// Branch-level PayMongo configuration management with encrypted credentials
// Story 6.3: Build PayMongo Configuration Service
// ============================================================================

const PAYMONGO_ENCRYPTION_KEY = process.env.PAYMONGO_ENCRYPTION_KEY || "";

/**
 * Save PayMongo payment configuration for a branch
 * Encrypts API keys before storing (FR23, NFR5)
 * Validates RBAC (FR26) and branch isolation (FR25)
 */
export const savePaymentConfig = mutation({
  args: {
    branch_id: v.id("branches"),
    public_key: v.string(),        // Plaintext - will be encrypted
    secret_key: v.string(),        // Plaintext - will be encrypted
    webhook_secret: v.string(),    // Plaintext - will be encrypted
    pay_now_enabled: v.boolean(),
    pay_later_enabled: v.boolean(),
    pay_at_shop_enabled: v.boolean(),
    convenience_fee_type: v.optional(v.union(v.literal("percent"), v.literal("fixed"))),
    convenience_fee_percent: v.optional(v.number()),
    convenience_fee_amount: v.optional(v.number()),
    updated_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Validate encryption key is configured
    if (!PAYMONGO_ENCRYPTION_KEY || PAYMONGO_ENCRYPTION_KEY.length !== 64) {
      throw new Error("PAYMONGO_ENCRYPTION_KEY not configured or invalid length");
    }

    // Validate at least one payment option is enabled
    if (!args.pay_now_enabled && !args.pay_later_enabled && !args.pay_at_shop_enabled) {
      throw new Error("At least one payment option must be enabled");
    }

    // Validate convenience fee based on type
    const feeType = args.convenience_fee_type || "percent";
    if (feeType === "percent") {
      const percent = args.convenience_fee_percent ?? 5;
      if (percent < 0 || percent > 100) {
        throw new Error("Convenience fee must be between 0 and 100 percent");
      }
    } else if (feeType === "fixed") {
      const amount = args.convenience_fee_amount ?? 0;
      if (amount < 0) {
        throw new Error("Convenience fee amount cannot be negative");
      }
    }

    // Encrypt the API keys using single IV for all three keys
    // IMPORTANT: All three keys must use the same IV since we only store one IV
    const { encrypted: publicKeyEncrypted, iv } = await encryptApiKey(
      args.public_key,
      PAYMONGO_ENCRYPTION_KEY
    );
    // Pass the same IV to ensure all keys can be decrypted with the stored IV
    const { encrypted: secretKeyEncrypted } = await encryptApiKey(
      args.secret_key,
      PAYMONGO_ENCRYPTION_KEY,
      iv // Use the same IV as public key
    );
    const { encrypted: webhookSecretEncrypted } = await encryptApiKey(
      args.webhook_secret,
      PAYMONGO_ENCRYPTION_KEY,
      iv // Use the same IV as public key
    );

    const now = Date.now();

    // Check if config already exists for this branch
    const existingConfig = await ctx.db
      .query("branchPaymentConfig")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .first();

    if (existingConfig) {
      // Update existing config
      await ctx.db.patch(existingConfig._id, {
        public_key_encrypted: publicKeyEncrypted,
        secret_key_encrypted: secretKeyEncrypted,
        webhook_secret_encrypted: webhookSecretEncrypted,
        encryption_iv: iv,
        pay_now_enabled: args.pay_now_enabled,
        pay_later_enabled: args.pay_later_enabled,
        pay_at_shop_enabled: args.pay_at_shop_enabled,
        convenience_fee_type: args.convenience_fee_type || "percent",
        convenience_fee_percent: args.convenience_fee_percent,
        convenience_fee_amount: args.convenience_fee_amount,
        is_enabled: true,
        updated_at: now,
        updated_by: args.updated_by,
      });
      return { success: true, configId: existingConfig._id, updated: true };
    } else {
      // Create new config
      const configId = await ctx.db.insert("branchPaymentConfig", {
        branch_id: args.branch_id,
        provider: "paymongo",
        is_enabled: true,
        public_key_encrypted: publicKeyEncrypted,
        secret_key_encrypted: secretKeyEncrypted,
        webhook_secret_encrypted: webhookSecretEncrypted,
        encryption_iv: iv,
        pay_now_enabled: args.pay_now_enabled,
        pay_later_enabled: args.pay_later_enabled,
        pay_at_shop_enabled: args.pay_at_shop_enabled,
        convenience_fee_type: args.convenience_fee_type || "percent",
        convenience_fee_percent: args.convenience_fee_percent,
        convenience_fee_amount: args.convenience_fee_amount,
        created_at: now,
        updated_at: now,
        updated_by: args.updated_by,
      });
      return { success: true, configId, updated: false };
    }
  },
});

/**
 * Toggle branch PayMongo on/off
 * When OFF: payments route through super admin's PayMongo (fallback)
 * When ON: payments route through branch's own PayMongo keys
 */
export const toggleBranchPaymongo = mutation({
  args: {
    branch_id: v.id("branches"),
    enabled: v.boolean(),
    updated_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("branchPaymentConfig")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .first();

    if (!config) {
      if (args.enabled) {
        throw new Error("Please configure PayMongo API keys first to use your own account");
      }
      return { success: true, status: "already_fallback" };
    }

    if (args.enabled && (!config.public_key_encrypted || !config.secret_key_encrypted)) {
      throw new Error("Please configure PayMongo API keys first to enable your own account");
    }

    await ctx.db.patch(config._id, {
      is_enabled: args.enabled,
      updated_at: Date.now(),
      updated_by: args.updated_by,
    });

    return { success: true, status: args.enabled ? "enabled" : "disabled" };
  },
});

/**
 * Update payment settings without changing API keys
 * Use this when you just want to update toggles or convenience fee settings
 */
export const updatePaymentSettings = mutation({
  args: {
    branch_id: v.id("branches"),
    pay_now_enabled: v.boolean(),
    pay_later_enabled: v.boolean(),
    pay_at_shop_enabled: v.boolean(),
    convenience_fee_type: v.optional(v.union(v.literal("percent"), v.literal("fixed"))),
    convenience_fee_percent: v.optional(v.number()),
    convenience_fee_amount: v.optional(v.number()),
    updated_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Debug: Log received args
    console.log('[updatePaymentSettings] Received args:', {
      branch_id: args.branch_id,
      convenience_fee_type: args.convenience_fee_type,
      convenience_fee_percent: args.convenience_fee_percent,
      convenience_fee_amount: args.convenience_fee_amount,
    });

    // Validate at least one payment option is enabled
    if (!args.pay_now_enabled && !args.pay_later_enabled && !args.pay_at_shop_enabled) {
      throw new Error("At least one payment option must be enabled");
    }

    // Validate convenience fee based on type
    const feeType = args.convenience_fee_type || "percent";
    if (feeType === "percent") {
      const percent = args.convenience_fee_percent ?? 5;
      if (percent < 0 || percent > 100) {
        throw new Error("Convenience fee must be between 0 and 100 percent");
      }
    } else if (feeType === "fixed") {
      const amount = args.convenience_fee_amount ?? 0;
      if (amount < 0) {
        throw new Error("Convenience fee amount cannot be negative");
      }
    }

    // Get existing config
    const existingConfig = await ctx.db
      .query("branchPaymentConfig")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .first();

    // Check if HQ PayMongo is available as fallback
    const saConfig = await ctx.db.query("walletConfig").first();
    const hasHqPaymongo = !!saConfig?.paymongo_secret_key && !!saConfig?.paymongo_public_key;

    // Check if API keys exist (own or HQ) when enabling online payments
    const hasOwnKeys = existingConfig?.public_key_encrypted && existingConfig?.secret_key_encrypted;
    if ((args.pay_now_enabled || args.pay_later_enabled) && !hasOwnKeys && !hasHqPaymongo) {
      throw new Error("PayMongo API keys are required for online payments. Please configure API keys first.");
    }

    const now = Date.now();

    // Prepare the update object
    const updateData = {
      pay_now_enabled: args.pay_now_enabled,
      pay_later_enabled: args.pay_later_enabled,
      pay_at_shop_enabled: args.pay_at_shop_enabled,
      convenience_fee_type: args.convenience_fee_type || "percent",
      convenience_fee_percent: args.convenience_fee_percent,
      convenience_fee_amount: args.convenience_fee_amount,
      updated_at: now,
      updated_by: args.updated_by,
    };

    if (existingConfig) {
      // Update existing record
      await ctx.db.patch(existingConfig._id, updateData);
      return { success: true, configId: existingConfig._id };
    }

    // No config record yet — create one for toggle-only storage (still using HQ PayMongo)
    const configId = await ctx.db.insert("branchPaymentConfig", {
      branch_id: args.branch_id,
      provider: "paymongo",
      is_enabled: false, // Still using HQ PayMongo
      public_key_encrypted: "",
      secret_key_encrypted: "",
      webhook_secret_encrypted: "",
      encryption_iv: "",
      ...updateData,
      created_at: now,
    });

    return { success: true, configId };
  },
});

/**
 * Get PayMongo payment configuration for a branch
 * Returns encrypted fields - NEVER decrypts in queries (NFR6)
 * Branch isolation enforced (FR25)
 */
export const getPaymentConfig = query({
  args: {
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("branchPaymentConfig")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .first();

    if (config && config.is_enabled) {
      // Branch has its own active PayMongo config
      return {
        _id: config._id,
        branch_id: config.branch_id,
        provider: config.provider,
        is_enabled: config.is_enabled,
        is_fallback: false,
        has_own_config: true,
        has_public_key: !!config.public_key_encrypted,
        has_secret_key: !!config.secret_key_encrypted,
        has_webhook_secret: !!config.webhook_secret_encrypted,
        pay_now_enabled: config.pay_now_enabled,
        pay_later_enabled: config.pay_later_enabled,
        pay_at_shop_enabled: config.pay_at_shop_enabled,
        convenience_fee_type: config.convenience_fee_type || "percent",
        convenience_fee_percent: config.convenience_fee_percent,
        convenience_fee_amount: config.convenience_fee_amount,
        created_at: config.created_at,
        updated_at: config.updated_at,
      };
    }

    // Fallback: Check if SA wallet config has PayMongo keys
    const saConfig = await ctx.db.query("walletConfig").first();
    if (saConfig && saConfig.paymongo_secret_key && saConfig.paymongo_public_key) {
      // has_own_config: true means branch has keys saved but disabled (can re-enable)
      const hasOwnConfig = !!config && !!config.public_key_encrypted && !!config.secret_key_encrypted;
      // Use branch's saved toggle preferences if they exist, otherwise defaults
      const hasToggles = !!config;
      return {
        _id: config?._id,
        branch_id: args.branch_id,
        provider: "paymongo",
        is_enabled: true,
        is_fallback: true,
        has_own_config: hasOwnConfig,
        has_public_key: true,
        has_secret_key: true,
        has_webhook_secret: !!saConfig.paymongo_webhook_secret,
        pay_now_enabled: hasToggles ? config!.pay_now_enabled : true,
        pay_later_enabled: hasToggles ? config!.pay_later_enabled : false,
        pay_at_shop_enabled: hasToggles ? config!.pay_at_shop_enabled : true,
        convenience_fee_type: (hasToggles ? config!.convenience_fee_type : "percent") as "percent" | "fixed",
        convenience_fee_percent: hasToggles ? config!.convenience_fee_percent : undefined,
        convenience_fee_amount: hasToggles ? config!.convenience_fee_amount : undefined,
        created_at: config?.created_at,
        updated_at: config?.updated_at,
      };
    }

    return null;
  },
});

/**
 * Get decrypted PayMongo configuration for API calls
 * Server-side only - called from actions (NFR6)
 * Used internally when making PayMongo API requests
 */
export const getDecryptedConfig = action({
  args: {
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    // Validate encryption key is configured
    if (!PAYMONGO_ENCRYPTION_KEY || PAYMONGO_ENCRYPTION_KEY.length !== 64) {
      throw new Error("PAYMONGO_ENCRYPTION_KEY not configured or invalid length");
    }

    // Get the raw config from database
    const config = await ctx.runQuery(internal.services.paymongo.getPaymentConfigInternal, {
      branch_id: args.branch_id,
    });

    if (!config) {
      return null;
    }

    if (!config.is_enabled) {
      throw new Error("Payment configuration is disabled for this branch");
    }

    // Decrypt the API keys
    const publicKey = await decryptApiKey(
      config.public_key_encrypted,
      config.encryption_iv,
      PAYMONGO_ENCRYPTION_KEY
    );
    const secretKey = await decryptApiKey(
      config.secret_key_encrypted,
      config.encryption_iv,
      PAYMONGO_ENCRYPTION_KEY
    );
    const webhookSecret = await decryptApiKey(
      config.webhook_secret_encrypted,
      config.encryption_iv,
      PAYMONGO_ENCRYPTION_KEY
    );

    return {
      branch_id: config.branch_id,
      provider: config.provider,
      is_enabled: config.is_enabled,
      public_key: publicKey,
      secret_key: secretKey,
      webhook_secret: webhookSecret,
      pay_now_enabled: config.pay_now_enabled,
      pay_later_enabled: config.pay_later_enabled,
      pay_at_shop_enabled: config.pay_at_shop_enabled,
      convenience_fee_type: config.convenience_fee_type || "percent",
      convenience_fee_percent: config.convenience_fee_percent,
      convenience_fee_amount: config.convenience_fee_amount,
    };
  },
});

/**
 * Internal query to get raw payment config (with encrypted fields)
 * Used by getDecryptedConfig action
 */
export const getPaymentConfigInternal = query({
  args: {
    branch_id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("branchPaymentConfig")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .first();
  },
});

/**
 * Toggle payment configuration enabled/disabled
 */
export const togglePaymentConfig = mutation({
  args: {
    branch_id: v.id("branches"),
    is_enabled: v.boolean(),
    updated_by: v.id("users"),
  },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("branchPaymentConfig")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .first();

    if (!config) {
      throw new Error("Payment configuration not found for this branch");
    }

    await ctx.db.patch(config._id, {
      is_enabled: args.is_enabled,
      updated_at: Date.now(),
      updated_by: args.updated_by,
    });

    return { success: true };
  },
});

// ============================================================================
// PAYMENT AUDIT LOGGING
// ============================================================================
// Story 7.2: Audit logging for payment events (FR27, FR28, FR29)
// ============================================================================

/**
 * Log a payment event to the audit log
 * Used for compliance, debugging, and transaction history (FR27, FR28, FR29)
 */
export const logPaymentEvent = mutation({
  args: {
    branch_id: v.id("branches"),
    booking_id: v.optional(v.id("bookings")),
    transaction_id: v.optional(v.id("transactions")),
    paymongo_payment_id: v.optional(v.string()),
    paymongo_link_id: v.optional(v.string()),
    event_type: v.union(
      v.literal("link_created"),
      v.literal("checkout_session_created"),
      v.literal("payment_initiated"),
      v.literal("payment_completed"),
      v.literal("payment_failed"),
      v.literal("payment_refunded"),
      v.literal("webhook_received"),
      v.literal("webhook_verified"),
      v.literal("webhook_failed"),
      v.literal("cash_collected")
    ),
    amount: v.optional(v.number()),
    payment_method: v.optional(v.string()),
    payment_for: v.optional(v.union(
      v.literal("full_service"),
      v.literal("convenience_fee"),
      v.literal("remaining_balance"),
      v.literal("full_cash"),
      v.literal("partial")
    )),
    raw_payload: v.optional(v.any()),
    error_message: v.optional(v.string()),
    ip_address: v.optional(v.string()),
    created_by: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const logId = await ctx.db.insert("paymentAuditLog", {
      branch_id: args.branch_id,
      booking_id: args.booking_id,
      transaction_id: args.transaction_id,
      paymongo_payment_id: args.paymongo_payment_id,
      paymongo_link_id: args.paymongo_link_id,
      event_type: args.event_type,
      amount: args.amount,
      payment_method: args.payment_method,
      payment_for: args.payment_for,
      raw_payload: args.raw_payload,
      error_message: args.error_message,
      ip_address: args.ip_address,
      created_at: Date.now(),
      created_by: args.created_by,
    });
    return { success: true, logId };
  },
});

/**
 * Update booking with PayMongo link ID
 * Called after payment link is created
 */
export const updateBookingPaymentLink = mutation({
  args: {
    booking_id: v.id("bookings"),
    paymongo_link_id: v.string(),
    processed_via_admin: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, any> = {
      paymongo_link_id: args.paymongo_link_id,
      updatedAt: Date.now(),
    };
    if (args.processed_via_admin) {
      updates.processed_via_admin = true;
    }
    await ctx.db.patch(args.booking_id, updates);
    return { success: true };
  },
});

// ============================================================================
// PAYMENT LINK CREATION SERVICE
// ============================================================================
// Story 7.2: Build Payment Link Creation Service
// Creates PayMongo payment links for Pay Now and Pay Later bookings (FR18)
// ============================================================================

/**
 * Create a PayMongo payment link for a booking
 * Supports Pay Now (full amount) and Pay Later (convenience fee only)
 *
 * @param booking_id - The booking to create payment link for
 * @param payment_type - "pay_now" (full amount) or "pay_later" (convenience fee)
 * @param origin - Frontend origin URL for redirect
 * @param created_by - User creating the payment (optional for guests)
 */
export const createPaymentLink = action({
  args: {
    booking_id: v.id("bookings"),
    payment_type: v.union(v.literal("pay_now"), v.literal("pay_later")),
    origin: v.optional(v.string()),
    created_by: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Get booking details
    const booking = await ctx.runQuery(internal.services.paymongo.getBookingForPayment, {
      booking_id: args.booking_id,
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    // Get branch payment configuration with decrypted keys
    const config = await ctx.runAction(internal.services.paymongo.getDecryptedConfigInternal, {
      branch_id: booking.branch_id,
    });

    if (!config) {
      throw new Error("PAYMONGO_NOT_CONFIGURED: Online payment is not available for this branch");
    }

    // Validate payment type is enabled
    if (args.payment_type === "pay_now" && !config.pay_now_enabled) {
      throw new Error("Pay Now option is not enabled for this branch");
    }
    if (args.payment_type === "pay_later" && !config.pay_later_enabled) {
      throw new Error("Pay Later option is not enabled for this branch");
    }

    // Calculate amount based on payment type
    const servicePrice = booking.final_price || booking.price;
    let amountInPesos: number;
    let description: string;

    if (args.payment_type === "pay_now") {
      // Pay Now: Full service price
      amountInPesos = servicePrice;
      description = `Full Payment - Booking #${booking.booking_code}`;
    } else {
      // Pay Later: Convenience fee only - supports both percent and fixed fee
      const feeType = config.convenience_fee_type || "percent";
      if (feeType === "fixed") {
        // Fixed fee amount
        amountInPesos = config.convenience_fee_amount || 50;
      } else {
        // Percentage-based fee
        const convenienceFeePercent = config.convenience_fee_percent || 5;
        amountInPesos = Math.round(servicePrice * (convenienceFeePercent / 100) * 100) / 100;
      }
      description = `Convenience Fee - Booking #${booking.booking_code}`;
    }

    // Convert to centavos for PayMongo API (minimum ₱100 = 10000 centavos for e-wallet/card)
    const amountInCentavos = Math.max(Math.round(amountInPesos * 100), 10000);

    // Create auth header using branch's secret key
    const authToken = base64EncodeAscii(config.secret_key + ":");
    const authHeaderValue = `Basic ${authToken}`;

    // Build redirect URLs
    const baseUrl = args.origin || "http://localhost:3000";
    const successUrl = `${baseUrl}/booking/payment-success?booking=${booking.booking_code}`;
    const failedUrl = `${baseUrl}/booking/payment-failed?booking=${booking.booking_code}`;

    // Create PayMongo payment link
    const payload = {
      data: {
        attributes: {
          amount: amountInCentavos,
          description,
          remarks: `booking_id:${args.booking_id},payment_type:${args.payment_type}`,
        },
      },
    };

    const response = await fetch("https://api.paymongo.com/v1/links", {
      method: "POST",
      headers: {
        Authorization: authHeaderValue,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      // Log the failure
      await ctx.runMutation(internal.services.paymongo.logPaymentEvent, {
        branch_id: booking.branch_id,
        booking_id: args.booking_id,
        event_type: "payment_failed",
        amount: amountInPesos,
        error_message: data?.errors?.[0]?.detail || "Failed to create payment link",
        created_by: args.created_by,
      });

      throw new Error(
        `PAYMONGO_API_ERROR: ${data?.errors?.[0]?.detail || "Payment processing failed. Please try again or pay at the branch"}`
      );
    }

    const linkId = data.data.id;
    const checkoutUrl = data.data.attributes.checkout_url;

    // Update booking with payment link ID (and fallback flag if using admin's PayMongo)
    await ctx.runMutation(internal.services.paymongo.updateBookingPaymentLink, {
      booking_id: args.booking_id,
      paymongo_link_id: linkId,
      processed_via_admin: config.is_fallback || false,
    });

    // Log successful link creation (FR27)
    await ctx.runMutation(internal.services.paymongo.logPaymentEvent, {
      branch_id: booking.branch_id,
      booking_id: args.booking_id,
      paymongo_link_id: linkId,
      event_type: "link_created",
      amount: amountInPesos,
      payment_method: args.payment_type,
      created_by: args.created_by,
    });

    return {
      success: true,
      linkId,
      checkoutUrl,
      amount: amountInPesos,
      paymentType: args.payment_type,
    };
  },
});

/**
 * Create PayMongo payment link for DEFERRED booking creation
 *
 * This action is used when the booking should NOT be created until payment succeeds.
 * It stores booking data in pendingPayments table and creates a payment link.
 * The actual booking is created only after payment webhook confirms success.
 *
 * @param bookingData - All the booking details (customer, service, date, time, etc.)
 * @param payment_type - "pay_now" or "pay_later"
 * @param origin - Frontend origin for redirect URLs
 */
export const createPaymentLinkDeferred = action({
  args: {
    // Booking data
    customer_id: v.id("users"),
    service_id: v.id("services"),
    barber_id: v.optional(v.id("barbers")),
    branch_id: v.id("branches"),
    date: v.string(),
    time: v.string(),
    notes: v.optional(v.string()),
    voucher_id: v.optional(v.id("vouchers")),
    discount_amount: v.optional(v.number()),
    customer_email: v.optional(v.string()),
    customer_name: v.optional(v.string()),
    booking_fee: v.optional(v.number()),
    price: v.number(),
    // Payment info
    payment_type: v.union(v.literal("pay_now"), v.literal("pay_later"), v.literal("combo_wallet_online")),
    origin: v.optional(v.string()),
    // Combo payment fields
    is_combo_payment: v.optional(v.boolean()),
    use_wallet_balance: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Get branch payment configuration with decrypted keys
    const config = await ctx.runAction(internal.services.paymongo.getDecryptedConfigInternal, {
      branch_id: args.branch_id,
    });

    if (!config) {
      throw new Error("PAYMONGO_NOT_CONFIGURED: Online payment is not available for this branch");
    }

    // Validate payment type is enabled
    if (args.payment_type === "pay_now" && !config.pay_now_enabled) {
      throw new Error("Pay Now option is not enabled for this branch");
    }
    if (args.payment_type === "pay_later" && !config.pay_later_enabled) {
      throw new Error("Pay Later option is not enabled for this branch");
    }
    // Combo payment requires pay_now to be enabled (uses same infrastructure)
    if (args.payment_type === "combo_wallet_online" && !config.pay_now_enabled) {
      throw new Error("Online payment is not enabled for this branch");
    }

    // Calculate amount based on payment type
    const servicePrice = args.price;
    const bookingFee = args.booking_fee || 0;
    let amountInPesos: number;
    let description: string;
    let walletPortion = 0;

    if (args.payment_type === "combo_wallet_online") {
      // Combo Payment: Get wallet balance first, calculate online portion
      const wallet = await ctx.runQuery(api.services.wallet.getWallet, {
        userId: args.customer_id,
      });

      const walletBalance = wallet
        ? ((wallet.balance || 0) + (wallet.bonus_balance || 0)) / 100 // Convert from centavos to pesos
        : 0;

      const totalPrice = servicePrice + bookingFee;
      walletPortion = Math.min(walletBalance, totalPrice);
      amountInPesos = Math.max(0, totalPrice - walletPortion);

      if (amountInPesos <= 0) {
        // If wallet covers full amount, this shouldn't be a combo payment
        throw new Error("Wallet balance covers full amount - use regular wallet payment instead");
      }

      // Minimum PayMongo amount is ₱100 for e-wallet/card transactions
      // If online portion is too small, reject with helpful message
      const PAYMONGO_MIN_AMOUNT = 100;
      if (amountInPesos < PAYMONGO_MIN_AMOUNT) {
        throw new Error(`Online payment portion (₱${amountInPesos.toFixed(2)}) is below minimum ₱${PAYMONGO_MIN_AMOUNT}. Please use a different payment method or top up your wallet.`);
      }

      description = `Partial Payment - Service Booking (₱${walletPortion.toFixed(0)} from wallet)`;

      console.log("[PayMongo] Combo payment calculation:", {
        totalPrice,
        walletBalance,
        walletPortion,
        onlinePortion: amountInPesos,
      });
    } else if (args.payment_type === "pay_now") {
      // Pay Now: Full service price + booking fee
      amountInPesos = servicePrice + bookingFee;
      description = `Full Payment - Service Booking`;
    } else {
      // Pay Later: Convenience fee only (no booking fee) - supports both percent and fixed fee
      const feeType = config.convenience_fee_type || "percent";
      if (feeType === "fixed") {
        // Fixed fee amount
        amountInPesos = config.convenience_fee_amount || 50;
      } else {
        // Percentage-based fee
        const convenienceFeePercent = config.convenience_fee_percent || 5;
        amountInPesos = Math.round(servicePrice * (convenienceFeePercent / 100) * 100) / 100;
      }
      description = `Convenience Fee - Service Booking`;
    }

    // Convert to centavos for PayMongo API (minimum ₱100 = 10000 centavos for e-wallet/card)
    const amountInCentavos = Math.max(Math.round(amountInPesos * 100), 10000);

    // Create auth header using branch's secret key
    const authToken = base64EncodeAscii(config.secret_key + ":");
    const authHeaderValue = `Basic ${authToken}`;

    // Construct redirect URLs
    // Note: PayMongo requires HTTPS URLs for redirect (won't work with localhost)
    // We don't use {CHECKOUT_SESSION_ID} placeholder as it may not be supported
    // Instead, the frontend stores the session ID in localStorage before redirect
    const origin = args.origin || "https://tpxbookingapp.com";
    const successUrl = `${origin}/booking/payment/success`;
    const cancelUrl = `${origin}/booking/payment/cancel`;

    console.log("[PayMongo] Creating checkout session with redirect URLs:", {
      origin,
      successUrl,
      cancelUrl,
      amount: amountInCentavos,
      paymentType: args.payment_type,
    });

    // Create PayMongo Checkout Session (supports redirect URLs)
    const payload = {
      data: {
        attributes: {
          line_items: [
            {
              name: description,
              quantity: 1,
              amount: amountInCentavos,
              currency: "PHP",
            },
          ],
          payment_method_types: ["gcash", "card", "grab_pay", "paymaya"],
          success_url: successUrl,
          cancel_url: cancelUrl,
          description: `${description} - ${args.payment_type === "pay_now" ? "Full Payment" : args.payment_type === "combo_wallet_online" ? "Partial Payment" : "Convenience Fee"}`,
          metadata: {
            type: "booking_payment",
            payment_type: args.payment_type,
            deferred_booking: "true",
            is_combo_payment: args.is_combo_payment ? "true" : "false",
            wallet_portion: walletPortion.toString(),
          },
        },
      },
    };

    const response = await fetch("https://api.paymongo.com/v1/checkout_sessions", {
      method: "POST",
      headers: {
        Authorization: authHeaderValue,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    console.log("[PayMongo] Checkout session API response:", {
      ok: response.ok,
      status: response.status,
      sessionId: data?.data?.id,
      checkoutUrl: data?.data?.attributes?.checkout_url,
      errors: data?.errors,
    });

    if (!response.ok) {
      // Log the failure
      await ctx.runMutation(internal.services.paymongo.logPaymentEvent, {
        branch_id: args.branch_id,
        event_type: "payment_failed",
        amount: amountInPesos,
        error_message: data?.errors?.[0]?.detail || "Failed to create checkout session",
        created_by: args.customer_id,
      });

      throw new Error(
        `PAYMONGO_API_ERROR: ${data?.errors?.[0]?.detail || "Payment processing failed. Please try again or pay at the branch"}`
      );
    }

    // Checkout session returns session ID and checkout URL
    const sessionId = data.data.id;
    const checkoutUrl = data.data.attributes.checkout_url;

    // Store booking data in pendingPayments table
    const now = Date.now();
    const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours from now

    await ctx.runMutation(internal.services.paymongo.createPendingPayment, {
      customer_id: args.customer_id,
      service_id: args.service_id,
      barber_id: args.barber_id,
      branch_id: args.branch_id,
      date: args.date,
      time: args.time,
      notes: args.notes,
      voucher_id: args.voucher_id,
      discount_amount: args.discount_amount,
      customer_email: args.customer_email,
      customer_name: args.customer_name,
      booking_fee: args.booking_fee,
      price: args.price,
      payment_type: args.payment_type,
      paymongo_link_id: sessionId,
      amount_to_pay: amountInPesos,
      created_at: now,
      expires_at: expiresAt,
      created_by: args.customer_id,
      // Combo payment fields
      is_combo_payment: args.is_combo_payment || false,
      wallet_portion: walletPortion,
      // PayMongo fallback tracking
      processed_via_admin: config.is_fallback || false,
    });

    // Log successful checkout session creation
    await ctx.runMutation(internal.services.paymongo.logPaymentEvent, {
      branch_id: args.branch_id,
      paymongo_link_id: sessionId,
      event_type: "checkout_session_created",
      amount: amountInPesos,
      payment_method: args.payment_type,
      created_by: args.customer_id,
    });

    return {
      success: true,
      sessionId,
      checkoutUrl,
      amount: amountInPesos,
      paymentType: args.payment_type,
    };
  },
});

/**
 * Internal mutation to create pending payment record
 */
export const createPendingPayment = mutation({
  args: {
    customer_id: v.id("users"),
    service_id: v.id("services"),
    barber_id: v.optional(v.id("barbers")),
    branch_id: v.id("branches"),
    date: v.string(),
    time: v.string(),
    notes: v.optional(v.string()),
    voucher_id: v.optional(v.id("vouchers")),
    discount_amount: v.optional(v.number()),
    customer_email: v.optional(v.string()),
    customer_name: v.optional(v.string()),
    booking_fee: v.optional(v.number()),
    price: v.number(),
    payment_type: v.union(v.literal("pay_now"), v.literal("pay_later"), v.literal("combo_wallet_online")),
    paymongo_link_id: v.string(),
    amount_to_pay: v.number(),
    created_at: v.number(),
    expires_at: v.number(),
    created_by: v.optional(v.id("users")),
    // Combo payment fields
    is_combo_payment: v.optional(v.boolean()),
    wallet_portion: v.optional(v.number()),
    // PayMongo fallback tracking
    processed_via_admin: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("pendingPayments", {
      ...args,
      status: "pending",
    });
  },
});

/**
 * Internal query to get pending payment by PayMongo link ID
 */
export const getPendingPaymentByLink = query({
  args: {
    paymongo_link_id: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pendingPayments")
      .withIndex("by_paymongo_link", (q) => q.eq("paymongo_link_id", args.paymongo_link_id))
      .first();
  },
});

/**
 * Create booking from pending payment data after payment confirmation
 * This is called by the webhook when a deferred booking payment succeeds
 */
export const createBookingFromPending = mutation({
  args: {
    pending_payment_id: v.id("pendingPayments"),
    paymongo_payment_id: v.string(),
    paymongo_link_id: v.string(),
    payment_type: v.union(v.literal("pay_now"), v.literal("pay_later"), v.literal("combo_wallet_online")),
    amount_paid: v.number(),
  },
  handler: async (ctx, args) => {
    // Get the pending payment record
    const pending = await ctx.db.get(args.pending_payment_id);
    if (!pending) {
      throw new Error("Pending payment not found");
    }

    // Check if already processed (idempotency)
    if (pending.status === "paid") {
      // Return the booking that was already created
      const existingBooking = await ctx.db
        .query("bookings")
        .withIndex("by_paymongo_link", (q) => q.eq("paymongo_link_id", args.paymongo_link_id))
        .first();
      return { bookingId: existingBooking?._id, alreadyProcessed: true };
    }

    // Get service details for price
    const service = await ctx.db.get(pending.service_id);
    if (!service) {
      throw new Error("Service not found");
    }

    // Generate booking code
    const now = Date.now();
    const dateStr = new Date(now).toISOString().slice(0, 10).replace(/-/g, "");
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    const bookingCode = `BK${dateStr}${randomStr}`;

    // Handle combo payment - debit wallet portion first
    let walletDebitResult = null;
    if (pending.is_combo_payment && pending.wallet_portion && pending.wallet_portion > 0) {
      // Debit wallet for the wallet portion
      const wallet = await ctx.db
        .query("wallets")
        .withIndex("by_user", (q) => q.eq("user_id", pending.customer_id))
        .first();

      if (wallet) {
        const mainBalance = wallet.balance || 0;
        const bonusBalance = wallet.bonus_balance || 0;
        const totalAvailable = (mainBalance + bonusBalance) / 100; // Convert from centavos to pesos

        if (totalAvailable >= pending.wallet_portion) {
          // Calculate deduction: bonus first, then main
          const walletPortionCentavos = pending.wallet_portion * 100;
          const bonusUsed = Math.min(bonusBalance, walletPortionCentavos);
          const mainUsed = Math.min(mainBalance, walletPortionCentavos - bonusUsed);

          // Update wallet balances
          await ctx.db.patch(wallet._id, {
            balance: mainBalance - mainUsed,
            bonus_balance: bonusBalance - bonusUsed,
            updatedAt: now,
          });

          // Record wallet payment transaction
          await ctx.db.insert("wallet_transactions", {
            user_id: pending.customer_id,
            type: "payment",
            amount: -pending.wallet_portion, // Negative for debit (in pesos)
            status: "completed",
            provider: "wallet",
            reference_id: args.paymongo_payment_id,
            createdAt: now,
            updatedAt: now,
            description: `Combo Payment (Wallet portion) - ₱${pending.wallet_portion}`,
          });

          walletDebitResult = {
            walletPortion: pending.wallet_portion,
            bonusUsed: bonusUsed / 100,
            mainUsed: mainUsed / 100,
          };

          console.log("[PayMongo] Combo payment - wallet debited:", walletDebitResult);
        } else {
          console.error("[PayMongo] Combo payment - insufficient wallet balance:", {
            required: pending.wallet_portion,
            available: totalAvailable,
          });
          // Wallet debit failed - record this in the booking for manual resolution
          walletDebitResult = {
            walletPortion: 0,
            bonusUsed: 0,
            mainUsed: 0,
            walletDebitFailed: true,
            failureReason: `Insufficient balance: needed ₱${pending.wallet_portion}, had ₱${totalAvailable.toFixed(2)}`,
          };
        }
      }
    }

    // Determine payment status based on payment type
    const paymentStatus = args.payment_type === "pay_now" || args.payment_type === "combo_wallet_online" ? "paid" : "partial";
    const convenienceFeePaid = args.payment_type === "pay_later" ? args.amount_paid : undefined;

    // Calculate final price
    const discountAmount = pending.discount_amount || 0;
    const finalPrice = pending.price - discountAmount;

    // Track actual amount paid by customer (for price adjustment tracking on edits)
    const amountPaid = paymentStatus === "paid" ? finalPrice : (convenienceFeePaid || 0);

    // Determine payment method based on payment type
    const paymentMethod = args.payment_type === "combo_wallet_online"
      ? "combo"
      : args.payment_type === "pay_later"
        ? "paymongo"
        : "paymongo"; // pay_now uses PayMongo

    // Create the actual booking
    const bookingId = await ctx.db.insert("bookings", {
      customer: pending.customer_id,
      service: pending.service_id,
      barber: pending.barber_id,
      branch_id: pending.branch_id,
      date: pending.date,
      time: pending.time,
      status: "booked", // Booking is now confirmed since payment succeeded
      notes: pending.notes,
      voucher_id: pending.voucher_id,
      discount_amount: pending.discount_amount,
      customer_email: pending.customer_email,
      customer_name: pending.customer_name,
      booking_fee: pending.booking_fee,
      price: pending.price,
      final_price: finalPrice,
      booking_code: bookingCode,
      payment_status: paymentStatus,
      payment_method: paymentMethod,
      amount_paid: amountPaid,
      paymongo_link_id: args.paymongo_link_id,
      paymongo_payment_id: args.paymongo_payment_id,
      convenience_fee_paid: convenienceFeePaid,
      // Combo payment fields
      is_combo_payment: pending.is_combo_payment || false,
      wallet_amount_paid: walletDebitResult?.walletDebitFailed ? 0 : walletDebitResult?.walletPortion,
      online_amount_paid: pending.is_combo_payment ? args.amount_paid : undefined,
      wallet_debit_failed: walletDebitResult?.walletDebitFailed || false,
      wallet_debit_failure_reason: walletDebitResult?.failureReason,
      createdAt: now,
      updatedAt: now,
    });

    // Mark pending payment as paid
    await ctx.db.patch(args.pending_payment_id, {
      status: "paid",
      paid_at: now,
    });

    // Create earning record for admin-processed online payments (settlement tracking)
    // This runs in the same mutation as booking creation for reliability
    if (pending.processed_via_admin) {
      try {
        // Get commission rate: branch override > global config > default
        const branchSettings = await ctx.db
          .query("branchWalletSettings")
          .withIndex("by_branch", (q) => q.eq("branch_id", pending.branch_id))
          .first();
        const globalConfig = await ctx.db.query("walletConfig").first();
        const commissionPercent =
          branchSettings?.commission_override ??
          globalConfig?.default_commission_percent ??
          DEFAULT_COMMISSION_PERCENT;

        const grossAmount = args.amount_paid;
        const { commissionAmount, netAmount } = calculateCommission(grossAmount, commissionPercent);

        await ctx.db.insert("branchWalletEarnings", {
          branch_id: pending.branch_id,
          booking_id: bookingId,
          customer_id: pending.customer_id,
          service_name: service?.name || "Online Booking Payment",
          gross_amount: grossAmount,
          commission_percent: commissionPercent,
          commission_amount: commissionAmount,
          net_amount: netAmount,
          status: EARNING_STATUS.PENDING,
          processed_via: "admin",
          payment_source: "online_paymongo",
          created_at: now,
        });

        console.log("[PAYMONGO_FALLBACK] Earning record created in booking mutation:", {
          bookingId,
          gross: grossAmount,
          commission: commissionAmount,
          net: netAmount,
          rate: commissionPercent,
        });
      } catch (earningError) {
        console.error("[PAYMONGO_FALLBACK] Failed to create earning record:", earningError);
      }
    }

    // Award loyalty points for pay_now and combo_wallet_online payments
    // (Pay later doesn't earn points until full payment at branch)
    let pointsAwarded = null;
    if (args.payment_type === "pay_now" || args.payment_type === "combo_wallet_online") {
      try {
        // Award points on the full service price (not just online portion)
        // This is consistent with wallet-only payment behavior
        pointsAwarded = await ctx.runMutation(api.services.points.awardPointsWithPromo, {
          userId: pending.customer_id,
          baseAmount: finalPrice, // Full service price in pesos
          branchId: pending.branch_id,
          sourceType: "payment",
          sourceId: `BOOKING-${bookingId}`,
          notes: pending.is_combo_payment
            ? `Points earned from combo payment (Wallet + Online)`
            : `Points earned from online payment`,
        });
        console.log("[PayMongo] Points awarded for payment:", pointsAwarded);
      } catch (pointsError) {
        console.error("[PayMongo] Failed to award points:", pointsError);
        // Don't fail the booking if points award fails - can be reconciled later
      }
    }

    // Redeem voucher if one was used
    if (pending.voucher_id) {
      try {
        // Find the voucher and mark as redeemed
        const userVoucher = await ctx.db
          .query("user_vouchers")
          .withIndex("by_voucher", (q) => q.eq("voucher_id", pending.voucher_id!))
          .filter((q) => q.eq(q.field("user_id"), pending.customer_id))
          .first();

        if (userVoucher && userVoucher.status === "assigned") {
          await ctx.db.patch(userVoucher._id, {
            status: "redeemed",
            redeemed_at: now,
          });
        }
      } catch (voucherError) {
        console.error("Voucher redemption error:", voucherError);
        // Don't fail the booking if voucher redemption fails
      }
    }

    // Send booking confirmation email (was missing for PayMongo bookings)
    try {
      const customer = pending.customer_id ? await ctx.db.get(pending.customer_id) : null;
      const branch = await ctx.db.get(pending.branch_id);
      const barber = pending.barber_id ? await ctx.db.get(pending.barber_id) : null;
      const customerEmail = pending.customer_email || (customer as any)?.email;
      const customerName = pending.customer_name || (customer as any)?.nickname || (customer as any)?.username || "Customer";

      if (customerEmail && branch) {
        await ctx.scheduler.runAfter(0, api.services.auth.sendBookingConfirmationEmail, {
          email: customerEmail,
          customerName,
          bookingCode,
          serviceName: service.name,
          servicePrice: finalPrice,
          barberName: (barber as any)?.full_name || "Any Available",
          branchName: branch.name || "Our Branch",
          branchAddress: branch.address,
          date: pending.date,
          time: pending.time,
          bookingId: bookingId.toString(),
        });
        console.log("[PAYMONGO] Booking confirmation email scheduled for:", customerEmail);
      }
    } catch (emailError) {
      console.error("[PAYMONGO] Failed to send booking email:", emailError);
    }

    return { bookingId, alreadyProcessed: false, bookingCode };
  },
});

/**
 * Internal query to get booking details for payment
 */
export const getBookingForPayment = query({
  args: {
    booking_id: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.booking_id);
  },
});

/**
 * Public query to get payment/booking status by PayMongo link ID
 * Used by the payment success page to display booking details
 * Handles both deferred bookings (pendingPayments) and direct bookings
 */
export const getPaymentStatusByLink = query({
  args: {
    paymongo_link_id: v.string(),
  },
  handler: async (ctx, args) => {
    // First, check if there's a completed booking with this link ID
    const booking = await ctx.db
      .query("bookings")
      .withIndex("by_paymongo_link", (q) => q.eq("paymongo_link_id", args.paymongo_link_id))
      .first();

    if (booking) {
      // Get service and barber details for display
      const service = await ctx.db.get(booking.service);
      const barber = booking.barber ? await ctx.db.get(booking.barber) : null;
      const branch = await ctx.db.get(booking.branch_id);

      return {
        status: "completed",
        booking: {
          _id: booking._id,
          booking_code: booking.booking_code,
          date: booking.date,
          time: booking.time,
          payment_status: booking.payment_status,
          service_name: service?.name || "Unknown Service",
          service_price: booking.price,
          barber_name: barber?.full_name || barber?.name || "Any Available",
          branch_name: branch?.name || "Unknown Branch",
          convenience_fee_paid: booking.convenience_fee_paid,
        },
      };
    }

    // Check pendingPayments table for deferred booking
    const pendingPayment = await ctx.db
      .query("pendingPayments")
      .withIndex("by_paymongo_link", (q) => q.eq("paymongo_link_id", args.paymongo_link_id))
      .first();

    if (pendingPayment) {
      // Get service details for display
      const service = await ctx.db.get(pendingPayment.service_id);
      const barber = pendingPayment.barber_id ? await ctx.db.get(pendingPayment.barber_id) : null;
      const branch = await ctx.db.get(pendingPayment.branch_id);

      if (pendingPayment.status === "pending") {
        return {
          status: "pending",
          message: "Payment is being processed...",
          pendingPayment: {
            date: pendingPayment.date,
            time: pendingPayment.time,
            service_name: service?.name || "Unknown Service",
            service_price: pendingPayment.price,
            barber_name: barber?.full_name || barber?.name || "Any Available",
            branch_name: branch?.name || "Unknown Branch",
            payment_type: pendingPayment.payment_type,
            amount_to_pay: pendingPayment.amount_to_pay,
          },
        };
      } else if (pendingPayment.status === "paid") {
        // Payment confirmed but booking query might be stale, return pending payment details
        return {
          status: "paid",
          message: "Payment confirmed! Creating your booking...",
          pendingPayment: {
            date: pendingPayment.date,
            time: pendingPayment.time,
            service_name: service?.name || "Unknown Service",
            service_price: pendingPayment.price,
            barber_name: barber?.full_name || barber?.name || "Any Available",
            branch_name: branch?.name || "Unknown Branch",
            payment_type: pendingPayment.payment_type,
            amount_to_pay: pendingPayment.amount_to_pay,
          },
        };
      } else {
        return {
          status: pendingPayment.status,
          message: pendingPayment.status === "expired" ? "Payment link has expired" : "Payment failed",
        };
      }
    }

    return {
      status: "not_found",
      message: "Payment not found",
    };
  },
});

/**
 * Internal query to get SA wallet config (for PayMongo fallback)
 * Used when a branch has no PayMongo config — falls back to super admin's PayMongo
 */
export const getSAWalletConfig = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("walletConfig").first();
  },
});

/**
 * Internal action to get decrypted config (for use in other actions)
 * Falls back to super admin's PayMongo config when branch has none
 */
export const getDecryptedConfigInternal = action({
  args: {
    branch_id: v.id("branches"),
    force_admin_fallback: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Validate encryption key is configured
    if (!PAYMONGO_ENCRYPTION_KEY || PAYMONGO_ENCRYPTION_KEY.length !== 64) {
      return null;
    }

    // Get the raw config from database
    const config = await ctx.runQuery(internal.services.paymongo.getPaymentConfigInternal, {
      branch_id: args.branch_id,
    });

    if (!config || !config.is_enabled || args.force_admin_fallback) {
      // Fallback: Use super admin's PayMongo config
      const saConfig = await ctx.runQuery(internal.services.paymongo.getSAWalletConfig);
      if (!saConfig || !saConfig.paymongo_secret_key) {
        return null;
      }

      try {
        // SA wallet config stores keys in "iv:encrypted" format
        const [secretIv, secretEncrypted] = saConfig.paymongo_secret_key.split(":");
        const [webhookIv, webhookEncrypted] = saConfig.paymongo_webhook_secret.split(":");

        if (!secretIv || !secretEncrypted || !webhookIv || !webhookEncrypted) {
          console.error("[PAYMONGO_FALLBACK] SA wallet config keys not properly encrypted");
          return null;
        }

        const secretKey = await decryptApiKey(secretEncrypted, secretIv, PAYMONGO_ENCRYPTION_KEY);
        const webhookSecret = await decryptApiKey(webhookEncrypted, webhookIv, PAYMONGO_ENCRYPTION_KEY);

        // Public key is stored in plaintext in walletConfig
        const publicKey = saConfig.paymongo_public_key;

        console.log("[PAYMONGO_FALLBACK] Using SA PayMongo for branch:", args.branch_id);

        return {
          branch_id: args.branch_id,
          provider: "paymongo" as const,
          is_enabled: true,
          is_fallback: true, // Flag indicating admin's PayMongo is being used
          public_key: publicKey,
          secret_key: secretKey,
          webhook_secret: webhookSecret,
          pay_now_enabled: true,
          pay_later_enabled: false,
          pay_at_shop_enabled: true,
          convenience_fee_type: "percent" as const,
          convenience_fee_percent: undefined,
          convenience_fee_amount: undefined,
        };
      } catch (error) {
        console.error("[PAYMONGO_FALLBACK] Failed to decrypt SA config:", error);
        return null;
      }
    }

    // Decrypt the branch's API keys
    const publicKey = await decryptApiKey(
      config.public_key_encrypted,
      config.encryption_iv,
      PAYMONGO_ENCRYPTION_KEY
    );
    const secretKey = await decryptApiKey(
      config.secret_key_encrypted,
      config.encryption_iv,
      PAYMONGO_ENCRYPTION_KEY
    );
    const webhookSecret = await decryptApiKey(
      config.webhook_secret_encrypted,
      config.encryption_iv,
      PAYMONGO_ENCRYPTION_KEY
    );

    return {
      branch_id: config.branch_id,
      provider: config.provider,
      is_enabled: config.is_enabled,
      is_fallback: false, // Branch's own PayMongo
      public_key: publicKey,
      secret_key: secretKey,
      webhook_secret: webhookSecret,
      pay_now_enabled: config.pay_now_enabled,
      pay_later_enabled: config.pay_later_enabled,
      pay_at_shop_enabled: config.pay_at_shop_enabled,
      convenience_fee_type: config.convenience_fee_type || "percent",
      convenience_fee_percent: config.convenience_fee_percent,
      convenience_fee_amount: config.convenience_fee_amount,
    };
  },
});

// ============================================================================
// WEBHOOK PROCESSING
// ============================================================================
// Story 7.3: Build PayMongo Webhook Handler
// Processes incoming webhooks from PayMongo for payment status updates
// FR19, FR20, FR24, FR29, NFR14
// ============================================================================

/**
 * Verify PayMongo webhook signature using HMAC-SHA256 (FR24)
 * Signature format: t=timestamp,te=test_signature,li=live_signature
 */
async function verifyWebhookSignature(
  signature: string,
  rawBody: string,
  webhookSecret: string
): Promise<boolean> {
  if (!signature || !webhookSecret) {
    return false;
  }

  // Parse signature components
  const parts = signature.split(",");
  let timestamp = "";
  let testSignature = "";
  let liveSignature = "";

  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key === "t") timestamp = value;
    if (key === "te") testSignature = value;
    if (key === "li") liveSignature = value;
  }

  if (!timestamp) {
    return false;
  }

  // Construct the payload to verify: timestamp.rawBody
  const payloadToSign = `${timestamp}.${rawBody}`;

  // Use the appropriate signature (live in production, test in development)
  const expectedSignature = liveSignature || testSignature;
  if (!expectedSignature) {
    return false;
  }

  // Compute HMAC-SHA256 using Web Crypto API
  const encoder = new TextEncoder();
  const keyData = encoder.encode(webhookSecret);
  const payloadData = encoder.encode(payloadToSign);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, payloadData);
  const computedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time comparison to prevent timing attacks
  return computedSignature === expectedSignature;
}

/**
 * Process PayMongo webhook
 * Main entry point for webhook processing called from http.ts
 */
export const processWebhook = action({
  args: {
    signature: v.string(),
    rawBody: v.string(),
    eventType: v.string(),
    linkId: v.string(),
    bookingIdStr: v.string(),
    paymentType: v.string(),
    amount: v.number(),
    paymentMethod: v.string(),
    paymentId: v.string(),
    ipAddress: v.string(),
    rawPayload: v.any(),
  },
  handler: async (ctx, args) => {
    // First, check if this is a deferred booking (booking not yet created)
    const pendingPayment = await ctx.runQuery(internal.services.paymongo.getPendingPaymentByLink, {
      paymongo_link_id: args.linkId,
    });

    // If we have a pending payment, this is a deferred booking flow
    if (pendingPayment && pendingPayment.status === "pending") {
      // Log webhook received for deferred booking
      await ctx.runMutation(internal.services.paymongo.logPaymentEvent, {
        branch_id: pendingPayment.branch_id,
        paymongo_link_id: args.linkId,
        event_type: "webhook_received",
        amount: args.amount,
        payment_method: args.paymentMethod,
        raw_payload: args.rawPayload,
        ip_address: args.ipAddress,
      });

      // Get branch payment config to verify signature
      // Force admin fallback if this payment was originally processed via admin's PayMongo
      const config = await ctx.runAction(internal.services.paymongo.getDecryptedConfigInternal, {
        branch_id: pendingPayment.branch_id,
        force_admin_fallback: pendingPayment.processed_via_admin || false,
      });

      if (!config) {
        await ctx.runMutation(internal.services.paymongo.logPaymentEvent, {
          branch_id: pendingPayment.branch_id,
          paymongo_link_id: args.linkId,
          event_type: "webhook_failed",
          error_message: "Payment config not found",
          ip_address: args.ipAddress,
        });
        return { success: false, error: "Payment configuration not found", status: 500 };
      }

      // Verify webhook signature (FR24)
      const isValid = await verifyWebhookSignature(
        args.signature,
        args.rawBody,
        config.webhook_secret
      );

      if (!isValid) {
        await ctx.runMutation(internal.services.paymongo.logPaymentEvent, {
          branch_id: pendingPayment.branch_id,
          paymongo_link_id: args.linkId,
          event_type: "webhook_failed",
          error_message: "Invalid signature",
          ip_address: args.ipAddress,
        });
        return { success: false, error: "Invalid signature", status: 401 };
      }

      // Log webhook verified
      await ctx.runMutation(internal.services.paymongo.logPaymentEvent, {
        branch_id: pendingPayment.branch_id,
        paymongo_link_id: args.linkId,
        paymongo_payment_id: args.paymentId,
        event_type: "webhook_verified",
        amount: args.amount,
        payment_method: args.paymentMethod,
        ip_address: args.ipAddress,
      });

      // Process payment for deferred booking
      // Handle both Payment Links (link.payment.paid) and Checkout Sessions (checkout_session.payment.paid)
      if (args.eventType === "link.payment.paid" || args.eventType === "checkout_session.payment.paid") {
        // Create the actual booking now that payment is confirmed
        const bookingResult = await ctx.runMutation(internal.services.paymongo.createBookingFromPending, {
          pending_payment_id: pendingPayment._id,
          paymongo_payment_id: args.paymentId,
          paymongo_link_id: args.linkId,
          payment_type: pendingPayment.payment_type,
          amount_paid: args.amount,
        });

        // Note: Earning record for admin-processed payments is now created
        // inside createBookingFromPending mutation for reliability

        // Log payment completed
        await ctx.runMutation(internal.services.paymongo.logPaymentEvent, {
          branch_id: pendingPayment.branch_id,
          booking_id: bookingResult.bookingId,
          paymongo_link_id: args.linkId,
          paymongo_payment_id: args.paymentId,
          event_type: "payment_completed",
          amount: args.amount,
          payment_method: args.paymentMethod,
          payment_for: pendingPayment.payment_type === "pay_now" ? "full_service" : "convenience_fee",
          ip_address: args.ipAddress,
        });

        return { success: true, message: "Deferred booking created successfully", bookingId: bookingResult.bookingId };
      }

      return { success: true, message: `Event ${args.eventType} acknowledged (deferred)` };
    }

    // Fall back to existing flow: Find booking by link ID
    const booking = await ctx.runQuery(internal.services.paymongo.getBookingByPaymongoLink, {
      paymongo_link_id: args.linkId,
    });

    if (!booking) {
      // Can't log without branch_id, just return error
      return { success: false, error: "Booking not found for link", status: 404 };
    }

    // Log webhook received (FR29)
    await ctx.runMutation(internal.services.paymongo.logPaymentEvent, {
      branch_id: booking.branch_id,
      booking_id: booking._id,
      paymongo_link_id: args.linkId,
      event_type: "webhook_received",
      amount: args.amount,
      payment_method: args.paymentMethod,
      raw_payload: args.rawPayload,
      ip_address: args.ipAddress,
    });

    // Get branch payment config to verify signature
    // Force admin fallback if this booking was originally processed via admin's PayMongo
    const config = await ctx.runAction(internal.services.paymongo.getDecryptedConfigInternal, {
      branch_id: booking.branch_id,
      force_admin_fallback: booking.processed_via_admin || false,
    });

    if (!config) {
      await ctx.runMutation(internal.services.paymongo.logPaymentEvent, {
        branch_id: booking.branch_id,
        booking_id: booking._id,
        paymongo_link_id: args.linkId,
        event_type: "webhook_failed",
        error_message: "Payment config not found",
        ip_address: args.ipAddress,
      });
      return { success: false, error: "Payment configuration not found", status: 500 };
    }

    // Verify webhook signature (FR24)
    const isValid = await verifyWebhookSignature(
      args.signature,
      args.rawBody,
      config.webhook_secret
    );

    if (!isValid) {
      // Log webhook signature failure
      await ctx.runMutation(internal.services.paymongo.logPaymentEvent, {
        branch_id: booking.branch_id,
        booking_id: booking._id,
        paymongo_link_id: args.linkId,
        event_type: "webhook_failed",
        error_message: "Invalid signature",
        ip_address: args.ipAddress,
      });
      return { success: false, error: "Invalid signature", status: 401 };
    }

    // Log webhook verified
    await ctx.runMutation(internal.services.paymongo.logPaymentEvent, {
      branch_id: booking.branch_id,
      booking_id: booking._id,
      paymongo_link_id: args.linkId,
      paymongo_payment_id: args.paymentId,
      event_type: "webhook_verified",
      amount: args.amount,
      payment_method: args.paymentMethod,
      ip_address: args.ipAddress,
    });

    // Check for idempotency - skip if already processed (NFR14)
    if (booking.paymongo_payment_id === args.paymentId) {
      return { success: true, message: "Already processed (idempotent)" };
    }

    // Process based on event type
    // Handle both Payment Links (link.payment.paid) and Checkout Sessions (checkout_session.payment.paid)
    if (args.eventType === "link.payment.paid" || args.eventType === "checkout_session.payment.paid") {
      // Determine payment status based on payment type
      const newPaymentStatus = args.paymentType === "pay_now" ? "paid" : "partial";
      const convenienceFeePaid = args.paymentType === "pay_later" ? args.amount : undefined;

      // Update booking payment status (FR20)
      await ctx.runMutation(internal.services.paymongo.updateBookingPaymentStatus, {
        booking_id: booking._id,
        payment_status: newPaymentStatus as "paid" | "partial",
        paymongo_payment_id: args.paymentId,
        convenience_fee_paid: convenienceFeePaid,
      });

      // Note: For regular bookings with admin-processed payments, earning record
      // would need to be created here if needed in the future.
      // Currently, deferred bookings (the primary flow) handle this in createBookingFromPending.

      // Log payment completed (FR28)
      await ctx.runMutation(internal.services.paymongo.logPaymentEvent, {
        branch_id: booking.branch_id,
        booking_id: booking._id,
        paymongo_link_id: args.linkId,
        paymongo_payment_id: args.paymentId,
        event_type: "payment_completed",
        amount: args.amount,
        payment_method: args.paymentMethod,
        payment_for: args.paymentType === "pay_now" ? "full_service" : "convenience_fee",
        ip_address: args.ipAddress,
      });

      return { success: true, message: "Payment processed successfully" };
    }

    // Unknown event type - just acknowledge
    return { success: true, message: `Event ${args.eventType} acknowledged` };
  },
});

/**
 * Get booking by PayMongo link ID
 */
export const getBookingByPaymongoLink = query({
  args: {
    paymongo_link_id: v.string(),
  },
  handler: async (ctx, args) => {
    // Query bookings table for matching paymongo_link_id
    const bookings = await ctx.db.query("bookings").collect();
    return bookings.find((b) => b.paymongo_link_id === args.paymongo_link_id) || null;
  },
});

/**
 * Update booking payment status after successful payment
 * FR20: Update booking from webhook
 */
export const updateBookingPaymentStatus = mutation({
  args: {
    booking_id: v.id("bookings"),
    payment_status: v.union(v.literal("paid"), v.literal("partial")),
    paymongo_payment_id: v.string(),
    convenience_fee_paid: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get current booking to check if it needs status upgrade
    const booking = await ctx.db.get(args.booking_id);

    const updates: Record<string, unknown> = {
      payment_status: args.payment_status,
      paymongo_payment_id: args.paymongo_payment_id,
      updatedAt: Date.now(),
    };

    // If booking was "pending" (awaiting payment), upgrade to "booked" now that payment succeeded
    // This implements the "booking only confirmed after payment" flow
    if (booking?.status === "pending") {
      updates.status = "booked";
    }

    if (args.convenience_fee_paid !== undefined) {
      updates.convenience_fee_paid = args.convenience_fee_paid;
    }

    // Track actual amount paid for price adjustment tracking on edits
    if (args.payment_status === "paid" && booking) {
      updates.amount_paid = booking.final_price || booking.price || 0;
    } else if (args.convenience_fee_paid !== undefined) {
      updates.amount_paid = args.convenience_fee_paid;
    }

    await ctx.db.patch(args.booking_id, updates);

    // =========================================================================
    // AWARD POINTS ON SUCCESSFUL PAYMENT (Customer Experience)
    // Only award points for full payment ("paid"), not partial ("partial")
    // =========================================================================
    let pointsResult = null;
    if (args.payment_status === "paid" && booking?.customer) {
      try {
        // Get the payment amount from booking price or final_price
        const paymentAmount = booking.final_price || booking.price || 0;

        if (paymentAmount > 0) {
          console.log("[PAYMONGO] Awarding points for successful payment:", {
            bookingId: args.booking_id,
            customerId: booking.customer,
            amount: paymentAmount,
          });

          // Award points with promo check
          pointsResult = await ctx.runMutation(api.services.points.awardPointsWithPromo, {
            userId: booking.customer,
            baseAmount: paymentAmount, // Payment amount in pesos
            branchId: booking.branch_id,
            sourceType: "payment",
            sourceId: `BOOKING-${args.booking_id}`,
            notes: `Payment for booking ${booking.booking_code || args.booking_id}`,
          });

          console.log("[PAYMONGO] Points awarded:", {
            bookingId: args.booking_id,
            basePoints: pointsResult.basePoints,
            bonusPoints: pointsResult.bonusPoints,
            totalPoints: pointsResult.totalPoints,
            promoApplied: pointsResult.promoApplied?.promoName || null,
          });
        }
      } catch (error) {
        // Log but don't fail the payment update if points award fails
        console.error("[PAYMONGO] Failed to award points:", error);
      }
    }

    return {
      success: true,
      statusUpgraded: booking?.status === "pending",
      pointsAwarded: pointsResult
        ? {
            basePoints: pointsResult.basePoints,
            bonusPoints: pointsResult.bonusPoints,
            totalPoints: pointsResult.totalPoints,
            promoApplied: pointsResult.promoApplied?.promoName || null,
          }
        : null,
    };
  },
});

// ============================================================================
// MANUAL PAYMENT STATUS CHECK
// ============================================================================
// Fallback for when webhooks aren't configured or aren't reaching the server
// This action polls PayMongo directly to check if a checkout session was paid
// ============================================================================

/**
 * Manually check and process payment status from PayMongo
 * Use this as a fallback when webhooks aren't working
 */
export const checkAndProcessPaymentStatus = action({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("[checkAndProcessPaymentStatus] Checking session:", args.sessionId);

    // 1. Get the pending payment record
    const pendingPayment = await ctx.runQuery(internal.services.paymongo.getPendingPaymentByLink, {
      paymongo_link_id: args.sessionId,
    });

    if (!pendingPayment) {
      return { success: false, error: "Pending payment not found", status: "not_found" };
    }

    // Already processed?
    if (pendingPayment.status === "paid") {
      // Check if booking exists
      const existingBooking = await ctx.runQuery(internal.services.paymongo.getBookingByPaymongoLink, {
        paymongo_link_id: args.sessionId,
      });
      return {
        success: true,
        status: "already_paid",
        bookingId: existingBooking?._id,
        bookingCode: existingBooking?.booking_code,
      };
    }

    // 2. Get branch payment config to get the secret key
    const config = await ctx.runAction(internal.services.paymongo.getDecryptedConfigInternal, {
      branch_id: pendingPayment.branch_id,
    });

    if (!config) {
      return { success: false, error: "Payment config not found", status: "error" };
    }

    // 3. Poll PayMongo to get checkout session status
    const authToken = base64EncodeAscii(config.secret_key + ":");
    const authHeaderValue = `Basic ${authToken}`;

    const response = await fetch(`https://api.paymongo.com/v1/checkout_sessions/${args.sessionId}`, {
      method: "GET",
      headers: {
        Authorization: authHeaderValue,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    console.log("[checkAndProcessPaymentStatus] PayMongo response:", {
      ok: response.ok,
      status: response.status,
      sessionStatus: data?.data?.attributes?.status,
      paymentIntentStatus: data?.data?.attributes?.payment_intent?.attributes?.status,
    });

    if (!response.ok) {
      return {
        success: false,
        error: data?.errors?.[0]?.detail || "Failed to check payment status",
        status: "error",
      };
    }

    const sessionData = data.data;
    const sessionStatus = sessionData?.attributes?.status;
    const paymentIntent = sessionData?.attributes?.payment_intent;
    const paymentIntentStatus = paymentIntent?.attributes?.status;

    // Check if payment was successful
    // Checkout session status: "active", "expired", "paid"
    // Payment intent status: "awaiting_payment_method", "processing", "succeeded"
    if (sessionStatus === "paid" || paymentIntentStatus === "succeeded") {
      console.log("[checkAndProcessPaymentStatus] Payment confirmed! Creating booking...");

      // Extract payment details
      const payments = paymentIntent?.attributes?.payments || [];
      const paymentId = payments[0]?.id || `manual_${Date.now()}`;
      const amount = paymentIntent?.attributes?.amount ? paymentIntent.attributes.amount / 100 : pendingPayment.amount_to_pay;

      // 4. Create the booking (same as webhook flow)
      const bookingResult = await ctx.runMutation(internal.services.paymongo.createBookingFromPending, {
        pending_payment_id: pendingPayment._id,
        paymongo_payment_id: paymentId,
        paymongo_link_id: args.sessionId,
        payment_type: pendingPayment.payment_type,
        amount_paid: amount,
      });

      // 5. Log payment completed
      await ctx.runMutation(internal.services.paymongo.logPaymentEvent, {
        branch_id: pendingPayment.branch_id,
        booking_id: bookingResult.bookingId,
        paymongo_link_id: args.sessionId,
        paymongo_payment_id: paymentId,
        event_type: "payment_completed",
        amount: amount,
        payment_method: "manual_check",
        payment_for: pendingPayment.payment_type === "pay_now" ? "full_service" : "convenience_fee",
      });

      return {
        success: true,
        status: "paid",
        bookingId: bookingResult.bookingId,
        bookingCode: bookingResult.bookingCode,
        alreadyProcessed: bookingResult.alreadyProcessed,
      };
    } else if (sessionStatus === "expired") {
      return {
        success: false,
        status: "expired",
        error: "Payment session has expired",
      };
    } else {
      // Still pending
      return {
        success: true,
        status: "pending",
        sessionStatus,
        paymentIntentStatus,
      };
    }
  },
});