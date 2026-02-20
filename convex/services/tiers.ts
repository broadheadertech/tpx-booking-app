/**
 * VIP Tier Service
 *
 * Handles tier progression, benefits, and tier-related operations.
 * Tiers: Bronze (0) → Silver (5000) → Gold (15000) → Platinum (50000)
 * Thresholds are based on lifetime_earned points (×100 format).
 *
 * @module convex/services/tiers
 */

import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

// ============================================================================
// DEFAULT TIER CONFIGURATION
// ============================================================================

/**
 * Default tier configuration
 * Threshold is in ×100 format (5000 pts = 500000 stored value)
 */
export const DEFAULT_TIERS = [
  {
    name: "Bronze",
    threshold: 0, // 0 points
    display_order: 1,
    icon: "🥉",
    color: "#CD7F32",
  },
  {
    name: "Silver",
    threshold: 500000, // 5000 points (×100)
    display_order: 2,
    icon: "🥈",
    color: "#C0C0C0",
  },
  {
    name: "Gold",
    threshold: 1500000, // 15000 points (×100)
    display_order: 3,
    icon: "🥇",
    color: "#FFD700",
  },
  {
    name: "Platinum",
    threshold: 5000000, // 50000 points (×100)
    display_order: 4,
    icon: "💎",
    color: "#E5E4E2",
  },
];

/**
 * Default benefits by tier
 */
export const DEFAULT_BENEFITS = {
  Bronze: [
    {
      benefit_type: "points_multiplier" as const,
      benefit_value: 1.0,
      description: "Standard point earning (1:1 ratio)",
    },
  ],
  Silver: [
    {
      benefit_type: "points_multiplier" as const,
      benefit_value: 1.05,
      description: "5% bonus points on all purchases",
    },
    {
      benefit_type: "early_access" as const,
      benefit_value: 1,
      description: "Early access to flash sales and promotions",
    },
  ],
  Gold: [
    {
      benefit_type: "points_multiplier" as const,
      benefit_value: 1.1,
      description: "10% bonus points on all purchases",
    },
    {
      benefit_type: "priority_booking" as const,
      benefit_value: 1,
      description: "Priority access to booking slots",
    },
    {
      benefit_type: "free_service" as const,
      benefit_value: 1,
      description: "Free birthday haircut service",
    },
    {
      benefit_type: "early_access" as const,
      benefit_value: 1,
      description: "Early access to flash sales and promotions",
    },
  ],
  Platinum: [
    {
      benefit_type: "points_multiplier" as const,
      benefit_value: 1.15,
      description: "15% bonus points on all purchases",
    },
    {
      benefit_type: "priority_booking" as const,
      benefit_value: 1,
      description: "Priority access to booking slots",
    },
    {
      benefit_type: "vip_line" as const,
      benefit_value: 1,
      description: "Dedicated VIP service line",
    },
    {
      benefit_type: "free_service" as const,
      benefit_value: 2,
      description: "Complimentary premium services monthly",
    },
    {
      benefit_type: "exclusive_event" as const,
      benefit_value: 1,
      description: "Exclusive member-only events access",
    },
    {
      benefit_type: "early_access" as const,
      benefit_value: 1,
      description: "Early access to flash sales and promotions",
    },
  ],
};

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all tiers ordered by threshold
 */
export const getTiers = query({
  args: {},
  handler: async (ctx) => {
    const tiers = await ctx.db
      .query("tiers")
      .withIndex("by_display_order")
      .collect();
    return tiers;
  },
});

/**
 * Get tier by ID
 */
export const getTierById = query({
  args: { tierId: v.id("tiers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.tierId);
  },
});

/**
 * Get tier by name
 */
export const getTierByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tiers")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
  },
});

/**
 * Get user's current tier with benefits.
 * Checks membership_cards first — if active card exists, uses card-based tier.
 * If no card, returns null (no free tier anymore).
 */
