import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

// Helper: get current user by session token
async function getUserBySession(ctx: any, sessionToken: string) {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", sessionToken))
    .first();
  if (!session || session.expiresAt < Date.now()) return null;
  const user = await ctx.db.get(session.userId);
  return user || null;
}

// Field type definition for validation
const fieldTypeValidator = v.union(
  v.literal("text"),
  v.literal("email"),
  v.literal("phone"),
  v.literal("textarea"),
  v.literal("select"),
  v.literal("multiselect"),
  v.literal("radio"),
  v.literal("checkbox"),
  v.literal("date"),
  v.literal("date_range"),
  v.literal("number")
);

const fieldValidator = v.object({
  id: v.string(),
  type: fieldTypeValidator,
  label: v.string(),
  placeholder: v.optional(v.string()),
  required: v.boolean(),
  options: v.optional(v.array(v.string())),
  helpText: v.optional(v.string()),
  order: v.number(),
});

// Get all custom booking forms
export const getAllForms = query({
  args: {},
  handler: async (ctx) => {
    const forms = await ctx.db.query("custom_booking_forms").collect();

    // Enrich with barber info
    const enrichedForms = await Promise.all(
      forms.map(async (form) => {
        const barber = await ctx.db.get(form.barber_id);
        const branch = await ctx.db.get(form.branch_id);
        return {
          ...form,
          barber_name: barber?.full_name || "Unknown",
          branch_name: branch?.name || "Unknown",
        };
      })
    );

    return enrichedForms.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get forms by branch
export const getFormsByBranch = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    const forms = await ctx.db
      .query("custom_booking_forms")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();

    const enrichedForms = await Promise.all(
      forms.map(async (form) => {
        const barber = await ctx.db.get(form.barber_id);
        return {
          ...form,
          barber_name: barber?.full_name || "Unknown",
        };
      })
    );

    return enrichedForms.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get form by barber
export const getFormByBarber = query({
  args: { barber_id: v.id("barbers") },
  handler: async (ctx, args) => {
    const form = await ctx.db
      .query("custom_booking_forms")
      .withIndex("by_barber", (q) => q.eq("barber_id", args.barber_id))
      .first();

    if (!form) return null;

    const barber = await ctx.db.get(form.barber_id);
    const branch = await ctx.db.get(form.branch_id);

    return {
      ...form,
      barber_name: barber?.full_name || "Unknown",
      branch_name: branch?.name || "Unknown",
    };
  },
});

// Get active form by barber (for customer-facing)
export const getActiveFormByBarber = query({
  args: { barber_id: v.id("barbers") },
  handler: async (ctx, args) => {
    const barber = await ctx.db.get(args.barber_id);
    if (!barber || !barber.custom_booking_enabled) return null;

    const form = await ctx.db
      .query("custom_booking_forms")
      .withIndex("by_barber", (q) => q.eq("barber_id", args.barber_id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!form) return null;

    const branch = await ctx.db.get(form.branch_id);

    return {
      ...form,
      barber_name: barber?.full_name || "Unknown",
      branch_name: branch?.name || "Unknown",
      barber_avatar: barber?.avatar,
    };
  },
});

// Get form by ID
export const getFormById = query({
  args: { id: v.id("custom_booking_forms") },
  handler: async (ctx, args) => {
    const form = await ctx.db.get(args.id);
    if (!form) return null;

    const barber = await ctx.db.get(form.barber_id);
    const branch = await ctx.db.get(form.branch_id);

    return {
      ...form,
      barber_name: barber?.full_name || "Unknown",
      branch_name: branch?.name || "Unknown",
    };
  },
});

// Create custom booking form
export const createForm = mutation({
  args: {
    sessionToken: v.string(),
    barber_id: v.id("barbers"),
    branch_id: v.id("branches"),
    title: v.string(),
    description: v.optional(v.string()),
    fields: v.array(fieldValidator),
  },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken);
    if (!user) throw new Error("Unauthorized");

    // Check permissions
    const isSuperAdmin = user.role === "super_admin";
    const isBranchAdmin = user.role === "branch_admin" && String(user.branch_id) === String(args.branch_id);
    if (!isSuperAdmin && !isBranchAdmin) {
      throw new Error("Permission denied");
    }

    // Verify barber exists
    const barber = await ctx.db.get(args.barber_id);
    if (!barber) throw new Error("Barber not found");

    // Check if form already exists for this barber
    const existingForm = await ctx.db
      .query("custom_booking_forms")
      .withIndex("by_barber", (q) => q.eq("barber_id", args.barber_id))
      .first();

    if (existingForm) {
      throw new Error("A custom booking form already exists for this barber. Please edit the existing form.");
    }

    const now = Date.now();

    const formId = await ctx.db.insert("custom_booking_forms", {
      barber_id: args.barber_id,
      branch_id: args.branch_id,
      title: args.title,
      description: args.description,
      fields: args.fields,
      status: "active",
      created_by: user._id,
      updated_by: user._id,
      createdAt: now,
      updatedAt: now,
    });

    // Update barber with form reference
    await ctx.db.patch(barber._id, {
      custom_booking_form_id: formId,
      updatedAt: now,
    });

    return formId;
  },
});

// Update custom booking form
export const updateForm = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("custom_booking_forms"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    fields: v.optional(v.array(fieldValidator)),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken);
    if (!user) throw new Error("Unauthorized");

    const form = await ctx.db.get(args.id);
    if (!form) throw new Error("Form not found");

    // Check permissions
    const isSuperAdmin = user.role === "super_admin";
    const isBranchAdmin = user.role === "branch_admin" && String(user.branch_id) === String(form.branch_id);
    if (!isSuperAdmin && !isBranchAdmin) {
      throw new Error("Permission denied");
    }

    const now = Date.now();

    const updates: any = {
      updated_by: user._id,
      updatedAt: now,
    };

    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.fields !== undefined) updates.fields = args.fields;
    if (args.status !== undefined) updates.status = args.status;

    await ctx.db.patch(args.id, updates);

    return args.id;
  },
});

