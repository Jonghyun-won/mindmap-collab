import argparse
from uuid import UUID
from datetime import datetime
from pathlib import Path
import json
from conn import get_db_connection
from utils.auth_helper import verify_jwt_token
from jose import JWTError


def update_snapshot(token: str, mindmap_id: str, yjs_state: bytes) -> dict:
    payload = verify_jwt_token(token)
    user_id = payload["user_id"]

    conn = get_db_connection()
    cursor = conn.cursor()

    # Check if mindmap exists and user has edit/admin permission
    cursor.execute("""
        SELECT mm.owner_id, c.permission
        FROM mindmaps mm
        LEFT JOIN collaborators c ON mm.id = c.mindmap_id AND c.user_id = %s
        WHERE mm.id = %s
    """, (user_id, mindmap_id))

    result = cursor.fetchone()

    if not result:
        cursor.close()
        conn.close()
        raise ValueError("MindMap not found")

    owner_id, permission = result

    # Check permission: must be owner or have edit/admin access
    is_owner = str(owner_id) == user_id
    has_edit_access = permission in ("edit", "admin") if permission else False

    if not (is_owner or has_edit_access):
        cursor.close()
        conn.close()
        raise PermissionError("User does not have edit access")

    # Update yjs_state and updated_at
    cursor.execute("""
        UPDATE mindmaps
        SET yjs_state = %s, updated_at = NOW()
        WHERE id = %s
    """, (yjs_state, mindmap_id))

    conn.commit()
    cursor.close()
    conn.close()

    return {"message": "Snapshot updated successfully"}


def main(token: str, mindmap_id: str, file_path: str) -> dict:
    # Read binary data from file
    file = Path(file_path)
    yjs_state = file.read_bytes()

    result = update_snapshot(token, mindmap_id, yjs_state)
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Update MindMap Yjs snapshot")
    parser.add_argument("--token", required=True, help="JWT token")
    parser.add_argument("--id", required=True, help="MindMap ID")
    parser.add_argument("--file", required=True, help="Path to binary Yjs state file")
    args = parser.parse_args()

    try:
        result = main(args.token, args.id, args.file)

        # Save to output folder
        output_dir = Path(__file__).parent / "output"
        output_dir.mkdir(exist_ok=True)
        output_file = output_dir / f"update_snapshot_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        output_file.write_text(json.dumps(result, ensure_ascii=False, indent=2))
        print(f"Saved: {output_file}")

    except JWTError:
        print("Error: Invalid token (401)")
        exit(1)
    except PermissionError as e:
        print(f"Error: {str(e)} (403)")
        exit(1)
    except ValueError as e:
        print(f"Error: {str(e)} (404)")
        exit(1)
    except FileNotFoundError:
        print(f"Error: File not found: {args.file}")
        exit(1)
    except Exception as e:
        print(f"Error: {str(e)} (500)")
        exit(1)
