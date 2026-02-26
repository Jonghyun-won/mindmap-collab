import argparse
import json
from pathlib import Path
from datetime import datetime
from uuid import UUID
from conn import get_db_connection
from utils.auth_helper import verify_jwt_token
from mindmaps.model import UpdateMindMapRequest, MindMap


def update_mindmap(token: str, mindmap_id: str, request: UpdateMindMapRequest) -> MindMap:
    """Update mind map metadata (title only)."""

    # Verify JWT and extract user_id
    payload = verify_jwt_token(token)
    user_id = payload["user_id"]
    user_role = payload.get("role", "user")

    conn = get_db_connection()
    cursor = conn.cursor()

    # Check if mind map exists
    cursor.execute(
        "SELECT id, title, owner_id, created_at, updated_at FROM mindmaps WHERE id = %s",
        (mindmap_id,)
    )
    mindmap_row = cursor.fetchone()

    if not mindmap_row:
        cursor.close()
        conn.close()
        raise ValueError("Mind map not found")

    # Check permission: user must be owner OR collaborator with 'edit'/'admin' permission
    is_owner = str(mindmap_row[2]) == user_id

    if not is_owner and user_role != 'admin':
        # Check if user is a collaborator with edit or admin permission
        cursor.execute(
            """
            SELECT permission FROM collaborators
            WHERE mindmap_id = %s AND user_id = %s
            """,
            (mindmap_id, user_id)
        )
        collab_row = cursor.fetchone()

        if not collab_row or collab_row[0] not in ['edit', 'admin']:
            cursor.close()
            conn.close()
            raise PermissionError("You do not have edit permission for this mind map")

    # Update mind map metadata
    cursor.execute(
        """
        UPDATE mindmaps
        SET title = COALESCE(%s, title), updated_at = NOW()
        WHERE id = %s
        RETURNING id, title, owner_id, created_at, updated_at
        """,
        (request.title, mindmap_id)
    )
    updated_row = cursor.fetchone()

    conn.commit()
    cursor.close()
    conn.close()

    # Return updated MindMap
    return MindMap(
        id=updated_row[0],
        title=updated_row[1],
        owner_id=updated_row[2],
        created_at=updated_row[3],
        updated_at=updated_row[4]
    )


def main(token: str, id: str, title: str) -> dict:
    request = UpdateMindMapRequest(title=title)
    mindmap = update_mindmap(token, id, request)

    return {
        "id": str(mindmap.id),
        "title": mindmap.title,
        "owner_id": str(mindmap.owner_id),
        "created_at": mindmap.created_at.isoformat(),
        "updated_at": mindmap.updated_at.isoformat()
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Update mind map metadata")
    parser.add_argument("--token", required=True, help="JWT token")
    parser.add_argument("--id", required=True, help="Mind map UUID")
    parser.add_argument("--title", required=True, help="Updated title")
    args = parser.parse_args()

    result = main(args.token, args.id, args.title)

    # Save to output folder
    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    output_file = output_dir / f"update_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    output_file.write_text(json.dumps(result, ensure_ascii=False, indent=2))
    print(f"Saved: {output_file}")
