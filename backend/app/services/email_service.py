from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from typing import List
from app.config import settings

# Email configuration using settings
conf = ConnectionConfig(
    MAIL_USERNAME=settings.mail_username,
    MAIL_PASSWORD=settings.mail_password,
    MAIL_FROM=settings.mail_from,
    MAIL_PORT=587,
    MAIL_SERVER="smtp.gmail.com",
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)

class EmailService:
    def __init__(self):
        self.fastmail = FastMail(conf)

    async def send_password_reset_email(self, email: str, reset_token: str, frontend_url: str = None):
        """
        Send password reset email to user.
        
        Args:
            email: User's email address
            reset_token: The password reset token
            frontend_url: Frontend base URL for reset link
        """
        # Use settings if frontend_url not provided
        if frontend_url is None:
            frontend_url = settings.frontend_url
        
        reset_link = f"{frontend_url}/reset-password?token={reset_token}"
        
        # Email-client compatible HTML using tables
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset - DealHunt</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
                <tr>
                    <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            <!-- Header -->
                            <tr>
                                <td style="background-color: #3b82f6; color: white; padding: 30px; text-align: center;">
                                    <h1 style="margin: 0; font-size: 24px;">🔒 Password Reset Request</h1>
                                </td>
                            </tr>
                            
                            <!-- Content -->
                            <tr>
                                <td style="padding: 40px 30px;">
                                    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333;">Hello,</p>
                                    
                                    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333;">We received a request to reset your password for your DealHunt account.</p>
                                    
                                    <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #333;">Click the button below to reset your password:</p>
                                    
                                    <!-- Button -->
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td align="center" style="padding: 20px 0;">
                                                <a href="{reset_link}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Reset My Password</a>
                                            </td>
                                        </tr>
                                    </table>
                                    
                                    <p style="margin: 30px 0 20px 0; font-size: 16px; line-height: 1.6; color: #333;">Or copy and paste this link into your browser:</p>
                                    <p style="margin: 0 0 30px 0; word-break: break-all; background-color: #f8f9fa; padding: 15px; border-radius: 4px; font-size: 14px; color: #666; border: 1px solid #e9ecef;">{reset_link}</p>
                                    
                                    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #d63384;"><strong>Important:</strong> This link will expire in 1 hour for security reasons.</p>
                                    
                                    <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #333;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
                                    <p style="margin: 0 0 10px 0; font-size: 16px; color: #333;"><strong>Best regards,<br>The DealHunt Team</strong></p>
                                    <p style="margin: 0; font-size: 12px; color: #6c757d;">This is an automated email. Please do not reply to this message.</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """
        
        # Plain text version for better compatibility
        text_content = f"""
Password Reset Request - DealHunt

Hello,

We received a request to reset your password for your DealHunt account.

To reset your password, please click the following link or copy and paste it into your browser:

{reset_link}

IMPORTANT: This link will expire in 1 hour for security reasons.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

Best regards,
The DealHunt Team

