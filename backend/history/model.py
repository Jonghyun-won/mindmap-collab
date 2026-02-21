from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, Any


class ChangeRecord(BaseModel):
    id: UUID
    mindmap_id: UUID
    user_id: UUID
    user_name: Optional[str] = None
    action: str
    node_id: Optional[str] = None
    details: Optional[dict[str, Any]] = None
    created_at: datetime


class CreateChangeRequest(BaseModel):
    action: str
    node_id: Optional[str] = None
    details: Optional[dict[str, Any]] = None


class ChangeHistoryResponse(BaseModel):
    changes: list[ChangeRecord]
    total: int
    page: int
    limit: int
