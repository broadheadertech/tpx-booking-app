/**
 * Resend Email Service for AI Marketing Campaigns
 * Simple, reliable email sending via Resend API
 */
import { action, mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY || "missing_key");

// Default sender - configured with verified Resend domain
const DEFAULT_FROM = "TipunoX Barber <noreply@tipunox.broadheader.com>";

/**
 * Send a single marketing email via Resend
 */
export const sendMarketingEmail = action({
  args: {
    to: v.string(),
    toName: v.optional(v.string()),
    subject: v.string(),
    htmlContent: v.string(),
    textContent: v.optional(v.string()),
    replyTo: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    try {
      console.log("📧 Sending marketing email via Resend:", {
        to: args.to,
        subject: args.subject,
      });

      const result = await resend.emails.send({
        from: DEFAULT_FROM,
        to: args.to,
        subject: args.subject,
        html: args.htmlContent,
        text: args.textContent || args.htmlContent.replace(/<[^>]*>/g, ""),
        reply_to: args.replyTo,
        tags: args.tags?.map((tag) => ({ name: tag, value: "true" })),
      });

      if (result.error) {
        console.error("❌ Resend error:", result.error);
        return {
          success: false,
          error: result.error.message || "Failed to send email",
        };
      }

      console.log("✅ Email sent successfully:", result.data?.id);
      return {
        success: true,
        messageId: result.data?.id,
      };
    } catch (error: any) {
      console.error("❌ Email sending failed:", error);
      return {
        success: false,
        error: error.message || "Unknown error occurred",
      };
    }
  },
});

/**
 * Send batch marketing emails (with rate limiting)
 */
export const sendBatchEmails = action({
  args: {
    emails: v.array(
      v.object({
        to: v.string(),
        toName: v.optional(v.string()),
        subject: v.string(),
        htmlContent: v.string(),
        textContent: v.optional(v.string()),
      })
    ),
    campaignId: v.optional(v.string()),
    delayMs: v.optional(v.number()), // Delay between emails (default 100ms)
  },
  handler: async (ctx, args) => {
    const results = {
      total: args.emails.length,
      sent: 0,
      failed: 0,
      errors: [] as Array<{ email: string; error: string }>,
    };

    const delay = args.delayMs || 100;

    console.log(
      `📨 Starting batch send: ${args.emails.length} emails, campaign: ${args.campaignId || "N/A"}`
    );

    for (let i = 0; i < args.emails.length; i++) {
      const email = args.emails[i];

      try {
        const result = await resend.emails.send({
          from: DEFAULT_FROM,
          to: email.to,
          subject: email.subject,
          html: email.htmlContent,
          text: email.textContent || email.htmlContent.replace(/<[^>]*>/g, ""),
          tags: args.campaignId
            ? [{ name: "campaign", value: args.campaignId }]
            : undefined,
        });

        if (result.error) {
          results.failed++;
          results.errors.push({
            email: email.to,
            error: result.error.message || "Send failed",
          });
        } else {
          results.sent++;
        }
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          email: email.to,
          error: error.message || "Unknown error",
        });
      }

      // Rate limiting delay (skip for last email)
      if (i < args.emails.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    console.log(
      `📊 Batch complete: ${results.sent} sent, ${results.failed} failed`
    );
    return results;
  },
});

/**
 * Send test email to verify Resend configuration
 */
export const sendTestEmail = action({
  args: {
    to: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const result = await resend.emails.send({
        from: DEFAULT_FROM,
        to: args.to,
        subject: "🧪 TipunoX Barber - Test Email",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); padding: 30px; text-align: center; border-radius: 16px;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🧪 Test Email</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Your Resend integration is working!</p>
            </div>
            <div style="padding: 30px 20px; background: #1a1a1a; border-radius: 0 0 16px 16px;">
              <p style="color: #e5e5e5; margin: 0 0 20px;">Hello!</p>
              <p style="color: #e5e5e5; margin: 0 0 20px;">
                This test email confirms your TipunoX Barber AI Email Marketing system is properly configured with Resend.
              </p>
              <p style="color: #e5e5e5; margin: 0;">
                If you received this email, everything is working correctly! 🎉
              </p>
            </div>
            <p style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">
              Sent via TipunoX Barber Email AI • Powered by Resend
            </p>
          </div>
        `,
        text: "Test email from TipunoX Barber. Your Resend integration is working!",
      });

      if (result.error) {
        return { success: false, error: result.error.message };
      }

      return { success: true, messageId: result.data?.id };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
});

/**
 * Check if Resend is configured
 */
export const isResendConfigured = action({
  args: {},
  handler: async () => {
    const hasKey = !!process.env.RESEND_API_KEY;
    const isValid =
      hasKey && process.env.RESEND_API_KEY !== "missing_key";

    return {
      configured: isValid,
      message: isValid
        ? "Resend is configured and ready"
        : "RESEND_API_KEY environment variable is not set",
    };
  },
});

/**
 * Generate HTML email from AI template data
 */
export const generateEmailHtml = action({
  args: {
    templateType: v.string(), // promotional, reminder, winback, loyalty, birthday
    brandName: v.string(),
    brandColor: v.optional(v.string()),
    subject: v.string(),
    greeting: v.string(),
    body: v.string(),
    ctaText: v.optional(v.string()),
    ctaUrl: v.optional(v.string()),
    footer: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const primaryColor = args.brandColor || "#8B5CF6";

    // Generate branded HTML email
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${args.subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="max-width: 600px; margin: 0 auto;">
    <tr>
      <td style="padding: 40px 20px;">
        <!-- Header -->
        <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
          <tr>
            <td style="background: linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%); padding: 30px; text-align: center; border-radius: 16px 16px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">${args.brandName}</h1>
            </td>
          </tr>
        </table>

        <!-- Body -->
        <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
          <tr>
            <td style="background: linear-gradient(180deg, #1a1a1a 0%, #2a2a2a 100%); padding: 40px 30px; border-radius: 0 0 16px 16px;">
              <h2 style="color: ${primaryColor}; margin: 0 0 20px; font-size: 22px; text-align: center;">${args.greeting}</h2>
              <p style="color: #e5e5e5; margin: 0 0 30px; font-size: 16px; line-height: 1.6; white-space: pre-line;">${args.body}</p>

              ${
                args.ctaText
                  ? `
              <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
                <tr>
                  <td style="text-align: center; padding: 10px 0 30px;">
                    <a href="${args.ctaUrl || "#"}" style="display: inline-block; background: linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">${args.ctaText}</a>
                  </td>
                </tr>
              </table>
              `
                  : ""
              }

              ${
                args.footer
                  ? `
              <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
                <tr>
                  <td style="background: ${primaryColor}15; border-left: 4px solid ${primaryColor}; border-radius: 8px; padding: 16px;">
                    <p style="color: #bbb; margin: 0; font-size: 13px; line-height: 1.5;">${args.footer}</p>
                  </td>
                </tr>
              </table>
              `
                  : ""
              }
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
          <tr>
            <td style="padding: 20px; text-align: center;">
              <p style="color: #666; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} ${args.brandName}. All rights reserved.
              </p>
              <p style="color: #444; font-size: 11px; margin: 10px 0 0;">
                Sent via TipunoX Barber Email AI
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    return { html };
  },
});
