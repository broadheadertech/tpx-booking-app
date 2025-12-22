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
    enable_booking_fee: v.optional(v.boolean()), // Toggle for booking fee
    booking_fee_amount: v.optional(v.number()), // Amount of the booking fee
    booking_start_hour: v.optional(v.number()), // Start hour for bookings (0-23, default: 10)
    booking_end_hour: v.optional(v.number()), // End hour for bookings (0-23, default: 20)
    enable_late_fee: v.optional(v.boolean()), // Toggle for late fee
    late_fee_amount: v.optional(v.number()), // Amount of the late fee (or rate)
    booking_fee_type: v.optional(v.string()), // 'fixed' or 'percent'
    late_fee_type: v.optional(v.string()), // 'fixed', 'per_minute', 'per_hour'
    late_fee_grace_period: v.optional(v.number()), // Grace period in minutes
    carousel_images: v.optional(v.array(v.string())), // Array of carousel image URLs
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_branch_code", ["branch_code"])
    .index("by_active", ["is_active"])
    .index("by_created_at", ["createdAt"]),

  // Branding / Whitelabel settings per branch
  branding: defineTable({
    branch_id: v.id("branches"),
    display_name: v.optional(v.string()),
    primary_color: v.optional(v.string()),
    accent_color: v.optional(v.string()),
    bg_color: v.optional(v.string()),
    text_color: v.optional(v.string()),
    muted_color: v.optional(v.string()),
    logo_light_url: v.optional(v.string()),
    logo_dark_url: v.optional(v.string()),
    favicon_url: v.optional(v.string()),
    banner_url: v.optional(v.string()),
    hero_image_url: v.optional(v.string()),
    feature_toggles: v.optional(
      v.object({
        kiosk: v.optional(v.boolean()),
        wallet: v.optional(v.boolean()),
        vouchers: v.optional(v.boolean()),
        referrals: v.optional(v.boolean()),
      })
    ),
    updated_by: v.optional(v.id("users")),
    updated_at: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_branch", ["branch_id"]),

  // Global branding singleton for system-wide theming
  branding_global: defineTable({
    display_name: v.optional(v.string()),
    primary_color: v.optional(v.string()),
    accent_color: v.optional(v.string()),
    bg_color: v.optional(v.string()),
    text_color: v.optional(v.string()),
    muted_color: v.optional(v.string()),
    logo_light_url: v.optional(v.string()),
    logo_dark_url: v.optional(v.string()),
    favicon_url: v.optional(v.string()),
    banner_url: v.optional(v.string()),
    hero_image_url: v.optional(v.string()),
    feature_toggles: v.optional(
      v.object({
        kiosk: v.optional(v.boolean()),
        wallet: v.optional(v.boolean()),
        vouchers: v.optional(v.boolean()),
        referrals: v.optional(v.boolean()),
      })
    ),
    version: v.optional(v.number()),
    updated_by: v.optional(v.id("users")),
    updated_at: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_created_at", ["createdAt"]),

  // Branding history for version tracking and rollback
  branding_history: defineTable({
    branding_id: v.id("branding_global"),
    snapshot: v.any(), // Full branding object at this point in time
    changed_by: v.id("users"),
    change_notes: v.optional(v.string()),
    version: v.number(),
    createdAt: v.number(),
  })
    .index("by_branding", ["branding_id"])
    .index("by_version", ["version"])
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
    role: v.union(
      v.literal("staff"),
      v.literal("customer"),
      v.literal("admin"),
      v.literal("barber"),
      v.literal("super_admin"),
      v.literal("branch_admin")
    ),
    branch_id: v.optional(v.id("branches")), // Optional for super_admin and customers, required for staff/barber/admin/branch_admin
    is_active: v.boolean(),
    avatar: v.optional(v.string()),
    bio: v.optional(v.string()),
    skills: v.array(v.string()),
    page_access: v.optional(v.array(v.string())), // Array of page keys the user can access
    isVerified: v.boolean(),
    // Password reset fields
    password_reset_token: v.optional(v.string()),
    password_reset_expires: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_username", ["username"])
    .index("by_created_at", ["createdAt"])
    .index("by_branch", ["branch_id"])
    .index("by_role", ["role"])
    .index("by_branch_role", ["branch_id", "role"]),

  // Barbers table
  barbers: defineTable({
    user: v.id("users"),
    branch_id: v.id("branches"),
    full_name: v.string(),
    is_active: v.boolean(),
    is_accepting_bookings: v.optional(v.boolean()),
    services: v.array(v.id("services")),
    email: v.string(),
    phone: v.optional(v.string()),
    avatar: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
    bio: v.optional(v.string()),
    experience: v.string(),
    rating: v.number(),
    totalBookings: v.number(),
    monthlyRevenue: v.number(),
    specialties: v.array(v.string()),
    schedule: v.object({
      monday: v.object({
        available: v.boolean(),
        start: v.string(),
        end: v.string(),
      }),
      tuesday: v.object({
        available: v.boolean(),
        start: v.string(),
        end: v.string(),
      }),
      wednesday: v.object({
        available: v.boolean(),
        start: v.string(),
        end: v.string(),
      }),
      thursday: v.object({
        available: v.boolean(),
        start: v.string(),
        end: v.string(),
      }),
      friday: v.object({
        available: v.boolean(),
        start: v.string(),
        end: v.string(),
      }),
      saturday: v.object({
        available: v.boolean(),
        start: v.string(),
        end: v.string(),
      }),
      sunday: v.object({
        available: v.boolean(),
        start: v.string(),
        end: v.string(),
      }),
    }),
    schedule_type: v.optional(
      v.union(v.literal("weekly"), v.literal("specific_dates"))
    ),
    specific_dates: v.optional(
      v.array(
        v.object({
          date: v.string(), // YYYY-MM-DD
          available: v.boolean(),
          start: v.string(),
          end: v.string(),
        })
      )
    ),
    blocked_periods: v.optional(
      v.array(
        v.object({
          date: v.string(), // YYYY-MM-DD
          start_time: v.optional(v.string()), // HH:mm, if undefined -> whole day
          end_time: v.optional(v.string()), // HH:mm
          reason: v.optional(v.string()),
        })
      )
    ),
    // Custom booking feature - allows barbers to have a custom form instead of regular booking
    custom_booking_enabled: v.optional(v.boolean()),
    custom_booking_form_id: v.optional(v.id("custom_booking_forms")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["user"])
    .index("by_active", ["is_active"])
    .index("by_branch", ["branch_id"])
    .index("by_custom_booking", ["custom_booking_enabled"]),

  // Services table
  services: defineTable({
    branch_id: v.id("branches"),
    name: v.string(),
    description: v.string(),
    price: v.number(),
    duration_minutes: v.number(),
    category: v.string(),
    is_active: v.boolean(),
    hide_price: v.optional(v.boolean()),
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
    payment_status: v.optional(
      v.union(v.literal("unpaid"), v.literal("paid"), v.literal("refunded"))
    ),
    price: v.number(),
    voucher_id: v.optional(v.id("vouchers")), // Link to voucher if used
    discount_amount: v.optional(v.number()), // Discount applied
    booking_fee: v.optional(v.number()), // Booking fee applied
    late_fee: v.optional(v.number()), // Late fee applied
    final_price: v.optional(v.number()), // Price after discount
    notes: v.optional(v.string()),
    reminder_sent: v.optional(v.boolean()),
    check_in_reminder_sent: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_customer", ["customer"])
    .index("by_barber", ["barber"])
    .index("by_date", ["date"])
    .index("by_status", ["status"])
    .index("by_payment_status", ["payment_status"])
    .index("by_booking_code", ["booking_code"])
    .index("by_branch", ["branch_id"])
    .index("by_date_reminder", ["date", "reminder_sent"])
    .index("by_barber_date", ["barber", "date"]),

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
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("inactive"),
        v.literal("pending_approval"),
        v.literal("rejected")
      )
    ),
    approved_by: v.optional(v.id("users")),
    approved_at: v.optional(v.number()),
    rejection_reason: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    // Legacy fields for backward compatibility
    redeemed: v.optional(v.boolean()),
    redeemed_by: v.optional(v.id("users")),
    redeemed_at: v.optional(v.number()),
  })
    .index("by_code", ["code"])
    .index("by_created_by", ["created_by"])
    .index("by_branch", ["branch_id"])
    .index("by_branch_status", ["branch_id", "status"]),

  // User vouchers relationship table
  user_vouchers: defineTable({
    voucher_id: v.id("vouchers"),
    user_id: v.optional(v.id("users")), // Optional for staff redemptions
    status: v.union(v.literal("assigned"), v.literal("redeemed")),
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
    category: v.union(
      v.literal("workshop"),
      v.literal("celebration"),
      v.literal("training"),
      v.literal("promotion")
    ),
    status: v.union(
      v.literal("upcoming"),
      v.literal("ongoing"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
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
    recipient_id: v.optional(v.id("users")), // Optional for branch-wide notifications
    recipient_type: v.union(
      v.literal("staff"),
      v.literal("customer"),
      v.literal("admin"),
      v.literal("barber")
    ),
    sender_id: v.optional(v.id("users")),
    branch_id: v.optional(v.id("branches")), // For branch-scoped notifications
    is_read: v.boolean(),
    is_archived: v.boolean(),
    action_url: v.optional(v.string()),
    action_label: v.optional(v.string()),
    metadata: v.optional(v.any()),
    expires_at: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_recipient", ["recipient_id"])
    .index("by_recipient_type", ["recipient_type"])
    .index("by_branch", ["branch_id"])
    .index("by_branch_type", ["branch_id", "recipient_type"])
    .index("by_type", ["type"])
    .index("by_priority", ["priority"])
    .index("by_read_status", ["is_read"])
    .index("by_created_at", ["createdAt"])
    .index("by_recipient_read", ["recipient_id", "is_read"])
    .index("by_branch_read", ["branch_id", "is_read"])
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
    services: v.array(
      v.object({
        service_id: v.id("services"),
        service_name: v.string(),
        price: v.number(),
        quantity: v.number(),
      })
    ),
    products: v.optional(
      v.array(
        v.object({
          product_id: v.id("products"),
          product_name: v.string(),
          price: v.number(),
          quantity: v.number(),
        })
      )
    ),
    subtotal: v.number(),
    discount_amount: v.number(),
    voucher_applied: v.optional(v.id("vouchers")),
    booking_fee: v.optional(v.number()), // Booking fee applied
    late_fee: v.optional(v.number()), // Late fee applied
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
    current_transaction: v.optional(
      v.object({
        customer: v.optional(v.id("users")),
        customer_name: v.optional(v.string()),
        customer_phone: v.optional(v.string()),
        services: v.array(
          v.object({
            service_id: v.id("services"),
            service_name: v.string(),
            price: v.number(),
            quantity: v.number(),
          })
        ),
        products: v.optional(
          v.array(
            v.object({
              product_id: v.id("products"),
              product_name: v.string(),
              price: v.number(),
              quantity: v.number(),
            })
          )
        ),
        subtotal: v.number(),
        discount_amount: v.number(),
        voucher_applied: v.optional(v.id("vouchers")),
        tax_amount: v.number(),
        total_amount: v.number(),
      })
    ),
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
    include_booking_fee: v.optional(v.boolean()), // Whether to include booking fees in payroll
    include_late_fee: v.optional(v.boolean()), // Whether to include late fees in payroll
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
    total_service_revenue: v.optional(v.number()), // Total revenue from services
    total_product_revenue: v.optional(v.number()), // Total revenue from products
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

    // Product earnings breakdown
    total_products: v.optional(v.number()), // Number of products sold
    total_product_revenue: v.optional(v.number()), // Total revenue from products
    product_commission: v.optional(v.number()), // Commission from product sales

    // Booking details snapshot (for reporting/printing)
    bookings_detail: v.optional(
      v.array(
        v.object({
          id: v.id("bookings"),
          booking_code: v.string(),
          date: v.string(),
          time: v.string(),
          price: v.number(),
          service_name: v.string(),
          customer_name: v.string(),
          updatedAt: v.number(),
          commission: v.optional(v.number()),
          commission_rate: v.optional(v.number()),
        })
      )
    ),

    // Product transaction details snapshot (for reporting/printing)
    products_detail: v.optional(
      v.array(
        v.object({
          id: v.id("transactions"),
          transaction_id: v.string(),
          date: v.number(),
          product_name: v.string(),
          quantity: v.number(),
          price: v.number(),
          total_amount: v.number(),
          customer_name: v.string(),
          commission_type: v.string(), // "percentage" or "fixed_amount"
          commission_rate: v.number(),
          commission_amount: v.number(),
        })
      )
    ),

    // Fee earnings breakdown
    total_booking_fees: v.optional(v.number()),
    total_late_fees: v.optional(v.number()),

    // Deductions
    tax_deduction: v.number(), // Tax deducted
    other_deductions: v.number(), // Other deductions (insurance, etc.)
    total_deductions: v.number(), // Total deductions

    // Final amounts
    net_pay: v.number(), // Final amount to be paid

    // Payment tracking
    payment_method: v.optional(
      v.union(
        v.literal("cash"),
        v.literal("bank_transfer"),
        v.literal("check"),
        v.literal("digital_wallet")
      )
    ),
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

  // Product commission rates table (per product, per branch)
  product_commission_rates: defineTable({
    branch_id: v.id("branches"),
    product_id: v.id("products"),
    commission_type: v.union(
      v.literal("percentage"),
      v.literal("fixed_amount")
    ), // Type of commission
    commission_rate: v.optional(v.number()), // Percentage for this product (if type is percentage)
    fixed_amount: v.optional(v.number()), // Fixed amount per unit (if type is fixed_amount)
    effective_from: v.number(),
    effective_until: v.optional(v.number()),
    is_active: v.boolean(),
    created_by: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_branch", ["branch_id"])
    .index("by_product", ["product_id"])
    .index("by_branch_product", ["branch_id", "product_id"])
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

  // Email marketing campaigns
  email_campaigns: defineTable({
    branch_id: v.id("branches"),
    name: v.string(),
    subject: v.string(),
    body_html: v.string(),
    audience: v.union(
      v.literal("all_customers"),
      v.literal("new_customers"),
      v.literal("returning_customers"),
      v.literal("vip_customers")
    ),
    template_type: v.optional(
      v.union(
        v.literal("marketing"),
        v.literal("promotional"),
        v.literal("reminder"),
        v.literal("custom")
      )
    ),
    from_email: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    status: v.union(
      v.literal("draft"),
      v.literal("scheduled"),
      v.literal("sending"),
      v.literal("sent"),
      v.literal("failed")
    ),
    scheduled_at: v.optional(v.number()),
    sent_at: v.optional(v.number()),
    total_recipients: v.optional(v.number()),
    sent_count: v.optional(v.number()),
    failed_count: v.optional(v.number()),
    open_count: v.optional(v.number()),
    click_count: v.optional(v.number()),
    unsubscribe_count: v.optional(v.number()),
    created_by: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_branch", ["branch_id"])
    .index("by_status", ["status"])
    .index("by_created_at", ["createdAt"])
    .index("by_template_type", ["template_type"])
    .index("by_audience", ["audience"]),

  // Email marketing campaign logs
  email_campaign_logs: defineTable({
    campaign_id: v.id("email_campaigns"),
    recipient_email: v.string(),
    recipient_id: v.optional(v.id("users")),
    status: v.union(v.literal("sent"), v.literal("failed")),
    error: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_campaign", ["campaign_id"])
    .index("by_status", ["status"]),

  // Wallets
  wallets: defineTable({
    user_id: v.id("users"),
    balance: v.number(),
    currency: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["user_id"]),

  // Wallet transactions
  wallet_transactions: defineTable({
    user_id: v.id("users"),
    type: v.union(
      v.literal("topup"),
      v.literal("payment"),
      v.literal("refund")
    ),
    amount: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed")
    ),
    provider: v.optional(v.string()),
    reference_id: v.optional(v.string()),
    source_id: v.optional(v.string()),
    payment_id: v.optional(v.string()),
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["user_id"])
    .index("by_reference", ["reference_id"])
    .index("by_source", ["source_id"])
    .index("by_payment", ["payment_id"])
    .index("by_status", ["status"]),

  // Barber portfolio for Instagram-like gallery posts
  barber_portfolio: defineTable({
    barber_id: v.id("barbers"),
    branch_id: v.id("branches"),
    image_storage_id: v.id("_storage"),
    caption: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    likes_count: v.optional(v.number()),
    is_featured: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_barber", ["barber_id"])
    .index("by_branch", ["branch_id"])
    .index("by_featured", ["is_featured"])
    .index("by_created_at", ["createdAt"]),

  // Barber achievements/certifications
  barber_achievements: defineTable({
    barber_id: v.id("barbers"),
    title: v.string(),
    description: v.optional(v.string()),
    achievement_type: v.union(
      v.literal("certification"),
      v.literal("award"),
      v.literal("milestone"),
      v.literal("training")
    ),
    date_earned: v.optional(v.string()),
    issuer: v.optional(v.string()),
    image_storage_id: v.optional(v.id("_storage")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_barber", ["barber_id"])
    .index("by_type", ["achievement_type"])
    .index("by_created_at", ["createdAt"]),

  // Email templates for customizable email content
  email_templates: defineTable({
    template_type: v.union(
      v.literal("password_reset"),
      v.literal("voucher"),
      v.literal("booking_confirmation"),
      v.literal("booking_reminder"),
      v.literal("welcome")
    ),
    subject: v.string(),
    heading: v.string(),
    body_text: v.string(),
    cta_text: v.optional(v.string()),
    footer_text: v.optional(v.string()),
    is_active: v.boolean(),
    updated_by: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_template_type", ["template_type"])
    .index("by_active", ["is_active"]),

  // Custom booking forms - form builder for barbers with custom booking process
  custom_booking_forms: defineTable({
    barber_id: v.id("barbers"),
    branch_id: v.id("branches"),
    title: v.string(),
    description: v.optional(v.string()),
    fields: v.array(
      v.object({
        id: v.string(), // unique field identifier
        type: v.union(
          v.literal("text"),
          v.literal("email"),
          v.literal("phone"),
          v.literal("textarea"),
          v.literal("select"),
          v.literal("multiselect"),
          v.literal("radio"),
          v.literal("checkbox"),
          v.literal("date"),
          v.literal("date_range"), // For preferred dates (2-3 possible dates)
          v.literal("number")
        ),
        label: v.string(),
        placeholder: v.optional(v.string()),
        required: v.boolean(),
        options: v.optional(v.array(v.string())), // For select, multiselect, radio, checkbox
        helpText: v.optional(v.string()),
        order: v.number(),
      })
    ),
    status: v.union(v.literal("active"), v.literal("inactive")),
    created_by: v.optional(v.id("users")),
    updated_by: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_barber", ["barber_id"])
    .index("by_branch", ["branch_id"])
    .index("by_status", ["status"]),

  // Custom booking submissions - customer submissions for custom booking forms
  custom_booking_submissions: defineTable({
    form_id: v.id("custom_booking_forms"),
    barber_id: v.id("barbers"),
    branch_id: v.id("branches"),
    booking_id: v.optional(v.id("bookings")), // Reference booking for transaction tracking
    // Customer info (always captured)
    customer_name: v.string(),
    customer_email: v.optional(v.string()),
    customer_phone: v.optional(v.string()),
    // Form responses as key-value pairs (field_id -> response)
    responses: v.any(), // Object with field_id keys and response values
    // Status workflow
    status: v.union(
      v.literal("pending"),      // New submission
      v.literal("contacted"),    // Staff has contacted customer
      v.literal("confirmed"),    // Booking confirmed with customer
      v.literal("completed"),    // Service completed
      v.literal("cancelled")     // Cancelled
    ),
    // Staff notes and follow-up
    notes: v.optional(v.string()),
    contacted_at: v.optional(v.number()),
    confirmed_at: v.optional(v.number()),
    completed_at: v.optional(v.number()),
    handled_by: v.optional(v.id("users")), // Staff who handled this submission
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_form", ["form_id"])
    .index("by_barber", ["barber_id"])
    .index("by_branch", ["branch_id"])
    .index("by_status", ["status"])
    .index("by_booking", ["booking_id"])
    .index("by_created_at", ["createdAt"]),
});
