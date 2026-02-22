from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class AdminUser(BaseModel):
    id: UUID
    email: str
    name: Optional[str] = None
    team: Optional[str] = None
    role: str = "user"
    email_verified: bool = False
    is_active: bool = True
    created_at: datetime
    mindmap_count: int = 0
    last_activity: Optional[datetime] = None


class AdminUserListResponse(BaseModel):
    users: List[AdminUser]
    total: int
    page: int
    limit: int


class AdminDashboardStats(BaseModel):
    total_users: int
    verified_users: int
    unverified_users: int
    active_users: int
    inactive_users: int
    total_mindmaps: int


class UpdateUserRoleRequest(BaseModel):
    role: str


class UpdateUserStatusRequest(BaseModel):
    is_active: bool
