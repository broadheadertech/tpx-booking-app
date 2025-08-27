import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// Get all events
export const getAllEvents = query({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db.query("events").collect();
    return events.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get event by ID
export const getEventById = query({
  args: { id: v.id("events") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get events by status
export const getEventsByStatus = query({
  args: { status: v.union(v.literal("upcoming"), v.literal("ongoing"), v.literal("completed"), v.literal("cancelled")) },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect();
    return events;
  },
});

// Get upcoming events
export const getUpcomingEvents = query({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_status", (q) => q.eq("status", "upcoming"))
      .collect();

    // Filter events that haven't passed their date
    const now = new Date();
    const upcomingEvents = events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate >= now;
    });

    return upcomingEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  },
});

// Get events by category
export const getEventsByCategory = query({
  args: { category: v.union(v.literal("workshop"), v.literal("celebration"), v.literal("training"), v.literal("promotion")) },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();
    return events;
  },
});

// Create new event
export const createEvent = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    date: v.string(),
    time: v.string(),
    location: v.string(),
    maxAttendees: v.number(),
    price: v.number(),
    category: v.union(v.literal("workshop"), v.literal("celebration"), v.literal("training"), v.literal("promotion")),
    status: v.optional(v.union(v.literal("upcoming"), v.literal("ongoing"), v.literal("completed"), v.literal("cancelled"))),
  },
  handler: async (ctx, args) => {
    // Validate date is not in the past
    const eventDate = new Date(args.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (eventDate < today) {
      throw new Error("Event date cannot be in the past");
    }

    const eventId = await ctx.db.insert("events", {
      title: args.title,
      description: args.description,
      date: args.date,
      time: args.time,
      location: args.location,
      maxAttendees: args.maxAttendees,
      currentAttendees: 0,
      price: args.price,
      category: args.category,
      status: args.status || "upcoming",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return eventId;
  },
});

// Update event
export const updateEvent = mutation({
  args: {
    id: v.id("events"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    date: v.optional(v.string()),
    time: v.optional(v.string()),
    location: v.optional(v.string()),
    maxAttendees: v.optional(v.number()),
    price: v.optional(v.number()),
    category: v.optional(v.union(v.literal("workshop"), v.literal("celebration"), v.literal("training"), v.literal("promotion"))),
    status: v.optional(v.union(v.literal("upcoming"), v.literal("ongoing"), v.literal("completed"), v.literal("cancelled"))),
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

// Delete event
export const deleteEvent = mutation({
  args: { id: v.id("events") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// Register for event (increment attendees)
export const registerForEvent = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    if (event.currentAttendees >= event.maxAttendees) {
      throw new Error("Event is full");
    }

    if (event.status !== "upcoming") {
      throw new Error("Cannot register for this event");
    }

    await ctx.db.patch(args.eventId, {
      currentAttendees: event.currentAttendees + 1,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Unregister from event (decrement attendees)
export const unregisterFromEvent = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    if (event.currentAttendees <= 0) {
      throw new Error("No attendees to unregister");
    }

    await ctx.db.patch(args.eventId, {
      currentAttendees: event.currentAttendees - 1,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
