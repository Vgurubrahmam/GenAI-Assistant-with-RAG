from sqlalchemy import Column,String,Text,DateTime,ForeignKey,JSON
from datetime import datetime
from app.db.sqlite import Base
from sqlalchemy.sql import func

class Document(Base):
    __tablename__="documents"
    vector_store_id=Column(String,nullable=False)
    document_id=Column(String,primary_key=True,index=True)
    filename=Column(String)
    display_name=Column(String,nullable=True)
    summary=Column(Text,nullable=True)
    created_at=Column(DateTime,server_default=func.now())
    doc_metadata=Column(JSON,nullable=True)

class ChatHistory(Base):
    __tablename__="chathistory"

    id=Column(String,primary_key=True,index=True)
    session_id=Column(String,nullable=True,index=True)  # Group multiple chats in one session
    document_id=Column(String, ForeignKey("documents.document_id", ondelete="CASCADE"), nullable=False)
    question=Column(Text)
    answer=Column(Text)
    keywords=Column(String,nullable=True)  # Comma-separated keywords for search
    tags=Column(String,nullable=True)  # Comma-separated tags for categorization
    created_at=Column(DateTime,server_default=func.now())


