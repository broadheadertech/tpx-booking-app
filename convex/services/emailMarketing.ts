import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// List campaigns (super admin: all, otherwise by branch)
export const getCampaignsByBranch = query({
  args: { branch_id: v.optional(v.id("branches")) },
  handler: async (ctx, args) => {
    if (args.branch_id) {
      return await ctx.db
        .query("email_campaigns")
        .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
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
    audience: v.union(v.literal("all_customers")),
    created_by: v.id("users"),
    scheduled_at: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("email_campaigns", {
      branch_id: args.branch_id,
      name: args.name,
      subject: args.subject,
      body_html: args.body_html,
      audience: args.audience,
      status: args.scheduled_at ? "scheduled" : "draft",
      scheduled_at: args.scheduled_at,
      sent_at: undefined,
      total_recipients: 0,
      sent_count: 0,
      failed_count: 0,
      created_by: args.created_by,
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
    audience: v.optional(v.union(v.literal("all_customers"))),
    status: v.optional(
      v.union(v.literal("draft"), v.literal("scheduled"), v.literal("sending"), v.literal("sent"), v.literal("failed"))
    ),
    scheduled_at: v.optional(v.number()),
    sent_at: v.optional(v.number()),
    total_recipients: v.optional(v.number()),
    sent_count: v.optional(v.number()),
    failed_count: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
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


