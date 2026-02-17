import { v } from "convex/values";
import { action, internalMutation, internalQuery, mutation } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { Resend } from "resend";

// ============================================================================
// DEFAULT NOTIFICATION TEMPLATES
// ============================================================================

const DEFAULT_NOTIFICATION_TEMPLATES: Record<string, {
  subject: string;
  heading: string;
  body_text: string;
  cta_text?: string;
  footer_text?: string;
}> = {
  // Booking lifecycle
  booking_cancellation_to_branch: {
    subject: "Booking Cancelled - {{customer_name}}",
    heading: "Appointment Cancelled",
    body_text: "{{customer_name}}'s {{service_name}} appointment on {{date}} at {{time}} has been cancelled.\n\nReason: {{reason}}",
    footer_text: "The schedule has been updated automatically.",
  },
  booking_cancellation_to_customer: {
    subject: "Your booking at {{brand_name}} has been cancelled",
    heading: "Booking Cancelled",
    body_text: "Hi {{customer_name}},\n\nYour {{service_name}} appointment on {{date}} at {{time}} at {{branch_name}} has been cancelled.\n\nReason: {{reason}}\n\nWe apologize for the inconvenience.",
    cta_text: "Rebook Now",
    footer_text: "If you have questions, please contact the branch directly.",
  },
  booking_late_notice: {
    subject: "Are you on your way? - {{brand_name}}",
    heading: "Running Late?",
    body_text: "Hi {{customer_name}},\n\nYour {{service_name}} appointment at {{branch_name}} was scheduled for {{time}}. You're 15 minutes past your appointment time.\n\nPlease arrive soon or your booking may be marked as a no-show.",
    footer_text: "If you need to reschedule, please contact us.",
  },
  booking_no_show: {
    subject: "Missed Appointment - {{brand_name}}",
    heading: "We Missed You!",
    body_text: "Hi {{customer_name}},\n\nIt looks like you missed your {{service_name}} appointment at {{branch_name}} on {{date}} at {{time}}.\n\nYour booking has been marked as a no-show.",
    cta_text: "Rebook Now",
    footer_text: "Repeated no-shows may affect your booking privileges.",
  },
  booking_reminder: {
    subject: "Reminder: Your appointment at {{brand_name}} in 2 hours",
    heading: "Appointment Reminder",
    body_text: "Hi {{customer_name}},\n\nThis is a friendly reminder that your {{service_name}} appointment at {{branch_name}} is in about 2 hours.\n\n📅 Date: {{date}}\n🕐 Time: {{time}}\n\nPlease arrive 5-10 minutes early.",
    footer_text: "We look forward to seeing you!",
  },
  // Financial - Settlements
  settlement_requested: {
    subject: "New Settlement Request - {{branch_name}}",
    heading: "Settlement Requested",
    body_text: "A new settlement has been requested.\n\n📍 Branch: {{branch_name}}\n💰 Amount: ₱{{amount}}\n📊 Earnings: {{earnings_count}} records\n\nPlease review and approve or reject this settlement.",
    cta_text: "Review Settlement",
    footer_text: "Log in to the dashboard to process this request.",
  },
  settlement_approved: {
    subject: "Settlement Approved - ₱{{amount}}",
    heading: "Settlement Approved!",
    body_text: "Your settlement request for ₱{{amount}} has been approved and will be processed shortly.\n\nThe transfer will be sent to your registered payout account.",
    footer_text: "You will receive another notification once the transfer is complete.",
  },
  settlement_completed: {
    subject: "Settlement Completed - ₱{{amount}}",
    heading: "Settlement Transfer Complete",
    body_text: "The settlement of ₱{{amount}} has been completed.\n\n📋 Transfer Reference: {{transfer_reference}}\n📍 Branch: {{branch_name}}\n\nPlease verify the transfer in your account.",
    footer_text: "Contact us if there are any discrepancies.",
  },
  settlement_rejected: {
    subject: "URGENT: Settlement Rejected - ₱{{amount}}",
    heading: "Settlement Rejected",
    body_text: "Your settlement request for ₱{{amount}} has been rejected.\n\n❌ Reason: {{rejection_reason}}\n\nPlease review the reason and resubmit if applicable. Your earnings have been released back to pending status.",
    cta_text: "View Details",
    footer_text: "Contact the super admin if you have questions about the rejection.",
  },
  // Financial - Wallet
  branch_wallet_topup: {
    subject: "Branch Wallet Top-Up - ₱{{amount}}",
    heading: "Wallet Top-Up Successful",
    body_text: "A branch wallet top-up has been processed.\n\n📍 Branch: {{branch_name}}\n💰 Amount: ₱{{amount}}\n💳 New Balance: ₱{{new_balance}}\n📋 Payment Method: {{payment_method}}",
    footer_text: "This top-up has been credited to the branch wallet.",
  },
  customer_wallet_topup: {
    subject: "Wallet Top-Up Receipt - ₱{{amount}}",
    heading: "Top-Up Successful!",
    body_text: "Hi {{customer_name}},\n\nYour wallet has been topped up successfully.\n\n💰 Amount: ₱{{amount}}\n🎁 Bonus: ₱{{bonus}}\n💳 New Balance: ₱{{new_balance}}\n\nYour credits are ready to use for your next booking!",
    footer_text: "Thank you for using our wallet system.",
  },
  wallet_low_balance: {
    subject: "Low Wallet Balance Alert - {{branch_name}}",
    heading: "Low Balance Warning",
    body_text: "The wallet balance for {{branch_name}} is critically low.\n\n💳 Current Balance: ₱{{current_balance}}\n⚠️ Threshold: ₱{{threshold}}\n\nPlease top up the wallet to ensure continued operations.",
    cta_text: "Top Up Now",
    footer_text: "A low wallet balance may affect branch operations.",
  },
  // Product Orders
  new_product_order: {
    subject: "New Product Order - {{branch_name}}",
    heading: "New Product Order",
    body_text: "A new product order has been submitted.\n\n📍 Branch: {{branch_name}}\n📋 Order #: {{order_number}}\n💰 Total: ₱{{total}}\n📦 Items: {{item_count}}\n\nPlease review and process this order.",
    cta_text: "Review Order",
    footer_text: "Log in to the dashboard to approve or reject this order.",
  },
  order_approved: {
    subject: "Order Approved - #{{order_number}}",
    heading: "Order Approved!",
    body_text: "Your product order #{{order_number}} has been approved.\n\n💰 Total: ₱{{total}}\n\nYour order will be prepared for shipping.",
    footer_text: "You will be notified when your order is shipped.",
  },
  order_rejected: {
    subject: "Order Rejected - #{{order_number}}",
    heading: "Order Rejected",
    body_text: "Your product order #{{order_number}} has been rejected.\n\n❌ Reason: {{rejection_reason}}\n\nThe held amount has been released back to your branch wallet.",
    footer_text: "Contact the super admin if you have questions.",
  },
  order_shipped: {
    subject: "Order Shipped - #{{order_number}}",
    heading: "Order Shipped!",
    body_text: "Your product order #{{order_number}} has been shipped and is on its way.\n\nPlease prepare to receive and verify the delivery.",
    footer_text: "Mark the order as received once you verify all items.",
  },
  order_delivered: {
    subject: "Order Delivered - #{{order_number}}",
    heading: "Order Received",
    body_text: "Product order #{{order_number}} has been marked as delivered and received.\n\nYour inventory has been updated accordingly.",
    footer_text: "Check your inventory to confirm all items are correct.",
  },
  order_payment_receipt: {
    subject: "Order Payment Receipt - #{{order_number}}",
    heading: "Payment Deducted",
    body_text: "A payment has been deducted from your branch wallet for order #{{order_number}}.\n\n💰 Amount: ₱{{amount}}\n💳 New Balance: ₱{{new_balance}}",
    footer_text: "This receipt is for your records.",
  },
  customer_order_confirmation: {
    subject: "Order Confirmation - {{brand_name}}",
    heading: "Order Confirmed!",
    body_text: "Hi {{customer_name}},\n\nYour product order has been confirmed.\n\n📋 Order #: {{order_number}}\n💰 Total: ₱{{total}}\n📦 Items: {{item_count}}\n\nWe'll notify you when your order status changes.",
    footer_text: "Thank you for your purchase!",
  },
  // Operational
  low_stock_alert: {
    subject: "Low Stock Alert - {{product_count}} products below threshold",
    heading: "Low Stock Warning",
    body_text: "The following products are below their minimum stock threshold:\n\n{{product_list}}\n\nPlease reorder to maintain adequate inventory levels.",
    cta_text: "View Inventory",
    footer_text: "This is an automated daily stock check.",
  },
  monthly_earnings_summary: {
    subject: "Monthly Earnings Summary - {{month}}",
    heading: "Monthly Earnings Summary",
    body_text: "Here's your earnings summary for {{month}}:\n\n💰 Total Revenue: ₱{{total_revenue}}\n📊 Transactions: {{transaction_count}}\n\n{{details}}",
    footer_text: "This is an automated monthly report.",
  },
  weekly_payroll: {
    subject: "Weekly Payroll - {{brand_name}}",
    heading: "Payroll Processed",
    body_text: "Hi {{barber_name}},\n\nYour weekly payroll has been processed.\n\n💰 Gross: ₱{{gross}}\n📊 Deductions: ₱{{deductions}}\n💳 Net Pay: ₱{{net_pay}}\n📅 Period: {{period}}",
    footer_text: "Contact your branch admin if you have questions about your payroll.",
  },
  branch_offline: {
    subject: "Branch Offline Alert - {{branch_name}}",
    heading: "Branch Offline",
    body_text: "{{branch_name}} has gone offline or been marked as inactive.\n\nThis may affect customer bookings and operations.",
    footer_text: "Please investigate and restore branch operations.",
  },
  damage_claim_filed: {
    subject: "Damage Claim Filed - {{branch_name}}",
    heading: "New Damage Claim",
    body_text: "A damage claim has been filed.\n\n📍 Branch: {{branch_name}}\n📋 Item: {{item_name}}\n💰 Estimated Cost: ₱{{estimated_cost}}\n📝 Description: {{description}}",
    footer_text: "Log in to review and process this claim.",
  },
  account_banned: {
    subject: "Account Suspended - {{brand_name}}",
    heading: "Account Suspended",
    body_text: "Hi {{customer_name}},\n\nYour account at {{brand_name}} has been suspended.\n\n❌ Reason: {{reason}}\n\nIf you believe this is a mistake, please contact our support team.",
    footer_text: "Reply to this email to appeal this decision.",
  },
  scheduled_maintenance: {
    subject: "Scheduled Maintenance - {{brand_name}}",
    heading: "Scheduled Maintenance",
    body_text: "{{brand_name}} will undergo scheduled maintenance.\n\n📅 Date: {{date}}\n🕐 Time: {{time}}\n⏱️ Duration: {{duration}}\n\nSome features may be temporarily unavailable.",
    footer_text: "We apologize for any inconvenience.",
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function replaceVariables(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value || "");
  }
  return result;
}

