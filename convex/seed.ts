import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Seed data for testing the application
 * Run via Convex dashboard or CLI: npx convex run seed:seedAll
 */

// Philippines timezone offset: UTC+8
const PHT_OFFSET_MS = 8 * 60 * 60 * 1000;

/**
 * Get timestamp for a specific PHT time today or days ago
 */
function getPHTTimestamp(hoursAgo: number, daysAgo: number = 0): number {
  const now = Date.now();
  return now - (daysAgo * 24 * 60 * 60 * 1000) - (hoursAgo * 60 * 60 * 1000);
}

/**
 * Get start of day in PHT
 */
function getStartOfDayPHT(daysAgo: number = 0): number {
  const now = new Date();
  const phtNow = new Date(now.getTime() + PHT_OFFSET_MS);
  const startOfDayPHT = new Date(
    Date.UTC(
      phtNow.getUTCFullYear(),
      phtNow.getUTCMonth(),
      phtNow.getUTCDate() - daysAgo,
      0, 0, 0, 0
    )
  );
  return startOfDayPHT.getTime() - PHT_OFFSET_MS;
}

/**
 * Seed all tables with test data
 */
export const seedAll = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Check if branch already exists
    const existingBranches = await ctx.db.query("branches").collect();
    let branch1Id, branch2Id;

    if (existingBranches.length === 0) {
      // Create branches
      branch1Id = await ctx.db.insert("branches", {
        branch_code: "TPX-001",
        name: "TPX Main Branch",
        address: "123 Main Street, Manila, Philippines",
        phone: "+63 912 345 6789",
        email: "main@tpxbarbershop.com",
        is_active: true,
        enable_booking_fee: true,
        booking_fee_amount: 50,
        booking_fee_type: "fixed",
        booking_start_hour: 9,
        booking_end_hour: 21,
        createdAt: now,
        updatedAt: now,
      });

      branch2Id = await ctx.db.insert("branches", {
        branch_code: "TPX-002",
        name: "TPX Makati Branch",
        address: "456 Ayala Ave, Makati City, Philippines",
        phone: "+63 912 987 6543",
        email: "makati@tpxbarbershop.com",
        is_active: true,
        enable_booking_fee: false,
        booking_start_hour: 10,
        booking_end_hour: 20,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      branch1Id = existingBranches[0]._id;
      branch2Id = existingBranches[1]?._id || existingBranches[0]._id;
    }

    // Check if services already exist
    const existingServices = await ctx.db.query("services").collect();
    let service1Id, service2Id, service3Id;

    if (existingServices.length === 0) {
      // Create services for branch 1
      service1Id = await ctx.db.insert("services", {
        branch_id: branch1Id,
        name: "Classic Haircut",
        description: "Traditional barbershop haircut with styling",
        price: 250,
        duration_minutes: 30,
        category: "haircut",
        is_active: true,
        createdAt: now,
        updatedAt: now,
      });

      service2Id = await ctx.db.insert("services", {
        branch_id: branch1Id,
        name: "Beard Trim",
        description: "Professional beard trimming and shaping",
        price: 150,
        duration_minutes: 20,
        category: "beard",
        is_active: true,
        createdAt: now,
        updatedAt: now,
      });

      service3Id = await ctx.db.insert("services", {
        branch_id: branch1Id,
        name: "Hair + Beard Combo",
        description: "Full haircut with beard grooming",
        price: 350,
        duration_minutes: 45,
        category: "combo",
        is_active: true,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      service1Id = existingServices[0]._id;
      service2Id = existingServices[1]?._id || existingServices[0]._id;
      service3Id = existingServices[2]?._id || existingServices[0]._id;
    }

    // Check if users already exist
    const existingUsers = await ctx.db.query("users").collect();

    if (existingUsers.length === 0) {
      // Create branch admin user
      const branchAdminId = await ctx.db.insert("users", {
        username: "branchadmin1",
        email: "admin@tpxmain.com",
        password: "password123", // In production, use hashed passwords
        nickname: "Admin",
        mobile_number: "+63 912 111 1111",
        role: "branch_admin",
        branch_id: branch1Id,
        is_active: true,
        skills: [],
        isVerified: true,
        createdAt: now,
        updatedAt: now,
      });

      // Create super admin
      await ctx.db.insert("users", {
        username: "superadmin",
        email: "super@tpx.com",
        password: "password123",
        nickname: "Super Admin",
        mobile_number: "+63 912 000 0000",
        role: "super_admin",
        is_active: true,
        skills: [],
        isVerified: true,
        createdAt: now,
        updatedAt: now,
      });

      // Create barber users
      const barberUser1Id = await ctx.db.insert("users", {
        username: "juan_barber",
        email: "juan@tpx.com",
        password: "password123",
        nickname: "Juan",
        mobile_number: "+63 912 222 2222",
        role: "barber",
        branch_id: branch1Id,
        is_active: true,
        skills: ["haircut", "beard"],
        isVerified: true,
        createdAt: now,
        updatedAt: now,
      });

      const barberUser2Id = await ctx.db.insert("users", {
        username: "pedro_barber",
        email: "pedro@tpx.com",
        password: "password123",
        nickname: "Pedro",
        mobile_number: "+63 912 333 3333",
        role: "barber",
        branch_id: branch1Id,
        is_active: true,
        skills: ["haircut", "styling"],
        isVerified: true,
        createdAt: now,
        updatedAt: now,
      });

      const barberUser3Id = await ctx.db.insert("users", {
        username: "maria_barber",
        email: "maria@tpx.com",
        password: "password123",
        nickname: "Maria",
        mobile_number: "+63 912 444 4444",
        role: "barber",
        branch_id: branch1Id,
        is_active: true,
        skills: ["haircut", "coloring"],
        isVerified: true,
        createdAt: now,
        updatedAt: now,
      });

      // Default schedule object
      const defaultSchedule = {
        monday: { available: true, start: "09:00", end: "18:00" },
        tuesday: { available: true, start: "09:00", end: "18:00" },
        wednesday: { available: true, start: "09:00", end: "18:00" },
        thursday: { available: true, start: "09:00", end: "18:00" },
        friday: { available: true, start: "09:00", end: "18:00" },
        saturday: { available: true, start: "10:00", end: "17:00" },
        sunday: { available: false, start: "00:00", end: "00:00" },
      };

      // Create barber profiles
      const barber1Id = await ctx.db.insert("barbers", {
        user: barberUser1Id,
        branch_id: branch1Id,
        full_name: "Juan dela Cruz",
        is_active: true,
        is_accepting_bookings: true,
        services: [service1Id, service2Id, service3Id],
        email: "juan@tpx.com",
        phone: "+63 912 222 2222",
        bio: "5 years experience in classic and modern cuts",
        experience: "5 years",
        rating: 4.8,
        totalBookings: 150,
        monthlyRevenue: 45000,
        specialties: ["Classic Cuts", "Fades"],
        schedule: defaultSchedule,
        createdAt: now,
        updatedAt: now,
      });

      const barber2Id = await ctx.db.insert("barbers", {
        user: barberUser2Id,
        branch_id: branch1Id,
        full_name: "Pedro Santos",
        is_active: true,
        is_accepting_bookings: true,
        services: [service1Id, service3Id],
        email: "pedro@tpx.com",
        phone: "+63 912 333 3333",
        bio: "Specialist in modern styles and fades",
        experience: "3 years",
        rating: 4.6,
        totalBookings: 98,
        monthlyRevenue: 32000,
        specialties: ["Modern Styles", "Skin Fades"],
        schedule: defaultSchedule,
        createdAt: now,
        updatedAt: now,
      });

      const barber3Id = await ctx.db.insert("barbers", {
        user: barberUser3Id,
        branch_id: branch1Id,
        full_name: "Maria Garcia",
        is_active: true,
        is_accepting_bookings: true,
        services: [service1Id, service2Id],
        email: "maria@tpx.com",
        phone: "+63 912 444 4444",
        bio: "Expert in precision cuts and coloring",
        experience: "4 years",
        rating: 4.9,
        totalBookings: 120,
        monthlyRevenue: 38000,
        specialties: ["Precision Cuts", "Hair Coloring"],
        schedule: defaultSchedule,
        createdAt: now,
        updatedAt: now,
      });

      // Seed time attendance records
      // Juan - Currently clocked in (since 9:00 AM today)
      await ctx.db.insert("timeAttendance", {
        barber_id: barber1Id,
        branch_id: branch1Id,
        clock_in: getStartOfDayPHT() + (9 * 60 * 60 * 1000), // 9:00 AM PHT today
        clock_out: undefined,
        created_at: now,
      });

      // Pedro - Completed shift today (10:00 AM - 6:00 PM)
      await ctx.db.insert("timeAttendance", {
        barber_id: barber2Id,
        branch_id: branch1Id,
        clock_in: getStartOfDayPHT() + (10 * 60 * 60 * 1000), // 10:00 AM
        clock_out: getStartOfDayPHT() + (18 * 60 * 60 * 1000), // 6:00 PM
        created_at: now,
      });

      // Maria - Currently clocked in (since 10:30 AM today)
      await ctx.db.insert("timeAttendance", {
        barber_id: barber3Id,
        branch_id: branch1Id,
        clock_in: getStartOfDayPHT() + (10.5 * 60 * 60 * 1000), // 10:30 AM PHT today
        clock_out: undefined,
        created_at: now,
      });

      // Yesterday's attendance
      await ctx.db.insert("timeAttendance", {
        barber_id: barber1Id,
        branch_id: branch1Id,
        clock_in: getStartOfDayPHT(1) + (9 * 60 * 60 * 1000), // 9:00 AM yesterday
        clock_out: getStartOfDayPHT(1) + (17 * 60 * 60 * 1000), // 5:00 PM yesterday
        created_at: now - (24 * 60 * 60 * 1000),
      });

      await ctx.db.insert("timeAttendance", {
        barber_id: barber2Id,
        branch_id: branch1Id,
        clock_in: getStartOfDayPHT(1) + (10 * 60 * 60 * 1000), // 10:00 AM yesterday
        clock_out: getStartOfDayPHT(1) + (18 * 60 * 60 * 1000), // 6:00 PM yesterday
        created_at: now - (24 * 60 * 60 * 1000),
      });

      await ctx.db.insert("timeAttendance", {
        barber_id: barber3Id,
        branch_id: branch1Id,
        clock_in: getStartOfDayPHT(1) + (11 * 60 * 60 * 1000), // 11:00 AM yesterday
        clock_out: getStartOfDayPHT(1) + (19 * 60 * 60 * 1000), // 7:00 PM yesterday
        created_at: now - (24 * 60 * 60 * 1000),
      });

      // 2 days ago attendance
      await ctx.db.insert("timeAttendance", {
        barber_id: barber1Id,
        branch_id: branch1Id,
        clock_in: getStartOfDayPHT(2) + (8 * 60 * 60 * 1000), // 8:00 AM
        clock_out: getStartOfDayPHT(2) + (16 * 60 * 60 * 1000), // 4:00 PM
        created_at: now - (2 * 24 * 60 * 60 * 1000),
      });

      await ctx.db.insert("timeAttendance", {
        barber_id: barber2Id,
        branch_id: branch1Id,
        clock_in: getStartOfDayPHT(2) + (9 * 60 * 60 * 1000), // 9:00 AM
        clock_out: getStartOfDayPHT(2) + (17 * 60 * 60 * 1000), // 5:00 PM
        created_at: now - (2 * 24 * 60 * 60 * 1000),
      });

      // 3 days ago attendance (only Juan and Maria)
      await ctx.db.insert("timeAttendance", {
        barber_id: barber1Id,
        branch_id: branch1Id,
        clock_in: getStartOfDayPHT(3) + (9 * 60 * 60 * 1000), // 9:00 AM
        clock_out: getStartOfDayPHT(3) + (18 * 60 * 60 * 1000), // 6:00 PM
        created_at: now - (3 * 24 * 60 * 60 * 1000),
      });

      await ctx.db.insert("timeAttendance", {
        barber_id: barber3Id,
        branch_id: branch1Id,
        clock_in: getStartOfDayPHT(3) + (10 * 60 * 60 * 1000), // 10:00 AM
        clock_out: getStartOfDayPHT(3) + (17 * 60 * 60 * 1000), // 5:00 PM
        created_at: now - (3 * 24 * 60 * 60 * 1000),
      });

      // Create a customer user with wallet and points
      const customerId = await ctx.db.insert("users", {
        username: "customer1",
        email: "customer@example.com",
        password: "password123",
        nickname: "Test Customer",
        mobile_number: "+63 912 555 5555",
        role: "customer",
        is_active: true,
        skills: [],
        isVerified: true,
        createdAt: now,
        updatedAt: now,
      });

      // Create wallet with ₱750 balance (₱500 real + ₱250 bonus)
      await ctx.db.insert("wallets", {
        user_id: customerId,
        balance: 75000, // ₱750.00 in centavos
        bonus_balance: 25000, // ₱250.00 bonus from top-ups
        currency: "PHP",
        createdAt: now,
        updatedAt: now,
      });

      // Create points ledger - 7500 points (integer ×100 format = 750000)
      // This puts customer at Silver tier (threshold: 5000 points = 500000)
      await ctx.db.insert("points_ledger", {
        user_id: customerId,
        current_balance: 750000, // 7500.00 points available
        lifetime_earned: 850000, // 8500.00 points total earned
        lifetime_redeemed: 100000, // 1000.00 points redeemed
        last_activity_at: now,
      });

      // Add some points transaction history
      await ctx.db.insert("points_transactions", {
        user_id: customerId,
        type: "earn",
        amount: 500000, // 5000 points
        balance_after: 500000,
        source_type: "payment",
        source_id: "initial-service-payment",
        notes: "Points from service payment",
        created_at: now - (7 * 24 * 60 * 60 * 1000), // 7 days ago
      });

      await ctx.db.insert("points_transactions", {
        user_id: customerId,
        type: "earn",
        amount: 250000, // 2500 points
        balance_after: 750000,
        source_type: "wallet_payment",
        source_id: "wallet-payment-1",
        notes: "Bonus points from wallet payment (1.5x)",
        created_at: now - (3 * 24 * 60 * 60 * 1000), // 3 days ago
      });

      await ctx.db.insert("points_transactions", {
        user_id: customerId,
        type: "earn",
        amount: 100000, // 1000 points
        balance_after: 850000,
        source_type: "top_up_bonus",
        source_id: "topup-bonus-1",
        notes: "Bonus points from wallet top-up",
        created_at: now - (1 * 24 * 60 * 60 * 1000), // 1 day ago
      });

      await ctx.db.insert("points_transactions", {
        user_id: customerId,
        type: "redeem",
        amount: -100000, // -1000 points
        balance_after: 750000,
        source_type: "redemption",
        source_id: "reward-redemption-1",
        notes: "Redeemed for free haircut",
        created_at: now - (12 * 60 * 60 * 1000), // 12 hours ago
      });

      // Create wallet transaction history
      await ctx.db.insert("wallet_transactions", {
        user_id: customerId,
        type: "topup",
        amount: 50000, // ₱500.00 top-up
        status: "completed",
        reference_id: "TOPUP-001",
        description: "GCash top-up with ₱50 bonus",
        createdAt: now - (5 * 24 * 60 * 60 * 1000), // 5 days ago
      });

      await ctx.db.insert("wallet_transactions", {
        user_id: customerId,
        type: "topup",
        amount: 30000, // ₱300.00 top-up
        status: "completed",
        reference_id: "TOPUP-002",
        description: "Maya top-up",
        createdAt: now - (2 * 24 * 60 * 60 * 1000), // 2 days ago
      });

      await ctx.db.insert("wallet_transactions", {
        user_id: customerId,
        type: "payment",
        amount: -5000, // ₱50.00 payment
        status: "completed",
        reference_id: "PAY-001",
        description: "Haircut service payment",
        createdAt: now - (1 * 24 * 60 * 60 * 1000), // 1 day ago
      });

      return {
        success: true,
        message: "Seed data created successfully",
        data: {
          branches: 2,
          services: 3,
          users: 6,
          barbers: 3,
          timeAttendanceRecords: 10,
          customer: {
            email: "customer@example.com",
            password: "password123",
            wallet_balance: "₱750.00",
            points_balance: "7,500 pts",
            tier: "Silver (8,500 lifetime pts)",
          },
        },
      };
    }

    return {
      success: false,
      message: "Data already exists. Use clearAndSeed to reset.",
    };
  },
});

/**
 * Clear all seeded data and re-seed
 */
export const clearAndSeed = mutation({
  args: {},
  handler: async (ctx) => {
    // Clear bookings first (has references to other tables)
    const bookings = await ctx.db.query("bookings").collect();
    for (const booking of bookings) {
      await ctx.db.delete(booking._id);
    }

    // Clear payment audit logs
    const auditLogs = await ctx.db.query("paymentAuditLog").collect();
    for (const log of auditLogs) {
      await ctx.db.delete(log._id);
    }

    // Clear pending payments
    const pendingPayments = await ctx.db.query("pendingPayments").collect();
    for (const payment of pendingPayments) {
      await ctx.db.delete(payment._id);
    }

    // Clear transactions
    const transactions = await ctx.db.query("transactions").collect();
    for (const transaction of transactions) {
      await ctx.db.delete(transaction._id);
    }

    // Clear branch payment config
    const paymentConfigs = await ctx.db.query("branchPaymentConfig").collect();
    for (const config of paymentConfigs) {
      await ctx.db.delete(config._id);
    }

    // Clear royalty configs
    const royaltyConfigs = await ctx.db.query("royaltyConfig").collect();
    for (const config of royaltyConfigs) {
      await ctx.db.delete(config._id);
    }

    // Clear royalty payments
    const royaltyPayments = await ctx.db.query("royaltyPayments").collect();
    for (const payment of royaltyPayments) {
      await ctx.db.delete(payment._id);
    }

    // Clear official receipts
    const receipts = await ctx.db.query("officialReceipts").collect();
    for (const receipt of receipts) {
      await ctx.db.delete(receipt._id);
    }

    // Clear cash advances
    const cashAdvances = await ctx.db.query("cashAdvances").collect();
    for (const advance of cashAdvances) {
      await ctx.db.delete(advance._id);
    }

    // Clear expenses
    const expenses = await ctx.db.query("expenses").collect();
    for (const expense of expenses) {
      await ctx.db.delete(expense._id);
    }

    // Clear timeAttendance records
    const attendanceRecords = await ctx.db.query("timeAttendance").collect();
    for (const record of attendanceRecords) {
      await ctx.db.delete(record._id);
    }

    // Clear wallets
    const wallets = await ctx.db.query("wallets").collect();
    for (const wallet of wallets) {
      await ctx.db.delete(wallet._id);
    }

    // Clear wallet transactions
    const walletTxns = await ctx.db.query("wallet_transactions").collect();
    for (const txn of walletTxns) {
      await ctx.db.delete(txn._id);
    }

    // Clear points ledger
    const pointsLedgers = await ctx.db.query("points_ledger").collect();
    for (const ledger of pointsLedgers) {
      await ctx.db.delete(ledger._id);
    }

    // Clear points transactions
    const pointsTxns = await ctx.db.query("points_transactions").collect();
    for (const txn of pointsTxns) {
      await ctx.db.delete(txn._id);
    }

    // Clear barbers
    const barbers = await ctx.db.query("barbers").collect();
    for (const barber of barbers) {
      await ctx.db.delete(barber._id);
    }

    // Clear users (except keep super_admin if needed)
    const users = await ctx.db.query("users").collect();
    for (const user of users) {
      await ctx.db.delete(user._id);
    }

    // Clear services
    const services = await ctx.db.query("services").collect();
    for (const service of services) {
      await ctx.db.delete(service._id);
    }

    // Clear branches
    const branches = await ctx.db.query("branches").collect();
    for (const branch of branches) {
      await ctx.db.delete(branch._id);
    }

    // Now seed fresh data
    const now = Date.now();

    // Create branches
    const branch1Id = await ctx.db.insert("branches", {
      branch_code: "TPX-001",
      name: "TPX Main Branch",
      address: "123 Main Street, Manila, Philippines",
      phone: "+63 912 345 6789",
      email: "main@tpxbarbershop.com",
      is_active: true,
      enable_booking_fee: true,
      booking_fee_amount: 50,
      booking_fee_type: "fixed",
      booking_start_hour: 9,
      booking_end_hour: 21,
      createdAt: now,
      updatedAt: now,
    });

    const branch2Id = await ctx.db.insert("branches", {
      branch_code: "TPX-002",
      name: "TPX Makati Branch",
      address: "456 Ayala Ave, Makati City, Philippines",
      phone: "+63 912 987 6543",
      email: "makati@tpxbarbershop.com",
      is_active: true,
      enable_booking_fee: false,
      booking_start_hour: 10,
      booking_end_hour: 20,
      createdAt: now,
      updatedAt: now,
    });

    // Create services
    const service1Id = await ctx.db.insert("services", {
      branch_id: branch1Id,
      name: "Classic Haircut",
      description: "Traditional barbershop haircut with styling",
      price: 250,
      duration_minutes: 30,
      category: "haircut",
      is_active: true,
      createdAt: now,
      updatedAt: now,
    });

    const service2Id = await ctx.db.insert("services", {
      branch_id: branch1Id,
      name: "Beard Trim",
      description: "Professional beard trimming and shaping",
      price: 150,
      duration_minutes: 20,
      category: "beard",
      is_active: true,
      createdAt: now,
      updatedAt: now,
    });

    const service3Id = await ctx.db.insert("services", {
      branch_id: branch1Id,
      name: "Hair + Beard Combo",
      description: "Full haircut with beard grooming",
      price: 350,
      duration_minutes: 45,
      category: "combo",
      is_active: true,
      createdAt: now,
      updatedAt: now,
    });

    // Create branch admin
    await ctx.db.insert("users", {
      username: "branchadmin1",
      email: "admin@tpxmain.com",
      password: "password123",
      nickname: "Admin",
      mobile_number: "+63 912 111 1111",
      role: "branch_admin",
      branch_id: branch1Id,
      is_active: true,
      skills: [],
      isVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    // Create super admin
    await ctx.db.insert("users", {
      username: "superadmin",
      email: "super@tpx.com",
      password: "password123",
      nickname: "Super Admin",
      mobile_number: "+63 912 000 0000",
      role: "super_admin",
      is_active: true,
      skills: [],
      isVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    // Create barber users and profiles
    const defaultSchedule = {
      monday: { available: true, start: "09:00", end: "18:00" },
      tuesday: { available: true, start: "09:00", end: "18:00" },
      wednesday: { available: true, start: "09:00", end: "18:00" },
      thursday: { available: true, start: "09:00", end: "18:00" },
      friday: { available: true, start: "09:00", end: "18:00" },
      saturday: { available: true, start: "10:00", end: "17:00" },
      sunday: { available: false, start: "00:00", end: "00:00" },
    };

    const barberUser1Id = await ctx.db.insert("users", {
      username: "juan_barber",
      email: "juan@tpx.com",
      password: "password123",
      nickname: "Juan",
      mobile_number: "+63 912 222 2222",
      role: "barber",
      branch_id: branch1Id,
      is_active: true,
      skills: ["haircut", "beard"],
      isVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    const barber1Id = await ctx.db.insert("barbers", {
      user: barberUser1Id,
      branch_id: branch1Id,
      full_name: "Juan dela Cruz",
      is_active: true,
      is_accepting_bookings: true,
      services: [service1Id, service2Id, service3Id],
      email: "juan@tpx.com",
      phone: "+63 912 222 2222",
      bio: "5 years experience in classic and modern cuts",
      experience: "5 years",
      rating: 4.8,
      totalBookings: 150,
      monthlyRevenue: 45000,
      specialties: ["Classic Cuts", "Fades"],
      schedule: defaultSchedule,
      createdAt: now,
      updatedAt: now,
    });

    const barberUser2Id = await ctx.db.insert("users", {
      username: "pedro_barber",
      email: "pedro@tpx.com",
      password: "password123",
      nickname: "Pedro",
      mobile_number: "+63 912 333 3333",
      role: "barber",
      branch_id: branch1Id,
      is_active: true,
      skills: ["haircut", "styling"],
      isVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    const barber2Id = await ctx.db.insert("barbers", {
      user: barberUser2Id,
      branch_id: branch1Id,
      full_name: "Pedro Santos",
      is_active: true,
      is_accepting_bookings: true,
      services: [service1Id, service3Id],
      email: "pedro@tpx.com",
      phone: "+63 912 333 3333",
      bio: "Specialist in modern styles and fades",
      experience: "3 years",
      rating: 4.6,
      totalBookings: 98,
      monthlyRevenue: 32000,
      specialties: ["Modern Styles", "Skin Fades"],
      schedule: defaultSchedule,
      createdAt: now,
      updatedAt: now,
    });

    const barberUser3Id = await ctx.db.insert("users", {
      username: "maria_barber",
      email: "maria@tpx.com",
      password: "password123",
      nickname: "Maria",
      mobile_number: "+63 912 444 4444",
      role: "barber",
      branch_id: branch1Id,
      is_active: true,
      skills: ["haircut", "coloring"],
      isVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    const barber3Id = await ctx.db.insert("barbers", {
      user: barberUser3Id,
      branch_id: branch1Id,
      full_name: "Maria Garcia",
      is_active: true,
      is_accepting_bookings: true,
      services: [service1Id, service2Id],
      email: "maria@tpx.com",
      phone: "+63 912 444 4444",
      bio: "Expert in precision cuts and coloring",
      experience: "4 years",
      rating: 4.9,
      totalBookings: 120,
      monthlyRevenue: 38000,
      specialties: ["Precision Cuts", "Hair Coloring"],
      schedule: defaultSchedule,
      createdAt: now,
      updatedAt: now,
    });

    // Seed attendance records
    // Juan - Currently clocked in
    await ctx.db.insert("timeAttendance", {
      barber_id: barber1Id,
      branch_id: branch1Id,
      clock_in: getStartOfDayPHT() + (9 * 60 * 60 * 1000),
      clock_out: undefined,
      created_at: now,
    });

    // Pedro - Completed shift today
    await ctx.db.insert("timeAttendance", {
      barber_id: barber2Id,
      branch_id: branch1Id,
      clock_in: getStartOfDayPHT() + (10 * 60 * 60 * 1000),
      clock_out: getStartOfDayPHT() + (18 * 60 * 60 * 1000),
      created_at: now,
    });

    // Maria - Currently clocked in
    await ctx.db.insert("timeAttendance", {
      barber_id: barber3Id,
      branch_id: branch1Id,
      clock_in: getStartOfDayPHT() + (10.5 * 60 * 60 * 1000),
      clock_out: undefined,
      created_at: now,
    });

    // Yesterday's attendance
    await ctx.db.insert("timeAttendance", {
      barber_id: barber1Id,
      branch_id: branch1Id,
      clock_in: getStartOfDayPHT(1) + (9 * 60 * 60 * 1000),
      clock_out: getStartOfDayPHT(1) + (17 * 60 * 60 * 1000),
      created_at: now - (24 * 60 * 60 * 1000),
    });

    await ctx.db.insert("timeAttendance", {
      barber_id: barber2Id,
      branch_id: branch1Id,
      clock_in: getStartOfDayPHT(1) + (10 * 60 * 60 * 1000),
      clock_out: getStartOfDayPHT(1) + (18 * 60 * 60 * 1000),
      created_at: now - (24 * 60 * 60 * 1000),
    });

    await ctx.db.insert("timeAttendance", {
      barber_id: barber3Id,
      branch_id: branch1Id,
      clock_in: getStartOfDayPHT(1) + (11 * 60 * 60 * 1000),
      clock_out: getStartOfDayPHT(1) + (19 * 60 * 60 * 1000),
      created_at: now - (24 * 60 * 60 * 1000),
    });

    // 2-3 days ago attendance
    await ctx.db.insert("timeAttendance", {
      barber_id: barber1Id,
      branch_id: branch1Id,
      clock_in: getStartOfDayPHT(2) + (8 * 60 * 60 * 1000),
      clock_out: getStartOfDayPHT(2) + (16 * 60 * 60 * 1000),
      created_at: now - (2 * 24 * 60 * 60 * 1000),
    });

    await ctx.db.insert("timeAttendance", {
      barber_id: barber2Id,
      branch_id: branch1Id,
      clock_in: getStartOfDayPHT(2) + (9 * 60 * 60 * 1000),
      clock_out: getStartOfDayPHT(2) + (17 * 60 * 60 * 1000),
      created_at: now - (2 * 24 * 60 * 60 * 1000),
    });

    await ctx.db.insert("timeAttendance", {
      barber_id: barber1Id,
      branch_id: branch1Id,
      clock_in: getStartOfDayPHT(3) + (9 * 60 * 60 * 1000),
      clock_out: getStartOfDayPHT(3) + (18 * 60 * 60 * 1000),
      created_at: now - (3 * 24 * 60 * 60 * 1000),
    });

    await ctx.db.insert("timeAttendance", {
      barber_id: barber3Id,
      branch_id: branch1Id,
      clock_in: getStartOfDayPHT(3) + (10 * 60 * 60 * 1000),
      clock_out: getStartOfDayPHT(3) + (17 * 60 * 60 * 1000),
      created_at: now - (3 * 24 * 60 * 60 * 1000),
    });

    // Create a customer with wallet and points
    const customerId = await ctx.db.insert("users", {
      username: "customer1",
      email: "customer@example.com",
      password: "password123",
      nickname: "Test Customer",
      mobile_number: "+63 912 555 5555",
      role: "customer",
      is_active: true,
      skills: [],
      isVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    // Create wallet with ₱750 balance (₱500 real + ₱250 bonus)
    await ctx.db.insert("wallets", {
      user_id: customerId,
      balance: 75000, // ₱750.00 in centavos
      bonus_balance: 25000, // ₱250.00 bonus from top-ups
      currency: "PHP",
      createdAt: now,
      updatedAt: now,
    });

    // Create points ledger - 7500 points (integer ×100 format = 750000)
    // This puts customer at Silver tier (threshold: 5000 points = 500000)
    await ctx.db.insert("points_ledger", {
      user_id: customerId,
      current_balance: 750000, // 7500.00 points available
      lifetime_earned: 850000, // 8500.00 points total earned
      lifetime_redeemed: 100000, // 1000.00 points redeemed
      last_activity_at: now,
    });

    // Add some points transaction history
    await ctx.db.insert("points_transactions", {
      user_id: customerId,
      type: "earn",
      amount: 500000, // 5000 points
      balance_after: 500000,
      source_type: "payment",
      source_id: "initial-service-payment",
      notes: "Points from service payment",
      created_at: now - (7 * 24 * 60 * 60 * 1000), // 7 days ago
    });

    await ctx.db.insert("points_transactions", {
      user_id: customerId,
      type: "earn",
      amount: 250000, // 2500 points
      balance_after: 750000,
      source_type: "wallet_payment",
      source_id: "wallet-payment-1",
      notes: "Bonus points from wallet payment (1.5x)",
      created_at: now - (3 * 24 * 60 * 60 * 1000), // 3 days ago
    });

    await ctx.db.insert("points_transactions", {
      user_id: customerId,
      type: "earn",
      amount: 100000, // 1000 points
      balance_after: 850000,
      source_type: "top_up_bonus",
      source_id: "topup-bonus-1",
      notes: "Bonus points from wallet top-up",
      created_at: now - (1 * 24 * 60 * 60 * 1000), // 1 day ago
    });

    await ctx.db.insert("points_transactions", {
      user_id: customerId,
      type: "redeem",
      amount: -100000, // -1000 points
      balance_after: 750000,
      source_type: "redemption",
      source_id: "reward-redemption-1",
      notes: "Redeemed for free haircut",
      created_at: now - (12 * 60 * 60 * 1000), // 12 hours ago
    });

    // Create wallet transaction history
    await ctx.db.insert("wallet_transactions", {
      user_id: customerId,
      type: "topup",
      amount: 50000, // ₱500.00 top-up
      status: "completed",
      reference_id: "TOPUP-001",
      description: "GCash top-up with ₱50 bonus",
      createdAt: now - (5 * 24 * 60 * 60 * 1000), // 5 days ago
    });

    await ctx.db.insert("wallet_transactions", {
      user_id: customerId,
      type: "topup",
      amount: 30000, // ₱300.00 top-up
      status: "completed",
      reference_id: "TOPUP-002",
      description: "Maya top-up",
      createdAt: now - (2 * 24 * 60 * 60 * 1000), // 2 days ago
    });

    await ctx.db.insert("wallet_transactions", {
      user_id: customerId,
      type: "payment",
      amount: -5000, // ₱50.00 payment
      status: "completed",
      reference_id: "PAY-001",
      description: "Haircut service payment",
      createdAt: now - (1 * 24 * 60 * 60 * 1000), // 1 day ago
    });

    return {
      success: true,
      message: "Data cleared and re-seeded successfully",
      data: {
        branches: 2,
        services: 3,
        users: 6,
        barbers: 3,
        timeAttendanceRecords: 11,
        customer: {
          email: "customer@example.com",
          password: "password123",
          wallet_balance: "₱750.00",
          points_balance: "7,500 pts",
          tier: "Silver (8,500 lifetime pts)",
        },
      },
    };
  },
});

/**
 * Query to get seed status
 */
export const getSeedStatus = query({
  args: {},
  handler: async (ctx) => {
    const branches = await ctx.db.query("branches").collect();
    const users = await ctx.db.query("users").collect();
    const barbers = await ctx.db.query("barbers").collect();
    const services = await ctx.db.query("services").collect();
    const attendance = await ctx.db.query("timeAttendance").collect();
    const bookings = await ctx.db.query("bookings").collect();

    return {
      branches: branches.length,
      users: users.length,
      barbers: barbers.length,
      services: services.length,
      timeAttendanceRecords: attendance.length,
      bookings: bookings.length,
      branchList: branches.map(b => ({ id: b._id, name: b.name, code: b.branch_code })),
      barberList: barbers.map(b => ({ id: b._id, name: b.full_name, branch_id: b.branch_id })),
      userList: users.map(u => ({
        id: u._id,
        email: u.email,
        role: u.role,
        clerk_user_id: u.clerk_user_id || null,
      })),
    };
  },
});

/**
 * List all wallets in the database (debug function)
 */
export const listAllWallets = query({
  args: {},
  handler: async (ctx) => {
    const wallets = await ctx.db.query("wallets").collect();
    const result = [];

    for (const w of wallets) {
      const user = await ctx.db.get(w.user_id);
      result.push({
        wallet_id: w._id,
        user_id: w.user_id,
        user_email: user?.email || "unknown",
        balance: w.balance / 100,
        bonus_balance: (w.bonus_balance || 0) / 100,
        updatedAt: new Date(w.updatedAt).toISOString(),
      });
    }

    return result;
  },
});

/**
 * Check wallet and points status for a user by email
 */
export const checkUserWallet = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      return { found: false, message: `User "${args.email}" not found` };
    }

    // Get wallet
    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_user", (q) => q.eq("user_id", user._id))
      .first();

    // Get points ledger
    const points = await ctx.db
      .query("points_ledger")
      .withIndex("by_user", (q) => q.eq("user_id", user._id))
      .first();

    return {
      found: true,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        clerk_user_id: user.clerk_user_id,
      },
      wallet: wallet
        ? {
            balance: wallet.balance / 100, // Convert centavos to pesos
            bonus_balance: (wallet.bonus_balance || 0) / 100,
            currency: wallet.currency,
          }
        : null,
      points: points
        ? {
            current_balance: points.current_balance / 100, // Convert ×100 to actual
            lifetime_earned: points.lifetime_earned / 100,
            lifetime_redeemed: points.lifetime_redeemed / 100,
          }
        : null,
    };
  },
});

/**
 * Generate a unique booking code
 */
function generateBookingCode(index: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "BK-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code + `-${index}`;
}

/**
 * Seed completed bookings for the last 4 weeks
 * This creates realistic earnings history for barbers so cash advance can calculate limits
 */
export const seedBookingsAndEarnings = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Get existing barbers
    const barbers = await ctx.db.query("barbers").collect();
    if (barbers.length === 0) {
      return {
        success: false,
        message: "No barbers found. Run seedAll first.",
      };
    }

    // Get existing services
    const services = await ctx.db.query("services").collect();
    if (services.length === 0) {
      return {
        success: false,
        message: "No services found. Run seedAll first.",
      };
    }

    // Check if bookings already exist
    const existingBookings = await ctx.db.query("bookings").collect();
    if (existingBookings.length > 0) {
      return {
        success: false,
        message: `Bookings already exist (${existingBookings.length}). Use clearBookingsAndReseed to reset.`,
      };
    }

    // Get branch
    const branches = await ctx.db.query("branches").collect();
    const branch = branches[0];
    if (!branch) {
      return { success: false, message: "No branch found" };
    }

    // Customer names for variety
    const customerNames = [
      "John Smith", "Mike Johnson", "Carlos Garcia", "David Lee", "James Wilson",
      "Robert Brown", "William Davis", "Richard Miller", "Joseph Martinez", "Thomas Anderson",
      "Mark Thompson", "Steven White", "Paul Harris", "Daniel Robinson", "Kevin Clark",
      "Brian Lewis", "Edward Walker", "Ronald Hall", "Kenneth Young", "Jason King"
    ];

    let bookingCount = 0;
    const bookingsPerBarberPerWeek = 15; // ~3 per day for 5 working days

    // Create bookings for each barber over the last 4 weeks
    for (const barber of barbers) {
      // Get services this barber can do
      const barberServices = services.filter(s =>
        barber.services.some(bs => bs === s._id)
      );

      if (barberServices.length === 0) {
        // Fallback to all services if barber has none assigned
        barberServices.push(...services);
      }

      // Create bookings for each of the last 4 weeks
      for (let weekAgo = 0; weekAgo < 4; weekAgo++) {
        for (let i = 0; i < bookingsPerBarberPerWeek; i++) {
          // Random day within this week
          const daysAgo = weekAgo * 7 + Math.floor(Math.random() * 7);
          const bookingDate = getStartOfDayPHT(daysAgo);

          // Format date as YYYY-MM-DD
          const dateObj = new Date(bookingDate);
          const dateStr = dateObj.toISOString().split('T')[0];

          // Random time between 9 AM and 6 PM
          const hour = 9 + Math.floor(Math.random() * 9);
          const timeStr = `${hour.toString().padStart(2, '0')}:${Math.random() > 0.5 ? '00' : '30'}`;

          // Random service
          const service = barberServices[Math.floor(Math.random() * barberServices.length)];

          // Random customer
          const customerName = customerNames[Math.floor(Math.random() * customerNames.length)];

          // Randomly assign payment type: 30% Pay Now, 30% Pay Later, 40% Cash at Shop
          const paymentRandom = Math.random();
          let paymentType: "pay_now" | "pay_later" | "cash";
          let bookingFee: number | undefined;
          let convenienceFeePaid: number | undefined;
          let cashCollected: number | undefined;
          let paymentFor: "full_service" | "convenience_fee" | "full_cash";

          if (paymentRandom < 0.3) {
            // Pay Now - full service + booking fee paid online
            paymentType = "pay_now";
            bookingFee = 50;
            paymentFor = "full_service";
          } else if (paymentRandom < 0.6) {
            // Pay Later - convenience fee paid online, rest at shop
            paymentType = "pay_later";
            convenienceFeePaid = 50; // Fixed convenience fee
            cashCollected = service.price; // Remaining paid at shop
            paymentFor = "convenience_fee";
          } else {
            // Cash at Shop - full amount paid at shop
            paymentType = "cash";
            cashCollected = service.price;
            paymentFor = "full_cash";
          }

          // All historical bookings are completed
          const bookingId = await ctx.db.insert("bookings", {
            booking_code: generateBookingCode(bookingCount),
            branch_id: branch._id,
            customer_name: customerName,
            customer_phone: `+63 9${Math.floor(100000000 + Math.random() * 900000000)}`,
            service: service._id,
            service_name: service.name,
            service_price: service.price,
            barber: barber._id,
            date: dateStr,
            time: timeStr,
            status: "completed",
            payment_status: "paid",
            price: service.price,
            final_price: service.price,
            booking_fee: bookingFee,
            convenience_fee_paid: convenienceFeePaid,
            cash_collected: cashCollected,
            createdAt: bookingDate,
            updatedAt: bookingDate + (2 * 60 * 60 * 1000), // 2 hours later
          });

          // Create payment audit log for this booking
          if (paymentType === "pay_now") {
            // Log online payment completed
            await ctx.db.insert("paymentAuditLog", {
              branch_id: branch._id,
              booking_id: bookingId,
              event_type: "payment_completed",
              amount: service.price + (bookingFee || 0),
              payment_method: Math.random() > 0.5 ? "gcash" : "card",
              payment_for: "full_service",
              created_at: bookingDate + (30 * 60 * 1000), // 30 mins after booking
            });
          } else if (paymentType === "pay_later") {
            // Log convenience fee payment
            await ctx.db.insert("paymentAuditLog", {
              branch_id: branch._id,
              booking_id: bookingId,
              event_type: "payment_completed",
              amount: convenienceFeePaid,
              payment_method: Math.random() > 0.5 ? "gcash" : "maya",
              payment_for: "convenience_fee",
              created_at: bookingDate + (30 * 60 * 1000),
            });
            // Log cash collected for remaining balance
            await ctx.db.insert("paymentAuditLog", {
              branch_id: branch._id,
              booking_id: bookingId,
              event_type: "cash_collected",
              amount: service.price,
              payment_method: "cash",
              payment_for: "remaining_balance",
              created_at: bookingDate + (2 * 60 * 60 * 1000), // After service
            });
          } else {
            // Log cash collected for full amount
            await ctx.db.insert("paymentAuditLog", {
              branch_id: branch._id,
              booking_id: bookingId,
              event_type: "cash_collected",
              amount: service.price,
              payment_method: "cash",
              payment_for: "full_cash",
              created_at: bookingDate + (2 * 60 * 60 * 1000),
            });
          }

          bookingCount++;
        }
      }
    }

    return {
      success: true,
      message: `Created ${bookingCount} completed bookings over the last 4 weeks`,
      data: {
        bookings: bookingCount,
        barbers: barbers.length,
        bookingsPerBarber: bookingCount / barbers.length,
      },
    };
  },
});

/**
 * Clear all bookings and reseed
 */
export const clearBookingsAndReseed = mutation({
  args: {},
  handler: async (ctx) => {
    // Clear existing bookings
    const existingBookings = await ctx.db.query("bookings").collect();
    for (const booking of existingBookings) {
      await ctx.db.delete(booking._id);
    }

    return {
      success: true,
      message: `Cleared ${existingBookings.length} bookings. Run seedBookingsAndEarnings to create new ones.`,
    };
  },
});

/**
 * Add loyalty data (wallet + points) to an existing user by email
 * Use this after signing up through Clerk to get test data
 */
export const addLoyaltyDataToUser = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      return {
        success: false,
        message: `User with email "${args.email}" not found. Please sign up first.`,
      };
    }

    // Check if user already has wallet
    const existingWallet = await ctx.db
      .query("wallets")
      .withIndex("by_user", (q) => q.eq("user_id", user._id))
      .first();

    if (existingWallet) {
      return {
        success: false,
        message: "User already has wallet data. No changes made.",
      };
    }

    // Create wallet with ₱750 balance
    await ctx.db.insert("wallets", {
      user_id: user._id,
      balance: 75000, // ₱750.00 in centavos
      bonus_balance: 25000, // ₱250.00 bonus
      currency: "PHP",
      createdAt: now,
      updatedAt: now,
    });

    // Create points ledger - 7500 points (Silver tier)
    await ctx.db.insert("points_ledger", {
      user_id: user._id,
      current_balance: 750000, // 7500.00 points
      lifetime_earned: 850000, // 8500.00 points total
      lifetime_redeemed: 100000, // 1000.00 points redeemed
      last_activity_at: now,
    });

    // Add points transaction history
    await ctx.db.insert("points_transactions", {
      user_id: user._id,
      type: "earn",
      amount: 500000,
      balance_after: 500000,
      source_type: "payment",
      source_id: "seeded-payment-1",
      notes: "Points from service payment (seeded)",
      created_at: now - (7 * 24 * 60 * 60 * 1000),
    });

    await ctx.db.insert("points_transactions", {
      user_id: user._id,
      type: "earn",
      amount: 250000,
      balance_after: 750000,
      source_type: "wallet_payment",
      source_id: "seeded-wallet-1",
      notes: "Bonus points from wallet payment (seeded)",
      created_at: now - (3 * 24 * 60 * 60 * 1000),
    });

    await ctx.db.insert("points_transactions", {
      user_id: user._id,
      type: "earn",
      amount: 100000,
      balance_after: 850000,
      source_type: "top_up_bonus",
      source_id: "seeded-topup-1",
      notes: "Bonus points from wallet top-up (seeded)",
      created_at: now - (1 * 24 * 60 * 60 * 1000),
    });

    await ctx.db.insert("points_transactions", {
      user_id: user._id,
      type: "redeem",
      amount: -100000,
      balance_after: 750000,
      source_type: "redemption",
      source_id: "seeded-redeem-1",
      notes: "Redeemed for free haircut (seeded)",
      created_at: now - (12 * 60 * 60 * 1000),
    });

    // Create wallet transaction history
    await ctx.db.insert("wallet_transactions", {
      user_id: user._id,
      type: "topup",
      amount: 50000,
      status: "completed",
      reference_id: "SEEDED-TOPUP-001",
      description: "GCash top-up (seeded)",
      createdAt: now - (5 * 24 * 60 * 60 * 1000),
    });

    await ctx.db.insert("wallet_transactions", {
      user_id: user._id,
      type: "topup",
      amount: 30000,
      status: "completed",
      reference_id: "SEEDED-TOPUP-002",
      description: "Maya top-up (seeded)",
      createdAt: now - (2 * 24 * 60 * 60 * 1000),
    });

    return {
      success: true,
      message: "Loyalty data added successfully!",
      data: {
        email: args.email,
        wallet_balance: "₱750.00",
        points_balance: "7,500 pts",
        tier: "Silver (8,500 lifetime pts)",
      },
    };
  },
});

/**
 * Link a Clerk user ID to an existing user by email
 * Use this to connect your Clerk account to the seeded customer
 */
export const linkClerkToUser = mutation({
  args: {
    email: v.string(),
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      return {
        success: false,
        message: `User with email "${args.email}" not found.`,
      };
    }

    if (user.clerk_user_id) {
      return {
        success: false,
        message: `User already has a Clerk ID linked: ${user.clerk_user_id}`,
      };
    }

    // Update user with clerk_user_id
    await ctx.db.patch(user._id, {
      clerk_user_id: args.clerkUserId,
      migration_status: "completed",
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: `Successfully linked Clerk ID to ${args.email}`,
      data: {
        userId: user._id,
        email: args.email,
        clerkUserId: args.clerkUserId,
        role: user.role,
      },
    };
  },
});

/**
 * Seed loyalty data to ALL customers who don't have wallet yet
 * Run this after signing up through Clerk to auto-add test data
 */
export const seedAllCustomerLoyalty = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find all customers
    const customers = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "customer"))
      .collect();

    const results: { email: string; status: string }[] = [];

    for (const customer of customers) {
      // Check if customer already has wallet
      const existingWallet = await ctx.db
        .query("wallets")
        .withIndex("by_user", (q) => q.eq("user_id", customer._id))
        .first();

      if (existingWallet) {
        results.push({ email: customer.email, status: "skipped (has wallet)" });
        continue;
      }

      // Create wallet with ₱750 balance
      await ctx.db.insert("wallets", {
        user_id: customer._id,
        balance: 75000,
        bonus_balance: 25000,
        currency: "PHP",
        createdAt: now,
        updatedAt: now,
      });

      // Create points ledger
      await ctx.db.insert("points_ledger", {
        user_id: customer._id,
        current_balance: 750000,
        lifetime_earned: 850000,
        lifetime_redeemed: 100000,
        last_activity_at: now,
      });

      // Add points transactions
      await ctx.db.insert("points_transactions", {
        user_id: customer._id,
        type: "earn",
        amount: 500000,
        balance_after: 500000,
        source_type: "payment",
        source_id: "seeded-payment",
        notes: "Seeded points from service payment",
        created_at: now - (7 * 24 * 60 * 60 * 1000),
      });

      await ctx.db.insert("points_transactions", {
        user_id: customer._id,
        type: "earn",
        amount: 250000,
        balance_after: 750000,
        source_type: "wallet_payment",
        source_id: "seeded-wallet",
        notes: "Seeded bonus points from wallet payment",
        created_at: now - (3 * 24 * 60 * 60 * 1000),
      });

      await ctx.db.insert("points_transactions", {
        user_id: customer._id,
        type: "earn",
        amount: 100000,
        balance_after: 850000,
        source_type: "top_up_bonus",
        source_id: "seeded-topup",
        notes: "Seeded bonus points from top-up",
        created_at: now - (1 * 24 * 60 * 60 * 1000),
      });

      await ctx.db.insert("points_transactions", {
        user_id: customer._id,
        type: "redeem",
        amount: -100000,
        balance_after: 750000,
        source_type: "redemption",
        source_id: "seeded-redeem",
        notes: "Seeded redemption",
        created_at: now - (12 * 60 * 60 * 1000),
      });

      // Add wallet transactions
      await ctx.db.insert("wallet_transactions", {
        user_id: customer._id,
        type: "topup",
        amount: 50000,
        status: "completed",
        reference_id: `SEED-${customer._id.slice(-6)}`,
        description: "Seeded top-up",
        createdAt: now - (5 * 24 * 60 * 60 * 1000),
      });

      results.push({ email: customer.email, status: "added loyalty data" });
    }

    return {
      success: true,
      message: `Processed ${customers.length} customers`,
      results,
    };
  },
});

