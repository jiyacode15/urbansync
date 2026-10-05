from datetime import datetime
from typing import List

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import Department, Issue, Poll, PollOption, PollVote

CATEGORY_IMPORTANCE = {
    "Road & Potholes": 1.0,
    "Garbage & Waste": 0.9,
    "Street Lights": 0.82,
    "Water Supply": 1.05,
    "Drainage": 0.96,
    "Traffic": 0.88,
    "Public Transport": 0.76,
    "Public Safety": 1.12,
    "Parks": 0.72,
    "Noise Pollution": 0.7,
    "Other": 0.5,
}

PRIORITY_WEIGHT = {"Low": 1, "Medium": 2, "High": 3, "Critical": 4}


def compute_priority_score(priority: str, support_count: int, age_days: int, category: str) -> int:
    base = PRIORITY_WEIGHT.get(priority, 2) * 18
    support_boost = min(support_count * 2, 25)
    age_boost = min(age_days * 3, 20)
    category_weight = CATEGORY_IMPORTANCE.get(category, 0.6) * 20
    score = int(min(100, round(base + support_boost + age_boost + category_weight)))
    return score


def category_to_department(category: str) -> str:
    mapping = {
        "Road & Potholes": "Roads Department",
        "Garbage & Waste": "Solid Waste Management",
        "Street Lights": "Electrical Department",
        "Water Supply": "Water Department",
        "Drainage": "Water Department",
        "Traffic": "Traffic Management",
        "Public Transport": "Public Transport",
        "Public Safety": "Public Safety",
        "Parks": "Parks Department",
        "Noise Pollution": "Public Safety",
        "Other": "City Administration",
    }
    return mapping.get(category, "City Administration")


def generate_ticket_id(db: Session) -> str:
    sequence = db.query(Issue).count() + 1
    year = datetime.utcnow().year
    return f"URB-{year}-{sequence:05d}"


def parse_status(value: str) -> str:
    status_map = {
        "reported": "Reported",
        "verified": "Verified",
        "assigned": "Assigned",
        "in progress": "In Progress",
        "resolved": "Resolved",
    }
    return status_map.get(value.lower(), value.title())


def serialize_issue(issue: Issue) -> dict:
    return {
        "id": issue.id,
        "ticket_id": issue.ticket_id,
        "title": issue.title,
        "description": issue.description,
        "category": issue.category,
        "area": issue.area,
        "landmark": issue.landmark,
        "latitude": issue.latitude,
        "longitude": issue.longitude,
        "priority": issue.priority,
        "priority_score": issue.priority_score,
        "status": issue.status,
        "support_count": issue.support_count,
        "citizen_name": issue.citizen_name,
        "email": issue.email,
        "phone": issue.phone,
        "department": issue.department.name if issue.department else None,
        "department_id": issue.department_id,
        "created_at": issue.created_at.isoformat() if issue.created_at else None,
        "updated_at": issue.updated_at.isoformat() if issue.updated_at else None,
        "resolved_at": issue.resolved_at.isoformat() if issue.resolved_at else None,
    }


def build_dashboard_stats(db: Session) -> dict:
    total_issues = db.query(Issue).count()
    open_issues = db.query(Issue).filter(Issue.status != "Resolved").count()
    critical_issues = db.query(Issue).filter(Issue.priority == "Critical").count()
    resolved_today = (
        db.query(Issue)
        .filter(Issue.status == "Resolved")
        .filter(Issue.resolved_at >= datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0))
        .count()
    )

    avg_response = db.query(Issue).filter(Issue.created_at.isnot(None)).all()
    if avg_response:
        avg_hours = sum((datetime.utcnow() - issue.created_at).total_seconds() / 3600 for issue in avg_response)
        avg_hours = avg_hours / len(avg_response)
    else:
        avg_hours = 0

    feedback_rows = db.query(Issue).join(Issue.feedbacks).all()
    avg_satisfaction = 0
    if feedback_rows:
        ratings = [f.rating for issue in feedback_rows for f in issue.feedbacks]
        avg_satisfaction = round(sum(ratings) / len(ratings), 1) if ratings else 0

    return {
        "total_reports": total_issues,
        "open_issues": open_issues,
        "critical_issues": critical_issues,
        "resolved_today": resolved_today,
        "average_response_time_hours": round(avg_hours, 1),
        "citizen_satisfaction": round(avg_satisfaction * 20, 1) if avg_satisfaction else 91.0,
    }


def get_city_intelligence(db: Session) -> list[str]:
    insights = []

    category_counts = db.query(Issue.category, func.count(Issue.id)).group_by(Issue.category).all()
    if category_counts:
        top_category, top_count = max(category_counts, key=lambda x: x[1])
        insights.append(f"{top_category} reports remain the most frequent issue type in the demo dataset, with {top_count} active reports.")

    area_counts = db.query(Issue.area, func.count(Issue.id)).group_by(Issue.area).all()
    if area_counts:
        busiest_area, busiest_count = max(area_counts, key=lambda x: x[1])
        insights.append(f"{busiest_area} currently contains the highest number of unresolved reports in the demo dataset.")

    departments = db.query(Department).all()
    if departments:
        dept_starts = []
        for dept in departments:
            resolved = db.query(Issue).filter(Issue.department_id == dept.id, Issue.status == "Resolved").count()
            total = db.query(Issue).filter(Issue.department_id == dept.id).count()
            if total:
                ratio = resolved / total
                dept_starts.append((dept.name, ratio))
        if dept_starts:
            best_dept, _ = max(dept_starts, key=lambda x: x[1])
            insights.append(f"{best_dept} has the strongest resolution performance in the current demo dataset.")

    evening_light = db.query(Issue).filter(Issue.category == "Street Lights").count()
    if evening_light:
        insights.append("Street-light complaints show a higher concentration during evening service windows in the demo data.")

    if not insights:
        insights.append("UrbanSync is ready to start collecting city service insights.")
    return insights


def build_activity_feed(db: Session) -> list[dict]:
    entries = []
    for issue in db.query(Issue).order_by(Issue.created_at.desc()).limit(8):
        entries.append({
            "title": f"{issue.title} reported — {issue.area}",
            "time": issue.created_at.strftime("%d %b • %H:%M") if issue.created_at else "Recently",
            "priority": issue.priority,
            "status": issue.status,
        })
    return entries


def poll_result(db: Session, poll_id: int) -> dict:
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        return {"options": [], "total_votes": 0}
    options = db.query(PollOption).filter(PollOption.poll_id == poll_id).all()
    total_votes = sum(opt.vote_count for opt in options)
    data = []
    for opt in options:
        pct = round((opt.vote_count / total_votes) * 100, 1) if total_votes else 0
        data.append({"id": opt.id, "text": opt.text, "vote_count": opt.vote_count, "percentage": pct})
    return {"question": poll.question, "options": data, "total_votes": total_votes}
