import argparse
import json
from pathlib import Path
from datetime import datetime, timezone

from conn import get_db_connection
from utils.auth_helper import verify_jwt_token


def accept_invite(token: str, invite_token: str) -> dict:
    payload = verify_jwt_token(token)
    user_id = payload["user_id"]

    conn = get_db_connection()
    cursor = conn.cursor()

    # Find invite link by token
    cursor.execute("""
        SELECT id, mindmap_id, permission, expires_at, max_uses, use_count
        FROM invite_links
        WHERE token = %s
    """, (invite_token,))

    row = cursor.fetchone()
    if not row:
        cursor.close()
        conn.close()
        raise ValueError("Invite link not found")

    invite_id, mindmap_id, permission, expires_at, max_uses, use_count = row

    # Check if expired
    if expires_at and expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        cursor.close()
        conn.close()
        raise ValueError("Invite link has expired")

    # Check max uses
    if max_uses and use_count >= max_uses:
        cursor.close()
        conn.close()
        raise ValueError("Invite link has reached maximum uses")

    # Check if user is already owner
    cursor.execute("""
        SELECT owner_id FROM mindmaps WHERE id = %s
    """, (mindmap_id,))
    mindmap_row = cursor.fetchone()
    if not mindmap_row:
        cursor.close()
        conn.close()
        raise ValueError("Mind map not found")

    if str(mindmap_row[0]) == str(user_id):
        cursor.close()
        conn.close()
        raise ValueError("You are already the owner of this mind map")

    # Check if user is already a collaborator
    cursor.execute("""
        SELECT id FROM collaborators WHERE mindmap_id = %s AND user_id = %s
    """, (mindmap_id, user_id))

    if cursor.fetchone():
        # Already a collaborator - increment use_count anyway and return
        cursor.execute("""
            UPDATE invite_links SET use_count = use_count + 1 WHERE id = %s
        """, (invite_id,))
        conn.commit()
        cursor.close()
        conn.close()
        return {"mindmap_id": str(mindmap_id), "permission": permission, "message": "Already a collaborator"}

    # Add user as collaborator
    cursor.execute("""
        INSERT INTO collaborators (mindmap_id, user_id, permission)
        VALUES (%s, %s, %s)
    """, (mindmap_id, user_id, permission))

    # Increment use_count
    cursor.execute("""
        UPDATE invite_links SET use_count = use_count + 1 WHERE id = %s
    """, (invite_id,))

    conn.commit()
    cursor.close()
    conn.close()

    return {"mindmap_id": str(mindmap_id), "permission": permission}


def main(token: str, invite_token: str) -> dict:
    return accept_invite(token, invite_token)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Accept an invite link")
    parser.add_argument("--token", required=True, help="JWT token")
    parser.add_argument("--invite-token", required=True, help="Invite token string")
    args = parser.parse_args()

    result = main(args.token, args.invite_token)

    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    output_file = output_dir / f"accept_invite_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    output_file.write_text(json.dumps(result, ensure_ascii=False, indent=2, default=str))
    print(f"Saved: {output_file}")
