import { Resend } from 'resend';

const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY;
const resend = new Resend(RESEND_API_KEY);

class EmailService {
  constructor() {
    this.fromEmail = 'no-reply@tipunoxph.com';
    this.fromName = 'Barbershop';
  }

  async sendPasswordResetEmail(email, resetToken) {
    const resetUrl = `${process.env.NODE_ENV === 'production' 
      ? 'https://your-domain.com' 
      : 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;

    const emailData = {
      from: `${this.fromName} <${this.fromEmail}>`,
      to: email,
      subject: 'Reset your Barbershop password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset - Barbershop</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background-color: #0A0A0A;
              color: #ffffff;
              margin: 0;
              padding: 0;
              line-height: 1.6;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 40px 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
            }
            .logo {
              width: 200px;
              height: 120px;
              margin: 0 auto 20px;
            }
            .content {
              background: linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%);
              border-radius: 16px;
              padding: 40px;
              border: 1px solid #333;
              box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            }
            .title {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 20px;
              color: var(--color-primary);
              text-align: center;
            }
            .text {
              color: #ccc;
              margin-bottom: 30px;
              text-align: center;
            }
            .reset-button {
              display: inline-block;
              background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%);
              color: white;
              text-decoration: none;
              padding: 16px 32px;
              border-radius: 8px;
              font-weight: bold;
              text-align: center;
              margin: 20px 0;
              transition: transform 0.2s, box-shadow 0.2s;
            }
            .reset-button:hover {
              transform: translateY(-2px);
              box-shadow: 0 5px 15px rgba(255, 140, 66, 0.4);
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 14px;
            }
            .security-info {
              background: rgba(255, 140, 66, 0.1);
              border: 1px solid rgba(255, 140, 66, 0.3);
              border-radius: 8px;
              padding: 20px;
              margin-top: 20px;
            }
            .security-info h3 {
              color: var(--color-primary);
              margin-top: 0;
              margin-bottom: 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="https://your-domain.com/img/tipuno_x_logo_white.avif" alt="Barbershop" class="logo" />
            </div>
            
            <div class="content">
              <h1 class="title">Reset Your Password</h1>
              <p class="text">
                Hi there! We received a request to reset your password for your Barbershop account.
                Click the button below to set a new password.
              </p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="reset-button">Reset Password</a>
              </div>
              
              <div class="security-info">
                <h3>🔐 Security Information</h3>
                <p style="margin: 0; font-size: 14px; color: #bbb;">
                  This link will expire in 15 minutes for your security. If you didn't request a password reset, 
                  you can safely ignore this email.
                </p>
              </div>
              
              <p class="text" style="margin-top: 30px; font-size: 14px;">
                If the button above doesn't work, copy and paste this link into your browser:<br>
                <span style="word-break: break-all; color: var(--color-primary);">${resetUrl}</span>
              </p>
            </div>
            
            <div class="footer">
              <p>© 2024 Barbershop. All rights reserved.</p>
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      // In development, mock the email sending
      if (import.meta.env.DEV) {
        console.log('📧 [DEV MODE] Email would be sent:');
        console.log('  To:', email);
        console.log('  Subject:', emailData.subject);
        console.log('  Reset URL:', resetUrl);
        return { success: true, messageId: 'dev-mock-' + Date.now(), isDev: true };
      }

      // Production: Use Resend SDK
      const result = await resend.emails.send(emailData);

      if (result.error) {
        console.error('Email service error:', result.error);
        throw new Error(`Email service error: ${result.error.message || 'Unknown error'}`);
      }

      console.log('Password reset email sent successfully:', result);
      return result;
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw error;
    }
  }

  // Send voucher email function
  async sendVoucherEmail(voucherData) {
    const emailData = {
      from: `${this.fromName} <${this.fromEmail}>`,
      to: voucherData.email,
      subject: `Your Voucher ${voucherData.voucherCode} from Barbershop`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Voucher - Barbershop</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background-color: #0A0A0A;
              color: #ffffff;
              margin: 0;
              padding: 0;
              line-height: 1.6;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 40px 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
            }
            .content {
              background: linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%);
              border-radius: 16px;
              padding: 40px;
              border: 1px solid #333;
              box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            }
            .title {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 20px;
              color: var(--color-primary);
              text-align: center;
            }
            .voucher-code {
              font-size: 32px;
              font-weight: bold;
              text-align: center;
              color: var(--color-primary);
              margin: 20px 0;
              font-family: monospace;
            }
            .voucher-details {
              background: rgba(255, 140, 66, 0.1);
              border: 1px solid rgba(255, 140, 66, 0.3);
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .qr-code {
              text-align: center;
              margin: 20px 0;
            }
            .qr-code img {
              max-width: 200px;
              border-radius: 8px;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="color: var(--color-primary); font-size: 32px; margin-bottom: 10px;">Barbershop</h1>
            </div>
            
            <div class="content">
              <h1 class="title">🎉 You've Received a Voucher!</h1>
              <p style="text-align: center; color: #ccc; margin-bottom: 30px;">
                Hi ${voucherData.name}, you've received a special voucher from Barbershop!
              </p>
              
              <div class="voucher-code">${voucherData.voucherCode}</div>
              
              <div class="voucher-details">
                <h3 style="color: var(--color-primary); margin-top: 0; margin-bottom: 15px;">Voucher Details</h3>
                <p style="margin: 5px 0;"><strong>Value:</strong> ${voucherData.voucherValue}</p>
                ${voucherData.pointsRequired > 0 ? `<p style="margin: 5px 0;"><strong>Points Required:</strong> ${voucherData.pointsRequired}</p>` : ''}
                <p style="margin: 5px 0;"><strong>Expires:</strong> ${voucherData.expiresAt}</p>
              </div>
              
              ${voucherData.qrCodeImage ? `
              <div class="qr-code">
                <p style="color: #ccc; margin-bottom: 10px;">Scan this QR code at the barbershop</p>
                <img src="${voucherData.qrCodeImage}" alt="Voucher QR Code" />
              </div>
              ` : ''}
              
              <p style="text-align: center; color: #ccc; margin-top: 30px; font-size: 14px;">
                Show this email or QR code at any Barbershop location to redeem your voucher.
              </p>
            </div>
            
            <div class="footer">
              <p>© 2024 Barbershop. All rights reserved.</p>
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      const result = await resend.emails.send(emailData);

      if (result.error) {
        console.error('Email service error:', result.error);
        throw new Error(`Email service error: ${result.error.message || 'Unknown error'}`);
      }

      console.log('Voucher email sent successfully:', result);
      return { success: true, messageId: result.data?.id, response: result };
    } catch (error) {
      console.error('Failed to send voucher email:', error);
      throw error;
    }
  }

  // Send welcome email for new customers
  async sendWelcomeEmail(customerData) {
    const emailData = {
      from: `${this.fromName} <${this.fromEmail}>`,
      to: customerData.email,
      subject: 'Welcome to Barbershop!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome - Barbershop</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background-color: #0A0A0A;
              color: #ffffff;
              margin: 0;
              padding: 0;
              line-height: 1.6;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 40px 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
            }
            .content {
              background: linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%);
              border-radius: 16px;
              padding: 40px;
              border: 1px solid #333;
              box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            }
            .title {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 20px;
              color: var(--color-primary);
              text-align: center;
            }
            .credentials {
              background: rgba(255, 140, 66, 0.1);
              border: 1px solid rgba(255, 140, 66, 0.3);
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .credentials p {
              margin: 5px 0;
              font-family: monospace;
            }
            .login-button {
              display: inline-block;
              background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%);
              color: white;
              text-decoration: none;
              padding: 12px 24px;
              border-radius: 8px;
              font-weight: bold;
              text-align: center;
              margin: 20px 0;
              transition: transform 0.2s, box-shadow 0.2s;
            }
            .login-button:hover {
              transform: translateY(-2px);
              box-shadow: 0 5px 15px rgba(255, 140, 66, 0.4);
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="color: var(--color-primary); font-size: 32px; margin-bottom: 10px;">Barbershop</h1>
            </div>
            
            <div class="content">
              <h1 class="title">🎉 Welcome to Barbershop!</h1>
              <p style="text-align: center; color: #ccc; margin-bottom: 30px;">
                Hi ${customerData.username}, thank you for visiting Barbershop! 
                We've created an account for you to make future bookings even easier.
              </p>
              
              <div class="credentials">
                <h3 style="color: var(--color-primary); margin-top: 0; margin-bottom: 15px;">Your Login Details</h3>
                <p style="margin: 5px 0;"><strong>Email:</strong> ${customerData.email}</p>
                <p style="margin: 5px 0;"><strong>Password:</strong> ${customerData.password}</p>
              </div>
              
              <div style="text-align: center;">
                <a href="${customerData.loginUrl}" class="login-button">Sign In to Your Account</a>
              </div>
              
              <p style="text-align: center; color: #ccc; margin-top: 30px; font-size: 14px;">
                Save these details or use the button above to access your account. You can 
                change your password after signing in.
              </p>
            </div>
            
            <div class="footer">
              <p>© 2024 Barbershop. All rights reserved.</p>
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      const result = await resend.emails.send(emailData);

      if (result.error) {
        console.error('Email service error:', result.error);
        throw new Error(`Email service error: ${result.error.message || 'Unknown error'}`);
      }

      console.log('Welcome email sent successfully:', result);
      return { success: true, messageId: result.data?.id };
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      throw error;
    }
  }

  // Send custom booking confirmation email (when form is submitted)
  async sendCustomBookingConfirmation(bookingData) {
    const trackUrl = `${window.location.origin}/track/${bookingData.bookingCode}`;

    const emailData = {
      from: `${this.fromName} <${this.fromEmail}>`,
      to: bookingData.customerEmail,
      subject: `Booking Request Received - ${bookingData.bookingCode}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking Request Received</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background-color: #0A0A0A;
              color: #ffffff;
              margin: 0;
              padding: 0;
              line-height: 1.6;
            }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .content {
              background: linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%);
              border-radius: 16px;
              padding: 40px;
              border: 1px solid #333;
            }
            .title { font-size: 24px; font-weight: bold; margin-bottom: 20px; color: #D4A574; text-align: center; }
            .booking-code {
              font-size: 28px; font-weight: bold; text-align: center;
              color: #D4A574; margin: 20px 0; font-family: monospace;
              background: rgba(212, 165, 116, 0.1);
              padding: 15px; border-radius: 8px;
            }
            .details { background: rgba(255,255,255,0.05); border-radius: 8px; padding: 20px; margin: 20px 0; }
            .details p { margin: 8px 0; color: #ccc; }
            .track-button {
              display: inline-block; background: linear-gradient(135deg, #D4A574 0%, #B8956E 100%);
              color: #000; text-decoration: none; padding: 14px 28px; border-radius: 8px;
              font-weight: bold; margin: 20px 0;
            }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="content">
              <h1 class="title">✨ Booking Request Received!</h1>
              <p style="text-align: center; color: #ccc;">
                Hi ${bookingData.customerName}, thank you for your booking request!
              </p>

              <div class="booking-code">
                Reference: ${bookingData.bookingCode}
              </div>

              <div class="details">
                <h3 style="color: #D4A574; margin-top: 0;">Booking Details</h3>
                <p><strong>Barber:</strong> ${bookingData.barberName}</p>
                <p><strong>Form:</strong> ${bookingData.formTitle}</p>
                <p><strong>Branch:</strong> ${bookingData.branchName}</p>
              </div>

              <p style="text-align: center; color: #ccc;">
                Our team will review your request and contact you shortly to confirm the details.
              </p>

              <div style="text-align: center;">
                <a href="${trackUrl}" class="track-button">Track Your Booking</a>
              </div>

              <p style="text-align: center; color: #888; font-size: 13px; margin-top: 30px;">
                You can use your reference code to track the status of your booking anytime.
              </p>
            </div>

            <div class="footer">
              <p>Thank you for choosing us!</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      if (import.meta.env.DEV) {
        console.log('📧 [DEV MODE] Custom Booking Confirmation Email:');
        console.log('  To:', bookingData.customerEmail);
        console.log('  Booking Code:', bookingData.bookingCode);
        return { success: true, messageId: 'dev-mock-' + Date.now(), isDev: true };
      }

      const result = await resend.emails.send(emailData);
      if (result.error) throw new Error(result.error.message);
      return { success: true, messageId: result.data?.id };
    } catch (error) {
      console.error('Failed to send custom booking confirmation:', error);
      throw error;
    }
  }

  // Send barber notification email when a new booking is made
  async sendBarberBookingNotification(bookingData) {
    const {
      barberEmail,
      barberName,
      customerName,
      customerPhone,
      customerEmail,
      serviceName,
      servicePrice,
      bookingDate,
      bookingTime,
      branchName,
      bookingCode,
      bookingType // 'regular', 'guest', or 'pos'
    } = bookingData;

    // Format time for display (convert 24h to 12h format)
    const formatDisplayTime = (time) => {
      if (!time) return 'TBD';
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes || '00'} ${ampm}`;
    };

    // Format date for display
    const formatDisplayDate = (date) => {
      if (!date) return 'TBD';
      try {
        const dateObj = new Date(date + 'T00:00:00');
        return dateObj.toLocaleDateString('en-PH', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch {
        return date;
      }
    };

    const bookingTypeLabel = {
      'regular': '🎯 Online Booking',
      'guest': '👤 Guest Booking',
      'pos': '💳 Walk-in (POS)',
      'custom': '📋 Custom Booking Request'
    };

    const emailData = {
      from: `${this.fromName} <${this.fromEmail}>`,
      to: barberEmail,
      subject: `🔔 New Booking Alert - ${customerName} on ${formatDisplayDate(bookingDate)}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Booking Notification</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background-color: #0A0A0A;
              color: #ffffff;
              margin: 0;
              padding: 0;
              line-height: 1.6;
            }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .content {
              background: linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%);
              border-radius: 16px;
              padding: 40px;
              border: 1px solid #333;
              box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            }
            .alert-badge {
              display: inline-block;
              background: linear-gradient(135deg, #D4A574 0%, #B8956E 100%);
              color: #000;
              padding: 8px 20px;
              border-radius: 20px;
              font-weight: bold;
              font-size: 14px;
              margin-bottom: 20px;
            }
            .title {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 10px;
              color: #fff;
            }
            .subtitle {
              color: #888;
              margin-bottom: 30px;
            }
            .booking-card {
              background: rgba(212, 165, 116, 0.1);
              border: 1px solid rgba(212, 165, 116, 0.3);
              border-radius: 12px;
              padding: 25px;
              margin: 20px 0;
            }
            .booking-card h3 {
              color: #D4A574;
              margin: 0 0 15px 0;
              font-size: 18px;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid rgba(255,255,255,0.1);
            }
            .detail-row:last-child {
              border-bottom: none;
            }
            .detail-label {
              color: #888;
              font-size: 14px;
            }
            .detail-value {
              color: #fff;
              font-weight: 600;
              font-size: 14px;
              text-align: right;
            }
            .customer-info {
              background: rgba(59, 130, 246, 0.1);
              border: 1px solid rgba(59, 130, 246, 0.3);
              border-radius: 12px;
              padding: 20px;
              margin: 20px 0;
            }
            .customer-info h3 {
              color: #3B82F6;
              margin: 0 0 15px 0;
              font-size: 16px;
            }
            .contact-link {
              color: #D4A574;
              text-decoration: none;
            }
            .booking-code {
              font-size: 24px;
              font-weight: bold;
              text-align: center;
              color: #D4A574;
              font-family: monospace;
              background: rgba(0,0,0,0.3);
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
              letter-spacing: 2px;
            }
            .type-badge {
              display: inline-block;
              padding: 6px 12px;
              border-radius: 6px;
              font-size: 12px;
              font-weight: bold;
              background: rgba(212, 165, 116, 0.2);
              color: #D4A574;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 14px;
            }
            .action-note {
              background: rgba(16, 185, 129, 0.1);
              border: 1px solid rgba(16, 185, 129, 0.3);
              border-radius: 8px;
              padding: 15px;
              margin-top: 20px;
              text-align: center;
            }
            .action-note p {
              color: #10B981;
              margin: 0;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="color: #D4A574; font-size: 28px; margin-bottom: 5px;">Barbershop</h1>
              <p style="color: #666; margin: 0;">Booking Management System</p>
            </div>
            
            <div class="content">
              <div style="text-align: center;">
                <span class="alert-badge">🔔 New Booking Alert</span>
              </div>
              
              <h1 class="title" style="text-align: center;">Hi ${barberName}!</h1>
              <p class="subtitle" style="text-align: center;">
                You have a new booking. Here are the details:
              </p>

              ${bookingCode ? `<div class="booking-code">Booking Code: ${bookingCode}</div>` : ''}

              <div class="booking-card">
                <h3>📅 Appointment Details</h3>
                <div class="detail-row">
                  <span class="detail-label">Date</span>
                  <span class="detail-value">${formatDisplayDate(bookingDate)}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Time</span>
                  <span class="detail-value">${formatDisplayTime(bookingTime)}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Service</span>
                  <span class="detail-value">${serviceName || 'Not specified'}</span>
                </div>
                ${servicePrice ? `
                <div class="detail-row">
                  <span class="detail-label">Price</span>
                  <span class="detail-value">₱${parseFloat(servicePrice).toLocaleString()}</span>
                </div>
                ` : ''}
                <div class="detail-row">
                  <span class="detail-label">Branch</span>
                  <span class="detail-value">${branchName || 'Main Branch'}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Booking Type</span>
                  <span class="detail-value"><span class="type-badge">${bookingTypeLabel[bookingType] || bookingType}</span></span>
                </div>
              </div>

              <div class="customer-info">
                <h3>👤 Customer Information</h3>
                <div class="detail-row">
                  <span class="detail-label">Name</span>
                  <span class="detail-value">${customerName}</span>
                </div>
                ${customerPhone ? `
                <div class="detail-row">
                  <span class="detail-label">Phone</span>
                  <span class="detail-value"><a href="tel:${customerPhone}" class="contact-link">${customerPhone}</a></span>
                </div>
                ` : ''}
                ${customerEmail ? `
                <div class="detail-row">
                  <span class="detail-label">Email</span>
                  <span class="detail-value"><a href="mailto:${customerEmail}" class="contact-link">${customerEmail}</a></span>
                </div>
                ` : ''}
              </div>

              <div class="action-note">
                <p>✅ Please prepare for this appointment and ensure you're available at the scheduled time.</p>
              </div>
            </div>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} Barbershop. All rights reserved.</p>
              <p>This is an automated notification. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      // Check if Resend API is configured
      if (!RESEND_API_KEY || RESEND_API_KEY === 'your_resend_api_key_here') {
        console.warn('⚠️ Barber notification skipped: Resend API key not configured');
        console.warn('Please set VITE_RESEND_API_KEY in your .env file');
        return { success: false, error: 'Email service not configured' };
      }

      // Validate barber email before sending
      if (!barberEmail || !barberEmail.includes('@')) {
        console.warn('⚠️ Barber notification skipped: Invalid or missing barber email');
        console.warn('Received barberEmail:', barberEmail);
        console.warn('Make sure the barber has a valid email address in the database');
        return { success: false, error: 'Invalid or missing barber email', receivedEmail: barberEmail };
      }

      console.log('📧 Sending barber booking notification:');
      console.log('  → To:', barberEmail);
      console.log('  → Barber:', barberName);
      console.log('  → Customer:', customerName);
      console.log('  → Date:', bookingDate);
      console.log('  → Time:', bookingTime);
      console.log('  → Service:', serviceName);
      console.log('  → Booking Type:', bookingType);

      const result = await resend.emails.send(emailData);
      
      if (result.error) {
        console.error('❌ Email service error:', result.error);
        throw new Error(`Email service error: ${result.error.message || 'Unknown error'}`);
      }

      console.log('✅ Barber notification email sent successfully!');
      console.log('  → Message ID:', result.data?.id);
      return { success: true, messageId: result.data?.id };
    } catch (error) {
      console.error('❌ Failed to send barber notification email:', error);
      console.error('  → Email To:', barberEmail);
      console.error('  → Barber Name:', barberName);
      console.error('  → Customer Name:', customerName);
      // Don't throw - we don't want to fail the booking if email fails
      return { success: false, error: error.message };
    }
  }

  // Send custom booking status update email
  async sendCustomBookingStatusUpdate(bookingData) {
    const trackUrl = `${window.location.origin}/track/${bookingData.bookingCode}`;

    const statusConfig = {
      contacted: {
        title: "We're Working on Your Request",
        icon: "📞",
        message: "Great news! Our team has reviewed your booking request and will contact you shortly to discuss the details and finalize your appointment.",
        color: "#3B82F6"
      },
      confirmed: {
        title: "Booking Confirmed!",
        icon: "✅",
        message: "Your booking has been confirmed! We look forward to seeing you. Please arrive 5-10 minutes before your scheduled time.",
        color: "#10B981"
      },
      completed: {
        title: "Thank You for Your Visit!",
        icon: "🌟",
        message: "Thank you for choosing us! We hope you enjoyed your experience. We'd love to see you again soon.",
        color: "#8B5CF6"
      },
      cancelled: {
        title: "Booking Cancelled",
        icon: "❌",
        message: "Your booking request has been cancelled. If you have any questions or would like to reschedule, please don't hesitate to contact us.",
        color: "#EF4444"
      }
    };

    const status = statusConfig[bookingData.status] || statusConfig.contacted;

    const emailData = {
      from: `${this.fromName} <${this.fromEmail}>`,
      to: bookingData.customerEmail,
      subject: `${status.icon} ${status.title} - ${bookingData.bookingCode}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${status.title}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background-color: #0A0A0A;
              color: #ffffff;
              margin: 0;
              padding: 0;
              line-height: 1.6;
            }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .content {
              background: linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%);
              border-radius: 16px;
              padding: 40px;
              border: 1px solid #333;
            }
            .status-badge {
              display: inline-block; padding: 8px 16px; border-radius: 20px;
              font-weight: bold; font-size: 14px; margin-bottom: 20px;
              background: ${status.color}22; color: ${status.color}; border: 1px solid ${status.color}44;
            }
            .title { font-size: 24px; font-weight: bold; margin-bottom: 15px; color: #fff; }
            .booking-code {
              font-size: 20px; font-weight: bold; color: #D4A574;
              font-family: monospace; margin: 15px 0;
            }
            .message-box {
              background: rgba(255,255,255,0.05); border-radius: 8px;
              padding: 20px; margin: 20px 0; border-left: 4px solid ${status.color};
            }
            .details { margin: 20px 0; }
            .details p { margin: 8px 0; color: #ccc; }
            .track-button {
              display: inline-block; background: linear-gradient(135deg, #D4A574 0%, #B8956E 100%);
              color: #000; text-decoration: none; padding: 14px 28px; border-radius: 8px;
              font-weight: bold; margin: 20px 0;
            }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="content">
              <div style="text-align: center;">
                <span class="status-badge">${status.icon} ${bookingData.status.charAt(0).toUpperCase() + bookingData.status.slice(1)}</span>
              </div>

              <h1 class="title" style="text-align: center;">${status.title}</h1>

              <p class="booking-code" style="text-align: center;">
                Reference: ${bookingData.bookingCode}
              </p>

              <div class="message-box">
                <p style="margin: 0; color: #ddd;">${status.message}</p>
              </div>

              <div class="details">
                <p><strong>Name:</strong> ${bookingData.customerName}</p>
                <p><strong>Barber:</strong> ${bookingData.barberName}</p>
                <p><strong>Branch:</strong> ${bookingData.branchName}</p>
              </div>

              <div style="text-align: center;">
                <a href="${trackUrl}" class="track-button">View Booking Details</a>
              </div>
            </div>

            <div class="footer">
              <p>Questions? Contact us or visit our location.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      if (import.meta.env.DEV) {
        console.log('📧 [DEV MODE] Custom Booking Status Update Email:');
        console.log('  To:', bookingData.customerEmail);
        console.log('  Status:', bookingData.status);
        console.log('  Booking Code:', bookingData.bookingCode);
        return { success: true, messageId: 'dev-mock-' + Date.now(), isDev: true };
      }

      const result = await resend.emails.send(emailData);
      if (result.error) throw new Error(result.error.message);
      return { success: true, messageId: result.data?.id };
    } catch (error) {
      console.error('Failed to send status update email:', error);
      throw error;
    }
  }
}

export const isEmailServiceConfigured = () => {
  return !!RESEND_API_KEY && RESEND_API_KEY !== 'your_resend_api_key_here';
};

// Export the email service functions
const emailService = new EmailService();
export const sendVoucherEmail = emailService.sendVoucherEmail.bind(emailService);
export const sendWelcomeEmail = emailService.sendWelcomeEmail.bind(emailService);
export const sendCustomBookingConfirmation = emailService.sendCustomBookingConfirmation.bind(emailService);
export const sendCustomBookingStatusUpdate = emailService.sendCustomBookingStatusUpdate.bind(emailService);
export const sendBarberBookingNotification = emailService.sendBarberBookingNotification.bind(emailService);

export default new EmailService();
