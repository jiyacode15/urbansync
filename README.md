# URBANSYNC

Citizen Voice. Smarter City.

## Problem statement
"To investigate the interaction between urban services and citizens and identify opportunities for improved service delivery."

## Academic context
- Semester V
- Urban System
- Problem Statement 7

## Project overview
UrbanSync is a smart citizen–urban services interaction platform designed to bridge the communication gap between citizens and city authorities. It allows citizens to report civic issues, track complaint progress, participate in community discussions, and view service health indicators. Administrators can monitor city issues, assign departments, prioritize complaints, and review service performance using a command-center dashboard.

## Features
- Citizen issue reporting and issue tracking
- Explainable issue prioritization
- Similar-issue detection to help reduce duplicate reports
- Interactive city map
- Citizen support and upvotes
- Citizen feedback and ratings
- Community polls
- Urban service dashboard
- Admin command center
- Database-backed analytics
- Department performance scorecards
- City intelligence insights derived from demo data

## Academic objectives
1. Study interaction between citizens and urban services.
2. Provide a digital mechanism for citizens to communicate service-related problems.
3. Improve visibility of complaint status.
4. Reduce duplicate reporting using similar-issue detection.
5. Prioritize service requests systematically.
6. Collect citizen feedback.
7. Analyze service performance.
8. Identify opportunities for improved urban service delivery.

## Features
- Futuristic landing page with premium dark-glass design
- Civic issue reporting form with geolocation
- Duplicate issue detection before submission
- Smart priority score logic
- Explore issues list and map view
- Service and department overview pages
- Community poll and trending concerns
- Citizen dashboard and feedback
- Admin command center with KPI cards and Chart.js analytics
- SQLite database with SQLAlchemy models
- Seeded demo data with Mumbai and Mira-Bhayandar sample locations

## Architecture
This project follows a simple full-stack architecture:
- Frontend: HTML, CSS, Bootstrap 5-inspired custom styles, vanilla JavaScript
- Backend: FastAPI + SQLAlchemy ORM
- Database: SQLite
- Visualization: Chart.js and Leaflet.js
- Server: Uvicorn

## Technology stack
- Frontend: HTML, CSS, vanilla JavaScript, Bootstrap 5 utility patterns, Chart.js, Leaflet.js
- Backend: Python, FastAPI, Uvicorn
- Database: SQLite, SQLAlchemy
- Templates: Jinja2
- Icons and typography: Font Awesome and Google Fonts (loaded from external CDNs)

## Database explanation
The database is SQLite and stores citizens’ issue reports, updates, departments, votes, and feedback. The core entities include:
- User
- Issue
- Department
- IssueUpdate
- IssueSupport
- Feedback
- Poll
- PollOption
- PollVote

The seeded dataset is demo data only and is clearly marked as such in the context of the project. It is not a live municipal data feed.

## Installation
From the project root, create and activate a virtual environment.

