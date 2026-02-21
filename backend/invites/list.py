import argparse
import json
from pathlib import Path
from datetime import datetime

from conn import get_db_connection
from utils.auth_helper import verify_jwt_token
from invites.model import InviteLink, InviteListResponse


def list_invites(token: str, mindmap_id: str) -> dict:
    payload = verify_jwt_token(token)
    user_id = payload["user_id"]

    conn = get_db_connection()
    cursor = conn.cursor()

    # Only owner or admin can list invite links
    cursor.execute("""
        SELECT owner_id FROM mindmaps WHERE id = %s
    """, (mindmap_id,))

    mindmap_row = cursor.fetchone()
    if not mindmap_row:
        cursor.close()
        conn.close()
        raise ValueError("Mind map not found")

    is_owner = str(mindmap_row[0]) == str(user_id)

    if not is_owner:
        cursor.execute("""
            SELECT permission FROM collaborators WHERE mindmap_id = %s AND user_id = %s
        """, (mindmap_id, user_id))
        perm_row = cursor.fetchone()
        if not perm_row or perm_row[0] != 'admin':
            cursor.close()
            conn.close()
            raise PermissionError("Only owner or admin can list invite links")

    # Get all invite links for this mindmap
    cursor.execute("""
        SELECT id, mindmap_id, token, permission, created_by,
               expires_at, max_uses, use_count, created_at
        FROM invite_links
        WHERE mindmap_id = %s
        ORDER BY created_at DESC
    """, (mindmap_id,))

    rows = cursor.fetchall()

    cursor.close()
    conn.close()

    invites = []
    for row in rows:
        invite = InviteLink(
            id=row[0],
            mindmap_id=row[1],
            token=row[2],
            permission=row[3],
            created_by=row[4],
            expires_at=row[5],
            max_uses=row[6],
            use_count=row[7],
            created_at=row[8]
        )
        invites.append(invite)

    response = InviteListResponse(invites=invites)
    return response.model_dump(mode='json')


def main(token: str, mindmap_id: str) -> dict:
    return list_invites(token, mindmap_id)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="List invite links for a mindmap")
    parser.add_argument("--token", required=True, help="JWT token")
    parser.add_argument("--mindmap-id", required=True, help="Mind map UUID")
    args = parser.parse_args()

    result = main(args.token, args.mindmap_id)

    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    output_file = output_dir / f"list_invites_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    output_file.write_text(json.dumps(result, ensure_ascii=False, indent=2, default=str))
    print(f"Saved: {output_file}")
