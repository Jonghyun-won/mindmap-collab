import argparse
import asyncio
import json
import os
import base64
from pathlib import Path
from datetime import datetime
from urllib.parse import parse_qs, urlparse
from dotenv import load_dotenv
import websockets
from websockets.server import WebSocketServerProtocol
from y_py import YDoc
from jose import JWTError
from conn import get_db_connection
from utils.auth_helper import verify_jwt_token

load_dotenv()

# Store connected clients per document
# Format: {mindmap_id: {websocket: user_id}}
connected_clients: dict[str, dict[WebSocketServerProtocol, str]] = {}

# Store Y.Doc instances per mindmap
# Format: {mindmap_id: YDoc}
ydocs: dict[str, YDoc] = {}

# Store last save timestamp per mindmap
last_save_time: dict[str, float] = {}

SAVE_INTERVAL_SECONDS = 10


def load_yjs_state_from_db(mindmap_id: str) -> bytes | None:
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT yjs_state FROM mind_maps WHERE id = %s
    """, (mindmap_id,))

    row = cursor.fetchone()
    cursor.close()
    conn.close()

    if row and row[0]:
        return bytes(row[0])
    return None


def save_yjs_state_to_db(mindmap_id: str, state: bytes):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE mind_maps
        SET yjs_state = %s, updated_at = NOW()
        WHERE id = %s
    """, (state, mindmap_id))

    conn.commit()
    cursor.close()
    conn.close()

    print(f"[{datetime.now().isoformat()}] Saved snapshot for mindmap {mindmap_id}")


