import os
from dotenv import load_dotenv

load_dotenv()

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")


def send_verification_email(to_email: str, code: str, user_name: str = None, verify_token: str = None) -> bool:
    display_name = user_name or to_email
    FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5174")
    verify_link = f"{FRONTEND_URL}/verify-email?token={verify_token}" if verify_token else ""

    if not RESEND_API_KEY:
        print(f"[DEV] Verification code for {to_email}: {code}")
        if verify_token:
            print(f"[DEV] Verification link: {verify_link}")
        return True

    try:
        import resend
        resend.api_key = RESEND_API_KEY

        # Build verification link section
        link_section = ""
        if verify_token:
            link_section = f"""
                    <div style="text-align: center; margin: 24px 0;">
                        <a href="{verify_link}" style="display: inline-block; background: #2563EB; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
                            이메일 인증하기
                        </a>
                    </div>
                    <p style="color: #6B7280; font-size: 14px; text-align: center;">또는 아래 인증코드를 입력해주세요:</p>"""

        resend.Emails.send({
            "from": "FunnelMind <onboarding@resend.dev>",
            "to": [to_email],
            "subject": "[MindMap Collab] 이메일 인증코드",
            "html": f"""
                <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #1f2937;">안녕하세요, {display_name}님</h2>
                    <p style="color: #4b5563;">FunnelMind 회원가입을 위한 이메일 인증입니다.</p>
                    {link_section}
                    <div style="background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 16px; text-align: center; margin: 12px 0;">
                        <span style="font-size: 28px; font-weight: bold; letter-spacing: 8px; color: #1D4ED8;">{code}</span>
                    </div>
                    <p style="color: #6B7280; font-size: 12px;">이 인증은 30분 동안 유효합니다.</p>
                </div>
            """
        })
        return True
    except Exception as e:
        print(f"Email send failed: {e}")
        print(f"[FALLBACK] Verification code for {to_email}: {code}")
        if verify_token:
            print(f"[FALLBACK] Verification link: {verify_link}")
        return False
