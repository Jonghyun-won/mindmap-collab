import argparse
import json
from pathlib import Path
from datetime import datetime
from uuid import UUID
from conn import get_db_connection
from utils.auth_helper import verify_jwt_token
from chapters.model import Chapter, ReorderChaptersRequest


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


def reorder_chapters(token: str, mindmap_id: str, request: ReorderChaptersRequest) -> list[dict]:
    """Reorder chapters atomically."""
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

    # Verify all chapter_ids belong to this mindmap
    cursor.execute(
        "SELECT id FROM chapters WHERE mindmap_id = %s",
        (mindmap_id,)
    )
    existing_ids = {row[0] for row in cursor.fetchall()}
    requested_ids = {uuid for uuid in request.chapter_ids}

    if existing_ids != requested_ids:
        cursor.close()
        conn.close()
        raise ValueError("Chapter IDs do not match existing chapters for this mindmap")

    # Atomic reorder using transaction
    # Step 1: Set all positions to negative temporary values to avoid unique constraint conflicts
    for idx, chapter_id in enumerate(request.chapter_ids):
        cursor.execute(
            "UPDATE chapters SET position = %s WHERE id = %s AND mindmap_id = %s",
            (-(idx + 1), str(chapter_id), mindmap_id)
        )

    # Step 2: Set final positions (1-indexed)
    for idx, chapter_id in enumerate(request.chapter_ids):
        cursor.execute(
            "UPDATE chapters SET position = %s, updated_at = NOW() WHERE id = %s AND mindmap_id = %s",
            (idx + 1, str(chapter_id), mindmap_id)
        )

    # Fetch updated chapters
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

    conn.commit()
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


def main(token: str, mindmap_id: str, chapter_ids: list[str]) -> dict:
    request = ReorderChaptersRequest(chapter_ids=[UUID(cid) for cid in chapter_ids])
    result = reorder_chapters(token, mindmap_id, request)
    return {"chapters": result}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Reorder chapters")
    parser.add_argument("--token", required=True, help="JWT access token")
    parser.add_argument("--mindmap-id", required=True, help="Mind map UUID")
    parser.add_argument("--chapter-ids", required=True, nargs="+", help="Ordered list of chapter UUIDs")
    args = parser.parse_args()

    result = main(args.token, args.mindmap_id, args.chapter_ids)

    # Save to output folder
    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    output_file = output_dir / f"reorder_chapters_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    output_file.write_text(json.dumps(result, ensure_ascii=False, indent=2))
    print(f"Saved: {output_file}")