def check_user_access(user_id: str, mindmap_id: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()

    # Check if user is owner
    cursor.execute("""
        SELECT 1 FROM mind_maps WHERE id = %s AND created_by = %s
    """, (mindmap_id, user_id))

    is_owner = cursor.fetchone() is not None

    if is_owner:
        cursor.close()
        conn.close()
        return True

    # Check if user is collaborator
    cursor.execute("""
        SELECT 1 FROM collaborators WHERE mind_map_id = %s AND user_id = %s
    """, (mindmap_id, user_id))

    is_collaborator = cursor.fetchone() is not None

    cursor.close()
    conn.close()

    return is_collaborator


async def broadcast_update(mindmap_id: str, update: bytes, sender: WebSocketServerProtocol):
    if mindmap_id not in connected_clients:
        return

    # Send update to all clients except sender
    disconnected = []
    for client_ws in connected_clients[mindmap_id]:
        if client_ws != sender:
            try:
                await client_ws.send(update)
            except:
                disconnected.append(client_ws)

    # Remove disconnected clients
    for client_ws in disconnected:
        if client_ws in connected_clients[mindmap_id]:
            del connected_clients[mindmap_id][client_ws]


async def periodic_save(mindmap_id: str):
    while mindmap_id in connected_clients and len(connected_clients[mindmap_id]) > 0:
        await asyncio.sleep(SAVE_INTERVAL_SECONDS)

        current_time = asyncio.get_event_loop().time()
        last_save = last_save_time.get(mindmap_id, 0)

        # Only save if there are connected clients and enough time has passed
        if current_time - last_save >= SAVE_INTERVAL_SECONDS:
            if mindmap_id in ydocs:
                ydoc = ydocs[mindmap_id]
                state = ydoc.get_state()
                save_yjs_state_to_db(mindmap_id, state)
                last_save_time[mindmap_id] = current_time


async def handle_websocket(websocket: WebSocketServerProtocol, path: str):
    mindmap_id = None
    user_id = None

    try:
        # Parse path: /ws/mindmap/{id}?token=...
        parsed_url = urlparse(path)
        path_parts = parsed_url.path.strip('/').split('/')

        if len(path_parts) < 3 or path_parts[0] != 'ws' or path_parts[1] != 'mindmap':
            await websocket.close(1008, "Invalid path format")
            return

        mindmap_id = path_parts[2]

        # Extract token from query params
        query_params = parse_qs(parsed_url.query)
        if 'token' not in query_params:
            await websocket.close(1008, "Missing token parameter")
            return

        token = query_params['token'][0]

        # Verify JWT token
        try:
            payload = verify_jwt_token(token)
            user_id = payload["user_id"]
        except JWTError:
            await websocket.close(1008, "Invalid token")
            return

        # Check user access to mindmap
        has_access = check_user_access(user_id, mindmap_id)
        if not has_access:
            await websocket.close(1008, "Access denied")
            return

        print(f"[{datetime.now().isoformat()}] User {user_id} connected to mindmap {mindmap_id}")

        # Initialize Y.Doc if not exists
        if mindmap_id not in ydocs:
            ydoc = YDoc()

            # Load existing state from database
            existing_state = load_yjs_state_from_db(mindmap_id)
            if existing_state:
                ydoc.apply_update(existing_state)
                print(f"[{datetime.now().isoformat()}] Loaded existing state for mindmap {mindmap_id}")

            ydocs[mindmap_id] = ydoc
            last_save_time[mindmap_id] = asyncio.get_event_loop().time()

        # Add client to connected clients
        if mindmap_id not in connected_clients:
            connected_clients[mindmap_id] = {}
            # Start periodic save task for this mindmap
            asyncio.create_task(periodic_save(mindmap_id))

        connected_clients[mindmap_id][websocket] = user_id

        # Send current state to newly connected client
        ydoc = ydocs[mindmap_id]
        current_state = ydoc.get_state()
        if current_state:
            await websocket.send(current_state)

        # Listen for updates from client
        async for message in websocket:
            if isinstance(message, bytes):
                # Apply update to Y.Doc
                ydoc.apply_update(message)

                # Broadcast to other clients
                await broadcast_update(mindmap_id, message, websocket)

    except websockets.exceptions.ConnectionClosed:
        print(f"[{datetime.now().isoformat()}] Connection closed for user {user_id} on mindmap {mindmap_id}")

    except Exception as e:
        print(f"[{datetime.now().isoformat()}] Error: {str(e)}")
        await websocket.close(1011, "Internal server error")

    finally:
        # Clean up on disconnect
        if mindmap_id and websocket in connected_clients.get(mindmap_id, {}):
            del connected_clients[mindmap_id][websocket]
            print(f"[{datetime.now().isoformat()}] User {user_id} disconnected from mindmap {mindmap_id}")

            # Save final snapshot if no more clients connected
            if len(connected_clients[mindmap_id]) == 0:
                if mindmap_id in ydocs:
                    ydoc = ydocs[mindmap_id]
                    state = ydoc.get_state()
                    save_yjs_state_to_db(mindmap_id, state)

                    # Clean up resources
                    del ydocs[mindmap_id]
                    del connected_clients[mindmap_id]
                    if mindmap_id in last_save_time:
                        del last_save_time[mindmap_id]

                    print(f"[{datetime.now().isoformat()}] Cleaned up resources for mindmap {mindmap_id}")


async def start_server(port: int):
    print(f"[{datetime.now().isoformat()}] Starting WebSocket server on port {port}")

    async with websockets.serve(handle_websocket, "0.0.0.0", port):
        await asyncio.Future()  # Run forever


def main(port: int = 8001) -> dict:
    asyncio.run(start_server(port))

    return {
        "status": "stopped",
        "port": port,
        "timestamp": datetime.now().isoformat()
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="WebSocket Yjs synchronization server")
    parser.add_argument("--port", type=int, default=int(os.getenv("WS_PORT", "8001")), help="WebSocket server port")
    args = parser.parse_args()

    result = main(args.port)

    # Save to output folder
    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    output_file = output_dir / f"yjs_handler_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    output_file.write_text(json.dumps(result, ensure_ascii=False, indent=2))
    print(f"Saved: {output_file}")
