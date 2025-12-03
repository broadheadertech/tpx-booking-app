import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { throwUserError, ERROR_CODES, validateInput } from "../utils/errors";

// Get all barbers (for super admin)
export const getAllBarbers = query({
  args: {},
  handler: async (ctx) => {
    const barbers = await ctx.db.query("barbers").collect();

    // Get associated user and branch data for each barber
    const barbersWithUsers = await Promise.all(
      barbers.map(async (barber) => {
        const [user, branch] = await Promise.all([
          ctx.db.get(barber.user),
          ctx.db.get(barber.branch_id),
        ]);
        return {
          ...barber,
          name: barber.full_name,
          email: user?.email || '',
          phone: user?.mobile_number || '',
          avatarUrl: barber.avatar || '/img/avatar_default.jpg',
          branch_name: branch?.name || 'Unknown Branch',
        };
      })
    );

    return barbersWithUsers;
  },
});

// Get barbers by branch
export const getBarbersByBranch = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    const barbers = await ctx.db
      .query("barbers")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    // Get associated user data for each barber
    const barbersWithUsers = await Promise.all(
      barbers.map(async (barber) => {
        const user = await ctx.db.get(barber.user);
        return {
          ...barber,
          name: barber.full_name,
          email: user?.email || '',
          phone: user?.mobile_number || '',
          avatarUrl: barber.avatar || '/img/avatar_default.jpg',
        };
      })
    );

    return barbersWithUsers;
  },
});

// Get barber by ID
export const getBarberById = query({
  args: { id: v.id("barbers") },
  handler: async (ctx, args) => {
    const barber = await ctx.db.get(args.id);
    if (!barber) return null;

    const user = await ctx.db.get(barber.user);
    return {
      ...barber,
      name: barber.full_name,
      email: user?.email || '',
      phone: user?.mobile_number || '',
      avatarUrl: barber.avatar || '/img/avatar_default.jpg',
    };
  },
});

