import argparse
import json
from pathlib import Path
from datetime import datetime
from conn import get_db_connection
from utils.auth_helper import verify_password, create_jwt_token
from auth.model import LoginRequest, LoginResponse, User


class AuthenticationError(Exception):
    pass


def login(request: LoginRequest) -> LoginResponse:
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT id, email, name, team, email_verified, password_hash, created_at, role, is_active FROM public.users WHERE email = %s",
        (request.email,)
    )
    row = cursor.fetchone()
    cursor.close()
    conn.close()

    if not row:
        raise AuthenticationError("등록되지 않은 이메일입니다")

    user_id, email, name, team, email_verified, password_hash, created_at, role, is_active = row

    if not verify_password(request.password, password_hash):
        raise AuthenticationError("비밀번호가 틀렸습니다")

    if not is_active:
        raise AuthenticationError("계정이 비활성화되었습니다")

    if not email_verified:
        raise ValueError("EMAIL_NOT_VERIFIED")

    token = create_jwt_token(str(user_id))

    user = User(
        id=user_id,
        email=email,
        name=name,
        team=team,
        email_verified=email_verified,
        role=role,
        created_at=created_at
    )

    return LoginResponse(
        token=token,
        token_type="bearer",
        user=user
    )


def main(email: str, password: str) -> dict:
    request = LoginRequest(email=email, password=password)
    response = login(request)

    return {
        "token": response.token,
        "token_type": response.token_type,
        "user": {
            "id": str(response.user.id),
            "email": response.user.email,
            "name": response.user.name,
            "team": response.user.team,
            "email_verified": response.user.email_verified,
            "created_at": response.user.created_at.isoformat()
        }
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Login user")
    parser.add_argument("--email", required=True, help="User email")
    parser.add_argument("--password", required=True, help="User password")
    args = parser.parse_args()

    result = main(args.email, args.password)

    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    output_file = output_dir / f"login_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    output_file.write_text(json.dumps(result, ensure_ascii=False, indent=2))
    print(f"Saved: {output_file}")
    print(f"Token: {result['token']}")
    print(f"User: {result['user']['email']}")
