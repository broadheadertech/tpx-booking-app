import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
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
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    if (!PAYMONGO_SECRET_KEY) throw new Error("PAYMONGO_SECRET_KEY not configured");
    const payload = {
      data: {
        attributes: {
          amount: Math.round(args.amount * 100),
          redirect: {
            success: `${BASE_URL}/customer/wallet?topup=success`,
            failed: `${BASE_URL}/customer/wallet?topup=failure`
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
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    if (!PAYMONGO_SECRET_KEY) throw new Error("PAYMONGO_SECRET_KEY not configured");
    const amount = Math.round(args.amount * 100);

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
            return_url: args.returnUrl || `${BASE_URL}/customer/wallet?topup=success`
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