import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

// Webhook handler for Clerk events
http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const payload = await request.json();
      const eventType = payload.type;

      console.log("Clerk webhook received:", eventType);

      switch (eventType) {
        case "user.created":
          // Sync new user to Convex
          await ctx.runMutation(internal.clerk.syncClerkUser, {
            clerkUserId: payload.data.id,
            email: payload.data.email_addresses[0]?.email_address || "",
            username: payload.data.username || payload.data.email_addresses[0]?.email_address.split("@")[0] || "",
            firstName: payload.data.first_name || "",
            lastName: payload.data.last_name || "",
            avatar: payload.data.image_url || "",
            phoneNumber: payload.data.phone_numbers[0]?.phone_number || "",
          });
          break;

        case "user.updated":
          // Update existing user in Convex
          await ctx.runMutation(internal.clerk.updateClerkUser, {
            clerkUserId: payload.data.id,
            email: payload.data.email_addresses[0]?.email_address || "",
            username: payload.data.username || payload.data.email_addresses[0]?.email_address.split("@")[0] || "",
            firstName: payload.data.first_name || "",
            lastName: payload.data.last_name || "",
            avatar: payload.data.image_url || "",
            phoneNumber: payload.data.phone_numbers[0]?.phone_number || "",
          });
          break;

        case "user.deleted":
          // Deactivate user in Convex
          await ctx.runMutation(internal.clerk.deactivateClerkUser, {
            clerkUserId: payload.data.id,
          });
          break;

        default:
          console.log("Unhandled webhook event:", eventType);
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Clerk webhook error:", error);
      return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

export default http;