// Create new barber
export const createBarber = mutation({
  args: {
    user: v.id("users"),
    branch_id: v.id("branches"),
    full_name: v.string(),
    is_active: v.boolean(),
    services: v.array(v.id("services")),
    email: v.string(),
    phone: v.optional(v.string()),
    avatar: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
    experience: v.optional(v.string()),
    specialties: v.optional(v.array(v.string())),
    schedule_type: v.optional(v.union(v.literal("weekly"), v.literal("specific_dates"))),
    specific_dates: v.optional(v.array(v.object({
      date: v.string(),
      available: v.boolean(),
      start: v.string(),
      end: v.string()
    }))),
  },
  handler: async (ctx, args) => {
    // Check if user already has a barber profile
    const existingBarber = await ctx.db
      .query("barbers")
      .withIndex("by_user", (q) => q.eq("user", args.user))
      .first();

    if (existingBarber) {
      throwUserError(ERROR_CODES.BARBER_PROFILE_EXISTS);
    }

    // Validate required checks
    const user = await ctx.db.get(args.user);
    if (!user) {
      throwUserError(ERROR_CODES.RESOURCE_NOT_FOUND, "User not found", "The user you are trying to assign as a barber does not exist.");
    }

    const branch = await ctx.db.get(args.branch_id);
    if (!branch) {
      throwUserError(ERROR_CODES.RESOURCE_NOT_FOUND, "Branch not found", "The selected branch does not exist.");
    }

    if (args.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(args.email)) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Invalid email", "Please provide a valid email address.");
    }

    // Validate services existence
    for (const serviceId of args.services) {
      const service = await ctx.db.get(serviceId);
      if (!service) {
        throwUserError(ERROR_CODES.BOOKING_SERVICE_UNAVAILABLE, "Service not found", "One or more selected services do not exist.");
      }
    }

    const barberId = await ctx.db.insert("barbers", {
      user: args.user,
      branch_id: args.branch_id,
      full_name: args.full_name,
      is_active: args.is_active,
      services: args.services,
      email: args.email,
      phone: args.phone || undefined,
      avatar: args.avatar || undefined,
      avatarStorageId: args.avatarStorageId || undefined,
      experience: args.experience || '0 years',
      rating: 0,
      totalBookings: 0,
      monthlyRevenue: 0,
      specialties: args.specialties || [],
      schedule: {
        monday: { available: true, start: '09:00', end: '22:00' },
        tuesday: { available: true, start: '09:00', end: '22:00' },
        wednesday: { available: true, start: '09:00', end: '22:00' },
        thursday: { available: true, start: '09:00', end: '22:00' },
        friday: { available: true, start: '09:00', end: '22:00' },
        saturday: { available: true, start: '09:00', end: '22:00' },
        sunday: { available: false, start: '09:00', end: '22:00' },
      },
      schedule_type: args.schedule_type || 'weekly',
      specific_dates: args.specific_dates || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return barberId;
  },
});

// Update barber
export const updateBarber = mutation({
  args: {
    id: v.id("barbers"),
    full_name: v.optional(v.string()),
    is_active: v.optional(v.boolean()),
    is_accepting_bookings: v.optional(v.boolean()),
    services: v.optional(v.array(v.id("services"))),
    email: v.optional(v.string()),
    blocked_periods: v.optional(v.array(v.object({
      date: v.string(),
      start_time: v.optional(v.string()),
      end_time: v.optional(v.string()),
      reason: v.optional(v.string())
    }))),
    phone: v.optional(v.string()),
    avatar: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
    bio: v.optional(v.string()),
    experience: v.optional(v.string()),
    specialties: v.optional(v.array(v.string())),
    schedule: v.optional(v.object({
      monday: v.object({ available: v.boolean(), start: v.string(), end: v.string() }),
      tuesday: v.object({ available: v.boolean(), start: v.string(), end: v.string() }),
      wednesday: v.object({ available: v.boolean(), start: v.string(), end: v.string() }),
      thursday: v.object({ available: v.boolean(), start: v.string(), end: v.string() }),
      friday: v.object({ available: v.boolean(), start: v.string(), end: v.string() }),
      saturday: v.object({ available: v.boolean(), start: v.string(), end: v.string() }),
      sunday: v.object({ available: v.boolean(), start: v.string(), end: v.string() }),
    })),
    schedule_type: v.optional(v.union(v.literal("weekly"), v.literal("specific_dates"))),
    specific_dates: v.optional(v.array(v.object({
      date: v.string(),
      available: v.boolean(),
      start: v.string(),
      end: v.string()
    }))),
    custom_booking_enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    const barber = await ctx.db.get(id);
    if (!barber) {
      throwUserError(ERROR_CODES.BARBER_NOT_FOUND);
    }

    if (updates.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email)) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Invalid email", "Please provide a valid email address.");
    }

    if (updates.services) {
      for (const serviceId of updates.services) {
        const service = await ctx.db.get(serviceId);
        if (!service) {
          throwUserError(ERROR_CODES.BOOKING_SERVICE_UNAVAILABLE, "Service not found", "One or more selected services do not exist.");
        }
      }
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return id;
  },
});

