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
