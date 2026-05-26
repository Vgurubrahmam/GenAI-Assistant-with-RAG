from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class DocumentResponse(BaseModel):
    """Document response schema"""
    document_id: str = Field(description="Unique document identifier")
    filename: str = Field(description="Original filename or comma-separated filenames")
    display_name: str = Field(description="User-friendly display name")
    vector_store_id: str = Field(description="ChromaDB collection name")
    summary: Optional[str] = Field(default=None, description="Document summary")
    created_at: Optional[str] = Field(default=None, description="Creation timestamp")
    filenames: Optional[List[str]] = Field(default=None, description="List of filenames in this document batch")
    
    class Config:
        json_schema_extra = {
            "example": {
                "document_id": "data_science",
                "filename": "Principles-of-Data-Science.pdf",
                "display_name": "Data Science Principles",
                "vector_store_id": "vs_697a4752a194819...",
                "summary": "A comprehensive guide to data science...",
                "created_at": "2026-01-28T23:00:20.646000"
            }
        }


class DocumentListResponse(BaseModel):
    """List of documents response"""
    documents: List[DocumentResponse]
    total: int = Field(description="Total number of documents")
    message: str = Field(default="Documents retrieved successfully")
    
    class Config:
        json_schema_extra = {
            "example": {
                "documents": [
                    {
                        "document_id": "data_science",
                        "filename": "Principles-of-Data-Science.pdf",
                        "display_name": "Data Science",
                        "vector_store_id": "vs_697a4752a194819...",
                        "summary": "...",
                        "created_at": "2026-01-28T23:00:20"
                    }
                ],
                "total": 1,
                "message": "Documents retrieved successfully"
            }
        }


class DocumentDeleteResponse(BaseModel):
    """Delete document response"""
    document_id: str = Field(description="Deleted document ID")
    filename: str = Field(description="Deleted filename")
    vector_store_id: str = Field(description="Deleted vector store ID")
    message: str = Field(description="Status message")
    
    class Config:
        json_schema_extra = {
            "example": {
                "document_id": "data_science",
                "filename": "Principles-of-Data-Science.pdf",
                "vector_store_id": "vs_697a4752a194819...",
                "message": "Document and associated chat history deleted successfully"
            }
        }


class DocumentUpdateResponse(BaseModel):
    """Update document response"""
    document_id: str = Field(description="Document ID")
    filename: str = Field(description="Original filename")
    display_name: str = Field(description="Updated display name")
    vector_store_id: str = Field(description="Vector store ID")
    summary: Optional[str] = Field(default=None, description="Document summary")
    created_at: Optional[str] = Field(default=None, description="Creation timestamp")
    message: str = Field(description="Status message")
    
    class Config:
        json_schema_extra = {
            "example": {
                "document_id": "data_science",
                "filename": "Principles-of-Data-Science.pdf",
                "display_name": "My Data Science Notes",
                "vector_store_id": "vs_697a4752a194819...",
                "summary": "...",
                "created_at": "2026-01-28T23:00:20",
                "message": "Document updated successfully"
            }
        }


class ErrorResponse(BaseModel):
    """Error response schema"""
    error: str = Field(description="Error message")
    detail: Optional[str] = Field(default=None, description="Additional error details")
    
    class Config:
        json_schema_extra = {
            "example": {
                "error": "Document not found",
                "detail": "Document with ID 'unknown_doc' does not exist"
            }
        }