/**
 * Register a customer with Clerk ID and seed loyalty data
 * USE THIS TO BYPASS WEBHOOK - manually register your Clerk account
 *
 * How to use:
 * 1. Sign up/login through Clerk in the app
 * 2. Get your Clerk user ID from Clerk Dashboard or browser console
 * 3. Run this mutation with your email and clerk_user_id
 * 4. Refresh the app - you should now be logged in with loyalty data!
 */
export const registerCustomerWithClerkId = mutation({
  args: {
    email: v.string(),
    clerk_user_id: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if clerk_user_id is already registered
    const existingByClerkId = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerk_user_id", args.clerk_user_id))
      .first();

    if (existingByClerkId) {
      // User exists - check if they have loyalty data
      const wallet = await ctx.db
        .query("wallets")
        .withIndex("by_user", (q) => q.eq("user_id", existingByClerkId._id))
        .first();

      if (wallet) {
        return {
          success: true,
          message: "User already exists with loyalty data!",
          data: {
            userId: existingByClerkId._id,
            email: existingByClerkId.email,
            hasLoyaltyData: true,
          },
        };
      }

      // Add loyalty data to existing user
      await seedLoyaltyData(ctx, existingByClerkId._id, args.clerk_user_id);

      return {
        success: true,
        message: "Loyalty data added to existing user!",
        data: {
          userId: existingByClerkId._id,
          email: existingByClerkId.email,
          wallet: "₱750.00",
          points: "7,500 pts",
        },
      };
    }

    // Check if email is already registered (link to existing user)
    const existingByEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingByEmail) {
      // Link clerk_user_id to existing user
      await ctx.db.patch(existingByEmail._id, {
        clerk_user_id: args.clerk_user_id,
        migration_status: "completed",
        updatedAt: now,
      });

      // Check if they have loyalty data
      const wallet = await ctx.db
        .query("wallets")
        .withIndex("by_user", (q) => q.eq("user_id", existingByEmail._id))
        .first();

      if (!wallet) {
        await seedLoyaltyData(ctx, existingByEmail._id, args.clerk_user_id);
      }

      return {
        success: true,
        message: "Clerk ID linked to existing user!",
        data: {
          userId: existingByEmail._id,
          email: existingByEmail.email,
          clerkUserId: args.clerk_user_id,
          wallet: "₱750.00",
          points: "7,500 pts",
        },
      };
    }

    // Create new user
    const username = args.email.split("@")[0] + "_" + args.clerk_user_id.slice(-6);
    const fullName = args.name || "Test Customer";

    const userId = await ctx.db.insert("users", {
      email: args.email,
      username: username,
      nickname: fullName,
      password: "", // Clerk manages authentication
      mobile_number: "",
      role: "customer",
      clerk_user_id: args.clerk_user_id,
      migration_status: "completed",
      is_active: true,
      isVerified: true,
      skills: [],
      createdAt: now,
      updatedAt: now,
    });

    // Seed loyalty data
    await seedLoyaltyData(ctx, userId, args.clerk_user_id);

    return {
      success: true,
      message: "Customer registered with loyalty data!",
      data: {
        userId,
        email: args.email,
        clerkUserId: args.clerk_user_id,
        wallet: "₱750.00",
        bonus: "₱250.00",
        points: "7,500 pts (Silver tier)",
        tier: "Silver",
      },
    };
  },
});

