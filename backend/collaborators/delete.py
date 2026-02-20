from conn import get_db_connection
from utils.auth_helper import verify_jwt_token

def delete_collaborator(token: str, mindmap_id: str, collaborator_user_id: str) -> dict:
    """Remove a collaborator from a mind map.

    Owner or admin can remove any collaborator.
    Collaborators can remove themselves.
    """
    payload = verify_jwt_token(token)
    user_id = payload["user_id"]

    conn = get_db_connection()
    cursor = conn.cursor()

    # Check permission
    is_self = str(user_id) == str(collaborator_user_id)

    if not is_self:
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
                raise PermissionError("Only owner, admin, or self can remove collaborator")

    # Delete collaborator
    cursor.execute("""
        DELETE FROM collaborators
        WHERE mindmap_id = %s AND user_id = %s
    """, (mindmap_id, collaborator_user_id))

    if cursor.rowcount == 0:
        raise ValueError("Collaborator not found")

    conn.commit()
    cursor.close()
    conn.close()

    return {"message": "Collaborator removed"}
