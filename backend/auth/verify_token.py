import argparse
import json
from pathlib import Path
from datetime import datetime
from jose import JWTError
from conn import get_db_connection
from utils.auth_helper import verify_jwt_token
from auth.model import User


def verify_token(token: str) -> User:
    payload = verify_jwt_token(token)
    user_id = payload["user_id"]

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT id, email, name, team, email_verified, created_at, role
        FROM public.users
        WHERE id = %s
        """,
        (user_id,)
    )
    row = cursor.fetchone()
    cursor.close()
    conn.close()

    if not row:
        raise ValueError(f"User not found: {user_id}")

    user = User(
        id=row[0],
        email=row[1],
        name=row[2],
        team=row[3],
        email_verified=row[4],
        created_at=row[5],
        role=row[6],
    )

    return user


def main(token: str) -> dict:
    result = {
        "status": "unknown",
        "user": None,
        "error": None
    }

    try:
        user = verify_token(token)
        result["status"] = "success"
        result["user"] = user.model_dump(mode="json")

    except JWTError as e:
        result["status"] = "error"
        result["error"] = {
            "code": 401,
            "type": "Unauthorized",
            "message": "Invalid or expired token",
            "details": str(e)
        }

    except ValueError as e:
        result["status"] = "error"
        result["error"] = {
            "code": 404,
            "type": "Not Found",
            "message": str(e),
            "details": None
        }

    except Exception as e:
        result["status"] = "error"
        result["error"] = {
            "code": 500,
            "type": "Internal Server Error",
            "message": "An unexpected error occurred",
            "details": str(e)
        }

    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Verify JWT token and get current user")
    parser.add_argument("--token", required=True, help="JWT token to verify")
    args = parser.parse_args()

    result = main(args.token)

    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    output_file = output_dir / f"verify_token_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    output_file.write_text(json.dumps(result, ensure_ascii=False, indent=2))

    print(f"\nToken Verification Result")
    print(f"Status: {result['status']}")

    if result['status'] == 'success':
        print(f"\nUser Information:")
        print(f"  ID: {result['user']['id']}")
        print(f"  Email: {result['user']['email']}")
        print(f"  Name: {result['user']['name']}")
        print(f"  Team: {result['user']['team']}")
        print(f"  Email Verified: {result['user']['email_verified']}")
        print(f"  Created At: {result['user']['created_at']}")
    else:
        print(f"\nError:")
        print(f"  Code: {result['error']['code']}")
        print(f"  Type: {result['error']['type']}")
        print(f"  Message: {result['error']['message']}")
        if result['error']['details']:
            print(f"  Details: {result['error']['details']}")

    print(f"\nSaved: {output_file}")
