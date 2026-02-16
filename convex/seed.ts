import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { hashPassword } from "./utils/password";
import { encryptApiKey } from "./lib/encryption";

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
      "branch_wallets", "branch_wallet_transactions", "pendingBranchWalletTopups",
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

/**
 * Seed Wallet Config for Branch Wallet PayMongo Top-Up Testing
 *
 * Run via Convex dashboard or CLI:
 *   npx convex run seed:seedWalletConfig '{"public_key":"pk_test_xxx","secret_key":"sk_test_xxx","webhook_secret":"whsec_xxx"}'
 *
 * Required env var: PAYMONGO_ENCRYPTION_KEY (64 hex chars) must be set in Convex dashboard.
 *
 * This seeds the HQ-level walletConfig with PayMongo test credentials,
 * enabling the branch wallet online top-up flow.
 */
export const seedWalletConfig = mutation({
  args: {
    public_key: v.string(),
    secret_key: v.string(),
    webhook_secret: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate inputs
    if (!args.public_key || !args.secret_key || !args.webhook_secret) {
      return {
        success: false,
        message: "All three keys are required: public_key, secret_key, webhook_secret",
      };
    }

    // Get encryption key
    const encryptionKey = process.env.PAYMONGO_ENCRYPTION_KEY;
    if (!encryptionKey) {
      return {
        success: false,
        message: "PAYMONGO_ENCRYPTION_KEY env var is not set in Convex. Set it in the Convex dashboard under Settings > Environment Variables.",
      };
    }

    // Encrypt secret key and webhook secret
    const secretResult = await encryptApiKey(args.secret_key, encryptionKey);
    const webhookResult = await encryptApiKey(args.webhook_secret, encryptionKey);

    const secretKeyEncrypted = `${secretResult.iv}:${secretResult.encrypted}`;
    const webhookSecretEncrypted = `${webhookResult.iv}:${webhookResult.encrypted}`;

    const now = Date.now();

    // Check if walletConfig already exists (upsert)
    const existing = await ctx.db.query("walletConfig").first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        paymongo_public_key: args.public_key,
        paymongo_secret_key: secretKeyEncrypted,
        paymongo_webhook_secret: webhookSecretEncrypted,
        is_test_mode: true,
        default_commission_percent: 5,
        default_settlement_frequency: "weekly",
        min_settlement_amount: 500,
        bonus_tiers: [
          { minAmount: 500, bonus: 25 },
          { minAmount: 1000, bonus: 75 },
          { minAmount: 2500, bonus: 200 },
          { minAmount: 5000, bonus: 500 },
        ],
        monthly_bonus_cap: 0,
        updated_at: now,
      });

      return {
        success: true,
        message: "Wallet config updated with PayMongo test credentials.",
        config_id: existing._id,
        is_update: true,
        settings: {
          is_test_mode: true,
          commission: "5%",
          settlement_frequency: "weekly",
          min_settlement: "₱500",
        },
      };
    }

    // Create new
    const configId = await ctx.db.insert("walletConfig", {
      paymongo_public_key: args.public_key,
      paymongo_secret_key: secretKeyEncrypted,
      paymongo_webhook_secret: webhookSecretEncrypted,
      is_test_mode: true,
      default_commission_percent: 5,
      default_settlement_frequency: "weekly",
      min_settlement_amount: 500,
      bonus_tiers: [
        { minAmount: 500, bonus: 25 },
        { minAmount: 1000, bonus: 75 },
        { minAmount: 2500, bonus: 200 },
        { minAmount: 5000, bonus: 500 },
      ],
      monthly_bonus_cap: 0,
      created_at: now,
      updated_at: now,
    });

    return {
      success: true,
      message: "Wallet config seeded with PayMongo test credentials.",
      config_id: configId,
      is_update: false,
      settings: {
        is_test_mode: true,
        commission: "5%",
        settlement_frequency: "weekly",
        min_settlement: "₱500",
        bonus_tiers: "4 tiers (₱500/₱1000/₱2500/₱5000)",
      },
    };
  },
});

/**
 * Seed Product Catalog (Central Warehouse)
 *
 * Populates the HQ product catalog with barbershop products across all categories.
 * Branches can then order from this catalog.
 *
 * Run via: npx convex run seed:seedProductCatalog
 */
