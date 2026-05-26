from fastapi import APIRouter,Depends
from sqlalchemy.orm import Session
from app.db.dependencies import get_db
from app.db.repository import get_history

router=APIRouter(prefix="/history")

@router.get("/{document_id}")
def fetch_history(document_id: str, db: Session = Depends(get_db)):
    """Get full chat history for a document"""
    history = get_history(db, document_id)
    return history


