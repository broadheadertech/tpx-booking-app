import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireSuperAdmin } from "../lib/unifiedAuth";

// Template type definition
const templateTypeValidator = v.union(
  v.literal("password_reset"),
  v.literal("voucher"),
  v.literal("booking_confirmation"),
  v.literal("booking_reminder"),
  v.literal("welcome")
);

// Default templates
const DEFAULT_TEMPLATES = {
  password_reset: {
    subject: "Reset your {{brand_name}} password",
    heading: "Reset Your Password",
    body_text: "Hi there! We received a request to reset your password for your {{brand_name}} account. Click the button below to set a new password.",
    cta_text: "Reset Password",
    footer_text: "This link will expire in 15 minutes for your security. If you didn't request a password reset, you can safely ignore this email.",
  },
  voucher: {
    subject: "Your Voucher {{voucher_code}} from {{brand_name}}",
    heading: "🎉 Your Voucher Is Ready!",
    body_text: "Hey {{recipient_name}}! 🎁\n\nYou've received a special voucher from {{brand_name}}!\n\n💰 Voucher Value: {{voucher_value}}\n🎫 Voucher Code: {{voucher_code}}\n⭐ Points Used: {{points_required}}\n📅 Valid Until: {{expires_at}}\n\nThank you for being a valued customer!",
    cta_text: "Redeem Now",
    footer_text: "✓ Present this email or scan the QR code at checkout\n✓ Our staff will apply your discount\n✓ One voucher per visit",
  },
  booking_confirmation: {
    subject: "Booking Confirmed - {{brand_name}}",
    heading: "Booking Confirmed!",
    body_text: "Your appointment for {{service_name}} on {{date}} at {{time}} with {{barber_name}} has been confirmed.\n\nWe look forward to seeing you!",
    cta_text: "View Booking",
    footer_text: "✓ Please arrive 5-10 minutes before your appointment\n✓ If you need to reschedule or cancel, please contact us at least 24 hours in advance\n✓ Show your booking QR code or confirmation email when you arrive",
  },
  booking_reminder: {
    subject: "Reminder: Your appointment at {{brand_name}}",
    heading: "Appointment Reminder",
    body_text: "This is a friendly reminder about your upcoming appointment.",
    cta_text: "View Details",
    footer_text: "Please arrive 5-10 minutes before your scheduled time.",
  },
  welcome: {
    subject: "Welcome to {{brand_name}}!",
    heading: "Welcome to the Family!",
    body_text: "Thank you for joining {{brand_name}}. We're excited to have you!",
    cta_text: "Book Now",
    footer_text: "If you have any questions, feel free to reach out to us.",
  },
};

// Get all email templates
export const getAllTemplates = query({
  args: { sessionToken: v.optional(v.string()) }, // Optional for backwards compatibility
  handler: async (ctx, args) => {
    // Use unified auth (supports both Clerk and legacy)
    await requireSuperAdmin(ctx, args.sessionToken);

    const templates = await ctx.db.query("email_templates").collect();

    // Return templates with defaults for missing ones
    const templateTypes = ["password_reset", "voucher", "booking_confirmation", "booking_reminder", "welcome"] as const;

    return templateTypes.map(type => {
      const existing = templates.find(t => t.template_type === type);
      if (existing) return existing;

      return {
        _id: null,
        template_type: type,
        ...DEFAULT_TEMPLATES[type],
        is_active: true,
        createdAt: 0,
        updatedAt: 0,
      };
    });
  },
});

// Get a specific email template by type
export const getTemplateByType = query({
  args: { template_type: templateTypeValidator },
  handler: async (ctx, args) => {
    const template = await ctx.db
      .query("email_templates")
      .withIndex("by_template_type", (q) => q.eq("template_type", args.template_type))
      .first();

    if (template) return template;

    // Return default template if not customized
    const defaults = DEFAULT_TEMPLATES[args.template_type as keyof typeof DEFAULT_TEMPLATES];
    return {
      _id: null,
      template_type: args.template_type,
      ...defaults,
      is_active: true,
      createdAt: 0,
      updatedAt: 0,
    };
  },
});

// Upsert (create or update) an email template
export const upsertTemplate = mutation({
  args: {
    sessionToken: v.optional(v.string()), // Optional for backwards compatibility
    template_type: templateTypeValidator,
    subject: v.string(),
    heading: v.string(),
    body_text: v.string(),
    cta_text: v.optional(v.string()),
    footer_text: v.optional(v.string()),
    is_active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Use unified auth (supports both Clerk and legacy)
    const user = await requireSuperAdmin(ctx, args.sessionToken);

    // Validate inputs
    if (!args.subject || args.subject.trim().length === 0) {
      throw new Error("Subject is required");
    }
    if (!args.heading || args.heading.trim().length === 0) {
      throw new Error("Heading is required");
    }
    if (!args.body_text || args.body_text.trim().length === 0) {
      throw new Error("Body text is required");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("email_templates")
      .withIndex("by_template_type", (q) => q.eq("template_type", args.template_type))
      .first();

    const templateData = {
      template_type: args.template_type,
      subject: args.subject.trim(),
      heading: args.heading.trim(),
      body_text: args.body_text.trim(),
      cta_text: args.cta_text?.trim() || "",
      footer_text: args.footer_text?.trim() || "",
      is_active: args.is_active ?? true,
      updated_by: user._id,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, templateData);
      return existing._id;
    }

    const id = await ctx.db.insert("email_templates", {
      ...templateData,
      createdAt: now,
    });
    return id;
  },
});

// Reset a template to its default
export const resetToDefault = mutation({
  args: {
    sessionToken: v.optional(v.string()), // Optional for backwards compatibility
    template_type: templateTypeValidator,
  },
  handler: async (ctx, args) => {
    // Use unified auth (supports both Clerk and legacy)
    await requireSuperAdmin(ctx, args.sessionToken);

    const existing = await ctx.db
      .query("email_templates")
      .withIndex("by_template_type", (q) => q.eq("template_type", args.template_type))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return { success: true };
  },
});

// Get default template values (for reference/reset)
export const getDefaults = query({
  args: {},
  handler: async () => {
    return DEFAULT_TEMPLATES;
  },
});
