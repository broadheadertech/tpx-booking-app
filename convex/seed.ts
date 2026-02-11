import { mutation } from "./_generated/server";

/**
 * Production seed data
 * Run via Convex dashboard or CLI: npx convex run seed:seedAll
 */

/**
 * Seed the deployment super admin account
 */
export const seedAll = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Check if users already exist
    const existingUsers = await ctx.db.query("users").collect();
    if (existingUsers.length > 0) {
      return {
        success: false,
        message: "Data already exists. Use clearAndSeed to reset.",
      };
    }

    // Create super admin deployment account
    await ctx.db.insert("users", {
      username: "broadheader_admin",
      email: "tech@broadheader.com",
      password: "@Broadheader_8080",
      nickname: "Broadheader Admin",
      mobile_number: "+63 000 000 0000",
      role: "super_admin",
      is_active: true,
      skills: [],
      isVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      message: "Production seed data created successfully",
      data: {
        users: 1,
        admin: {
          email: "tech@broadheader.com",
          role: "super_admin",
        },
      },
    };
  },
});

/**
 * Clear all data and re-seed with production account
 */
export const clearAndSeed = mutation({
  args: {},
  handler: async (ctx) => {
    // Tables to clear (order matters - clear dependent tables first)
    const tablesToClear = [
      "bookings",
      "paymentAuditLog",
      "pendingPayments",
      "transactions",
      "branchPaymentConfig",
      "royaltyConfig",
      "royaltyPayments",
      "officialReceipts",
      "cashAdvances",
      "expenses",
      "timeAttendance",
      "wallets",
      "wallet_transactions",
      "points_ledger",
      "points_transactions",
      "barbers",
      "users",
      "services",
      "branches",
    ] as const;

    let totalDeleted = 0;

    for (const table of tablesToClear) {
      const records = await ctx.db.query(table).collect();
      for (const record of records) {
        await ctx.db.delete(record._id);
        totalDeleted++;
      }
    }

    // Now seed fresh production data
    const now = Date.now();

    // Create super admin deployment account
    await ctx.db.insert("users", {
      username: "broadheader_admin",
      email: "tech@broadheader.com",
      password: "@Broadheader_8080",
      nickname: "Broadheader Admin",
      mobile_number: "+63 000 000 0000",
      role: "super_admin",
      is_active: true,
      skills: [],
      isVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      message: `Cleared ${totalDeleted} records. Production seed data created.`,
      data: {
        cleared: totalDeleted,
        users: 1,
        admin: {
          email: "tech@broadheader.com",
          role: "super_admin",
        },
      },
    };
  },
});
