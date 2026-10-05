import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import PROJECT_ROOT

default_database_url = (
    "sqlite:////tmp/urbansync.db"
    if os.getenv("VERCEL") == "1"
    else "sqlite:///./urbansync.db"
)
DATABASE_URL = os.getenv("DATABASE_URL", default_database_url)
database_url = make_url(DATABASE_URL)

if database_url.get_backend_name() == "sqlite":
    database_path = database_url.database
    if database_path and database_path != ":memory:":
        resolved_database_path = Path(database_path)
        if not resolved_database_path.is_absolute():
            resolved_database_path = PROJECT_ROOT / resolved_database_path
        resolved_database_path.parent.mkdir(parents=True, exist_ok=True)
        database_url = database_url.set(database=str(resolved_database_path))
    engine = create_engine(database_url, connect_args={"check_same_thread": False})
else:
    engine = create_engine(database_url)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
