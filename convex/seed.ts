import { mutation } from "./_generated/server";
import { hashPassword } from "./utils/password";

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

/**
 * Development Seeder
 * Clears ALL tables and seeds comprehensive test data.
 * Run via: npx convex run seed:devSeed
 */
export const devSeed = mutation({
  args: {},
  handler: async (ctx) => {
    // ========================================================================
    // STEP 1: Clear ALL 93 tables (dependency-safe order)
    // ========================================================================
    const tablesToClear = [
      // Leaf/dependent tables first
      "bookings", "walkIns", "transactions", "pos_sessions", "payments", "ratings",
      "custom_booking_submissions", "custom_booking_forms",
      "payroll_records", "payroll_adjustments", "payroll_periods", "payroll_settings",
      "barber_commission_rates", "service_commission_rates", "product_commission_rates", "barber_daily_rates",
      "payroll_zero_day_claims",
      "email_campaigns", "email_campaign_logs", "email_templates",
      "wallets", "wallet_transactions", "points_ledger", "points_transactions",
      "customer_branch_activity", "tiers", "tier_benefits", "loyalty_config", "loyalty_config_audit",
      "vouchers", "user_vouchers",
      "barber_portfolio", "barber_achievements", "post_likes", "post_bookmarks",
      "branch_posts", "post_product_purchases",
      "products", "productCatalog", "inventoryBatches", "productOrders",
      "expenses", "branchRevenue", "assets", "liabilities", "equity",
      "balance_sheet_snapshots", "accounting_periods",
      "royaltyConfig", "royaltyPayments", "officialReceipts", "receiptCounters", "cashAdvances",
      "superAdminRevenue", "superAdminExpenses", "superAdminAssets",
      "superAdminLiabilities", "superAdminEquity",
      "superAdminAccountingPeriods", "superAdminBalanceSheetSnapshots",
      "branchPaymentConfig", "paymentAuditLog", "pendingPayments",
      "permissionAuditLog", "flash_promotions", "promo_usage",
      "walletConfig", "shopConfig", "branchWalletSettings", "branchWalletEarnings", "branchSettlements",
      "user_style_preferences", "style_swipe_history", "barber_match_history",
      "feed_interactions", "user_feed_profile", "wishlists", "user_addresses",
      "shopBanners", "maintenanceConfig", "push_tokens",
      "timeAttendance", "events", "notifications", "sessions",
      // Parent tables last
      "barbers", "services", "defaultServices",
      "branding", "branding_global", "branding_history",
      "users", "branches",
    ] as const;

    let totalDeleted = 0;
    for (const table of tablesToClear) {
      const records = await ctx.db.query(table).collect();
      for (const record of records) {
        await ctx.db.delete(record._id);
        totalDeleted++;
      }
    }

    const now = Date.now();
    const hashedPassword = hashPassword("TpxBarber2026!@#");

    // ========================================================================
    // STEP 2: Create Branch
    // ========================================================================
    const branchId = await ctx.db.insert("branches", {
      branch_code: "TPX-MAIN",
      name: "TPX Main Branch",
      address: "123 Main St, Manila",
      phone: "+63 912 345 6789",
      email: "main@tpx.com",
      is_active: true,
      slug: "tpx-main",
      createdAt: now,
      updatedAt: now,
    });

    // ========================================================================
    // STEP 3: Create 7 Users
    // ========================================================================
    // Full permission object for branch admin
    const fullPerm = { view: true, create: true, edit: true, delete: true, approve: true };
    const pageAccessV2 = {
      overview: fullPerm, reports: fullPerm, bookings: fullPerm, custom_bookings: fullPerm,
      calendar: fullPerm, walkins: fullPerm, pos: fullPerm, barbers: fullPerm,
      users: fullPerm, services: fullPerm, customers: fullPerm, products: fullPerm,
      order_products: fullPerm, vouchers: fullPerm, payroll: fullPerm, cash_advances: fullPerm,
      royalty: fullPerm, pl: fullPerm, balance_sheet: fullPerm, payments: fullPerm,
      payment_history: fullPerm, attendance: fullPerm, events: fullPerm, notifications: fullPerm,
      email_marketing: fullPerm, team: fullPerm, finance: fullPerm, marketing: fullPerm,
      queue: fullPerm, accounting: fullPerm, branch_wallet: fullPerm, wallet_earnings: fullPerm,
      customer_analytics: fullPerm, post_moderation: fullPerm,
      branches: fullPerm, catalog: fullPerm, branding: fullPerm, emails: fullPerm, settings: fullPerm,
    };

    const pageAccess = [
      "overview", "reports", "bookings", "custom_bookings", "calendar", "walkins",
      "pos", "barbers", "users", "services", "customers", "products", "order_products",
      "vouchers", "payroll", "cash_advances", "royalty", "pl", "balance_sheet",
      "payments", "payment_history", "attendance", "events", "notifications", "email_marketing",
      "team", "finance", "marketing", "queue", "accounting", "branch_wallet", "wallet_earnings",
      "customer_analytics", "post_moderation",
    ];

    // Super Admin
    const superAdminId = await ctx.db.insert("users", {
      username: "super_admin",
      email: "super@tpx.com",
      password: hashedPassword,
      nickname: "Super Admin",
      mobile_number: "+63 900 000 0001",
      role: "super_admin",
      is_active: true,
      skills: [],
      isVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    // Branch Admin
    const branchAdminId = await ctx.db.insert("users", {
      username: "admin_main",
      email: "admin@tpxmain.com",
      password: hashedPassword,
      nickname: "Branch Admin",
      mobile_number: "+63 900 000 0002",
      role: "branch_admin",
      branch_id: branchId,
      is_active: true,
      skills: [],
      isVerified: true,
      page_access: pageAccess,
      page_access_v2: pageAccessV2,
      createdAt: now,
      updatedAt: now,
    });

    // Barber: Juan
    const juanUserId = await ctx.db.insert("users", {
      username: "juan_barber",
      email: "juan@tpx.com",
      password: hashedPassword,
      nickname: "Juan",
      mobile_number: "+63 900 000 0003",
      role: "barber",
      branch_id: branchId,
      is_active: true,
      skills: ["Haircut", "Beard Trim", "Hair Color"],
      isVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    // Barber: Pedro
    const pedroUserId = await ctx.db.insert("users", {
      username: "pedro_barber",
      email: "pedro@tpx.com",
      password: hashedPassword,
      nickname: "Pedro",
      mobile_number: "+63 900 000 0004",
      role: "barber",
      branch_id: branchId,
      is_active: true,
      skills: ["Haircut", "Shave", "Styling"],
      isVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    // Barber: Maria
    const mariaUserId = await ctx.db.insert("users", {
      username: "maria_barber",
      email: "maria@tpx.com",
      password: hashedPassword,
      nickname: "Maria",
      mobile_number: "+63 900 000 0005",
      role: "barber",
      branch_id: branchId,
      is_active: true,
      skills: ["Haircut", "Hair Color", "Treatment"],
      isVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    // Customer: Test
    const customerTestId = await ctx.db.insert("users", {
      username: "customer_test",
      email: "customer@example.com",
      password: hashedPassword,
      nickname: "Test Customer",
      mobile_number: "+63 900 000 0006",
      role: "customer",
      is_active: true,
      skills: [],
      isVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    // Customer: 123
    const customer123Id = await ctx.db.insert("users", {
      username: "customer_123",
      email: "123@gmail.com",
      password: hashedPassword,
      nickname: "Customer 123",
      mobile_number: "+63 900 000 0007",
      role: "customer",
      is_active: true,
      skills: [],
      isVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    // ========================================================================
    // STEP 4: Create 6 Services
    // ========================================================================
    const svc1 = await ctx.db.insert("services", {
      branch_id: branchId,
      name: "Regular Haircut",
      description: "Classic haircut with clippers and scissors",
      price: 200,
      duration_minutes: 30,
      category: "Haircut",
      is_active: true,
      createdAt: now,
      updatedAt: now,
    });

    const svc2 = await ctx.db.insert("services", {
      branch_id: branchId,
      name: "Premium Haircut",
      description: "Premium haircut with styling and hot towel",
      price: 350,
      duration_minutes: 45,
      category: "Haircut",
      is_active: true,
      createdAt: now,
      updatedAt: now,
    });

    const svc3 = await ctx.db.insert("services", {
      branch_id: branchId,
      name: "Beard Trim",
      description: "Professional beard trimming and shaping",
      price: 150,
      duration_minutes: 20,
      category: "Other Services",
      is_active: true,
      createdAt: now,
      updatedAt: now,
    });

    const svc4 = await ctx.db.insert("services", {
      branch_id: branchId,
      name: "Hair + Beard Package",
      description: "Complete haircut and beard grooming package",
      price: 400,
      duration_minutes: 60,
      category: "Package",
      is_active: true,
      createdAt: now,
      updatedAt: now,
    });

    const svc5 = await ctx.db.insert("services", {
      branch_id: branchId,
      name: "Hair Color",
      description: "Full hair coloring service",
      price: 800,
      duration_minutes: 90,
      category: "Other Services",
      is_active: true,
      createdAt: now,
      updatedAt: now,
    });

    const svc6 = await ctx.db.insert("services", {
      branch_id: branchId,
      name: "Hot Towel Shave",
      description: "Traditional hot towel shave with straight razor",
      price: 250,
      duration_minutes: 30,
      category: "Other Services",
      is_active: true,
      createdAt: now,
      updatedAt: now,
    });

    // ========================================================================
    // STEP 5: Create 3 Barber Records
    // ========================================================================
    const weekdaySchedule = { available: true, start: "10:00", end: "20:00" };
    const sundaySchedule = { available: false, start: "10:00", end: "20:00" };
    const schedule = {
      monday: weekdaySchedule,
      tuesday: weekdaySchedule,
      wednesday: weekdaySchedule,
      thursday: weekdaySchedule,
      friday: weekdaySchedule,
      saturday: weekdaySchedule,
      sunday: sundaySchedule,
    };

    const allServiceIds = [svc1, svc2, svc3, svc4, svc5, svc6];

    const juanBarberId = await ctx.db.insert("barbers", {
      user: juanUserId,
      branch_id: branchId,
      full_name: "Juan dela Cruz",
      is_active: true,
      is_accepting_bookings: true,
      services: allServiceIds,
      email: "juan@tpx.com",
      phone: "+63 900 000 0003",
      bio: "Expert barber with 5 years of experience",
      experience: "5 years",
      rating: 4.8,
      totalBookings: 0,
      monthlyRevenue: 0,
      specialties: ["Fade", "Undercut", "Classic Cut"],
      schedule,
      createdAt: now,
      updatedAt: now,
    });

    const pedroBarberId = await ctx.db.insert("barbers", {
      user: pedroUserId,
      branch_id: branchId,
      full_name: "Pedro Santos",
      is_active: true,
      is_accepting_bookings: true,
      services: allServiceIds,
      email: "pedro@tpx.com",
      phone: "+63 900 000 0004",
      bio: "Skilled barber specializing in modern styles",
      experience: "3 years",
      rating: 4.5,
      totalBookings: 0,
      monthlyRevenue: 0,
      specialties: ["Pompadour", "Taper", "Beard Styling"],
      schedule,
      createdAt: now,
      updatedAt: now,
    });

    const mariaBarberId = await ctx.db.insert("barbers", {
      user: mariaUserId,
      branch_id: branchId,
      full_name: "Maria Garcia",
      is_active: true,
      is_accepting_bookings: true,
      services: allServiceIds,
      email: "maria@tpx.com",
      phone: "+63 900 000 0005",
      bio: "Creative stylist with expertise in color and treatment",
      experience: "4 years",
      rating: 4.9,
      totalBookings: 0,
      monthlyRevenue: 0,
      specialties: ["Hair Color", "Keratin Treatment", "Creative Cuts"],
      schedule,
      createdAt: now,
      updatedAt: now,
    });

    // ========================================================================
    // STEP 6: Create 4 Products
    // ========================================================================
    await ctx.db.insert("products", {
      branch_id: branchId,
      name: "Pomade",
      description: "Strong hold pomade for classic styles",
      price: 350,
      cost: 150,
      category: "hair-care",
      brand: "TPX Grooming",
      sku: "TPX-POM-001",
      stock: 20,
      minStock: 5,
      status: "active",
      soldThisMonth: 0,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("products", {
      branch_id: branchId,
      name: "Hair Wax",
      description: "Matte finish hair wax for textured looks",
      price: 300,
      cost: 120,
      category: "hair-care",
      brand: "TPX Grooming",
      sku: "TPX-WAX-001",
      stock: 15,
      minStock: 5,
      status: "active",
      soldThisMonth: 0,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("products", {
      branch_id: branchId,
      name: "Beard Oil",
      description: "Nourishing beard oil for healthy grooming",
      price: 250,
      cost: 100,
      category: "beard-care",
      brand: "TPX Grooming",
      sku: "TPX-OIL-001",
      stock: 25,
      minStock: 5,
      status: "active",
      soldThisMonth: 0,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("products", {
      branch_id: branchId,
      name: "Shampoo",
      description: "Anti-dandruff shampoo for daily use",
      price: 200,
      cost: 80,
      category: "hair-care",
      brand: "TPX Grooming",
      sku: "TPX-SHP-001",
      stock: 30,
      minStock: 10,
      status: "active",
      soldThisMonth: 0,
      createdAt: now,
      updatedAt: now,
    });

    // ========================================================================
    // STEP 7: Wallets & Points for Customers
    // ========================================================================
    const customerIds = [customerTestId, customer123Id];
    for (const customerId of customerIds) {
      await ctx.db.insert("wallets", {
        user_id: customerId,
        balance: 500,
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.insert("points_ledger", {
        user_id: customerId,
        current_balance: 10000, // 100.00 points in ×100 format
        lifetime_earned: 10000,
        lifetime_redeemed: 0,
        last_activity_at: now,
      });
    }

    // ========================================================================
    // STEP 8: 3 Sample Bookings (today)
    // ========================================================================
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    await ctx.db.insert("bookings", {
      booking_code: "TPX-DEV-001",
      branch_id: branchId,
      customer: customerTestId,
      service: svc1,
      barber: juanBarberId,
      date: today,
      time: "10:00",
      status: "pending",
      payment_status: "unpaid",
      price: 200,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("bookings", {
      booking_code: "TPX-DEV-002",
      branch_id: branchId,
      customer: customer123Id,
      service: svc2,
      barber: pedroBarberId,
      date: today,
      time: "11:00",
      status: "confirmed",
      payment_status: "unpaid",
      price: 350,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("bookings", {
      booking_code: "TPX-DEV-003",
      branch_id: branchId,
      customer: customerTestId,
      service: svc4,
      barber: mariaBarberId,
      date: today,
      time: "14:00",
      status: "completed",
      payment_status: "paid",
      price: 400,
      completed_at: now,
      createdAt: now,
      updatedAt: now,
    });

    // ========================================================================
    // Return summary
    // ========================================================================
    return {
      success: true,
      message: `Cleared ${totalDeleted} records. Dev seed data created successfully.`,
      data: {
        cleared: totalDeleted,
        branch: 1,
        users: 7,
        barbers: 3,
        services: 6,
        products: 4,
        wallets: 2,
        points_ledgers: 2,
        bookings: 3,
        credentials: {
          password: "TpxBarber2026!@#",
          users: [
            "super@tpx.com (super_admin)",
            "admin@tpxmain.com (branch_admin)",
            "juan@tpx.com (barber)",
            "pedro@tpx.com (barber)",
            "maria@tpx.com (barber)",
            "customer@example.com (customer)",
            "123@gmail.com (customer)",
          ],
        },
      },
    };
  },
});
