import { Resend } from 'resend';

const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY;
const resend = new Resend(RESEND_API_KEY);

class EmailService {
  constructor() {
    this.fromEmail = 'no-reply@tipunox.broadheader.com';
    this.fromName = 'TPX Barbershop';
  }

  async sendPasswordResetEmail(email, resetToken) {
    const resetUrl = `${process.env.NODE_ENV === 'production' 
      ? 'https://your-domain.com' 
      : 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;

    const emailData = {
      from: `${this.fromName} <${this.fromEmail}>`,
      to: email,
      subject: 'Reset your TPX Barbershop password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset - TPX Barbershop</title>
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
              color: #FF8C42;
              text-align: center;
            }
            .text {
              color: #ccc;
              margin-bottom: 30px;
              text-align: center;
            }
            .reset-button {
              display: inline-block;
              background: linear-gradient(135deg, #FF8C42 0%, #FF7A2B 100%);
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
              color: #FF8C42;
              margin-top: 0;
              margin-bottom: 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="https://your-domain.com/img/tipuno_x_logo_white.avif" alt="TPX Barbershop" class="logo" />
            </div>
            
            <div class="content">
              <h1 class="title">Reset Your Password</h1>
              <p class="text">
                Hi there! We received a request to reset your password for your TPX Barbershop account.
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
                <span style="word-break: break-all; color: #FF8C42;">${resetUrl}</span>
              </p>
            </div>
            
            <div class="footer">
              <p>© 2024 TPX Barbershop. All rights reserved.</p>
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
      subject: `Your Voucher ${voucherData.voucherCode} from TPX Barbershop`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Voucher - TPX Barbershop</title>
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
              color: #FF8C42;
              text-align: center;
            }
            .voucher-code {
              font-size: 32px;
              font-weight: bold;
              text-align: center;
              color: #FF8C42;
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
              <h1 style="color: #FF8C42; font-size: 32px; margin-bottom: 10px;">TPX Barbershop</h1>
            </div>
            
            <div class="content">
              <h1 class="title">🎉 You've Received a Voucher!</h1>
              <p style="text-align: center; color: #ccc; margin-bottom: 30px;">
                Hi ${voucherData.name}, you've received a special voucher from TPX Barbershop!
              </p>
              
              <div class="voucher-code">${voucherData.voucherCode}</div>
              
              <div class="voucher-details">
                <h3 style="color: #FF8C42; margin-top: 0; margin-bottom: 15px;">Voucher Details</h3>
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
                Show this email or QR code at any TPX Barbershop location to redeem your voucher.
              </p>
            </div>
            
            <div class="footer">
              <p>© 2024 TPX Barbershop. All rights reserved.</p>
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
      subject: 'Welcome to TPX Barbershop!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome - TPX Barbershop</title>
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
              color: #FF8C42;
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
              background: linear-gradient(135deg, #FF8C42 0%, #FF7A2B 100%);
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
              <h1 style="color: #FF8C42; font-size: 32px; margin-bottom: 10px;">TPX Barbershop</h1>
            </div>
            
            <div class="content">
              <h1 class="title">🎉 Welcome to TPX Barbershop!</h1>
              <p style="text-align: center; color: #ccc; margin-bottom: 30px;">
                Hi ${customerData.username}, thank you for visiting TPX Barbershop! 
                We've created an account for you to make future bookings even easier.
              </p>
              
              <div class="credentials">
                <h3 style="color: #FF8C42; margin-top: 0; margin-bottom: 15px;">Your Login Details</h3>
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
              <p>© 2024 TPX Barbershop. All rights reserved.</p>
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
}

export const isEmailServiceConfigured = () => {
  return !!RESEND_API_KEY && RESEND_API_KEY !== 'your_resend_api_key_here';
};

// Export the email service functions
const emailService = new EmailService();
export const sendVoucherEmail = emailService.sendVoucherEmail.bind(emailService);
export const sendWelcomeEmail = emailService.sendWelcomeEmail.bind(emailService);

export default new EmailService();