// Delete custom booking form
export const deleteForm = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("custom_booking_forms"),
  },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken);
    if (!user) throw new Error("Unauthorized");

    const form = await ctx.db.get(args.id);
    if (!form) throw new Error("Form not found");

    // Check permissions
    const isSuperAdmin = user.role === "super_admin";
    const isBranchAdmin = user.role === "branch_admin" && String(user.branch_id) === String(form.branch_id);
    if (!isSuperAdmin && !isBranchAdmin) {
      throw new Error("Permission denied");
    }

    // Remove form reference from barber
    const barber = await ctx.db.get(form.barber_id);
    if (barber) {
      await ctx.db.patch(barber._id, {
        custom_booking_form_id: undefined,
        custom_booking_enabled: false,
        updatedAt: Date.now(),
      });
    }

    // Delete the form
    await ctx.db.delete(args.id);

    return true;
  },
});

// Toggle form status
export const toggleFormStatus = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("custom_booking_forms"),
  },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken);
    if (!user) throw new Error("Unauthorized");

    const form = await ctx.db.get(args.id);
    if (!form) throw new Error("Form not found");

    // Check permissions
    const isSuperAdmin = user.role === "super_admin";
    const isBranchAdmin = user.role === "branch_admin" && String(user.branch_id) === String(form.branch_id);
    if (!isSuperAdmin && !isBranchAdmin) {
      throw new Error("Permission denied");
    }

    const newStatus = form.status === "active" ? "inactive" : "active";

    await ctx.db.patch(args.id, {
      status: newStatus,
      updated_by: user._id,
      updatedAt: Date.now(),
    });

    return newStatus;
  },
});

// Duplicate form for another barber
export const duplicateForm = mutation({
  args: {
    sessionToken: v.string(),
    source_form_id: v.id("custom_booking_forms"),
    target_barber_id: v.id("barbers"),
  },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken);
    if (!user) throw new Error("Unauthorized");

    const sourceForm = await ctx.db.get(args.source_form_id);
    if (!sourceForm) throw new Error("Source form not found");

    const targetBarber = await ctx.db.get(args.target_barber_id);
    if (!targetBarber) throw new Error("Target barber not found");

    // Check permissions
    const isSuperAdmin = user.role === "super_admin";
    const isBranchAdmin = user.role === "branch_admin" && String(user.branch_id) === String(targetBarber.branch_id);
    if (!isSuperAdmin && !isBranchAdmin) {
      throw new Error("Permission denied");
    }

    // Check if form already exists for target barber
    const existingForm = await ctx.db
      .query("custom_booking_forms")
      .withIndex("by_barber", (q) => q.eq("barber_id", args.target_barber_id))
      .first();

    if (existingForm) {
      throw new Error("A custom booking form already exists for this barber.");
    }

    const now = Date.now();

    const formId = await ctx.db.insert("custom_booking_forms", {
      barber_id: args.target_barber_id,
      branch_id: targetBarber.branch_id,
      title: sourceForm.title,
      description: sourceForm.description,
      fields: sourceForm.fields,
      status: "inactive", // Start as inactive
      created_by: user._id,
      updated_by: user._id,
      createdAt: now,
      updatedAt: now,
    });

    // Update barber with form reference
    await ctx.db.patch(targetBarber._id, {
      custom_booking_form_id: formId,
      updatedAt: now,
    });

    return formId;
  },
});
