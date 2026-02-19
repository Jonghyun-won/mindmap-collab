import argparse
import json
from pathlib import Path
from datetime import datetime
from conn import get_db_connection
from utils.auth_helper import hash_password, create_jwt_token
from utils.validation import validate_email, validate_password_strength
from auth.model import RegisterRequest, LoginResponse, User


def register(request: RegisterRequest) -> LoginResponse:
    """Register new user and return JWT token.

    Args:
        request: RegisterRequest with email, password, and optional name

    Returns:
        LoginResponse with token and user info

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

    # Insert new user
    cursor.execute(
        """
        INSERT INTO public.users (email, password_hash, name)
        VALUES (%s, %s, %s)
        RETURNING id, email, name, created_at
        """,
        (request.email, hashed_password, request.name)
    )

    user_row = cursor.fetchone()
    conn.commit()

    user_id = str(user_row[0])
    user_email = user_row[1]
    user_name = user_row[2]
    user_created_at = user_row[3]

    cursor.close()
    conn.close()

    # Create JWT token
    token = create_jwt_token(user_id)

    # Build User object
    user = User(
        id=user_id,
        email=user_email,
        name=user_name,
        created_at=user_created_at
    )

    # Return LoginResponse
    return LoginResponse(
        token=token,
        token_type="bearer",
        user=user
    )


def main(email: str, password: str, name: str = None) -> dict:
    """Main function for testing registration.

    Args:
        email: User email address
        password: User password
        name: Optional user display name

    Returns:
        dict with registration result
    """
    try:
        request = RegisterRequest(email=email, password=password, name=name)
        response = register(request)

        return {
            "status": "success",
            "token": response.token,
            "token_type": response.token_type,
            "user": {
                "id": str(response.user.id),
                "email": response.user.email,
                "name": response.user.name,
                "created_at": response.user.created_at.isoformat()
            }
        }

    except ValueError as e:
        return {
            "status": "error",
            "error": "Validation Error" if "email" in str(e).lower() or "password" in str(e).lower() else "Conflict",
            "message": str(e)
        }

    except Exception as e:
        return {
            "status": "error",
            "error": "Internal Server Error",
            "message": str(e)
        }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Register new user")
    parser.add_argument("--email", required=True, help="User email address")
    parser.add_argument("--password", required=True, help="User password")
    parser.add_argument("--name", help="User display name (optional)")
    args = parser.parse_args()

    result = main(args.email, args.password, args.name)

    # Save to output folder
    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    output_file = output_dir / f"register_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    output_file.write_text(json.dumps(result, ensure_ascii=False, indent=2))

    print(json.dumps(result, ensure_ascii=False, indent=2))
    print(f"\nSaved: {output_file}")
