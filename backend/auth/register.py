import argparse
import json
import random
import uuid
from pathlib import Path
from datetime import datetime, timedelta, timezone
from conn import get_db_connection
from utils.auth_helper import hash_password
from utils.validation import validate_email, validate_password_strength
from auth.model import RegisterRequest, RegisterResponse, User


def register(request: RegisterRequest) -> RegisterResponse:
    """Register new user and return confirmation code.

    Args:
        request: RegisterRequest with email, password, optional name and team

    Returns:
        RegisterResponse with message, user info, and confirmation code

    Raises:
        ValueError: If validation fails or email already exists
    """
    # Validate email format
    if not validate_email(request.email):
        raise ValueError("Invalid email format")

    # Validate password strength
    is_valid, message = validate_password_strength(request.password)
    if not is_valid:
        raise ValueError(message)

    conn = get_db_connection()
    cursor = conn.cursor()

    # Check for duplicate email
    cursor.execute(
        "SELECT id FROM public.users WHERE email = %s",
        (request.email,)
    )
    existing_user = cursor.fetchone()

    if existing_user:
        cursor.close()
        conn.close()
        raise ValueError("User with this email already exists")

    # Hash password
    hashed_password = hash_password(request.password)

    # Insert new user with email_verified = FALSE
    cursor.execute(
        """
        INSERT INTO public.users (email, password_hash, name, team, phone, email_verified)
        VALUES (%s, %s, %s, %s, %s, FALSE)
        RETURNING id, email, name, team, phone, email_verified, created_at
        """,
        (request.email, hashed_password, request.name, request.team, request.phone)
    )

    user_row = cursor.fetchone()

    user_id = str(user_row[0])
    user_email = user_row[1]
    user_name = user_row[2]
    user_team = user_row[3]
    user_phone = user_row[4]
    user_email_verified = user_row[5]
    user_created_at = user_row[6]

    # Generate 6-digit confirmation code and UUID verification token
    code = str(random.randint(100000, 999999))
    verify_token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)

    # Save confirmation code with verification token
    cursor.execute(
        """
        INSERT INTO public.email_confirmations (user_id, confirmation_code, verification_token, expires_at)
        VALUES (%s, %s, %s, %s)
        """,
        (user_id, code, verify_token, expires_at)
    )

    conn.commit()
    cursor.close()
    conn.close()

    # Send verification email with link
    from utils.email_sender import send_verification_email
    send_verification_email(request.email, code, request.name, verify_token)

    # Build User object
    user = User(
        id=user_id,
        email=user_email,
        name=user_name,
        team=user_team,
        phone=user_phone,
        email_verified=user_email_verified,
        created_at=user_created_at
    )

    # Return RegisterResponse (no JWT token)
    return RegisterResponse(
        message="Registration successful. Please verify your email.",
        user=user,
    )


def main(email: str, password: str, name: str = None, team: str = None, phone: str = None) -> dict:
    request = RegisterRequest(email=email, password=password, name=name, team=team, phone=phone)
    response = register(request)

    return {
        "message": response.message,
        "user": {
            "id": str(response.user.id),
            "email": response.user.email,
            "name": response.user.name,
            "team": response.user.team,
            "phone": response.user.phone,
            "email_verified": response.user.email_verified,
            "created_at": response.user.created_at.isoformat()
        }
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Register new user")
    parser.add_argument("--email", required=True, help="User email address")
    parser.add_argument("--password", required=True, help="User password")
    parser.add_argument("--name", help="User display name (optional)")
    parser.add_argument("--team", help="User team (optional)")
    parser.add_argument("--phone", help="User phone number (optional)")
    args = parser.parse_args()

    result = main(args.email, args.password, args.name, args.team, args.phone)

    # Save to output folder
    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    output_file = output_dir / f"register_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    output_file.write_text(json.dumps(result, ensure_ascii=False, indent=2))

    print(json.dumps(result, ensure_ascii=False, indent=2))
    print(f"\nSaved: {output_file}")
