from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional


class Chapter(BaseModel):
    id: UUID
    mindmap_id: UUID
    title: str
    position: int
    created_at: datetime
    updated_at: datetime


class ChapterDetail(Chapter):
    """Includes yjs_state in base64"""
    yjs_state: Optional[str] = None  # base64 encoded


class CreateChapterRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)


class UpdateChapterRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)


class ReorderChaptersRequest(BaseModel):
    chapter_ids: list[UUID]
