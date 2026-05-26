"""
Shared database dependencies for FastAPI endpoints
"""
from app.db.sqlite import SessionLocal
from sqlalchemy.orm import Session


def get_db() -> Session:
    """
    Get database session dependency for FastAPI endpoints.
    
    Yields:
    - SQLAlchemy Session
    
    Ensures connection is closed after request completion.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
