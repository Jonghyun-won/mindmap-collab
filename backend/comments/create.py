import argparse
import json
from pathlib import Path
from datetime import datetime

from conn import get_db_connection
from utils.auth_helper import verify_jwt_token
from comments.model import Comment, CreateCommentRequest


def create_comment(token: str, mindmap_id: str, node_id: str, request: CreateCommentRequest) -> dict:
    payload = verify_jwt_token(token)
    user_id = payload["user_id"]

    conn = get_db_connection()
    cursor = conn.cursor()

    # Verify user has access to this mindmap (owner or collaborator)
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

    # Insert comment
    cursor.execute("""
        INSERT INTO node_comments (mindmap_id, node_id, user_id, content)
        VALUES (%s, %s, %s, %s)
        RETURNING id, mindmap_id, node_id, user_id, content, created_at, updated_at
    """, (mindmap_id, node_id, user_id, request.content))

    row = cursor.fetchone()
    conn.commit()

    # Get user info
    cursor.execute("SELECT name, email FROM users WHERE id = %s", (user_id,))
    user_row = cursor.fetchone()

    cursor.close()
    conn.close()

    comment = Comment(
        id=row[0],
        mindmap_id=row[1],
        node_id=row[2],
        user_id=row[3],
        content=row[4],
        created_at=row[5],
        updated_at=row[6],
        user_name=user_row[0] if user_row else None,
        user_email=user_row[1] if user_row else None
    )

    return comment.model_dump(mode='json')


def main(token: str, mindmap_id: str, node_id: str, content: str) -> dict:
    request = CreateCommentRequest(content=content)
    return create_comment(token, mindmap_id, node_id, request)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create a comment on a node")
    parser.add_argument("--token", required=True, help="JWT token")
    parser.add_argument("--mindmap-id", required=True, help="Mind map UUID")
    parser.add_argument("--node-id", required=True, help="Node ID")
    parser.add_argument("--content", required=True, help="Comment content")
    args = parser.parse_args()

    result = main(args.token, args.mindmap_id, args.node_id, args.content)

    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    output_file = output_dir / f"create_comment_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    output_file.write_text(json.dumps(result, ensure_ascii=False, indent=2, default=str))
    print(f"Saved: {output_file}")
