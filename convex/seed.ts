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

      // Create a customer user
      await ctx.db.insert("users", {
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

      return {
        success: true,
        message: "Seed data created successfully",
        data: {
          branches: 2,
          services: 3,
          users: 6,
          barbers: 3,
          timeAttendanceRecords: 10,
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

    // Create a customer
    await ctx.db.insert("users", {
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

    return {
      success: true,
      message: "Data cleared and re-seeded successfully",
      data: {
        branches: 2,
        services: 3,
        users: 6,
        barbers: 3,
        timeAttendanceRecords: 11,
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
