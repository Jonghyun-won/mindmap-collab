import os
from dotenv import load_dotenv

load_dotenv()

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")


def send_verification_email(to_email: str, code: str, user_name: str = None) -> bool:
    display_name = user_name or to_email

    if not RESEND_API_KEY:
        print(f"[DEV] Verification code for {to_email}: {code}")
        return True

    try:
        import resend
        resend.api_key = RESEND_API_KEY

        resend.Emails.send({
            "from": "MindMap Collab <noreply@resend.dev>",
            "to": [to_email],
            "subject": "[MindMap Collab] 이메일 인증코드",
            "html": f"""
                <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #1f2937;">안녕하세요, {display_name}님</h2>
                    <p style="color: #4b5563;">MindMap Collab 회원가입을 위한 인증코드입니다:</p>
                    <div style="background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1D4ED8;">{code}</span>
                    </div>
                    <p style="color: #6B7280; font-size: 14px;">이 코드는 30분 동안 유효합니다.</p>
                    <p style="color: #6B7280; font-size: 14px;">본인이 요청하지 않았다면 이 이메일을 무시해주세요.</p>
                </div>
            """
        })
        return True
    except Exception as e:
        print(f"Email send failed: {e}")
        print(f"[FALLBACK] Verification code for {to_email}: {code}")
        return False
