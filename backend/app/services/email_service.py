from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from typing import List
import os
from app.config import settings

# Email configuration
conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME", "your-email@gmail.com"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD", "your-app-password"),
    MAIL_FROM=os.getenv("MAIL_FROM", "your-email@gmail.com"),
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

    async def send_password_reset_email(self, email: str, reset_token: str, frontend_url: str = "http://localhost:3000"):
        """
        Send password reset email to user.
        
        Args:
            email: User's email address
            reset_token: The password reset token
            frontend_url: Frontend base URL for reset link
        """
        reset_link = f"{frontend_url}/reset-password?token={reset_token}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Password Reset - DealHunt</title>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background-color: #3b82f6;
                    color: white;
                    padding: 20px;
                    text-align: center;
                    border-radius: 8px 8px 0 0;
                }}
                .content {{
                    background-color: #f9f9f9;
                    padding: 30px;
                    border-radius: 0 0 8px 8px;
                }}
                .button {{
                    display: inline-block;
                    background-color: #3b82f6;
                    color: white;
                    padding: 12px 24px;
                    text-decoration: none;
                    border-radius: 6px;
                    margin: 20px 0;
                }}
                .footer {{
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #ddd;
                    font-size: 12px;
                    color: #666;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🔒 Password Reset Request</h1>
            </div>
            <div class="content">
                <p>Hello,</p>
                
                <p>We received a request to reset your password for your DealHunt account.</p>
                
                <p>Click the button below to reset your password:</p>
                
                <p style="text-align: center;">
                    <a href="{reset_link}" class="button">Reset My Password</a>
                </p>
                
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; background-color: #e5e7eb; padding: 10px; border-radius: 4px;">
                    {reset_link}
                </p>
                
                <p><strong>Important:</strong> This link will expire in 1 hour for security reasons.</p>
                
                <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
                
                <div class="footer">
                    <p>Best regards,<br>The DealHunt Team</p>
                    <p>This is an automated email. Please do not reply to this message.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        message = MessageSchema(
            subject="Reset Your DealHunt Password",
            recipients=[email],
            body=html_content,
            subtype="html"
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
            subtype="html"
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