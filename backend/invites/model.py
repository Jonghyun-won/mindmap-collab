from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional


class InviteLink(BaseModel):
    id: UUID
    mindmap_id: UUID
    token: str
    permission: str
    created_by: UUID
    expires_at: Optional[datetime] = None
    max_uses: Optional[int] = None
    use_count: int = 0
    created_at: datetime


class CreateInviteLinkRequest(BaseModel):
    permission: str = "view"
    expires_in_hours: Optional[int] = None
    max_uses: Optional[int] = None


class InviteLinkResponse(BaseModel):
    invite: InviteLink
    url: str


class InviteListResponse(BaseModel):
    invites: list[InviteLink]