export const seedProductCatalog = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db.query("productCatalog").first();
    if (existing) {
      return { success: false, message: "Product catalog already has products. Clear first if you want to re-seed." };
    }

    // Find super admin as created_by
    const superAdmin = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "super_admin"))
      .first();

    if (!superAdmin) {
      return { success: false, message: "No super_admin user found. Run devSeed or seedAll first." };
    }

    const now = Date.now();

    const products = [
      // ── Hair Care ──
      {
        name: "TPX Strong Hold Pomade",
        description: "Water-based pomade with strong hold and high shine. Perfect for slicked-back and classic styles.",
        price: 350,
        cost: 140,
        category: "hair-care",
        brand: "TPX Grooming",
        sku: "TPX-POM-001",
        stock: 100,
        minStock: 15,
      },
      {
        name: "TPX Matte Clay",
        description: "Medium hold matte clay for textured, natural-looking styles. Easy to restyle throughout the day.",
        price: 380,
        cost: 150,
        category: "hair-care",
        brand: "TPX Grooming",
        sku: "TPX-CLY-001",
        stock: 80,
        minStock: 15,
      },
      {
        name: "TPX Hair Wax",
        description: "Flexible hold wax with matte finish. Ideal for messy, textured looks.",
        price: 300,
        cost: 120,
        category: "hair-care",
        brand: "TPX Grooming",
        sku: "TPX-WAX-001",
        stock: 90,
        minStock: 15,
      },
      {
        name: "TPX Sea Salt Spray",
        description: "Texturizing sea salt spray for beachy, tousled waves. Adds volume and grit.",
        price: 280,
        cost: 100,
        category: "hair-care",
        brand: "TPX Grooming",
        sku: "TPX-SSS-001",
        stock: 60,
        minStock: 10,
      },
      {
        name: "TPX Anti-Dandruff Shampoo",
        description: "Deep-cleansing anti-dandruff shampoo with tea tree oil. For daily use.",
        price: 250,
        cost: 90,
        category: "hair-care",
        brand: "TPX Grooming",
        sku: "TPX-SHP-001",
        stock: 120,
        minStock: 20,
      },
      {
        name: "TPX Moisturizing Conditioner",
        description: "Hydrating conditioner that softens and detangles. Works with all hair types.",
        price: 280,
        cost: 95,
        category: "hair-care",
        brand: "TPX Grooming",
        sku: "TPX-CND-001",
        stock: 100,
        minStock: 20,
      },
      {
        name: "TPX Hair Tonic",
        description: "Cooling hair tonic that promotes scalp health and adds shine. Menthol-infused.",
        price: 220,
        cost: 80,
        category: "hair-care",
        brand: "TPX Grooming",
        sku: "TPX-TNK-001",
        stock: 70,
        minStock: 10,
      },
      {
        name: "TPX Hair Spray Strong Hold",
        description: "All-day strong hold finishing spray. Humidity resistant, non-flaking formula.",
        price: 320,
        cost: 110,
        category: "hair-care",
        brand: "TPX Grooming",
        sku: "TPX-HSP-001",
        stock: 50,
        minStock: 10,
      },
      // ── Beard Care ──
      {
        name: "TPX Beard Oil - Classic",
        description: "Premium beard oil with jojoba and argan. Softens, conditions, and reduces itch.",
        price: 320,
        cost: 110,
        category: "beard-care",
        brand: "TPX Grooming",
        sku: "TPX-BOL-001",
        stock: 80,
        minStock: 15,
      },
      {
        name: "TPX Beard Oil - Sandalwood",
        description: "Sandalwood-scented beard oil. Rich, warm fragrance with deep conditioning.",
        price: 350,
        cost: 120,
        category: "beard-care",
        brand: "TPX Grooming",
        sku: "TPX-BOL-002",
        stock: 60,
        minStock: 10,
      },
      {
        name: "TPX Beard Balm",
        description: "Leave-in beard balm for shaping and conditioning. Light hold with shea butter.",
        price: 380,
        cost: 130,
        category: "beard-care",
        brand: "TPX Grooming",
        sku: "TPX-BBM-001",
        stock: 50,
        minStock: 10,
      },
      {
        name: "TPX Beard Wash",
        description: "Gentle beard shampoo that cleans without stripping natural oils. Sulfate-free.",
        price: 280,
        cost: 95,
        category: "beard-care",
        brand: "TPX Grooming",
        sku: "TPX-BWS-001",
        stock: 70,
        minStock: 15,
      },
      {
        name: "TPX Mustache Wax",
        description: "Strong hold mustache wax for precise styling. Beeswax-based, long-lasting.",
        price: 200,
        cost: 70,
        category: "beard-care",
        brand: "TPX Grooming",
        sku: "TPX-MWX-001",
        stock: 40,
        minStock: 10,
      },
      // ── Shaving ──
      {
        name: "TPX Shaving Cream - Classic",
        description: "Rich lathering shaving cream with aloe vera. Provides smooth, irritation-free shave.",
        price: 250,
        cost: 85,
        category: "shaving",
        brand: "TPX Grooming",
        sku: "TPX-SHC-001",
        stock: 80,
        minStock: 15,
      },
      {
        name: "TPX Pre-Shave Oil",
        description: "Prep oil that softens stubble and protects skin. Apply before shaving cream.",
        price: 300,
        cost: 100,
        category: "shaving",
        brand: "TPX Grooming",
        sku: "TPX-PSO-001",
        stock: 50,
        minStock: 10,
      },
      {
        name: "TPX After-Shave Balm",
        description: "Soothing alcohol-free after-shave balm. Calms irritation and moisturizes.",
        price: 280,
        cost: 90,
        category: "shaving",
        brand: "TPX Grooming",
        sku: "TPX-ASB-001",
        stock: 60,
        minStock: 10,
      },
      {
        name: "TPX Alum Block",
        description: "Natural alum block for post-shave treatment. Antiseptic and astringent.",
        price: 150,
        cost: 40,
        category: "shaving",
        brand: "TPX Grooming",
        sku: "TPX-ALM-001",
        stock: 40,
        minStock: 10,
      },
      {
        name: "TPX Styptic Pencil",
        description: "Quick-stop styptic pencil for minor nicks and cuts. Essential barbershop supply.",
        price: 80,
        cost: 25,
        category: "shaving",
        brand: "TPX Grooming",
        sku: "TPX-STP-001",
        stock: 100,
        minStock: 20,
      },
      // ── Tools ──
      {
        name: "TPX Professional Comb Set",
        description: "Set of 3 professional barber combs: wide-tooth, fine-tooth, and taper comb.",
        price: 450,
        cost: 180,
        category: "tools",
        brand: "TPX Grooming",
        sku: "TPX-CMB-001",
        stock: 30,
        minStock: 8,
      },
      {
        name: "TPX Neck Brush",
        description: "Soft bristle neck brush for clean finishing after haircuts.",
        price: 280,
        cost: 100,
        category: "tools",
        brand: "TPX Grooming",
        sku: "TPX-NBR-001",
        stock: 25,
        minStock: 5,
      },
      {
        name: "TPX Barber Cape - Black",
        description: "Professional water-resistant barber cape. Snap closure, one size fits all.",
        price: 500,
        cost: 200,
        category: "tools",
        brand: "TPX Grooming",
        sku: "TPX-CAP-001",
        stock: 20,
        minStock: 5,
      },
      {
        name: "TPX Spray Bottle 300ml",
        description: "Fine mist spray bottle for wetting hair during cuts. Continuous spray action.",
        price: 180,
        cost: 60,
        category: "tools",
        brand: "TPX Grooming",
        sku: "TPX-SPB-001",
        stock: 40,
        minStock: 10,
      },
      // ── Accessories ──
      {
        name: "TPX Branded T-Shirt",
        description: "Premium cotton TPX branded t-shirt. Available for retail and staff uniform.",
        price: 650,
        cost: 250,
        category: "accessories",
        brand: "TPX Grooming",
        sku: "TPX-TSH-001",
        stock: 50,
        minStock: 10,
      },
      {
        name: "TPX Branded Cap",
        description: "Snapback cap with embroidered TPX logo. One size fits most.",
        price: 450,
        cost: 170,
        category: "accessories",
        brand: "TPX Grooming",
        sku: "TPX-HCP-001",
        stock: 40,
        minStock: 8,
      },
      {
        name: "TPX Grooming Kit Pouch",
        description: "Canvas grooming kit pouch. Holds pomade, comb, and beard oil. Great gift item.",
        price: 380,
        cost: 140,
        category: "accessories",
        brand: "TPX Grooming",
        sku: "TPX-PCH-001",
        stock: 30,
        minStock: 5,
      },
      {
        name: "TPX Air Freshener - Barbershop",
        description: "Signature barbershop scent car/room air freshener. Classic barbershop fragrance.",
        price: 120,
        cost: 35,
        category: "accessories",
        brand: "TPX Grooming",
        sku: "TPX-AFR-001",
        stock: 100,
        minStock: 20,
      },
    ];

    let count = 0;
    for (const product of products) {
      await ctx.db.insert("productCatalog", {
        name: product.name,
        description: product.description,
        price: product.price,
        cost: product.cost,
        category: product.category,
        brand: product.brand,
        sku: product.sku,
        stock: product.stock,
        minStock: product.minStock,
        is_active: true,
        price_enforced: false,
        created_at: now,
        created_by: superAdmin._id,
      });
      count++;
    }

    return {
      success: true,
      message: `Seeded ${count} products in the central catalog.`,
      data: {
        total: count,
        categories: {
          "hair-care": 8,
          "beard-care": 5,
          "shaving": 5,
          "tools": 4,
          "accessories": 4,
        },
      },
    };
  },
});

