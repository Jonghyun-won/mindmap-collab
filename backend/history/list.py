import argparse
import json
from pathlib import Path
from datetime import datetime

from conn import get_db_connection
from utils.auth_helper import verify_jwt_token
from history.model import ChangeRecord, ChangeHistoryResponse


def list_changes(token: str, mindmap_id: str, page: int = 1, limit: int = 50) -> dict:
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

    # Get total count
    cursor.execute("""
        SELECT COUNT(*) FROM mindmap_changes WHERE mindmap_id = %s
    """, (mindmap_id,))
    total = cursor.fetchone()[0]

    # Get paginated changes with user info
    offset = (page - 1) * limit
    cursor.execute("""
        SELECT mc.id, mc.mindmap_id, mc.user_id, mc.action, mc.node_id,
               mc.details, mc.created_at, u.name
        FROM mindmap_changes mc
        JOIN users u ON mc.user_id = u.id
        WHERE mc.mindmap_id = %s
        ORDER BY mc.created_at DESC
        LIMIT %s OFFSET %s
    """, (mindmap_id, limit, offset))

    rows = cursor.fetchall()

    cursor.close()
    conn.close()

    changes = []
    for row in rows:
        change = ChangeRecord(
            id=row[0],
            mindmap_id=row[1],
            user_id=row[2],
            action=row[3],
            node_id=row[4],
            details=row[5],
            created_at=row[6],
            user_name=row[7]
        )
        changes.append(change)

    response = ChangeHistoryResponse(
        changes=changes,
        total=total,
        page=page,
        limit=limit
    )
    return response.model_dump(mode='json')


def main(token: str, mindmap_id: str, page: int = 1, limit: int = 50) -> dict:
    return list_changes(token, mindmap_id, page, limit)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="List change history for a mindmap")
    parser.add_argument("--token", required=True, help="JWT token")
    parser.add_argument("--mindmap-id", required=True, help="Mind map UUID")
    parser.add_argument("--page", type=int, default=1, help="Page number")
    parser.add_argument("--limit", type=int, default=50, help="Items per page")
    args = parser.parse_args()

    result = main(args.token, args.mindmap_id, args.page, args.limit)

    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    output_file = output_dir / f"list_changes_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    output_file.write_text(json.dumps(result, ensure_ascii=False, indent=2, default=str))
    print(f"Saved: {output_file}")
