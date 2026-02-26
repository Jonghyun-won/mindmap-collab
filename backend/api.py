import os
import uuid
from fastapi import FastAPI, HTTPException, Header, Depends, Query
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from typing import Optional
import uvicorn

# Load environment variables
load_dotenv()

# Import models
from auth.model import RegisterRequest, LoginRequest, LoginResponse, RegisterResponse, User, ConfirmEmailRequest, ResendConfirmationRequest, UpdateProfileRequest
from mindmaps.model import (
    MindMap,
    MindMapDetail,
    CreateMindMapRequest,
    UpdateMindMapRequest,
    Pagination,
    Permission,
    AddCollaboratorRequest,
    UpdateCollaboratorPermissionRequest
)

# Import auth functions
from auth.register import register
from auth.login import login as auth_login, AuthenticationError
from auth.logout import logout
from auth.verify_token import verify_token
from auth.confirm_email import confirm_email
from auth.resend_confirmation import resend_confirmation
from auth.update_profile import update_profile

# Import mindmap functions
from mindmaps.list import list_mindmaps
from mindmaps.create import create_mindmap
from mindmaps.get_mindmap import get_mindmap
from mindmaps.update import update_mindmap
from mindmaps.delete import delete_mindmap

# Import collaborators functions
from collaborators.list import list_collaborators
from collaborators.add import add_collaborator
from collaborators.update import update_collaborator_permission
from collaborators.delete import delete_collaborator

# Import comments functions and models
from comments.model import CreateCommentRequest, CommentListResponse
from comments.create import create_comment
from comments.list import list_comments
from comments.delete import delete_comment

# Import history functions and models
from history.model import CreateChangeRequest, ChangeHistoryResponse
from history.create import create_change
from history.list import list_changes

# Import invites functions and models
from invites.model import CreateInviteLinkRequest, InviteLinkResponse, InviteListResponse
from invites.create import create_invite
from invites.accept import accept_invite
from invites.list import list_invites
from invites.delete import delete_invite

# Import chapters functions and models
from chapters.model import Chapter, ChapterDetail, CreateChapterRequest, UpdateChapterRequest, ReorderChaptersRequest
from chapters.list import list_chapters
from chapters.create import create_chapter
from chapters.update import update_chapter as update_chapter_func
from chapters.delete import delete_chapter
from chapters.reorder import reorder_chapters
from chapters.get_chapter import get_chapter
from chapters.duplicate import duplicate_chapter

# Import auth helper for token verification
from utils.auth_helper import verify_jwt_token
from jose import JWTError

# Import admin functions
from admin.dashboard_stats import get_dashboard_stats
from admin.list_users import list_users as admin_list_users
from admin.update_user import update_user_role, update_user_status, verify_user_email
from admin.model import UpdateUserRoleRequest, UpdateUserStatusRequest
from utils.admin_helper import require_admin

# Initialize FastAPI app
app = FastAPI(
    title="Mind Map Collaboration API",
    version="1.0.0",
    description="RESTful API for real-time collaborative mind mapping application"
)

