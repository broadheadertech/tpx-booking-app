import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { throwUserError, ERROR_CODES, validateInput } from "../utils/errors";

// Get all barbers
export const getAllBarbers = query({
  args: {},
  handler: async (ctx) => {
    const barbers = await ctx.db.query("barbers").collect();

    // Get associated user data for each barber
    const barbersWithUsers = await Promise.all(
      barbers.map(async (barber) => {
        const user = await ctx.db.get(barber.user);
        return {
          ...barber,
          name: barber.full_name,
          email: user?.email || '',
          phone: user?.mobile_number || '',
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
    };
  },
});

// Create new barber
export const createBarber = mutation({
  args: {
    user: v.id("users"),
    full_name: v.string(),
    is_active: v.boolean(),
    services: v.array(v.id("services")),
    email: v.string(),
    phone: v.optional(v.string()),
    avatar: v.optional(v.string()),
    experience: v.optional(v.string()),
    specialties: v.optional(v.array(v.string())),
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

    const barberId = await ctx.db.insert("barbers", {
      user: args.user,
      full_name: args.full_name,
      is_active: args.is_active,
      services: args.services,
      email: args.email,
      phone: args.phone || undefined,
      avatar: args.avatar || undefined,
      experience: args.experience || '0 years',
      rating: 0,
      totalBookings: 0,
      monthlyRevenue: 0,
      specialties: args.specialties || [],
      schedule: {
        monday: { available: true, start: '09:00', end: '17:00' },
        tuesday: { available: true, start: '09:00', end: '17:00' },
        wednesday: { available: true, start: '09:00', end: '17:00' },
        thursday: { available: true, start: '09:00', end: '17:00' },
        friday: { available: true, start: '09:00', end: '17:00' },
        saturday: { available: true, start: '09:00', end: '17:00' },
        sunday: { available: false, start: '09:00', end: '17:00' },
      },
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
    services: v.optional(v.array(v.id("services"))),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    avatar: v.optional(v.string()),
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
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return id;
  },
});

// Delete barber
export const deleteBarber = mutation({
  args: { id: v.id("barbers") },
  handler: async (ctx, args) => {
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
      full_name: user.username, // Use username as default full name
      is_active: true,
      services: [], // Empty services array initially
      email: user.email,
      phone: user.mobile_number || undefined,
      avatar: user.avatar || undefined,
      experience: '0 years',
      rating: 0,
      totalBookings: 0,
      monthlyRevenue: 0,
      specialties: [],
      schedule: {
        monday: { available: true, start: '09:00', end: '17:00' },
        tuesday: { available: true, start: '09:00', end: '17:00' },
        wednesday: { available: true, start: '09:00', end: '17:00' },
        thursday: { available: true, start: '09:00', end: '17:00' },
        friday: { available: true, start: '09:00', end: '17:00' },
        saturday: { available: true, start: '09:00', end: '17:00' },
        sunday: { available: false, start: '09:00', end: '17:00' },
      },
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
    phone: v.optional(v.string()),
    avatar: v.optional(v.string()),
    experience: v.optional(v.string()),
    specialties: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Check if email already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      throwUserError(ERROR_CODES.AUTH_EMAIL_EXISTS);
    }

    // Check if username already exists
    const existingUsername = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (existingUsername) {
      throwUserError(ERROR_CODES.AUTH_USERNAME_EXISTS);
    }

    // Create user account
    const userId = await ctx.db.insert("users", {
      username: args.username,
      email: args.email,
      password: args.password, // In production, this should be hashed
      mobile_number: args.mobile_number,
      nickname: undefined,
      birthday: undefined,
      role: "barber",
      is_active: true,
      avatar: args.avatar,
      bio: undefined,
      skills: [],
      isVerified: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create barber profile
    const barberId = await ctx.db.insert("barbers", {
      user: userId,
      full_name: args.full_name,
      is_active: args.is_active,
      services: args.services,
      email: args.email,
      phone: args.phone || undefined,
      avatar: args.avatar || undefined,
      experience: args.experience || '0 years',
      rating: 0,
      totalBookings: 0,
      monthlyRevenue: 0,
      specialties: args.specialties || [],
      schedule: {
        monday: { available: true, start: '09:00', end: '17:00' },
        tuesday: { available: true, start: '09:00', end: '17:00' },
        wednesday: { available: true, start: '09:00', end: '17:00' },
        thursday: { available: true, start: '09:00', end: '17:00' },
        friday: { available: true, start: '09:00', end: '17:00' },
        saturday: { available: true, start: '09:00', end: '17:00' },
        sunday: { available: false, start: '09:00', end: '17:00' },
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { userId, barberId };
  },
});
