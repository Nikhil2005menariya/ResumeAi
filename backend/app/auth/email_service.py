from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr

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


APP_NAME = "Resum.Ai"
APP_YEAR = "2026"


def _build_email_shell(title: str, subtitle: str, content: str) -> str:
    """Build a premium, theme-aligned HTML shell for transactional emails."""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
            body {{
                margin: 0;
                padding: 24px 16px;
                background-color: #f8fafc;
                color: #171717;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            }}
            .container {{
                max-width: 640px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 14px;
                padding: 36px 32px;
                box-shadow:
                    rgba(0, 0, 0, 0.08) 0px 0px 0px 1px,
                    rgba(0, 0, 0, 0.04) 0px 2px 2px,
                    rgba(0, 0, 0, 0.04) 0px 8px 12px -10px,
                    #fafafa 0px 0px 0px 1px;
            }}
            .brand {{
                text-align: center;
                margin-bottom: 26px;
            }}
            .brand-title {{
                font-size: 28px;
                font-weight: 600;
                line-height: 1.1;
                letter-spacing: -0.02em;
                color: #111827;
            }}
            .brand-line {{
                width: 84px;
                height: 2px;
                margin: 10px auto 0;
                border-radius: 999px;
                background: linear-gradient(90deg, #0a72ef 0%, #8b5cf6 55%, #de1d8d 100%);
            }}
            h1 {{
                margin: 0;
                text-align: center;
                font-size: 30px;
                line-height: 1.15;
                letter-spacing: -0.03em;
                color: #171717;
                font-weight: 600;
            }}
            .subtitle {{
                margin: 12px auto 0;
                max-width: 520px;
                text-align: center;
                font-size: 16px;
                line-height: 1.55;
                color: #4d4d4d;
            }}
            .otp-box {{
                margin: 28px 0 20px;
                border-radius: 12px;
                padding: 16px 12px;
                text-align: center;
                background: #171717;
                color: #ffffff;
                font-size: 34px;
                font-weight: 700;
                letter-spacing: 10px;
                font-family: 'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
            }}
            .panel {{
                margin-top: 18px;
                border-radius: 10px;
                padding: 14px 16px;
                background: #f8fafc;
                color: #334155;
                font-size: 14px;
                line-height: 1.5;
                box-shadow: rgba(0, 0, 0, 0.06) 0px 0px 0px 1px inset;
            }}
            .muted {{
                margin-top: 20px;
                text-align: center;
                font-size: 14px;
                color: #666666;
            }}
            .cta-button {{
                display: inline-block;
                margin: 26px auto 0;
                padding: 12px 22px;
                border-radius: 8px;
                background: #171717;
                color: #ffffff !important;
                text-decoration: none;
                font-weight: 600;
                font-size: 14px;
                line-height: 1;
            }}
            .cta-wrap {{
                text-align: center;
            }}
            .footer {{
                margin-top: 28px;
                padding-top: 18px;
                border-top: 1px solid #ebebeb;
                text-align: center;
                font-size: 12px;
                color: #808080;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="brand">
                <div class="brand-title">{APP_NAME}</div>
                <div class="brand-line"></div>
            </div>
            <h1>{title}</h1>
            <p class="subtitle">{subtitle}</p>
            {content}
            <div class="footer">
                <p>&copy; {APP_YEAR} {APP_NAME}. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """


async def send_otp_email(email: EmailStr, otp: str) -> bool:
    """Send OTP verification email"""
    html = _build_email_shell(
        title="Verify your email",
        subtitle="Use this one-time code to complete your sign up.",
        content=f"""
        <div class="otp-box">{otp}</div>
        <p class="muted">This code will expire in <strong>10 minutes</strong>.</p>
        <div class="panel">If you did not request this verification code, you can safely ignore this email.</div>
        """,
    )
    
    message = MessageSchema(
        subject=f"Your verification code | {APP_NAME}",
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
    html = _build_email_shell(
        title="Reset code",
        subtitle="Use this one-time code to create/reset  password.",
        content=f"""
        <div class="otp-box">{otp}</div>
        <p class="muted">This code will expire in <strong>10 minutes</strong>.</p>
        """,
    )
    
    message = MessageSchema(
        subject=f"Password reset code | {APP_NAME}",
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
    html = _build_email_shell(
        title=f"Welcome, {name or 'there'}",
        subtitle="Your account is verified and ready for your premium resume workflow.",
        content=f"""
        <div class="panel">
            <strong>What you can do next:</strong><br />
            - Generate tailored resumes from job descriptions<br />
            - Optimize content for ATS screening<br />
            - Refine drafts with AI-guided editing<br />
            - Export production-ready PDF and LaTeX
        </div>
        <div class="cta-wrap">
            <a href="{settings.frontend_url}/app/dashboard" class="cta-button">Go to Dashboard</a>
        </div>
        """,
    )
    
    message = MessageSchema(
        subject=f"Welcome to {APP_NAME}",
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