// Update barber password
export const updateBarberPassword = mutation({
  args: {
    barberId: v.id("barbers"),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    // Get barber to find associated user
    const barber = await ctx.db.get(args.barberId);
    if (!barber) {
      throwUserError(ERROR_CODES.BARBER_NOT_FOUND);
    }

    // Update user password
    await ctx.db.patch(barber.user, {
      password: args.newPassword, // In production, this should be hashed
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Delete barber
export const deleteBarber = mutation({
  args: { id: v.id("barbers") },
  handler: async (ctx, args) => {
    const barber = await ctx.db.get(args.id);
    if (!barber) {
      throwUserError(ERROR_CODES.BARBER_NOT_FOUND);
    }
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// Get barbers by service
export const getBarbersByService = query({
  args: { serviceId: v.id("services") },
  handler: async (ctx, args) => {
    const allBarbers = await ctx.db.query("barbers").collect();
    const barbers = allBarbers.filter(barber =>
      barber.services.includes(args.serviceId)
    );

    // Get associated user data
    const barbersWithUsers = await Promise.all(
      barbers.map(async (barber) => {
        const user = await ctx.db.get(barber.user);
        return {
          ...barber,
          name: barber.full_name,
          email: user?.email || '',
          phone: user?.mobile_number || '',
          avatarUrl: barber.avatar || '/img/avatar_default.jpg',
        };
      })
    );

    return barbersWithUsers;
  },
});

// Get active barbers
export const getActiveBarbers = query({
  args: {},
  handler: async (ctx) => {
    const barbers = await ctx.db
      .query("barbers")
      .withIndex("by_active", (q) => q.eq("is_active", true))
      .collect();

    // Get associated user data for each barber
    const barbersWithUsers = await Promise.all(
      barbers.map(async (barber) => {
        const user = await ctx.db.get(barber.user);
        return {
          ...barber,
          name: barber.full_name,
          email: user?.email || '',
          phone: user?.mobile_number || '',
          avatarUrl: barber.avatar || '/img/avatar_default.jpg',
        };
      })
    );

    return barbersWithUsers;
  },
});

// Create barber profile for user with barber role
export const createBarberProfile = mutation({
  args: {
    userId: v.id("users"),
    branch_id: v.optional(v.id("branches")),
  },
  handler: async (ctx, args) => {
    // Get user data
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throwUserError(ERROR_CODES.BARBER_NOT_FOUND, "User account not found.", "The user account you're trying to create a barber profile for doesn't exist.");
    }

    if (user.role !== "barber") {
      throwUserError(ERROR_CODES.BARBER_INVALID_ROLE);
    }

    // Use branch_id from args or user's branch_id
    const branchId = args.branch_id || user.branch_id;
    if (!branchId) {
      throwUserError(ERROR_CODES.VALIDATION_ERROR, "Branch ID is required", "The barber must be assigned to a branch.");
    }

    // Check if user already has a barber profile
    const existingBarber = await ctx.db
      .query("barbers")
      .withIndex("by_user", (q) => q.eq("user", args.userId))
      .first();

    if (existingBarber) {
      return existingBarber._id; // Return existing profile
    }

    // Create new barber profile
    const barberId = await ctx.db.insert("barbers", {
      user: args.userId,
      branch_id: branchId,
      full_name: user.username, // Use username as default full name
      is_active: true,
      services: [], // Empty services array initially
      email: user.email,
      phone: user.mobile_number || undefined,
      avatar: user.avatar || undefined,
      avatarStorageId: undefined, // No storage ID initially
      experience: '0 years',
      rating: 0,
      totalBookings: 0,
      monthlyRevenue: 0,
      specialties: [],
      schedule: {
        monday: { available: true, start: '09:00', end: '22:00' },
        tuesday: { available: true, start: '09:00', end: '22:00' },
        wednesday: { available: true, start: '09:00', end: '22:00' },
        thursday: { available: true, start: '09:00', end: '22:00' },
        friday: { available: true, start: '09:00', end: '22:00' },
        saturday: { available: true, start: '09:00', end: '22:00' },
        sunday: { available: false, start: '09:00', end: '22:00' },
      },
      schedule_type: 'weekly',
      specific_dates: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return barberId;
  },
});

// Create barber with user account
export const createBarberWithAccount = mutation({
  args: {
    username: v.string(),
    email: v.string(),
    password: v.string(),
    mobile_number: v.string(),
    full_name: v.string(),
    is_active: v.boolean(),
    services: v.array(v.id("services")),
    branch_id: v.id("branches"),
    phone: v.optional(v.string()),
    avatar: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
    experience: v.optional(v.string()),
    specialties: v.optional(v.array(v.string())),
    schedule: v.optional(v.object({
      monday: v.object({ available: v.boolean(), start: v.string(), end: v.string() }),
      tuesday: v.object({ available: v.boolean(), start: v.string(), end: v.string() }),
      wednesday: v.object({ available: v.boolean(), start: v.string(), end: v.string() }),
      thursday: v.object({ available: v.boolean(), start: v.string(), end: v.string() }),
      friday: v.object({ available: v.boolean(), start: v.string(), end: v.string() }),
      saturday: v.object({ available: v.boolean(), start: v.string(), end: v.string() }),
      sunday: v.object({ available: v.boolean(), start: v.string(), end: v.string() }),
    })),
    schedule_type: v.optional(v.union(v.literal("weekly"), v.literal("specific_dates"))),
    specific_dates: v.optional(v.array(v.object({
      date: v.string(),
      available: v.boolean(),
      start: v.string(),
      end: v.string()
    }))),
  },
  handler: async (ctx, args) => {
    try {
      // Validate required fields
      console.log('[createBarberWithAccount] Creating barber with data:', {
        username: args.username,
        email: args.email,
        full_name: args.full_name,
        mobile_number: args.mobile_number,
        branch_id: args.branch_id,
        services: args.services?.length || 0
      });

      if (!args.username?.trim()) {
        throwUserError(ERROR_CODES.INVALID_INPUT, "Username is required", "Please provide a username for the barber account.");
      }
      if (!args.email?.trim()) {
        throwUserError(ERROR_CODES.INVALID_INPUT, "Email is required", "Please provide an email address.");
      }
      if (!args.password?.trim()) {
        throwUserError(ERROR_CODES.INVALID_INPUT, "Password is required", "Please provide a password for the account.");
      }
      if (!args.mobile_number?.trim()) {
        throwUserError(ERROR_CODES.INVALID_INPUT, "Mobile number is required", "Please provide a valid mobile number.");
      }
      if (!args.full_name?.trim()) {
        throwUserError(ERROR_CODES.INVALID_INPUT, "Full name is required", "Please provide the barber's full name.");
      }
      if (!args.branch_id) {
        throwUserError(ERROR_CODES.VALIDATION_ERROR, "Branch ID is required", "The barber must be assigned to a branch.");
      }
      if (!args.services || args.services.length === 0) {
        throwUserError(ERROR_CODES.INVALID_INPUT, "At least one service must be selected", "Please select one or more services that the barber offers.");
      }

      // Check if email already exists
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", args.email))
        .first();

      if (existingUser) {
        throwUserError(ERROR_CODES.AUTH_EMAIL_EXISTS, `Email ${args.email} is already in use`, "This email is already registered in the system. Please use a different email address.");
      }

      // Check if username already exists
      const existingUsername = await ctx.db
        .query("users")
        .withIndex("by_username", (q) => q.eq("username", args.username))
        .first();

      if (existingUsername) {
        throwUserError(ERROR_CODES.AUTH_USERNAME_EXISTS, `Username "${args.username}" is already taken`, "This username is already in use. Please choose a different username.");
      }

      // Validate that all services exist and belong to the branch
      for (const serviceId of args.services) {
        const service = await ctx.db.get(serviceId);
        if (!service) {
          throwUserError(ERROR_CODES.BOOKING_SERVICE_UNAVAILABLE, `Service not found`, "One or more selected services could not be found. Please verify and try again.");
        }
        if (service.branch_id !== args.branch_id) {
          throwUserError(ERROR_CODES.VALIDATION_ERROR, `Service does not belong to this branch`, `The service "${service.name}" does not belong to the selected branch.`);
        }
      }

      // Create user account
      console.log('[createBarberWithAccount] Creating user account...');
      const userId = await ctx.db.insert("users", {
        username: args.username.trim(),
        email: args.email.trim(),
        password: args.password, // In production, this should be hashed
        mobile_number: args.mobile_number.trim(),
        nickname: undefined,
        birthday: undefined,
        role: "barber",
        branch_id: args.branch_id,
        is_active: true,
        avatar: args.avatar || undefined,
        bio: undefined,
        skills: [],
        isVerified: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      console.log('[createBarberWithAccount] User created:', userId);

      // Create barber profile
      console.log('[createBarberWithAccount] Creating barber profile...');
      const barberId = await ctx.db.insert("barbers", {
        user: userId,
        branch_id: args.branch_id,
        full_name: args.full_name.trim(),
        is_active: args.is_active,
        services: args.services,
        email: args.email.trim(),
        phone: args.phone?.trim() || undefined,
        avatar: args.avatar || undefined,
        avatarStorageId: args.avatarStorageId || undefined,
        experience: args.experience?.trim() || '0 years',
        rating: 0,
        totalBookings: 0,
        monthlyRevenue: 0,
        specialties: args.specialties || [],
        schedule: args.schedule || {
          monday: { available: true, start: '09:00', end: '22:00' },
          tuesday: { available: true, start: '09:00', end: '22:00' },
          wednesday: { available: true, start: '09:00', end: '22:00' },
          thursday: { available: true, start: '09:00', end: '22:00' },
          friday: { available: true, start: '09:00', end: '22:00' },
          saturday: { available: true, start: '09:00', end: '22:00' },
          sunday: { available: false, start: '09:00', end: '22:00' },
        },
        schedule_type: args.schedule_type || 'weekly',
        specific_dates: args.specific_dates || [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      console.log('[createBarberWithAccount] Barber profile created:', barberId);

      return { userId, barberId };
    } catch (error) {
      console.error('[createBarberWithAccount] Error:', error);
      // Re-throw errors as-is since throwUserError already provides user-friendly messages
      throw error;
    }
  },
});

// Generate upload URL for barber avatars
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Get avatar URL from storage ID
export const getImageUrl = query({
  args: {
    storageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    if (!args.storageId || args.storageId === "") {
      return null;
    }
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Delete avatar from storage
export const deleteImage = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await ctx.storage.delete(args.storageId);
    return { success: true };
  },
});

// Get barber statistics with time period filter
export const getBarberStatsByPeriod = query({
  args: {
    barberId: v.id("barbers"),
    period: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("yearly"),
      v.literal("all_time")
    ),
  },
  handler: async (ctx, args) => {
    const barber = await ctx.db.get(args.barberId);
    if (!barber) return null;

    // Get all bookings for this barber
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_barber", (q) => q.eq("barber", args.barberId))
      .collect();

    // Get all transactions for this barber
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_barber", (q) => q.eq("barber", args.barberId))
      .filter((q) => q.eq(q.field("payment_status"), "completed"))
      .collect();

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;

    switch (args.period) {
      case "daily":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "weekly":
        const dayOfWeek = now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
        break;
      case "monthly":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "yearly":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case "all_time":
      default:
        startDate = new Date(0);
        break;
    }

    const startTimestamp = startDate.getTime();

    // Filter bookings by period
    const filteredBookings = bookings.filter((booking) => {
      const bookingDate = new Date(booking.date).getTime();
      return bookingDate >= startTimestamp;
    });

    // Filter transactions by period
    const filteredTransactions = transactions.filter((transaction) => {
      return transaction.createdAt >= startTimestamp;
    });

    // Calculate stats
    const totalBookings = filteredBookings.length;
    const completedBookings = filteredBookings.filter((b) => b.status === "completed").length;
    const cancelledBookings = filteredBookings.filter((b) => b.status === "cancelled").length;
    const pendingBookings = filteredBookings.filter((b) => b.status === "pending" || b.status === "booked" || b.status === "confirmed").length;

    const totalRevenue = filteredTransactions.reduce(
      (sum, t) => sum + t.total_amount,
      0
    );

    // Get unique customers
    const uniqueCustomers = new Set(
      filteredBookings
        .filter((b) => b.customer)
        .map((b) => b.customer?.toString())
    ).size;

    // ========== COMMISSION CALCULATIONS ==========

    // Get service commission rates for this branch
    const serviceRates = await ctx.db
      .query("service_commission_rates")
      .withIndex("by_branch", (q) => q.eq("branch_id", barber.branch_id))
      .filter((q) => q.eq(q.field("is_active"), true))
      .collect();

    const serviceRateMap = new Map<string, number>();
    for (const r of serviceRates) {
      serviceRateMap.set(r.service_id as string, r.commission_rate);
    }

    // Get product commission rates for this branch
    const productRates = await ctx.db
      .query("product_commission_rates")
      .withIndex("by_branch", (q) => q.eq("branch_id", barber.branch_id))
      .filter((q) => q.eq(q.field("is_active"), true))
      .collect();

    const productRateMap = new Map<string, { type: string; rate?: number; amount?: number }>();
    for (const r of productRates) {
      productRateMap.set(r.product_id as string, {
        type: r.commission_type,
        rate: r.commission_rate,
        amount: r.fixed_amount,
      });
    }

    // Get barber's individual commission rate
    const barberCommissionRate = await ctx.db
      .query("barber_commission_rates")
      .withIndex("by_barber_active", (q) =>
        q.eq("barber_id", args.barberId).eq("is_active", true)
      )
      .first();

    // Get branch default commission rate
    const payrollSettings = await ctx.db
      .query("payroll_settings")
      .withIndex("by_branch", (q) => q.eq("branch_id", barber.branch_id))
      .filter((q) => q.eq(q.field("is_active"), true))
      .first();

    const fallbackRate = barberCommissionRate?.commission_rate ||
      payrollSettings?.default_commission_rate || 10;

    // Get barber's daily rate
    const barberDailyRate = await ctx.db
      .query("barber_daily_rates")
      .withIndex("by_barber_active", (q) =>
        q.eq("barber_id", args.barberId).eq("is_active", true)
      )
      .first();

    const dailyRate = barberDailyRate?.daily_rate || 0;

    // Calculate service commission from completed & paid bookings
    let serviceCommission = 0;
    let serviceRevenue = 0;
    const completedPaidBookings = filteredBookings.filter(
      (b) => b.status === "completed" && b.payment_status === "paid"
    );

    // Track commission per day for daily rate comparison
    const dailyServiceCommission = new Map<string, number>();

    for (const booking of completedPaidBookings) {
      const price = booking.price || 0;
      serviceRevenue += price;

      // Get commission rate for this service
      const serviceRate = serviceRateMap.get(String(booking.service)) ?? fallbackRate;
      const bookingCommission = (price * serviceRate) / 100;
      serviceCommission += bookingCommission;

      // Track daily commission
      const dateKey = booking.date || new Date(booking.updatedAt).toISOString().split("T")[0];
      const currentDayComm = dailyServiceCommission.get(dateKey) || 0;
      dailyServiceCommission.set(dateKey, currentDayComm + bookingCommission);
    }

    // Calculate product commission from transactions
    let productCommission = 0;
    let productRevenue = 0;
    const dailyProductCommission = new Map<string, number>();

    for (const transaction of filteredTransactions) {
      if (transaction.products) {
        for (const product of transaction.products) {
          const revenue = product.price * product.quantity;
          productRevenue += revenue;

          // Get commission for this product
          const productConfig = productRateMap.get(product.product_id);
          let prodComm = 0;

          if (productConfig) {
            if (productConfig.type === "fixed_amount" && productConfig.amount !== undefined) {
              prodComm = productConfig.amount * product.quantity;
            } else if (productConfig.type === "percentage" && productConfig.rate !== undefined) {
              prodComm = (revenue * productConfig.rate) / 100;
            } else {
              prodComm = (revenue * fallbackRate) / 100;
            }
          } else {
            prodComm = (revenue * fallbackRate) / 100;
          }

          productCommission += prodComm;

          // Track daily product commission
          const dateKey = new Date(transaction.createdAt).toISOString().split("T")[0];
          const currentDayProdComm = dailyProductCommission.get(dateKey) || 0;
          dailyProductCommission.set(dateKey, currentDayProdComm + prodComm);
        }
      }
    }

    // Calculate final earnings using daily rate comparison
    // For each day: max(service_commission, daily_rate) + product_commission
    const allWorkDates = new Set([
      ...dailyServiceCommission.keys(),
      ...dailyProductCommission.keys(),
    ]);

    let totalEarnings = 0;
    const daysWorked = allWorkDates.size;

    for (const dateKey of allWorkDates) {
      const dayServiceComm = dailyServiceCommission.get(dateKey) || 0;
      const dayProductComm = dailyProductCommission.get(dateKey) || 0;

      // Service pay = max(service commission, daily rate)
      const dayServicePay = Math.max(dayServiceComm, dailyRate);
      // Product commission is added on top
      const dayTotal = dayServicePay + dayProductComm;

      totalEarnings += dayTotal;
    }

    // Gross commission (before daily rate comparison)
    const grossCommission = serviceCommission + productCommission;

    return {
      period: args.period,
      totalBookings,
      completedBookings,
      cancelledBookings,
      pendingBookings,
      totalRevenue, // Total booking/transaction value
      uniqueCustomers,
      averageBookingValue: totalBookings > 0 ? totalRevenue / totalBookings : 0,

      // Commission data
      serviceRevenue,
      serviceCommission,
      productRevenue,
      productCommission,
      grossCommission,
      dailyRate,
      daysWorked,
      totalEarnings, // Final earnings after daily rate comparison
      commissionRate: fallbackRate,
    };
  },
});

// Get top barbers by performance (for ranking/tiering)
export const getTopBarbers = query({
  args: {
    branch_id: v.optional(v.id("branches")),
    limit: v.optional(v.number()),
    period: v.optional(
      v.union(
        v.literal("monthly"),
        v.literal("yearly"),
        v.literal("all_time")
      )
    ),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const period = args.period || "monthly";

    // Get barbers (optionally filtered by branch)
    let barbers;
    if (args.branch_id) {
      barbers = await ctx.db
        .query("barbers")
        .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
        .filter((q) => q.eq(q.field("is_active"), true))
        .collect();
    } else {
      barbers = await ctx.db
        .query("barbers")
        .withIndex("by_active", (q) => q.eq("is_active", true))
        .collect();
    }

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "monthly":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "yearly":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case "all_time":
      default:
        startDate = new Date(0);
        break;
    }

    const startTimestamp = startDate.getTime();

    // Get performance data for each barber
    const barberPerformance = await Promise.all(
      barbers.map(async (barber) => {
        // Get bookings
        const bookings = await ctx.db
          .query("bookings")
          .withIndex("by_barber", (q) => q.eq("barber", barber._id))
          .collect();

        const filteredBookings = bookings.filter((b) => {
          const bookingDate = new Date(b.date).getTime();
          return bookingDate >= startTimestamp;
        });

        // Get transactions
        const transactions = await ctx.db
          .query("transactions")
          .withIndex("by_barber", (q) => q.eq("barber", barber._id))
          .filter((q) => q.eq(q.field("payment_status"), "completed"))
          .collect();

        const filteredTransactions = transactions.filter(
          (t) => t.createdAt >= startTimestamp
        );

        const completedBookings = filteredBookings.filter(
          (b) => b.status === "completed"
        ).length;

        const totalRevenue = filteredTransactions.reduce(
          (sum, t) => sum + t.total_amount,
          0
        );

        // Calculate performance score (weighted)
        const performanceScore =
          completedBookings * 10 + // 10 points per completed booking
          barber.rating * 20 + // 20 points per rating star
          totalRevenue * 0.01; // 0.01 points per peso revenue

        // Determine tier based on performance
        let tier: "platinum" | "gold" | "silver" | "bronze";
        if (performanceScore >= 1000) tier = "platinum";
        else if (performanceScore >= 500) tier = "gold";
        else if (performanceScore >= 200) tier = "silver";
        else tier = "bronze";

        return {
          _id: barber._id,
          full_name: barber.full_name,
          avatar: barber.avatar,
          rating: barber.rating,
          totalBookings: barber.totalBookings,
          completedBookings,
          totalRevenue,
          performanceScore,
          tier,
          branch_id: barber.branch_id,
        };
      })
    );

    // Sort by performance score and limit
    return barberPerformance
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .slice(0, limit);
  },
});

// Get barber activities (recent actions/events)
export const getBarberActivities = query({
  args: {
    barberId: v.id("barbers"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    const barber = await ctx.db.get(args.barberId);
    if (!barber) return [];

    // Get recent bookings
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_barber", (q) => q.eq("barber", args.barberId))
      .order("desc")
      .take(limit);

    // Get recent transactions
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_barber", (q) => q.eq("barber", args.barberId))
      .order("desc")
      .take(limit);

    // Get recent ratings
    const ratings = await ctx.db
      .query("ratings")
      .withIndex("by_barber", (q) => q.eq("barber_id", args.barberId))
      .order("desc")
      .take(limit);

    // Combine and format activities
    const activities: Array<{
      type: "booking" | "transaction" | "rating";
      timestamp: number;
      title: string;
      description: string;
      metadata?: Record<string, unknown>;
    }> = [];

    // Add booking activities
    for (const booking of bookings) {
      const service = await ctx.db.get(booking.service);
      activities.push({
        type: "booking",
        timestamp: booking.updatedAt,
        title: `Booking ${booking.status}`,
        description: `${booking.customer_name || "Customer"} - ${service?.name || "Service"}`,
        metadata: {
          booking_code: booking.booking_code,
          status: booking.status,
          date: booking.date,
          time: booking.time,
        },
      });
    }

    // Add transaction activities
    for (const transaction of transactions) {
      activities.push({
        type: "transaction",
        timestamp: transaction.createdAt,
        title: `Transaction ${transaction.payment_status}`,
        description: `₱${transaction.total_amount.toLocaleString()} via ${transaction.payment_method}`,
        metadata: {
          transaction_id: transaction.transaction_id,
          amount: transaction.total_amount,
          payment_method: transaction.payment_method,
        },
      });
    }

    // Add rating activities
    for (const rating of ratings) {
      activities.push({
        type: "rating",
        timestamp: rating.created_at,
        title: `New ${rating.rating}-star rating`,
        description: rating.feedback || "No feedback provided",
        metadata: {
          rating: rating.rating,
          feedback: rating.feedback,
        },
      });
    }

    // Sort by timestamp and limit
    return activities
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  },
});
