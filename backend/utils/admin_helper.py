from fastapi import HTTPException
from utils.auth_helper import verify_jwt_token
from conn import get_db_connection


def require_admin(token: str) -> dict:
    payload = verify_jwt_token(token)
    user_id = payload["user_id"]

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT role FROM public.users WHERE id = %s", (user_id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()

    if not row or row[0] != 'admin':
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

    return payload