---
This is an automated email. Please do not reply to this message.
        """

        message = MessageSchema(
            subject="Reset Your DealHunt Password",
            recipients=[email],
            body=html_content,
            subtype="html",
            alternative_body=text_content,
            reply_to=[conf.MAIL_FROM],
            headers={"X-Priority": "1", "X-MSMail-Priority": "High", "Importance": "High"}
        )
        
        try:
            await self.fastmail.send_message(message)
            return True
        except Exception as e:
            print(f"Failed to send email: {e}")
            # For development, we'll simulate email sending
            print(f"📧 SIMULATED EMAIL TO: {email}")
            print(f"🔗 Reset Link: {reset_link}")
            return True  # Return True for development to continue the flow

    async def send_verification_email(self, email: str, verification_token: str, frontend_url: str = None):
        """
        Send email verification email to user.
        
        Args:
            email: User's email address
            verification_token: The email verification token
            frontend_url: Frontend base URL for verification link
        """
        # Use settings if frontend_url not provided
        if frontend_url is None:
            frontend_url = settings.frontend_url
        
        verification_link = f"{frontend_url}/verify-email?token={verification_token}"
        
        # Email-client compatible HTML using tables
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your Email - DealHunt</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
                <tr>
                    <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            <!-- Header -->
                            <tr>
                                <td style="background-color: #10b981; color: white; padding: 30px; text-align: center;">
                                    <h1 style="margin: 0; font-size: 24px;">✉️ Verify Your Email</h1>
                                </td>
                            </tr>
                            
                            <!-- Content -->
                            <tr>
                                <td style="padding: 40px 30px;">
                                    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333;">Welcome to DealHunt!</p>
                                    
                                    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333;">Thank you for creating an account with us. To complete your registration and start using all features, please verify your email address.</p>
                                    
                                    <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #333;">Click the button below to verify your email:</p>
                                    
                                    <!-- Button -->
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td align="center" style="padding: 20px 0;">
                                                <a href="{verification_link}" style="display: inline-block; background-color: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Verify My Email</a>
                                            </td>
                                        </tr>
                                    </table>
                                    
                                    <p style="margin: 30px 0 20px 0; font-size: 16px; line-height: 1.6; color: #333;">Or copy and paste this link into your browser:</p>
                                    <p style="margin: 0 0 30px 0; word-break: break-all; background-color: #f8f9fa; padding: 15px; border-radius: 4px; font-size: 14px; color: #666; border: 1px solid #e9ecef;">{verification_link}</p>
                                    
                                    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #d63384;"><strong>Important:</strong> This link will expire in 24 hours for security reasons.</p>
                                    
                                    <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #333;">If you didn't create an account with DealHunt, you can safely ignore this email.</p>
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
                                    <p style="margin: 0 0 10px 0; font-size: 16px; color: #333;"><strong>Welcome to DealHunt!<br>Happy Shopping!</strong></p>
                                    <p style="margin: 0; font-size: 12px; color: #6c757d;">This is an automated email. Please do not reply to this message.</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """
        
        # Plain text version for better compatibility
        text_content = f"""
Email Verification - DealHunt

Welcome to DealHunt!

Thank you for creating an account with us. To complete your registration and start using all features, please verify your email address.

To verify your email, please click the following link or copy and paste it into your browser:

{verification_link}

IMPORTANT: This link will expire in 24 hours for security reasons.

If you didn't create an account with DealHunt, you can safely ignore this email.

Welcome to DealHunt!
Happy Shopping!

---
This is an automated email. Please do not reply to this message.
        """

        message = MessageSchema(
            subject="Welcome to DealHunt - Please Verify Your Email",
            recipients=[email],
            body=html_content,
            subtype="html",
            alternative_body=text_content,
            reply_to=[conf.MAIL_FROM],
            headers={"X-Priority": "1", "X-MSMail-Priority": "High", "Importance": "High"}
        )
        
        try:
            await self.fastmail.send_message(message)
            return True
        except Exception as e:
            print(f"Failed to send email: {e}")
            # For development, we'll simulate email sending
            print(f"📧 SIMULATED VERIFICATION EMAIL TO: {email}")
            print(f"🔗 Verification Link: {verification_link}")
            return True  # Return True for development to continue the flow

    async def send_price_drop_notification(self, email: str, items: list, frontend_url: str = "http://localhost:3000"):
        """Send price drop notification email to user."""
        wishlist_link = f"{frontend_url}/wishlist"
        total_savings = sum(item.get('savings', 0) for item in items)
        
        items_html = ""
        for item in items:
            savings_percent = ((item['old_price'] - item['new_price']) / item['old_price']) * 100
            items_html += f"""
                <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 15px 0;">
                    <h3 style="margin: 0 0 10px 0;">{item['title']}</h3>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="text-decoration: line-through; color: #9ca3af;">${item['old_price']:.2f}</span>
                        <span style="color: #dc2626; font-weight: bold; font-size: 18px;">${item['new_price']:.2f}</span>
                        <span style="background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 12px;">-{savings_percent:.0f}%</span>
                    </div>
                    <p style="color: #059669; font-weight: bold;">💰 You save ${item['savings']:.2f}!</p>
                </div>
            """
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 25px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1>📉 Price Drop Alert!</h1>
                <p>Items in your wishlist are now cheaper</p>
            </div>
            <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
                <div style="background: #10b981; color: white; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; font-weight: bold;">
                    🎉 Total Savings: ${total_savings:.2f}
                </div>
                <p>Great news! {len(items)} item{'s' if len(items) > 1 else ''} from your wishlist {'have' if len(items) > 1 else 'has'} dropped in price:</p>
                {items_html}
                <p style="text-align: center;">
                    <a href="{wishlist_link}" style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Wishlist 🛍️</a>
                </p>
            </div>
        </body>
        </html>
        """
        
        message = MessageSchema(
            subject=f"💰 Price Drop Alert: Save ${total_savings:.2f}",
            recipients=[email],
            body=html_content,
            subtype="html",
            reply_to=[conf.MAIL_FROM],
            headers={"X-Priority": "1", "X-MSMail-Priority": "High", "Importance": "High"}
        )
        
        try:
            await self.fastmail.send_message(message)
            return True
        except Exception as e:
            print(f"📧 SIMULATED PRICE DROP EMAIL TO: {email}")
            print(f"💰 Total Savings: ${total_savings:.2f}")
            for item in items:
                print(f"   📦 {item['title']}: ${item['old_price']:.2f} → ${item['new_price']:.2f}")
            return True

# Global email service instance
email_service = EmailService()