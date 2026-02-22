"""인증코드 재발송 API"""
import argparse
import json
import random
from pathlib import Path
from datetime import datetime, timedelta, timezone
from conn import get_db_connection


def resend_confirmation(email: str) -> dict:
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id, email_verified FROM public.users WHERE email = %s", (email,))
    user = cursor.fetchone()
    if not user:
        cursor.close()
        conn.close()
        raise ValueError("User not found")
    if user[1]:
        cursor.close()
        conn.close()
        raise ValueError("Email already verified")

    user_id = str(user[0])

    # 기존 코드 무효화
    cursor.execute(
        "UPDATE public.email_confirmations SET used = TRUE WHERE user_id = %s AND used = FALSE",
        (user_id,)
    )

    # 새 코드 생성
    code = str(random.randint(100000, 999999))
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)

    cursor.execute(
        """
        INSERT INTO public.email_confirmations (user_id, confirmation_code, expires_at)
        VALUES (%s, %s, %s)
        """,
        (user_id, code, expires_at)
    )

    # Get user name for email
    cursor.execute("SELECT name FROM public.users WHERE id = %s", (user_id,))
    name_row = cursor.fetchone()
    user_name = name_row[0] if name_row else None

    conn.commit()
    cursor.close()
    conn.close()

    from utils.email_sender import send_verification_email
    send_verification_email(email, code, user_name)

    return {"message": "인증코드가 이메일로 발송되었습니다"}


def main(email: str) -> dict:
    result = resend_confirmation(email)
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Resend confirmation code")
    parser.add_argument("--email", required=True)
    args = parser.parse_args()

    result = main(args.email)

    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    output_file = output_dir / f"resend_confirmation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    output_file.write_text(json.dumps(result, ensure_ascii=False, indent=2))

    print(json.dumps(result, indent=2, ensure_ascii=False))
    print(f"\nSaved: {output_file}")
