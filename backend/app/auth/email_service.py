from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr
from typing import List

from app.config import settings


# Email configuration
mail_config = ConnectionConfig(
    MAIL_USERNAME=settings.mail_username,
    MAIL_PASSWORD=settings.mail_password,
    MAIL_FROM=settings.mail_from,
    MAIL_PORT=settings.mail_port,
    MAIL_SERVER=settings.mail_server,
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)


async def send_otp_email(email: EmailStr, otp: str) -> bool:
    """Send OTP verification email"""
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 20px;
            }}
            .container {{
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 10px;
                padding: 40px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }}
            .header {{
                text-align: center;
                margin-bottom: 30px;
            }}
            .logo {{
                font-size: 28px;
                font-weight: bold;
                color: #6366f1;
            }}
            .otp-box {{
                background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                color: white;
                font-size: 36px;
                font-weight: bold;
                letter-spacing: 8px;
                text-align: center;
                padding: 20px;
                border-radius: 10px;
                margin: 30px 0;
            }}
            .message {{
                color: #4b5563;
                font-size: 16px;
                line-height: 1.6;
                text-align: center;
            }}
            .footer {{
                margin-top: 30px;
                text-align: center;
                color: #9ca3af;
                font-size: 14px;
            }}
            .warning {{
                background-color: #fef3c7;
                border-left: 4px solid #f59e0b;
                padding: 12px;
                margin-top: 20px;
                border-radius: 4px;
                font-size: 14px;
                color: #92400e;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🚀 Resume Maker AI</div>
            </div>
            
            <p class="message">
                Hello! Use the verification code below to complete your sign up.
            </p>
            
            <div class="otp-box">
                {otp}
            </div>
            
            <p class="message">
                This code will expire in <strong>10 minutes</strong>.
            </p>
            
            <div class="warning">
                ⚠️ If you didn't request this code, please ignore this email.
            </div>
            
            <div class="footer">
                <p>© 2024 Resume Maker AI. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    message = MessageSchema(
        subject="🔐 Your Verification Code - Resume Maker AI",
        recipients=[email],
        body=html,
        subtype=MessageType.html
    )
    
    try:
        fm = FastMail(mail_config)
        await fm.send_message(message)
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False


async def send_password_reset_email(email: EmailStr, otp: str) -> bool:
    """Send password reset OTP email"""
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 20px;
            }}
            .container {{
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 10px;
                padding: 40px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }}
            .header {{
                text-align: center;
                margin-bottom: 30px;
            }}
            .logo {{
                font-size: 28px;
                font-weight: bold;
                color: #6366f1;
            }}
            .icon {{
                font-size: 48px;
                text-align: center;
                margin-bottom: 20px;
            }}
            .otp-box {{
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                color: white;
                font-size: 36px;
                font-weight: bold;
                letter-spacing: 8px;
                text-align: center;
                padding: 20px;
                border-radius: 10px;
                margin: 30px 0;
            }}
            .message {{
                color: #4b5563;
                font-size: 16px;
                line-height: 1.6;
                text-align: center;
            }}
            .footer {{
                margin-top: 30px;
                text-align: center;
                color: #9ca3af;
                font-size: 14px;
            }}
            .warning {{
                background-color: #fef3c7;
                border-left: 4px solid #f59e0b;
                padding: 12px;
                margin-top: 20px;
                border-radius: 4px;
                font-size: 14px;
                color: #92400e;
            }}
            .security-note {{
                background-color: #dbeafe;
                border-left: 4px solid #3b82f6;
                padding: 12px;
                margin-top: 20px;
                border-radius: 4px;
                font-size: 14px;
                color: #1e40af;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🚀 Resume Maker AI</div>
            </div>
            
            <div class="icon">🔐</div>
            
            <p class="message">
                <strong>Password Reset Request</strong><br><br>
                We received a request to reset your password. Use the code below to create a new password.
            </p>
            
            <div class="otp-box">
                {otp}
            </div>
            
            <p class="message">
                This code will expire in <strong>10 minutes</strong>.
            </p>
            
            <div class="security-note">
                🛡️ For security reasons, we never ask for your password via email.
            </div>
            
            <div class="warning">
                ⚠️ If you didn't request a password reset, please ignore this email. Your account remains secure.
            </div>
            
            <div class="footer">
                <p>© 2024 Resume Maker AI. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    message = MessageSchema(
        subject="🔐 Password Reset Code - Resume Maker AI",
        recipients=[email],
        body=html,
        subtype=MessageType.html
    )
    
    try:
        fm = FastMail(mail_config)
        await fm.send_message(message)
        return True
    except Exception as e:
        print(f"Failed to send password reset email: {e}")
        return False


async def send_welcome_email(email: EmailStr, name: str) -> bool:
    """Send welcome email after successful verification"""
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 20px;
            }}
            .container {{
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 10px;
                padding: 40px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }}
            .header {{
                text-align: center;
                margin-bottom: 30px;
            }}
            .logo {{
                font-size: 28px;
                font-weight: bold;
                color: #6366f1;
            }}
            .welcome-text {{
                font-size: 24px;
                color: #1f2937;
                text-align: center;
                margin-bottom: 20px;
            }}
            .message {{
                color: #4b5563;
                font-size: 16px;
                line-height: 1.6;
            }}
            .feature-list {{
                background-color: #f3f4f6;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
            }}
            .feature-item {{
                display: flex;
                align-items: center;
                margin: 10px 0;
                color: #374151;
            }}
            .feature-icon {{
                margin-right: 10px;
                font-size: 20px;
            }}
            .cta-button {{
                display: block;
                width: 200px;
                margin: 30px auto;
                padding: 15px 30px;
                background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                color: white;
                text-align: center;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                font-size: 16px;
            }}
            .footer {{
                margin-top: 30px;
                text-align: center;
                color: #9ca3af;
                font-size: 14px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🚀 Resume Maker AI</div>
            </div>
            
            <h1 class="welcome-text">Welcome, {name or 'there'}! 🎉</h1>
            
            <p class="message">
                Your account has been verified successfully! You're now ready to create 
                stunning, ATS-optimized resumes with the power of AI.
            </p>
            
            <div class="feature-list">
                <div class="feature-item">
                    <span class="feature-icon">📝</span>
                    <span>AI-powered resume generation</span>
                </div>
                <div class="feature-item">
                    <span class="feature-icon">🎯</span>
                    <span>High ATS score optimization</span>
                </div>
                <div class="feature-item">
                    <span class="feature-icon">🔍</span>
                    <span>Smart job search & matching</span>
                </div>
                <div class="feature-item">
                    <span class="feature-icon">💬</span>
                    <span>Real-time AI chat assistance</span>
                </div>
            </div>
            
            <a href="{settings.frontend_url}/dashboard" class="cta-button">
                Go to Dashboard →
            </a>
            
            <div class="footer">
                <p>© 2024 Resume Maker AI. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    message = MessageSchema(
        subject="🎉 Welcome to Resume Maker AI!",
        recipients=[email],
        body=html,
        subtype=MessageType.html
    )
    
    try:
        fm = FastMail(mail_config)
        await fm.send_message(message)
        return True
    except Exception as e:
        print(f"Failed to send welcome email: {e}")
        return False
