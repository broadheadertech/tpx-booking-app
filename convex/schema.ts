import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table for authentication
  users: defineTable({
    username: v.string(),
    email: v.string(),
    password: v.string(), // In production, this should be hashed
    nickname: v.optional(v.string()),
    mobile_number: v.string(),
    birthday: v.optional(v.string()),
    role: v.union(v.literal("staff"), v.literal("customer"), v.literal("admin")),
    is_active: v.boolean(),
    avatar: v.optional(v.string()),
    bio: v.optional(v.string()),
    skills: v.array(v.string()),
    isVerified: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_username", ["username"])
    .index("by_created_at", ["createdAt"]),

  // Barbers table
  barbers: defineTable({
    user: v.id("users"),
    full_name: v.string(),
    is_active: v.boolean(),
    services: v.array(v.id("services")),
    email: v.string(),
    phone: v.optional(v.string()),
    avatar: v.optional(v.string()),
    experience: v.string(),
    rating: v.number(),
    totalBookings: v.number(),
    monthlyRevenue: v.number(),
    specialties: v.array(v.string()),
    schedule: v.object({
      monday: v.object({ available: v.boolean(), start: v.string(), end: v.string() }),
      tuesday: v.object({ available: v.boolean(), start: v.string(), end: v.string() }),
      wednesday: v.object({ available: v.boolean(), start: v.string(), end: v.string() }),
      thursday: v.object({ available: v.boolean(), start: v.string(), end: v.string() }),
      friday: v.object({ available: v.boolean(), start: v.string(), end: v.string() }),
      saturday: v.object({ available: v.boolean(), start: v.string(), end: v.string() }),
      sunday: v.object({ available: v.boolean(), start: v.string(), end: v.string() }),
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["user"])
    .index("by_active", ["is_active"]),

  // Services table
  services: defineTable({
    name: v.string(),
    description: v.string(),
    price: v.number(),
    duration_minutes: v.number(),
    category: v.string(),
    is_active: v.boolean(),
    image: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_active", ["is_active"]),

  // Bookings table
  bookings: defineTable({
    booking_code: v.string(),
    customer: v.id("users"),
    service: v.id("services"),
    barber: v.optional(v.id("barbers")),
    date: v.string(),
    time: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("booked"),
      v.literal("confirmed"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    price: v.number(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_customer", ["customer"])
    .index("by_barber", ["barber"])
    .index("by_date", ["date"])
    .index("by_status", ["status"])
    .index("by_booking_code", ["booking_code"]),

  // Vouchers table
  vouchers: defineTable({
    code: v.string(),
    value: v.number(),
    points_required: v.number(),
    max_uses: v.number(),
    expires_at: v.number(),
    description: v.optional(v.string()),
    created_by: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
    // Legacy fields for backward compatibility
    redeemed: v.optional(v.boolean()),
    redeemed_by: v.optional(v.id("users")),
    redeemed_at: v.optional(v.number()),
  })
    .index("by_code", ["code"])
    .index("by_created_by", ["created_by"]),

  // User Vouchers table - tracks individual voucher assignments
  user_vouchers: defineTable({
    voucher_id: v.id("vouchers"),
    user_id: v.id("users"),
    status: v.union(
      v.literal("assigned"),
      v.literal("redeemed")
    ),
    assigned_at: v.number(),
    redeemed_at: v.optional(v.number()),
    assigned_by: v.id("users"), // Staff member who assigned the voucher
  })
    .index("by_voucher", ["voucher_id"])
    .index("by_user", ["user_id"])
    .index("by_status", ["status"])
    .index("by_voucher_user", ["voucher_id", "user_id"]),

  // Sessions table for authentication
  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"])
    .index("by_expires_at", ["expiresAt"]),

  // Events table
  events: defineTable({
    title: v.string(),
    description: v.string(),
    date: v.string(),
    time: v.string(),
    location: v.string(),
    maxAttendees: v.number(),
    currentAttendees: v.number(),
    price: v.number(),
    category: v.union(v.literal("workshop"), v.literal("celebration"), v.literal("training"), v.literal("promotion")),
    status: v.union(v.literal("upcoming"), v.literal("ongoing"), v.literal("completed"), v.literal("cancelled")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_status", ["status"])
    .index("by_category", ["category"]),
});