/**
 * Helper function to seed loyalty data (wallet + points) for a user
 */
async function seedLoyaltyData(
  ctx: { db: any },
  userId: any,
  clerkUserId: string
) {
  const now = Date.now();

  // Create wallet with ₱750 balance + ₱250 bonus
  await ctx.db.insert("wallets", {
    user_id: userId,
    balance: 75000, // ₱750.00 in centavos
    bonus_balance: 25000, // ₱250.00 bonus
    currency: "PHP",
    createdAt: now,
    updatedAt: now,
  });

  // Create points ledger - 7,500 points (Silver tier threshold: 5,000)
  await ctx.db.insert("points_ledger", {
    user_id: userId,
    current_balance: 750000, // 7,500.00 points (×100 format)
    lifetime_earned: 850000, // 8,500.00 points total
    lifetime_redeemed: 100000, // 1,000.00 points redeemed
    last_activity_at: now,
  });

  // Add points transaction history
  await ctx.db.insert("points_transactions", {
    user_id: userId,
    type: "earn",
    amount: 500000,
    balance_after: 500000,
    source_type: "payment",
    source_id: "welcome-bonus",
    notes: "Welcome bonus points",
    created_at: now - 7 * 24 * 60 * 60 * 1000,
  });

  await ctx.db.insert("points_transactions", {
    user_id: userId,
    type: "earn",
    amount: 250000,
    balance_after: 750000,
    source_type: "wallet_payment",
    source_id: "signup-wallet-bonus",
    notes: "Signup wallet payment bonus",
    created_at: now - 3 * 24 * 60 * 60 * 1000,
  });

  await ctx.db.insert("points_transactions", {
    user_id: userId,
    type: "earn",
    amount: 100000,
    balance_after: 850000,
    source_type: "top_up_bonus",
    source_id: "signup-topup-bonus",
    notes: "Signup top-up bonus",
    created_at: now - 1 * 24 * 60 * 60 * 1000,
  });

  await ctx.db.insert("points_transactions", {
    user_id: userId,
    type: "redeem",
    amount: -100000,
    balance_after: 750000,
    source_type: "redemption",
    source_id: "signup-redemption",
    notes: "Signup redemption sample",
    created_at: now - 12 * 60 * 60 * 1000,
  });

  // Add wallet transaction history
  await ctx.db.insert("wallet_transactions", {
    user_id: userId,
    type: "topup",
    amount: 50000,
    status: "completed",
    reference_id: `SIGNUP-${clerkUserId.slice(-6)}`,
    description: "Welcome top-up bonus",
    createdAt: now - 5 * 24 * 60 * 60 * 1000,
    updatedAt: now - 5 * 24 * 60 * 60 * 1000,
  });

  await ctx.db.insert("wallet_transactions", {
    user_id: userId,
    type: "topup",
    amount: 30000,
    status: "completed",
    reference_id: `WELCOME-${clerkUserId.slice(-6)}`,
    description: "Welcome bonus credit",
    createdAt: now - 2 * 24 * 60 * 60 * 1000,
    updatedAt: now - 2 * 24 * 60 * 60 * 1000,
  });
}

