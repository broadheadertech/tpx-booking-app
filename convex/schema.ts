import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Branches table for multi-branch support
  branches: defineTable({
    branch_code: v.string(),
    name: v.string(),
    address: v.string(),
    phone: v.string(),
    email: v.string(),
    is_active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_branch_code", ["branch_code"])
    .index("by_active", ["is_active"])
    .index("by_created_at", ["createdAt"]),

  // Users table for authentication
  users: defineTable({
    username: v.string(),
    email: v.string(),
    password: v.string(), // In production, this should be hashed
    nickname: v.optional(v.string()),
    mobile_number: v.string(),
    address: v.optional(v.string()),
    birthday: v.optional(v.string()),
    role: v.union(v.literal("staff"), v.literal("customer"), v.literal("admin"), v.literal("barber"), v.literal("super_admin"), v.literal("branch_admin")),
    branch_id: v.optional(v.id("branches")), // Optional for super_admin, required for others
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
    .index("by_created_at", ["createdAt"])
    .index("by_branch", ["branch_id"])
    .index("by_role", ["role"]),

  // Barbers table
  barbers: defineTable({
    user: v.id("users"),
    branch_id: v.id("branches"),
    full_name: v.string(),
    is_active: v.boolean(),
    services: v.array(v.id("services")),
    email: v.string(),
    phone: v.optional(v.string()),
    avatar: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
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
    .index("by_active", ["is_active"])
    .index("by_branch", ["branch_id"]),

  // Services table
  services: defineTable({
    branch_id: v.id("branches"),
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
    .index("by_active", ["is_active"])
    .index("by_branch", ["branch_id"]),

  // Bookings table
  bookings: defineTable({
    booking_code: v.string(),
    branch_id: v.id("branches"),
    customer: v.optional(v.id("users")), // Optional for walk-in customers
    customer_name: v.optional(v.string()), // For walk-in customers
    customer_phone: v.optional(v.string()), // For walk-in customers
    customer_email: v.optional(v.string()), // For walk-in customers
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
    payment_status: v.optional(v.union(
      v.literal("unpaid"),
      v.literal("paid"),
      v.literal("refunded")
    )),
    price: v.number(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_customer", ["customer"])
    .index("by_barber", ["barber"])
    .index("by_date", ["date"])
    .index("by_status", ["status"])
    .index("by_payment_status", ["payment_status"])
    .index("by_booking_code", ["booking_code"])
    .index("by_branch", ["branch_id"]),

  // Vouchers table
  vouchers: defineTable({
    code: v.string(),
    value: v.number(),
    points_required: v.number(),
    max_uses: v.number(),
    expires_at: v.number(),
    description: v.optional(v.string()),
    branch_id: v.id("branches"), // Add branch_id for branch-scoped vouchers
    created_by: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
    // Legacy fields for backward compatibility
    redeemed: v.optional(v.boolean()),
    redeemed_by: v.optional(v.id("users")),
    redeemed_at: v.optional(v.number()),
  })
    .index("by_code", ["code"])
    .index("by_created_by", ["created_by"])
    .index("by_branch", ["branch_id"]),

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
    branch_id: v.id("branches"), // Add branch_id for branch-scoped events
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_status", ["status"])
    .index("by_category", ["category"])
    .index("by_branch", ["branch_id"]),

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

  // POS Transactions table
  transactions: defineTable({
    transaction_id: v.string(),
    branch_id: v.id("branches"),
    customer: v.optional(v.id("users")), // Optional for walk-in customers
    customer_name: v.optional(v.string()), // For walk-in customers
    customer_phone: v.optional(v.string()), // For walk-in customers
    customer_email: v.optional(v.string()), // For walk-in customers
    customer_address: v.optional(v.string()), // For walk-in customers
    barber: v.id("barbers"),
    services: v.array(v.object({
      service_id: v.id("services"),
      service_name: v.string(),
      price: v.number(),
      quantity: v.number()
    })),
    products: v.optional(v.array(v.object({
      product_id: v.id("products"),
      product_name: v.string(),
      price: v.number(),
      quantity: v.number()
    }))),
    subtotal: v.number(),
    discount_amount: v.number(),
    voucher_applied: v.optional(v.id("vouchers")),
    tax_amount: v.number(),
    total_amount: v.number(),
    payment_method: v.union(
      v.literal("cash"),
      v.literal("card"),
      v.literal("digital_wallet"),
      v.literal("bank_transfer")
    ),
    payment_status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("refunded")
    ),
    notes: v.optional(v.string()),
    cash_received: v.optional(v.number()), // Amount of cash received for cash payments
    change_amount: v.optional(v.number()), // Change given back for cash payments
    receipt_number: v.string(),
    processed_by: v.id("users"), // Staff member who processed the transaction
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_transaction_id", ["transaction_id"])
    .index("by_customer", ["customer"])
    .index("by_barber", ["barber"])
    .index("by_receipt_number", ["receipt_number"])
    .index("by_payment_status", ["payment_status"])
    .index("by_created_at", ["createdAt"])
    .index("by_processed_by", ["processed_by"])
    .index("by_branch", ["branch_id"]),

  // POS Sessions table for tracking active POS sessions
  pos_sessions: defineTable({
    session_id: v.string(),
    staff_member: v.id("users"),
    barber: v.optional(v.id("barbers")), // Current barber selected
    status: v.union(
      v.literal("active"),
      v.literal("paused"),
      v.literal("closed")
    ),
    current_transaction: v.optional(v.object({
      customer: v.optional(v.id("users")),
      customer_name: v.optional(v.string()),
      customer_phone: v.optional(v.string()),
      services: v.array(v.object({
        service_id: v.id("services"),
        service_name: v.string(),
        price: v.number(),
        quantity: v.number()
      })),
      products: v.optional(v.array(v.object({
        product_id: v.id("products"),
        product_name: v.string(),
        price: v.number(),
        quantity: v.number()
      }))),
      subtotal: v.number(),
      discount_amount: v.number(),
      voucher_applied: v.optional(v.id("vouchers")),
      tax_amount: v.number(),
      total_amount: v.number()
    })),
    started_at: v.number(),
    last_activity: v.number(),
    closed_at: v.optional(v.number()),
  })
    .index("by_session_id", ["session_id"])
    .index("by_staff_member", ["staff_member"])
    .index("by_status", ["status"])
    .index("by_started_at", ["started_at"]),

  // Payments table for Xendit integration
  payments: defineTable({
    booking_id: v.id("bookings"),
    payment_request_id: v.string(),
    reference_id: v.string(),
    amount: v.number(),
    payment_method: v.string(),
    status: v.string(),
    webhook_data: v.optional(v.any()),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_booking_id", ["booking_id"])
    .index("by_payment_request_id", ["payment_request_id"])
    .index("by_reference_id", ["reference_id"])
    .index("by_status", ["status"]),

  // Ratings table for barber ratings
  ratings: defineTable({
    booking_id: v.id("bookings"),
    customer_id: v.id("users"),
    barber_id: v.id("barbers"),
    service_id: v.id("services"),
    rating: v.number(), // 1-5 stars
    feedback: v.optional(v.string()),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_booking", ["booking_id"])
    .index("by_customer", ["customer_id"])
    .index("by_barber", ["barber_id"])
    .index("by_service", ["service_id"])
    .index("by_rating", ["rating"])
    .index("by_created_at", ["created_at"]),

  // Payroll settings table for branch-specific payroll configuration
  payroll_settings: defineTable({
    branch_id: v.id("branches"),
    default_commission_rate: v.number(), // Default commission percentage (e.g., 10 for 10%)
    payout_frequency: v.union(
      v.literal("weekly"),
      v.literal("bi_weekly"),
      v.literal("monthly")
    ),
    payout_day: v.number(), // Day of week (0-6) for weekly, day of month (1-31) for monthly
    tax_rate: v.optional(v.number()), // Tax percentage to deduct
    is_active: v.boolean(),
    created_by: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_branch", ["branch_id"])
    .index("by_active", ["is_active"]),

  // Barber commission rates table for individual barber commission overrides
  barber_commission_rates: defineTable({
    barber_id: v.id("barbers"),
    branch_id: v.id("branches"),
    commission_rate: v.number(), // Individual commission percentage
    effective_from: v.number(), // When this rate becomes effective
    effective_until: v.optional(v.number()), // When this rate expires (null for current)
    is_active: v.boolean(),
    created_by: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_barber", ["barber_id"])
    .index("by_branch", ["branch_id"])
    .index("by_effective_from", ["effective_from"])
    .index("by_active", ["is_active"])
    .index("by_barber_active", ["barber_id", "is_active"]),

  // Payroll periods table to track payroll calculation periods
  payroll_periods: defineTable({
    branch_id: v.id("branches"),
    period_start: v.number(), // Start timestamp of payroll period
    period_end: v.number(), // End timestamp of payroll period
    period_type: v.union(
      v.literal("weekly"),
      v.literal("bi_weekly"),
      v.literal("monthly")
    ),
    status: v.union(
      v.literal("draft"), // Period created but not finalized
      v.literal("calculated"), // Earnings calculated but not paid
      v.literal("paid"), // All payments processed
      v.literal("cancelled") // Period cancelled
    ),
    total_earnings: v.number(), // Total earnings for all barbers in this period
    total_commissions: v.number(), // Total commission payouts
    total_deductions: v.number(), // Total tax/other deductions
    calculated_at: v.optional(v.number()), // When calculations were completed
    paid_at: v.optional(v.number()), // When payments were processed
    calculated_by: v.optional(v.id("users")), // Who calculated the payroll
    paid_by: v.optional(v.id("users")), // Who processed payments
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_branch", ["branch_id"])
    .index("by_period_start", ["period_start"])
    .index("by_period_end", ["period_end"])
    .index("by_status", ["status"])
    .index("by_branch_status", ["branch_id", "status"]),

  // Payroll records table for individual barber payroll records
  payroll_records: defineTable({
    payroll_period_id: v.id("payroll_periods"),
    barber_id: v.id("barbers"),
    branch_id: v.id("branches"),
    
    // Service earnings breakdown
    total_services: v.number(), // Number of services completed
    total_service_revenue: v.number(), // Total revenue from services
    commission_rate: v.number(), // Commission rate used for calculation (legacy/fallback)
    gross_commission: v.number(), // Commission before deductions
    // Daily rate additions
    daily_rate: v.optional(v.number()), // Daily base rate applied
    days_worked: v.optional(v.number()), // Distinct days with qualifying work
    daily_pay: v.optional(v.number()), // Calculated daily rate pay
    
    // Transaction earnings breakdown (POS)
    total_transactions: v.number(), // Number of POS transactions
    total_transaction_revenue: v.number(), // Revenue from POS transactions
    transaction_commission: v.number(), // Commission from POS transactions
    
    // Deductions
    tax_deduction: v.number(), // Tax deducted
    other_deductions: v.number(), // Other deductions (insurance, etc.)
    total_deductions: v.number(), // Total deductions
    
    // Final amounts
    net_pay: v.number(), // Final amount to be paid
    
    // Payment tracking
    payment_method: v.optional(v.union(
      v.literal("cash"),
      v.literal("bank_transfer"),
      v.literal("check"),
      v.literal("digital_wallet")
    )),
    payment_reference: v.optional(v.string()), // Bank transfer ref, check number, etc.
    paid_at: v.optional(v.number()), // When payment was made
    paid_by: v.optional(v.id("users")), // Who processed the payment
    
    // Status and notes
    status: v.union(
      v.literal("calculated"), // Calculated but not paid
      v.literal("paid"), // Payment completed
      v.literal("cancelled") // Record cancelled
    ),
    notes: v.optional(v.string()),
    
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_payroll_period", ["payroll_period_id"])
    .index("by_barber", ["barber_id"])
    .index("by_branch", ["branch_id"])
    .index("by_status", ["status"])
    .index("by_paid_at", ["paid_at"])
    .index("by_barber_period", ["barber_id", "payroll_period_id"]),

  // Service commission rates table (per service, per branch)
  service_commission_rates: defineTable({
    branch_id: v.id("branches"),
    service_id: v.id("services"),
    commission_rate: v.number(), // Percentage for this service
    effective_from: v.number(),
    effective_until: v.optional(v.number()),
    is_active: v.boolean(),
    created_by: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_branch", ["branch_id"])
    .index("by_service", ["service_id"])
    .index("by_branch_service", ["branch_id", "service_id"])
    .index("by_active", ["is_active"]),

  // Barber daily rates table
  barber_daily_rates: defineTable({
    barber_id: v.id("barbers"),
    branch_id: v.id("branches"),
    daily_rate: v.number(),
    effective_from: v.number(),
    effective_until: v.optional(v.number()),
    is_active: v.boolean(),
    created_by: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_barber", ["barber_id"])
    .index("by_branch", ["branch_id"])
    .index("by_barber_active", ["barber_id", "is_active"]),

  // Payroll adjustments table for manual adjustments (bonuses, deductions, etc.)
  payroll_adjustments: defineTable({
    payroll_record_id: v.id("payroll_records"),
    barber_id: v.id("barbers"),
    branch_id: v.id("branches"),
    adjustment_type: v.union(
      v.literal("bonus"), // Additional payment
      v.literal("deduction"), // Additional deduction
      v.literal("correction") // Correction to previous calculation
    ),
    amount: v.number(), // Positive for bonus, negative for deduction
    reason: v.string(), // Reason for adjustment
    description: v.optional(v.string()), // Additional details
    applied_by: v.id("users"), // Who applied the adjustment
    approved_by: v.optional(v.id("users")), // Who approved the adjustment
    is_approved: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_payroll_record", ["payroll_record_id"])
    .index("by_barber", ["barber_id"])
    .index("by_branch", ["branch_id"])
    .index("by_type", ["adjustment_type"])
    .index("by_approved", ["is_approved"]),
});
