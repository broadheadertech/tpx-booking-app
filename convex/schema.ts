import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Schema version: 2026-01-29v2 - Story 19.1: Added loyalty_config and loyalty_config_audit tables for dynamic loyalty program settings
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
    // Clerk RBAC field (Story 10.1)
    clerk_org_id: v.optional(v.string()), // Clerk Organization ID for branch-org mapping
    // Branch Profile fields (public-facing storefront)
    slug: v.optional(v.string()), // URL-friendly name: "kapitolyo-branch"
    description: v.optional(v.string()), // About this branch (shown on public profile)
    profile_photo: v.optional(v.string()), // Profile picture/logo URL
    cover_photo: v.optional(v.string()), // Cover/banner image URL
    social_links: v.optional(
      v.object({
        facebook: v.optional(v.string()),
        instagram: v.optional(v.string()),
        tiktok: v.optional(v.string()),
        twitter: v.optional(v.string()), // X/Twitter
        youtube: v.optional(v.string()),
        website: v.optional(v.string()),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_branch_code", ["branch_code"])
    .index("by_active", ["is_active"])
    .index("by_created_at", ["createdAt"])
    // Clerk RBAC index (Story 10.1)
    .index("by_clerk_org_id", ["clerk_org_id"])
    // Branch Profile index
    .index("by_slug", ["slug"]),

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

  // Branch Posts - Social-style posts by barbers and admins for branch profiles
  branch_posts: defineTable({
    // Core relationship
    branch_id: v.id("branches"),
    author_id: v.id("users"),
    author_type: v.union(
      v.literal("barber"),
      v.literal("branch_admin"),
      v.literal("super_admin")
    ),

    // Content
    post_type: v.union(
      v.literal("showcase"), // Work photos/videos
      v.literal("promo"), // Promotional offers
      v.literal("availability"), // Open slots announcement
      v.literal("announcement"), // General news
      v.literal("tip"), // Hair care tips
      v.literal("vacation") // Vacation/closure notice
    ),
    content: v.string(),
    images: v.optional(v.array(v.string())), // Array of image URLs

    // Vacation/closure date range (for vacation post type)
    vacation_start: v.optional(v.number()), // Start timestamp
    vacation_end: v.optional(v.number()), // End timestamp

    // BT3: Shoppable Posts - Product tagging
    tagged_products: v.optional(v.array(v.object({
      product_id: v.id("products"),
      position: v.optional(v.object({  // Position on image (for tap-to-shop)
        x: v.number(),  // 0-100 percentage
        y: v.number(),  // 0-100 percentage
      })),
      note: v.optional(v.string()),  // "Used for styling" etc.
    }))),
    is_shoppable: v.optional(v.boolean()),  // Quick filter flag

    // Moderation
    status: v.union(
      v.literal("pending"), // Awaiting approval
      v.literal("published"), // Live
      v.literal("archived"), // Hidden but not deleted
      v.literal("rejected") // Rejected by admin
    ),
    rejection_reason: v.optional(v.string()),

    // Features
    pinned: v.optional(v.boolean()), // Pin to top of feed
    expires_at: v.optional(v.number()), // For time-limited promos

    // Engagement tracking
    view_count: v.optional(v.number()),
    likes_count: v.optional(v.number()),
    // BT3: Product engagement
    product_clicks: v.optional(v.number()),  // Times products were clicked
    product_purchases: v.optional(v.number()),  // Purchases from this post

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_branch", ["branch_id"])
    .index("by_branch_status", ["branch_id", "status"])
    .index("by_author", ["author_id"])
    .index("by_branch_type", ["branch_id", "post_type"])
    .index("by_branch_pinned", ["branch_id", "pinned"])
    .index("by_created_at", ["createdAt"])
    .index("by_branch_shoppable", ["branch_id", "is_shoppable"]),

  // BT3: Post-Product Purchase Tracking
  post_product_purchases: defineTable({
    post_id: v.id("branch_posts"),
    product_id: v.id("products"),
    user_id: v.optional(v.id("users")),  // May be guest purchase
    transaction_id: v.optional(v.id("transactions")),
    quantity: v.number(),
    unit_price: v.number(),
    total_price: v.number(),
    source: v.union(
      v.literal("feed_quick_buy"),    // Quick purchase from feed
      v.literal("feed_add_to_cart"),  // Added to cart from feed
      v.literal("product_modal")       // From product detail modal
    ),
    createdAt: v.number(),
  })
    .index("by_post", ["post_id"])
    .index("by_product", ["product_id"])
    .index("by_user", ["user_id"])
    .index("by_transaction", ["transaction_id"])
    .index("by_created", ["createdAt"]),

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
      v.literal("branch_admin"),
      v.literal("admin_staff") // Clerk RBAC: Cross-branch operations role
    ),
    branch_id: v.optional(v.id("branches")), // Optional for super_admin and customers, required for staff/barber/admin/branch_admin
    is_active: v.boolean(),
    is_guest: v.optional(v.boolean()), // true for guest bookings (anonymous customers)
    avatar: v.optional(v.string()),
    bio: v.optional(v.string()),
    skills: v.array(v.string()),
    page_access: v.optional(v.array(v.string())), // Array of page keys the user can access (legacy)

    // ============================================================================
    // CLERK AUTHENTICATION & RBAC FIELDS (Story 10.1)
    // ============================================================================
    clerk_user_id: v.optional(v.string()), // Clerk user ID for SSO linkage
    clerk_org_ids: v.optional(v.array(v.string())), // Clerk Organization IDs for multi-org support
    migration_status: v.optional(v.union(
      v.literal("pending"),    // User not yet migrated to Clerk
      v.literal("invited"),    // Invitation sent, awaiting Clerk signup
      v.literal("completed"),  // Successfully migrated to Clerk
      v.literal("failed")      // Migration attempt failed
    )),
    legacy_password_hash: v.optional(v.string()), // Preserved hash for rollback scenarios

    // page_access_v2: Object-based permissions (30 pages × 5 actions)
    // Always accessible pages (bypass check): overview, custom_bookings, walkins
    page_access_v2: v.optional(v.object({
      // Staff Dashboard Pages (25)
      overview: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
      reports: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
      bookings: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
      custom_bookings: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
      calendar: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
      walkins: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
      pos: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
      barbers: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
      users: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
      services: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
      customers: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
      products: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
      order_products: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
      vouchers: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
      payroll: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
      cash_advances: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
      royalty: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
      pl: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
      balance_sheet: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
      payments: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
      payment_history: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
      attendance: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
      events: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
      notifications: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
      email_marketing: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
      // Hub tabs
      team: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
      finance: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
      marketing: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
      queue: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
      accounting: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
      branch_wallet: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
      wallet_earnings: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
      customer_analytics: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
      post_moderation: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
      // Admin Dashboard Pages (5)
      branches: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
      catalog: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
      branding: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
      emails: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
      settings: v.optional(v.object({ view: v.boolean(), create: v.boolean(), edit: v.boolean(), delete: v.boolean(), approve: v.boolean() })),
    })),
    // ============================================================================

    // VIP Tier (Customer Experience)
    // References the tiers table - customers progress through Bronze→Silver→Gold→Platinum
    current_tier_id: v.optional(v.id("tiers")), // null = Bronze (default), set on first points earn

    isVerified: v.boolean(),
    // Password reset fields
    password_reset_token: v.optional(v.string()),
    password_reset_expires: v.optional(v.number()),

    // ============================================================================
    // CUSTOMER ANALYTICS FIELDS (AI Email Marketing - Epic 27)
    // ============================================================================
    // These fields are used for RFM segmentation, churn risk analysis, and AI campaigns
    lastBookingDate: v.optional(v.number()), // Timestamp of last booking/visit
    totalBookings: v.optional(v.number()),   // Total number of bookings
    totalSpent: v.optional(v.number()),      // Total amount spent (in centavos)

    // ============================================================================
    // WALKTHROUGH TUTORIAL FIELDS
    // ============================================================================
    has_seen_tutorial: v.optional(v.boolean()), // false/undefined = show tutorial
    tutorial_completed_at: v.optional(v.number()), // Timestamp of tutorial completion

    // ============================================================================
    // STAFF SCHEDULE & PAYROLL FIELDS
    // ============================================================================
    schedule: v.optional(v.object({
      monday: v.object({ available: v.boolean(), start: v.string(), end: v.string() }),
      tuesday: v.object({ available: v.boolean(), start: v.string(), end: v.string() }),
      wednesday: v.object({ available: v.boolean(), start: v.string(), end: v.string() }),
      thursday: v.object({ available: v.boolean(), start: v.string(), end: v.string() }),
      friday: v.object({ available: v.boolean(), start: v.string(), end: v.string() }),
      saturday: v.object({ available: v.boolean(), start: v.string(), end: v.string() }),
      sunday: v.object({ available: v.boolean(), start: v.string(), end: v.string() }),
    })),
    ot_hourly_rate: v.optional(v.number()), // OT pay per hour for staff
    penalty_hourly_rate: v.optional(v.number()), // Late/UT penalty deduction per hour for staff

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_username", ["username"])
    .index("by_created_at", ["createdAt"])
    .index("by_branch", ["branch_id"])
    .index("by_role", ["role"])
    .index("by_branch_role", ["branch_id", "role"])
    // Clerk RBAC indexes (Story 10.1)
    .index("by_clerk_user_id", ["clerk_user_id"])
    .index("by_migration_status", ["migration_status"]),

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
    coverPhotoStorageId: v.optional(v.id("_storage")),
    bio: v.optional(v.string()),
    experience: v.string(),
    rating: v.number(),
    totalBookings: v.number(),
    monthlyRevenue: v.number(),
    specialties: v.array(v.string()),

    // Structured bio fields (no approval needed)
    certifications: v.optional(v.array(
      v.union(v.string(), v.object({ name: v.string(), imageId: v.optional(v.id("_storage")) }))
    )),
    years_of_experience: v.optional(v.number()),

    // Bio approval workflow
    bio_approval_status: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))),
    pending_bio: v.optional(v.string()),
    pending_certifications: v.optional(v.array(
      v.union(v.string(), v.object({ name: v.string(), imageId: v.optional(v.id("_storage")) }))
    )),
    bio_reviewed_by: v.optional(v.id("users")),
    bio_reviewed_at: v.optional(v.number()),
    bio_rejection_reason: v.optional(v.string()),
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
    // Shift settings for attendance/payroll tracking (separate from booking schedule)
    shift_start: v.optional(v.string()),    // "09:00" — expected clock-in time
    shift_end: v.optional(v.string()),      // "18:00" — expected clock-out time
    ot_hourly_rate: v.optional(v.number()), // OT pay per hour (e.g., 50)
    penalty_hourly_rate: v.optional(v.number()), // Late/UT penalty deduction per hour (e.g., 30)

    // Custom booking feature - allows barbers to have a custom form instead of regular booking
    custom_booking_enabled: v.optional(v.boolean()),
    custom_booking_form_id: v.optional(v.id("custom_booking_forms")),

    // ============================================================================
    // BARBER MATCHER PROFILE (Help Me Choose Feature - Phase 3)
    // ============================================================================
    // Style vibes the barber excels at (used for matching)
    style_vibes: v.optional(v.array(v.union(
      v.literal("classic"),    // Traditional, clean cuts
      v.literal("trendy"),     // Modern, fashion-forward
      v.literal("edgy"),       // Bold, experimental
      v.literal("clean")       // Minimalist, precise
    ))),
    // Conversation style during cuts
    conversation_style: v.optional(v.union(
      v.literal("chatty"),     // Loves to talk, social
      v.literal("balanced"),   // Responsive but not pushy
      v.literal("quiet")       // Focused, minimal small talk
    )),
    // Work pace/speed
    work_speed: v.optional(v.union(
      v.literal("fast"),       // Efficient, quick service
      v.literal("moderate"),   // Standard pace
      v.literal("detailed")    // Takes time for precision
    )),
    // Price positioning
    price_tier: v.optional(v.union(
      v.literal("budget"),     // Entry-level pricing
      v.literal("mid"),        // Average market rate
      v.literal("premium")     // Top-tier pricing
    )),
    // Showcase images for matcher swipe (best work samples)
    showcase_images: v.optional(v.array(v.string())),
    // Barber's own tagline/intro
    matcher_tagline: v.optional(v.string()),

    // Weekly earnings goal (set by barber)
    weekly_goal: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["user"])
    .index("by_active", ["is_active"])
    .index("by_branch", ["branch_id"])
    .index("by_custom_booking", ["custom_booking_enabled"])
    .index("by_bio_approval_status", ["bio_approval_status"]),

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
      v.union(
        v.literal("unpaid"),
        v.literal("paid"),
        v.literal("partial"),     // Pay Later: convenience fee paid, balance due at branch
        v.literal("refunded")
      )
    ),
    // PayMongo payment integration fields (Story 7.1)
    paymongo_link_id: v.optional(v.string()),      // PayMongo payment link ID
    paymongo_payment_id: v.optional(v.string()),   // PayMongo payment ID
    convenience_fee_paid: v.optional(v.number()),  // Amount of convenience fee paid for Pay Later
    payment_method: v.optional(v.string()),        // Payment method: "paymongo", "wallet", "cash", "combo"
    // Combo payment fields (wallet + PayMongo)
    is_combo_payment: v.optional(v.boolean()),     // True if paid with wallet + PayMongo
    wallet_portion: v.optional(v.number()),        // Amount paid from wallet
    wallet_debit_failed: v.optional(v.boolean()),  // True if wallet debit failed after PayMongo success
    price: v.number(),
    voucher_id: v.optional(v.id("vouchers")), // Link to voucher if used
    discount_amount: v.optional(v.number()), // Discount applied
    booking_fee: v.optional(v.number()), // Booking fee applied
    late_fee: v.optional(v.number()), // Late fee applied
    final_price: v.optional(v.number()), // Price after discount
    notes: v.optional(v.string()),
    reminder_sent: v.optional(v.boolean()),
    check_in_reminder_sent: v.optional(v.boolean()),
    // PayMongo fallback tracking
    processed_via_admin: v.optional(v.boolean()), // true if admin's PayMongo was used as fallback
    createdAt: v.number(),
    updatedAt: v.number(),
    completed_at: v.optional(v.number()), // Timestamp when booking was marked complete
  })
    .index("by_customer", ["customer"])
    .index("by_barber", ["barber"])
    .index("by_date", ["date"])
    .index("by_status", ["status"])
    .index("by_payment_status", ["payment_status"])
    .index("by_booking_code", ["booking_code"])
    .index("by_branch", ["branch_id"])
    .index("by_date_reminder", ["date", "reminder_sent"])
    .index("by_barber_date", ["barber", "date"])
    .index("by_paymongo_link", ["paymongo_link_id"]),

  // Walk-ins table - for customers who come without booking
  walkIns: defineTable({
    name: v.string(),
    number: v.string(),
    assignedBarber: v.string(), // Barber's full name
    barberId: v.id("barbers"), // Reference to the barber
    branch_id: v.id("branches"),
    queueNumber: v.number(), // Auto-assigned queue number for FIFO ordering
    service_id: v.optional(v.id("services")), // Selected service
    scheduled_time: v.optional(v.string()), // "HH:MM" assigned time slot
    notes: v.optional(v.string()),
    status: v.string(), // 'active', 'completed', 'cancelled'
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_barber", ["barberId"])
    .index("by_branch", ["branch_id"])
    .index("by_status", ["status"])
    .index("by_created_at", ["createdAt"])
    .index("by_branch_status", ["branch_id", "status"])
    .index("by_queue_number", ["queueNumber"]),

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

  // Products table (Branch-level inventory)
  products: defineTable({
    branch_id: v.id("branches"), // Which branch owns this product
    catalog_product_id: v.optional(v.id("productCatalog")), // Link to central catalog (auto-synced)
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
    .index("by_branch", ["branch_id"])
    .index("by_category", ["category"])
    .index("by_sku", ["sku"])
    .index("by_status", ["status"])
    .index("by_stock", ["stock"])
    .index("by_branch_category", ["branch_id", "category"])
    .index("by_branch_status", ["branch_id", "status"])
    .index("by_branch_catalog", ["branch_id", "catalog_product_id"]),

  // POS Transactions table
  transactions: defineTable({
    transaction_id: v.string(),
    branch_id: v.id("branches"),
    customer: v.optional(v.id("users")), // Optional for walk-in customers
    customer_name: v.optional(v.string()), // For walk-in customers
    customer_phone: v.optional(v.string()), // For walk-in customers
    customer_email: v.optional(v.string()), // For walk-in customers
    customer_address: v.optional(v.string()), // For walk-in customers
    barber: v.optional(v.id("barbers")), // Optional for retail-only transactions
    services: v.optional(
      v.array(
        v.object({
          service_id: v.id("services"),
          service_name: v.string(),
          price: v.number(),
          quantity: v.number(),
        })
      )
    ),
    products: v.optional(
      v.array(
        v.object({
          product_id: v.union(v.id("products"), v.id("productCatalog")), // Support both branch and catalog products
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
      v.literal("bank_transfer"),
      v.literal("wallet"), // Customer wallet payment
      v.literal("combo") // Combination of points, wallet, and cash
    ),
    payment_status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("refunded")
    ),
    transaction_type: v.optional(
      v.union(
        v.literal("service"),
        v.literal("retail")
      )
    ), // "service" = barber+services required, "retail" = products only
    notes: v.optional(v.string()),
    cash_received: v.optional(v.number()), // Amount of cash received for cash payments
    change_amount: v.optional(v.number()), // Change given back for cash payments
    // Combo payment fields (for payment_method = "combo")
    points_redeemed: v.optional(v.number()), // Integer ×100 format (e.g., 20000 = 200 pts = ₱200)
    wallet_used: v.optional(v.number()), // Wallet amount deducted (e.g., 150 = ₱150)
    cash_collected: v.optional(v.number()), // Cash portion collected (e.g., 150 = ₱150)
    // Delivery fields
    fulfillment_type: v.optional(v.literal("delivery")), // Delivery only
    delivery_address: v.optional(v.object({
      street_address: v.string(),
      barangay: v.optional(v.string()),
      city: v.string(),
      province: v.string(),
      zip_code: v.string(),
      landmark: v.optional(v.string()),
      contact_name: v.string(),
      contact_phone: v.string(),
      notes: v.optional(v.string()),
    })),
    delivery_fee: v.optional(v.number()), // Delivery fee in pesos
    delivery_status: v.optional(v.union(
      v.literal("pending"),
      v.literal("preparing"),
      v.literal("out_for_delivery"),
      v.literal("delivered"),
      v.literal("cancelled")
    )),
    estimated_delivery: v.optional(v.string()), // e.g., "30-45 mins" or timestamp
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
              product_id: v.union(v.id("products"), v.id("productCatalog")), // Support both branch and catalog products
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
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("bi_weekly"),
      v.literal("monthly")
    ),
    payout_day: v.number(), // Day of week (0-6) for weekly, day of month (1-31) for monthly
    tax_rate: v.optional(v.number()), // Tax percentage to deduct
    include_booking_fee: v.optional(v.boolean()), // Whether to include booking fees in payroll
    booking_fee_percentage: v.optional(v.number()), // Percentage of booking fee for barber (default 100%)
    include_late_fee: v.optional(v.boolean()), // Whether to include late fees in payroll
    late_fee_percentage: v.optional(v.number()), // Percentage of late fee for barber (default 100%)
    include_convenience_fee: v.optional(v.boolean()), // Whether to include convenience fees in payroll
    convenience_fee_percentage: v.optional(v.number()), // Percentage of convenience fee for barber (default 100%)
    zero_day_source: v.optional(v.string()), // "disabled" | "manual" | "attendance"
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
      v.literal("daily"),
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
    // Lock feature - prevents recalculation after finalization
    is_locked: v.optional(v.boolean()), // Whether period is locked from changes
    locked_at: v.optional(v.number()), // When period was locked
    locked_by: v.optional(v.id("users")), // Who locked the period
    // Target: barber or staff (defaults to barber for backward compatibility)
    payroll_target: v.optional(v.union(v.literal("barber"), v.literal("staff"))),
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
    zero_service_days: v.optional(v.number()), // Approved zero-service days included
    zero_day_pay: v.optional(v.number()), // Amount added for zero-service days
    zero_day_dates: v.optional(v.array(v.string())), // Specific zero-day dates (YYYY-MM-DD)

    // Attendance time tracking (OT/UT/Late) — only when zero_day_source is "attendance"
    attendance_summary: v.optional(v.object({
      total_late_minutes: v.number(),
      total_undertime_minutes: v.number(),
      total_overtime_minutes: v.number(),
      total_ot_pay: v.number(),
      total_late_penalty: v.number(),
      total_ut_penalty: v.number(),
      total_penalty: v.number(),
      days_late: v.number(),
      days_undertime: v.number(),
      days_overtime: v.number(),
      daily_details: v.array(v.object({
        date: v.string(),
        scheduled_start: v.string(),
        scheduled_end: v.string(),
        actual_clock_in: v.string(),
        actual_clock_out: v.string(),
        late_minutes: v.number(),
        undertime_minutes: v.number(),
        overtime_minutes: v.number(),
      })),
    })),

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
          booking_fee: v.optional(v.number()),
          late_fee: v.optional(v.number()),
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

    // Fee earnings breakdown (total amounts collected)
    total_booking_fees: v.optional(v.number()),
    total_late_fees: v.optional(v.number()),
    total_convenience_fees: v.optional(v.number()),
    // Fee percentages for barber
    booking_fee_percentage: v.optional(v.number()),
    late_fee_percentage: v.optional(v.number()),
    convenience_fee_percentage: v.optional(v.number()),
    // Barber's calculated share of fees
    barber_booking_fees: v.optional(v.number()),
    barber_late_fees: v.optional(v.number()),
    barber_convenience_fees: v.optional(v.number()),

    // Deductions
    tax_deduction: v.number(), // Tax deducted
    cash_advance_deduction: v.optional(v.number()), // Cash advance repayment deduction
    cash_advance_details: v.optional(
      v.array(
        v.object({
          id: v.id("cashAdvances"),
          amount: v.number(),
          requested_at: v.number(),
          paid_out_at: v.optional(v.number()),
          // Installment tracking fields
          installment_amount: v.optional(v.number()), // Amount to deduct per installment
          repayment_terms: v.optional(v.number()), // Total number of installments (1, 2, or 3)
          installments_paid: v.optional(v.number()), // Number of installments already paid
          remaining_installments: v.optional(v.number()), // Remaining installments
          remaining_amount: v.optional(v.number()), // Remaining balance
          total_repaid: v.optional(v.number()), // Total amount already repaid
        })
      )
    ), // Details of advances being deducted
    other_deductions: v.number(), // Other deductions (insurance, etc.)
    total_deductions: v.number(), // Total deductions (including cash advance)

    // Final amounts
    net_pay: v.number(), // Final amount to be paid (after all deductions)

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
    bonus_balance: v.optional(v.number()), // Bonus from top-ups (e.g., ₱500→₱550 gives ₱50 bonus)
    currency: v.optional(v.string()),
    // Story 23.4: Monthly bonus cap tracking
    bonus_topup_this_month: v.optional(v.number()), // Cumulative top-up amount that received bonus this month (pesos)
    bonus_month_started: v.optional(v.number()),    // Timestamp when current bonus month started
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
    bonus_amount: v.optional(v.number()), // Bonus amount given for this top-up (in pesos)
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

  // ============================================================================
  // LOYALTY POINTS SYSTEM (Customer Experience)
  // ============================================================================

  // Points ledger - User balances and lifetime tracking (universal across branches)
  // Integer ×100 storage pattern: 4575 = 45.75 points (avoids floating-point precision errors)
  points_ledger: defineTable({
    user_id: v.id("users"),
    current_balance: v.number(), // Integer ×100 (4575 = 45.75 pts)
    lifetime_earned: v.number(), // Integer ×100 - never decreases (used for tier promotion)
    lifetime_redeemed: v.number(), // Integer ×100
    last_activity_at: v.number(), // Unix timestamp (Date.now())
  }).index("by_user", ["user_id"]),

  // Points transactions - Full audit trail for all points operations
  // Immutable records (no updates, only inserts) for complete audit history
  points_transactions: defineTable({
    user_id: v.id("users"),
    branch_id: v.optional(v.id("branches")), // Optional for universal operations
    type: v.union(
      v.literal("earn"),
      v.literal("redeem"),
      v.literal("expire"),
      v.literal("adjust")
    ),
    amount: v.number(), // Integer ×100 (positive for earn, negative for redeem)
    balance_after: v.number(), // Integer ×100 - snapshot after transaction
    source_type: v.union(
      v.literal("payment"), // Points earned from service payment
      v.literal("wallet_payment"), // Points earned from wallet (1.5x)
      v.literal("redemption"), // Points redeemed for reward
      v.literal("top_up_bonus"), // Bonus points from wallet top-up
      v.literal("manual_adjustment"), // Admin adjustment
      v.literal("expiry") // System expiry
    ),
    source_id: v.optional(v.string()), // ID of payment/redemption/etc
    notes: v.optional(v.string()),
    created_at: v.number(), // Unix timestamp
  })
    .index("by_user", ["user_id"])
    .index("by_branch", ["branch_id"])
    .index("by_type", ["type"])
    .index("by_created_at", ["created_at"])
    .index("by_user_created", ["user_id", "created_at"]),

  // ============================================================================
  // CUSTOMER-BRANCH ACTIVITY TRACKING (Marketing, Promotions, Churn)
  // ============================================================================

  // Tracks customer activity per branch for marketing and churn prevention
  // Pre-computed metrics updated after each booking and via daily cron job
  // Status thresholds: active (0-12 days), at_risk (13-30 days), churned (31+ days)
  customer_branch_activity: defineTable({
    // Core relationship
    customer_id: v.id("users"),
    branch_id: v.id("branches"),

    // Activity metrics
    first_visit_date: v.number(),        // Timestamp of first completed booking
    last_visit_date: v.number(),         // Timestamp of last completed booking
    total_bookings: v.number(),          // Completed bookings count
    total_spent: v.number(),             // Total revenue from customer (pesos)

    // Engagement status
    // - new: Registered but no completed booking yet
    // - active: Visited within 12 days (normal haircut cycle)
    // - at_risk: 13-30 days since last visit (overdue, needs reminder)
    // - churned: 31+ days since last visit (lost customer)
    // - win_back: Was churned, has now returned
    status: v.union(
      v.literal("new"),
      v.literal("active"),
      v.literal("at_risk"),
      v.literal("churned"),
      v.literal("win_back")
    ),
    days_since_last_visit: v.optional(v.number()),

    // Marketing preferences
    opted_in_marketing: v.boolean(),
    preferred_contact: v.optional(v.union(
      v.literal("sms"),
      v.literal("email"),
      v.literal("push"),
      v.literal("none")
    )),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_customer", ["customer_id"])
    .index("by_branch", ["branch_id"])
    .index("by_customer_branch", ["customer_id", "branch_id"])
    .index("by_branch_status", ["branch_id", "status"])
    .index("by_branch_last_visit", ["branch_id", "last_visit_date"])
    .index("by_branch_total_spent", ["branch_id", "total_spent"]),

  // ============================================================================
  // VIP TIER SYSTEM (Customer Experience)
  // ============================================================================

  // VIP Tiers - Bronze, Silver, Gold, Platinum
  // Progression based on lifetime_earned points (not current balance)
  tiers: defineTable({
    name: v.string(), // "Bronze", "Silver", "Gold", "Platinum"
    threshold: v.number(), // Minimum lifetime_earned points (×100 format): 0, 500000, 1500000, 5000000
    display_order: v.number(), // 1, 2, 3, 4 for sorting
    icon: v.string(), // Emoji or icon identifier
    color: v.string(), // Hex color for badge display
    is_active: v.optional(v.boolean()), // Allow disabling tiers
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_threshold", ["threshold"])
    .index("by_name", ["name"])
    .index("by_display_order", ["display_order"]),

  // Tier Benefits - Perks for each tier level
  tier_benefits: defineTable({
    tier_id: v.id("tiers"),
    benefit_type: v.union(
      v.literal("points_multiplier"), // e.g., 1.05 for 5% bonus
      v.literal("priority_booking"), // Access to priority slots
      v.literal("free_service"), // Complimentary services
      v.literal("discount"), // Percentage discount
      v.literal("early_access"), // Early access to promos
      v.literal("vip_line"), // Dedicated service line
      v.literal("exclusive_event") // Member-only events
    ),
    benefit_value: v.number(), // Multiplier or percentage (e.g., 1.05 for 5% bonus)
    description: v.string(), // Human-readable description
    is_active: v.optional(v.boolean()),
    created_at: v.number(),
  })
    .index("by_tier", ["tier_id"])
    .index("by_type", ["benefit_type"]),

  // Loyalty Configuration - Dynamic settings for loyalty program economics
  // Super Admin configurable values that control points earning, multipliers, etc.
  loyalty_config: defineTable({
    config_key: v.string(), // Unique identifier: "base_earning_rate", "wallet_bonus_multiplier", etc.
    config_value: v.string(), // JSON-encoded value for flexibility
    config_type: v.union(
      v.literal("number"),
      v.literal("boolean"),
      v.literal("string"),
      v.literal("json")
    ),
    description: v.string(), // Human-readable description for admin UI
    updated_at: v.number(),
    updated_by: v.optional(v.id("users")), // Admin who last modified
  }).index("by_key", ["config_key"]),

  // Loyalty Config Audit Log - Track all configuration changes
  loyalty_config_audit: defineTable({
    config_key: v.string(),
    old_value: v.optional(v.string()),
    new_value: v.string(),
    changed_by: v.id("users"),
    changed_at: v.number(),
    change_reason: v.optional(v.string()),
  })
    .index("by_key", ["config_key"])
    .index("by_changed_at", ["changed_at"]),

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

  // Post likes tracking (for branch_posts)
  post_likes: defineTable({
    post_id: v.id("branch_posts"),
    user_id: v.id("users"),
    created_at: v.number(),
  })
    .index("by_post", ["post_id"])
    .index("by_user", ["user_id"])
    .index("by_post_user", ["post_id", "user_id"]),

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

  // Time attendance for barber clock in/out tracking
  timeAttendance: defineTable({
    barber_id: v.optional(v.id("barbers")),
    user_id: v.optional(v.id("users")),
    branch_id: v.id("branches"),
    clock_in: v.number(), // Unix timestamp (ms)
    clock_out: v.optional(v.number()), // null until clocked out
    status: v.optional(v.string()), // "pending_in" | "approved_in" | "pending_out" | "approved_out" | "rejected"
    reviewed_by: v.optional(v.string()), // staff user name who approved/rejected
    reviewed_at: v.optional(v.number()), // timestamp of approval/rejection
    created_at: v.number(),
    // Facial recognition fields
    confidence_score: v.optional(v.number()), // 0.0-1.0 FR match confidence
    photo_storage_id: v.optional(v.id("_storage")), // snapshot at clock event
    liveness_passed: v.optional(v.boolean()), // did liveness check pass
    device_fingerprint: v.optional(v.string()), // which kiosk device was used
    method: v.optional(v.string()), // "fr" | "manual" | "pin"
    geofence_passed: v.optional(v.boolean()), // was within branch geofence
  })
    .index("by_barber", ["barber_id"])
    .index("by_branch", ["branch_id"])
    .index("by_date", ["clock_in"])
    .index("by_barber_date", ["barber_id", "clock_in"])
    .index("by_user", ["user_id"])
    .index("by_branch_status", ["branch_id", "status"]),

  // Default service templates managed by Super Admin
  // Copied to new branches on creation
  defaultServices: defineTable({
    name: v.string(),
    description: v.string(),
    price: v.number(),
    duration_minutes: v.number(),
    category: v.string(),
    is_active: v.boolean(),
    hide_price: v.optional(v.boolean()),
    image: v.optional(v.string()),
    sort_order: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_active", ["is_active"]),

  // Central product catalog managed by Super Admin (Central Warehouse Inventory)
  productCatalog: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    price: v.number(), // Whole pesos (e.g., 500 = ₱500) - this is the SALE price when discount is active
    original_price: v.optional(v.number()), // Original price before discount (shown with strikethrough)
    cost: v.optional(v.number()), // Cost per unit for profit tracking
    category: v.string(),
    brand: v.optional(v.string()), // Product brand
    sku: v.optional(v.string()), // Stock Keeping Unit
    image_url: v.optional(v.string()), // External URL
    image_storage_id: v.optional(v.id("_storage")), // Convex storage ID
    // Inventory fields
    stock: v.number(), // Current total stock in central warehouse
    reserved_stock: v.optional(v.number()), // Stock reserved by approved orders (not yet shipped)
    minStock: v.number(), // Low stock threshold
    is_active: v.boolean(),
    price_enforced: v.boolean(), // If true, branches cannot change price
    // Promotional/Discount fields
    discount_percent: v.optional(v.number()), // Discount percentage (e.g., 37 for 37% off)
    promo_label: v.optional(v.string()), // e.g., "Flash Sale", "Hot Deal", "Limited"
    promo_start: v.optional(v.number()), // Promo start timestamp
    promo_end: v.optional(v.number()), // Promo end timestamp
    promo_quantity_limit: v.optional(v.number()), // Max items at promo price (e.g., "Only 50 items!")
    promo_quantity_sold: v.optional(v.number()), // Tracks how many sold at promo price
    is_featured: v.optional(v.boolean()), // Featured in flash sales
    created_at: v.number(),
    created_by: v.id("users"),
  })
    .index("by_category", ["category"])
    .index("by_is_active", ["is_active"])
    .index("by_stock", ["stock"])
    .index("by_sku", ["sku"])
    .index("by_featured", ["is_featured"]),

  // Inventory batches for FIFO tracking (First In, First Out)
  inventoryBatches: defineTable({
    product_id: v.string(), // ID from either productCatalog or products table
    product_type: v.union(v.literal("central"), v.literal("branch")), // Which table the product is from
    branch_id: v.optional(v.id("branches")), // null for central warehouse, set for branch inventory
    batch_number: v.string(), // e.g., "BATCH-2026-001"
    quantity: v.number(), // Remaining quantity in this batch
    initial_quantity: v.number(), // Original quantity when received
    received_at: v.number(), // When batch was received (Unix timestamp for FIFO sorting)
    expiry_date: v.optional(v.number()), // Optional expiry date tracking
    cost_per_unit: v.optional(v.number()), // Batch-specific cost
    supplier: v.optional(v.string()), // Supplier name
    notes: v.optional(v.string()),
    created_by: v.id("users"),
    created_at: v.number(),
  })
    .index("by_product", ["product_id"])
    .index("by_product_type", ["product_type"])
    .index("by_branch", ["branch_id"])
    .index("by_received_at", ["received_at"])
    .index("by_product_branch", ["product_id", "branch_id"]),

  // Product orders from branches to central warehouse
  productOrders: defineTable({
    order_number: v.string(), // e.g., "PO-2026-0001"
    branch_id: v.id("branches"), // Requesting branch
    requested_by: v.id("users"), // Branch admin who requested
    status: v.union(
      v.literal("pending"), // Awaiting super admin review
      v.literal("approved"), // Approved, being prepared
      v.literal("shipped"), // In transit to branch
      v.literal("received"), // Branch confirmed receipt
      v.literal("rejected"), // Super admin rejected
      v.literal("cancelled") // Branch cancelled
    ),
    items: v.array(
      v.object({
        catalog_product_id: v.id("productCatalog"),
        product_name: v.string(), // Denormalized for history
        quantity_requested: v.number(),
        quantity_approved: v.optional(v.number()),
        unit_price: v.number(), // Price at time of order
      })
    ),
    total_amount: v.number(),
    notes: v.optional(v.string()),
    rejection_reason: v.optional(v.string()),
    // Timestamps
    created_at: v.number(),
    approved_at: v.optional(v.number()),
    approved_by: v.optional(v.id("users")),
    shipped_at: v.optional(v.number()),
    received_at: v.optional(v.number()),

    // Payment tracking (separate from shipping)
    is_paid: v.optional(v.boolean()),
    paid_at: v.optional(v.number()),
    paid_by: v.optional(v.id("users")),
    payment_method: v.optional(v.union(
      v.literal("cash"),
      v.literal("bank_transfer"),
      v.literal("check"),
      v.literal("gcash"),
      v.literal("maya"),
      v.literal("branch_wallet")
    )),
    payment_reference: v.optional(v.string()),
    payment_notes: v.optional(v.string()),

    // Branch wallet payment tracking
    wallet_hold_amount: v.optional(v.number()),
    wallet_transaction_id: v.optional(v.string()),

    // Manual order flag (created by super admin, not branch request)
    is_manual_order: v.optional(v.boolean()),
    created_by_admin: v.optional(v.id("users")),
  })
    .index("by_branch", ["branch_id"])
    .index("by_status", ["status"])
    .index("by_created_at", ["created_at"])
    .index("by_order_number", ["order_number"])
    .index("by_paid", ["is_paid"]),

  // Damage claims for product orders (branch reports damaged items after receipt)
  damage_claims: defineTable({
    order_id: v.id("productOrders"),
    order_number: v.string(), // Denormalized for display
    branch_id: v.id("branches"),
    items: v.array(
      v.object({
        catalog_product_id: v.id("productCatalog"),
        product_name: v.string(),
        quantity_damaged: v.number(),
        unit_price: v.number(),
        damage_reason: v.union(
          v.literal("packaging"),
          v.literal("defect"),
          v.literal("shipping"),
          v.literal("expired"),
          v.literal("wrong_item"),
          v.literal("other")
        ),
        reason_note: v.optional(v.string()),
      })
    ),
    total_damage_amount: v.number(), // Sum of qty × unit_price for all damaged items
    description: v.string(), // Overall description of the damage
    images: v.optional(v.array(v.id("_storage"))), // Evidence photos
    status: v.union(
      v.literal("pending"),   // Awaiting super admin review
      v.literal("approved"),  // Approved + wallet credit issued
      v.literal("rejected")   // Denied by super admin
    ),
    submitted_by: v.id("users"),
    submitted_at: v.number(),
    reviewed_by: v.optional(v.id("users")),
    reviewed_at: v.optional(v.number()),
    rejection_reason: v.optional(v.string()),
    credit_amount: v.optional(v.number()), // Actual amount credited (may differ from total)
    wallet_transaction_id: v.optional(v.string()), // Reference to wallet credit transaction
  })
    .index("by_order", ["order_id"])
    .index("by_branch", ["branch_id"])
    .index("by_status", ["status"])
    .index("by_submitted_at", ["submitted_at"]),

  // Branch expenses for P&L tracking
  expenses: defineTable({
    branch_id: v.id("branches"),
    expense_type: v.union(
      v.literal("fixed"),      // Recurring monthly costs
      v.literal("operating")   // Variable costs
    ),
    category: v.union(
      // Fixed expenses
      v.literal("rent"),
      v.literal("utilities"),
      v.literal("insurance"),
      v.literal("salaries"),      // Fixed salaries (non-commission)
      v.literal("subscriptions"), // Software, services
      // Operating expenses
      v.literal("supplies"),
      v.literal("maintenance"),
      v.literal("marketing"),
      v.literal("equipment"),
      v.literal("transportation"),
      v.literal("miscellaneous")
    ),
    description: v.string(),
    amount: v.number(),
    expense_date: v.number(),  // Date of expense (Unix timestamp)
    receipt_url: v.optional(v.string()),
    receipt_storage_id: v.optional(v.id("_storage")),
    notes: v.optional(v.string()),
    is_recurring: v.boolean(),
    recurring_day: v.optional(v.number()), // Day of month for recurring
    // Double-entry accounting: link expense to asset account for automatic balance sheet adjustment
    paid_from_asset_id: v.optional(v.id("assets")), // Which asset (cash/bank) paid for this expense
    created_by: v.id("users"),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_branch", ["branch_id"])
    .index("by_category", ["category"])
    .index("by_expense_type", ["expense_type"])
    .index("by_expense_date", ["expense_date"])
    .index("by_branch_date", ["branch_id", "expense_date"]),

  // Branch Revenue table - Track manual revenue for branches
  branchRevenue: defineTable({
    branch_id: v.id("branches"),
    category: v.union(
      v.literal("service_tips"),       // Tips from services
      v.literal("product_sales"),      // Additional product sales
      v.literal("event_income"),       // Events, promotions
      v.literal("gift_card_sales"),    // Gift card sales
      v.literal("rental_income"),      // Chair rental, space rental
      v.literal("training_income"),    // Training fees
      v.literal("wallet_topup"),       // Branch wallet top-up (capital injection)
      v.literal("other")               // Other revenue
    ),
    description: v.string(),
    amount: v.number(),
    revenue_date: v.number(),           // Date of revenue
    notes: v.optional(v.string()),
    is_automated: v.optional(v.boolean()), // true = system-generated (wallet topup, etc.)
    // Payment destination tracking (double-entry: debit cash/asset, credit revenue)
    received_to_asset_id: v.optional(v.id("assets")), // Specific manual asset
    received_to_cash: v.optional(v.boolean()), // true = received to cash on hand
    created_by: v.id("users"),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_branch", ["branch_id"])
    .index("by_category", ["category"])
    .index("by_revenue_date", ["revenue_date"])
    .index("by_branch_date", ["branch_id", "revenue_date"]),

  // ============================================================================
  // BALANCE SHEET TABLES
  // ============================================================================

  // Assets table - Track business assets
  assets: defineTable({
    branch_id: v.id("branches"),
    asset_type: v.union(
      v.literal("current"),       // Cash, receivables, inventory
      v.literal("fixed"),         // Equipment, furniture, property
      v.literal("intangible")     // Software licenses, goodwill
    ),
    category: v.union(
      // Current assets
      v.literal("cash"),                  // Cash on hand, petty cash
      v.literal("bank_accounts"),         // Bank balances
      v.literal("accounts_receivable"),   // Money owed to business
      v.literal("inventory"),             // Product inventory value
      v.literal("prepaid_expenses"),      // Prepaid rent, insurance
      // Fixed assets
      v.literal("equipment"),             // Barber equipment, chairs
      v.literal("furniture"),             // Shop furniture
      v.literal("leasehold_improvements"), // Shop renovations
      v.literal("vehicles"),              // Business vehicles
      // Intangible assets
      v.literal("software"),              // Software licenses
      v.literal("deposits"),              // Security deposits
      v.literal("other")
    ),
    name: v.string(),                     // Asset name/description
    purchase_value: v.number(),           // Original purchase price
    current_value: v.number(),            // Current book value
    purchase_date: v.optional(v.number()), // When asset was acquired
    depreciation_rate: v.optional(v.number()), // Annual depreciation %
    accumulated_depreciation: v.optional(v.number()),
    notes: v.optional(v.string()),
    is_active: v.boolean(),
    created_by: v.id("users"),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_branch", ["branch_id"])
    .index("by_asset_type", ["asset_type"])
    .index("by_category", ["category"])
    .index("by_active", ["is_active"])
    .index("by_branch_type", ["branch_id", "asset_type"]),

  // Liabilities table - Track business debts and obligations
  liabilities: defineTable({
    branch_id: v.id("branches"),
    liability_type: v.union(
      v.literal("current"),       // Due within 1 year
      v.literal("long_term")      // Due after 1 year
    ),
    category: v.union(
      // Current liabilities
      v.literal("accounts_payable"),      // Money owed to suppliers
      v.literal("wages_payable"),         // Unpaid wages/commissions
      v.literal("taxes_payable"),         // Tax obligations
      v.literal("unearned_revenue"),      // Prepaid services not delivered
      v.literal("credit_card"),           // Credit card balances
      v.literal("short_term_loan"),       // Loans due within year
      v.literal("accrued_expenses"),      // Expenses incurred not paid
      // Long-term liabilities
      v.literal("bank_loan"),             // Business loans
      v.literal("equipment_financing"),   // Equipment loans
      v.literal("lease_obligations"),     // Long-term leases
      v.literal("owner_loan"),            // Loans from owners
      v.literal("other")
    ),
    name: v.string(),                     // Liability name/description
    original_amount: v.number(),          // Original debt amount
    current_balance: v.number(),          // Current outstanding balance
    interest_rate: v.optional(v.number()), // Annual interest rate %
    due_date: v.optional(v.number()),     // When payment is due
    payment_frequency: v.optional(v.union(
      v.literal("one_time"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("quarterly"),
      v.literal("annually")
    )),
    monthly_payment: v.optional(v.number()),
    creditor: v.optional(v.string()),     // Who is owed
    notes: v.optional(v.string()),
    is_active: v.boolean(),
    created_by: v.id("users"),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_branch", ["branch_id"])
    .index("by_liability_type", ["liability_type"])
    .index("by_category", ["category"])
    .index("by_active", ["is_active"])
    .index("by_due_date", ["due_date"])
    .index("by_branch_type", ["branch_id", "liability_type"]),

  // Equity table - Track owner's equity and retained earnings
  equity: defineTable({
    branch_id: v.id("branches"),
    equity_type: v.union(
      v.literal("owner_capital"),         // Owner's investment
      v.literal("retained_earnings"),     // Accumulated profits
      v.literal("drawings"),              // Owner withdrawals
      v.literal("additional_investment"), // Additional capital injections
      v.literal("other")
    ),
    description: v.string(),
    amount: v.number(),                   // Positive for investment, negative for drawings
    transaction_date: v.number(),         // Date of transaction
    notes: v.optional(v.string()),
    created_by: v.id("users"),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_branch", ["branch_id"])
    .index("by_equity_type", ["equity_type"])
    .index("by_transaction_date", ["transaction_date"])
    .index("by_branch_type", ["branch_id", "equity_type"]),

  // Balance sheet snapshots for historical tracking
  balance_sheet_snapshots: defineTable({
    branch_id: v.id("branches"),
    snapshot_date: v.number(),            // Date of snapshot
    total_assets: v.number(),
    total_liabilities: v.number(),
    total_equity: v.number(),
    // Detailed breakdown
    current_assets: v.number(),
    fixed_assets: v.number(),
    intangible_assets: v.number(),
    current_liabilities: v.number(),
    long_term_liabilities: v.number(),
    cash_and_equivalents: v.optional(v.number()), // Balancing entry for Assets = Liabilities + Equity
    // Calculated metrics
    working_capital: v.number(),          // Current Assets - Current Liabilities
    debt_to_equity_ratio: v.optional(v.number()),
    current_ratio: v.optional(v.number()), // Current Assets / Current Liabilities
    notes: v.optional(v.string()),
    created_by: v.id("users"),
    created_at: v.number(),
  })
    .index("by_branch", ["branch_id"])
    .index("by_snapshot_date", ["snapshot_date"])
    .index("by_branch_date", ["branch_id", "snapshot_date"]),

  // Accounting periods for formal month-end/period-end closing
  accounting_periods: defineTable({
    branch_id: v.id("branches"),
    period_name: v.string(),              // e.g., "January 2026", "Q1 2026"
    period_type: v.union(
      v.literal("monthly"),
      v.literal("quarterly"),
      v.literal("yearly")
    ),
    start_date: v.number(),               // Period start timestamp
    end_date: v.number(),                 // Period end timestamp
    status: v.union(
      v.literal("open"),                  // Period is active, transactions allowed
      v.literal("closing"),               // Period being reviewed before close
      v.literal("closed")                 // Period closed, no more changes
    ),
    // Frozen snapshot at close
    snapshot: v.optional(v.object({
      total_assets: v.number(),
      total_liabilities: v.number(),
      total_equity: v.number(),
      current_assets: v.number(),
      fixed_assets: v.number(),
      intangible_assets: v.number(),
      current_liabilities: v.number(),
      long_term_liabilities: v.number(),
      retained_earnings: v.number(),
      cash_and_equivalents: v.optional(v.number()), // Balancing entry for Assets = Liabilities + Equity
      inventory_value: v.number(),
      revenue: v.number(),
      expenses: v.number(),
      net_income: v.number(),
      working_capital: v.number(),
      current_ratio: v.optional(v.number()),
      debt_to_equity_ratio: v.optional(v.number()),
    })),
    notes: v.optional(v.string()),
    closed_by: v.optional(v.id("users")),
    closed_at: v.optional(v.number()),
    created_by: v.id("users"),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_branch", ["branch_id"])
    .index("by_status", ["status"])
    .index("by_start_date", ["start_date"])
    .index("by_end_date", ["end_date"])
    .index("by_branch_status", ["branch_id", "status"])
    .index("by_branch_date", ["branch_id", "start_date"]),

  // ============================================================================
  // CASH ADVANCE SYSTEM
  // ============================================================================
  // Manages barber cash advance requests and approvals
  // Integrates with payroll for automatic deduction
  // ============================================================================

  // ============================================================================
  // ROYALTY MANAGEMENT SYSTEM
  // ============================================================================
  // Manages royalty rates and payments for franchisees
  // Super Admin configures rates; system calculates monthly dues
  // ============================================================================

  royaltyConfig: defineTable({
    branch_id: v.id("branches"),        // Branch this config applies to
    royalty_type: v.union(
      v.literal("percentage"),          // Percentage of monthly revenue
      v.literal("fixed")                // Fixed amount per month
    ),
    rate: v.number(),                   // Percentage (e.g., 10 for 10%) or fixed amount
    billing_cycle: v.union(
      v.literal("monthly"),             // Due monthly
      v.literal("quarterly"),           // Due quarterly
      v.literal("annually")             // Due annually
    ),
    billing_day: v.optional(v.number()), // Day of month to generate royalty (1-31, default: 1)
    grace_period_days: v.optional(v.number()), // Days after billing before late (default: 7)
    late_fee_rate: v.optional(v.number()), // Late fee percentage (e.g., 5 for 5%)
    notes: v.optional(v.string()),
    is_active: v.boolean(),
    created_by: v.id("users"),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_branch", ["branch_id"])
    .index("by_active", ["is_active"])
    .index("by_branch_active", ["branch_id", "is_active"]),

  // Royalty payment records - tracks what each branch owes
  royaltyPayments: defineTable({
    branch_id: v.id("branches"),          // Branch this payment is for
    config_id: v.id("royaltyConfig"),     // Reference to the config used
    period_start: v.number(),             // Start of billing period
    period_end: v.number(),               // End of billing period
    period_label: v.string(),             // Human-readable period (e.g., "January 2026")

    // Revenue and calculation details
    gross_revenue: v.number(),            // Branch revenue for the period
    royalty_type: v.union(
      v.literal("percentage"),
      v.literal("fixed")
    ),
    rate: v.number(),                     // Rate used for calculation
    amount: v.number(),                   // Calculated royalty amount
    late_fee: v.optional(v.number()),     // Late fee if applicable
    total_due: v.number(),                // amount + late_fee

    // Payment status
    status: v.union(
      v.literal("due"),                   // Payment is due
      v.literal("overdue"),               // Past grace period
      v.literal("paid"),                  // Payment received
      v.literal("waived")                 // Waived by super admin
    ),
    due_date: v.number(),                 // When payment is due
    grace_period_end: v.number(),         // After this, late fees apply

    // Payment tracking
    paid_at: v.optional(v.number()),
    paid_amount: v.optional(v.number()),
    payment_method: v.optional(v.string()),
    payment_reference: v.optional(v.string()), // Bank reference, check number, etc.
    receipt_id: v.optional(v.id("officialReceipts")), // Link to official receipt

    // Audit
    notes: v.optional(v.string()),
    created_at: v.number(),
    created_by: v.id("users"),
    updated_at: v.number(),
    updated_by: v.optional(v.id("users")),
  })
    .index("by_branch", ["branch_id"])
    .index("by_status", ["status"])
    .index("by_due_date", ["due_date"])
    .index("by_branch_status", ["branch_id", "status"])
    .index("by_period", ["period_start", "period_end"]),

  // Official receipts for royalty payments
  officialReceipts: defineTable({
    receipt_number: v.string(),           // Sequential: "OR-2026-00001"
    payment_id: v.id("royaltyPayments"),  // Link to the royalty payment
    branch_id: v.id("branches"),          // Branch that paid
    amount: v.number(),                   // Amount paid
    payment_method: v.optional(v.string()), // How payment was made
    payment_reference: v.optional(v.string()), // Bank ref, check number, etc.
    period_label: v.string(),             // e.g., "January 2026"
    issued_at: v.number(),                // When receipt was issued
    issued_by: v.id("users"),             // Super Admin who issued
    notes: v.optional(v.string()),
    created_at: v.number(),
  })
    .index("by_receipt_number", ["receipt_number"])
    .index("by_payment", ["payment_id"])
    .index("by_branch", ["branch_id"])
    .index("by_issued_at", ["issued_at"]),

  // Counter for sequential receipt numbering (NFR11 compliance)
  receiptCounters: defineTable({
    counter_type: v.string(),  // e.g., "official_receipt"
    year: v.number(),          // Year for reset
    last_number: v.number(),   // Last used number
    updated_at: v.number(),
  })
    .index("by_type_year", ["counter_type", "year"]),

  // ============================================================================
  // SUPER ADMIN FINANCIAL TABLES
  // ============================================================================
  // Separate financial tracking for Super Admin (NOT branch aggregation)
  // Super Admin's own P&L and Balance Sheet entries
  // ============================================================================

  // Super Admin Revenue - manual revenue entries
  superAdminRevenue: defineTable({
    category: v.union(
      v.literal("royalty_income"),      // Royalty payments from branches (automated)
      v.literal("product_order_income"), // Product order payments (automated)
      v.literal("commission_income"),   // Settlement commission income (automated)
      v.literal("consulting"),          // Consulting fees
      v.literal("franchise_fee"),       // Initial franchise fees
      v.literal("training_fee"),        // Training program fees
      v.literal("marketing_fee"),       // Marketing fund contributions
      v.literal("other")                // Other revenue
    ),
    description: v.string(),
    amount: v.number(),
    revenue_date: v.number(),           // Date of revenue
    reference_id: v.optional(v.string()), // External reference if applicable
    // Link to automated source (for royalty/product orders/settlements)
    royalty_payment_id: v.optional(v.id("royaltyPayments")),
    product_order_id: v.optional(v.id("productOrders")),
    settlement_id: v.optional(v.id("branchSettlements")),
    notes: v.optional(v.string()),
    is_automated: v.boolean(),          // true for system-generated entries
    // Payment destination tracking (double-entry: debit cash/asset, credit revenue)
    received_to_asset_id: v.optional(v.id("superAdminAssets")), // Specific manual asset
    received_to_sales_cash: v.optional(v.boolean()), // true = received to automated sales cash pool
    created_by: v.id("users"),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_revenue_date", ["revenue_date"])
    .index("by_automated", ["is_automated"])
    .index("by_royalty_payment", ["royalty_payment_id"])
    .index("by_product_order", ["product_order_id"])
    .index("by_settlement", ["settlement_id"])
    .index("by_received_to_sales_cash", ["received_to_sales_cash"]),

  // Super Admin Expenses - manual expense entries
  superAdminExpenses: defineTable({
    expense_type: v.union(
      v.literal("fixed"),               // Fixed monthly costs
      v.literal("operating")            // Variable costs
    ),
    category: v.union(
      // Fixed expenses
      v.literal("office_rent"),
      v.literal("utilities"),
      v.literal("insurance"),
      v.literal("salaries"),            // HQ staff salaries
      v.literal("subscriptions"),       // Software, services
      // Operating expenses
      v.literal("supplies"),
      v.literal("travel"),
      v.literal("marketing"),
      v.literal("legal_accounting"),
      v.literal("training_costs"),
      v.literal("warehouse_costs"),     // Central warehouse costs
      v.literal("miscellaneous")
    ),
    description: v.string(),
    amount: v.number(),
    expense_date: v.number(),           // Date of expense
    receipt_url: v.optional(v.string()),
    receipt_storage_id: v.optional(v.id("_storage")),
    notes: v.optional(v.string()),
    is_recurring: v.boolean(),
    recurring_day: v.optional(v.number()),
    // Payment source tracking (double-entry: debit expense, credit cash/asset)
    paid_from_asset_id: v.optional(v.id("superAdminAssets")), // Specific manual asset
    paid_from_sales_cash: v.optional(v.boolean()), // true = paid from automated sales cash
    created_by: v.id("users"),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_expense_type", ["expense_type"])
    .index("by_expense_date", ["expense_date"])
    .index("by_paid_from_sales_cash", ["paid_from_sales_cash"]),

  // Super Admin Assets
  superAdminAssets: defineTable({
    asset_type: v.union(
      v.literal("current"),             // Cash, receivables
      v.literal("fixed"),               // Equipment, furniture
      v.literal("intangible")           // Software, goodwill
    ),
    category: v.union(
      // Current assets
      v.literal("cash"),
      v.literal("bank_accounts"),
      v.literal("royalty_receivables"), // Unpaid royalties (automated)
      v.literal("product_order_receivables"), // Unpaid product orders (automated)
      v.literal("accounts_receivable"),
      v.literal("prepaid_expenses"),
      // Fixed assets
      v.literal("equipment"),
      v.literal("furniture"),
      v.literal("vehicles"),
      v.literal("warehouse_equipment"),
      // Intangible assets
      v.literal("software"),
      v.literal("trademarks"),
      v.literal("franchise_rights"),
      v.literal("deposits"),
      v.literal("other")
    ),
    name: v.string(),
    purchase_value: v.number(),
    current_value: v.number(),
    purchase_date: v.optional(v.number()),
    depreciation_rate: v.optional(v.number()),
    accumulated_depreciation: v.optional(v.number()),
    notes: v.optional(v.string()),
    is_active: v.boolean(),
    is_automated: v.optional(v.boolean()), // true for system-calculated (receivables)
    created_by: v.id("users"),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_asset_type", ["asset_type"])
    .index("by_category", ["category"])
    .index("by_active", ["is_active"]),

  // Super Admin Liabilities
  superAdminLiabilities: defineTable({
    liability_type: v.union(
      v.literal("current"),             // Due within 1 year
      v.literal("long_term")            // Due after 1 year
    ),
    category: v.union(
      // Current liabilities
      v.literal("accounts_payable"),
      v.literal("wages_payable"),
      v.literal("taxes_payable"),
      v.literal("credit_card"),
      v.literal("short_term_loan"),
      v.literal("accrued_expenses"),
      // Long-term liabilities
      v.literal("bank_loan"),
      v.literal("equipment_financing"),
      v.literal("owner_loan"),
      v.literal("other")
    ),
    name: v.string(),
    original_amount: v.number(),
    current_balance: v.number(),
    interest_rate: v.optional(v.number()),
    due_date: v.optional(v.number()),
    payment_frequency: v.optional(v.union(
      v.literal("one_time"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("quarterly"),
      v.literal("annually")
    )),
    monthly_payment: v.optional(v.number()),
    creditor: v.optional(v.string()),
    notes: v.optional(v.string()),
    is_active: v.boolean(),
    created_by: v.id("users"),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_liability_type", ["liability_type"])
    .index("by_category", ["category"])
    .index("by_active", ["is_active"])
    .index("by_due_date", ["due_date"]),

  // Super Admin Equity
  superAdminEquity: defineTable({
    equity_type: v.union(
      v.literal("owner_capital"),
      v.literal("retained_earnings"),
      v.literal("drawings"),
      v.literal("additional_investment"),
      v.literal("other")
    ),
    description: v.string(),
    amount: v.number(),
    transaction_date: v.number(),
    notes: v.optional(v.string()),
    created_by: v.id("users"),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_equity_type", ["equity_type"])
    .index("by_transaction_date", ["transaction_date"]),

  // Super Admin Accounting Periods (Lock-in periods for financial reporting)
  superAdminAccountingPeriods: defineTable({
    period_name: v.string(),              // e.g., "January 2026", "Q1 2026"
    period_type: v.union(
      v.literal("monthly"),
      v.literal("quarterly"),
      v.literal("yearly")
    ),
    start_date: v.number(),               // Period start timestamp
    end_date: v.number(),                 // Period end timestamp
    status: v.union(
      v.literal("open"),                  // Period is active, entries allowed
      v.literal("closing"),               // Period being reviewed before close
      v.literal("closed")                 // Period closed, no more changes
    ),
    // Frozen snapshot at close
    snapshot: v.optional(v.object({
      total_assets: v.number(),
      total_liabilities: v.number(),
      total_equity: v.number(),
      current_assets: v.number(),
      fixed_assets: v.number(),
      intangible_assets: v.number(),
      current_liabilities: v.number(),
      long_term_liabilities: v.number(),
      retained_earnings: v.number(),
      cash_and_equivalents: v.optional(v.number()), // Balancing entry for Assets = Liabilities + Equity
      // Automated cash tracking
      royalty_cash_received: v.number(),
      product_order_cash_received: v.number(),
      total_sales_cash: v.number(),
      // Receivables
      royalty_receivables: v.optional(v.number()),
      order_receivables: v.optional(v.number()),
      // P&L data
      total_revenue: v.number(),
      total_expenses: v.number(),
      net_income: v.number(),
      // Ratios
      working_capital: v.number(),
      current_ratio: v.optional(v.number()),
      debt_to_equity_ratio: v.optional(v.number()),
    })),
    notes: v.optional(v.string()),
    closed_by: v.optional(v.id("users")),
    closed_at: v.optional(v.number()),
    created_by: v.id("users"),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_start_date", ["start_date"])
    .index("by_end_date", ["end_date"]),

  // Super Admin Balance Sheet Snapshots (historical records)
  superAdminBalanceSheetSnapshots: defineTable({
    snapshot_date: v.number(),
    period_id: v.optional(v.id("superAdminAccountingPeriods")),
    total_assets: v.number(),
    total_liabilities: v.number(),
    total_equity: v.number(),
    current_assets: v.number(),
    fixed_assets: v.number(),
    intangible_assets: v.number(),
    current_liabilities: v.number(),
    long_term_liabilities: v.number(),
    cash_and_equivalents: v.optional(v.number()), // Balancing entry for Assets = Liabilities + Equity
    royalty_cash_received: v.optional(v.number()),
    product_order_cash_received: v.optional(v.number()),
    total_sales_cash: v.optional(v.number()),
    working_capital: v.number(),
    current_ratio: v.optional(v.number()),
    debt_to_equity_ratio: v.optional(v.number()),
    notes: v.optional(v.string()),
    created_by: v.id("users"),
    created_at: v.number(),
  })
    .index("by_snapshot_date", ["snapshot_date"])
    .index("by_period", ["period_id"]),

  cashAdvances: defineTable({
    barber_id: v.id("users"),           // The barber requesting the advance
    branch_id: v.id("branches"),        // Branch for isolation
    amount: v.number(),                 // Amount requested
    reason: v.optional(v.string()),     // Optional reason for the request
    status: v.union(
      v.literal("pending"),             // Awaiting approval
      v.literal("approved"),            // Approved, ready for payout
      v.literal("rejected"),            // Rejected by admin
      v.literal("paid_out"),            // Cash given to barber
      v.literal("repaid")               // Fully deducted from payroll
    ),
    max_allowed: v.number(),            // 50% of avg 2-week earnings at time of request
    requested_at: v.number(),           // Timestamp of request
    decided_at: v.optional(v.number()), // When approved/rejected
    decided_by: v.optional(v.id("users")), // Branch admin who decided
    rejection_reason: v.optional(v.string()),
    paid_out_at: v.optional(v.number()), // When cash was given
    repaid_at: v.optional(v.number()),   // When fully deducted from payroll
    payroll_id: v.optional(v.id("payroll_records")), // Link to payroll record where deducted
    // Installment repayment fields
    repayment_terms: v.optional(v.number()), // 1, 2, or 3 installments (default: 1)
    installments_paid: v.optional(v.number()), // Number of installments already paid (0 to repayment_terms)
    amount_per_installment: v.optional(v.number()), // Calculated: amount / repayment_terms
    total_repaid: v.optional(v.number()), // Total amount already repaid
    notes: v.optional(v.string()),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_barber", ["barber_id"])
    .index("by_branch", ["branch_id"])
    .index("by_status", ["status"])
    .index("by_barber_status", ["barber_id", "status"])
    .index("by_branch_status", ["branch_id", "status"])
    .index("by_requested_at", ["requested_at"]),

  // ============================================================================
  // PAYMONGO PAYMENT INTEGRATION
  // ============================================================================
  // Branch-level PayMongo payment configuration with encrypted credentials
  // ============================================================================

  branchPaymentConfig: defineTable({
    branch_id: v.id("branches"),
    provider: v.literal("paymongo"),            // Future-proof for other providers
    is_enabled: v.boolean(),

    // Encrypted credentials (AES-256-GCM)
    public_key_encrypted: v.string(),           // pk_live_xxx (encrypted)
    secret_key_encrypted: v.string(),           // sk_live_xxx (encrypted)
    webhook_secret_encrypted: v.string(),       // whsec_xxx (encrypted)
    encryption_iv: v.string(),                  // IV for decryption

    // Payment option toggles
    pay_now_enabled: v.boolean(),               // Toggle for Pay Now (full payment via PayMongo)
    pay_later_enabled: v.boolean(),             // Toggle for Pay Later (convenience fee now)
    pay_at_shop_enabled: v.boolean(),           // Toggle for Pay at Shop (no online payment)

    // Payment policies - Convenience fee for Pay Later
    convenience_fee_type: v.optional(v.union(
      v.literal("percent"),
      v.literal("fixed")
    )),                                         // Type of fee: "percent" or "fixed" (default: percent)
    convenience_fee_percent: v.optional(v.number()), // Fee percentage for Pay Later (e.g., 5 = 5%)
    convenience_fee_amount: v.optional(v.number()),  // Fixed fee amount for Pay Later (e.g., 50 = ₱50)

    // Timestamps
    created_at: v.number(),
    updated_at: v.number(),
    updated_by: v.id("users"),
  })
    .index("by_branch", ["branch_id"]),

  // ============================================================================
  // PAYMENT AUDIT LOG
  // ============================================================================
  // Tracks all payment-related events for audit, compliance, and debugging
  // Story 7.1: Create Payment Audit Log Schema & Booking Extensions
  // FR27, FR28, FR29 - Audit logging requirements
  // ============================================================================

  paymentAuditLog: defineTable({
    branch_id: v.id("branches"),                // Branch reference (FR25 - branch isolation)
    booking_id: v.optional(v.id("bookings")),   // Booking reference (optional for webhook events)
    transaction_id: v.optional(v.id("transactions")), // POS transaction reference

    // PayMongo identifiers
    paymongo_payment_id: v.optional(v.string()), // PayMongo payment ID
    paymongo_link_id: v.optional(v.string()),    // PayMongo payment link ID

    // Event details
    event_type: v.union(
      v.literal("link_created"),              // Payment link generated (FR27)
      v.literal("checkout_session_created"),  // Checkout session created
      v.literal("payment_initiated"),         // Customer started payment
      v.literal("payment_completed"),         // Payment successful (FR28)
      v.literal("payment_failed"),            // Payment failed (FR28)
      v.literal("payment_refunded"),          // Payment refunded
      v.literal("webhook_received"),          // Webhook received (FR29)
      v.literal("webhook_verified"),          // Webhook signature verified
      v.literal("webhook_failed"),            // Webhook signature invalid
      v.literal("cash_collected"),            // Cash payment collected at POS
      v.literal("booking_completed")          // Booking marked as completed (Story 8.3)
    ),

    // Payment details
    amount: v.optional(v.number()),              // Amount in pesos
    payment_method: v.optional(v.string()),      // GCash, Maya, Card, Cash, etc.
    payment_for: v.optional(v.union(             // What the payment covers
      v.literal("full_service"),                 // Pay Now: full service + booking fee
      v.literal("convenience_fee"),              // Pay Later: convenience fee only
      v.literal("remaining_balance"),            // Cash at shop: remaining service amount
      v.literal("full_cash"),                    // Full cash payment at shop
      v.literal("partial")                       // Partial payment
    )),

    // Audit trail
    raw_payload: v.optional(v.any()),            // Webhook raw payload for FR29
    error_message: v.optional(v.string()),       // Error details for failures
    ip_address: v.optional(v.string()),          // IP address of request

    // Timestamps
    created_at: v.number(),
    created_by: v.optional(v.id("users")),       // User who triggered event (if applicable)
  })
    .index("by_branch", ["branch_id"])
    .index("by_booking", ["booking_id"])
    .index("by_paymongo_payment", ["paymongo_payment_id"])
    .index("by_paymongo_link", ["paymongo_link_id"])
    .index("by_created_at", ["created_at"])
    .index("by_event_type", ["event_type"])
    .index("by_branch_created", ["branch_id", "created_at"]),

  // PENDING PAYMENTS
  // ============================================================================
  // Temporarily holds booking data for online payments until payment is confirmed
  // Booking is only created in the bookings table after payment success
  // This implements the "deferred booking" flow where booking is not recorded
  // until payment is completed
  // ============================================================================

  pendingPayments: defineTable({
    // Booking data to be created after payment success
    customer_id: v.id("users"),
    service_id: v.id("services"),
    barber_id: v.optional(v.id("barbers")),
    branch_id: v.id("branches"),
    date: v.string(),
    time: v.string(),
    notes: v.optional(v.string()),
    voucher_id: v.optional(v.id("vouchers")),
    discount_amount: v.optional(v.number()),
    customer_email: v.optional(v.string()),
    customer_name: v.optional(v.string()),
    booking_fee: v.optional(v.number()),
    price: v.number(),                          // Service price

    // Combo payment info (wallet + PayMongo)
    is_combo_payment: v.optional(v.boolean()),  // True if paying with wallet + PayMongo
    wallet_portion: v.optional(v.number()),     // Amount paid from wallet

    // PayMongo fallback tracking
    processed_via_admin: v.optional(v.boolean()), // true if admin's PayMongo was used as fallback

    // Payment info
    payment_type: v.union(v.literal("pay_now"), v.literal("pay_later")),
    paymongo_link_id: v.optional(v.string()),   // PayMongo link ID
    amount_to_pay: v.number(),                  // Amount customer will pay (full or fee)

    // Status
    status: v.union(
      v.literal("pending"),                     // Awaiting payment
      v.literal("paid"),                        // Payment received, booking created
      v.literal("expired"),                     // Payment link expired
      v.literal("failed")                       // Payment failed
    ),

    // Timestamps
    created_at: v.number(),
    expires_at: v.number(),                     // Auto-expire after 24 hours
    paid_at: v.optional(v.number()),
    created_by: v.optional(v.id("users")),
  })
    .index("by_paymongo_link", ["paymongo_link_id"])
    .index("by_customer", ["customer_id"])
    .index("by_branch", ["branch_id"])
    .index("by_status", ["status"])
    .index("by_expires_at", ["expires_at"]),

  // ============================================================================
  // PERMISSION AUDIT LOG (Story 10.1 - Clerk RBAC)
  // ============================================================================
  // Tracks all permission-related changes for audit, compliance, and debugging
  // ============================================================================

  permissionAuditLog: defineTable({
    user_id: v.id("users"),                       // User whose permissions were changed
    changed_by: v.id("users"),                    // Admin who made the change
    change_type: v.union(
      v.literal("role_changed"),                  // User role was changed
      v.literal("page_access_changed"),           // Page permissions were modified
      v.literal("branch_assigned"),               // User was assigned to a branch
      v.literal("branch_removed"),                // User was removed from a branch
      v.literal("user_created"),                  // New user was created
      v.literal("user_deleted")                   // User was deactivated/deleted
    ),
    previous_value: v.optional(v.string()),       // JSON stringified previous state
    new_value: v.string(),                        // JSON stringified new state
    created_at: v.number(),                       // Timestamp of change
  })
    .index("by_user", ["user_id"])
    .index("by_changed_by", ["changed_by"])
    .index("by_created_at", ["created_at"]),

  // ============================================================================
  // FLASH PROMOTIONS (Epic 20 - Customer Experience)
  // ============================================================================
  // Time-limited promotional events with bonus points, multipliers, etc.
  // ============================================================================

  flash_promotions: defineTable({
    // Basic Info
    name: v.string(),
    description: v.optional(v.string()),

    // Promo Type and Value
    type: v.union(
      v.literal("bonus_points"),    // Multiplier on points (e.g., 2x)
      v.literal("flat_bonus"),      // Flat points added (e.g., +500)
      v.literal("wallet_bonus")     // Extra wallet credit on top-up
    ),
    multiplier: v.optional(v.number()),    // For bonus_points type (e.g., 2.0 = 2x)
    flat_amount: v.optional(v.number()),   // For flat_bonus/wallet_bonus (×100 format)

    // Scope
    branch_id: v.optional(v.id("branches")), // null = system-wide
    is_template: v.optional(v.boolean()),    // Super Admin templates

    // Eligibility Rules
    tier_requirement: v.optional(v.union(
      v.literal("bronze"),
      v.literal("silver"),
      v.literal("gold"),
      v.literal("platinum")
    )),
    min_purchase: v.optional(v.number()),         // Minimum purchase amount
    new_customers_only: v.optional(v.boolean()),  // Only for first-time customers
    max_uses: v.optional(v.number()),             // Total uses allowed (null = unlimited)
    max_uses_per_user: v.optional(v.number()),    // Per-user limit (default 1)

    // Dates
    start_at: v.number(),
    end_at: v.number(),

    // Status
    status: v.union(
      v.literal("draft"),
      v.literal("scheduled"),
      v.literal("active"),
      v.literal("ended"),
      v.literal("cancelled")
    ),

    // Usage Tracking
    total_uses: v.number(),           // Counter for total uses

    // Audit
    created_by: v.id("users"),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_branch", ["branch_id"])
    .index("by_status", ["status"])
    .index("by_dates", ["start_at", "end_at"])
    .index("by_branch_status", ["branch_id", "status"]),

  // Promo Usage Tracking - tracks which customers used which promos
  promo_usage: defineTable({
    promo_id: v.id("flash_promotions"),
    user_id: v.id("users"),
    branch_id: v.optional(v.id("branches")),
    transaction_id: v.optional(v.string()),   // Payment or transaction ID
    points_earned: v.number(),                // Total points with promo (×100)
    bonus_points: v.number(),                 // Extra points from promo (×100)
    used_at: v.number(),
  })
    .index("by_promo", ["promo_id"])
    .index("by_user", ["user_id"])
    .index("by_promo_user", ["promo_id", "user_id"]),

  // ============================================================================
  // MULTI-BRANCH WALLET PAYMENT SYSTEM (Epic 21-26)
  // Tables: walletConfig, branchWalletSettings, branchWalletEarnings, branchSettlements
  // ============================================================================

  // Super Admin Wallet Configuration - Central PayMongo settings
  walletConfig: defineTable({
    paymongo_public_key: v.string(),
    paymongo_secret_key: v.string(), // Encrypted at service layer
    paymongo_webhook_secret: v.string(), // Encrypted at service layer
    is_test_mode: v.boolean(),
    default_commission_percent: v.number(), // e.g., 5 = 5%
    default_settlement_frequency: v.string(), // "daily" | "weekly" | "manual"
    min_settlement_amount: v.number(), // Minimum payout threshold in whole pesos
    // Story 23.3: Configurable bonus tiers for wallet top-ups
    bonus_tiers: v.optional(v.array(v.object({
      minAmount: v.number(), // Minimum top-up amount in pesos
      bonus: v.number(),     // Bonus amount in pesos
    }))),
    // Story 23.4: Monthly bonus cap - limits bonus-eligible top-ups per user per month
    monthly_bonus_cap: v.optional(v.number()), // Max top-up amount that can receive bonus per month (pesos), 0 = unlimited
    created_at: v.number(),
    updated_at: v.number(),
  }),

  // Shop Configuration - Global settings for e-commerce shop
  shopConfig: defineTable({
    delivery_fee: v.number(), // Flat delivery fee in pesos (e.g., 50)
    free_delivery_threshold: v.optional(v.number()), // Min order amount for free delivery (0 = disabled)
    min_order_amount: v.optional(v.number()), // Minimum order amount (0 = no minimum)
    enable_delivery: v.boolean(), // Toggle delivery option
    enable_pickup: v.boolean(), // Toggle pickup option
    estimated_delivery_days: v.optional(v.number()), // Estimated delivery time in days
    created_at: v.number(),
    updated_at: v.number(),
  }),

  // Branch-specific Wallet Settings - Payout preferences
  branchWalletSettings: defineTable({
    branch_id: v.id("branches"),
    commission_override: v.optional(v.number()), // Branch-specific rate if different from default
    settlement_frequency: v.optional(v.string()), // Override default frequency
    payout_method: v.optional(v.string()), // "bank" | "gcash" | "maya" - optional until configured
    payout_account_number: v.optional(v.string()), // Required when payout_method is set
    payout_account_name: v.optional(v.string()), // Required when payout_method is set
    payout_bank_name: v.optional(v.string()), // Required if payout_method is "bank"
    created_at: v.number(),
    updated_at: v.number(),
  }).index("by_branch", ["branch_id"]),

  // Branch Wallet Earnings - Individual transaction records
  branchWalletEarnings: defineTable({
    branch_id: v.id("branches"),
    booking_id: v.id("bookings"),
    customer_id: v.id("users"),
    staff_id: v.optional(v.id("users")),
    service_name: v.string(),
    gross_amount: v.number(), // Full payment amount in whole pesos
    commission_percent: v.number(), // Commission rate applied
    commission_amount: v.number(), // SA commission in whole pesos
    net_amount: v.number(), // Branch earnings after commission
    settlement_id: v.optional(v.id("branchSettlements")), // Linked when settled
    status: v.string(), // "pending" | "settled"
    // PayMongo fallback tracking
    processed_via: v.optional(v.string()), // "admin" | "branch" — whose PayMongo processed the payment
    payment_source: v.optional(v.string()), // "online_paymongo" | "wallet" — how customer paid
    created_at: v.number(),
  })
    .index("by_branch", ["branch_id"])
    .index("by_branch_status", ["branch_id", "status"])
    .index("by_settlement", ["settlement_id"]),

  // Branch Settlement Requests - Payout requests and processing
  branchSettlements: defineTable({
    branch_id: v.id("branches"),
    requested_by: v.id("users"),
    amount: v.number(), // Total settlement amount in whole pesos
    earnings_count: v.number(), // Number of earnings included
    payout_method: v.string(), // "bank" | "gcash" | "maya"
    payout_account_number: v.string(),
    payout_account_name: v.string(),
    payout_bank_name: v.optional(v.string()),
    status: v.string(), // "pending" | "approved" | "processing" | "completed" | "rejected"
    approved_by: v.optional(v.id("users")),
    approved_at: v.optional(v.number()),
    processed_by: v.optional(v.id("users")), // Story 25.4: Track who marked as processing
    processing_started_at: v.optional(v.number()), // Story 25.4: Track when processing started
    rejected_by: v.optional(v.id("users")), // Story 25.3: Track who rejected
    rejected_at: v.optional(v.number()), // Story 25.3: Track when rejected
    completed_by: v.optional(v.id("users")), // Story 25.4: Track who completed
    completed_at: v.optional(v.number()),
    rejection_reason: v.optional(v.string()),
    transfer_reference: v.optional(v.string()), // Bank/GCash reference number
    notes: v.optional(v.string()),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_branch", ["branch_id"])
    .index("by_status", ["status"])
    .index("by_branch_status", ["branch_id", "status"]),

  // ============================================================================
  // BARBER MATCHER TABLES (Help Me Choose Feature - Phase 3)
  // ============================================================================

  // User Style Preferences - Stored quiz results for personalization
  user_style_preferences: defineTable({
    user_id: v.id("users"),
    // Quiz results
    preferred_vibes: v.optional(v.array(v.union(
      v.literal("classic"),
      v.literal("trendy"),
      v.literal("edgy"),
      v.literal("clean")
    ))),
    preferred_conversation: v.optional(v.union(
      v.literal("chatty"),
      v.literal("balanced"),
      v.literal("quiet")
    )),
    preferred_speed: v.optional(v.union(
      v.literal("fast"),
      v.literal("moderate"),
      v.literal("detailed")
    )),
    budget_preference: v.optional(v.union(
      v.literal("budget"),
      v.literal("mid"),
      v.literal("premium"),
      v.literal("any")
    )),
    time_preference: v.optional(v.union(
      v.literal("weekday_am"),
      v.literal("weekday_pm"),
      v.literal("weekend"),
      v.literal("flexible")
    )),
    // Last match results for "Find Similar" feature
    last_matched_barber_id: v.optional(v.id("barbers")),
    last_match_score: v.optional(v.number()),
    // Learning data
    swipe_count: v.optional(v.number()),
    quiz_completed_at: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["user_id"])
    .index("by_last_matched", ["last_matched_barber_id"]),

  // Style Swipe History - Track user's swipe preferences for learning
  style_swipe_history: defineTable({
    user_id: v.id("users"),
    image_url: v.string(),        // The haircut image shown
    barber_id: v.optional(v.id("barbers")), // If from a specific barber's portfolio
    liked: v.boolean(),           // true = swiped right, false = swiped left
    style_tags: v.optional(v.array(v.string())), // Tags associated with this image
    createdAt: v.number(),
  })
    .index("by_user", ["user_id"])
    .index("by_user_liked", ["user_id", "liked"])
    .index("by_barber", ["barber_id"]),

  // Barber Match History - Track successful matches for analytics
  barber_match_history: defineTable({
    user_id: v.id("users"),
    barber_id: v.id("barbers"),
    match_score: v.number(),      // 0-100 percentage
    match_reasons: v.array(v.string()), // ["style_match", "conversation_match", etc.]
    resulted_in_booking: v.optional(v.boolean()),
    booking_id: v.optional(v.id("bookings")),
    createdAt: v.number(),
  })
    .index("by_user", ["user_id"])
    .index("by_barber", ["barber_id"])
    .index("by_user_barber", ["user_id", "barber_id"])
    .index("by_resulted_booking", ["resulted_in_booking"]),

  // ============================================================
  // BT2: PERSONALIZED FEED ALGORITHM TABLES
  // ============================================================

  // Feed Interactions - Track individual user engagement with posts
  feed_interactions: defineTable({
    user_id: v.id("users"),
    post_id: v.id("branch_posts"),
    interaction_type: v.union(
      v.literal("view"),           // Viewed the post
      v.literal("view_long"),      // Viewed > 5 seconds (dwell time)
      v.literal("like"),           // Fire reaction
      v.literal("bookmark"),       // Saved post
      v.literal("book"),           // Booked from this post
      v.literal("skip")            // Scrolled past quickly (< 1 sec)
    ),
    // Context data
    barber_id: v.optional(v.id("barbers")), // Barber associated with post
    post_type: v.optional(v.string()),      // showcase, promo, etc.
    style_vibes: v.optional(v.array(v.string())), // Vibes from barber's profile
    // Metadata
    view_duration_ms: v.optional(v.number()), // How long they viewed
    resulted_in_booking: v.optional(v.boolean()),
    booking_id: v.optional(v.id("bookings")),
    createdAt: v.number(),
    // Decay tracking
    expires_at: v.optional(v.number()),      // When signal should decay
  })
    .index("by_user", ["user_id"])
    .index("by_post", ["post_id"])
    .index("by_user_post", ["user_id", "post_id"])
    .index("by_user_type", ["user_id", "interaction_type"])
    .index("by_barber", ["barber_id"])
    .index("by_created", ["createdAt"])
    .index("by_expires", ["expires_at"]),

  // User Feed Profile - Aggregated preferences for fast lookups
  user_feed_profile: defineTable({
    user_id: v.id("users"),
    // Barber affinity scores (denormalized for performance)
    barber_affinities: v.optional(v.array(v.object({
      barber_id: v.id("barbers"),
      score: v.number(),           // 0-100 affinity score
      last_interaction: v.number(), // Timestamp
      booking_count: v.number(),    // Times booked
      like_count: v.number(),       // Times liked their posts
    }))),
    // Style preferences (from Matcher + learned from feed)
    preferred_vibes: v.optional(v.array(v.union(
      v.literal("classic"),
      v.literal("trendy"),
      v.literal("edgy"),
      v.literal("clean")
    ))),
    vibe_scores: v.optional(v.object({
      classic: v.optional(v.number()),
      trendy: v.optional(v.number()),
      edgy: v.optional(v.number()),
      clean: v.optional(v.number()),
    })),
    // Content type preferences
    preferred_post_types: v.optional(v.array(v.string())),
    // Learning stats
    total_interactions: v.number(),
    last_feed_view: v.optional(v.number()),
    profile_version: v.number(),   // For cache invalidation
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["user_id"])
    .index("by_updated", ["updatedAt"]),

  // Post Bookmarks - Dedicated table for saved posts
  post_bookmarks: defineTable({
    user_id: v.id("users"),
    post_id: v.id("branch_posts"),
    createdAt: v.number(),
  })
    .index("by_user", ["user_id"])
    .index("by_post", ["post_id"])
    .index("by_user_post", ["user_id", "post_id"])
    .index("by_created", ["createdAt"]),

  // Product Wishlists - Customer saved products for later
  wishlists: defineTable({
    user_id: v.id("users"),
    product_id: v.union(v.id("products"), v.id("productCatalog")), // Support both branch and catalog products
    createdAt: v.number(),
  })
    .index("by_user", ["user_id"])
    .index("by_product", ["product_id"])
    .index("by_user_product", ["user_id", "product_id"])
    .index("by_created", ["createdAt"]),

  // ============================================================================
  // USER ADDRESSES (Delivery Support)
  // ============================================================================
  user_addresses: defineTable({
    user_id: v.id("users"),
    label: v.string(), // "Home", "Work", "Other"
    // Address components
    street_address: v.string(), // House/Unit No., Street, Subdivision
    barangay: v.optional(v.string()),
    city: v.string(),
    province: v.string(),
    zip_code: v.string(),
    landmark: v.optional(v.string()),
    // Contact info
    contact_name: v.string(),
    contact_phone: v.string(),
    is_default: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["user_id"])
    .index("by_user_default", ["user_id", "is_default"]),

  // ============================================================================
  // SHOP BANNERS - Promotional carousel for customer shop
  // ============================================================================
  shopBanners: defineTable({
    // Banner type: product_promo, custom_ad, external_link
    type: v.union(
      v.literal("product_promo"),  // Auto-generated from product discount
      v.literal("custom_ad"),       // Manual image upload (internal promotion)
      v.literal("external_link")    // External website/partner ads
    ),
    // Display content
    title: v.string(),              // e.g., "MEGA SALE", "NEW ARRIVALS"
    subtitle: v.optional(v.string()), // e.g., "Up to 50% OFF"
    badge: v.optional(v.string()),  // e.g., "Sale", "New", "Hot", "Partner"
    // Image (either storage ID or external URL)
    image_storage_id: v.optional(v.id("_storage")),
    image_url: v.optional(v.string()),
    // Link/action configuration
    link_type: v.union(
      v.literal("product"),         // Navigate to product detail
      v.literal("category"),        // Filter by category
      v.literal("external"),        // Open external URL
      v.literal("none")             // No action (display only)
    ),
    link_url: v.optional(v.string()),       // External URL or category slug
    product_id: v.optional(v.id("productCatalog")), // Link to specific product
    // Styling
    gradient: v.optional(v.string()), // e.g., "from-orange-500 to-red-600"
    text_color: v.optional(v.string()), // "white" or "dark"
    // Scheduling & visibility
    is_active: v.boolean(),
    sort_order: v.number(),         // Display order (lower = first)
    start_date: v.optional(v.number()), // Promo start timestamp
    end_date: v.optional(v.number()),   // Promo end timestamp
    // Tracking
    click_count: v.optional(v.number()),
    impression_count: v.optional(v.number()),
    // Metadata
    created_by: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_active", ["is_active"])
    .index("by_type", ["type"])
    .index("by_sort_order", ["sort_order"])
    .index("by_active_sort", ["is_active", "sort_order"]),

  // Maintenance Mode Configuration - Singleton
  maintenanceConfig: defineTable({
    is_enabled: v.boolean(),
    end_time: v.optional(v.number()),
    message: v.optional(v.string()),
    updated_at: v.number(),
    updated_by: v.optional(v.id("users")),
  }),

  // Payroll zero-service day claims (branch_admin approval required)
  payroll_zero_day_claims: defineTable({
    payroll_period_id: v.id("payroll_periods"),
    barber_id: v.id("barbers"),
    branch_id: v.id("branches"),
    zero_days: v.number(), // Number of zero-service days claimed
    zero_day_dates: v.optional(v.array(v.string())), // Specific dates (YYYY-MM-DD) that are zero-service days
    daily_rate_applied: v.number(), // Daily rate snapshot at time of claim
    total_amount: v.number(), // zero_days * daily_rate_applied
    source: v.optional(v.string()), // "manual" | "attendance"
    notes: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    requested_by: v.id("users"),
    approved_by: v.optional(v.id("users")),
    approved_at: v.optional(v.number()),
    rejection_reason: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_period", ["payroll_period_id"])
    .index("by_barber", ["barber_id"])
    .index("by_branch", ["branch_id"])
    .index("by_period_barber", ["payroll_period_id", "barber_id"])
    .index("by_status", ["status"]),

  // Push notification tokens for Capacitor native apps
  push_tokens: defineTable({
    user_id: v.id("users"),
    token: v.string(), // FCM/APNs token
    platform: v.string(), // 'android' | 'ios'
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["user_id"])
    .index("by_token", ["token"]),

  // ── Facial Recognition Attendance ──

  // Face enrollment data for FR-based attendance
  face_enrollments: defineTable({
    barber_id: v.optional(v.id("barbers")),
    user_id: v.optional(v.id("users")),
    branch_id: v.id("branches"),
    embeddings: v.array(v.array(v.number())), // 5 × 128-float descriptors
    enrollment_photos: v.array(v.id("_storage")), // 5 Convex storage IDs
    enrollment_status: v.string(), // "pending" | "active" | "revoked"
    consent_given: v.boolean(),
    consent_timestamp: v.optional(v.number()),
    created_at: v.number(),
    updated_at: v.optional(v.number()),
  })
    .index("by_barber", ["barber_id"])
    .index("by_branch", ["branch_id"])
    .index("by_user", ["user_id"])
    .index("by_status", ["enrollment_status"]),

  // Branch-level FR attendance configuration
  attendance_config: defineTable({
    branch_id: v.id("branches"),
    fr_enabled: v.boolean(),
    auto_approve_threshold: v.optional(v.number()), // default 0.95
    admin_review_threshold: v.optional(v.number()), // default 0.80
    liveness_required: v.optional(v.boolean()), // default true
    geofence_enabled: v.optional(v.boolean()),
    geofence_lat: v.optional(v.number()),
    geofence_lng: v.optional(v.number()),
    geofence_radius_meters: v.optional(v.number()), // default 100
    device_lock_enabled: v.optional(v.boolean()),
    barber_overrides: v.optional(v.array(v.object({
      barber_id: v.id("barbers"),
      fr_exempt: v.boolean(),
    }))),
    staff_overrides: v.optional(v.array(v.object({
      user_id: v.id("users"),
      fr_exempt: v.boolean(),
    }))),
    updated_at: v.number(),
    updated_by: v.optional(v.string()),
  })
    .index("by_branch", ["branch_id"]),

  // Registered kiosk devices for FR attendance
  attendance_devices: defineTable({
    branch_id: v.id("branches"),
    device_fingerprint: v.string(),
    device_name: v.string(),
    is_active: v.boolean(),
    registered_at: v.number(),
    last_used: v.optional(v.number()),
  })
    .index("by_branch", ["branch_id"])
    .index("by_fingerprint", ["device_fingerprint"]),

  // ============================================================================
  // STAFF PAYROLL TABLES
  // ============================================================================

  // Staff daily rates table (mirrors barber_daily_rates for non-barber staff)
  staff_daily_rates: defineTable({
    user_id: v.id("users"),
    branch_id: v.id("branches"),
    daily_rate: v.number(),
    effective_from: v.number(),
    effective_until: v.optional(v.number()),
    is_active: v.boolean(),
    created_by: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["user_id"])
    .index("by_branch", ["branch_id"])
    .index("by_user_active", ["user_id", "is_active"]),

  // Staff payroll records (simplified: daily rate only, no commission)
  staff_payroll_records: defineTable({
    payroll_period_id: v.id("payroll_periods"),
    user_id: v.id("users"),
    branch_id: v.id("branches"),

    // Daily pay
    daily_rate: v.number(),
    days_worked: v.number(),
    daily_pay: v.number(),

    // Attendance (OT/UT/Late)
    attendance_summary: v.optional(v.object({
      total_late_minutes: v.number(),
      total_undertime_minutes: v.number(),
      total_overtime_minutes: v.number(),
      total_ot_pay: v.number(),
      total_late_penalty: v.number(),
      total_ut_penalty: v.number(),
      total_penalty: v.number(),
      days_late: v.number(),
      days_undertime: v.number(),
      days_overtime: v.number(),
      daily_details: v.array(v.object({
        date: v.string(),
        scheduled_start: v.string(),
        scheduled_end: v.string(),
        actual_clock_in: v.string(),
        actual_clock_out: v.string(),
        late_minutes: v.number(),
        undertime_minutes: v.number(),
        overtime_minutes: v.number(),
      })),
    })),

    // Deductions
    cash_advance_deduction: v.optional(v.number()),
    cash_advance_details: v.optional(v.array(v.object({
      id: v.id("cashAdvances"),
      amount: v.number(),
      requested_at: v.number(),
      paid_out_at: v.optional(v.number()),
    }))),
    total_deductions: v.number(),

    // Final
    net_pay: v.number(),

    // Payment
    payment_method: v.optional(v.union(
      v.literal("cash"),
      v.literal("bank_transfer"),
      v.literal("check"),
      v.literal("digital_wallet")
    )),
    payment_reference: v.optional(v.string()),
    paid_at: v.optional(v.number()),
    paid_by: v.optional(v.id("users")),

    status: v.union(
      v.literal("calculated"),
      v.literal("paid"),
      v.literal("cancelled")
    ),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_payroll_period", ["payroll_period_id"])
    .index("by_user", ["user_id"])
    .index("by_branch", ["branch_id"])
    .index("by_status", ["status"])
    .index("by_user_period", ["user_id", "payroll_period_id"]),

  // ============================================================================
  // BRANCH ADMIN WALLET (for product ordering)
  // ============================================================================

  // Branch Admin Ordering Wallet - prepaid wallet for product orders
  branch_wallets: defineTable({
    branch_id: v.id("branches"),
    balance: v.number(),           // Available balance in whole pesos
    held_balance: v.number(),      // Locked for pending/approved/shipped orders
    total_topped_up: v.number(),   // Lifetime top-ups
    total_spent: v.number(),       // Lifetime order payments
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_branch", ["branch_id"]),

  // Branch Wallet Transaction Audit Trail
  branch_wallet_transactions: defineTable({
    branch_id: v.id("branches"),
    wallet_id: v.id("branch_wallets"),
    type: v.union(
      v.literal("topup"),         // Money added to wallet
      v.literal("hold"),          // Balance moved to held_balance for pending order
      v.literal("release_hold"),  // held_balance returned to balance (cancel/reject)
      v.literal("payment"),       // held_balance deducted (order received, finalized)
      v.literal("credit"),        // Refund or adjustment credit
    ),
    amount: v.number(),           // Positive for topup/release/credit, negative for hold/payment
    balance_after: v.number(),
    held_balance_after: v.number(),
    reference_type: v.optional(v.string()),  // "product_order", "manual_topup", "adjustment"
    reference_id: v.optional(v.string()),    // Order number or other reference
    description: v.string(),
    created_by: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_branch", ["branch_id"])
    .index("by_wallet", ["wallet_id"])
    .index("by_created_at", ["createdAt"]),

  // Pending Branch Wallet Top-ups (PayMongo online payments to HQ)
  pendingBranchWalletTopups: defineTable({
    branch_id: v.id("branches"),
    amount: v.number(),
    paymongo_session_id: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("expired"),
      v.literal("failed")
    ),
    created_by: v.id("users"),
    description: v.optional(v.string()),
    paymongo_payment_id: v.optional(v.string()),
    payment_method: v.optional(v.string()),
    created_at: v.number(),
    expires_at: v.number(),
    paid_at: v.optional(v.number()),
  })
    .index("by_session", ["paymongo_session_id"])
    .index("by_branch", ["branch_id"])
    .index("by_branch_status", ["branch_id", "status"]),
});
