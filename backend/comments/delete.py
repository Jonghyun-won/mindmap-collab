import argparse
import json
from pathlib import Path
from datetime import datetime

from conn import get_db_connection
from utils.auth_helper import verify_jwt_token


def delete_comment(token: str, mindmap_id: str, node_id: str, comment_id: str) -> dict:
    payload = verify_jwt_token(token)
    user_id = payload["user_id"]

    conn = get_db_connection()
    cursor = conn.cursor()

    # Get comment to check ownership
    cursor.execute("""
        SELECT user_id FROM node_comments
        WHERE id = %s AND mindmap_id = %s AND node_id = %s
    """, (comment_id, mindmap_id, node_id))

    comment_row = cursor.fetchone()
    if not comment_row:
        cursor.close()
        conn.close()
        raise ValueError("Comment not found")

    comment_owner_id = str(comment_row[0])

    # Check if user owns the comment
    is_comment_owner = comment_owner_id == str(user_id)

    if not is_comment_owner:
        # Check if user is mindmap owner
        cursor.execute("""
            SELECT owner_id FROM mindmaps WHERE id = %s
        """, (mindmap_id,))

        mindmap_row = cursor.fetchone()
        is_mindmap_owner = mindmap_row and str(mindmap_row[0]) == str(user_id)

        if not is_mindmap_owner:
            # Check if user is admin collaborator
            cursor.execute("""
                SELECT permission FROM collaborators
                WHERE mindmap_id = %s AND user_id = %s
            """, (mindmap_id, user_id))

            perm_row = cursor.fetchone()
            if not perm_row or perm_row[0] != 'admin':
                cursor.close()
                conn.close()
                raise PermissionError("Only comment owner, mindmap owner, or admin can delete comments")

    # Delete the comment
    cursor.execute("""
        DELETE FROM node_comments
        WHERE id = %s AND mindmap_id = %s AND node_id = %s
    """, (comment_id, mindmap_id, node_id))

    conn.commit()
    cursor.close()
    conn.close()

    return {"message": "Comment deleted"}


def main(token: str, mindmap_id: str, node_id: str, comment_id: str) -> dict:
    return delete_comment(token, mindmap_id, node_id, comment_id)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Delete a comment")
    parser.add_argument("--token", required=True, help="JWT token")
    parser.add_argument("--mindmap-id", required=True, help="Mind map UUID")
    parser.add_argument("--node-id", required=True, help="Node ID")
    parser.add_argument("--comment-id", required=True, help="Comment UUID")
    args = parser.parse_args()

    result = main(args.token, args.mindmap_id, args.node_id, args.comment_id)

    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    output_file = output_dir / f"delete_comment_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    output_file.write_text(json.dumps(result, ensure_ascii=False, indent=2, default=str))
    print(f"Saved: {output_file}")
