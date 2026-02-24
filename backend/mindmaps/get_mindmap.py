import argparse
import json
from pathlib import Path
from datetime import datetime
from fastapi import HTTPException
from conn import get_db_connection
from utils.auth_helper import verify_jwt_token
from mindmaps.model import MindMapDetail, User


def get_mindmap(token: str, mindmap_id: str) -> dict:
    payload = verify_jwt_token(token)
    user_id = payload["user_id"]

    conn = get_db_connection()
    cursor = conn.cursor()

    # Query mind map with owner info
    cursor.execute("""
        SELECT
            m.id,
            m.title,
            m.owner_id,
            m.created_at,
            m.updated_at,
            u.id as owner_id,
            u.email as owner_email,
            u.name as owner_name,
            u.created_at as owner_created_at
        FROM mindmaps m
        JOIN public.users u ON m.owner_id = u.id
        WHERE m.id = %s
    """, (mindmap_id,))

    row = cursor.fetchone()

    if not row:
        cursor.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Mind map not found")

    mindmap_db_id, title, owner_id, created_at, updated_at, owner_id, owner_email, owner_name, owner_created_at = row

    # Check access control: user must be owner OR collaborator
    cursor.execute("""
        SELECT 1 FROM collaborators
        WHERE mindmap_id = %s AND user_id = %s
    """, (mindmap_id, user_id))

    is_collaborator = cursor.fetchone() is not None
    is_owner = str(owner_id) == str(user_id)

    if not is_owner and not is_collaborator:
        cursor.close()
        conn.close()
        raise HTTPException(status_code=403, detail="You do not have access to this mind map")

    # Get current user's permission
    current_user_permission = None
    if is_owner:
        current_user_permission = "owner"
    else:
        cursor.execute("""
            SELECT permission FROM collaborators
            WHERE mindmap_id = %s AND user_id = %s
        """, (mindmap_id, user_id))
        perm_row = cursor.fetchone()
        if perm_row:
            current_user_permission = perm_row[0]

    # Count collaborators
    cursor.execute("""
        SELECT COUNT(*) FROM collaborators WHERE mindmap_id = %s
    """, (mindmap_id,))

    collaborators_count = cursor.fetchone()[0]

    cursor.close()
    conn.close()

    # Create owner User object
    owner = User(
        id=owner_id,
        email=owner_email,
        name=owner_name,
        created_at=owner_created_at
    )

    # Create MindMapDetail object
    mindmap_detail = MindMapDetail(
        id=mindmap_db_id,
        title=title,
        owner_id=owner_id,
        created_at=created_at,
        updated_at=updated_at,
        owner=owner,
        collaborators_count=collaborators_count,
        current_user_permission=current_user_permission
    )

    return mindmap_detail.model_dump(mode='json')


def main(token: str, mindmap_id: str) -> dict:
    result = get_mindmap(token, mindmap_id)
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Get mind map details")
    parser.add_argument("--token", required=True, help="JWT token")
    parser.add_argument("--id", required=True, help="Mind map UUID")
    args = parser.parse_args()

    result = main(args.token, args.id)

    # Save to output folder
    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    output_file = output_dir / f"get_mindmap_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    output_file.write_text(json.dumps(result, ensure_ascii=False, indent=2, default=str))
    print(f"Saved: {output_file}")