/**
 * Seed a test customer with wallet and points
 * Run via: npx convex run seed:seedTestCustomer
 */
export const seedTestCustomer = mutation({
  args: {
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    walletBalance: v.optional(v.number()), // in pesos
    points: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const email = args.email || "testcustomer@example.com";
    const name = args.name || "Test Customer";
    const walletBalanceCentavos = (args.walletBalance || 500) * 100; // Convert to centavos
    const pointsX100 = (args.points || 5000) * 100; // Convert to x100 format

    // Check if customer already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (existingUser) {
      // Update existing user's wallet and points
      const wallet = await ctx.db
        .query("wallets")
        .withIndex("by_user", (q) => q.eq("user_id", existingUser._id))
        .first();

      if (wallet) {
        await ctx.db.patch(wallet._id, {
          balance: walletBalanceCentavos,
          bonus_balance: Math.floor(walletBalanceCentavos * 0.1), // 10% bonus
          updatedAt: now,
        });
      }

      const pointsLedger = await ctx.db
        .query("points_ledger")
        .withIndex("by_user", (q) => q.eq("user_id", existingUser._id))
        .first();

      if (pointsLedger) {
        await ctx.db.patch(pointsLedger._id, {
          current_balance: pointsX100,
          lifetime_earned: Math.floor(pointsX100 * 1.2),
          last_activity_at: now,
        });
      }

      return {
        success: true,
        action: "updated",
        userId: existingUser._id,
        email,
        wallet: `₱${(walletBalanceCentavos / 100).toFixed(2)}`,
        points: args.points || 5000,
      };
    }

    // Create new test customer
    const userId = await ctx.db.insert("users", {
      email,
      username: email.split("@")[0],
      nickname: name,
      password: "",
      mobile_number: "+639123456789",
      role: "customer",
      is_active: true,
      isVerified: true,
      skills: [],
      createdAt: now,
      updatedAt: now,
    });

    // Create wallet with balance
    await ctx.db.insert("wallets", {
      user_id: userId,
      balance: walletBalanceCentavos,
      bonus_balance: Math.floor(walletBalanceCentavos * 0.1), // 10% bonus
      currency: "PHP",
      createdAt: now,
      updatedAt: now,
    });

    // Create points ledger
    await ctx.db.insert("points_ledger", {
      user_id: userId,
      current_balance: pointsX100,
      lifetime_earned: Math.floor(pointsX100 * 1.2),
      lifetime_redeemed: Math.floor(pointsX100 * 0.2),
      last_activity_at: now,
    });

    // Add some wallet transaction history
    await ctx.db.insert("wallet_transactions", {
      user_id: userId,
      type: "topup",
      amount: walletBalanceCentavos,
      status: "completed",
      reference_id: `SEED-${Date.now()}`,
      description: "Initial top-up (seeded)",
      createdAt: now - 3 * 24 * 60 * 60 * 1000,
      updatedAt: now - 3 * 24 * 60 * 60 * 1000,
    });

    // Add some points transaction history
    await ctx.db.insert("points_transactions", {
      user_id: userId,
      type: "earn",
      amount: pointsX100,
      balance_after: pointsX100,
      source_type: "payment",
      source_id: "seed-bonus",
      notes: "Initial points (seeded)",
      created_at: now - 3 * 24 * 60 * 60 * 1000,
    });

    console.log("[Seed] Created test customer:", {
      userId,
      email,
      wallet: `₱${(walletBalanceCentavos / 100).toFixed(2)}`,
      points: args.points || 5000,
    });

    return {
      success: true,
      action: "created",
      userId,
      email,
      wallet: `₱${(walletBalanceCentavos / 100).toFixed(2)}`,
      points: args.points || 5000,
    };
  },
});