export const getUserTier = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    // Check for active membership card first
    const cards = await ctx.db
      .query("membership_cards")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .collect();
    const activeCard = cards.find(
      (c) => c.status === "active" || c.status === "grace_period"
    );

    if (activeCard) {
      const tier = await ctx.db
        .query("tiers")
        .withIndex("by_name", (q) => q.eq("name", activeCard.tier_name))
        .first();

      const benefits = tier
        ? await ctx.db
            .query("tier_benefits")
            .withIndex("by_tier", (q) => q.eq("tier_id", tier._id))
            .collect()
        : [];

      return {
        tier,
        benefits,
        isDefault: false,
        isCardBased: true,
        cardStatus: activeCard.status,
        multiplier: activeCard.points_multiplier,
      };
    }

    // No active card — no tier
    return null;
  },
});

/**
 * Get benefits for a specific tier
 */
export const getTierBenefits = query({
  args: { tierId: v.id("tiers") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tier_benefits")
      .withIndex("by_tier", (q) => q.eq("tier_id", args.tierId))
      .collect();
  },
});

/**
 * Calculate which tier a user should be at based on lifetime points
 */
export const calculateTierForPoints = query({
  args: { lifetimePoints: v.number() },
  handler: async (ctx, args) => {
    const tiers = await ctx.db
      .query("tiers")
      .withIndex("by_display_order")
      .collect();

    if (tiers.length === 0) {
      return null;
    }

    // Sort by threshold descending to find highest eligible tier
    const sortedTiers = [...tiers].sort((a, b) => b.threshold - a.threshold);

    for (const tier of sortedTiers) {
      if (args.lifetimePoints >= tier.threshold) {
        return tier;
      }
    }

    // Default to Bronze (lowest tier)
    return tiers.find((t) => t.display_order === 1) || tiers[0];
  },
});

/**
 * Get tier progress for a user.
 * Uses card XP progress if user has an active membership card.
 */
export const getTierProgress = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Check for active membership card
    const cards = await ctx.db
      .query("membership_cards")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .collect();
    const activeCard = cards.find(
      (c) => c.status === "active" || c.status === "grace_period"
    );

    if (activeCard) {
      // Card-based progress using XP
      const currentTier = await ctx.db
        .query("tiers")
        .withIndex("by_name", (q) => q.eq("name", activeCard.tier_name))
        .first();

      // Get config thresholds
      const getNum = async (key: string, fb: number) => {
        const cfg = await ctx.db
          .query("loyalty_config")
          .withIndex("by_key", (q: any) => q.eq("config_key", key))
          .unique();
        return cfg ? parseFloat(cfg.config_value) : fb;
      };

      const goldThreshold = await getNum("card_gold_xp_threshold", 200000);
      const platinumThreshold = await getNum("card_platinum_xp_threshold", 500000);

      let nextTier = null;
      let nextTierThreshold = 0;
      let progressPercent = 100;
      let isMaxTier = activeCard.tier_name === "Platinum";

      if (activeCard.tier_name === "Silver") {
        nextTier = await ctx.db
          .query("tiers")
          .withIndex("by_name", (q) => q.eq("name", "Gold"))
          .first();
        nextTierThreshold = goldThreshold;
        progressPercent = Math.min(100, Math.round((activeCard.card_xp / goldThreshold) * 100));
      } else if (activeCard.tier_name === "Gold") {
        nextTier = await ctx.db
          .query("tiers")
          .withIndex("by_name", (q) => q.eq("name", "Platinum"))
          .first();
        nextTierThreshold = platinumThreshold;
        progressPercent = Math.min(100, Math.round((activeCard.card_xp / platinumThreshold) * 100));
      }

      return {
        currentTier,
        nextTier,
        lifetimePoints: activeCard.lifetime_xp,
        pointsToNextTier: isMaxTier ? 0 : Math.max(0, nextTierThreshold - activeCard.card_xp),
        progressPercent,
        isMaxTier,
        isCardBased: true,
        cardXP: activeCard.card_xp,
      };
    }

    // No active card — no tier progress
    return {
      currentTier: null,
      nextTier: null,
      lifetimePoints: 0,
      pointsToNextTier: 0,
      progressPercent: 0,
      isMaxTier: false,
      isCardBased: false,
    };
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Seed default tiers (run once on setup)
 */
