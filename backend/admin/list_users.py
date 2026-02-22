import math
from conn import get_db_connection


def list_users(page: int = 1, limit: int = 20, search: str = None) -> dict:
    conn = get_db_connection()
    cursor = conn.cursor()

    offset = (page - 1) * limit
    where_clause = ""
    params = []

    if search:
        where_clause = "WHERE u.email ILIKE %s OR u.name ILIKE %s"
        params = [f"%{search}%", f"%{search}%"]

    cursor.execute(f"SELECT COUNT(*) FROM public.users u {where_clause}", params)
    total = cursor.fetchone()[0]

    cursor.execute(f"""
        SELECT
            u.id, u.email, u.name, u.team, u.role, u.email_verified, u.is_active, u.created_at,
            COUNT(DISTINCT m.id) as mindmap_count,
            GREATEST(MAX(m.updated_at), u.updated_at) as last_activity
        FROM public.users u
        LEFT JOIN public.mindmaps m ON m.owner_id = u.id
        {where_clause}
        GROUP BY u.id, u.email, u.name, u.team, u.role, u.email_verified, u.is_active, u.created_at, u.updated_at
        ORDER BY u.created_at DESC
        LIMIT %s OFFSET %s
    """, params + [limit, offset])

    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    users = []
    for row in rows:
        users.append({
            "id": str(row[0]),
            "email": row[1],
            "name": row[2],
            "team": row[3],
            "role": row[4],
            "email_verified": row[5],
            "is_active": row[6],
            "created_at": row[7].isoformat() if row[7] else None,
            "mindmap_count": row[8],
            "last_activity": row[9].isoformat() if row[9] else None,
        })

    return {
        "users": users,
        "total": total,
        "page": page,
        "limit": limit,
    }
