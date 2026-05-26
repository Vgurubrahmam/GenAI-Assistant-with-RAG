from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class ChatMessageResponse(BaseModel):
    """Single chat message response"""
    id: str = Field(..., description="Chat message ID")
    session_id: Optional[str] = Field(None, description="Session ID for grouping conversations")
    document_id: str = Field(..., description="Document ID being queried")
    question: str = Field(..., description="User question")
    answer: str = Field(..., description="AI-generated answer")
    keywords: Optional[str] = Field(None, description="Comma-separated search keywords")
    tags: Optional[str] = Field(None, description="Comma-separated tags for categorization")
    created_at: Optional[str] = Field(None, description="ISO format timestamp")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "msg_123abc",
                "session_id": "sess_456def",
                "document_id": "doc_789ghi",
                "question": "What is the main topic?",
                "answer": "The main topic is about data science principles.",
                "keywords": "data science, principles, main topic",
                "tags": "important, review",
                "created_at": "2026-01-28T23:30:00"
            }
        }


class ChatHistoryResponse(BaseModel):
    """List of chat messages"""
    messages: List[ChatMessageResponse] = Field(..., description="List of chat messages")
    total: int = Field(..., description="Total number of messages")
    session_id: Optional[str] = Field(None, description="Session ID if filtered by session")
    message: str = Field(default="Chat history retrieved successfully", description="Response message")

    class Config:
        json_schema_extra = {
            "example": {
                "messages": [
                    {
                        "id": "msg_123",
                        "session_id": "sess_456",
                        "document_id": "doc_789",
                        "question": "What is data science?",
                        "answer": "Data science is the study of data...",
                        "keywords": "data science, definition",
                        "tags": "basics",
                        "created_at": "2026-01-28T23:30:00"
                    }
                ],
                "total": 1,
                "session_id": "sess_456",
                "message": "Chat history retrieved successfully"
            }
        }


class ChatSearchResponse(BaseModel):
    """Search results for chat history"""
    results: List[ChatMessageResponse] = Field(..., description="Matching chat messages")
    total: int = Field(..., description="Total matching messages")
    query: str = Field(..., description="Search query used")
    filters_applied: str = Field(..., description="Filters applied to search")
    message: str = Field(default="Search completed successfully", description="Response message")

    class Config:
        json_schema_extra = {
            "example": {
                "results": [
                    {
                        "id": "msg_123",
                        "session_id": "sess_456",
                        "document_id": "doc_789",
                        "question": "What is data science?",
                        "answer": "Data science is the study of data...",
                        "keywords": "data science, definition",
                        "tags": "basics",
                        "created_at": "2026-01-28T23:30:00"
                    }
                ],
                "total": 1,
                "query": "data science",
                "filters_applied": "document_id: doc_789, date_range: last_7_days",
                "message": "Search completed successfully"
            }
        }


class ChatUpdateRequest(BaseModel):
    """Request to update chat message"""
    answer: Optional[str] = Field(None, description="Updated answer text")
    keywords: Optional[str] = Field(None, description="Updated comma-separated keywords")
    tags: Optional[str] = Field(None, description="Updated comma-separated tags")

    class Config:
        json_schema_extra = {
            "example": {
                "answer": "Updated answer text",
                "keywords": "new, keywords",
                "tags": "edited, important"
            }
        }


class ChatUpdateResponse(BaseModel):
    """Response after updating chat message"""
    chat: ChatMessageResponse = Field(..., description="Updated chat message")
    message: str = Field(default="Chat message updated successfully", description="Response message")

    class Config:
        json_schema_extra = {
            "example": {
                "chat": {
                    "id": "msg_123",
                    "session_id": "sess_456",
                    "document_id": "doc_789",
                    "question": "What is data science?",
                    "answer": "Updated answer...",
                    "keywords": "updated, keywords",
                    "tags": "edited",
                    "created_at": "2026-01-28T23:30:00"
                },
                "message": "Chat message updated successfully"
            }
        }


class ChatDeleteResponse(BaseModel):
    """Response after deleting chat message"""
    id: str = Field(..., description="Deleted message ID")
    document_id: str = Field(..., description="Document ID")
    message: str = Field(default="Chat message deleted successfully", description="Response message")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "msg_123",
                "document_id": "doc_789",
                "message": "Chat message deleted successfully"
            }
        }


class ErrorResponse(BaseModel):
    """Error response"""
    error: str = Field(..., description="Error message")
    details: Optional[str] = Field(None, description="Additional error details")

    class Config:
        json_schema_extra = {
            "example": {
                "error": "Not found",
                "details": "Chat message with ID 'msg_123' not found"
            }
        }
