import emailjs from '@emailjs/browser'

// EmailJS configuration
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

// Initialize EmailJS
if (EMAILJS_PUBLIC_KEY && EMAILJS_PUBLIC_KEY !== 'your_public_key') {
  emailjs.init(EMAILJS_PUBLIC_KEY)
}

/**
 * Check if EmailJS is properly configured
 */
export const isEmailServiceConfigured = () => {
  return !!(EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY)
}

/**
 * Send email using EmailJS
 * @param {Object} emailData - Email configuration
 * @param {string} emailData.to - Recipient email
 * @param {string} emailData.to_name - Recipient name
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.html_content - HTML content
 * @param {string} emailData.text_content - Plain text content
 */
export const sendEmailViaEmailJS = async (emailData) => {
  try {
    console.log('📧 Sending email via EmailJS:', {
      to: emailData.to,
      subject: emailData.subject,
      hasHtml: !!emailData.html_content
    })

    // Check if EmailJS is properly configured
    if (!isEmailServiceConfigured()) {
      throw new Error('EmailJS not configured. Please set VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, and VITE_EMAILJS_PUBLIC_KEY.')
    }

    // Prepare template parameters for EmailJS
    const templateParams = {
      to_email: emailData.to,
      to_name: emailData.to_name || emailData.to,
      subject: emailData.subject,
      html_content: emailData.html_content,
      text_content: emailData.text_content || emailData.html_content?.replace(/<[^>]*>/g, '') || '',
      company_name: 'TPX Barber',
      current_year: new Date().getFullYear()
    }

    console.log('📤 EmailJS template params:', {
      ...templateParams,
      html_content: templateParams.html_content ? 'HTML_CONTENT_PROVIDED' : 'NO_HTML'
    })

    // Send email using EmailJS
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams
    )

    console.log('✅ Email sent successfully via EmailJS:', response)
    return { success: true, data: response }

  } catch (error) {
    console.error('❌ EmailJS sending failed:', error)
    return {
      success: false,
      error: error.message || 'Failed to send email',
      details: error
    }
  }
}

/**
 * Send test email
 * @param {string} testEmail - Email to send test to
 */
export const sendTestEmail = async (testEmail) => {
  return sendEmailViaEmailJS({
    to: testEmail,
    to_name: 'Test User',
    subject: '🧪 TPX Barber - Test Email',
    html_content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #ff8c42 0%, #ff7a2b 100%); padding: 30px; text-align: center; border-radius: 10px;">
          <h1 style="color: white; margin: 0;">🧪 Test Email</h1>
          <p style="color: white; margin: 10px 0 0;">Your EmailJS integration is working!</p>
        </div>
        <div style="padding: 30px 20px; background: #1a1a1a; border-radius: 0 0 10px 10px;">
          <p style="color: #e5e5e5; margin: 0 0 20px;">Hello!</p>
          <p style="color: #e5e5e5; margin: 0 0 20px;">
            This test email confirms your TPX Barber email system is properly configured with EmailJS.
          </p>
          <p style="color: #e5e5e5; margin: 0;">
            If you received this email, everything is working correctly! 🎉
          </p>
        </div>
      </div>
    `,
    text_content: 'Test email from TPX Barber. Your EmailJS integration is working!'
  })
}

/**
 * Send marketing campaign emails
 * @param {Object} campaignData - Campaign configuration
 * @param {Array} recipients - Array of recipient objects
 * @param {Function} onProgress - Progress callback
 */
export const sendCampaignEmails = async ({ campaignData, recipients, onProgress }) => {
  if (!isEmailServiceConfigured()) {
    throw new Error('EmailJS not configured.')
  }

  const results = {
    total: recipients.length,
    sent: 0,
    failed: 0,
    errors: []
  }

  console.log(`📨 Starting EmailJS campaign: ${campaignData.name} to ${recipients.length} recipients`)

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i]

    try {
      const emailResult = await sendEmailViaEmailJS({
        to: recipient.email,
        to_name: recipient.username || recipient.email,
        subject: campaignData.subject,
        html_content: campaignData.html_content,
        text_content: campaignData.text_content
      })

      if (emailResult.success) {
        results.sent++
        console.log(`✅ Email sent to: ${recipient.email}`)
      } else {
        results.failed++
        results.errors.push({
          email: recipient.email,
          error: emailResult.error
        })
        console.error(`❌ Failed to send to: ${recipient.email}`, emailResult.error)
      }

    } catch (error) {
      results.failed++
      results.errors.push({
        email: recipient.email,
        error: error.message
      })
      console.error(`❌ Error sending to: ${recipient.email}`, error)
    }

    // Call progress callback if provided
    if (onProgress) {
      onProgress({
        current: i + 1,
        total: recipients.length,
        sent: results.sent,
        failed: results.failed,
        percentage: Math.round(((i + 1) / recipients.length) * 100)
      })
    }

    // Add small delay to avoid rate limiting
    if (i < recipients.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  console.log(`📊 EmailJS Campaign completed. Sent: ${results.sent}, Failed: ${results.failed}`)
  return results
}

export default {
  sendEmailViaEmailJS,
  sendTestEmail,
  sendCampaignEmails,
  isEmailServiceConfigured
}