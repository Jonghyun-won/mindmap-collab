import argparse
import json
from pathlib import Path
from datetime import datetime

from conn import get_db_connection
from utils.auth_helper import verify_jwt_token


def delete_invite(token: str, mindmap_id: str, invite_id: str) -> dict:
    payload = verify_jwt_token(token)
    user_id = payload["user_id"]

    conn = get_db_connection()
    cursor = conn.cursor()

    # Only owner or admin can delete invite links
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
            raise PermissionError("Only owner or admin can delete invite links")

    # Delete invite link
    cursor.execute("""
        DELETE FROM invite_links
        WHERE id = %s AND mindmap_id = %s
    """, (invite_id, mindmap_id))

    if cursor.rowcount == 0:
        cursor.close()
        conn.close()
        raise ValueError("Invite link not found")

    conn.commit()
    cursor.close()
    conn.close()

    return {"message": "Invite link revoked"}


def main(token: str, mindmap_id: str, invite_id: str) -> dict:
    return delete_invite(token, mindmap_id, invite_id)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Revoke an invite link")
    parser.add_argument("--token", required=True, help="JWT token")
    parser.add_argument("--mindmap-id", required=True, help="Mind map UUID")
    parser.add_argument("--invite-id", required=True, help="Invite link UUID")
    args = parser.parse_args()

    result = main(args.token, args.mindmap_id, args.invite_id)

    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    output_file = output_dir / f"delete_invite_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    output_file.write_text(json.dumps(result, ensure_ascii=False, indent=2, default=str))
    print(f"Saved: {output_file}")