export const seedTiers = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Check if tiers already exist
    const existingTiers = await ctx.db.query("tiers").collect();
    if (existingTiers.length > 0) {
      console.log("[TIERS] Tiers already seeded, skipping...");
      return { success: false, message: "Tiers already exist" };
    }

    // Insert default tiers
    const tierIds: Record<string, any> = {};
    for (const tier of DEFAULT_TIERS) {
      const id = await ctx.db.insert("tiers", {
        ...tier,
        is_active: true,
        created_at: now,
        updated_at: now,
      });
      tierIds[tier.name] = id;
      console.log(`[TIERS] Created tier: ${tier.name}`);
    }

    // Insert default benefits
    for (const [tierName, benefits] of Object.entries(DEFAULT_BENEFITS)) {
      const tierId = tierIds[tierName];
      if (!tierId) continue;

      for (const benefit of benefits) {
        await ctx.db.insert("tier_benefits", {
          tier_id: tierId,
          benefit_type: benefit.benefit_type,
          benefit_value: benefit.benefit_value,
          description: benefit.description,
          is_active: true,
          created_at: now,
        });
      }
      console.log(`[TIERS] Created ${benefits.length} benefits for ${tierName}`);
    }

    return {
      success: true,
      message: "Tiers and benefits seeded successfully",
      tierCount: DEFAULT_TIERS.length,
    };
  },
});

/**
 * Update user's tier based on lifetime points.
 * No-op for cardholders — their tier is managed by the card system.
 */
export const updateUserTier = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Check for active card — if yes, skip (card manages tier)
    const cards = await ctx.db
      .query("membership_cards")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .collect();
    const hasActiveCard = cards.some(
      (c) => c.status === "active" || c.status === "grace_period"
    );
    if (hasActiveCard) {
      return { promoted: false, reason: "Tier managed by membership card" };
    }

    // No card — legacy behavior (kept for backward compat but effectively unused)
    return { promoted: false, reason: "No membership card — tier system requires a card" };
  },
});

/**
 * Get VIP stats for a customer (for profile display).
 * Returns card-based tier info if active card exists, otherwise null tier.
 */
export const getCustomerVipStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    // Check for active membership card
    const cards = await ctx.db
      .query("membership_cards")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .collect();
    const activeCard = cards.find(
      (c) => c.status === "active" || c.status === "grace_period"
    );

    let tierInfo = null;
    let cardInfo = null;

    if (activeCard) {
      const tier = await ctx.db
        .query("tiers")
        .withIndex("by_name", (q) => q.eq("name", activeCard.tier_name))
        .first();
      if (tier) {
        tierInfo = { name: tier.name, icon: tier.icon, color: tier.color };
      }
      cardInfo = {
        tier: activeCard.tier_name,
        multiplier: activeCard.points_multiplier,
        xp: activeCard.card_xp,
        lifetimeXp: activeCard.lifetime_xp,
        status: activeCard.status,
        expiresAt: activeCard.expires_at,
      };
    }

    // Get points ledger
    const ledger = await ctx.db
      .query("points_ledger")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .unique();

    const lifetimePoints = ledger?.lifetime_earned || 0;
    const currentPoints = ledger?.current_balance || 0;

    // Count completed bookings (visits)
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_customer", (q) => q.eq("customer", args.userId))
      .collect();

    const completedVisits = bookings.filter(
      (b) => b.status === "completed"
    ).length;

    const memberSince = user.createdAt || user._creationTime;

    return {
      tierInfo,
      cardInfo,
      hasCard: !!activeCard,
      lifetimePoints,
      currentPoints,
      completedVisits,
      memberSince,
      displayLifetimePoints: Math.floor(lifetimePoints / 100),
      displayCurrentPoints: Math.floor(currentPoints / 100),
    };
  },
});

