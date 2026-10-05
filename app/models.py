from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    phone = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), unique=True, nullable=False)
    code = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    avg_response_hours = Column(Float, default=4.0)
    rating = Column(Float, default=4.5)
    active = Column(Boolean, default=True)

    issues = relationship("Issue", back_populates="department")


class Issue(Base):
    __tablename__ = "issues"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(String(30), unique=True, index=True, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(80), nullable=False)
    area = Column(String(120), nullable=False)
    landmark = Column(String(200), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    priority = Column(String(40), nullable=False, default="Medium")
    priority_score = Column(Integer, default=0)
    status = Column(String(40), nullable=False, default="Reported")
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    citizen_name = Column(String(120), nullable=False)
    email = Column(String(150), nullable=False)
    phone = Column(String(25), nullable=True)
    support_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    department = relationship("Department", back_populates="issues")
    updates = relationship("IssueUpdate", back_populates="issue", cascade="all, delete-orphan")
    supports = relationship("IssueSupport", back_populates="issue", cascade="all, delete-orphan")
    feedbacks = relationship("Feedback", back_populates="issue", cascade="all, delete-orphan")


class IssueUpdate(Base):
    __tablename__ = "issue_updates"

    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(Integer, ForeignKey("issues.id"), nullable=False)
    update_text = Column(Text, nullable=False)
    stage = Column(String(80), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    issue = relationship("Issue", back_populates="updates")


class IssueSupport(Base):
    __tablename__ = "issue_supports"

    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(Integer, ForeignKey("issues.id"), nullable=False)
    session_key = Column(String(120), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    issue = relationship("Issue", back_populates="supports")


class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(Integer, ForeignKey("issues.id"), nullable=False)
    rating = Column(Integer, nullable=False)
    comments = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    issue = relationship("Issue", back_populates="feedbacks")


class Poll(Base):
    __tablename__ = "polls"

    id = Column(Integer, primary_key=True, index=True)
    question = Column(String(250), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    options = relationship("PollOption", back_populates="poll", cascade="all, delete-orphan")


class PollOption(Base):
    __tablename__ = "poll_options"

    id = Column(Integer, primary_key=True, index=True)
    poll_id = Column(Integer, ForeignKey("polls.id"), nullable=False)
    text = Column(String(200), nullable=False)
    vote_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    poll = relationship("Poll", back_populates="options")
    votes = relationship("PollVote", back_populates="option", cascade="all, delete-orphan")


class PollVote(Base):
    __tablename__ = "poll_votes"

    id = Column(Integer, primary_key=True, index=True)
    poll_id = Column(Integer, ForeignKey("polls.id"), nullable=False)
    option_id = Column(Integer, ForeignKey("poll_options.id"), nullable=False)
    session_key = Column(String(120), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    option = relationship("PollOption", back_populates="votes")
