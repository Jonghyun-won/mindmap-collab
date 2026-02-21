"""이메일 인증 API"""
import argparse
import json
from pathlib import Path
from datetime import datetime
from conn import get_db_connection
from utils.auth_helper import create_jwt_token


def confirm_email(email: str, confirmation_code: str) -> dict:
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. 사용자 찾기
    cursor.execute(
        "SELECT id, email, name, team, email_verified, created_at FROM public.users WHERE email = %s",
        (email,)
    )
    user = cursor.fetchone()
    if not user:
        cursor.close()
        conn.close()
        raise ValueError("User not found")

    user_id = str(user[0])

    if user[4]:  # already verified
        cursor.close()
        conn.close()
        raise ValueError("Email already verified")

    # 2. 인증코드 확인
    cursor.execute(
        """
        SELECT id FROM public.email_confirmations
        WHERE user_id = %s AND confirmation_code = %s AND used = FALSE AND expires_at > NOW()
        ORDER BY created_at DESC LIMIT 1
        """,
        (user_id, confirmation_code)
    )

    confirmation = cursor.fetchone()
    if not confirmation:
        cursor.close()
        conn.close()
        raise ValueError("Invalid or expired confirmation code")

    # 3. 인증 완료 처리
    cursor.execute("UPDATE public.email_confirmations SET used = TRUE WHERE id = %s", (confirmation[0],))
    cursor.execute("UPDATE public.users SET email_verified = TRUE WHERE id = %s", (user_id,))

    conn.commit()
    cursor.close()
    conn.close()

    # 4. JWT 토큰 발급
    token = create_jwt_token(user_id)

    return {
        "token": token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "email": user[1],
            "name": user[2],
            "team": user[3],
            "email_verified": True,
            "created_at": user[5].isoformat() if user[5] else None
        }
    }


def main(email: str, code: str) -> dict:
    result = confirm_email(email, code)
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Confirm email")
    parser.add_argument("--email", required=True)
    parser.add_argument("--code", required=True)
    args = parser.parse_args()

    result = main(args.email, args.code)

    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    output_file = output_dir / f"confirm_email_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    output_file.write_text(json.dumps(result, ensure_ascii=False, indent=2, default=str))

    print(json.dumps(result, indent=2, ensure_ascii=False, default=str))
    print(f"\nSaved: {output_file}")
