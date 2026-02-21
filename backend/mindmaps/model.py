from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from uuid import UUID
from enum import Enum


# Permission enum
class Permission(str, Enum):
    view = "view"
    edit = "edit"
    admin = "admin"


# User model (referenced by MindMapDetail and Collaborator)
class User(BaseModel):
    id: UUID
    email: EmailStr
    name: Optional[str] = None
    created_at: datetime


# MindMap base model
class MindMap(BaseModel):
    id: UUID
    title: str = Field(..., min_length=1, max_length=255)
    owner_id: UUID
    created_at: datetime
    updated_at: datetime


# MindMapDetail extends MindMap with additional fields
class MindMapDetail(MindMap):
    owner: User
    collaborators_count: int = Field(..., ge=0)
    yjs_state: Optional[str] = None  # Base64-encoded Yjs document state
    current_user_permission: Optional[str] = None


# Collaborator model
class Collaborator(BaseModel):
    id: UUID
    mindmap_id: UUID
    user_id: UUID
    user: Optional[User] = None
    permission: Permission
    joined_at: datetime


# Request models
class CreateMindMapRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)


class UpdateMindMapRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)


class AddCollaboratorRequest(BaseModel):
    user_email: EmailStr
    permission: Permission


class UpdateCollaboratorPermissionRequest(BaseModel):
    permission: Permission


# Pagination model
class Pagination(BaseModel):
    page: int = Field(..., ge=1)
    limit: int = Field(..., ge=1, le=100)
    total: int = Field(..., ge=0)
    total_pages: int = Field(..., ge=0)
