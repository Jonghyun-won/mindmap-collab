import argparse
import json
from pathlib import Path
from datetime import datetime
from uuid import UUID
from conn import get_db_connection
from utils.auth_helper import verify_jwt_token
from chapters.model import Chapter


def _check_mindmap_access(cursor, mindmap_id: str, user_id: str) -> None:
    """Check if user has access to the mindmap (owner or collaborator)."""
    cursor.execute(
        """
        SELECT 1 FROM mindmaps
        WHERE id = %s AND owner_id = %s
        """,
        (mindmap_id, user_id)
    )
    if cursor.fetchone():
        return

    cursor.execute(
        """
        SELECT 1 FROM collaborators
        WHERE mindmap_id = %s AND user_id = %s
        """,
        (mindmap_id, user_id)
    )
    if cursor.fetchone():
        return

    raise PermissionError("You do not have access to this mind map")


def list_chapters(token: str, mindmap_id: str) -> list[dict]:
    """List all chapters for a mindmap, ordered by position."""
    payload = verify_jwt_token(token)
    user_id = payload["user_id"]

    conn = get_db_connection()
    cursor = conn.cursor()

    # Check mindmap exists
    cursor.execute("SELECT id FROM mindmaps WHERE id = %s", (mindmap_id,))
    if not cursor.fetchone():
        cursor.close()
        conn.close()
        raise ValueError("Mind map not found")

    # Check access
    _check_mindmap_access(cursor, mindmap_id, user_id)

    # Get chapters ordered by position
    cursor.execute(
        """
        SELECT id, mindmap_id, title, position, created_at, updated_at
        FROM chapters
        WHERE mindmap_id = %s
        ORDER BY position ASC
        """,
        (mindmap_id,)
    )
    rows = cursor.fetchall()

    cursor.close()
    conn.close()

    return [
        Chapter(
            id=row[0],
            mindmap_id=row[1],
            title=row[2],
            position=row[3],
            created_at=row[4],
            updated_at=row[5]
        ).model_dump(mode="json")
        for row in rows
    ]


def main(token: str, mindmap_id: str) -> dict:
    result = list_chapters(token, mindmap_id)
    return {"chapters": result}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="List chapters for a mindmap")
    parser.add_argument("--token", required=True, help="JWT access token")
    parser.add_argument("--mindmap-id", required=True, help="Mind map UUID")
    args = parser.parse_args()

    result = main(args.token, args.mindmap_id)

    # Save to output folder
    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    output_file = output_dir / f"list_chapters_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    output_file.write_text(json.dumps(result, ensure_ascii=False, indent=2))
    print(f"Saved: {output_file}")
