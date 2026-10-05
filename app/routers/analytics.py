from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Department, Feedback, Issue
from app.services import build_activity_feed, build_dashboard_stats, get_city_intelligence

router = APIRouter(prefix="/api", tags=["analytics"])


@router.get("/dashboard/stats")
def dashboard_stats(db: Session = Depends(get_db)):
    return build_dashboard_stats(db)


@router.get("/analytics")
def analytics(db: Session = Depends(get_db)):
    category_counts = db.query(Issue.category, func.count(Issue.id).label("count")).group_by(Issue.category).all()
    area_counts = db.query(Issue.area, func.count(Issue.id).label("count")).group_by(Issue.area).all()
    priority_counts = db.query(Issue.priority, func.count(Issue.id).label("count")).group_by(Issue.priority).all()
    status_counts = db.query(Issue.status, func.count(Issue.id).label("count")).group_by(Issue.status).all()
    feedback_rows = db.query(Feedback).all()
    ratings = [row.rating for row in feedback_rows]
    current_date = datetime.utcnow()
    monthly = []
    for offset in range(5, -1, -1):
        month_index = current_date.month - offset
        year = current_date.year
        while month_index <= 0:
            month_index += 12
            year -= 1
        start = datetime(year, month_index, 1)
        next_month = month_index + 1
        end_year = year
        if next_month > 12:
            next_month = 1
            end_year += 1
        end = datetime(end_year, next_month, 1)
        reports = db.query(Issue).filter(Issue.created_at >= start, Issue.created_at < end).count()
        resolutions = db.query(Issue).filter(Issue.resolved_at >= start, Issue.resolved_at < end).count()
        monthly.append({"month": start.strftime("%b %Y"), "reports": reports, "resolutions": resolutions})

    total_issues = db.query(Issue).count()
    resolved_issues = db.query(Issue).filter(Issue.status == "Resolved").count()

    departments = db.query(Department).all()
    dept_data = []
    for dept in departments:
        total = db.query(Issue).filter(Issue.department_id == dept.id).count()
        resolved = db.query(Issue).filter(Issue.department_id == dept.id, Issue.status == "Resolved").count()
        rating = db.query(Feedback).join(Issue).filter(Issue.department_id == dept.id).all()
        score = round((resolved / total) * 100, 1) if total else 0
        dept_data.append({
            "name": dept.name,
            "total": total,
            "resolved": resolved,
            "score": score,
            "rating": round(sum(item.rating for item in rating) / len(rating), 1) if rating else 4.5,
        })

    return {
        "category_counts": [{"label": category, "value": count} for category, count in category_counts],
        "area_counts": [{"label": area, "value": count} for area, count in area_counts],
        "priority_counts": [{"label": priority, "value": count} for priority, count in priority_counts],
        "status_counts": [{"label": status, "value": count} for status, count in status_counts],
        "satisfaction_trend": [{"label": "Q1", "value": 85}, {"label": "Q2", "value": 88}, {"label": "Q3", "value": 91}, {"label": "Q4", "value": 94}],
        "monthly_trend": monthly,
        "resolution_rate": round(resolved_issues / total_issues * 100, 1) if total_issues else 0,
        "total_reports": total_issues,
        "resolved_reports": resolved_issues,
        "department_performance": dept_data,
        "intelligence": get_city_intelligence(db),
        "average_rating": round(sum(ratings) / len(ratings), 1) if ratings else 4.4,
    }


@router.get("/map/issues")
def map_issues(db: Session = Depends(get_db)):
    issues = db.query(Issue).filter(Issue.latitude.isnot(None), Issue.longitude.isnot(None)).all()
    return [{
        "id": issue.id,
        "ticket_id": issue.ticket_id,
        "title": issue.title,
        "area": issue.area,
        "priority": issue.priority,
        "status": issue.status,
        "support_count": issue.support_count,
        "latitude": issue.latitude,
        "longitude": issue.longitude,
        "category": issue.category,
    } for issue in issues]


@router.get("/activity")
def activity(db: Session = Depends(get_db)):
    return build_activity_feed(db)
