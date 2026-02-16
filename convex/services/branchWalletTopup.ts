/**
 * Branch Wallet Top-up via PayMongo
 *
 * Enables branch admins to top up their prepaid wallet via online payment
 * (GCash, Maya, Card) using HQ's PayMongo credentials from walletConfig.
 *
 * Flow:
 * 1. Branch admin selects amount → createBranchWalletTopupSession
 * 2. Redirect to PayMongo checkout
 * 3. Webhook fires → processBranchWalletTopupWebhook → credits wallet
 * 4. Frontend polls via checkBranchTopupPaymentStatus as fallback
 *
 * @module convex/services/branchWalletTopup
 */

import { action, query, internalMutation, internalQuery, internalAction } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import { api, internal } from "../_generated/api";
import { decryptApiKey } from "../lib/encryption";

const PAYMONGO_ENCRYPTION_KEY = process.env.PAYMONGO_ENCRYPTION_KEY || "";
const PAYMONGO_MIN_AMOUNT = 100; // ₱100 minimum for PayMongo

// Base64 encode for Basic auth (same as wallet.ts)
function base64EncodeAscii(input: string): string {
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

// Helper to decrypt walletConfig secret key
async function getDecryptedSecretKey(config: { paymongo_secret_key: string }): Promise<string> {
  if (!PAYMONGO_ENCRYPTION_KEY || PAYMONGO_ENCRYPTION_KEY.length !== 64) {
    throw new ConvexError({
      code: "CONFIG_ERROR",
      message: "Payment system is not configured. Please contact support.",
    });
  }

  const [iv, encrypted] = config.paymongo_secret_key.split(":");
  if (!iv || !encrypted) {
    throw new ConvexError({
      code: "CONFIG_ERROR",
      message: "Payment system is not configured. Please contact support.",
    });
  }

  return await decryptApiKey(encrypted, iv, PAYMONGO_ENCRYPTION_KEY);
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get pending branch wallet topups for UI display
 */
export const getPendingBranchTopups = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pendingBranchWalletTopups")
      .withIndex("by_branch_status", (q) =>
        q.eq("branch_id", args.branch_id).eq("status", "pending")
      )
      .order("desc")
      .take(5);
  },
});

// ============================================================================
// INTERNAL QUERIES
// ============================================================================

export const getPendingBranchTopupBySession = internalQuery({
  args: { paymongo_session_id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pendingBranchWalletTopups")
      .withIndex("by_session", (q) =>
        q.eq("paymongo_session_id", args.paymongo_session_id)
      )
      .first();
  },
});

// ============================================================================
// INTERNAL MUTATIONS
// ============================================================================

export const createPendingBranchTopup = internalMutation({
  args: {
    branch_id: v.id("branches"),
    amount: v.number(),
    paymongo_session_id: v.string(),
    created_by: v.id("users"),
    description: v.optional(v.string()),
    created_at: v.number(),
    expires_at: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("pendingBranchWalletTopups", {
      ...args,
      status: "pending",
    });
  },
});

export const updatePendingBranchTopup = internalMutation({
  args: {
    pending_id: v.id("pendingBranchWalletTopups"),
    status: v.union(
      v.literal("paid"),
      v.literal("expired"),
      v.literal("failed")
    ),
    paymongo_payment_id: v.optional(v.string()),
    payment_method: v.optional(v.string()),
    paid_at: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { pending_id, ...updates } = args;
    await ctx.db.patch(pending_id, updates);
  },
});

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * Create a PayMongo checkout session for branch wallet top-up.
 * Uses HQ's walletConfig credentials.
 */
