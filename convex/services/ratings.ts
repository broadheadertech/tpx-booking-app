import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";

// Submit a rating for a completed booking
export const submitRating = mutation({
  args: {
    bookingId: v.id("bookings"),
    customerId: v.id("users"),
    barberId: v.id("barbers"),
    serviceId: v.id("services"),
    rating: v.number(),
    feedback: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate rating is between 1-5
    if (args.rating < 1 || args.rating > 5) {
      throw new Error("Rating must be between 1 and 5 stars");
    }

    // Check if booking exists and is completed
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.status !== "completed") {
      throw new Error("Can only rate completed bookings");
    }

    // Check if customer owns this booking
    if (booking.customer !== args.customerId) {
      throw new Error("Unauthorized: You can only rate your own bookings");
    }

    // Check if rating already exists for this booking
    const existingRating = await ctx.db
      .query("ratings")
      .withIndex("by_booking", (q) => q.eq("booking_id", args.bookingId))
      .first();

    if (existingRating) {
      throw new Error("Rating already submitted for this booking");
    }

    // Create the rating
    const now = Date.now();
    const ratingId = await ctx.db.insert("ratings", {
      booking_id: args.bookingId,
      customer_id: args.customerId,
      barber_id: args.barberId,
      service_id: args.serviceId,
      rating: args.rating,
      feedback: args.feedback,
      created_at: now,
      updated_at: now,
    });

    // Update barber's average rating
    await updateBarberRating(ctx, args.barberId);

    return ratingId;
  },
});

// Get rating for a specific booking
export const getRatingByBooking = query({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ratings")
      .withIndex("by_booking", (q) => q.eq("booking_id", args.bookingId))
      .first();
  },
});

// Get all ratings for a barber
export const getRatingsByBarber = query({
  args: { barberId: v.id("barbers") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ratings")
      .withIndex("by_barber", (q) => q.eq("barber_id", args.barberId))
      .order("desc")
      .collect();
  },
});

// Get ratings analytics for a barber
export const getBarberRatingsAnalytics = query({
  args: { barberId: v.id("barbers") },
  handler: async (ctx, args) => {
    const ratings = await ctx.db
      .query("ratings")
      .withIndex("by_barber", (q) => q.eq("barber_id", args.barberId))
      .collect();

    if (ratings.length === 0) {
      return {
        averageRating: 0,
        totalRatings: 0,
        ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        recentRatings: [],
      };
    }

    // Calculate average rating
    const totalStars = ratings.reduce((sum, rating) => sum + rating.rating, 0);
    const averageRating = totalStars / ratings.length;

    // Calculate rating breakdown
    const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach((rating) => {
      ratingBreakdown[rating.rating as keyof typeof ratingBreakdown]++;
    });

    // Get recent ratings (last 10)
    const recentRatings = ratings
      .sort((a, b) => b.created_at - a.created_at)
      .slice(0, 10);

    return {
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      totalRatings: ratings.length,
      ratingBreakdown,
      recentRatings,
    };
  },
});

// Get all ratings (for admin purposes)
export const getAllRatings = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("ratings")
      .order("desc")
      .collect();
  },
});

// Helper function to update barber's average rating
async function updateBarberRating(ctx: any, barberId: Id<"barbers">) {
  const ratings = await ctx.db
    .query("ratings")
    .withIndex("by_barber", (q) => q.eq("barber_id", barberId))
    .collect();

  if (ratings.length === 0) return;

  const totalStars = ratings.reduce((sum: number, rating: any) => sum + rating.rating, 0);
  const averageRating = totalStars / ratings.length;

  // Update barber's rating field
  await ctx.db.patch(barberId, {
    rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
    updatedAt: Date.now(),
  });
}

// Update an existing rating
export const updateRating = mutation({
  args: {
    ratingId: v.id("ratings"),
    customerId: v.id("users"),
    rating: v.number(),
    feedback: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate rating is between 1-5
    if (args.rating < 1 || args.rating > 5) {
      throw new Error("Rating must be between 1 and 5 stars");
    }

    // Get existing rating
    const existingRating = await ctx.db.get(args.ratingId);
    if (!existingRating) {
      throw new Error("Rating not found");
    }

    // Check if customer owns this rating
    if (existingRating.customer_id !== args.customerId) {
      throw new Error("Unauthorized: You can only update your own ratings");
    }

    // Update the rating
    await ctx.db.patch(args.ratingId, {
      rating: args.rating,
      feedback: args.feedback,
      updated_at: Date.now(),
    });

    // Update barber's average rating
    await updateBarberRating(ctx, existingRating.barber_id);

    return args.ratingId;
  },
});

// Delete a rating
export const deleteRating = mutation({
  args: {
    ratingId: v.id("ratings"),
    customerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get existing rating
    const existingRating = await ctx.db.get(args.ratingId);
    if (!existingRating) {
      throw new Error("Rating not found");
    }

    // Check if customer owns this rating
    if (existingRating.customer_id !== args.customerId) {
      throw new Error("Unauthorized: You can only delete your own ratings");
    }

    // Delete the rating
    await ctx.db.delete(args.ratingId);

    // Update barber's average rating
    await updateBarberRating(ctx, existingRating.barber_id);

    return true;
  },
});