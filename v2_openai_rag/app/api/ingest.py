from fastapi import APIRouter, UploadFile, File, Form
from typing import List
from app.services.ingestion_service import ingest_documents_batch
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.post("/ingest")
async def ingest_files(document_id: str = Form(...), files: List[UploadFile] = File(...)):
    """
    Upload multiple files as one batch: one vector_store_id and one document_id (user-provided).
    All files are added to the same vector store and one document row is created with filenames list.
    """
    try:
        logger.info(f"[INGEST_ENDPOINT] Starting batch upload document_id: {document_id}, file count: {len(files)}")
        if not files:
            return {
                "message": "No files provided",
                "error": "At least one file is required",
                "status": "failed"
            }, 400

        result = await ingest_documents_batch(document_id, list(files))
        logger.info(f"[INGEST_ENDPOINT] Batch ingestion complete: {document_id}")
        return {
            "message": "Documents ingestion completed",
            "document_id": result["document_id"],
            "vector_store_id": result["vector_store_id"],
            "filenames": result.get("filenames", []),
            "files": [{"filename": fn, "status": "success"} for fn in result.get("filenames", [])],
            "count": len(result.get("filenames", [])),
            "status": "success"
        }
    except Exception as e:
        logger.error(f"[INGEST_ENDPOINT] Unexpected error: {str(e)}", exc_info=True)
        return {
            "message": "Upload failed",
            "error": str(e),
            "status": "failed"
        }, 500

    
