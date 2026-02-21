import argparse
import json
from pathlib import Path
from datetime import datetime

from conn import get_db_connection
from utils.auth_helper import verify_jwt_token
from history.model import ChangeRecord, CreateChangeRequest
from psycopg2.extras import Json


def create_change(token: str, mindmap_id: str, request: CreateChangeRequest) -> dict:
    payload = verify_jwt_token(token)
    user_id = payload["user_id"]

    conn = get_db_connection()
    cursor = conn.cursor()

    # Verify user has access to this mindmap
    cursor.execute("""
        SELECT owner_id FROM mindmaps WHERE id = %s
    """, (mindmap_id,))

    mindmap_row = cursor.fetchone()
    if not mindmap_row:
        cursor.close()
        conn.close()
        raise ValueError("Mind map not found")

    is_owner = str(mindmap_row[0]) == str(user_id)

    if not is_owner:
        cursor.execute("""
            SELECT 1 FROM collaborators WHERE mindmap_id = %s AND user_id = %s
        """, (mindmap_id, user_id))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            raise PermissionError("Access denied")

    # Insert change record
    cursor.execute("""
        INSERT INTO mindmap_changes (mindmap_id, user_id, action, node_id, details)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id, mindmap_id, user_id, action, node_id, details, created_at
    """, (mindmap_id, user_id, request.action, request.node_id, Json(request.details) if request.details else None))

    row = cursor.fetchone()
    conn.commit()

    # Get user name
    cursor.execute("SELECT name FROM users WHERE id = %s", (user_id,))
    user_row = cursor.fetchone()

    cursor.close()
    conn.close()

    change = ChangeRecord(
        id=row[0],
        mindmap_id=row[1],
        user_id=row[2],
        action=row[3],
        node_id=row[4],
        details=row[5],
        created_at=row[6],
        user_name=user_row[0] if user_row else None
    )

    return change.model_dump(mode='json')


def main(token: str, mindmap_id: str, action: str, node_id: str = None, details: str = None) -> dict:
    details_dict = json.loads(details) if details else None
    request = CreateChangeRequest(action=action, node_id=node_id, details=details_dict)
    return create_change(token, mindmap_id, request)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Record a change in mindmap history")
    parser.add_argument("--token", required=True, help="JWT token")
    parser.add_argument("--mindmap-id", required=True, help="Mind map UUID")
    parser.add_argument("--action", required=True, help="Action type (e.g. add_node, delete_node)")
    parser.add_argument("--node-id", help="Node ID")
    parser.add_argument("--details", help="JSON details string")
    args = parser.parse_args()

    result = main(args.token, args.mindmap_id, args.action, args.node_id, args.details)

    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    output_file = output_dir / f"create_change_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    output_file.write_text(json.dumps(result, ensure_ascii=False, indent=2, default=str))
    print(f"Saved: {output_file}")
