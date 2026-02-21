import argparse
import json
import secrets
from pathlib import Path
from datetime import datetime, timedelta, timezone

from conn import get_db_connection
from utils.auth_helper import verify_jwt_token
from invites.model import InviteLink, CreateInviteLinkRequest, InviteLinkResponse


def create_invite(token: str, mindmap_id: str, request: CreateInviteLinkRequest) -> dict:
    payload = verify_jwt_token(token)
    user_id = payload["user_id"]

    conn = get_db_connection()
    cursor = conn.cursor()

    # Only owner or admin can create invite links
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
            raise PermissionError("Only owner or admin can create invite links")

    # Generate unique token
    invite_token = secrets.token_urlsafe(24)

    # Calculate expiry
    expires_at = None
    if request.expires_in_hours:
        expires_at = datetime.now(timezone.utc) + timedelta(hours=request.expires_in_hours)

    # Insert invite link
    cursor.execute("""
        INSERT INTO invite_links (mindmap_id, token, permission, created_by, expires_at, max_uses)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING id, mindmap_id, token, permission, created_by, expires_at, max_uses, use_count, created_at
    """, (mindmap_id, invite_token, request.permission, user_id, expires_at, request.max_uses))

    row = cursor.fetchone()
    conn.commit()

    cursor.close()
    conn.close()

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

    response = InviteLinkResponse(
        invite=invite,
        url=f"/invite/{invite_token}"
    )
    return response.model_dump(mode='json')


def main(token: str, mindmap_id: str, permission: str = "view", expires_in_hours: int = None, max_uses: int = None) -> dict:
    request = CreateInviteLinkRequest(
        permission=permission,
        expires_in_hours=expires_in_hours,
        max_uses=max_uses
    )
    return create_invite(token, mindmap_id, request)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create an invite link for a mindmap")
    parser.add_argument("--token", required=True, help="JWT token")
    parser.add_argument("--mindmap-id", required=True, help="Mind map UUID")
    parser.add_argument("--permission", default="view", help="Permission level (view/edit/admin)")
    parser.add_argument("--expires-in-hours", type=int, help="Expiry in hours")
    parser.add_argument("--max-uses", type=int, help="Maximum number of uses")
    args = parser.parse_args()

    result = main(args.token, args.mindmap_id, args.permission, args.expires_in_hours, args.max_uses)

    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    output_file = output_dir / f"create_invite_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    output_file.write_text(json.dumps(result, ensure_ascii=False, indent=2, default=str))
    print(f"Saved: {output_file}")
