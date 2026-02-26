import argparse
import json
from pathlib import Path
from datetime import datetime
from uuid import UUID
import psycopg2
from conn import get_db_connection
from utils.auth_helper import verify_jwt_token
from chapters.model import Chapter


def duplicate_chapter(token: str, mindmap_id: str, chapter_id: str) -> dict:
    """Duplicate chapter with yjs_state."""
    payload = verify_jwt_token(token)
    user_id = payload["user_id"]

    conn = get_db_connection()
    cursor = conn.cursor()

    # Check edit/admin permission
    cursor.execute(
        """
        SELECT 1 FROM mindmaps m
        WHERE m.id = %s
        AND (
            m.owner_id = %s
            OR EXISTS (
                SELECT 1 FROM collaborators c
                WHERE c.mindmap_id = m.id
                AND c.user_id = %s
                AND c.permission IN ('edit', 'admin')
            )
        )
        """,
        (mindmap_id, user_id, user_id)
    )

    if not cursor.fetchone():
        cursor.close()
        conn.close()
        raise PermissionError("You do not have edit permission for this mindmap")

    # Get original chapter
    cursor.execute(
        """
        SELECT id, title, position, yjs_state
        FROM chapters
        WHERE id = %s AND mindmap_id = %s
        """,
        (chapter_id, mindmap_id)
    )

    original = cursor.fetchone()
    if not original:
        cursor.close()
        conn.close()
        raise ValueError("Chapter not found")

    original_title = original[1]
    original_yjs_state = original[3]

    # Get next position
    cursor.execute(
        "SELECT COALESCE(MAX(position), 0) + 1 FROM chapters WHERE mindmap_id = %s",
        (mindmap_id,)
    )
    next_position = cursor.fetchone()[0]

    # Duplicate title
    duplicate_title = f"{original_title} (복사본)"

    # Wrap yjs_state as Binary for BYTEA column
    yjs_binary = None
    if original_yjs_state is not None:
        yjs_binary = psycopg2.Binary(bytes(original_yjs_state))

    # Insert duplicated chapter
    cursor.execute(
        """
        INSERT INTO chapters (mindmap_id, title, position, yjs_state)
        VALUES (%s, %s, %s, %s)
        RETURNING id, mindmap_id, title, position, created_at, updated_at
        """,
        (mindmap_id, duplicate_title, next_position, yjs_binary)
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


def main(token: str, mindmap_id: str, chapter_id: str) -> dict:
    result = duplicate_chapter(token, mindmap_id, chapter_id)
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Duplicate chapter")
    parser.add_argument("--token", required=True, help="JWT token")
    parser.add_argument("--mindmap-id", required=True, help="Mindmap UUID")
    parser.add_argument("--chapter-id", required=True, help="Chapter UUID")
    args = parser.parse_args()

    result = main(args.token, args.mindmap_id, args.chapter_id)

    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    output_file = output_dir / f"duplicate_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    output_file.write_text(json.dumps(result, ensure_ascii=False, indent=2))
    print(f"Saved: {output_file}")
