import argparse
import json
from pathlib import Path
from datetime import datetime
from uuid import UUID
from conn import get_db_connection
from utils.auth_helper import verify_jwt_token
from utils.validation import validate_chapter_title
from chapters.model import Chapter, UpdateChapterRequest


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


def update_chapter(token: str, mindmap_id: str, chapter_id: str, request: UpdateChapterRequest) -> dict:
    """Update chapter title."""
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

    # Validate title if provided
    title = validate_chapter_title(request.title) if request.title is not None else None

    # Update chapter
    cursor.execute(
        """
        UPDATE chapters
        SET title = COALESCE(%s, title), updated_at = NOW()
        WHERE id = %s AND mindmap_id = %s
        RETURNING id, mindmap_id, title, position, created_at, updated_at
        """,
        (title, chapter_id, mindmap_id)
    )
    row = cursor.fetchone()

    conn.commit()
    cursor.close()
    conn.close()

    return Chapter(
        id=row[0],
        mindmap_id=row[1],
        title=row[2],
        position=row[3],
        created_at=row[4],
        updated_at=row[5]
    ).model_dump(mode="json")


def main(token: str, mindmap_id: str, chapter_id: str, title: str) -> dict:
    request = UpdateChapterRequest(title=title)
    result = update_chapter(token, mindmap_id, chapter_id, request)
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Update chapter title")
    parser.add_argument("--token", required=True, help="JWT access token")
    parser.add_argument("--mindmap-id", required=True, help="Mind map UUID")
    parser.add_argument("--chapter-id", required=True, help="Chapter UUID")
    parser.add_argument("--title", required=True, help="New chapter title")
    args = parser.parse_args()

    result = main(args.token, args.mindmap_id, args.chapter_id, args.title)

    # Save to output folder
    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    output_file = output_dir / f"update_chapter_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    output_file.write_text(json.dumps(result, ensure_ascii=False, indent=2))
    print(f"Saved: {output_file}")
