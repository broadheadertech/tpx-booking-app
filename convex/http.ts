import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

// ============================================================================
// HTTP ROUTER FOR WEBHOOKS
// ============================================================================
// Story 7.3: Build PayMongo Webhook Handler
// Handles incoming webhooks from PayMongo for payment status updates
// ============================================================================

const http = httpRouter();

/**
 * PayMongo Webhook Handler
 * Endpoint: POST /webhooks/paymongo
 *
 * Processes payment events from PayMongo:
 * - link.payment.paid: Payment link was successfully paid
 * - checkout_session.payment.paid: Checkout session payment completed
 *
 * Security (FR24):
 * - Verifies Paymongo-Signature header using HMAC-SHA256
 * - Returns 401 on invalid signature
 *
 * Audit (FR29):
 * - Logs webhook_received, webhook_verified/failed, payment_completed events
 */
http.route({
  path: "/webhooks/paymongo",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();

    // Extract headers
    const signature = request.headers.get("Paymongo-Signature") || "";

    // Get client IP for audit logging
    const ipAddress =
      request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
      request.headers.get("CF-Connecting-IP") ||
      "unknown";

    // Parse the webhook payload
    let payload: WebhookPayload;
    try {
      payload = JSON.parse(body);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Extract event data
    const eventType = payload?.data?.attributes?.type;
    const eventData = payload?.data?.attributes?.data;

    console.log("[PayMongo Webhook] Received event:", {
      eventType,
      eventDataId: eventData?.id,
      eventDataType: eventData?.type,
    });

    // Variables to extract based on event type
    let linkId = "";
    let remarks = "";
    let amount = 0;
    let paymentMethod = "unknown";
    let paymentId = "";

    // Handle different event types with different payload structures
    if (eventType === "checkout_session.payment.paid") {
      // Checkout Session payload structure
      linkId = eventData?.id || ""; // Session ID (cs_xxx)

      // Get metadata from checkout session
      const metadata = eventData?.attributes?.metadata || {};
      const paymentTypeFromMeta = metadata?.payment_type || "";

      // Get payment details from payment_intent
      const paymentIntent = eventData?.attributes?.payment_intent;
      amount = paymentIntent?.attributes?.amount
        ? paymentIntent.attributes.amount / 100
        : 0;

      const payments = paymentIntent?.attributes?.payments || [];
      if (payments.length > 0) {
        paymentId = payments[0]?.id || "";
        paymentMethod = payments[0]?.attributes?.source?.type || "unknown";
      }

      // Build remarks from metadata for consistency
      remarks = `deferred_booking,payment_type:${paymentTypeFromMeta}`;
    } else {
      // Payment Link payload structure (link.payment.paid)
      linkId = eventData?.id || "";
      remarks = eventData?.attributes?.remarks || "";
      amount = eventData?.attributes?.amount
        ? eventData.attributes.amount / 100
        : 0;

      const payments = eventData?.attributes?.payments || [];
      if (payments.length > 0) {
        paymentId = payments[0]?.id || "";
        paymentMethod = payments[0]?.attributes?.source?.type || "unknown";
      }
    }

    // Parse booking_id and payment_type from remarks
    // Format: "booking_id:xxx,payment_type:pay_now" or "deferred_booking,payment_type:pay_now"
    const bookingIdMatch = remarks.match(/booking_id:([^,]+)/);
    const paymentTypeMatch = remarks.match(/payment_type:([^,]+)/);
    const bookingIdStr = bookingIdMatch ? bookingIdMatch[1] : null;
    const paymentType = paymentTypeMatch ? paymentTypeMatch[1] : null;

    // Process the webhook
    const result = await ctx.runAction(internal.services.paymongo.processWebhook, {
      signature,
      rawBody: body,
      eventType: eventType || "unknown",
      linkId: linkId,
      bookingIdStr: bookingIdStr || "",
      paymentType: paymentType || "",
      amount: amount,
      paymentMethod: paymentMethod,
      paymentId: paymentId,
      ipAddress,
      rawPayload: payload,
    });

    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: result.status || 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// Type definitions for PayMongo webhook payload
// Supports both Payment Links and Checkout Sessions
interface WebhookPayload {
  data: {
    id: string;
    type: string;
    attributes: {
      type: string; // e.g., "link.payment.paid" or "checkout_session.payment.paid"
      data: {
        id: string; // link_xxx or cs_xxx
        type: string;
        attributes: {
          // Payment Link fields
          amount?: number;
          status?: string;
          remarks?: string;
          payments?: Array<{
            id: string;
            type: string;
            attributes: {
              amount: number;
              status: string;
              source?: {
                type: string; // gcash, maya, card, etc.
              };
            };
          }>;
          // Checkout Session fields
          checkout_url?: string;
          line_items?: Array<{
            name: string;
            quantity: number;
            amount: number;
          }>;
          metadata?: {
            payment_type?: string;
            deferred_booking?: string;
          };
          payment_intent?: {
            id: string;
            attributes: {
              amount: number;
              currency: string;
              payments?: Array<{
                id: string;
                type: string;
                attributes: {
                  amount: number;
                  status: string;
                  source?: {
                    type: string;
                  };
                };
              }>;
            };
          };
        };
      };
    };
  };
}

export default http;