# CORS Configuration
# Allow localhost for development and Railway for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:3000",
        "http://localhost:8000",
        "https://frontend-production-34d4.up.railway.app",  # Production frontend
    ],
    allow_origin_regex=r"https://.*\.railway\.app",  # Allow all Railway deployments
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Authentication Dependency
def get_current_user(authorization: str = Header(...)) -> str:
    """Extract and verify JWT token from Authorization header.

    Args:
        authorization: Authorization header value (format: "Bearer <token>")

    Returns:
        Token string

    Raises:
        HTTPException: If token is invalid or missing
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header format")

    token = authorization.replace("Bearer ", "")

    try:
        verify_jwt_token(token)
        return token
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


# Error response model
class ErrorResponse:
    def __init__(self, error: str, message: str, details: Optional[str] = None):
        self.error = error
        self.message = message
        self.details = details


# Health Check
@app.get("/")
def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "mindmap-backend",
        "version": "1.0.0"
    }


# ============================================================================
# Authentication Routes
# ============================================================================

@app.post("/auth/register", response_model=RegisterResponse, status_code=201)
def register_endpoint(request: RegisterRequest):
    """Register new user account.

    Returns RegisterResponse with confirmation code and user information.
    """
    try:
        return register(request)
    except ValueError as e:
        error_msg = str(e)
        if "already exists" in error_msg.lower():
            raise HTTPException(status_code=409, detail=error_msg)
        else:
            raise HTTPException(status_code=400, detail=error_msg)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/auth/login", response_model=LoginResponse)
def login_endpoint(request: LoginRequest):
    """Login with email and password.

    Returns LoginResponse with JWT token and user information.
    """
    try:
        return auth_login(request)
    except AuthenticationError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except ValueError as e:
        if "EMAIL_NOT_VERIFIED" in str(e):
            raise HTTPException(status_code=403, detail="이메일 인증이 필요합니다")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/auth/logout")
def logout_endpoint(token: str = Depends(get_current_user)):
    """Logout current user.

    For stateless JWT, this just returns success.
    Client should remove token from storage.
    """
    return logout()


@app.post("/auth/confirm-email", tags=["Authentication"])
def api_confirm_email(request: ConfirmEmailRequest):
    """Confirm email with verification code.

    Returns JWT token and user information on success.
    """
    try:
        return confirm_email(request.email, request.confirmation_code)
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/auth/resend-confirmation", tags=["Authentication"])
def api_resend_confirmation(request: ResendConfirmationRequest):
    """Resend email confirmation code."""
    try:
        return resend_confirmation(request.email)
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        if "already verified" in str(e).lower():
            raise HTTPException(status_code=409, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/auth/verify-email")
def verify_email_by_token(token: str = Query(...)):
    """Verify email via link token. Returns HTML page with redirect."""
    from conn import get_db_connection as _get_db_connection
    conn = _get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT ec.id, ec.user_id, u.email
            FROM public.email_confirmations ec
            JOIN public.users u ON u.id = ec.user_id
            WHERE ec.verification_token = %s AND ec.used = FALSE AND ec.expires_at > NOW()
            ORDER BY ec.created_at DESC LIMIT 1
            """,
            (token,)
        )
        row = cursor.fetchone()
        if not row:
            return HTMLResponse(content="""
                <html><body style="font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f9fafb;">
                <div style="text-align:center;padding:40px;">
                    <h2 style="color:#dc2626;">인증 실패</h2>
                    <p style="color:#6b7280;">유효하지 않거나 만료된 인증 링크입니다.</p>
                </div></body></html>
            """, status_code=400)

        confirmation_id, user_id, email = row

        cursor.execute("UPDATE public.email_confirmations SET used = TRUE WHERE id = %s", (confirmation_id,))
        cursor.execute("UPDATE public.users SET email_verified = TRUE WHERE id = %s", (user_id,))
        conn.commit()

        frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:5174")

        return HTMLResponse(content=f"""
            <html><body style="font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f9fafb;">
            <div style="text-align:center;padding:40px;">
                <div style="font-size:48px;margin-bottom:16px;">&#x2705;</div>
                <h2 style="color:#059669;">이메일 인증 완료!</h2>
                <p style="color:#6b7280;">이제 로그인할 수 있습니다.</p>
                <a href="{frontend_url}" style="display:inline-block;margin-top:20px;background:#2563EB;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">
                    로그인 페이지로 이동
                </a>
                <script>setTimeout(function(){{window.location.href='{frontend_url}'}}, 3000)</script>
            </div></body></html>
        """)
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@app.get("/auth/me", response_model=User)
def get_current_user_endpoint(token: str = Depends(get_current_user)):
    """Get current user information from JWT token."""
    try:
        user = verify_token(token)
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/auth/profile", response_model=User)
def update_profile_endpoint(
    request: UpdateProfileRequest,
    token: str = Depends(get_current_user)
):
    """Update current user profile (name, team, phone)"""
    try:
        user = update_profile(token, request.model_dump(exclude_none=True))
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    except ValueError as e:
        status_code = 404 if "not found" in str(e).lower() else 400
        raise HTTPException(status_code=status_code, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Mind Maps Routes
# ============================================================================

@app.get("/mindmaps")
def list_mindmaps_endpoint(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort: str = Query("updated_desc", regex="^(created_asc|created_desc|updated_asc|updated_desc|title_asc|title_desc)$"),
    token: str = Depends(get_current_user)
):
    """List user's mind maps with pagination.

    Returns mind maps where user is owner or collaborator.
    """
    try:
        return list_mindmaps(token, page, limit, sort)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/mindmaps", response_model=MindMap, status_code=201)
def create_mindmap_endpoint(
    request: CreateMindMapRequest,
    token: str = Depends(get_current_user)
):
    """Create new mind map.

    Returns created MindMap object.
    """
    try:
        return create_mindmap(token, request)
    except ValueError as e:
        if "token" in str(e).lower():
            raise HTTPException(status_code=401, detail=str(e))
        else:
            raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/mindmaps/{id}", response_model=MindMapDetail)
def get_mindmap_endpoint(
    id: str,
    token: str = Depends(get_current_user)
):
    """Get mind map details including owner info and Yjs state.

    User must be owner or collaborator to access.
    """
    try:
        return get_mindmap(token, id)
    except HTTPException:
        raise
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/mindmaps/{id}", response_model=MindMap)
def update_mindmap_endpoint(
    id: str,
    request: UpdateMindMapRequest,
    token: str = Depends(get_current_user)
):
    """Update mind map metadata (title).

    User must be owner or have edit/admin permission.
    """
    try:
        return update_mindmap(token, id, request)
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        else:
            raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/mindmaps/{id}", status_code=204)
def delete_mindmap_endpoint(
    id: str,
    token: str = Depends(get_current_user)
):
    """Delete mind map.

    Only owner can delete. Returns 204 No Content on success.
    """
    try:
        result = delete_mindmap(token, id)

        # Check for error responses from delete_mindmap
        if isinstance(result, dict) and "error" in result:
            status = result.get("status", 500)
            raise HTTPException(status_code=status, detail=result["error"])

        return None
    except HTTPException:
        raise
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/mindmaps/{id}/duplicate", response_model=MindMap, status_code=201)
def duplicate_mindmap_endpoint(
    id: str,
    token: str = Depends(get_current_user)
):
    """Duplicate a mindmap with all its Yjs state data."""
    try:
        from conn import get_db_connection
        from utils.auth_helper import verify_jwt_token
        import psycopg2

        payload = verify_jwt_token(token)
        user_id = payload["user_id"]

        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute(
            "SELECT id, title, owner_id, yjs_state FROM mindmaps WHERE id = %s",
            (id,)
        )
        original = cur.fetchone()
        if not original:
            cur.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Mind map not found")

        original_id, original_title, owner_id, yjs_state = original

        is_owner = str(owner_id) == str(user_id)
        if not is_owner:
            cur.execute(
                "SELECT 1 FROM collaborators WHERE mindmap_id = %s AND user_id = %s",
                (id, user_id)
            )
            if not cur.fetchone():
                cur.close()
                conn.close()
                raise HTTPException(status_code=403, detail="You do not have access to this mind map")

        new_title = f"{original_title} (복사본)"

        # Properly handle BYTEA data - convert memoryview to bytes and wrap with psycopg2.Binary
        yjs_binary = None
        if yjs_state is not None:
            yjs_binary = psycopg2.Binary(bytes(yjs_state))

        cur.execute(
            """INSERT INTO mindmaps (title, owner_id, yjs_state)
               VALUES (%s, %s, %s)
               RETURNING id, title, owner_id, created_at, updated_at""",
            (new_title, user_id, yjs_binary)
        )

        row = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        from uuid import UUID
        return MindMap(
            id=UUID(str(row[0])),
            title=row[1],
            owner_id=UUID(str(row[2])),
            created_at=row[3],
            updated_at=row[4]
        )
    except HTTPException:
        raise
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Chapters Routes
# ============================================================================

@app.get("/mindmaps/{mindmap_id}/chapters", response_model=list[Chapter])
def list_chapters_endpoint(
    mindmap_id: str,
    token: str = Depends(get_current_user)
):
    """List all chapters for mindmap."""
    try:
        return list_chapters(token, mindmap_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/mindmaps/{mindmap_id}/chapters", response_model=Chapter, status_code=201)
def create_chapter_endpoint(
    mindmap_id: str,
    request: CreateChapterRequest,
    token: str = Depends(get_current_user)
):
    """Create new chapter."""
    try:
        return create_chapter(token, mindmap_id, request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/mindmaps/{mindmap_id}/chapters/reorder", response_model=list[Chapter])
def reorder_chapters_endpoint(
    mindmap_id: str,
    request: ReorderChaptersRequest,
    token: str = Depends(get_current_user)
):
    """Reorder chapters."""
    try:
        return reorder_chapters(token, mindmap_id, request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/mindmaps/{mindmap_id}/chapters/{chapter_id}", response_model=ChapterDetail)
def get_chapter_endpoint(
    mindmap_id: str,
    chapter_id: str,
    token: str = Depends(get_current_user)
):
    """Get chapter with yjs_state."""
    try:
        return get_chapter(token, mindmap_id, chapter_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/mindmaps/{mindmap_id}/chapters/{chapter_id}", response_model=Chapter)
def update_chapter_endpoint(
    mindmap_id: str,
    chapter_id: str,
    request: UpdateChapterRequest,
    token: str = Depends(get_current_user)
):
    """Update chapter title."""
    try:
        return update_chapter_func(token, mindmap_id, chapter_id, request)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/mindmaps/{mindmap_id}/chapters/{chapter_id}/duplicate", response_model=Chapter, status_code=201)
def duplicate_chapter_endpoint(
    mindmap_id: str,
    chapter_id: str,
    token: str = Depends(get_current_user)
):
    """Duplicate chapter with yjs_state."""
    try:
        return duplicate_chapter(token, mindmap_id, chapter_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/mindmaps/{mindmap_id}/chapters/{chapter_id}", status_code=204)
def delete_chapter_endpoint(
    mindmap_id: str,
    chapter_id: str,
    token: str = Depends(get_current_user)
):
    """Delete chapter."""
    try:
        delete_chapter(token, mindmap_id, chapter_id)
        return None
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Collaborators Routes
# ============================================================================

@app.get("/mindmaps/{id}/collaborators")
def list_collaborators_endpoint(
    id: str,
    token: str = Depends(get_current_user)
):
    """List collaborators for a mind map."""
    try:
        return list_collaborators(token, id)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/mindmaps/{id}/collaborators")
def add_collaborator_endpoint(
    id: str,
    request: AddCollaboratorRequest,
    token: str = Depends(get_current_user)
):
    """Add a collaborator to a mind map."""
    try:
        return add_collaborator(token, id, request)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/mindmaps/{id}/collaborators/{user_id}")
def update_collaborator_permission_endpoint(
    id: str,
    user_id: str,
    request: UpdateCollaboratorPermissionRequest,
    token: str = Depends(get_current_user)
):
    """Update collaborator permission."""
    try:
        return update_collaborator_permission(token, id, user_id, request)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/mindmaps/{id}/collaborators/{user_id}", status_code=204)
def delete_collaborator_endpoint(
    id: str,
    user_id: str,
    token: str = Depends(get_current_user)
):
    """Remove a collaborator."""
    try:
        delete_collaborator(token, id, user_id)
        return None
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Comments Routes
# ============================================================================

@app.get("/mindmaps/{mindmap_id}/nodes/{node_id}/comments")
def list_comments_endpoint(
    mindmap_id: str,
    node_id: str,
    token: str = Depends(get_current_user)
):
    """List comments for a specific node."""
    try:
        return list_comments(token, mindmap_id, node_id)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/mindmaps/{mindmap_id}/nodes/{node_id}/comments", status_code=201)
def create_comment_endpoint(
    mindmap_id: str,
    node_id: str,
    request: CreateCommentRequest,
    token: str = Depends(get_current_user)
):
    """Create a comment on a node."""
    try:
        return create_comment(token, mindmap_id, node_id, request)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/mindmaps/{mindmap_id}/nodes/{node_id}/comments/{comment_id}")
def delete_comment_endpoint(
    mindmap_id: str,
    node_id: str,
    comment_id: str,
    token: str = Depends(get_current_user)
):
    """Delete a comment."""
    try:
        return delete_comment(token, mindmap_id, node_id, comment_id)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Change History Routes
# ============================================================================

@app.get("/mindmaps/{mindmap_id}/history")
def list_changes_endpoint(
    mindmap_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    token: str = Depends(get_current_user)
):
    """List change history for a mindmap."""
    try:
        return list_changes(token, mindmap_id, page, limit)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/mindmaps/{mindmap_id}/history", status_code=201)
def create_change_endpoint(
    mindmap_id: str,
    request: CreateChangeRequest,
    token: str = Depends(get_current_user)
):
    """Record a change in mindmap history."""
    try:
        return create_change(token, mindmap_id, request)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Invite Links Routes
# ============================================================================

@app.post("/mindmaps/{mindmap_id}/invites", status_code=201)
def create_invite_endpoint(
    mindmap_id: str,
    request: CreateInviteLinkRequest,
    token: str = Depends(get_current_user)
):
    """Create an invite link for a mindmap."""
    try:
        return create_invite(token, mindmap_id, request)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/mindmaps/{mindmap_id}/invites")
def list_invites_endpoint(
    mindmap_id: str,
    token: str = Depends(get_current_user)
):
    """List active invite links for a mindmap."""
    try:
        return list_invites(token, mindmap_id)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/mindmaps/{mindmap_id}/invites/{invite_id}")
def delete_invite_endpoint(
    mindmap_id: str,
    invite_id: str,
    token: str = Depends(get_current_user)
):
    """Revoke an invite link."""
    try:
        return delete_invite(token, mindmap_id, invite_id)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/invites/{invite_token}/accept")
def accept_invite_endpoint(
    invite_token: str,
    token: str = Depends(get_current_user)
):
    """Accept an invite link and join as collaborator."""
    try:
        return accept_invite(token, invite_token)
    except ValueError as e:
        error_msg = str(e)
        if "expired" in error_msg.lower() or "maximum uses" in error_msg.lower():
            raise HTTPException(status_code=410, detail=error_msg)
        if "not found" in error_msg.lower():
            raise HTTPException(status_code=404, detail=error_msg)
        raise HTTPException(status_code=400, detail=error_msg)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Users Routes
# ============================================================================

@app.get("/users/search")
def search_users_endpoint(
    q: str = Query(..., min_length=1),
    limit: int = Query(5, ge=1, le=20),
    token: str = Depends(get_current_user)
):
    """Search users by name or email. Requires authentication."""
    from conn import get_db_connection

    verify_jwt_token(token)

    conn = get_db_connection()
    cursor = conn.cursor()

    search_pattern = f"%{q}%"
    cursor.execute("""
        SELECT id, email, name, team
        FROM public.users
        WHERE (email ILIKE %s OR name ILIKE %s)
        AND email_verified = TRUE
        AND is_active = TRUE
        ORDER BY
            CASE WHEN email = %s THEN 0
                 WHEN email ILIKE %s THEN 1
                 WHEN name ILIKE %s THEN 2
                 ELSE 3
            END
        LIMIT %s
    """, (search_pattern, search_pattern, q, f"{q}%", f"{q}%", limit))

    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    return {
        "users": [
            {
                "id": str(row[0]),
                "email": row[1],
                "name": row[2],
                "team": row[3],
            }
            for row in rows
        ]
    }


# ============================================================================
# Admin Routes
# ============================================================================

@app.get("/admin/stats")
def admin_stats_endpoint(token: str = Depends(get_current_user)):
    """Get admin dashboard statistics."""
    require_admin(token)
    return get_dashboard_stats()


@app.get("/admin/users")
def admin_users_endpoint(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str = Query(None),
    token: str = Depends(get_current_user)
):
    """List all users with mindmap counts."""
    require_admin(token)
    return admin_list_users(page, limit, search)


@app.put("/admin/users/{user_id}/role")
def admin_update_role_endpoint(
    user_id: str,
    request: UpdateUserRoleRequest,
    token: str = Depends(get_current_user)
):
    """Update user role."""
    payload = require_admin(token)
    if payload["user_id"] == user_id and request.role != "admin":
        raise HTTPException(status_code=400, detail="자기 자신의 관리자 권한을 해제할 수 없습니다")
    try:
        return update_user_role(user_id, request.role)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.put("/admin/users/{user_id}/status")
def admin_update_status_endpoint(
    user_id: str,
    request: UpdateUserStatusRequest,
    token: str = Depends(get_current_user)
):
    """Update user active status."""
    payload = require_admin(token)
    if payload["user_id"] == user_id and not request.is_active:
        raise HTTPException(status_code=400, detail="자기 자신을 비활성화할 수 없습니다")
    try:
        return update_user_status(user_id, request.is_active)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.put("/admin/users/{user_id}/verify")
def admin_verify_user_endpoint(
    user_id: str,
    token: str = Depends(get_current_user)
):
    """Force-verify a user's email."""
    require_admin(token)
    try:
        return verify_user_email(user_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/admin/mindmaps")
def admin_mindmaps_endpoint(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str = Query(None),
    sort: str = Query("updated_desc", regex="^(updated_desc|updated_asc|created_desc|created_asc)$"),
    token: str = Depends(get_current_user)
):
    """List all mindmaps with owner info and collaborator counts."""
    require_admin(token)

    from conn import get_db_connection

    conn = get_db_connection()
    cursor = conn.cursor()

    # Build WHERE clause for search
    where_clause = ""
    params = []
    if search:
        where_clause = "WHERE (m.title ILIKE %s OR u.email ILIKE %s OR u.name ILIKE %s)"
        search_pattern = f"%{search}%"
        params.extend([search_pattern, search_pattern, search_pattern])

    # Build ORDER BY clause
    order_mapping = {
        "updated_desc": "m.updated_at DESC",
        "updated_asc": "m.updated_at ASC",
        "created_desc": "m.created_at DESC",
        "created_asc": "m.created_at ASC"
    }
    order_clause = order_mapping.get(sort, "m.updated_at DESC")

    # Get total count
    cursor.execute(f"""
        SELECT COUNT(*)
        FROM mindmaps m
        JOIN users u ON u.id = m.owner_id
        {where_clause}
    """, params)
    total = cursor.fetchone()[0]

    # Get paginated mindmaps with owner info and collaborator count
    offset = (page - 1) * limit
    cursor.execute(f"""
        SELECT
            m.id,
            m.title,
            m.owner_id,
            u.email as owner_email,
            u.name as owner_name,
            (SELECT COUNT(*) FROM collaborators WHERE mindmap_id = m.id) as collaborators_count,
            m.created_at,
            m.updated_at
        FROM mindmaps m
        JOIN users u ON u.id = m.owner_id
        {where_clause}
        ORDER BY {order_clause}
        LIMIT %s OFFSET %s
    """, params + [limit, offset])

    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    return {
        "mindmaps": [
            {
                "id": str(row[0]),
                "title": row[1],
                "owner_id": str(row[2]),
                "owner_email": row[3],
                "owner_name": row[4],
                "collaborators_count": row[5],
                "created_at": row[6].isoformat(),
                "updated_at": row[7].isoformat()
            }
            for row in rows
        ],
        "total": total,
        "page": page,
        "limit": limit
    }


# ============================================================================
# Main Entry Point
# ============================================================================

if __name__ == "__main__":
    port = int(os.getenv("API_PORT", "8000"))
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=port,
        reload=True
    )
