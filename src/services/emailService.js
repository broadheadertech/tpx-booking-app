import emailjs from '@emailjs/browser'

// EmailJS configuration
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'your_service_id'
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'your_template_id'
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'your_public_key'

// Initialize EmailJS
if (EMAILJS_PUBLIC_KEY && EMAILJS_PUBLIC_KEY !== 'your_public_key') {
  emailjs.init(EMAILJS_PUBLIC_KEY)
}

/**
 * Send welcome email to walk-in customer
 * @param {Object} customerData - Customer information
 * @param {string} customerData.email - Customer email address
 * @param {string} customerData.username - Customer username
 * @param {string} customerData.password - Generated password
 * @param {string} customerData.loginUrl - Login URL for the application
 * @returns {Promise} EmailJS response
 */
export const sendWelcomeEmail = async (customerData) => {
  try {
    // Debug: Log configuration status
    console.log('EmailJS Configuration:', {
      serviceId: EMAILJS_SERVICE_ID,
      templateId: EMAILJS_TEMPLATE_ID,
      publicKey: EMAILJS_PUBLIC_KEY ? '***configured***' : 'not configured'
    })

    // Validate required data
    if (!customerData.email || !customerData.username || !customerData.password) {
      throw new Error('Missing required customer data for email')
    }

    // Check if EmailJS is properly configured
    if (!EMAILJS_SERVICE_ID || EMAILJS_SERVICE_ID === 'your_service_id') {
      console.warn('EmailJS service ID not configured')
      return { success: false, error: 'Email service not configured' }
    }

    if (!EMAILJS_TEMPLATE_ID || EMAILJS_TEMPLATE_ID === 'your_template_id') {
      console.warn('EmailJS template ID not configured')
      return { success: false, error: 'Email template not configured' }
    }

    if (!EMAILJS_PUBLIC_KEY || EMAILJS_PUBLIC_KEY === 'your_public_key') {
      console.warn('EmailJS public key not configured')
      return { success: false, error: 'Email public key not configured' }
    }

    // Prepare email template parameters
    const templateParams = {
      to_email: customerData.email,
      to_name: customerData.username,
      user_email: customerData.email,
      user_password: customerData.password,
      username: customerData.username,
      login_url: customerData.loginUrl || `${window.location.origin}/auth/login`,
      company_name: 'TPX Barber',
      support_email: 'support@tpxbarber.com',
      current_year: new Date().getFullYear()
    }

    console.log('Sending welcome email to:', customerData.email)
    console.log('Template parameters:', { ...templateParams, user_password: '***hidden***' })
    
    // Send email using EmailJS
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams
    )

    console.log('Welcome email sent successfully:', response)
    return { success: true, response }

  } catch (error) {
    console.error('Failed to send welcome email:', error)
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      text: error.text
    })
    return { success: false, error: error.message }
  }
}

/**
 * Send voucher email to customer
 * @param {Object} voucherData - Voucher information
 * @param {string} voucherData.email - Customer email address
 * @param {string} voucherData.name - Customer name
 * @param {string} voucherData.voucherCode - Voucher code
 * @param {string} voucherData.voucherValue - Voucher value
 * @param {number} voucherData.pointsRequired - Points required
 * @param {string} voucherData.expiresAt - Expiry date
 * @param {string} voucherData.qrCodeImage - QR code image data URL
 * @returns {Promise} EmailJS response
 */
export const sendVoucherEmail = async (voucherData) => {
  try {
    // Validate required data
    if (!voucherData.email || !voucherData.name || !voucherData.voucherCode) {
      throw new Error('Missing required voucher data for email')
    }

    // Check if EmailJS is properly configured
    if (!EMAILJS_SERVICE_ID || EMAILJS_SERVICE_ID === 'your_service_id') {
      console.warn('EmailJS service ID not configured')
      return { success: false, error: 'Email service not configured' }
    }

    if (!EMAILJS_PUBLIC_KEY || EMAILJS_PUBLIC_KEY === 'your_public_key') {
      console.warn('EmailJS public key not configured')
      return { success: false, error: 'Email public key not configured' }
    }

    // Use specific template ID for voucher emails
    const VOUCHER_TEMPLATE_ID = 'template_lo371v3'

    // Prepare email template parameters
    const templateParams = {
      to_email: voucherData.email,
      to_name: voucherData.name,
      voucher_code: voucherData.voucherCode,
      voucher_value: voucherData.voucherValue,
      points_required: voucherData.pointsRequired || 0,
      expires_at: voucherData.expiresAt,
      qr_code_image: voucherData.qrCodeImage,
      business_name: 'TPX Barber'
    }

    console.log('Sending voucher email to:', voucherData.email)
    console.log('Template parameters:', { ...templateParams, qr_code_image: 'QR_CODE_DATA_URL' })
    
    // Send email using EmailJS with voucher-specific template
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      VOUCHER_TEMPLATE_ID,
      templateParams
    )

    console.log('Voucher email sent successfully:', response)
    return { success: true, response }

  } catch (error) {
    console.error('Failed to send voucher email:', error)
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      text: error.text
    })
    return { success: false, error: error.message }
  }
}

/**
 * Send booking confirmation email
 * @param {Object} bookingData - Booking information
 * @returns {Promise} EmailJS response
 */
export const sendBookingConfirmationEmail = async (bookingData) => {
  try {
    // This can be implemented later for booking confirmations
    console.log('Booking confirmation email feature coming soon')
    return { success: false, error: 'Feature not implemented yet' }
  } catch (error) {
    console.error('Failed to send booking confirmation email:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send receipt email
 * @param {Object} receiptData - Receipt information
 * @returns {Promise} EmailJS response
 */
export const sendReceiptEmail = async (receiptData) => {
  try {
    // This can be implemented later for receipt emails
    console.log('Receipt email feature coming soon')
    return { success: false, error: 'Feature not implemented yet' }
  } catch (error) {
    console.error('Failed to send receipt email:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Validate email configuration
 * @returns {boolean} True if EmailJS is properly configured
 */
export const isEmailServiceConfigured = () => {
  return (
    EMAILJS_SERVICE_ID && EMAILJS_SERVICE_ID !== 'your_service_id' &&
    EMAILJS_TEMPLATE_ID && EMAILJS_TEMPLATE_ID !== 'your_template_id' &&
    EMAILJS_PUBLIC_KEY && EMAILJS_PUBLIC_KEY !== 'your_public_key'
  )
}

/**
 * Get email service status
 * @returns {Object} Status information
 */
export const getEmailServiceStatus = () => {
  return {
    configured: isEmailServiceConfigured(),
    serviceId: EMAILJS_SERVICE_ID !== 'your_service_id' ? '✓ Configured' : '✗ Not configured',
    templateId: EMAILJS_TEMPLATE_ID !== 'your_template_id' ? '✓ Configured' : '✗ Not configured',
    publicKey: EMAILJS_PUBLIC_KEY !== 'your_public_key' ? '✓ Configured' : '✗ Not configured'
  }
}

export default {
  sendWelcomeEmail,
  sendVoucherEmail,
  sendBookingConfirmationEmail,
  sendReceiptEmail,
  isEmailServiceConfigured,
  getEmailServiceStatus
}