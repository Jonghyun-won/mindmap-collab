import argparse
import json
from pathlib import Path
from datetime import datetime
from conn import get_db_connection
from utils.auth_helper import verify_jwt_token
from mindmaps.model import MindMap, Pagination


def list_mindmaps(token: str, page: int = 1, limit: int = 50, sort: str = "updated_desc") -> dict:
    payload = verify_jwt_token(token)
    user_id = payload["user_id"]

    conn = get_db_connection()
    cur = conn.cursor()

    # Determine sort order
    sort_mapping = {
        "created_asc": "m.created_at ASC",
        "created_desc": "m.created_at DESC",
        "updated_asc": "m.updated_at ASC",
        "updated_desc": "m.updated_at DESC",
        "title_asc": "m.title ASC",
        "title_desc": "m.title DESC"
    }
    order_by = sort_mapping.get(sort, "m.updated_at DESC")

    # Calculate offset
    offset = (page - 1) * limit

    # Query mind maps where user is owner or collaborator
    query = f"""
        SELECT DISTINCT m.id, m.title, m.owner_id, m.created_at, m.updated_at
        FROM mindmaps m
        LEFT JOIN collaborators c ON m.id = c.mindmap_id
        WHERE m.owner_id = %s OR c.user_id = %s
        ORDER BY {order_by}
        LIMIT %s OFFSET %s
    """

    cur.execute(query, (user_id, user_id, limit, offset))
    rows = cur.fetchall()

    # Count total items
    count_query = """
        SELECT COUNT(DISTINCT m.id)
        FROM mindmaps m
        LEFT JOIN collaborators c ON m.id = c.mindmap_id
        WHERE m.owner_id = %s OR c.user_id = %s
    """
    cur.execute(count_query, (user_id, user_id))
    total = cur.fetchone()[0]

    cur.close()
    conn.close()

    # Build response
    items = [
        MindMap(
            id=row[0],
            title=row[1],
            owner_id=row[2],
            created_at=row[3],
            updated_at=row[4]
        ).model_dump(mode="json")
        for row in rows
    ]

    total_pages = (total + limit - 1) // limit if total > 0 else 0

    pagination = Pagination(
        page=page,
        limit=limit,
        total=total,
        total_pages=total_pages
    ).model_dump()

    return {
        "data": items,
        "pagination": pagination
    }


def main(token: str, page: int, limit: int, sort: str) -> dict:
    result = list_mindmaps(token, page, limit, sort)
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="List user's mind maps with pagination")
    parser.add_argument("--token", required=True, help="JWT access token")
    parser.add_argument("--page", type=int, default=1, help="Page number (1-indexed)")
    parser.add_argument("--limit", type=int, default=50, help="Items per page")
    parser.add_argument("--sort", default="updated_desc", help="Sort order (created_asc, created_desc, updated_asc, updated_desc, title_asc, title_desc)")
    args = parser.parse_args()

    result = main(args.token, args.page, args.limit, args.sort)

    # Save to output folder
    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    output_file = output_dir / f"list_mindmaps_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    output_file.write_text(json.dumps(result, ensure_ascii=False, indent=2))
    print(f"Saved: {output_file}")
