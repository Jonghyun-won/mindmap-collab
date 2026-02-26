import argparse
import json
from pathlib import Path
from datetime import datetime
from conn import get_db_connection
from utils.auth_helper import verify_jwt_token


def _check_edit_permission(cursor, mindmap_id: str, user_id: str) -> None:
    """Check if user has edit/admin permission on the mindmap."""
    cursor.execute(
        "SELECT 1 FROM mindmaps WHERE id = %s AND owner_id = %s",
        (mindmap_id, user_id)
    )
    if cursor.fetchone():
        return

    cursor.execute(
        """
        SELECT permission FROM collaborators
        WHERE mindmap_id = %s AND user_id = %s
        """,
        (mindmap_id, user_id)
    )
    row = cursor.fetchone()
    if row and row[0] in ('edit', 'admin'):
        return

    raise PermissionError("You do not have edit permission for this mind map")


def delete_chapter(token: str, mindmap_id: str, chapter_id: str) -> None:
    """Delete chapter (prevent last chapter deletion)."""
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

    # Check edit permission
    _check_edit_permission(cursor, mindmap_id, user_id)

    # Check chapter exists
    cursor.execute(
        "SELECT id FROM chapters WHERE id = %s AND mindmap_id = %s",
        (chapter_id, mindmap_id)
    )
    if not cursor.fetchone():
        cursor.close()
        conn.close()
        raise ValueError("Chapter not found")

    # Count chapters for this mindmap
    cursor.execute(
        "SELECT COUNT(*) FROM chapters WHERE mindmap_id = %s",
        (mindmap_id,)
    )
    count = cursor.fetchone()[0]

    if count <= 1:
        cursor.close()
        conn.close()
        raise ValueError("Cannot delete the last chapter")

    # Delete the chapter
    cursor.execute(
        "DELETE FROM chapters WHERE id = %s AND mindmap_id = %s",
        (chapter_id, mindmap_id)
    )

    # Re-normalize positions (1, 2, 3, ...)
    cursor.execute(
        """
        WITH ranked AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY position ASC) as new_pos
            FROM chapters
            WHERE mindmap_id = %s
        )
        UPDATE chapters
        SET position = ranked.new_pos
        FROM ranked
        WHERE chapters.id = ranked.id
        """,
        (mindmap_id,)
    )

    conn.commit()
    cursor.close()
    conn.close()


def main(token: str, mindmap_id: str, chapter_id: str) -> dict:
    delete_chapter(token, mindmap_id, chapter_id)
    return {"message": "Chapter deleted successfully"}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Delete a chapter")
    parser.add_argument("--token", required=True, help="JWT access token")
    parser.add_argument("--mindmap-id", required=True, help="Mind map UUID")
    parser.add_argument("--chapter-id", required=True, help="Chapter UUID")
    args = parser.parse_args()

    result = main(args.token, args.mindmap_id, args.chapter_id)

    # Save to output folder
    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    output_file = output_dir / f"delete_chapter_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    output_file.write_text(json.dumps(result, ensure_ascii=False, indent=2))
    print(f"Saved: {output_file}")
