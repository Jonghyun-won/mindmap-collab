from conn import get_db_connection
from utils.auth_helper import verify_jwt_token
from mindmaps.model import AddCollaboratorRequest, Collaborator, User

def add_collaborator(token: str, mindmap_id: str, request: AddCollaboratorRequest) -> dict:
    """Add a collaborator to a mind map.

    Only owner or admin collaborators can add new collaborators.
    """
    payload = verify_jwt_token(token)
    user_id = payload["user_id"]

    conn = get_db_connection()
    cursor = conn.cursor()

    # Check permission: must be owner or admin
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
            raise PermissionError("Only owner or admin can add collaborators")

    # Find user by email
    cursor.execute("SELECT id FROM users WHERE email = %s", (request.user_email,))
    user_row = cursor.fetchone()

    if not user_row:
        raise ValueError(f"User not found: {request.user_email}")

    target_user_id = user_row[0]

    # Insert collaborator (UNIQUE constraint handles duplicates)
    try:
        cursor.execute("""
            INSERT INTO collaborators (mindmap_id, user_id, permission)
            VALUES (%s, %s, %s)
            RETURNING id, mindmap_id, user_id, permission, joined_at
        """, (mindmap_id, target_user_id, request.permission))

        row = cursor.fetchone()
        conn.commit()

        # Get user info
        cursor.execute("SELECT id, email, name, created_at FROM users WHERE id = %s", (target_user_id,))
        user_row = cursor.fetchone()

        cursor.close()
        conn.close()

        user = User(id=user_row[0], email=user_row[1], name=user_row[2], created_at=user_row[3])
        collab = Collaborator(
            id=row[0], mindmap_id=row[1], user_id=row[2],
            permission=row[3], joined_at=row[4], user=user
        )
        return collab.model_dump(mode='json')
    except Exception as e:
        conn.rollback()
        if "unique" in str(e).lower():
            raise ValueError("User is already a collaborator")
        raise