/**
 * Seed Default Services (Templates for New Branches)
 *
 * Populates the defaultServices table so new branches auto-load these services.
 * Same data as defaultServices.ts seedDefaultServices but accessible from seed.ts.
 *
 * Run via: npx convex run seed:seedDefaultServices
 */
export const seedDefaultServices = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db.query("defaultServices").first();
    if (existing) {
      return { success: false, message: "Default services already exist. Clear first if you want to re-seed." };
    }

    const now = Date.now();

    const defaults = [
      { name: "Tipuno X Classico", description: "Consultation, Haircut", duration_minutes: 30, price: 150, category: "haircut" },
      { name: "Tipuno X Signature", description: "Consultation, Haircut, Rinse Hot and Cold Towel Finish", duration_minutes: 60, price: 500, category: "haircut" },
      { name: "Tipuno X Deluxe", description: "Consultation, Haircut, Hair Spa Treatment, Rinse Hot and Cold Towel Finish", duration_minutes: 90, price: 800, category: "premium-package" },
      { name: "Beard Shave/Shaping/Sculpting", description: "More than a shave. It's a service you'll feel.", duration_minutes: 30, price: 200, category: "beard-care" },
      { name: "FACVNDO ELITE BARBERING SERVICE", description: "If you are looking for wedding haircuts, trust the elite hands that turn grooms into legends.", duration_minutes: 0, price: 10000, category: "premium-package" },
      { name: "Package 1", description: "Consultation, Haircut, Shaving, Styling", duration_minutes: 45, price: 500, category: "premium-package" },
      { name: "Package 2", description: "Consultation, Haircut, Hair Color or With Single Bleach, Rinse, Styling.\nNote: Short hair only, add 250 per length", duration_minutes: 60, price: 850, category: "premium-package" },
      { name: "Package 3", description: "Consultation, Haircut, Hair Color or With Single Bleach, Hair Spa Treatment, Rinse, Styling.\nNote: Short hair only, add 250 per length", duration_minutes: 60, price: 1400, category: "premium-package" },
      { name: "Mustache/Beard Trim", description: "Precision mustache and beard trimming.", duration_minutes: 30, price: 170, category: "beard-care" },
      { name: "Hair Spa", description: "Deep conditioning hair spa treatment for damaged hair.", duration_minutes: 30, price: 600, category: "hair-treatment" },
      { name: "Hair and Scalp Treatment", description: "Intensive hair and scalp treatment for healthy growth.", duration_minutes: 60, price: 1500, category: "hair-treatment" },
      { name: "Hair Color", description: "Full hair coloring service with premium dye.", duration_minutes: 60, price: 800, category: "hair-styling" },
      { name: "Perm", description: "Professional perming service for curls and waves.", duration_minutes: 60, price: 1500, category: "hair-styling" },
      { name: "Hair Tattoo", description: "Creative hair tattoo / hair art design.", duration_minutes: 60, price: 100, category: "hair-styling" },
    ];

    for (let i = 0; i < defaults.length; i++) {
      await ctx.db.insert("defaultServices", {
        ...defaults[i],
        is_active: true,
        sort_order: i,
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      success: true,
      message: `Seeded ${defaults.length} default services.`,
      data: {
        total: defaults.length,
        categories: {
          haircut: 2,
          "premium-package": 4,
          "beard-care": 2,
          "hair-treatment": 2,
          "hair-styling": 3,
          "elite": 1,
        },
      },
    };
  },
});
