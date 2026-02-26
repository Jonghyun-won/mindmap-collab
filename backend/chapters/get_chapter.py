import argparse
import json
import base64
from pathlib import Path
from datetime import datetime
from conn import get_db_connection
from utils.auth_helper import verify_jwt_token
from chapters.model import ChapterDetail


def _check_mindmap_access(cursor, mindmap_id: str, user_id: str) -> None:
    """Check if user has access to the mindmap (owner or collaborator)."""
    cursor.execute(
        "SELECT 1 FROM mindmaps WHERE id = %s AND owner_id = %s",
        (mindmap_id, user_id)
    )
    if cursor.fetchone():
        return

    cursor.execute(
        "SELECT 1 FROM collaborators WHERE mindmap_id = %s AND user_id = %s",
        (mindmap_id, user_id)
    )
    if cursor.fetchone():
        return

    raise PermissionError("You do not have access to this mind map")


def get_chapter(token: str, mindmap_id: str, chapter_id: str) -> dict:
    """Get chapter with yjs_state (base64 encoded)."""
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

    # Get chapter with yjs_state
    cursor.execute(
        """
        SELECT id, mindmap_id, title, position, yjs_state, created_at, updated_at
        FROM chapters
        WHERE id = %s AND mindmap_id = %s
        """,
        (chapter_id, mindmap_id)
    )
    row = cursor.fetchone()

    cursor.close()
    conn.close()

    if not row:
        raise ValueError("Chapter not found")

    # Encode yjs_state to base64 if exists
    yjs_state_base64 = None
    if row[4] is not None:
        yjs_state_base64 = base64.b64encode(bytes(row[4])).decode('utf-8')

    return ChapterDetail(
        id=row[0],
        mindmap_id=row[1],
        title=row[2],
        position=row[3],
        yjs_state=yjs_state_base64,
        created_at=row[5],
        updated_at=row[6]
    ).model_dump(mode="json")


def main(token: str, mindmap_id: str, chapter_id: str) -> dict:
    result = get_chapter(token, mindmap_id, chapter_id)
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Get chapter details with yjs_state")
    parser.add_argument("--token", required=True, help="JWT access token")
    parser.add_argument("--mindmap-id", required=True, help="Mind map UUID")
    parser.add_argument("--chapter-id", required=True, help="Chapter UUID")
    args = parser.parse_args()

    result = main(args.token, args.mindmap_id, args.chapter_id)

    # Save to output folder
    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    output_file = output_dir / f"get_chapter_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    output_file.write_text(json.dumps(result, ensure_ascii=False, indent=2, default=str))
    print(f"Saved: {output_file}")
