import argparse
import json
from pathlib import Path
from datetime import datetime
from uuid import UUID
from conn import get_db_connection
from utils.auth_helper import verify_jwt_token
from utils.validation import validate_chapter_title
from chapters.model import Chapter, CreateChapterRequest


def _check_edit_permission(cursor, mindmap_id: str, user_id: str) -> None:
    """Check if user has edit/admin permission on the mindmap."""
    # Check if owner
    cursor.execute(
        "SELECT 1 FROM mindmaps WHERE id = %s AND owner_id = %s",
        (mindmap_id, user_id)
    )
    if cursor.fetchone():
        return

    # Check if collaborator with edit or admin permission
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


def create_chapter(token: str, mindmap_id: str, request: CreateChapterRequest) -> dict:
    """Create new chapter with next position."""
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

    # Validate title
    title = validate_chapter_title(request.title)

    # Get next position
    cursor.execute(
        "SELECT COALESCE(MAX(position), 0) + 1 FROM chapters WHERE mindmap_id = %s",
        (mindmap_id,)
    )
    next_position = cursor.fetchone()[0]

    # Insert chapter
    cursor.execute(
        """
        INSERT INTO chapters (mindmap_id, title, position)
        VALUES (%s, %s, %s)
        RETURNING id, mindmap_id, title, position, created_at, updated_at
        """,
        (mindmap_id, title, next_position)
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


def main(token: str, mindmap_id: str, title: str) -> dict:
    request = CreateChapterRequest(title=title)
    result = create_chapter(token, mindmap_id, request)
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create a new chapter")
    parser.add_argument("--token", required=True, help="JWT access token")
    parser.add_argument("--mindmap-id", required=True, help="Mind map UUID")
    parser.add_argument("--title", required=True, help="Chapter title")
    args = parser.parse_args()

    result = main(args.token, args.mindmap_id, args.title)

    # Save to output folder
    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    output_file = output_dir / f"create_chapter_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    output_file.write_text(json.dumps(result, ensure_ascii=False, indent=2))
    print(f"Saved: {output_file}")
