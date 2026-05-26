from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.repository import (
    get_documents, 
    get_document_by_vector_store_id,
    delete_document,
    update_document
)
from app.db.dependencies import get_db
from app.schemas.response_schema import (
    DocumentResponse,
    DocumentListResponse,
    DocumentDeleteResponse,
    DocumentUpdateResponse,
    ErrorResponse
)
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("", response_model=DocumentListResponse)
async def list_documents(db: Session = Depends(get_db)):
    """
    Get all uploaded documents with summaries and metadata.
    
    Returns:
    - List of all documents with their details
    - Total count of documents
    """
    try:
        logger.info("[DOCS] Listing all documents")
        documents = get_documents(db)
        
        # Format response
        doc_list = []
        for doc in documents:
            filenames = [s.strip() for s in doc.filename.split(",")] if doc.filename else []
            doc_list.append(DocumentResponse(
                document_id=doc.document_id,
                filename=doc.filename,
                display_name=doc.display_name or doc.document_id,
                vector_store_id=doc.vector_store_id,
                summary=doc.summary,
                created_at=doc.created_at.isoformat() if doc.created_at else None,
                filenames=filenames if filenames else None
            ))
        
        logger.info(f"[DOCS] Retrieved {len(doc_list)} documents")
        return DocumentListResponse(
            documents=doc_list,
            total=len(doc_list),
            message="Documents retrieved successfully"
        )
    except Exception as e:
        logger.error(f"[DOCS] Error listing documents: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(document_id: str, db: Session = Depends(get_db)):
    """
    Get single document details by document ID or vector store ID.
    
    Args:
    - document_id: Unique document identifier (document_id or vector_store_id)
    
    Returns:
    - Document details including summary and metadata
    """
    try:
        logger.info(f"[DOCS] Getting document details: {document_id}")
        documents = get_documents(db)
        
        # Try to match by document_id or vector_store_id
        doc = next((d for d in documents if d.document_id == document_id or d.vector_store_id == document_id), None)
        if not doc:
            logger.warning(f"[DOCS] Document not found: {document_id}")
            raise HTTPException(status_code=404, detail=f"Document '{document_id}' not found")
        
        logger.info(f"[DOCS] Retrieved document: {document_id}")
        filenames = [s.strip() for s in doc.filename.split(",")] if doc.filename else []
        return DocumentResponse(
            document_id=doc.document_id,
            filename=doc.filename,
            display_name=doc.display_name or doc.document_id,
            vector_store_id=doc.vector_store_id,
            summary=doc.summary,
            created_at=doc.created_at.isoformat() if doc.created_at else None,
            filenames=filenames if filenames else None
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[DOCS] Error getting document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{document_id}", response_model=DocumentDeleteResponse)
async def delete_doc(document_id: str, db: Session = Depends(get_db)):
    """
    Delete a document and its associated chat history.
    
    Args:
    - document_id: Unique document identifier to delete
    
    Returns:
    - Confirmation with deleted document details
    """
    try:
        logger.info(f"[DOCS] Deleting document: {document_id}")
        result = delete_document(db, document_id)
        logger.info(f"[DOCS] Document deleted: {document_id}")
        return DocumentDeleteResponse(**result)
    except Exception as e:
        logger.error(f"[DOCS] Error deleting document: {str(e)}")
        raise HTTPException(status_code=404 if "not found" in str(e).lower() else 500, detail=str(e))


@router.put("/{document_id}", response_model=DocumentUpdateResponse)
async def update_doc(document_id: str, display_name: str = None, db: Session = Depends(get_db)):
    """
    Rename/update document display name.
    
    Args:
    - document_id: Unique document identifier to update
    - display_name: New friendly display name for the document
    
    Returns:
    - Updated document details
    """
    try:
        logger.info(f"[DOCS] Updating document: {document_id}")
        if display_name:
            logger.info(f"[DOCS] Setting display name: '{display_name}'")
        
        result = update_document(db, document_id, display_name)
        logger.info(f"[DOCS] Document updated: {document_id}")
        return DocumentUpdateResponse(**result)
    except Exception as e:
        logger.error(f"[DOCS] Error updating document: {str(e)}")
        raise HTTPException(status_code=404 if "not found" in str(e).lower() else 500, detail=str(e))
