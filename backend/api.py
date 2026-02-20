import os
from fastapi import FastAPI, HTTPException, Header, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from typing import Optional
import uvicorn

# Load environment variables
load_dotenv()

# Import models
from auth.model import RegisterRequest, LoginRequest, LoginResponse, User
from mindmaps.model import (
    MindMap,
    MindMapDetail,
    CreateMindMapRequest,
    UpdateMindMapRequest,
    Pagination,
    Permission
)

# Import auth functions
from auth.register import register
from auth.login import login as auth_login, AuthenticationError
from auth.logout import logout
from auth.verify_token import verify_token

# Import mindmap functions
from mindmaps.list import list_mindmaps
from mindmaps.create import create_mindmap
from mindmaps.get_mindmap import get_mindmap
from mindmaps.update import update_mindmap
from mindmaps.delete import delete_mindmap

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

@app.post("/auth/register", response_model=LoginResponse, status_code=201)
def register_endpoint(request: RegisterRequest):
    """Register new user account.

    Returns LoginResponse with JWT token and user information.
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/auth/logout")
def logout_endpoint(token: str = Depends(get_current_user)):
    """Logout current user.

    For stateless JWT, this just returns success.
    Client should remove token from storage.
    """
    return logout()


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
