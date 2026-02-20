from conn import get_db_connection
from utils.auth_helper import verify_jwt_token
from mindmaps.model import Collaborator, User

def list_collaborators(token: str, mindmap_id: str) -> list[dict]:
    """List all collaborators for a mind map.

    User must be owner or collaborator to view list.
    """
    payload = verify_jwt_token(token)
    user_id = payload["user_id"]

    conn = get_db_connection()
    cursor = conn.cursor()

    # Check if user has access (owner or collaborator)
    # First check if user is owner
    cursor.execute("""
        SELECT owner_id FROM mindmaps WHERE id = %s
    """, (mindmap_id,))

    mindmap_row = cursor.fetchone()
    if not mindmap_row:
        cursor.close()
        conn.close()
        raise ValueError("Mind map not found")

    is_owner = str(mindmap_row[0]) == str(user_id)

    # If not owner, check if collaborator
    if not is_owner:
        cursor.execute("""
            SELECT 1 FROM collaborators WHERE mindmap_id = %s AND user_id = %s
        """, (mindmap_id, user_id))

        if not cursor.fetchone():
            cursor.close()
            conn.close()
            raise PermissionError("Access denied")

    # Get all collaborators with user info
    cursor.execute("""
        SELECT c.id, c.mindmap_id, c.user_id, c.permission, c.joined_at,
               u.id, u.email, u.name, u.created_at
        FROM collaborators c
        JOIN users u ON c.user_id = u.id
        WHERE c.mindmap_id = %s
        ORDER BY c.joined_at
    """, (mindmap_id,))

    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    result = []
    for row in rows:
        user = User(id=row[5], email=row[6], name=row[7], created_at=row[8])
        collab = Collaborator(
            id=row[0], mindmap_id=row[1], user_id=row[2],
            permission=row[3], joined_at=row[4], user=user
        )
        result.append(collab.model_dump(mode='json'))

    return result
