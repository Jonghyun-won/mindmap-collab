import argparse
import json
from datetime import datetime
from pathlib import Path
from uuid import UUID
from jose import JWTError

from conn import get_db_connection
from utils.auth_helper import verify_jwt_token
from mindmaps.model import CreateMindMapRequest, MindMap


def create_mindmap(token: str, request: CreateMindMapRequest) -> MindMap:
    # Verify JWT and extract user_id
    try:
        payload = verify_jwt_token(token)
        user_id = payload["user_id"]
    except JWTError:
        raise ValueError("Invalid or expired token")

    conn = get_db_connection()
    cur = conn.cursor()

    # Insert into mindmaps table with NULL yjs_state initially
    cur.execute(
        """
        INSERT INTO public.mindmaps (title, owner_id)
        VALUES (%s, %s)
        RETURNING id, title, owner_id, created_at, updated_at
        """,
        (request.title, user_id)
    )

    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    # Return created MindMap
    return MindMap(
        id=UUID(str(row[0])),
        title=row[1],
        owner_id=UUID(str(row[2])),
        created_at=row[3],
        updated_at=row[4]
    )


def main(token: str, title: str) -> dict:
    request = CreateMindMapRequest(title=title)
    mindmap = create_mindmap(token, request)

    return {
        "id": str(mindmap.id),
        "title": mindmap.title,
        "owner_id": str(mindmap.owner_id),
        "created_at": mindmap.created_at.isoformat(),
        "updated_at": mindmap.updated_at.isoformat()
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create new mind map")
    parser.add_argument("--token", required=True, help="JWT token")
    parser.add_argument("--title", required=True, help="Mind map title")
    args = parser.parse_args()

    result = main(args.token, args.title)

    # Save to output folder
    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    output_file = output_dir / f"create_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    output_file.write_text(json.dumps(result, ensure_ascii=False, indent=2))
    print(f"Saved: {output_file}")
