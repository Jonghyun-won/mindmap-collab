import argparse
import json
from pathlib import Path
from datetime import datetime

from conn import get_db_connection
from utils.auth_helper import verify_jwt_token
from comments.model import Comment, CommentListResponse


def list_comments(token: str, mindmap_id: str, node_id: str) -> dict:
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

    # Get comments with user info
    cursor.execute("""
        SELECT c.id, c.mindmap_id, c.node_id, c.user_id, c.content,
               c.created_at, c.updated_at, u.name, u.email
        FROM node_comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.mindmap_id = %s AND c.node_id = %s
        ORDER BY c.created_at ASC
    """, (mindmap_id, node_id))

    rows = cursor.fetchall()

    # Get total count
    total = len(rows)

    cursor.close()
    conn.close()

    comments = []
    for row in rows:
        comment = Comment(
            id=row[0],
            mindmap_id=row[1],
            node_id=row[2],
            user_id=row[3],
            content=row[4],
            created_at=row[5],
            updated_at=row[6],
            user_name=row[7],
            user_email=row[8]
        )
        comments.append(comment)

    response = CommentListResponse(comments=comments, total=total)
    return response.model_dump(mode='json')


def main(token: str, mindmap_id: str, node_id: str) -> dict:
    return list_comments(token, mindmap_id, node_id)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="List comments for a node")
    parser.add_argument("--token", required=True, help="JWT token")
    parser.add_argument("--mindmap-id", required=True, help="Mind map UUID")
    parser.add_argument("--node-id", required=True, help="Node ID")
    args = parser.parse_args()

    result = main(args.token, args.mindmap_id, args.node_id)

    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    output_file = output_dir / f"list_comments_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    output_file.write_text(json.dumps(result, ensure_ascii=False, indent=2, default=str))
    print(f"Saved: {output_file}")
