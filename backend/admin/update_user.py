from conn import get_db_connection


def update_user_role(user_id: str, role: str) -> dict:
    if role not in ("user", "admin"):
        raise ValueError("Role must be 'user' or 'admin'")

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE public.users SET role = %s WHERE id = %s RETURNING id, email, role",
        (role, user_id)
    )
    row = cursor.fetchone()
    if not row:
        cursor.close()
        conn.close()
        raise ValueError("User not found")
    conn.commit()
    cursor.close()
    conn.close()
    return {"id": str(row[0]), "email": row[1], "role": row[2]}


def update_user_status(user_id: str, is_active: bool) -> dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE public.users SET is_active = %s WHERE id = %s RETURNING id, email, is_active",
        (is_active, user_id)
    )
    row = cursor.fetchone()
    if not row:
        cursor.close()
        conn.close()
        raise ValueError("User not found")
    conn.commit()
    cursor.close()
    conn.close()
    return {"id": str(row[0]), "email": row[1], "is_active": row[2]}


def verify_user_email(user_id: str) -> dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE public.users SET email_verified = TRUE WHERE id = %s RETURNING id, email, name, email_verified",
        (user_id,)
    )
    row = cursor.fetchone()
    if not row:
        cursor.close()
        conn.close()
        raise ValueError("User not found")
    conn.commit()
    cursor.close()
    conn.close()
    return {"id": str(row[0]), "email": row[1], "name": row[2], "email_verified": row[3]}
