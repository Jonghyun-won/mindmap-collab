import argparse
import json
from pathlib import Path
from datetime import datetime
from jose import JWTError
from conn import get_db_connection
from utils.auth_helper import verify_jwt_token
from auth.model import User


def update_profile(token: str, updates: dict) -> User:
    """Update user profile (name, team, phone only)"""
    payload = verify_jwt_token(token)
    user_id = payload["user_id"]

    # Only allow updating name, team, phone
    allowed_fields = {"name", "team", "phone"}
    updates = {k: v for k, v in updates.items() if k in allowed_fields}

    if not updates:
        raise ValueError("No valid fields to update")

    conn = get_db_connection()
    cursor = conn.cursor()

    # Build dynamic UPDATE query
    set_clause = ", ".join([f"{field} = %s" for field in updates.keys()])
    values = list(updates.values()) + [user_id]

    cursor.execute(
        f"""
        UPDATE public.users
        SET {set_clause}, updated_at = NOW()
        WHERE id = %s
        RETURNING id, email, name, team, phone, email_verified, created_at, role
        """,
        values
    )

    row = cursor.fetchone()
    if not row:
        cursor.close()
        conn.close()
        raise ValueError(f"User not found: {user_id}")

    conn.commit()
    cursor.close()
    conn.close()

    user = User(
        id=row[0],
        email=row[1],
        name=row[2],
        team=row[3],
        phone=row[4],
        email_verified=row[5],
        created_at=row[6],
        role=row[7],
    )

    return user


def main(token: str, name: str = None, team: str = None, phone: str = None) -> dict:
    result = {
        "status": "unknown",
        "user": None,
        "error": None
    }

    try:
        updates = {}
        if name is not None:
            updates["name"] = name
        if team is not None:
            updates["team"] = team
        if phone is not None:
            updates["phone"] = phone

        user = update_profile(token, updates)
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
            "code": 404 if "not found" in str(e).lower() else 400,
            "type": "Not Found" if "not found" in str(e).lower() else "Bad Request",
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
    parser = argparse.ArgumentParser(description="Update user profile")
    parser.add_argument("--token", required=True, help="JWT token")
    parser.add_argument("--name", help="New name")
    parser.add_argument("--team", help="New team")
    parser.add_argument("--phone", help="New phone")
    args = parser.parse_args()

    result = main(args.token, args.name, args.team, args.phone)

    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    output_file = output_dir / f"update_profile_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    output_file.write_text(json.dumps(result, ensure_ascii=False, indent=2))

    print(f"\nProfile Update Result")
    print(f"Status: {result['status']}")

    if result['status'] == 'success':
        print(f"\nUpdated User Information:")
        print(f"  ID: {result['user']['id']}")
        print(f"  Email: {result['user']['email']}")
        print(f"  Name: {result['user']['name']}")
        print(f"  Team: {result['user']['team']}")
        print(f"  Phone: {result['user']['phone']}")
    else:
        print(f"\nError:")
        print(f"  Code: {result['error']['code']}")
        print(f"  Type: {result['error']['type']}")
        print(f"  Message: {result['error']['message']}")
        if result['error']['details']:
            print(f"  Details: {result['error']['details']}")

    print(f"\nSaved: {output_file}")
