// Simple HTML email templates for EmailJS
export const generateMarketingEmailHtml = (templateData) => {
  const {
    customerName = 'Valued Customer',
    subject = 'Special Offer Just for You!',
    mainContent = 'We have an amazing offer just for you.',
    buttonText = 'Book Now',
    buttonUrl = '#',
    branchName = 'TPX Barber',
    branchAddress = '123 Main St, City',
    branchPhone = '+1234567890',
    footerText = 'Thank you for choosing us!',
    offerImage = null
  } = templateData || {}

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #1a1a1a; border-radius: 12px; border: 1px solid #333; margin-bottom: 64px;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #ff8c42 0%, #ff7a2b 100%); padding: 32px 20px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: #ffffff; font-size: 32px; font-weight: bold; margin: 0; line-height: 1.2;">${branchName}</h1>
            <p style="color: #ffffff; font-size: 16px; margin: 8px 0 0; opacity: 0.9;">Premium Barbershop Experience</p>
          </div>

          <!-- Main Content -->
          <div style="padding: 32px 20px;">
            <h2 style="color: #ffffff; font-size: 24px; font-weight: bold; margin: 0 0 20px; line-height: 1.3;">${subject}</h2>

            ${offerImage ? `<img src="${offerImage}" alt="Special Offer" style="margin: 0 auto 24px; border-radius: 8px; max-width: 100%; height: auto; display: block;">` : ''}

            <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">Hello ${customerName},</p>
            <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">${mainContent}</p>

            <!-- Button -->
            <div style="text-align: center; margin: 32px 0;">
              <a href="${buttonUrl}" style="background-color: #ff8c42; border-radius: 8px; color: #ffffff; font-size: 16px; font-weight: bold; text-decoration: none; text-align: center; display: inline-block; padding: 16px 32px; margin: 0 8px; border: none; cursor: pointer;">
                ${buttonText}
              </a>
            </div>
          </div>

          <!-- Services Section -->
          <div style="padding: 0 20px 32px; background-color: #2a2a2a; margin: 0 20px; border-radius: 8px;">
            <h3 style="color: #ff8c42; font-size: 20px; font-weight: bold; margin: 0 0 16px; padding-top: 20px;">Our Services</h3>
            <div style="display: flex; text-align: center;">
              <div style="flex: 1; padding: 16px 8px;">
                <p style="color: #ff8c42; font-size: 18px; font-weight: bold; margin: 0 0 8px;">✂️ Hair Cut</p>
                <p style="color: #cccccc; font-size: 14px; margin: 0;">Professional styling</p>
              </div>
              <div style="flex: 1; padding: 16px 8px;">
                <p style="color: #ff8c42; font-size: 18px; font-weight: bold; margin: 0 0 8px;">🧔 Beard Trim</p>
                <p style="color: #cccccc; font-size: 14px; margin: 0;">Perfect grooming</p>
              </div>
              <div style="flex: 1; padding: 16px 8px;">
                <p style="color: #ff8c42; font-size: 18px; font-weight: bold; margin: 0 0 8px;">💆 Head Massage</p>
                <p style="color: #cccccc; font-size: 14px; margin: 0;">Relaxing treatment</p>
              </div>
            </div>
          </div>

          <hr style="border-color: #444444; margin: 20px 0;">

          <!-- Footer -->
          <div style="padding: 0 20px 32px; text-align: center;">
            <p style="color: #ff8c42; font-size: 16px; font-weight: bold; margin: 0 0 16px;">${footerText}</p>
            <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
              📍 ${branchAddress}<br>
              📞 ${branchPhone}
            </p>
            <p style="color: #666666; font-size: 12px; line-height: 1.5; margin: 0;">
              You received this email because you're a valued customer.
              <br>If you don't want to receive these emails, you can <a href="#" style="color: #ff8c42; text-decoration: underline;">unsubscribe</a>.
            </p>
          </div>
        </div>
      </body>
    </html>
  `
}

export const generatePromotionalEmailHtml = (templateData) => {
  const {
    customerName = 'Valued Customer',
    discountPercentage = '20',
    promoCode = 'SAVE20',
    validUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    branchName = 'TPX Barber',
    bookingUrl = '#'
  } = templateData || {}

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>🎉 SPECIAL OFFER</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #1a1a1a; border-radius: 12px; border: 1px solid #333; margin-bottom: 64px;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #ff8c42 0%, #ff7a2b 100%); padding: 32px 20px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: #ffffff; font-size: 32px; font-weight: bold; margin: 0; line-height: 1.2;">${branchName}</h1>
          </div>

          <!-- Promo Section -->
          <div style="padding: 40px 20px; text-align: center; background: linear-gradient(135deg, #ff8c42 0%, #ff7a2b 100%);">
            <h2 style="color: #ffffff; font-size: 28px; font-weight: bold; margin: 0 0 16px; text-transform: uppercase; letter-spacing: 2px;">🎉 SPECIAL OFFER</h2>
            <h1 style="color: #ffffff; font-size: 48px; font-weight: bold; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">${discountPercentage}% OFF</h1>
            <p style="color: #ffffff; font-size: 18px; margin: 8px 0 32px; opacity: 0.9;">Your next appointment</p>

            <!-- Promo Code Box -->
            <div style="background-color: rgba(255,255,255,0.1); padding: 16px; border-radius: 8px; margin: 24px auto; max-width: 200px; border: 2px dashed #ffffff;">
              <p style="color: #ffffff; font-size: 14px; margin: 0 0 8px; opacity: 0.8;">Use code:</p>
              <p style="color: #ffffff; font-size: 24px; font-weight: bold; margin: 0; letter-spacing: 2px;">${promoCode}</p>
            </div>

            <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin: 24px 0 16px;">Hello ${customerName},</p>
            <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
              Take advantage of this exclusive offer and save ${discountPercentage}% on your next visit!
            </p>

            <!-- Button -->
            <div style="margin: 32px 0;">
              <a href="${bookingUrl}" style="background-color: #ffffff; border-radius: 8px; color: #ff8c42; font-size: 16px; font-weight: bold; text-decoration: none; text-align: center; display: inline-block; padding: 16px 32px; border: none; cursor: pointer;">
                Book Now & Save
              </a>
            </div>

            <p style="color: #ffffff; font-size: 14px; margin: 24px 0 0; opacity: 0.8;">Valid until ${validUntil}</p>
          </div>

          <hr style="border-color: #444444; margin: 20px 0;">

          <!-- Footer -->
          <div style="padding: 0 20px 32px; text-align: center;">
            <p style="color: #666666; font-size: 12px; line-height: 1.5; margin: 0;">
              <a href="#" style="color: #ff8c42; text-decoration: underline;">Unsubscribe</a> from promotional emails.
            </p>
          </div>
        </div>
      </body>
    </html>
  `
}

// Template renderer function
export const renderTemplateHtml = async ({ templateType, subject, templateData, fallbackHtml }) => {
  switch (templateType) {
    case 'marketing':
      return generateMarketingEmailHtml({ ...templateData, subject })
    case 'promotional':
      return generatePromotionalEmailHtml({ ...templateData, subject })
    case 'custom':
      return fallbackHtml || '<p>No content provided</p>'
    default:
      return fallbackHtml || generateMarketingEmailHtml({ ...templateData, subject })
  }
}

// Helper function to build template data from campaign
export const buildTemplateDataFromCampaign = (campaign) => {
  let templateData = {}
  let templateType = campaign.template_type || 'custom'
  let fallbackHtml = campaign.body_html || ''

  // Try to parse JSON template data
  try {
    if (campaign.body_html && campaign.body_html.startsWith('{')) {
      const parsed = JSON.parse(campaign.body_html)
      if (parsed.template_type) {
        templateType = parsed.template_type
        templateData = parsed.templateData || {}
      }
    }
  } catch (e) {
    // If parsing fails, use as fallback HTML
    fallbackHtml = campaign.body_html
  }

  return {
    templateType,
    templateData,
    fallbackHtml
  }
}