Windows PowerShell:
```powershell
python -m venv venv
venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

If PowerShell blocks environment activation, use Command Prompt:
```bat
python -m venv venv
venv\Scripts\activate.bat
pip install -r requirements.txt
copy .env.example .env
```

Edit `.env` and replace the placeholder `SECRET_KEY` and `ADMIN_PASSWORD` values before starting the app. For the college demo login, set `ADMIN_EMAIL=admin@urbansync.local` and `ADMIN_PASSWORD=admin123`.

## Running the project
From the project root, run:
```powershell
uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000` in a browser.

The database tables are created and demo data is seeded on application startup only when the database has no departments.

## Admin credentials
Admin credentials are read from `ADMIN_EMAIL` and `ADMIN_PASSWORD`; the password is not stored in the frontend or source code. For a local college demonstration only, configure:

- `ADMIN_EMAIL=admin@urbansync.local`
- `ADMIN_PASSWORD=admin123`

These are public DEMO credentials and must not be used for a public deployment. The Render configuration generates a separate password and signing key. Admin pages and admin APIs use a signed session cookie after login.

## API endpoints
- GET /api/issues
- POST /api/issues
- GET /api/issues/{id}
- PATCH /api/issues/{id}
- POST /api/issues/{id}/support
- POST /api/issues/{id}/feedback
- GET /api/departments
- GET /api/dashboard/stats
- GET /api/analytics
- GET /api/map/issues
- GET /api/activity
- GET /api/polls
- POST /api/polls/{id}/vote
- POST /api/admin/login
- GET /api/admin/issues
- PATCH /api/admin/issues/{id}
- GET /api/admin/feedback
- GET /api/admin/performance

## Admin pages
- /admin/dashboard — City Command Center
- /admin/issues — searchable and editable issue management
- /admin/map — issue map
- /admin/departments — department workload
- /admin/analytics — database-backed charts and resolution metrics
- /admin/feedback — citizen ratings and recent feedback
- /admin/performance — department scorecards

## Folder structure
urbansync/
├── app/
│   ├── main.py
│   ├── config.py
│   ├── security.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── seed.py
│   ├── services.py
│   ├── routers/
│   │   ├── issues.py
│   │   ├── analytics.py
│   │   ├── admin.py
│   │   ├── departments.py
│   │   └── community.py
│   ├── templates/
│   │   ├── index.html
│   │   ├── report.html
│   │   ├── issues.html
│   │   ├── issue_detail.html
│   │   ├── services.html
│   │   ├── community.html
│   │   ├── dashboard.html
│   │   ├── admin_login.html
│   │   └── admin_dashboard.html
│   └── static/
│       ├── css/
│       │   ├── style.css
│       │   └── admin.css
│       ├── js/
│       │   ├── main.js
│       │   ├── report.js
│       │   ├── map.js
│       │   ├── dashboard.js
│       │   └── admin.js
│       └── images/
├── uploads/
├── render.yaml
├── .env.example
├── requirements.txt
├── README.md
└── .gitignore

## How UrbanSync solves the problem statement
Citizen → Issue Report → UrbanSync → Classification & Prioritization → Relevant Urban Department → Service Action → Status Update → Citizen Feedback → Service Analytics

This workflow demonstrates how better digital interaction between citizens and authorities can improve service delivery, increase transparency, and reduce duplicate complaints.

## Deployment — Render

This project is prepared for Render but has **not** been deployed.

1. Push the project to a GitHub repository.
2. In Render, create a new **Web Service** and connect that GitHub repository.
3. Select the `main` branch (or the branch containing the project).
4. Render can use the included `render.yaml` blueprint configuration. Confirm:
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Configure environment variables in Render:
   - `APP_ENV=production`
   - `DATABASE_URL=sqlite:///./urbansync.db`
   - `ADMIN_EMAIL=admin@urbansync.local` (or another admin email)
   - `ADMIN_PASSWORD` — set a strong, unique secret in Render; never reuse the local demo password.
   - `SECRET_KEY` — set a long random signing secret. The included Render blueprint generates both secrets.
6. Wait for the build and service to finish starting, then verify `https://<your-service>.onrender.com/health` returns `{"status":"ok","service":"UrbanSync"}`.
7. Access the site at `https://<your-service>.onrender.com`. Sign in at `/admin/login`; retrieve the generated `ADMIN_PASSWORD` from the Render environment settings if it was generated by the blueprint.

### SQLite and Render storage limitation

The application resolves relative SQLite paths against the project root, so the configured URL does not accidentally create a separate database when the process working directory changes. Render's normal filesystem is ephemeral: data written to this SQLite database, including citizen reports and admin updates, can be lost when an instance is replaced or redeployed. The free service configuration does not attach a persistent disk. For data that must survive deployments, configure a Render persistent disk mounted at a writable path and set `DATABASE_URL` to that mounted database file, or migrate to a managed external database. SQLite on an ephemeral instance is suitable for a demonstration, not durable production storage.

### Uploads and external assets

The issue photo control currently previews the selected image in the browser only; it does not upload or persist image files. External fonts, icons, Chart.js, Leaflet and OpenStreetMap map tiles are loaded from their respective third-party CDNs/services, so these visual features require network access from the visitor's browser.

## Future scope
The following improvements are possible future extensions but not currently implemented:
- AI image-based issue classification
- Machine-learning priority prediction
- Municipal API integration
- IoT sensor integration
- Real-time traffic information
- Automatic department routing
- WhatsApp complaint integration
- Multilingual support
- Mobile application
- GIS heatmaps
- Predictive maintenance

## Summary
UrbanSync demonstrates a realistic smart-city civic platform that could help cities better understand citizen concerns, route them efficiently, and improve public service responsiveness using a clear digital and data-driven workflow.
