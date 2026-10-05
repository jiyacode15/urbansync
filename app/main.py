import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware

from app.config import APP_ENV, SESSION_SECRET_KEY
from app.database import SessionLocal, engine, Base
from app.models import Issue
from app.routers.admin import router as admin_router
from app.routers.analytics import router as analytics_router
from app.routers.community import router as community_router
from app.routers.departments import router as departments_router
from app.routers.issues import router as issues_router
from app.seed import seed_database

BASE_DIR = Path(__file__).resolve().parent
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_database(db)
    yield


app = FastAPI(title="UrbanSync", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET_KEY,
    same_site="lax",
    https_only=APP_ENV == "production",
    max_age=60 * 60 * 8,
)

app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")
app.include_router(issues_router)
app.include_router(departments_router)
app.include_router(community_router)
app.include_router(analytics_router)
app.include_router(admin_router)

@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request, "title": "UrbanSync"})


@app.get("/report", response_class=HTMLResponse)
def report(request: Request):
    return templates.TemplateResponse("report.html", {"request": request, "title": "Report Issue"})


@app.get("/issues", response_class=HTMLResponse)
def issues(request: Request):
    return templates.TemplateResponse("issues.html", {"request": request, "title": "Explore Issues"})


@app.get("/issue/{issue_id}", response_class=HTMLResponse)
def issue_detail(issue_id: int, request: Request):
    with SessionLocal() as db:
        issue = db.query(Issue).filter(Issue.id == issue_id).first()
        if not issue:
            return templates.TemplateResponse("index.html", {"request": request, "title": "Issue not found"})
    return templates.TemplateResponse("issue_detail.html", {"request": request, "title": issue.title, "issue_id": issue_id})


@app.get("/services", response_class=HTMLResponse)
def services(request: Request):
    return templates.TemplateResponse("services.html", {"request": request, "title": "City Services"})


@app.get("/community", response_class=HTMLResponse)
def community(request: Request):
    return templates.TemplateResponse("community.html", {"request": request, "title": "Community"})


@app.get("/dashboard", response_class=HTMLResponse)
def dashboard(request: Request):
    return templates.TemplateResponse("dashboard.html", {"request": request, "title": "My UrbanSync"})


@app.get("/admin/login", response_class=HTMLResponse)
def admin_login_page(request: Request):
    return templates.TemplateResponse("admin_login.html", {"request": request, "title": "Admin Login"})


@app.get("/admin/logout")
def admin_logout_page(request: Request):
    request.session.clear()
    return RedirectResponse(url="/admin/login", status_code=303)


@app.get("/admin", include_in_schema=False)
def admin_root():
    return RedirectResponse(url="/admin/dashboard", status_code=307)


@app.get("/admin/dashboard", response_class=HTMLResponse)
def admin_dashboard(request: Request):
    if not request.session.get("admin_authenticated"):
        return RedirectResponse(url="/admin/login", status_code=303)
    return templates.TemplateResponse("admin_dashboard.html", {"request": request, "title": "City Command Center"})


@app.get("/admin/{section}", response_class=HTMLResponse)
def admin_section(section: str, request: Request):
    if not request.session.get("admin_authenticated"):
        return RedirectResponse(url="/admin/login", status_code=303)
    sections = {
        "issues": ("Issue Management", "issues"),
        "map": ("City Map", "map"),
        "departments": ("Departments", "departments"),
        "analytics": ("Analytics", "analytics"),
        "feedback": ("Citizen Feedback", "feedback"),
        "performance": ("Service Performance", "performance"),
    }
    section_data = sections.get(section)
    if section_data is None:
        return templates.TemplateResponse(
            "admin_error.html",
            {"request": request, "title": "Section not found", "message": "This UrbanSync admin section is unavailable."},
            status_code=404,
        )
    title, page_key = section_data
    return templates.TemplateResponse(
        "admin_section.html",
        {"request": request, "title": title, "page_title": title, "page_key": page_key},
    )


@app.get("/health")
def health():
    return {"status": "ok", "service": "UrbanSync"}


@app.exception_handler(Exception)
async def handle_unexpected_error(request: Request, exc: Exception):
    logger.exception("Unhandled application error for %s", request.url.path, exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again later."},
    )
