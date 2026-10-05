import hmac
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.config import ADMIN_EMAIL, ADMIN_PASSWORD
from app.database import get_db
from app.models import Department, Feedback, Issue, IssueUpdate
from app.security import require_admin
from app.schemas import AdminLogin, IssueUpdatePayload
from app.services import compute_priority_score
from app.services import serialize_issue

router = APIRouter(prefix="/api", tags=["admin"])


@router.post("/admin/login")
def admin_login(payload: AdminLogin, request: Request):
    if not ADMIN_PASSWORD:
        raise HTTPException(status_code=503, detail="Admin credentials are not configured.")
    if hmac.compare_digest(payload.email, ADMIN_EMAIL) and hmac.compare_digest(
        payload.password, ADMIN_PASSWORD
    ):
        request.session["admin_authenticated"] = True
        return {"success": True, "message": "Admin login successful."}
    raise HTTPException(status_code=401, detail="Invalid credentials")


@router.post("/admin/logout")
def admin_logout(request: Request, _: None = Depends(require_admin)):
    request.session.clear()
    return {"success": True, "message": "Admin logged out."}


@router.get("/admin/issues")
def admin_list_issues(db: Session = Depends(get_db), _: None = Depends(require_admin)):
    issues = db.query(Issue).order_by(Issue.created_at.desc()).all()
    return [serialize_issue(issue) for issue in issues]


@router.patch("/admin/issues/{issue_id}")
def admin_update_issue(
    issue_id: int,
    payload: IssueUpdatePayload,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin),
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    changes = []
    if payload.status and payload.status != issue.status:
        issue.status = payload.status
        changes.append(f"Status changed to {payload.status}.")
    if payload.priority:
        if payload.priority != issue.priority:
            changes.append(f"Priority changed to {payload.priority}.")
        issue.priority = payload.priority
    if payload.department_id is not None:
        department = db.query(Department).filter(Department.id == payload.department_id).first()
        if not department:
            raise HTTPException(status_code=400, detail="Department not found")
        if payload.department_id != issue.department_id:
            changes.append(f"Assigned to {department.name}.")
        issue.department_id = payload.department_id
    if payload.status == "Resolved" and issue.resolved_at is None:
        issue.resolved_at = datetime.utcnow()
    elif payload.status and payload.status != "Resolved":
        issue.resolved_at = None
    issue.updated_at = datetime.utcnow()
    issue.priority_score = compute_priority_score(issue.priority, issue.support_count, 0, issue.category)
    if changes:
        db.add(IssueUpdate(issue_id=issue.id, update_text=" ".join(changes), stage=issue.status))
    db.commit()
    db.refresh(issue)
    return serialize_issue(issue)


@router.get("/admin/departments")
def admin_departments(db: Session = Depends(get_db), _: None = Depends(require_admin)):
    deps = db.query(Department).all()
    return [{"id": dep.id, "name": dep.name} for dep in deps]


@router.get("/admin/feedback")
def admin_feedback(db: Session = Depends(get_db), _: None = Depends(require_admin)):
    feedback_rows = db.query(Feedback).join(Issue).order_by(Feedback.created_at.desc()).all()
    total = len(feedback_rows)
    ratings = [item.rating for item in feedback_rows]
    distribution = {
        str(stars): sum(1 for rating in ratings if rating == stars)
        for stars in range(5, 0, -1)
    }
    return {
        "total_feedback": total,
        "average_rating": round(sum(ratings) / total, 2) if total else 0,
        "rating_distribution": {
            stars: {
                "count": count,
                "percentage": round((count / total) * 100, 1) if total else 0,
            }
            for stars, count in distribution.items()
        },
        "recent_feedback": [
            {
                "rating": item.rating,
                "comments": item.comments or "No written comment provided.",
                "ticket_id": item.issue.ticket_id,
                "issue_title": item.issue.title,
                "department": item.issue.department.name if item.issue.department else "Unassigned",
                "created_at": item.created_at.isoformat() if item.created_at else None,
            }
            for item in feedback_rows[:50]
        ],
    }


@router.get("/admin/performance")
def admin_performance(db: Session = Depends(get_db), _: None = Depends(require_admin)):
    departments = db.query(Department).order_by(Department.name).all()
    result = []
    for department in departments:
        issues = db.query(Issue).filter(Issue.department_id == department.id).all()
        total = len(issues)
        resolved_issues = [issue for issue in issues if issue.status == "Resolved"]
        open_count = total - len(resolved_issues)
        completed_times = [
            (issue.resolved_at - issue.created_at).total_seconds() / 3600
            for issue in resolved_issues
            if issue.resolved_at and issue.created_at
        ]
        feedback_rows = (
            db.query(Feedback)
            .join(Issue, Feedback.issue_id == Issue.id)
            .filter(Issue.department_id == department.id)
            .all()
        )
        average_rating = (
            round(sum(item.rating for item in feedback_rows) / len(feedback_rows), 2)
            if feedback_rows
            else 0
        )
        resolution_rate = round((len(resolved_issues) / total) * 100) if total else 0
        result.append({
            "id": department.id,
            "name": department.name,
            "total_issues": total,
            "open_issues": open_count,
            "resolved_issues": len(resolved_issues),
            "performance_score": resolution_rate,
            "average_resolution_hours": round(sum(completed_times) / len(completed_times), 1)
            if completed_times
            else None,
            "average_response_hours": department.avg_response_hours,
            "citizen_rating": average_rating,
        })
    return result
