import argparse
import json
from pathlib import Path
from datetime import datetime
from conn import get_db_connection
from utils.auth_helper import verify_jwt_token


def delete_mindmap(token: str, mindmap_id: str) -> dict:
    payload = verify_jwt_token(token)
    user_id = payload["user_id"]

    conn = get_db_connection()
    cur = conn.cursor()

    # Check if mind map exists and user is owner
    cur.execute(
        "SELECT owner_id FROM mindmaps WHERE id = %s",
        (mindmap_id,)
    )
    row = cur.fetchone()

    if not row:
        cur.close()
        conn.close()
        return {"error": "Mind map not found", "status": 404}

    owner_id = row[0]

    if owner_id != user_id:
        cur.close()
        conn.close()
        return {"error": "You do not have permission to delete this mind map", "status": 403}

    # Delete mind map (collaborators cascade automatically)
    cur.execute(
        "DELETE FROM mindmaps WHERE id = %s",
        (mindmap_id,)
    )

    conn.commit()
    cur.close()
    conn.close()

    return {"message": "Mind map deleted successfully"}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--token", required=True, help="JWT token")
    parser.add_argument("--id", required=True, help="Mind map ID")
    args = parser.parse_args()

    result = delete_mindmap(args.token, args.id)

    # Save to output folder
    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    output_file = output_dir / f"delete_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    output_file.write_text(json.dumps(result, ensure_ascii=False, indent=2))
    print(f"Saved: {output_file}")
