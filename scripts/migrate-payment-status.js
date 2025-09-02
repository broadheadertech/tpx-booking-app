// Migration script to add payment_status to existing bookings
// Run this in Convex dashboard or via npx convex run migratePaymentStatus

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

async function migrateBookings() {
  const client = new ConvexHttpClient(process.env.CONVEX_URL);

  try {
    console.log("Starting payment status migration...");

    const result = await client.mutation(api.services.bookings.migratePaymentStatus);

    console.log(`✅ Migration completed! Updated ${result.updated} bookings with default payment status.`);

  } catch (error) {
    console.error("❌ Migration failed:", error);
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateBookings();
}

export { migrateBookings };
