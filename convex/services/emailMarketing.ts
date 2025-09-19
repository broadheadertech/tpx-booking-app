import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// List campaigns (super admin: all, otherwise by branch)
export const getCampaignsByBranch = query({
  args: { branch_id: v.optional(v.id("branches")) },
  handler: async (ctx, args) => {
    if (args.branch_id) {
      return await ctx.db
        .query("email_campaigns")
        .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id!))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("email_campaigns").order("desc").collect();
  },
});

// Get single campaign
export const getCampaignById = query({
  args: { id: v.id("email_campaigns") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create campaign
export const createCampaign = mutation({
  args: {
    branch_id: v.id("branches"),
    name: v.string(),
    subject: v.string(),
    body_html: v.string(),
    audience: v.union(v.literal("all_customers"), v.literal("new_customers"), v.literal("returning_customers"), v.literal("vip_customers")),
    template_type: v.optional(v.union(
      v.literal("marketing"),
      v.literal("promotional"),
      v.literal("newsletter"),
      v.literal("custom")
    )),
    from_email: v.optional(v.string()),
    created_by: v.id("users"),
    scheduled_at: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const mapTemplateType = (
      t: "marketing" | "promotional" | "custom" | "newsletter" | "reminder" | undefined
    ): "marketing" | "promotional" | "custom" | "reminder" | undefined => {
      if (!t) return undefined;
      if (t === "newsletter") return "marketing";
      return t;
    };
    const now = Date.now();
    const id = await ctx.db.insert("email_campaigns", {
      branch_id: args.branch_id,
      name: args.name,
      subject: args.subject,
      body_html: args.body_html,
      audience: args.audience,
      template_type: mapTemplateType(args.template_type) || "custom",
      from_email: args.from_email,
      status: args.scheduled_at ? "scheduled" : "draft",
      scheduled_at: args.scheduled_at,
      sent_at: undefined,
      total_recipients: 0,
      sent_count: 0,
      failed_count: 0,
      open_count: 0,
      click_count: 0,
      unsubscribe_count: 0,
      created_by: args.created_by,
      tags: args.tags || [],
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

// Update campaign (status or content)
export const updateCampaign = mutation({
  args: {
    id: v.id("email_campaigns"),
    name: v.optional(v.string()),
    subject: v.optional(v.string()),
    body_html: v.optional(v.string()),
    audience: v.optional(v.union(v.literal("all_customers"), v.literal("new_customers"), v.literal("returning_customers"), v.literal("vip_customers"))),
    template_type: v.optional(v.union(
      v.literal("marketing"),
      v.literal("promotional"),
      v.literal("newsletter"),
      v.literal("custom")
    )),
    from_email: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal("draft"), v.literal("scheduled"), v.literal("sending"), v.literal("sent"), v.literal("failed"))
    ),
    scheduled_at: v.optional(v.number()),
    sent_at: v.optional(v.number()),
    total_recipients: v.optional(v.number()),
    sent_count: v.optional(v.number()),
    failed_count: v.optional(v.number()),
    open_count: v.optional(v.number()),
    click_count: v.optional(v.number()),
    unsubscribe_count: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const mapTemplateType = (
      t: "marketing" | "promotional" | "custom" | "newsletter" | "reminder" | undefined
    ): "marketing" | "promotional" | "custom" | "reminder" | undefined => {
      if (!t) return undefined;
      if (t === "newsletter") return "marketing";
      return t;
    };

    const patched = { ...updates, template_type: mapTemplateType(updates.template_type), updatedAt: Date.now() } as any;
    await ctx.db.patch(id, patched);
    return { success: true };
  },
});

// Log a send attempt for a campaign
export const logCampaignSend = mutation({
  args: {
    campaign_id: v.id("email_campaigns"),
    recipient_email: v.string(),
    recipient_id: v.optional(v.id("users")),
    status: v.union(v.literal("sent"), v.literal("failed")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const logId = await ctx.db.insert("email_campaign_logs", {
      campaign_id: args.campaign_id,
      recipient_email: args.recipient_email,
      recipient_id: args.recipient_id,
      status: args.status,
      error: args.error,
      createdAt: Date.now(),
    });

    // Increment counters on campaign
    const campaign = await ctx.db.get(args.campaign_id);
    if (campaign) {
      await ctx.db.patch(args.campaign_id, {
        sent_count: (campaign.sent_count || 0) + (args.status === "sent" ? 1 : 0),
        failed_count: (campaign.failed_count || 0) + (args.status === "failed" ? 1 : 0),
        updatedAt: Date.now(),
      });
    }

    return logId;
  },
});

// Get logs for a campaign
export const getCampaignLogs = query({
  args: { campaign_id: v.id("email_campaigns") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("email_campaign_logs")
      .withIndex("by_campaign", (q) => q.eq("campaign_id", args.campaign_id))
      .order("desc")
      .collect();
  },
});

export const deleteCampaign = mutation({
  args: {
    id: v.id("email_campaigns"),
  },
  handler: async (ctx, args) => {
    // Delete related logs
    const logs = await ctx.db
      .query("email_campaign_logs")
      .withIndex("by_campaign", (q) => q.eq("campaign_id", args.id))
      .collect();

    for (const log of logs) {
      await ctx.db.delete(log._id);
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});


// EmailJS will be handled client-side, no server actions needed
