from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class IssueBase(BaseModel):
    title: str
    description: str
    category: str
    area: str
    landmark: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    priority: str = "Medium"
    citizen_name: str
    email: EmailStr
    phone: Optional[str] = None


class IssueCreate(IssueBase):
    pass


class IssueUpdatePayload(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    department_id: Optional[int] = None


class FeedbackCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comments: Optional[str] = None


class PollVoteCreate(BaseModel):
    option_id: int


class AdminLogin(BaseModel):
    email: str
    password: str