/**
 * Seed test customers for AI Email Marketing testing
 * Creates customers with varied visit patterns for churn/RFM testing
 * Run: npx convex run seed:seedEmailMarketingTestData
 */
export const seedEmailMarketingTestData = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;

    // Get first branch for association
    const branches = await ctx.db.query("branches").collect();
    const branchId = branches[0]?._id;

    if (!branchId) {
      throw new Error("No branch found. Run seedAll first.");
    }

    // Test customers with different profiles for AI segmentation
    const testCustomers = [
      // === CRITICAL CHURN (90+ days since visit) ===
      {
        email: "critical1@test.com",
        name: "Carlos Critical",
        lastVisitDaysAgo: 95,
        totalBookings: 8,
        totalSpent: 4500,
        description: "Critical churn - was regular, now absent",
      },
      {
        email: "critical2@test.com",
        name: "Diana Danger",
        lastVisitDaysAgo: 120,
        totalBookings: 15,
        totalSpent: 8000,
        description: "Critical churn - VIP going dormant",
      },
      {
        email: "critical3@test.com",
        name: "Eduardo Emergency",
        lastVisitDaysAgo: 100,
        totalBookings: 5,
        totalSpent: 2000,
        description: "Critical churn - moderate customer",
      },

      // === HIGH CHURN (60-89 days) ===
      {
        email: "high1@test.com",
        name: "Felix Fading",
        lastVisitDaysAgo: 65,
        totalBookings: 10,
        totalSpent: 5500,
        description: "High churn risk - needs attention",
      },
      {
        email: "high2@test.com",
        name: "Gloria Gone",
        lastVisitDaysAgo: 75,
        totalBookings: 6,
        totalSpent: 3000,
        description: "High churn risk - slipping away",
      },
      {
        email: "high3@test.com",
        name: "Henry Hesitant",
        lastVisitDaysAgo: 70,
        totalBookings: 12,
        totalSpent: 6500,
        description: "High churn risk - high value at risk",
      },

      // === MEDIUM CHURN (45-59 days) ===
      {
        email: "medium1@test.com",
        name: "Isabel Inactive",
        lastVisitDaysAgo: 50,
        totalBookings: 7,
        totalSpent: 3500,
        description: "Medium risk - needs reminder",
      },
      {
        email: "medium2@test.com",
        name: "Juan Jittery",
        lastVisitDaysAgo: 45,
        totalBookings: 4,
        totalSpent: 1800,
        description: "Medium risk - still recoverable",
      },
      {
        email: "medium3@test.com",
        name: "Karen Questioning",
        lastVisitDaysAgo: 55,
        totalBookings: 9,
        totalSpent: 4200,
        description: "Medium risk - was consistent",
      },

      // === CHAMPIONS (Recent, Frequent, High Spend) ===
      {
        email: "champion1@test.com",
        name: "Leo Loyal",
        lastVisitDaysAgo: 5,
        totalBookings: 30,
        totalSpent: 15000,
        description: "Champion - best customer",
      },
      {
        email: "champion2@test.com",
        name: "Maria Magnificent",
        lastVisitDaysAgo: 10,
        totalBookings: 25,
        totalSpent: 12000,
        description: "Champion - VIP regular",
      },
      {
        email: "champion3@test.com",
        name: "Noel Noble",
        lastVisitDaysAgo: 7,
        totalBookings: 28,
        totalSpent: 14000,
        description: "Champion - consistent high spender",
      },

      // === POTENTIAL LOYALISTS (Recent but lower frequency) ===
      {
        email: "potential1@test.com",
        name: "Oscar Opportunity",
        lastVisitDaysAgo: 12,
        totalBookings: 5,
        totalSpent: 2500,
        description: "Potential loyalist - growing",
      },
      {
        email: "potential2@test.com",
        name: "Patricia Promising",
        lastVisitDaysAgo: 8,
        totalBookings: 6,
        totalSpent: 3000,
        description: "Potential loyalist - convert to regular",
      },
      {
        email: "potential3@test.com",
        name: "Quincy Quick",
        lastVisitDaysAgo: 15,
        totalBookings: 4,
        totalSpent: 2200,
        description: "Potential loyalist - needs engagement",
      },

      // === NEW CUSTOMERS ===
      {
        email: "new1@test.com",
        name: "Rachel Recent",
        lastVisitDaysAgo: 3,
        totalBookings: 2,
        totalSpent: 600,
        description: "New customer - just started",
      },
      {
        email: "new2@test.com",
        name: "Samuel Starter",
        lastVisitDaysAgo: 7,
        totalBookings: 1,
        totalSpent: 350,
        description: "New customer - single visit",
      },

      // === LOW RISK (Active regulars) ===
      {
        email: "active1@test.com",
        name: "Teresa Trusty",
        lastVisitDaysAgo: 20,
        totalBookings: 15,
        totalSpent: 7500,
        description: "Low risk - regular schedule",
      },
      {
        email: "active2@test.com",
        name: "Ulysses Usual",
        lastVisitDaysAgo: 25,
        totalBookings: 12,
        totalSpent: 6000,
        description: "Low risk - monthly visitor",
      },
    ];

    const results = [];

    for (const customer of testCustomers) {
      // Check if customer already exists
      const existing = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", customer.email))
        .first();

      if (existing) {
        // Update existing customer with test data
        await ctx.db.patch(existing._id, {
          nickname: customer.name.split(" ")[0],
          lastBookingDate: now - customer.lastVisitDaysAgo * DAY_MS,
          totalBookings: customer.totalBookings,
          totalSpent: customer.totalSpent * 100, // Convert to centavos
          updatedAt: now,
        });
        results.push({ email: customer.email, action: "updated" });
      } else {
        // Create new customer
        await ctx.db.insert("users", {
          username: customer.email.split("@")[0],
          email: customer.email,
          password: "test123",
          nickname: customer.name.split(" ")[0],
          mobile_number: `+63 9${Math.floor(Math.random() * 1000000000).toString().padStart(9, "0")}`,
          role: "customer",
          branch_id: branchId,
          is_active: true,
          skills: [],
          isVerified: true,
          lastBookingDate: now - customer.lastVisitDaysAgo * DAY_MS,
          totalBookings: customer.totalBookings,
          totalSpent: customer.totalSpent * 100, // Convert to centavos
          createdAt: now - 180 * DAY_MS, // Account created 6 months ago
          updatedAt: now,
        });
        results.push({ email: customer.email, action: "created" });
      }
    }

    console.log("[Seed] AI Email Marketing test data created:", {
      total: testCustomers.length,
      created: results.filter((r) => r.action === "created").length,
      updated: results.filter((r) => r.action === "updated").length,
    });

    return {
      success: true,
      total: testCustomers.length,
      customers: results,
      segments: {
        criticalChurn: 3,
        highChurn: 3,
        mediumChurn: 3,
        champions: 3,
        potentialLoyalists: 3,
        newCustomers: 2,
        lowRisk: 2,
      },
    };
  },
});

