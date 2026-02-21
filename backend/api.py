import os
from fastapi import FastAPI, HTTPException, Header, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from typing import Optional
import uvicorn

# Load environment variables
load_dotenv()

# Import models
from auth.model import RegisterRequest, LoginRequest, LoginResponse, RegisterResponse, User, ConfirmEmailRequest, ResendConfirmationRequest
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

# Import auth helper for token verification
from utils.auth_helper import verify_jwt_token
from jose import JWTError

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
