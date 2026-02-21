from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional


class Comment(BaseModel):
    id: UUID
    mindmap_id: UUID
    node_id: str
    user_id: UUID
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    content: str
    created_at: datetime
    updated_at: datetime


class CreateCommentRequest(BaseModel):
    content: str


class CommentListResponse(BaseModel):
    comments: list[Comment]
    total: int
