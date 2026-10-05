from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Department, Feedback, Issue, IssueSupport, IssueUpdate
from app.schemas import FeedbackCreate, IssueCreate, IssueUpdatePayload
from app.services import category_to_department, compute_priority_score, generate_ticket_id, serialize_issue

router = APIRouter(prefix="/api", tags=["issues"])


@router.get("/issues")
def list_issues(
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    area: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Issue)
    if category:
        query = query.filter(Issue.category == category)
    if status:
        query = query.filter(Issue.status == status)
    if priority:
        query = query.filter(Issue.priority == priority)
    if area:
        query = query.filter(Issue.area == area)
    if department:
        query = query.filter(Issue.department.has(Department.name == department))
    if search:
        term = f"%{search}%"
        query = query.filter(or_(Issue.title.ilike(term), Issue.description.ilike(term), Issue.area.ilike(term)))

    issues = query.order_by(Issue.created_at.desc()).all()
    return [serialize_issue(issue) for issue in issues]


@router.post("/issues")
def create_issue(payload: IssueCreate, db: Session = Depends(get_db)):
    similar = []
    search_term = f"%{payload.title}%"
    candidate_issues = (
        db.query(Issue)
        .filter(Issue.category == payload.category)
        .filter(Issue.area == payload.area)
        .filter(or_(Issue.title.ilike(search_term), Issue.description.ilike(f"%{payload.description[:30]}%")))
        .limit(5)
        .all()
    )
    for issue in candidate_issues:
        similar.append(serialize_issue(issue))

    department_name = category_to_department(payload.category)
    department = db.query(Department).filter(Department.name == department_name).first()
    if not department:
        department = Department(name=department_name, code=department_name[:3].upper(), description="Auto assigned department")
        db.add(department)
        db.flush()

    issue = Issue(
        ticket_id=generate_ticket_id(db),
        title=payload.title,
        description=payload.description,
        category=payload.category,
        area=payload.area,
        landmark=payload.landmark,
        latitude=payload.latitude,
        longitude=payload.longitude,
        priority=payload.priority,
        priority_score=compute_priority_score(payload.priority, 0, 0, payload.category),
        status="Reported",
        department_id=department.id,
        citizen_name=payload.citizen_name,
        email=payload.email,
        phone=payload.phone,
        support_count=0,
    )
    db.add(issue)
    db.flush()

    issue_update = IssueUpdate(
        issue_id=issue.id,
        update_text="Citizen report submitted and routed to the relevant department.",
        stage="Reported",
    )
    db.add(issue_update)
    db.commit()
    db.refresh(issue)

    return {
        "message": "Report received successfully.",
        "issue": serialize_issue(issue),
        "similar_issues": similar,
        "ticket_id": issue.ticket_id,
        "department": department.name,
    }


@router.get("/issues/{issue_id}")
def get_issue(issue_id: int, db: Session = Depends(get_db)):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    updates = [
        {"id": update.id, "stage": update.stage, "update_text": update.update_text, "created_at": update.created_at.isoformat()}
        for update in issue.updates
    ]
    feedbacks = [
        {"rating": item.rating, "comments": item.comments, "created_at": item.created_at.isoformat()}
        for item in issue.feedbacks
    ]
    payload = serialize_issue(issue)
    payload["updates"] = updates
    payload["feedbacks"] = feedbacks
    return payload


@router.patch("/issues/{issue_id}")
def update_issue(issue_id: int, payload: IssueUpdatePayload, db: Session = Depends(get_db)):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    if payload.status:
        issue.status = payload.status
        if payload.status == "Resolved":
            issue.resolved_at = datetime.utcnow()
        elif issue.resolved_at and payload.status != "Resolved":
            issue.resolved_at = None

    if payload.priority:
        issue.priority = payload.priority

    if payload.department_id:
        issue.department_id = payload.department_id

    issue.updated_at = datetime.utcnow()
    issue.priority_score = compute_priority_score(issue.priority, issue.support_count, 0, issue.category)

    db.add(IssueUpdate(issue_id=issue.id, update_text=f"Status updated to {issue.status}.", stage=issue.status))
    db.commit()
    return serialize_issue(issue)


@router.post("/issues/{issue_id}/support")
def support_issue(issue_id: int, session_key: str = "demo-session", db: Session = Depends(get_db)):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    existing = db.query(IssueSupport).filter(IssueSupport.issue_id == issue_id, IssueSupport.session_key == session_key).first()
    if existing:
        return {"message": "You already supported this issue.", "support_count": issue.support_count}

    db.add(IssueSupport(issue_id=issue.id, session_key=session_key))
    issue.support_count += 1
    issue.priority_score = compute_priority_score(issue.priority, issue.support_count, 0, issue.category)
    db.commit()
    return {"message": "Support recorded.", "support_count": issue.support_count}


@router.post("/issues/{issue_id}/feedback")
def issue_feedback(issue_id: int, payload: FeedbackCreate, db: Session = Depends(get_db)):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    feedback = Feedback(issue_id=issue.id, rating=payload.rating, comments=payload.comments)
    db.add(feedback)
    db.commit()
    return {"message": "Feedback submitted successfully."}
