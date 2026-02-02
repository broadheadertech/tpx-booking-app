import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Webhook } from "svix";

// ============================================================================
// HTTP ROUTER FOR WEBHOOKS
// ============================================================================
// Story 7.3: Build PayMongo Webhook Handler
// Story 10.3: Build Clerk Webhook Handler
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

// ============================================================================
// SA WALLET TOP-UP WEBHOOK HANDLER
// ============================================================================
// Story 23.1: Wallet Top-up via Super Admin PayMongo
// Processes checkout_session.payment.paid events for SA wallet top-ups
// ============================================================================

/**
 * SA Wallet Webhook Handler
 * Endpoint: POST /webhooks/sa-wallet
 *
 * Processes payment events for centralized wallet top-ups:
 * - checkout_session.payment.paid: Wallet top-up completed
 *
 * Security:
 * - Verifies PayMongo signature using SA webhook secret
 * - Returns 401 on invalid signature
 *
 * Idempotency:
 * - Duplicate webhooks are handled gracefully (no double-credit)
 */
http.route({
  path: "/webhooks/sa-wallet",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();

    // Extract headers
    const signature = request.headers.get("Paymongo-Signature") || "";

    // Get client IP for logging
    const ipAddress =
      request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
      request.headers.get("CF-Connecting-IP") ||
      "unknown";

    // Parse the webhook payload
    let payload: WebhookPayload;
    try {
      payload = JSON.parse(body);
    } catch {
      console.error("[SA-Wallet Webhook] Invalid JSON payload");
      return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Extract event data
    const eventType = payload?.data?.attributes?.type;
    const eventData = payload?.data?.attributes?.data;

    console.log("[SA-Wallet Webhook] Received event:", {
      eventType,
      eventDataId: eventData?.id,
      ipAddress,
    });

    // Only process checkout_session.payment.paid events
    if (eventType !== "checkout_session.payment.paid") {
      console.log("[SA-Wallet Webhook] Ignoring event type:", eventType);
      return new Response(JSON.stringify({ success: true, message: `Event ${eventType} acknowledged` }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Extract session ID and payment details
    const sessionId = eventData?.id || "";
    const metadata = eventData?.attributes?.metadata || {};

    // Verify this is a SA wallet top-up
    if (metadata?.type !== "sa_wallet_topup") {
      console.log("[SA-Wallet Webhook] Not a SA wallet top-up, ignoring");
      return new Response(JSON.stringify({ success: true, message: "Not a SA wallet event" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get payment amount from payment_intent
    const paymentIntent = eventData?.attributes?.payment_intent;
    const amountCentavos = paymentIntent?.attributes?.amount || 0;
    const amount = amountCentavos / 100; // Convert to pesos

    const payments = paymentIntent?.attributes?.payments || [];
    const paymentId = payments[0]?.id || `webhook_${Date.now()}`;

    console.log("[SA-Wallet Webhook] Processing top-up:", {
      sessionId,
      paymentId,
      amount,
      userId: metadata?.user_id,
    });

    // Verify webhook signature
    const signatureResult = await ctx.runAction(internal.services.wallet.verifySAWalletWebhookSignature, {
      signature,
      rawBody: body,
    });

    if (!signatureResult.valid) {
      console.error("[SA-Wallet Webhook] Invalid signature:", signatureResult.error);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Process the top-up
    const result = await ctx.runAction(internal.services.wallet.processSAWalletTopupWebhook, {
      sessionId,
      paymentId,
      amount,
      rawPayload: payload,
    });

    if (!result.success) {
      console.error("[SA-Wallet Webhook] Processing failed:", result.error);
      return new Response(JSON.stringify({ error: result.error }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("[SA-Wallet Webhook] Top-up processed successfully:", {
      userId: result.userId,
      credited: result.credited,
      bonus: result.bonus,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// ============================================================================
// CLERK WEBHOOK HANDLER
// ============================================================================
// Story 10.3: Clerk Webhook Integration
// Story 13.1: Organization sync for multi-tenant isolation
//
// Handles incoming webhooks from Clerk for user and organization sync:
// - user.created: Create or link user with clerk_user_id
// - user.updated: Update user email/name
// - user.deleted: Soft delete user
// - organization.created: Link Clerk org to branch
// - organization.updated: Log organization updates
// - organization.deleted: Unlink org from branch
// - organizationMembership.created: Assign user to branch
// - organizationMembership.deleted: Remove user from branch
//
// Security:
// - Verifies svix signature headers using CLERK_WEBHOOK_SECRET
// - Returns 401 on invalid signature
// ============================================================================

/**
 * Clerk Webhook Handler
 * Endpoint: POST /webhooks/clerk
 *
 * Processes user events from Clerk:
 * - user.created: New user registered in Clerk
 * - user.updated: User profile updated in Clerk
 * - user.deleted: User deleted in Clerk
 *
 * Security (AC #2, #3):
 * - Verifies svix-id, svix-timestamp, svix-signature headers
 * - Returns 401 on invalid signature
 */
http.route({
  path: "/webhooks/clerk",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // 1. Extract Svix signature headers (AC #2)
    const svix_id = request.headers.get("svix-id");
    const svix_timestamp = request.headers.get("svix-timestamp");
    const svix_signature = request.headers.get("svix-signature");

    // 2. Get raw body for signature verification
    const body = await request.text();

    console.log("[Clerk Webhook] Received request:", {
      has_svix_id: !!svix_id,
      has_svix_timestamp: !!svix_timestamp,
      has_svix_signature: !!svix_signature,
      body_length: body.length,
    });

    // 3. Verify signature using Svix (AC #2)
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("[Clerk Webhook] CLERK_WEBHOOK_SECRET not configured");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    const wh = new Webhook(webhookSecret);
    let payload: ClerkWebhookPayload;

    try {
      // Verify the webhook signature
      payload = wh.verify(body, {
        "svix-id": svix_id || "",
        "svix-timestamp": svix_timestamp || "",
        "svix-signature": svix_signature || "",
      }) as ClerkWebhookPayload;
    } catch (err) {
      // AC #3: Return 401 on invalid signature
      console.error("[Clerk Webhook] Signature verification failed:", err);
      return new Response("Invalid signature", { status: 401 });
    }

    // 4. Process based on event type (AC #4, #5, #6)
    const eventType = payload.type;
    console.log("[Clerk Webhook] Processing event:", eventType);

    try {
      switch (eventType) {
        case "user.created":
          // AC #4: Handle user.created event
          await ctx.runMutation(internal.services.clerkSync.handleUserCreated, {
            payload: payload.data,
          });
          break;

        case "user.updated":
          // AC #5: Handle user.updated event
          await ctx.runMutation(internal.services.clerkSync.handleUserUpdated, {
            payload: payload.data,
          });
          break;

        case "user.deleted":
          // AC #6: Handle user.deleted event
          await ctx.runMutation(internal.services.clerkSync.handleUserDeleted, {
            payload: {
              id: payload.data.id,
              deleted: true,
            },
          });
          break;

        // Story 13.1: Organization events for multi-tenant isolation
        case "organization.created":
          await ctx.runMutation(internal.services.clerkSync.handleOrgCreated, {
            payload: {
              id: payload.data.id,
              name: payload.data.name || "",
              slug: payload.data.slug || "",
              created_at: payload.data.created_at || Date.now(),
              updated_at: payload.data.updated_at || Date.now(),
              members_count: payload.data.members_count,
              public_metadata: payload.data.public_metadata,
            },
          });
          break;

        case "organization.updated":
          await ctx.runMutation(internal.services.clerkSync.handleOrgUpdated, {
            payload: {
              id: payload.data.id,
              name: payload.data.name || "",
              slug: payload.data.slug || "",
              created_at: payload.data.created_at || Date.now(),
              updated_at: payload.data.updated_at || Date.now(),
              members_count: payload.data.members_count,
              public_metadata: payload.data.public_metadata,
            },
          });
          break;

        case "organization.deleted":
          await ctx.runMutation(internal.services.clerkSync.handleOrgDeleted, {
            payload: {
              id: payload.data.id,
              deleted: true,
            },
          });
          break;

        case "organizationMembership.created":
          await ctx.runMutation(internal.services.clerkSync.handleOrgMembershipCreated, {
            payload: {
              id: payload.data.id,
              organization: payload.data.organization,
              public_user_data: payload.data.public_user_data,
              role: payload.data.role || "member",
              created_at: payload.data.created_at || Date.now(),
              updated_at: payload.data.updated_at || Date.now(),
            },
          });
          break;

        case "organizationMembership.deleted":
          await ctx.runMutation(internal.services.clerkSync.handleOrgMembershipDeleted, {
            payload: {
              id: payload.data.id,
              organization: payload.data.organization,
              public_user_data: payload.data.public_user_data,
              role: payload.data.role || "member",
              created_at: payload.data.created_at || Date.now(),
              updated_at: payload.data.updated_at || Date.now(),
            },
          });
          break;

        default:
          // Handle unknown event types gracefully - log and return 200
          console.log("[Clerk Webhook] Unhandled event type:", eventType);
      }
    } catch (error) {
      // Log mutation errors but still return 200 to prevent Clerk retries
      // Only signature failures should return non-200
      console.error("[Clerk Webhook] Error processing event:", error);
    }

    // 5. Return 200 OK
    return new Response("OK", { status: 200 });
  }),
});

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// Type definitions for Clerk webhook payload
// Supports both user and organization events
interface ClerkWebhookPayload {
  type: string; // e.g., "user.created", "organization.created", "organizationMembership.created"
  data: {
    // Common fields
    id: string; // clerk_user_id, clerk_org_id, or membership_id
    created_at: number;
    updated_at: number;

    // User-specific fields
    email_addresses?: Array<{
      email_address: string;
      id: string;
      verification?: { status: string };
    }>;
    first_name?: string | null;
    last_name?: string | null;
    image_url?: string | null;

    // Organization-specific fields (organization.* events)
    name?: string;
    slug?: string;
    members_count?: number;
    public_metadata?: {
      branch_id?: string;
    };

    // OrganizationMembership-specific fields (organizationMembership.* events)
    organization?: {
      id: string;
      name: string;
      slug: string;
    };
    public_user_data?: {
      user_id: string;
    };
    role?: string;
  };
}

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