// Debug query to check if analytics fields are present
export const checkCustomerAnalyticsFields = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) return { found: false };

    return {
      found: true,
      email: user.email,
      hasLastBookingDate: "lastBookingDate" in user,
      lastBookingDate: user.lastBookingDate,
      hasTotalBookings: "totalBookings" in user,
      totalBookings: user.totalBookings,
      hasTotalSpent: "totalSpent" in user,
      totalSpent: user.totalSpent,
      createdAt: user.createdAt,
    };
  },
});

/**
 * Seed sample branch posts for testing the Branch Profile feature
 * Run: npx convex run seed:seedBranchPosts
 */
export const seedBranchPosts = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;
    const HOUR_MS = 60 * 60 * 1000;

    // Get branches
    const branches = await ctx.db.query("branches").collect();
    if (branches.length === 0) {
      return { success: false, message: "No branches found. Run seedAll first." };
    }

    // Get barbers
    const barbers = await ctx.db.query("barbers").collect();
    if (barbers.length === 0) {
      return { success: false, message: "No barbers found. Run seedAll first." };
    }

    // Get barber users (to use as author_id)
    const barberUsers = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "barber"))
      .collect();

    // Get branch admin user
    const adminUser = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "branch_admin"))
      .first();

    if (!adminUser) {
      return { success: false, message: "No admin user found. Run seedAll first." };
    }

    // Check if posts already exist
    const existingPosts = await ctx.db.query("branch_posts").collect();
    if (existingPosts.length > 0) {
      return {
        success: false,
        message: `Posts already exist (${existingPosts.length}). Use clearBranchPosts to clear first.`,
      };
    }

    const branch1 = branches[0];
    const postsCreated: string[] = [];

    // Sample posts data
    const samplePosts = [
      // === SHOWCASE POSTS (barber work) ===
      {
        author_id: barberUsers[0]?._id || adminUser._id,
        author_type: "barber" as const,
        post_type: "showcase" as const,
        content: "Fresh fade with textured top! This client wanted something clean for his job interview. Clean lines, sharp edges. Book now if you want the same look! 💈",
        images: ["https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800"],
        status: "published" as const,
        pinned: true,
        daysAgo: 1,
        view_count: 127,
      },
      {
        author_id: barberUsers[1]?._id || adminUser._id,
        author_type: "barber" as const,
        post_type: "showcase" as const,
        content: "Skin fade with beard lineup combo. Saturday special! My client trusted me with the full transformation. Swipe to see before/after 🔥",
        images: ["https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800"],
        status: "published" as const,
        pinned: false,
        daysAgo: 3,
        view_count: 89,
      },
      {
        author_id: barberUsers[2]?._id || adminUser._id,
        author_type: "barber" as const,
        post_type: "showcase" as const,
        content: "Classic pompadour with mid fade. Sometimes the classics just hit different. This gentleman knows what he wants! 🎩",
        images: ["https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800"],
        status: "published" as const,
        pinned: false,
        daysAgo: 5,
        view_count: 56,
      },

      // === PROMO POSTS ===
      {
        author_id: adminUser._id,
        author_type: "branch_admin" as const,
        post_type: "promo" as const,
        content: "🎉 WEEKEND SPECIAL! Get 20% off on all combo services this Saturday and Sunday. Book now to lock in your slot! Limited availability. Use code: WEEKEND20",
        images: [],
        status: "published" as const,
        pinned: true,
        daysAgo: 0,
        view_count: 245,
        expires_at: now + 3 * DAY_MS, // Expires in 3 days
      },
      {
        author_id: adminUser._id,
        author_type: "branch_admin" as const,
        post_type: "promo" as const,
        content: "Refer a friend and BOTH of you get ₱50 off your next haircut! No limits - the more you refer, the more you save. Ask our staff for details.",
        images: [],
        status: "published" as const,
        pinned: false,
        daysAgo: 7,
        view_count: 178,
      },

      // === AVAILABILITY POSTS ===
      {
        author_id: barberUsers[0]?._id || adminUser._id,
        author_type: "barber" as const,
        post_type: "availability" as const,
        content: "📅 OPEN SLOTS TODAY! I have 3 slots left this afternoon: 2:00 PM, 3:30 PM, and 5:00 PM. First come, first served - book now via the app!",
        images: [],
        status: "published" as const,
        pinned: false,
        daysAgo: 0,
        view_count: 34,
        expires_at: now + 12 * HOUR_MS, // Expires in 12 hours
      },
      {
        author_id: barberUsers[1]?._id || adminUser._id,
        author_type: "barber" as const,
        post_type: "availability" as const,
        content: "Back from vacation! 🌴 Ready to make you look fresh again. Fully booked tomorrow but have plenty of slots Wednesday onwards. Book ahead!",
        images: [],
        status: "published" as const,
        pinned: false,
        daysAgo: 2,
        view_count: 67,
      },

      // === ANNOUNCEMENT POSTS ===
      {
        author_id: adminUser._id,
        author_type: "branch_admin" as const,
        post_type: "announcement" as const,
        content: "📣 HOLIDAY HOURS: We will be closed on February 10 for the holiday. Regular hours resume February 11. Book your pre-holiday appointments now!",
        images: [],
        status: "published" as const,
        pinned: true,
        daysAgo: 1,
        view_count: 312,
      },
      {
        author_id: adminUser._id,
        author_type: "branch_admin" as const,
        post_type: "announcement" as const,
        content: "Welcome our newest barber, Maria Garcia! 👋 She specializes in precision cuts and hair coloring. Book with her and get 15% off your first visit!",
        images: ["https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800"],
        status: "published" as const,
        pinned: false,
        daysAgo: 14,
        view_count: 189,
      },

      // === TIP POSTS ===
      {
        author_id: barberUsers[0]?._id || adminUser._id,
        author_type: "barber" as const,
        post_type: "tip" as const,
        content: "💡 PRO TIP: Don't wash your hair right before your haircut! Natural oils help me see your hair's texture and how it falls naturally. Wait at least a day after washing for best results.",
        images: [],
        status: "published" as const,
        pinned: false,
        daysAgo: 4,
        view_count: 156,
      },
      {
        author_id: barberUsers[2]?._id || adminUser._id,
        author_type: "barber" as const,
        post_type: "tip" as const,
        content: "How to maintain your fade between cuts: 🔹 Use a good pomade or clay for texture 🔹 Clean up the neckline yourself with a trimmer 🔹 Come back every 2-3 weeks for best results",
        images: [],
        status: "published" as const,
        pinned: false,
        daysAgo: 10,
        view_count: 98,
      },

      // === PENDING POSTS (for moderation queue testing) ===
      {
        author_id: barberUsers[1]?._id || adminUser._id,
        author_type: "barber" as const,
        post_type: "showcase" as const,
        content: "Check out this crazy design I did today! Client wanted something unique and I delivered. What do you guys think? 🎨",
        images: ["https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=800"],
        status: "pending" as const,
        pinned: false,
        daysAgo: 0,
        view_count: 0,
      },
      {
        author_id: barberUsers[0]?._id || adminUser._id,
        author_type: "barber" as const,
        post_type: "tip" as const,
        content: "Quick tip for all my clients with curly hair - use a diffuser when blow drying! It keeps your curls defined and reduces frizz. Trust me on this one! 🌀",
        images: [],
        status: "pending" as const,
        pinned: false,
        daysAgo: 0,
        view_count: 0,
      },
      {
        author_id: barberUsers[2]?._id || adminUser._id,
        author_type: "barber" as const,
        post_type: "promo" as const,
        content: "Offering 10% off beard trims this week only! DM me to book your slot. First time clients welcome! 🧔",
        images: [],
        status: "pending" as const,
        pinned: false,
        daysAgo: 0,
        view_count: 0,
      },
    ];

    // Create posts
    for (const postData of samplePosts) {
      const createdAt = now - postData.daysAgo * DAY_MS;

      const postId = await ctx.db.insert("branch_posts", {
        branch_id: branch1._id,
        author_id: postData.author_id,
        author_type: postData.author_type,
        post_type: postData.post_type,
        content: postData.content,
        images: postData.images,
        status: postData.status,
        pinned: postData.pinned,
        expires_at: postData.expires_at,
        view_count: postData.view_count,
        createdAt,
        updatedAt: createdAt,
      });

      postsCreated.push(`${postData.post_type}: ${postData.status}`);
    }

    return {
      success: true,
      message: `Created ${postsCreated.length} sample branch posts`,
      data: {
        totalPosts: postsCreated.length,
        published: samplePosts.filter((p) => p.status === "published").length,
        pending: samplePosts.filter((p) => p.status === "pending").length,
        byType: {
          showcase: samplePosts.filter((p) => p.post_type === "showcase").length,
          promo: samplePosts.filter((p) => p.post_type === "promo").length,
          availability: samplePosts.filter((p) => p.post_type === "availability").length,
          announcement: samplePosts.filter((p) => p.post_type === "announcement").length,
          tip: samplePosts.filter((p) => p.post_type === "tip").length,
        },
        pinned: samplePosts.filter((p) => p.pinned).length,
      },
    };
  },
});

