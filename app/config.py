import os
import secrets
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

APP_ENV = os.getenv("APP_ENV", "development").lower()
SECRET_KEY = os.getenv("SECRET_KEY")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@urbansync.local")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")

if APP_ENV == "production" and (
    not SECRET_KEY or len(SECRET_KEY) < 32 or SECRET_KEY.startswith("replace-with-")
):
    raise RuntimeError("A SECRET_KEY of at least 32 characters must be configured in production.")
if APP_ENV == "production" and (
    not ADMIN_PASSWORD or ADMIN_PASSWORD.startswith("replace-with-")
):
    raise RuntimeError("A non-placeholder ADMIN_PASSWORD must be configured in production.")

SESSION_SECRET_KEY = SECRET_KEY or secrets.token_urlsafe(48)
