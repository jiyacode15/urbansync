from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Department, Issue

router = APIRouter(prefix="/api", tags=["departments"])


@router.get("/departments")
def get_departments(db: Session = Depends(get_db)):
    departments = db.query(Department).all()
    result = []
    for dept in departments:
        total_reports = db.query(Issue).filter(Issue.department_id == dept.id).count()
        open_reports = db.query(Issue).filter(Issue.department_id == dept.id, Issue.status != "Resolved").count()
        resolved = db.query(Issue).filter(Issue.department_id == dept.id, Issue.status == "Resolved").count()
        result.append({
            "id": dept.id,
            "name": dept.name,
            "code": dept.code,
            "description": dept.description,
            "avg_response_hours": dept.avg_response_hours,
            "rating": dept.rating,
            "active": dept.active,
            "total_reports": total_reports,
            "open_reports": open_reports,
            "resolved_reports": resolved,
        })
    return result