/**
 * Get customer welcome info for staff "Welcome Back" screen
 * Returns visit history, preferred barber, last visit, etc.
 */
export const getCustomerWelcomeInfo = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get user info
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    // Check for active membership card
    const cards = await ctx.db
      .query("membership_cards")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .collect();
    const activeCard = cards.find(
      (c) => c.status === "active" || c.status === "grace_period"
    );

    let tierInfo = null;
    if (activeCard) {
      const tier = await ctx.db
        .query("tiers")
        .withIndex("by_name", (q) => q.eq("name", activeCard.tier_name))
        .first();
      if (tier) {
        tierInfo = { name: tier.name, icon: tier.icon, color: tier.color };
      }
    }

    // Fallback to user's current_tier_id if no card
    if (!tierInfo && user.current_tier_id) {
      const tier = await ctx.db.get(user.current_tier_id);
      if (tier) {
        tierInfo = { name: tier.name, icon: tier.icon, color: tier.color };
      }
    }

    // Get all completed bookings
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_customer", (q) => q.eq("customer", args.userId))
      .collect();

    const completedBookings = bookings.filter((b) => b.status === "completed");
    const visitCount = completedBookings.length;

    // Find last visit date
    let lastVisitDate = null;
    let daysSinceLastVisit = null;
    if (completedBookings.length > 0) {
      // Sort by date descending to get most recent
      const sorted = completedBookings.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      });
      lastVisitDate = sorted[0].date;
      daysSinceLastVisit = Math.floor(
        (Date.now() - new Date(lastVisitDate).getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    // Find preferred barber (most frequently served by)
    let preferredBarber = null;
    if (completedBookings.length > 0) {
      const barberCounts: Record<string, number> = {};
      for (const booking of completedBookings) {
        if (booking.barber) {
          const barberId = booking.barber.toString();
          barberCounts[barberId] = (barberCounts[barberId] || 0) + 1;
        }
      }

      // Find barber with most visits
      let maxCount = 0;
      let preferredBarberId = null;
      for (const [barberId, count] of Object.entries(barberCounts)) {
        if (count > maxCount) {
          maxCount = count;
          preferredBarberId = barberId;
        }
      }

      // Get barber details
      if (preferredBarberId && maxCount >= 2) {
        // Only show if visited at least twice
        try {
          const barber = await ctx.db.get(preferredBarberId as any);
          if (barber) {
            preferredBarber = {
              id: barber._id,
              name: barber.full_name,
              avatar: barber.avatar || null,
              visitCount: maxCount,
            };
          }
        } catch {
          // Barber not found
        }
      }
    }

    // Member since
    const memberSince = user.createdAt || user._creationTime;

    // Get customer display name
    const displayName = user.nickname || user.username || user.email?.split("@")[0] || "Customer";
    const firstName = displayName.split(" ")[0];

    return {
      userId: args.userId,
      firstName,
      displayName,
      tierInfo,
      visitCount,
      lastVisitDate,
      daysSinceLastVisit,
      missedCustomer: daysSinceLastVisit !== null && daysSinceLastVisit >= 30,
      frequentCustomer: visitCount >= 5,
      preferredBarber,
      memberSince,
      memberSinceFormatted: memberSince
        ? new Date(memberSince).toLocaleDateString("en-PH", {
            month: "long",
            year: "numeric",
          })
        : null,
    };
  },
});

/**
 * Get customer service history for staff view
 * Returns last 5 services and most frequent service
 */