/**
 * Clear all branch posts
 * Run: npx convex run seed:clearBranchPosts
 */
export const clearBranchPosts = mutation({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db.query("branch_posts").collect();

    for (const post of posts) {
      await ctx.db.delete(post._id);
    }

    return {
      success: true,
      message: `Cleared ${posts.length} branch posts`,
    };
  },
});

/**
 * Get branch posts status
 * Run: npx convex run seed:getBranchPostsStatus
 */
export const getBranchPostsStatus = query({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db.query("branch_posts").collect();

    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const byAuthorType: Record<string, number> = {};

    for (const post of posts) {
      byStatus[post.status] = (byStatus[post.status] || 0) + 1;
      byType[post.post_type] = (byType[post.post_type] || 0) + 1;
      byAuthorType[post.author_type] = (byAuthorType[post.author_type] || 0) + 1;
    }

    return {
      total: posts.length,
      byStatus,
      byType,
      byAuthorType,
      pinned: posts.filter((p) => p.pinned).length,
      withImages: posts.filter((p) => p.images && p.images.length > 0).length,
    };
  },
});

/**
 * Debug query to check branch IDs
 * Run: npx convex run seed:debugBranchIds
 */
export const debugBranchIds = query({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db.query("branch_posts").take(3);
    const branches = await ctx.db.query("branches").collect();

    const postBranchIds = [...new Set(posts.map((p) => p.branch_id))];

    return {
      branches: branches.map((b) => ({
        _id: b._id,
        name: b.name,
        is_active: b.is_active,
      })),
      postBranchIds,
      postsLinkedToBranch: postBranchIds.map((id) => {
        const branch = branches.find((b) => b._id === id);
        return { branch_id: id, branch_name: branch?.name || "NOT FOUND" };
      }),
    };
  },
});

/**
 * Seed products for the shop
 * Run: npx convex run seed:seedProducts
 */
export const seedProducts = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Get the first branch
    const branches = await ctx.db.query("branches").collect();
    if (branches.length === 0) {
      throw new Error("No branches found. Run seedAll first.");
    }
    const branch1Id = branches[0]._id;

    // Check if products already exist
    const existingProducts = await ctx.db.query("products").collect();
    if (existingProducts.length > 0) {
      return {
        success: false,
        message: `Products already exist (${existingProducts.length} products). Run clearProducts first if you want to reseed.`,
      };
    }

    const products = [
      // Hair Care Products
      {
        name: "Premium Pomade",
        description: "Strong hold water-based pomade with natural shine. Easy to wash out.",
        price: 450,
        cost: 180,
        category: "hair-care" as const,
        brand: "TipunoX",
        sku: "TPX-HC-001",
        stock: 50,
        minStock: 10,
        imageUrl: "https://images.unsplash.com/photo-1597854710175-69c14789c3e3?w=400",
        status: "active" as const,
        soldThisMonth: 23,
      },
      {
        name: "Matte Clay Wax",
        description: "Medium hold matte finish clay for textured, natural looks.",
        price: 380,
        cost: 150,
        category: "hair-care" as const,
        brand: "TipunoX",
        sku: "TPX-HC-002",
        stock: 35,
        minStock: 8,
        imageUrl: "https://images.unsplash.com/photo-1626808642875-0aa545482dfb?w=400",
        status: "active" as const,
        soldThisMonth: 18,
      },
      {
        name: "Hair Growth Serum",
        description: "Biotin-enriched serum to promote healthy hair growth and thickness.",
        price: 750,
        cost: 320,
        category: "hair-care" as const,
        brand: "GroMax",
        sku: "GMX-HC-001",
        stock: 25,
        minStock: 5,
        imageUrl: "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=400",
        status: "active" as const,
        soldThisMonth: 12,
      },
      {
        name: "Anti-Dandruff Shampoo",
        description: "Medicated shampoo with zinc pyrithione for flake-free scalp.",
        price: 320,
        cost: 130,
        category: "hair-care" as const,
        brand: "ClearHead",
        sku: "CLH-HC-001",
        stock: 40,
        minStock: 10,
        imageUrl: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=400",
        status: "active" as const,
        soldThisMonth: 28,
      },
      {
        name: "Sea Salt Spray",
        description: "Creates beachy waves and texture with natural sea salt minerals.",
        price: 290,
        cost: 100,
        category: "hair-care" as const,
        brand: "TipunoX",
        sku: "TPX-HC-003",
        stock: 30,
        minStock: 8,
        imageUrl: "https://images.unsplash.com/photo-1594998893017-36147cbcae05?w=400",
        status: "active" as const,
        soldThisMonth: 15,
      },

      // Beard Care Products
      {
        name: "Beard Oil - Sandalwood",
        description: "Premium beard oil with sandalwood scent. Softens and conditions.",
        price: 420,
        cost: 170,
        category: "beard-care" as const,
        brand: "BeardKing",
        sku: "BDK-BC-001",
        stock: 45,
        minStock: 10,
        imageUrl: "https://images.unsplash.com/photo-1621607512214-68297480165e?w=400",
        status: "active" as const,
        soldThisMonth: 31,
      },
      {
        name: "Beard Balm",
        description: "Styling balm with light hold. Tames flyaways and adds shine.",
        price: 350,
        cost: 140,
        category: "beard-care" as const,
        brand: "BeardKing",
        sku: "BDK-BC-002",
        stock: 38,
        minStock: 8,
        imageUrl: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400",
        status: "active" as const,
        soldThisMonth: 22,
      },
      {
        name: "Beard Wash",
        description: "Gentle cleanser specifically formulated for facial hair.",
        price: 280,
        cost: 110,
        category: "beard-care" as const,
        brand: "TipunoX",
        sku: "TPX-BC-001",
        stock: 42,
        minStock: 10,
        imageUrl: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=400",
        status: "active" as const,
        soldThisMonth: 19,
      },
      {
        name: "Beard Growth Kit",
        description: "Complete kit with derma roller, growth serum, and beard oil.",
        price: 1250,
        cost: 500,
        category: "beard-care" as const,
        brand: "GroMax",
        sku: "GMX-BC-001",
        stock: 15,
        minStock: 5,
        imageUrl: "https://images.unsplash.com/photo-1621607512022-6aecc4fed814?w=400",
        status: "active" as const,
        soldThisMonth: 8,
      },

      // Shaving Products
      {
        name: "Classic Shaving Cream",
        description: "Rich lather shaving cream with aloe vera for smooth shaves.",
        price: 220,
        cost: 85,
        category: "shaving" as const,
        brand: "TipunoX",
        sku: "TPX-SH-001",
        stock: 55,
        minStock: 12,
        imageUrl: "https://images.unsplash.com/photo-1585751119414-ef2636f8aede?w=400",
        status: "active" as const,
        soldThisMonth: 35,
      },
      {
        name: "Pre-Shave Oil",
        description: "Prepares skin and softens stubble for a closer, irritation-free shave.",
        price: 340,
        cost: 130,
        category: "shaving" as const,
        brand: "SmoothCut",
        sku: "SMC-SH-001",
        stock: 28,
        minStock: 8,
        imageUrl: "https://images.unsplash.com/photo-1621607512175-adf5eba23c09?w=400",
        status: "active" as const,
        soldThisMonth: 14,
      },
      {
        name: "After Shave Balm",
        description: "Alcohol-free balm that soothes and hydrates post-shave skin.",
        price: 290,
        cost: 115,
        category: "shaving" as const,
        brand: "TipunoX",
        sku: "TPX-SH-002",
        stock: 48,
        minStock: 10,
        imageUrl: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400",
        status: "active" as const,
        soldThisMonth: 27,
      },
      {
        name: "Safety Razor Blades (10 pack)",
        description: "Premium stainless steel double-edge razor blades.",
        price: 150,
        cost: 50,
        category: "shaving" as const,
        brand: "SharpEdge",
        sku: "SHP-SH-001",
        stock: 100,
        minStock: 25,
        imageUrl: "https://images.unsplash.com/photo-1621607512022-6aecc4fed814?w=400",
        status: "active" as const,
        soldThisMonth: 45,
      },

      // Tools
      {
        name: "Professional Hair Clipper",
        description: "Cordless clipper with titanium blades. Includes 8 guard sizes.",
        price: 2850,
        cost: 1200,
        category: "tools" as const,
        brand: "BarberPro",
        sku: "BPR-TL-001",
        stock: 12,
        minStock: 3,
        imageUrl: "https://images.unsplash.com/photo-1621607512214-68297480165e?w=400",
        status: "active" as const,
        soldThisMonth: 5,
      },
      {
        name: "Beard Trimmer",
        description: "Precision trimmer for beard detailing. 20 length settings.",
        price: 1650,
        cost: 680,
        category: "tools" as const,
        brand: "BarberPro",
        sku: "BPR-TL-002",
        stock: 18,
        minStock: 5,
        imageUrl: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400",
        status: "active" as const,
        soldThisMonth: 9,
      },
      {
        name: "Styling Comb Set",
        description: "Set of 5 professional styling combs in different sizes.",
        price: 250,
        cost: 80,
        category: "tools" as const,
        brand: "TipunoX",
        sku: "TPX-TL-001",
        stock: 60,
        minStock: 15,
        imageUrl: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=400",
        status: "active" as const,
        soldThisMonth: 21,
      },
      {
        name: "Barber Scissors",
        description: "Japanese steel scissors for precision cutting. 6 inch blade.",
        price: 1450,
        cost: 580,
        category: "tools" as const,
        brand: "SharpEdge",
        sku: "SHP-TL-001",
        stock: 10,
        minStock: 3,
        imageUrl: "https://images.unsplash.com/photo-1582095133179-bfd08e2fc6b3?w=400",
        status: "active" as const,
        soldThisMonth: 4,
      },

      // Accessories
      {
        name: "TPX Branded Cap",
        description: "Snapback cap with embroidered TPX logo. One size fits all.",
        price: 450,
        cost: 150,
        category: "accessories" as const,
        brand: "TipunoX",
        sku: "TPX-AC-001",
        stock: 40,
        minStock: 10,
        imageUrl: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400",
        status: "active" as const,
        soldThisMonth: 16,
      },
      {
        name: "Dopp Kit Bag",
        description: "Premium leather toiletry bag for travel. Water-resistant lining.",
        price: 890,
        cost: 350,
        category: "accessories" as const,
        brand: "TipunoX",
        sku: "TPX-AC-002",
        stock: 22,
        minStock: 5,
        imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400",
        status: "active" as const,
        soldThisMonth: 7,
      },
      {
        name: "Shaving Brush",
        description: "Badger hair shaving brush for rich lather application.",
        price: 580,
        cost: 220,
        category: "accessories" as const,
        brand: "SmoothCut",
        sku: "SMC-AC-001",
        stock: 25,
        minStock: 6,
        imageUrl: "https://images.unsplash.com/photo-1621607512022-6aecc4fed814?w=400",
        status: "active" as const,
        soldThisMonth: 11,
      },
      {
        name: "Gift Card ₱500",
        description: "TPX Barbershop gift card. Valid for services and products.",
        price: 500,
        cost: 500,
        category: "accessories" as const,
        brand: "TipunoX",
        sku: "TPX-GC-500",
        stock: 999,
        minStock: 50,
        imageUrl: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400",
        status: "active" as const,
        soldThisMonth: 25,
      },
    ];

    // Insert all products
    const insertedIds = [];
    for (const product of products) {
      const id = await ctx.db.insert("products", {
        branch_id: branch1Id,
        ...product,
        createdAt: now,
        updatedAt: now,
      });
      insertedIds.push(id);
    }

    return {
      success: true,
      message: `Created ${insertedIds.length} products`,
      data: {
        totalProducts: insertedIds.length,
        byCategory: {
          "hair-care": products.filter((p) => p.category === "hair-care").length,
          "beard-care": products.filter((p) => p.category === "beard-care").length,
          shaving: products.filter((p) => p.category === "shaving").length,
          tools: products.filter((p) => p.category === "tools").length,
          accessories: products.filter((p) => p.category === "accessories").length,
        },
      },
    };
  },
});

