from conn import get_db_connection
from utils.auth_helper import verify_jwt_token
from mindmaps.model import Collaborator, User, UpdateCollaboratorPermissionRequest

def update_collaborator_permission(token: str, mindmap_id: str, collaborator_user_id: str, request: UpdateCollaboratorPermissionRequest) -> dict:
    """Update collaborator permission.

    Owner or collaborators with edit/admin permission can update permissions.
    """
    payload = verify_jwt_token(token)
    user_id = payload["user_id"]

    conn = get_db_connection()
    cursor = conn.cursor()

    # Check permission
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
        if not perm_row or perm_row[0] not in ['admin', 'edit']:
            cursor.close()
            conn.close()
            raise PermissionError("Only owner or collaborators with edit/admin permission can update permissions")

    # Update permission
    cursor.execute("""
        UPDATE collaborators
        SET permission = %s
        WHERE mindmap_id = %s AND user_id = %s
        RETURNING id, mindmap_id, user_id, permission, joined_at
    """, (request.permission, mindmap_id, collaborator_user_id))

    row = cursor.fetchone()
    if not row:
        raise ValueError("Collaborator not found")

    conn.commit()

    # Get user info
    cursor.execute("SELECT id, email, name, created_at FROM users WHERE id = %s", (collaborator_user_id,))
    user_row = cursor.fetchone()

    cursor.close()
    conn.close()

    user = User(id=user_row[0], email=user_row[1], name=user_row[2], created_at=user_row[3])
    collab = Collaborator(
        id=row[0], mindmap_id=row[1], user_id=row[2],
        permission=row[3], joined_at=row[4], user=user
    )
    return collab.model_dump(mode='json')