export const getCustomerServiceHistory = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get all completed bookings
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_customer", (q) => q.eq("customer", args.userId))
      .collect();

    const completedBookings = bookings.filter((b) => b.status === "completed");

    if (completedBookings.length === 0) {
      return {
        recentServices: [],
        usualService: null,
        totalServices: 0,
      };
    }

    // Sort by date descending
    const sortedBookings = completedBookings.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });

    // Get last 5 services with details
    const recentBookings = sortedBookings.slice(0, 5);
    const recentServices = await Promise.all(
      recentBookings.map(async (booking) => {
        // Get service details
        let serviceName = "Service";
        try {
          const service = await ctx.db.get(booking.service);
          if (service) {
            serviceName = service.name;
          }
        } catch {
          // Service not found
        }

        // Get barber details
        let barberName = null;
        if (booking.barber) {
          try {
            const barber = await ctx.db.get(booking.barber);
            if (barber) {
              barberName = barber.full_name;
            }
          } catch {
            // Barber not found
          }
        }

        return {
          id: booking._id,
          serviceName,
          date: booking.date,
          barberName,
          price: booking.price || 0,
        };
      })
    );

    // Find most frequent service
    const serviceCounts: Record<string, { count: number; name: string }> = {};
    for (const booking of completedBookings) {
      const serviceId = booking.service.toString();
      if (!serviceCounts[serviceId]) {
        let serviceName = "Service";
        try {
          const service = await ctx.db.get(booking.service);
          if (service) {
            serviceName = service.name;
          }
        } catch {
          // Service not found
        }
        serviceCounts[serviceId] = { count: 0, name: serviceName };
      }
      serviceCounts[serviceId].count++;
    }

    // Find service with highest count
    let usualService = null;
    let maxCount = 0;
    for (const [_, data] of Object.entries(serviceCounts)) {
      if (data.count > maxCount) {
        maxCount = data.count;
        usualService = {
          name: data.name,
          count: data.count,
        };
      }
    }

    return {
      recentServices,
      usualService,
      totalServices: completedBookings.length,
    };
  },
});

/**
 * Get the points multiplier for a user.
 * Returns the card multiplier (1.5/2.0/3.0) if active card exists, otherwise 1.0.
 */
export const getUserTierMultiplier = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Check membership card first
    const cards = await ctx.db
      .query("membership_cards")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .collect();
    const activeCard = cards.find(
      (c) => c.status === "active" || c.status === "grace_period"
    );

    if (activeCard) {
      return activeCard.points_multiplier;
    }

    // No card — no multiplier bonus
    return 1.0;
  },
});

// ============================================================================
// TIER MANAGEMENT MUTATIONS (Story 19.2)
// ============================================================================

/**
 * Update an existing tier's details
 */
export const updateTier = mutation({
  args: {
    tierId: v.id("tiers"),
    name: v.optional(v.string()),
    threshold: v.optional(v.number()), // ×100 format
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    display_order: v.optional(v.number()),
    is_active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const { tierId, ...updates } = args;

    // Get existing tier
    const tier = await ctx.db.get(tierId);
    if (!tier) {
      throw new Error("Tier not found");
    }

    // Build update object with only provided fields
    const updateObj: Record<string, unknown> = { updated_at: now };
    if (updates.name !== undefined) updateObj.name = updates.name;
    if (updates.threshold !== undefined) updateObj.threshold = updates.threshold;
    if (updates.icon !== undefined) updateObj.icon = updates.icon;
    if (updates.color !== undefined) updateObj.color = updates.color;
    if (updates.display_order !== undefined) updateObj.display_order = updates.display_order;
    if (updates.is_active !== undefined) updateObj.is_active = updates.is_active;

    await ctx.db.patch(tierId, updateObj);

    console.log(`[TIERS] Updated tier ${tier.name}:`, updates);

    return { success: true, tierId };
  },
});

/**
 * Create a new tier
 */
export const createTier = mutation({
  args: {
    name: v.string(),
    threshold: v.number(), // ×100 format
    display_order: v.number(),
    icon: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if tier name already exists
    const existing = await ctx.db
      .query("tiers")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existing) {
      throw new Error(`Tier with name "${args.name}" already exists`);
    }

    const tierId = await ctx.db.insert("tiers", {
      name: args.name,
      threshold: args.threshold,
      display_order: args.display_order,
      icon: args.icon,
      color: args.color,
      is_active: true,
      created_at: now,
      updated_at: now,
    });

    console.log(`[TIERS] Created new tier: ${args.name}`);

    return { success: true, tierId };
  },
});

