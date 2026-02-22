from conn import get_db_connection


def get_dashboard_stats() -> dict:
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            COUNT(*) as total_users,
            COUNT(*) FILTER (WHERE email_verified = TRUE) as verified_users,
            COUNT(*) FILTER (WHERE email_verified = FALSE) as unverified_users,
            COUNT(*) FILTER (WHERE is_active = TRUE) as active_users,
            COUNT(*) FILTER (WHERE is_active = FALSE) as inactive_users
        FROM public.users
    """)
    user_stats = cursor.fetchone()

    cursor.execute("SELECT COUNT(*) FROM public.mindmaps")
    total_mindmaps = cursor.fetchone()[0]

    cursor.close()
    conn.close()

    return {
        "total_users": user_stats[0],
        "verified_users": user_stats[1],
        "unverified_users": user_stats[2],
        "active_users": user_stats[3],
        "inactive_users": user_stats[4],
        "total_mindmaps": total_mindmaps,
    }