/**
 * Clear all products
 * Run: npx convex run seed:clearProducts
 */
export const clearProducts = mutation({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();

    for (const product of products) {
      await ctx.db.delete(product._id);
    }

    return {
      success: true,
      message: `Cleared ${products.length} products`,
    };
  },
});

/**
 * Seed products for the admin product catalog (central warehouse)
 * Run: npx convex run seed:seedProductCatalog
 */
export const seedProductCatalog = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Get super admin user for created_by field
    const superAdmin = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "super_admin"))
      .first();

    if (!superAdmin) {
      throw new Error("No super_admin user found. Run seedAll first.");
    }

    // Check if catalog products already exist
    const existingProducts = await ctx.db.query("productCatalog").collect();
    if (existingProducts.length > 0) {
      return {
        success: false,
        message: `Product catalog already has ${existingProducts.length} products. Run clearProductCatalog first if you want to reseed.`,
      };
    }

    const products = [
      // Hair Care Products
      {
        name: "Premium Pomade",
        description: "Strong hold water-based pomade with natural shine. Easy to wash out.",
        price: 450,
        cost: 180,
        category: "hair-care",
        brand: "TipunoX",
        sku: "TPX-HC-001",
        stock: 50,
        minStock: 10,
        image_url: "https://images.unsplash.com/photo-1597854710175-69c14789c3e3?w=400",
      },
      {
        name: "Matte Clay Wax",
        description: "Medium hold matte finish clay for textured, natural looks.",
        price: 380,
        cost: 150,
        category: "hair-care",
        brand: "TipunoX",
        sku: "TPX-HC-002",
        stock: 35,
        minStock: 8,
        image_url: "https://images.unsplash.com/photo-1626808642875-0aa545482dfb?w=400",
      },
      {
        name: "Hair Growth Serum",
        description: "Biotin-enriched serum to promote healthy hair growth and thickness.",
        price: 750,
        cost: 320,
        category: "hair-care",
        brand: "GroMax",
        sku: "GMX-HC-001",
        stock: 25,
        minStock: 5,
        image_url: "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=400",
      },
      {
        name: "Anti-Dandruff Shampoo",
        description: "Medicated shampoo with zinc pyrithione for flake-free scalp.",
        price: 320,
        cost: 130,
        category: "hair-care",
        brand: "ClearHead",
        sku: "CLH-HC-001",
        stock: 40,
        minStock: 10,
        image_url: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=400",
      },
      {
        name: "Sea Salt Spray",
        description: "Creates beachy waves and texture with natural sea salt minerals.",
        price: 290,
        cost: 100,
        category: "hair-care",
        brand: "TipunoX",
        sku: "TPX-HC-003",
        stock: 30,
        minStock: 8,
        image_url: "https://images.unsplash.com/photo-1594998893017-36147cbcae05?w=400",
      },

      // Beard Care Products
      {
        name: "Beard Oil - Sandalwood",
        description: "Premium beard oil with sandalwood scent. Softens and conditions.",
        price: 420,
        cost: 170,
        category: "beard-care",
        brand: "BeardKing",
        sku: "BDK-BC-001",
        stock: 45,
        minStock: 10,
        image_url: "https://images.unsplash.com/photo-1621607512214-68297480165e?w=400",
      },
      {
        name: "Beard Balm",
        description: "Styling balm with light hold. Tames flyaways and adds shine.",
        price: 350,
        cost: 140,
        category: "beard-care",
        brand: "BeardKing",
        sku: "BDK-BC-002",
        stock: 38,
        minStock: 8,
        image_url: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400",
      },
      {
        name: "Beard Wash",
        description: "Gentle cleanser specifically formulated for facial hair.",
        price: 280,
        cost: 110,
        category: "beard-care",
        brand: "TipunoX",
        sku: "TPX-BC-001",
        stock: 42,
        minStock: 10,
        image_url: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=400",
      },
      {
        name: "Beard Growth Kit",
        description: "Complete kit with derma roller, growth serum, and beard oil.",
        price: 1250,
        cost: 500,
        category: "beard-care",
        brand: "GroMax",
        sku: "GMX-BC-001",
        stock: 15,
        minStock: 5,
        image_url: "https://images.unsplash.com/photo-1621607512022-6aecc4fed814?w=400",
      },

      // Shaving Products
      {
        name: "Classic Shaving Cream",
        description: "Rich lather shaving cream with aloe vera for smooth shaves.",
        price: 220,
        cost: 85,
        category: "shaving",
        brand: "TipunoX",
        sku: "TPX-SH-001",
        stock: 55,
        minStock: 12,
        image_url: "https://images.unsplash.com/photo-1585751119414-ef2636f8aede?w=400",
      },
      {
        name: "Pre-Shave Oil",
        description: "Prepares skin and softens stubble for a closer, irritation-free shave.",
        price: 340,
        cost: 130,
        category: "shaving",
        brand: "SmoothCut",
        sku: "SMC-SH-001",
        stock: 28,
        minStock: 8,
        image_url: "https://images.unsplash.com/photo-1621607512175-adf5eba23c09?w=400",
      },
      {
        name: "After Shave Balm",
        description: "Alcohol-free balm that soothes and hydrates post-shave skin.",
        price: 290,
        cost: 115,
        category: "shaving",
        brand: "TipunoX",
        sku: "TPX-SH-002",
        stock: 48,
        minStock: 10,
        image_url: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400",
      },
      {
        name: "Safety Razor Blades (10 pack)",
        description: "Premium stainless steel double-edge razor blades.",
        price: 150,
        cost: 50,
        category: "shaving",
        brand: "SharpEdge",
        sku: "SHP-SH-001",
        stock: 100,
        minStock: 25,
        image_url: "https://images.unsplash.com/photo-1621607512022-6aecc4fed814?w=400",
      },

      // Tools
      {
        name: "Professional Hair Clipper",
        description: "Cordless clipper with titanium blades. Includes 8 guard sizes.",
        price: 2850,
        cost: 1200,
        category: "tools",
        brand: "BarberPro",
        sku: "BPR-TL-001",
        stock: 12,
        minStock: 3,
        image_url: "https://images.unsplash.com/photo-1621607512214-68297480165e?w=400",
      },
      {
        name: "Beard Trimmer",
        description: "Precision trimmer for beard detailing. 20 length settings.",
        price: 1650,
        cost: 680,
        category: "tools",
        brand: "BarberPro",
        sku: "BPR-TL-002",
        stock: 18,
        minStock: 5,
        image_url: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400",
      },
      {
        name: "Styling Comb Set",
        description: "Set of 5 professional styling combs in different sizes.",
        price: 250,
        cost: 80,
        category: "tools",
        brand: "TipunoX",
        sku: "TPX-TL-001",
        stock: 60,
        minStock: 15,
        image_url: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=400",
      },
      {
        name: "Barber Scissors",
        description: "Japanese steel scissors for precision cutting. 6 inch blade.",
        price: 1450,
        cost: 580,
        category: "tools",
        brand: "SharpEdge",
        sku: "SHP-TL-001",
        stock: 10,
        minStock: 3,
        image_url: "https://images.unsplash.com/photo-1582095133179-bfd08e2fc6b3?w=400",
      },

      // Accessories
      {
        name: "TPX Branded Cap",
        description: "Snapback cap with embroidered TPX logo. One size fits all.",
        price: 450,
        cost: 150,
        category: "accessories",
        brand: "TipunoX",
        sku: "TPX-AC-001",
        stock: 40,
        minStock: 10,
        image_url: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400",
      },
      {
        name: "Dopp Kit Bag",
        description: "Premium leather toiletry bag for travel. Water-resistant lining.",
        price: 890,
        cost: 350,
        category: "accessories",
        brand: "TipunoX",
        sku: "TPX-AC-002",
        stock: 22,
        minStock: 5,
        image_url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400",
      },
      {
        name: "Shaving Brush",
        description: "Badger hair shaving brush for rich lather application.",
        price: 580,
        cost: 220,
        category: "accessories",
        brand: "SmoothCut",
        sku: "SMC-AC-001",
        stock: 25,
        minStock: 6,
        image_url: "https://images.unsplash.com/photo-1621607512022-6aecc4fed814?w=400",
      },
      {
        name: "Gift Card ₱500",
        description: "TPX Barbershop gift card. Valid for services and products.",
        price: 500,
        cost: 500,
        category: "accessories",
        brand: "TipunoX",
        sku: "TPX-GC-500",
        stock: 999,
        minStock: 50,
        image_url: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400",
      },
    ];

    // Insert all products into productCatalog
    const insertedIds = [];
    for (const product of products) {
      const id = await ctx.db.insert("productCatalog", {
        ...product,
        is_active: true,
        price_enforced: false,
        created_at: now,
        created_by: superAdmin._id,
      });
      insertedIds.push(id);
    }

    return {
      success: true,
      message: `Created ${insertedIds.length} products in catalog`,
      data: {
        totalProducts: insertedIds.length,
        byCategory: {
          "hair-care": products.filter((p) => p.category === "hair-care").length,
          "beard-care": products.filter((p) => p.category === "beard-care").length,
          shaving: products.filter((p) => p.category === "shaving").length,
          tools: products.filter((p) => p.category === "tools").length,
          accessories: products.filter((p) => p.category === "accessories").length,
        },
      },
    };
  },
});

/**
 * Clear all product catalog items
 * Run: npx convex run seed:clearProductCatalog
 */
export const clearProductCatalog = mutation({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("productCatalog").collect();

    for (const product of products) {
      await ctx.db.delete(product._id);
    }

    return {
      success: true,
      message: `Cleared ${products.length} products from catalog`,
    };
  },
});