function buildNotificationHtml(params: {
  brandName: string;
  primaryColor: string;
  accentColor: string;
  heading: string;
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  footerHtml?: string;
}): string {
  const { brandName, primaryColor, accentColor, heading, bodyHtml, ctaText, ctaUrl, footerHtml } = params;
  const primaryLight = `${primaryColor}1a`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
      background-color: #f5f5f5;
      color: #333;
      line-height: 1.6;
    }
    .container {
      max-width: 500px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%);
      padding: 24px;
      text-align: center;
      color: white;
    }
    .header h1 {
      font-size: 22px;
      font-weight: 700;
      margin: 0;
      letter-spacing: -0.5px;
    }
    .body {
      padding: 28px 24px;
    }
    .body-text {
      font-size: 14px;
      color: #555;
      line-height: 1.7;
      margin-bottom: 24px;
    }
    .cta-button {
      display: block;
      width: 100%;
      max-width: 280px;
      margin: 0 auto 24px;
      padding: 14px 24px;
      background: ${primaryColor};
      color: white !important;
      text-align: center;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
    }
    .info-box {
      background: ${primaryLight};
      border-left: 4px solid ${primaryColor};
      border-radius: 4px;
      padding: 16px;
      margin-bottom: 24px;
      font-size: 13px;
      color: #555;
      line-height: 1.6;
    }
    .footer {
      background: #f9f9f9;
      border-top: 1px solid #efefef;
      padding: 16px 24px;
      text-align: center;
      font-size: 11px;
      color: #999;
    }
    .footer p { margin: 2px 0; }
    .brand-name { font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${heading}</h1>
    </div>
    <div class="body">
      <div class="body-text">${bodyHtml}</div>
      ${ctaText && ctaUrl ? `<a href="${ctaUrl}" class="cta-button">${ctaText}</a>` : ""}
      ${footerHtml ? `<div class="info-box">${footerHtml}</div>` : ""}
    </div>
    <div class="footer">
      <p class="brand-name">${brandName}</p>
      <p>This is an automated notification.</p>
    </div>
  </div>
</body>
</html>`;
}

// ============================================================================
// RECIPIENT RESOLVERS (internal queries)
// ============================================================================

export const getSuperAdminEmails = internalQuery({
  args: {},
  handler: async (ctx) => {
    const superAdmins = await ctx.db
      .query("users")
      .withIndex("by_role", (q: any) => q.eq("role", "super_admin"))
      .collect();
    return superAdmins
      .filter((u: any) => u.is_active !== false && u.email)
      .map((u: any) => ({ email: u.email!, name: u.nickname || u.username || "Admin" }));
  },
});

export const getBranchAdminEmails = internalQuery({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    const admins = await ctx.db
      .query("users")
      .withIndex("by_branch_role", (q: any) =>
        q.eq("branch_id", args.branch_id).eq("role", "branch_admin")
      )
      .collect();
    return admins
      .filter((u: any) => u.is_active !== false && u.email)
      .map((u: any) => ({ email: u.email!, name: u.nickname || u.username || "Branch Admin" }));
  },
});

// ============================================================================
// MAIN EMAIL SENDING ACTION
// ============================================================================

export const sendNotificationEmail = action({
  args: {
    notification_type: v.string(),
    to_email: v.string(),
    to_name: v.optional(v.string()),
    variables: v.any(),
    cta_url: v.optional(v.string()),
    recipient_role: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Fetch branding
    const branding = await ctx.runQuery(api.services.branding.getGlobalBranding, {});
    const brandName = branding?.display_name || "TipunoX";
    const primaryColor = branding?.primary_color || "#000000";
    const accentColor = branding?.accent_color || "#000000";

    // 2. Resolve template — try DB first, fall back to defaults
    let template: any = null;
    try {
      template = await ctx.runQuery(api.services.emailTemplates.getTemplateByType, {
        template_type: args.notification_type as any,
      });
    } catch {
      // Type not in emailTemplates validator — use our defaults
    }

    if (!template || !template.subject) {
      template = DEFAULT_NOTIFICATION_TEMPLATES[args.notification_type];
    }

    if (!template) {
      console.error(`[EMAIL] No template found for notification type: ${args.notification_type}`);
      return { success: false, error: "No template found" };
    }

    // 3. Build variables map
    const vars: Record<string, string> = {
      brand_name: brandName,
      ...(args.variables || {}),
    };

    // 4. Replace variables in template fields
    const subject = replaceVariables(template.subject || "Notification", vars);
    const heading = replaceVariables(template.heading || "", vars);
    const bodyText = replaceVariables(template.body_text || "", vars);
    const ctaText = template.cta_text || undefined;
    const footerText = replaceVariables(template.footer_text || "", vars);

    // 5. Build HTML
    const html = buildNotificationHtml({
      brandName,
      primaryColor,
      accentColor,
      heading,
      bodyHtml: bodyText.replace(/\n/g, "<br>"),
      ctaText,
      ctaUrl: args.cta_url,
      footerHtml: footerText ? footerText.replace(/\n/g, "<br>") : undefined,
    });

    // 6. Send via Resend
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("[EMAIL] RESEND_API_KEY not configured");
      return { success: false, error: "Email service not configured" };
    }

    const resend = new Resend(apiKey);
    try {
      const result = await resend.emails.send({
        from: `${brandName} <no-reply@tipunox.broadheader.com>`,
        to: args.to_email,
        subject,
        html,
      });

      if (result.error) {
        console.error(`[EMAIL] Failed to send ${args.notification_type} to ${args.to_email}:`, result.error);
        return { success: false, error: result.error.message };
      }

      console.log(`[EMAIL] Sent ${args.notification_type} to ${args.to_email}:`, result.data?.id);
      return { success: true, messageId: result.data?.id };
    } catch (error: any) {
      console.error(`[EMAIL] Error sending ${args.notification_type}:`, error);
      return { success: false, error: error.message };
    }
  },
});

// ============================================================================
// ROLE-BASED NOTIFICATION ACTION
// ============================================================================

export const sendNotificationToRole = action({
  args: {
    notification_type: v.string(),
    role: v.union(v.literal("super_admin"), v.literal("branch_admin")),
    branch_id: v.optional(v.id("branches")),
    variables: v.any(),
    cta_url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let recipients: Array<{ email: string; name: string }> = [];

    if (args.role === "super_admin") {
      recipients = await ctx.runQuery(
        internal.services.emailNotifications.getSuperAdminEmails,
        {}
      );
    } else if (args.role === "branch_admin" && args.branch_id) {
      recipients = await ctx.runQuery(
        internal.services.emailNotifications.getBranchAdminEmails,
        { branch_id: args.branch_id }
      );
    }

    if (recipients.length === 0) {
      console.log(`[EMAIL] No recipients found for role=${args.role}, type=${args.notification_type}`);
      return [];
    }

    const results = [];
    for (const r of recipients) {
      try {
        const result = await ctx.runAction(
          api.services.emailNotifications.sendNotificationEmail,
          {
            notification_type: args.notification_type,
            to_email: r.email,
            to_name: r.name,
            variables: args.variables,
            cta_url: args.cta_url,
            recipient_role: args.role,
          }
        );
        results.push(result);
      } catch (error: any) {
        console.error(`[EMAIL] Failed to send to ${r.email}:`, error);
        results.push({ success: false, error: error.message });
      }
    }
    return results;
  },
});

// ============================================================================
// CRON MUTATIONS
// ============================================================================

/**
 * Send booking reminder emails ~2 hours before appointment.
 * Runs every 15 minutes. Checks for bookings 1.5-2.5 hours away.
 */
export const sendBookingReminderEmails = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    // Get today's date in YYYY-MM-DD format (Philippine time = UTC+8)
    const phNow = new Date(now + 8 * 60 * 60 * 1000);
    const todayStr = phNow.toISOString().split("T")[0];

    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_date", (q: any) => q.eq("date", todayStr))
      .collect();

    let sent = 0;
    for (const booking of bookings) {
      if (booking.email_reminder_sent) continue;
      if (booking.status !== "booked" && booking.status !== "confirmed" && booking.status !== "pending") continue;

      try {
        const [hours, minutes] = booking.time.split(":").map(Number);
        const bookingDate = new Date(todayStr + "T00:00:00+08:00");
        bookingDate.setHours(hours, minutes, 0, 0);
        const bookingEpoch = bookingDate.getTime();

        // Check if booking is 1.5 to 2.5 hours from now
        const timeUntil = bookingEpoch - now;
        if (timeUntil >= 90 * 60 * 1000 && timeUntil <= 150 * 60 * 1000) {
          const customer = booking.customer ? await ctx.db.get(booking.customer) : null;
          const service = await ctx.db.get(booking.service);
          const branch = await ctx.db.get(booking.branch_id);
          const email = booking.customer_email || customer?.email;

          if (email && service && branch) {
            await ctx.scheduler.runAfter(0, api.services.emailNotifications.sendNotificationEmail, {
              notification_type: "booking_reminder",
              to_email: email,
              to_name: booking.customer_name || (customer as any)?.nickname || "Customer",
              variables: {
                customer_name: booking.customer_name || (customer as any)?.nickname || "there",
                service_name: service.name,
                branch_name: branch.name || "our branch",
                date: booking.date,
                time: booking.time,
              },
            });
            await ctx.db.patch(booking._id, { email_reminder_sent: true });
            sent++;
          }
        }
      } catch (e) {
        console.error("[EMAIL_REMINDER] Error:", e);
      }
    }

    if (sent > 0) console.log(`[EMAIL_REMINDER] Sent ${sent} booking reminder emails`);
    return { sent };
  },
});

/**
 * Send late notice emails 15 minutes after appointment time.
 * Runs every 5 minutes. Checks for bookings 15-25 min past time.
 */
export const sendLateNoticeEmails = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const phNow = new Date(now + 8 * 60 * 60 * 1000);
    const todayStr = phNow.toISOString().split("T")[0];

    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_date", (q: any) => q.eq("date", todayStr))
      .collect();

    let sent = 0;
    for (const booking of bookings) {
      if (booking.late_notice_sent) continue;
      if (booking.status !== "booked" && booking.status !== "confirmed") continue;

      try {
        const [hours, minutes] = booking.time.split(":").map(Number);
        const bookingDate = new Date(todayStr + "T00:00:00+08:00");
        bookingDate.setHours(hours, minutes, 0, 0);
        const bookingEpoch = bookingDate.getTime();

        // 15-25 minutes past the booking time
        const timePast = now - bookingEpoch;
        if (timePast >= 15 * 60 * 1000 && timePast <= 25 * 60 * 1000) {
          const customer = booking.customer ? await ctx.db.get(booking.customer) : null;
          const service = await ctx.db.get(booking.service);
          const branch = await ctx.db.get(booking.branch_id);
          const email = booking.customer_email || customer?.email;

          if (email && service && branch) {
            await ctx.scheduler.runAfter(0, api.services.emailNotifications.sendNotificationEmail, {
              notification_type: "booking_late_notice",
              to_email: email,
              to_name: booking.customer_name || (customer as any)?.nickname || "Customer",
              variables: {
                customer_name: booking.customer_name || (customer as any)?.nickname || "there",
                service_name: service.name,
                branch_name: branch.name || "our branch",
                date: booking.date,
                time: booking.time,
              },
            });
            await ctx.db.patch(booking._id, { late_notice_sent: true });
            sent++;
          }
        }
      } catch (e) {
        console.error("[LATE_NOTICE] Error:", e);
      }
    }

    if (sent > 0) console.log(`[LATE_NOTICE] Sent ${sent} late notice emails`);
    return { sent };
  },
});

/**
 * Send no-show emails 1 hour after appointment time.
 * Runs every 15 minutes. Checks for bookings 55-75 min past time.
 */
export const sendNoShowEmails = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const phNow = new Date(now + 8 * 60 * 60 * 1000);
    const todayStr = phNow.toISOString().split("T")[0];

    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_date", (q: any) => q.eq("date", todayStr))
      .collect();

    let sent = 0;
    for (const booking of bookings) {
      if (booking.no_show_email_sent) continue;
      if (booking.status !== "booked" && booking.status !== "confirmed") continue;

      try {
        const [hours, minutes] = booking.time.split(":").map(Number);
        const bookingDate = new Date(todayStr + "T00:00:00+08:00");
        bookingDate.setHours(hours, minutes, 0, 0);
        const bookingEpoch = bookingDate.getTime();

        // 55-75 minutes past the booking time
        const timePast = now - bookingEpoch;
        if (timePast >= 55 * 60 * 1000 && timePast <= 75 * 60 * 1000) {
          const customer = booking.customer ? await ctx.db.get(booking.customer) : null;
          const service = await ctx.db.get(booking.service);
          const branch = await ctx.db.get(booking.branch_id);
          const email = booking.customer_email || customer?.email;

          if (email && service && branch) {
            await ctx.scheduler.runAfter(0, api.services.emailNotifications.sendNotificationEmail, {
              notification_type: "booking_no_show",
              to_email: email,
              to_name: booking.customer_name || (customer as any)?.nickname || "Customer",
              variables: {
                customer_name: booking.customer_name || (customer as any)?.nickname || "there",
                service_name: service.name,
                branch_name: branch.name || "our branch",
                date: booking.date,
                time: booking.time,
              },
            });
            await ctx.db.patch(booking._id, { no_show_email_sent: true });
            sent++;
          }
        }
      } catch (e) {
        console.error("[NO_SHOW] Error:", e);
      }
    }

    if (sent > 0) console.log(`[NO_SHOW] Sent ${sent} no-show emails`);
    return { sent };
  },
});

/**
 * Send low stock alert digest to SA + BA.
 * Runs daily.
 */
export const sendLowStockAlerts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db
      .query("productCatalog")
      .collect();

    const lowStock = products.filter(
      (p: any) => p.is_active !== false && p.stock != null && p.minStock != null && p.stock <= p.minStock
    );

    if (lowStock.length === 0) return { sent: 0 };

    // In-app notification for SA
    await ctx.db.insert("notifications", {
      title: "Low Stock Alert",
      message: `${lowStock.length} product${lowStock.length > 1 ? "s" : ""} below minimum stock threshold`,
      type: "alert" as const,
      priority: "high" as const,
      recipient_type: "admin" as const,
      is_read: false,
      is_archived: false,
      action_label: "View Inventory",
      metadata: { product_count: lowStock.length },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const productList = lowStock
      .map((p: any) => `• ${p.name}: ${p.stock} remaining (min: ${p.minStock})`)
      .join("\n");

    // Send to SA
    await ctx.scheduler.runAfter(0, api.services.emailNotifications.sendNotificationToRole, {
      notification_type: "low_stock_alert",
      role: "super_admin",
      variables: {
        product_count: String(lowStock.length),
        product_list: productList,
      },
    });

    // Send to each branch that has low stock products
    const branchIds = [...new Set(lowStock.map((p: any) => p.branch_id).filter(Boolean))];
    for (const branchId of branchIds) {
      const branchProducts = lowStock.filter((p: any) => p.branch_id === branchId);
      const branchList = branchProducts
        .map((p: any) => `• ${p.name}: ${p.stock} remaining (min: ${p.minStock})`)
        .join("\n");

      await ctx.scheduler.runAfter(0, api.services.emailNotifications.sendNotificationToRole, {
        notification_type: "low_stock_alert",
        role: "branch_admin",
        branch_id: branchId,
        variables: {
          product_count: String(branchProducts.length),
          product_list: branchList,
        },
      });
    }

    console.log(`[LOW_STOCK] Found ${lowStock.length} low stock products across ${branchIds.length} branches`);
    return { sent: 1, products: lowStock.length };
  },
});

/**
 * Send monthly earnings summary on the 1st of each month.
 * Summarizes last month's transactions by branch.
 */
export const sendMonthlyEarningsSummary = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const phNow = new Date(now + 8 * 60 * 60 * 1000);

    const firstOfThisMonth = new Date(phNow.getFullYear(), phNow.getMonth(), 1);
    const firstOfLastMonth = new Date(phNow.getFullYear(), phNow.getMonth() - 1, 1);
    const lastMonth = firstOfLastMonth.toLocaleString("en-US", { month: "long", year: "numeric" });

    const branches = await ctx.db.query("branches").collect();
    const activeBranches = branches.filter((b: any) => b.is_active !== false);

    const allTransactions = await ctx.db.query("transactions").collect();
    const lastMonthTxns = allTransactions.filter((t: any) => {
      const txnDate = new Date(t.createdAt || t._creationTime);
      return txnDate >= firstOfLastMonth && txnDate < firstOfThisMonth && t.status === "completed";
    });

    if (lastMonthTxns.length === 0) return { sent: 0 };

    const totalRevenue = lastMonthTxns.reduce((sum: number, t: any) => sum + (t.total_amount || t.amount || 0), 0);

    // SA summary with per-branch breakdown
    await ctx.scheduler.runAfter(0, api.services.emailNotifications.sendNotificationToRole, {
      notification_type: "monthly_earnings_summary",
      role: "super_admin",
      variables: {
        month: lastMonth,
        total_revenue: totalRevenue.toLocaleString(),
        transaction_count: String(lastMonthTxns.length),
        details: activeBranches.map((b: any) => {
          const branchTxns = lastMonthTxns.filter((t: any) => t.branch_id === b._id);
          const branchRev = branchTxns.reduce((sum: number, t: any) => sum + (t.total_amount || t.amount || 0), 0);
          return `📍 ${b.name}: ₱${branchRev.toLocaleString()} (${branchTxns.length} txns)`;
        }).join("\n"),
      },
    });

    // Per-branch summary for BA
    for (const branch of activeBranches) {
      const branchTxns = lastMonthTxns.filter((t: any) => t.branch_id === branch._id);
      if (branchTxns.length === 0) continue;
      const branchRevenue = branchTxns.reduce((sum: number, t: any) => sum + (t.total_amount || t.amount || 0), 0);

      await ctx.scheduler.runAfter(0, api.services.emailNotifications.sendNotificationToRole, {
        notification_type: "monthly_earnings_summary",
        role: "branch_admin",
        branch_id: branch._id,
        variables: {
          month: lastMonth,
          total_revenue: branchRevenue.toLocaleString(),
          transaction_count: String(branchTxns.length),
          details: `Your branch processed ${branchTxns.length} transactions totaling ₱${branchRevenue.toLocaleString()} in ${lastMonth}.`,
        },
      });
    }

    console.log(`[MONTHLY_EARNINGS] Sent monthly earnings summary for ${lastMonth}`);
    return { sent: 1 };
  },
});

/**
 * Send weekly payroll summary every Monday.
 * Summarizes last week's barber earnings per branch.
 */
export const sendWeeklyPayrollSummary = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const phNow = new Date(now + 8 * 60 * 60 * 1000);

    // Last week: Monday to Sunday
    const dayOfWeek = phNow.getDay();
    const lastSunday = new Date(phNow);
    lastSunday.setDate(phNow.getDate() - dayOfWeek);
    lastSunday.setHours(23, 59, 59, 999);

    const lastMonday = new Date(lastSunday);
    lastMonday.setDate(lastSunday.getDate() - 6);
    lastMonday.setHours(0, 0, 0, 0);

    const period = `${lastMonday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${lastSunday.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

    const allEarnings = await ctx.db.query("barber_earnings").collect();
    const weekEarnings = allEarnings.filter((e: any) => {
      const d = new Date(e.createdAt || e._creationTime);
      return d >= lastMonday && d <= lastSunday;
    });

    if (weekEarnings.length === 0) return { sent: 0 };

    // Group by barber
    const byBarber: Record<string, any[]> = {};
    for (const e of weekEarnings) {
      const key = String(e.barber_id);
      if (!byBarber[key]) byBarber[key] = [];
      byBarber[key].push(e);
    }

    let sent = 0;
    for (const [barberId, earnings] of Object.entries(byBarber)) {
      const barber = await ctx.db.get(barberId as any);
      if (!barber) continue;

      const gross = earnings.reduce((sum: number, e: any) => sum + (e.gross_amount || e.amount || 0), 0);
      const deductions = earnings.reduce((sum: number, e: any) => sum + (e.deduction || 0), 0);
      const netPay = gross - deductions;

      if ((barber as any).branch_id) {
        await ctx.scheduler.runAfter(0, api.services.emailNotifications.sendNotificationToRole, {
          notification_type: "weekly_payroll",
          role: "branch_admin",
          branch_id: (barber as any).branch_id,
          variables: {
            barber_name: (barber as any).full_name || (barber as any).name || "Barber",
            gross: `₱${gross.toLocaleString()}`,
            deductions: `₱${deductions.toLocaleString()}`,
            net_pay: `₱${netPay.toLocaleString()}`,
            period,
          },
        });
        sent++;
      }
    }

    console.log(`[WEEKLY_PAYROLL] Sent ${sent} payroll summary emails`);
    return { sent };
  },
});

/**
 * Manually send a scheduled maintenance notification to all admins.
 */
export const sendScheduledMaintenanceEmail = mutation({
  args: {
    date: v.string(),
    time: v.string(),
    duration: v.string(),
  },
  handler: async (ctx, args) => {
    // Email SA
    await ctx.scheduler.runAfter(0, api.services.emailNotifications.sendNotificationToRole, {
      notification_type: "scheduled_maintenance",
      role: "super_admin",
      variables: { date: args.date, time: args.time, duration: args.duration },
    });

    // Email all active branch admins
    const branches = await ctx.db.query("branches").collect();
    for (const branch of branches) {
      if (branch.is_active !== false) {
        await ctx.scheduler.runAfter(0, api.services.emailNotifications.sendNotificationToRole, {
          notification_type: "scheduled_maintenance",
          role: "branch_admin",
          branch_id: branch._id,
          variables: { date: args.date, time: args.time, duration: args.duration },
        });
      }
    }

    return { success: true };
  },
});
