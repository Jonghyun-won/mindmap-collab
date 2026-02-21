from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from uuid import UUID

# User model - matches api.yaml User schema
class User(BaseModel):
    id: UUID
    email: EmailStr
    name: Optional[str] = None
    team: Optional[str] = None
    email_verified: bool = False
    created_at: datetime

# Request models
class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    team: Optional[str] = Field(None, max_length=100)

class ConfirmEmailRequest(BaseModel):
    email: EmailStr
    confirmation_code: str = Field(..., min_length=6, max_length=6)

class ResendConfirmationRequest(BaseModel):
    email: EmailStr

# Response models
class LoginResponse(BaseModel):
    token: str
    token_type: str = "bearer"
    user: User

class RegisterResponse(BaseModel):
    message: str
    user: User
    confirmation_code: str