/**
 * Delete a tier (soft delete by setting is_active = false)
 */
export const deleteTier = mutation({
  args: { tierId: v.id("tiers") },
  handler: async (ctx, args) => {
    const tier = await ctx.db.get(args.tierId);
    if (!tier) {
      throw new Error("Tier not found");
    }

    // Check if any users are on this tier
    const usersOnTier = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("current_tier_id"), args.tierId))
      .collect();

    if (usersOnTier.length > 0) {
      throw new Error(
        `Cannot delete tier "${tier.name}" - ${usersOnTier.length} customers are currently on this tier`
      );
    }

    // Soft delete
    await ctx.db.patch(args.tierId, {
      is_active: false,
      updated_at: Date.now(),
    });

    console.log(`[TIERS] Deleted tier: ${tier.name}`);

    return { success: true };
  },
});

/**
 * Add a benefit to a tier
 */
export const addTierBenefit = mutation({
  args: {
    tierId: v.id("tiers"),
    benefit_type: v.union(
      v.literal("points_multiplier"),
      v.literal("priority_booking"),
      v.literal("free_service"),
      v.literal("discount"),
      v.literal("early_access"),
      v.literal("vip_line"),
      v.literal("exclusive_event")
    ),
    benefit_value: v.number(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Verify tier exists
    const tier = await ctx.db.get(args.tierId);
    if (!tier) {
      throw new Error("Tier not found");
    }

    const benefitId = await ctx.db.insert("tier_benefits", {
      tier_id: args.tierId,
      benefit_type: args.benefit_type,
      benefit_value: args.benefit_value,
      description: args.description,
      is_active: true,
      created_at: now,
    });

    console.log(`[TIERS] Added benefit to ${tier.name}: ${args.benefit_type}`);

    return { success: true, benefitId };
  },
});

/**
 * Update an existing tier benefit
 */
export const updateTierBenefit = mutation({
  args: {
    benefitId: v.id("tier_benefits"),
    benefit_value: v.optional(v.number()),
    description: v.optional(v.string()),
    is_active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { benefitId, ...updates } = args;

    const benefit = await ctx.db.get(benefitId);
    if (!benefit) {
      throw new Error("Benefit not found");
    }

    const updateObj: Record<string, unknown> = {};
    if (updates.benefit_value !== undefined) updateObj.benefit_value = updates.benefit_value;
    if (updates.description !== undefined) updateObj.description = updates.description;
    if (updates.is_active !== undefined) updateObj.is_active = updates.is_active;

    await ctx.db.patch(benefitId, updateObj);

    console.log(`[TIERS] Updated benefit ${benefitId}`);

    return { success: true };
  },
});

/**
 * Remove a tier benefit
 */
export const removeTierBenefit = mutation({
  args: { benefitId: v.id("tier_benefits") },
  handler: async (ctx, args) => {
    const benefit = await ctx.db.get(args.benefitId);
    if (!benefit) {
      throw new Error("Benefit not found");
    }

    await ctx.db.delete(args.benefitId);

    console.log(`[TIERS] Removed benefit ${args.benefitId}`);

    return { success: true };
  },
});

// ============================================================================
// TIER PROMOTION QUERIES (Story 19.2)
// ============================================================================

/**
 * Count customers eligible for promotion based on current tier thresholds
 * Used for preview before saving threshold changes
 */
export const countEligibleForPromotion = query({
  args: {},
  handler: async (ctx) => {
    // Get all tiers sorted by threshold descending
    const tiers = await ctx.db
      .query("tiers")
      .withIndex("by_display_order")
      .collect();

    const activeTiers = tiers.filter((t) => t.is_active !== false);
    if (activeTiers.length === 0) {
      return { totalEligible: 0, summary: {}, details: [] };
    }
    const sortedTiers = [...activeTiers].sort((a, b) => b.threshold - a.threshold);

    // Get all users with points ledger
    const ledgers = await ctx.db.query("points_ledger").collect();

    const promotions: { userId: string; fromTier: string; toTier: string }[] = [];

    for (const ledger of ledgers) {
      const lifetimePoints = ledger.lifetime_earned;

      // Find correct tier for this user
      let correctTier = sortedTiers[sortedTiers.length - 1]; // Default to lowest
      for (const tier of sortedTiers) {
        if (lifetimePoints >= tier.threshold) {
          correctTier = tier;
          break;
        }
      }

      // Get user's current tier
      const user = await ctx.db.get(ledger.user_id);
      if (!user) continue;

      const currentTier = user.current_tier_id
        ? await ctx.db.get(user.current_tier_id)
        : null;

      // Check if promotion needed
      const currentOrder = currentTier?.display_order || 0;
      if (correctTier.display_order > currentOrder) {
        promotions.push({
          userId: ledger.user_id,
          fromTier: currentTier?.name || "None",
          toTier: correctTier.name,
        });
      }
    }

    // Group by tier transition
    const summary: Record<string, number> = {};
    for (const p of promotions) {
      const key = `${p.fromTier} to ${p.toTier}`;
      summary[key] = (summary[key] || 0) + 1;
    }

    return {
      totalEligible: promotions.length,
      summary,
      details: promotions.slice(0, 100), // Limit details for UI
    };
  },
});

/**
 * Batch promote all eligible customers based on current tier thresholds
 */
export const promoteAllEligible = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Get all tiers sorted by threshold descending
    const tiers = await ctx.db
      .query("tiers")
      .withIndex("by_display_order")
      .collect();

    const activeTiers = tiers.filter((t) => t.is_active !== false);
    const sortedTiers = [...activeTiers].sort((a, b) => b.threshold - a.threshold);

    // Get all users with points ledger
    const ledgers = await ctx.db.query("points_ledger").collect();

    let promotedCount = 0;

    for (const ledger of ledgers) {
      const lifetimePoints = ledger.lifetime_earned;

      // Find correct tier for this user
      let correctTier = sortedTiers[sortedTiers.length - 1]; // Default to lowest
      for (const tier of sortedTiers) {
        if (lifetimePoints >= tier.threshold) {
          correctTier = tier;
          break;
        }
      }

      // Get user's current tier
      const user = await ctx.db.get(ledger.user_id);
      if (!user) continue;

      const currentTier = user.current_tier_id
        ? await ctx.db.get(user.current_tier_id)
        : null;

      // Check if promotion needed
      const currentOrder = currentTier?.display_order || 0;
      if (correctTier.display_order > currentOrder) {
        await ctx.db.patch(ledger.user_id, {
          current_tier_id: correctTier._id,
          updatedAt: now,
        });
        promotedCount++;
        console.log(
          `[TIERS] Promoted user ${ledger.user_id}: ${currentTier?.name || "None"} → ${correctTier.name}`
        );
      }
    }

    console.log(`[TIERS] Batch promotion complete: ${promotedCount} customers promoted`);

    return {
      success: true,
      promotedCount,
    };
  },
});

/**
 * Get all tiers with their benefits for admin panel
 */
export const getAllTiersWithBenefits = query({
  args: {},
  handler: async (ctx) => {
    const tiers = await ctx.db
      .query("tiers")
      .withIndex("by_display_order")
      .collect();

    const tiersWithBenefits = await Promise.all(
      tiers.map(async (tier) => {
        const benefits = await ctx.db
          .query("tier_benefits")
          .withIndex("by_tier", (q) => q.eq("tier_id", tier._id))
          .collect();

        // Count users on this tier
        const usersOnTier = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("current_tier_id"), tier._id))
          .collect();

        return {
          ...tier,
          benefits: benefits.filter((b) => b.is_active !== false),
          userCount: usersOnTier.length,
          displayThreshold: tier.threshold / 100, // Convert from ×100 format
        };
      })
    );

    return tiersWithBenefits;
  },
});
