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

  // User vouchers relationship table
  user_vouchers: defineTable({
    voucher_id: v.id("vouchers"),
    user_id: v.optional(v.id("users")), // Optional for staff redemptions
    status: v.union(
      v.literal("assigned"),
      v.literal("redeemed")
    ),
    assigned_at: v.number(),
    redeemed_at: v.optional(v.number()),
    assigned_by: v.optional(v.id("users")), // Optional for staff redemptions
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

  // Notifications table
  notifications: defineTable({
    title: v.string(),
    message: v.string(),
    type: v.union(
      v.literal("booking"),
      v.literal("payment"),
      v.literal("system"),
      v.literal("promotion"),
      v.literal("reminder"),
      v.literal("alert")
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    ),
    recipient_id: v.id("users"),
    recipient_type: v.union(v.literal("staff"), v.literal("customer"), v.literal("admin")),
    sender_id: v.optional(v.id("users")),
    is_read: v.boolean(),
    is_archived: v.boolean(),
    action_url: v.optional(v.string()),
    action_label: v.optional(v.string()),
    metadata: v.optional(v.object({
      booking_id: v.optional(v.id("bookings")),
      service_id: v.optional(v.id("services")),
      barber_id: v.optional(v.id("barbers")),
      event_id: v.optional(v.id("events")),
      voucher_id: v.optional(v.id("vouchers")),
    })),
    expires_at: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_recipient", ["recipient_id"])
    .index("by_recipient_type", ["recipient_type"])
    .index("by_type", ["type"])
    .index("by_priority", ["priority"])
    .index("by_read_status", ["is_read"])
    .index("by_created_at", ["createdAt"])
    .index("by_recipient_read", ["recipient_id", "is_read"])
    .index("by_recipient_archived", ["recipient_id", "is_archived"]),

  // Products table
  products: defineTable({
    name: v.string(),
    description: v.string(),
    price: v.number(),
    cost: v.number(),
    category: v.union(
      v.literal("hair-care"),
      v.literal("beard-care"),
      v.literal("shaving"),
      v.literal("tools"),
      v.literal("accessories")
    ),
    brand: v.string(),
    sku: v.string(),
    stock: v.number(),
    minStock: v.number(),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("out-of-stock")
    ),
    soldThisMonth: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_sku", ["sku"])
    .index("by_status", ["status"])
    .index("by_stock", ["stock"]),
});