export const createBranchWalletTopupSession = action({
  args: {
    branch_id: v.id("branches"),
    amount: v.number(),
    created_by: v.id("users"),
    description: v.optional(v.string()),
    origin: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate amount
    if (args.amount <= 0 || !Number.isInteger(args.amount)) {
      throw new ConvexError({
        code: "INVALID_AMOUNT",
        message: "Amount must be a positive whole number (in pesos)",
      });
    }
    if (args.amount < PAYMONGO_MIN_AMOUNT) {
      throw new ConvexError({
        code: "INVALID_AMOUNT",
        message: `Minimum online top-up amount is ₱${PAYMONGO_MIN_AMOUNT}`,
      });
    }

    // Get HQ wallet config
    const config = await ctx.runQuery(api.services.walletConfig.getDecryptedWalletConfig);
    if (!config) {
      throw new ConvexError({
        code: "CONFIG_NOT_FOUND",
        message: "Online payment is currently unavailable. Please contact HQ.",
      });
    }

    // Decrypt secret key
    let secretKey: string;
    try {
      secretKey = await getDecryptedSecretKey(config);
    } catch (error) {
      console.error("[BRANCH_WALLET_TOPUP] Failed to decrypt secret key:", error);
      throw new ConvexError({
        code: "CONFIG_ERROR",
        message: "Online payment is currently unavailable. Please try again later.",
      });
    }

    // Build auth header
    const authToken = base64EncodeAscii(secretKey + ":");
    const authHeaderValue = `Basic ${authToken}`;

    // Redirect URLs
    const successUrl = `${args.origin}/staff/dashboard?topup=success`;
    const cancelUrl = `${args.origin}/staff/dashboard?topup=cancelled`;

    // Convert to centavos
    const amountInCentavos = Math.round(args.amount * 100);

    console.log("[BRANCH_WALLET_TOPUP] Creating checkout session:", {
      branchId: args.branch_id,
      amount: args.amount,
      amountCentavos: amountInCentavos,
    });

    // Create PayMongo checkout session
    const payload = {
      data: {
        attributes: {
          line_items: [
            {
              name: "Branch Wallet Top-up",
              quantity: 1,
              amount: amountInCentavos,
              currency: "PHP",
            },
          ],
          payment_method_types: ["gcash", "card", "grab_pay", "paymaya"],
          success_url: successUrl,
          cancel_url: cancelUrl,
          description: `Branch Wallet Top-up ₱${args.amount.toLocaleString()}`,
          metadata: {
            type: "branch_wallet_topup",
            branch_id: args.branch_id,
            amount: args.amount.toString(),
            created_by: args.created_by,
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

    console.log("[BRANCH_WALLET_TOPUP] PayMongo response:", {
      ok: response.ok,
      status: response.status,
      sessionId: data?.data?.id,
      errors: data?.errors,
    });

    if (!response.ok) {
      throw new ConvexError({
        code: "PAYMONGO_ERROR",
        message: data?.errors?.[0]?.detail || "Failed to create payment session. Please try again.",
      });
    }

    const sessionId = data.data.id;
    const checkoutUrl = data.data.attributes.checkout_url;

    // Store pending record
    const now = Date.now();
    const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours

    await ctx.runMutation(internal.services.branchWalletTopup.createPendingBranchTopup, {
      branch_id: args.branch_id,
      amount: args.amount,
      paymongo_session_id: sessionId,
      created_by: args.created_by,
      description: args.description,
      created_at: now,
      expires_at: expiresAt,
    });

    return {
      success: true,
      sessionId,
      checkoutUrl,
      amount: args.amount,
    };
  },
});

/**
 * Verify webhook signature using HQ's walletConfig webhook secret.
 * Same pattern as verifySAWalletWebhookSignature in wallet.ts.
 */
export const verifyBranchWalletWebhookSignature = internalAction({
  args: {
    signature: v.string(),
    rawBody: v.string(),
  },
  handler: async (ctx, args) => {
    const config = await ctx.runQuery(api.services.walletConfig.getDecryptedWalletConfig);

    if (!config) {
      return { valid: false, error: "Wallet config not found" };
    }

    if (!PAYMONGO_ENCRYPTION_KEY || PAYMONGO_ENCRYPTION_KEY.length !== 64) {
      return { valid: false, error: "Encryption key not configured" };
    }

    // Decrypt webhook secret
    const [iv, encrypted] = config.paymongo_webhook_secret.split(":");
    if (!iv || !encrypted) {
      return { valid: false, error: "Invalid webhook secret format" };
    }

    let webhookSecret: string;
    try {
      webhookSecret = await decryptApiKey(encrypted, iv, PAYMONGO_ENCRYPTION_KEY);
    } catch (error) {
      console.error("[BRANCH_WALLET_WEBHOOK] Failed to decrypt webhook secret:", error);
      return { valid: false, error: "Failed to decrypt webhook secret" };
    }

    // Parse signature: t=timestamp,te=test_signature,li=live_signature
    const parts = args.signature.split(",");
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
      return { valid: false, error: "Missing timestamp in signature" };
    }

    // Compute HMAC-SHA256
    const payloadToSign = `${timestamp}.${args.rawBody}`;
    const expectedSignature = liveSignature || testSignature;

    if (!expectedSignature) {
      return { valid: false, error: "Missing signature value" };
    }

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

    const valid = computedSignature === expectedSignature;

    console.log("[BRANCH_WALLET_WEBHOOK] Signature verification:", {
      valid,
      timestamp,
      hasTestSig: !!testSignature,
      hasLiveSig: !!liveSignature,
    });

    return { valid };
  },
});

/**
 * Process branch wallet top-up after webhook confirms payment.
 * Credits the branch wallet and updates the pending record.
 */
export const processBranchWalletTopupWebhook = internalAction({
  args: {
    sessionId: v.string(),
    paymentId: v.string(),
    amount: v.number(),
    paymentMethod: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("[BRANCH_WALLET_WEBHOOK] Processing top-up:", {
      sessionId: args.sessionId,
      paymentId: args.paymentId,
      amount: args.amount,
    });

    // Get pending record
    const pending = await ctx.runQuery(
      internal.services.branchWalletTopup.getPendingBranchTopupBySession,
      { paymongo_session_id: args.sessionId }
    );

    if (!pending) {
      console.error("[BRANCH_WALLET_WEBHOOK] No pending top-up for session:", args.sessionId);
      return { success: false, error: "Pending top-up not found" };
    }

    // Idempotency: already processed
    if (pending.status === "paid") {
      console.log("[BRANCH_WALLET_WEBHOOK] Already processed:", args.sessionId);
      return { success: true, alreadyProcessed: true };
    }

    // Credit the branch wallet (use stored amount, not webhook amount)
    const creditResult = await ctx.runMutation(api.services.branchWallet.topUpBranchWallet, {
      branch_id: pending.branch_id,
      amount: pending.amount,
      topped_up_by: pending.created_by,
      description: `Online top-up via ${args.paymentMethod} (₱${pending.amount.toLocaleString()})`,
      reference_type: "online_topup",
      reference_id: args.sessionId,
    });

    // Update pending record
    await ctx.runMutation(internal.services.branchWalletTopup.updatePendingBranchTopup, {
      pending_id: pending._id,
      status: "paid",
      paymongo_payment_id: args.paymentId,
      payment_method: args.paymentMethod,
      paid_at: Date.now(),
    });

    console.log("[BRANCH_WALLET_WEBHOOK] Wallet credited:", {
      branchId: pending.branch_id,
      amount: pending.amount,
      newBalance: creditResult.newBalance,
    });

    // Email SA + BA about branch wallet top-up
    try {
      await ctx.runAction(api.services.emailNotifications.sendNotificationToRole, {
        notification_type: "branch_wallet_topup",
        role: "super_admin",
        variables: {
          amount: `₱${pending.amount.toLocaleString()}`,
          payment_method: args.paymentMethod,
        },
      });
      await ctx.runAction(api.services.emailNotifications.sendNotificationToRole, {
        notification_type: "branch_wallet_topup",
        role: "branch_admin",
        branch_id: pending.branch_id,
        variables: {
          amount: `₱${pending.amount.toLocaleString()}`,
          payment_method: args.paymentMethod,
        },
      });
    } catch (e) { console.error("[BRANCH_WALLET_WEBHOOK] Email failed:", e); }

    return {
      success: true,
      branchId: pending.branch_id,
      amount: pending.amount,
      newBalance: creditResult.newBalance,
    };
  },
});

/**
 * Manually check and process a pending branch wallet top-up.
 * Fallback for when webhooks don't fire.
 */
export const checkBranchTopupPaymentStatus = action({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    // Get pending record
    const pending = await ctx.runQuery(
      internal.services.branchWalletTopup.getPendingBranchTopupBySession,
      { paymongo_session_id: args.sessionId }
    );

    if (!pending) {
      return { success: false, status: "not_found" };
    }

    // Already processed
    if (pending.status === "paid") {
      return { success: true, status: "paid", amount: pending.amount };
    }

    // Expired check
    if (pending.status === "expired" || pending.status === "failed") {
      return { success: false, status: pending.status };
    }

    // Check with PayMongo
    const config = await ctx.runQuery(api.services.walletConfig.getDecryptedWalletConfig);
    if (!config) {
      return { success: false, status: "config_error" };
    }

    let secretKey: string;
    try {
      secretKey = await getDecryptedSecretKey(config);
    } catch {
      return { success: false, status: "config_error" };
    }

    const authToken = base64EncodeAscii(secretKey + ":");
    const authHeaderValue = `Basic ${authToken}`;

    const response = await fetch(
      `https://api.paymongo.com/v1/checkout_sessions/${args.sessionId}`,
      {
        method: "GET",
        headers: {
          Authorization: authHeaderValue,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return { success: false, status: "api_error" };
    }

    const sessionStatus = data.data?.attributes?.status;
    const paymentIntent = data.data?.attributes?.payment_intent;
    const paymentIntentStatus = paymentIntent?.attributes?.status;

    if (sessionStatus === "paid" || paymentIntentStatus === "succeeded") {
      // Payment confirmed — credit the wallet
      const payments = paymentIntent?.attributes?.payments || [];
      const paymentId = payments[0]?.id || `manual_${Date.now()}`;
      const paymentMethod = payments[0]?.attributes?.source?.type || "online";

      const result = await ctx.runAction(
        internal.services.branchWalletTopup.processBranchWalletTopupWebhook,
        {
          sessionId: args.sessionId,
          paymentId,
          amount: pending.amount,
          paymentMethod,
        }
      );

      return {
        success: result.success,
        status: "paid",
        amount: pending.amount,
      };
    }

    if (sessionStatus === "expired") {
      // Mark as expired
      await ctx.runMutation(internal.services.branchWalletTopup.updatePendingBranchTopup, {
        pending_id: pending._id,
        status: "expired",
      });
      return { success: false, status: "expired" };
    }

    return { success: false, status: "pending" };
  },
});
