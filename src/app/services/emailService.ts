// Email service using Nodemailer - Updated design
import nodemailer from "nodemailer";
import config from "@app/config";

// Create transporter
const createTransporter = () => {
  // Check if email is configured
  if (
    !config.email.user ||
    !config.email.password ||
    config.email.password === "your-16-char-app-password"
  ) {
    console.warn(
      "⚠️  Email not configured. Emails will be logged to console only."
    );
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: config.email.user,
      pass: config.email.password,
    },
  });
};

// Send password reset email
export const sendPasswordResetEmail = async (
  email: string,
  resetToken: string,
  userName: string
): Promise<boolean> => {
  const resetLink = `${config.frontend_url}/reset-password?token=${resetToken}`;

  const transporter = createTransporter();

  // If email not configured, just log to console
  if (!transporter) {
    console.log("\n📧 ========== PASSWORD RESET EMAIL ==========");
    console.log(`To: ${email}`);
    console.log(`Name: ${userName}`);
    console.log(`Reset Token: ${resetToken}`);
    console.log(`Reset Link: ${resetLink}`);
    console.log("⏰ Expires in: 1 hour");
    console.log("============================================\n");
    return false; // Email not sent, but logged
  }

  // Send actual email
  try {
    await transporter.sendMail({
      from: `"${config.email.from_name}" <${config.email.user}>`,
      to: email,
      subject: "Password Reset Request - Audit Management System",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6; 
              color: #4a5568;
              background-color: #f7fafc;
            }
            .email-wrapper { 
              max-width: 600px; 
              margin: 0 auto; 
              background-color: #ffffff;
            }
            .header { 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white; 
              padding: 40px 30px;
              text-align: left;
            }
            .header h1 {
              font-size: 28px;
              font-weight: 600;
              margin: 0;
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .content { 
              background: #ffffff;
              padding: 40px 30px;
            }
            .content p {
              margin-bottom: 16px;
              color: #4a5568;
              font-size: 15px;
            }
            .greeting {
              font-size: 16px;
              color: #2d3748;
              margin-bottom: 20px;
            }
            .button-container {
              text-align: center;
              margin: 30px 0;
            }
            .button { 
              display: inline-block;
              padding: 14px 40px;
              background: #667eea;
              color: white !important;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 500;
              font-size: 15px;
              transition: background 0.3s;
            }
            .button:hover {
              background: #5568d3;
            }
            .link-section {
              margin: 25px 0;
            }
            .link-section p {
              margin-bottom: 10px;
              font-size: 14px;
              color: #718096;
            }
            .reset-link {
              background: #f7fafc;
              padding: 12px 15px;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              word-break: break-all;
              font-size: 13px;
              color: #667eea;
              display: block;
              text-decoration: none;
            }
            .warning-box {
              background: #fffbeb;
              border-left: 4px solid #f59e0b;
              padding: 20px;
              margin: 25px 0;
              border-radius: 4px;
            }
            .warning-box strong {
              display: flex;
              align-items: center;
              gap: 8px;
              color: #92400e;
              font-size: 15px;
              margin-bottom: 12px;
            }
            .warning-box ul {
              margin-left: 20px;
              color: #78350f;
            }
            .warning-box li {
              margin-bottom: 8px;
              font-size: 14px;
            }
            .footer-text {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
            }
            .footer-text p {
              margin-bottom: 8px;
            }
            .signature {
              font-weight: 600;
              color: #2d3748;
            }
            .email-footer {
              background: #f7fafc;
              padding: 20px 30px;
              text-align: center;
              color: #a0aec0;
              font-size: 12px;
            }
            .email-footer p {
              margin: 5px 0;
            }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="header">
              <h1>🔐 Password Reset Request</h1>
            </div>
            
            <div class="content">
              <p class="greeting">Hi <strong>${userName}</strong>,</p>
              
              <p>We received a request to reset your password for your Audit Management System account.</p>
              
              <p>Click the button below to reset your password:</p>
              
              <div class="button-container">
                <a href="${resetLink}" class="button">Reset Password</a>
              </div>
              
              <div class="link-section">
                <p>Or copy and paste this link into your browser:</p>
                <a href="${resetLink}" class="reset-link">${resetLink}</a>
              </div>
              
              <div class="warning-box">
                <strong>⚠️ Important:</strong>
                <ul>
                  <li>This link will expire in <strong>1 hour</strong></li>
                  <li>If you didn't request this, please ignore this email</li>
                  <li>Your password won't change until you create a new one</li>
                </ul>
              </div>
              
              <div class="footer-text">
                <p>If you have any questions, please contact your system administrator.</p>
                
                <p style="margin-top: 20px;">Best regards,<br>
                <span class="signature">Audit Management System Team</span></p>
              </div>
            </div>
            
            <div class="email-footer">
              <p>&copy; ${new Date().getFullYear()} Digital Seba. All rights reserved.</p>
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Password Reset Request
        
        Hi ${userName},
        
        We received a request to reset your password for your Audit Management System account.
        
        Click this link to reset your password:
        ${resetLink}
        
        This link will expire in 1 hour.
        
        If you didn't request this, please ignore this email.
        
        Best regards,
        Audit Management System Team
      `,
    });

    console.log(`✅ Password reset email sent to ${email}`);
    return true;
  } catch (error: any) {
    console.error("❌ Failed to send email:", error.message);
    // Still log to console as fallback
    console.log("\n📧 ========== PASSWORD RESET EMAIL (Fallback) ==========");
    console.log(`To: ${email}`);
    console.log(`Reset Link: ${resetLink}`);
    console.log("=======================================================\n");
    return false;
  }
};

// Send welcome email (optional)
export const sendWelcomeEmail = async (
  email: string,
  userName: string
): Promise<boolean> => {
  const transporter = createTransporter();

  if (!transporter) {
    console.log(`📧 Welcome email would be sent to ${email}`);
    return false;
  }

  try {
    await transporter.sendMail({
      from: `"${config.email.from_name}" <${config.email.user}>`,
      to: email,
      subject: "Welcome to Audit Management System",
      html: `
        <h2>Welcome ${userName}!</h2>
        <p>Your account has been created successfully.</p>
        <p>You can now login at: <a href="${config.frontend_url}/login">${config.frontend_url}/login</a></p>
      `,
    });

    console.log(`✅ Welcome email sent to ${email}`);
    return true;
  } catch (error: any) {
    console.error("❌ Failed to send welcome email:", error.message);
    return false;
  }
};
