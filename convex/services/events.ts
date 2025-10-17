import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { throwUserError, ERROR_CODES, validateInput } from "../utils/errors";
import { sanitizeString } from "../utils/sanitize";

// Get all events (for super admin)
export const getAllEvents = query({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db.query("events").collect();
    return events.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get events by branch
export const getEventsByBranch = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();
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
    branch_id: v.id("branches"), // Add branch_id requirement
  },
  handler: async (ctx, args) => {
    // Sanitize inputs
    const sanitizedTitle = sanitizeString(args.title);
    const sanitizedDescription = sanitizeString(args.description);
    const sanitizedLocation = sanitizeString(args.location);

    // Validate sanitized inputs
    if (!sanitizedTitle || sanitizedTitle.length < 3) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Event title must be at least 3 characters long");
    }
    if (sanitizedTitle.length > 100) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Event title must be less than 100 characters");
    }
    if (!sanitizedDescription || sanitizedDescription.length < 10) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Event description must be at least 10 characters long");
    }
    if (sanitizedDescription.length > 500) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Event description must be less than 500 characters");
    }
    if (!sanitizedLocation || sanitizedLocation.length < 3) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Event location must be at least 3 characters long");
    }
    if (sanitizedLocation.length > 200) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Event location must be less than 200 characters");
    }

    // Validate numeric inputs
    if (args.maxAttendees < 1 || args.maxAttendees > 1000) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Max attendees must be between 1 and 1000");
    }
    if (args.price < 0 || args.price > 100000) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Price must be between 0 and 100,000");
    }

    // Validate date is not in the past
    const eventDate = new Date(args.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (eventDate < today) {
      throwUserError(ERROR_CODES.EVENT_PAST_DATE);
    }

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(args.time)) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Invalid time format");
    }

    // Check if branch exists
    const branch = await ctx.db.get(args.branch_id);
    if (!branch) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Branch not found");
    }

    const eventId = await ctx.db.insert("events", {
      title: sanitizedTitle,
      description: sanitizedDescription,
      date: args.date,
      time: args.time,
      location: sanitizedLocation,
      maxAttendees: args.maxAttendees,
      currentAttendees: 0,
      price: args.price,
      category: args.category,
      status: args.status || "upcoming",
      branch_id: args.branch_id,
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

    // Check if event exists
    const existingEvent = await ctx.db.get(id);
    if (!existingEvent) {
      throwUserError(ERROR_CODES.EVENT_NOT_FOUND);
    }

    // Prepare sanitized updates
    const sanitizedUpdates: any = {};

    // Sanitize and validate string fields
    if (updates.title !== undefined) {
      const sanitizedTitle = sanitizeString(updates.title);
      if (!sanitizedTitle || sanitizedTitle.length < 3) {
        throwUserError(ERROR_CODES.INVALID_INPUT, "Event title must be at least 3 characters long");
      }
      if (sanitizedTitle.length > 100) {
        throwUserError(ERROR_CODES.INVALID_INPUT, "Event title must be less than 100 characters");
      }
      sanitizedUpdates.title = sanitizedTitle;
    }

    if (updates.description !== undefined) {
      const sanitizedDescription = sanitizeString(updates.description);
      if (!sanitizedDescription || sanitizedDescription.length < 10) {
        throwUserError(ERROR_CODES.INVALID_INPUT, "Event description must be at least 10 characters long");
      }
      if (sanitizedDescription.length > 500) {
        throwUserError(ERROR_CODES.INVALID_INPUT, "Event description must be less than 500 characters");
      }
      sanitizedUpdates.description = sanitizedDescription;
    }

    if (updates.location !== undefined) {
      const sanitizedLocation = sanitizeString(updates.location);
      if (!sanitizedLocation || sanitizedLocation.length < 3) {
        throwUserError(ERROR_CODES.INVALID_INPUT, "Event location must be at least 3 characters long");
      }
      if (sanitizedLocation.length > 200) {
        throwUserError(ERROR_CODES.INVALID_INPUT, "Event location must be less than 200 characters");
      }
      sanitizedUpdates.location = sanitizedLocation;
    }

    // Validate numeric fields
    if (updates.maxAttendees !== undefined) {
      if (updates.maxAttendees < 1 || updates.maxAttendees > 1000) {
        throwUserError(ERROR_CODES.INVALID_INPUT, "Max attendees must be between 1 and 1000");
      }
      // Ensure current attendees don't exceed new max
      if (existingEvent.currentAttendees > updates.maxAttendees) {
        throwUserError(ERROR_CODES.INVALID_INPUT, "Cannot reduce max attendees below current attendance");
      }
      sanitizedUpdates.maxAttendees = updates.maxAttendees;
    }

    if (updates.price !== undefined) {
      if (updates.price < 0 || updates.price > 100000) {
        throwUserError(ERROR_CODES.INVALID_INPUT, "Price must be between 0 and 100,000");
      }
      sanitizedUpdates.price = updates.price;
    }

    // Validate date
    if (updates.date !== undefined) {
      const eventDate = new Date(updates.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (eventDate < today) {
        throwUserError(ERROR_CODES.EVENT_PAST_DATE);
      }
      sanitizedUpdates.date = updates.date;
    }

    // Validate time
    if (updates.time !== undefined) {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(updates.time)) {
        throwUserError(ERROR_CODES.INVALID_INPUT, "Invalid time format");
      }
      sanitizedUpdates.time = updates.time;
    }

    // Add other fields that don't need sanitization
    if (updates.category !== undefined) {
      sanitizedUpdates.category = updates.category;
    }
    if (updates.status !== undefined) {
      sanitizedUpdates.status = updates.status;
    }

    await ctx.db.patch(id, {
      ...sanitizedUpdates,
      updatedAt: Date.now(),
    });

    return id;
  },
});

// Delete event
export const deleteEvent = mutation({
  args: { id: v.id("events") },
  handler: async (ctx, args) => {
    // Check if event exists
    const event = await ctx.db.get(args.id);
    if (!event) {
      throwUserError(ERROR_CODES.EVENT_NOT_FOUND);
    }

    // Check if event has attendees (optional business rule)
    if (event.currentAttendees > 0) {
      throwUserError(ERROR_CODES.INVALID_INPUT, "Cannot delete event with existing attendees. Please cancel the event instead.");
    }

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
      throwUserError(ERROR_CODES.EVENT_NOT_FOUND);
    }

    if (event.currentAttendees >= event.maxAttendees) {
      throwUserError(ERROR_CODES.EVENT_FULL);
    }

    if (event.status !== "upcoming") {
      throwUserError(ERROR_CODES.EVENT_REGISTRATION_CLOSED, "Registration is closed for this event.", "This event is no longer accepting new registrations.");
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
      throwUserError(ERROR_CODES.EVENT_NOT_FOUND);
    }

    if (event.currentAttendees <= 0) {
      throwUserError(ERROR_CODES.EVENT_NOT_FOUND, "No registrations to cancel.", "There are no active registrations for this event to cancel.");
    }

    await ctx.db.patch(args.eventId, {
      currentAttendees: event.currentAttendees - 1,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

