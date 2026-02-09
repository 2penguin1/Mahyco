from pydantic import BaseModel, EmailStr
from typing import Literal
from datetime import datetime

Role = Literal["user", "company"]


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: Role = "user"
    company_name: str | None = None  # for company accounts


class UserInDB(BaseModel):
    email: str
    hashed_password: str
    full_name: str
    role: Role
    company_name: str | None = None
    created_at: datetime | None = None
    disabled: bool = False


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: Role
    company_name: str | None = None
    created_at: datetime | None = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    user_id: str | None = None
    email: str | None = None
    role: Role | None = None
