import { action } from "../_generated/server"
import { v } from "convex/values"

export const generateEmail = action({
  args: {
    prompt: v.string(),
    brandName: v.optional(v.string()),
    brandColor: v.optional(v.string()),
    businessType: v.optional(v.string()),
    tone: v.optional(v.string()),
    model: v.optional(v.string()),
    voucherValue: v.optional(v.number()),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error("Gemini API key not configured. Set GEMINI_API_KEY in Convex Dashboard.")
    }

    const brand = args.brandName || "our business"
    const color = args.brandColor || "#6366f1"
    const biz = args.businessType || "salon/barbershop"
    const tone = args.tone || "professional yet friendly"

    const fullPrompt = `You are Avexa, the AI email marketing assistant for ${brand} (a ${biz}).

Generate a complete marketing email based on the user's request below.

RULES:
- Write in a ${tone} tone
- Use the brand color ${color} for buttons and accents
- Create clean, inline-styled HTML that works in all email clients
- Include a prominent CTA button
- Keep the email concise and scannable
- Use simple HTML tables for layout (email-safe)
- Do NOT use external CSS or JavaScript
${args.voucherValue ? `
VOUCHER SECTION (MANDATORY):
- You MUST include a voucher/promo code section in the email body
- Use the exact placeholder {{VOUCHER_CODE}} where the unique code should appear (it will be replaced per recipient)
- Include an <img> tag with src="{{VOUCHER_QR}}" alt="Scan to redeem" width="150" height="150" for the QR code
- Style the voucher section prominently with a dashed border, centered text, and the brand color
- The voucher is worth ₱${args.voucherValue}
- Make the voucher section visually striking and easy to find` : ''}

You MUST respond with ONLY valid JSON (no markdown, no code fences) in this exact structure:
{"subject": "Email subject line (compelling, under 60 chars)", "body_html": "<html>Complete email HTML with inline styles</html>", "suggestions": ["Improvement tip 1", "Improvement tip 2", "Improvement tip 3"]}

The suggestions should be 2-3 actionable tips to improve the campaign.

USER REQUEST: ${args.prompt}`

    const ALLOWED_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-3-flash"]
    const model = args.model && ALLOWED_MODELS.includes(args.model) ? args.model : (process.env.GEMINI_MODEL || "gemini-2.5-flash")

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: {
            temperature: 0.7,
          },
        }),
      }
    )

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Gemini API error (${response.status}): ${errText}`)
    }

    const data = await response.json()

    const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!textContent) {
      throw new Error("No response from Gemini. Please try again.")
    }

    // Strip markdown code fences if present
    const cleaned = textContent.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()

    try {
      const parsed = JSON.parse(cleaned)
      return {
        subject: parsed.subject || "Untitled Campaign",
        body_html: parsed.body_html || "<p>No content generated</p>",
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      }
    } catch {
      throw new Error("Failed to parse AI response. Please try again with a different prompt.")
    }
  },
})
