import nodemailer from 'nodemailer';

// Email configuration from environment variables
const EMAIL_CONFIG = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false, // Use TLS
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || ''
  }
};

// Create transporter
let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransporter(EMAIL_CONFIG);
  }
  return transporter;
}

/**
 * Send credentials email to new user
 */
export async function sendCredentialsEmail(email, fullName, password) {
  // If email is not configured, log credentials instead
  if (!EMAIL_CONFIG.auth.user || !EMAIL_CONFIG.auth.pass) {
    console.log('\n========================================');
    console.log('📧 Email not configured - Credentials:');
    console.log(`User: ${fullName}`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('========================================\n');
    return {
      success: false,
      message: 'Email not configured. Credentials logged to console.'
    };
  }

  try {
    const mailOptions = {
      from: `"יקב אולו" <${EMAIL_CONFIG.auth.user}>`,
      to: email,
      subject: 'פרטי התחברות למערכת מחשבון האירועים',
      html: `
        <!DOCTYPE html>
        <html dir="rtl" lang="he">
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: #f9f9f9;
              border: 1px solid #ddd;
              border-radius: 10px;
              padding: 30px;
            }
            .header {
              background: #b88d3b;
              color: white;
              padding: 20px;
              border-radius: 10px 10px 0 0;
              text-align: center;
              margin: -30px -30px 20px -30px;
            }
            .credentials {
              background: white;
              border: 2px solid #b88d3b;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .credential-row {
              display: flex;
              justify-content: space-between;
              margin: 10px 0;
              padding: 10px;
              background: #f5f5f5;
              border-radius: 5px;
            }
            .credential-label {
              font-weight: bold;
              color: #666;
            }
            .credential-value {
              font-family: 'Courier New', monospace;
              background: #fff;
              padding: 5px 10px;
              border-radius: 3px;
              border: 1px solid #ddd;
            }
            .warning {
              background: #fff3cd;
              border: 1px solid #ffc107;
              border-radius: 5px;
              padding: 15px;
              margin: 20px 0;
            }
            .button {
              display: inline-block;
              background: #b88d3b;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              color: #999;
              font-size: 12px;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🍷 יקב אולו</h1>
              <p>מערכת מחשבון אירועים</p>
            </div>

            <h2>שלום ${fullName},</h2>
            <p>נוצר עבורך חשבון במערכת מחשבון האירועים של יקב אולו.</p>

            <div class="credentials">
              <h3 style="text-align: center; color: #b88d3b;">פרטי התחברות</h3>

              <div class="credential-row">
                <span class="credential-label">כתובת מייל:</span>
                <span class="credential-value">${email}</span>
              </div>

              <div class="credential-row">
                <span class="credential-label">סיסמה ראשונית:</span>
                <span class="credential-value">${password}</span>
              </div>
            </div>

            <div class="warning">
              <strong>⚠️ חשוב!</strong>
              <ul style="margin: 10px 0;">
                <li>בכניסה הראשונה תתבקש/י לשנות את הסיסמה</li>
                <li>הסיסמה החדשה חייבת להכיל:
                  <ul>
                    <li>לפחות 8 תווים</li>
                    <li>אות גדולה ואות קטנה באנגלית</li>
                    <li>לפחות ספרה אחת</li>
                    <li>לפחות תו מיוחד אחד (!@#$%^&*...)</li>
                  </ul>
                </li>
                <li>אל תשתף את פרטי ההתחברות עם אחרים</li>
              </ul>
            </div>

            <div style="text-align: center;">
              <a href="http://localhost:3000/login.html" class="button">התחברות למערכת</a>
            </div>

            <div class="footer">
              <p>יקב אולו • hello@ulu-winery.co.il</p>
              <p>אם קיבלת מייל זה בטעות, אנא התעלם ממנו</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await getTransporter().sendMail(mailOptions);

    console.log(`✓ Credentials email sent to ${email}`);
    return {
      success: true,
      messageId: info.messageId
    };

  } catch (error) {
    console.error('Failed to send email:', error);
    // Fallback: log credentials
    console.log('\n========================================');
    console.log('📧 Email send failed - Credentials:');
    console.log(`User: ${fullName}`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('========================================\n');
    throw error;
  }
}
