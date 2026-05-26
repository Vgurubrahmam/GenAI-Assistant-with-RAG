from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.services.generation_service import stream_answer_with_tools, collect_answer_with_tools, rewrite_question
from fastapi.responses import StreamingResponse
from app.db.repository import save_message, get_document_by_vector_store_id
from app.db.dependencies import get_db
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()

@router.post("/query")
async def query(
    question: str,
    vector_store_id: str,
    session_id: str = None,
    db: Session = Depends(get_db)
):
    """
    Query a document with optional session grouping for multi-document conversations.
    
    Args:
    - question: User question
    - vector_store_id: Vector store ID to query
    - session_id: Optional session ID to group related conversations across documents
    
    Returns:
    - Streaming response with source header and summary footer
    """
    try:
        # vector_store_id is the ChromaDB collection name (e.g. doc_my_document)
        # Frontend may send with vs_ prefix from legacy OpenAI format — strip it
        vector_store_id = vector_store_id.strip()
        if vector_store_id.startswith("vs_"):
            vector_store_id = vector_store_id[3:]
        
        logger.info(f"[QUERY] Original question: {question[:50]}")
        logger.info(f"[QUERY] Vector store ID: {vector_store_id}, Session: {session_id}")
        
        # Step 0: Get source document information
        logger.info(f"[QUERY] Retrieving source document information...")
        source_doc = get_document_by_vector_store_id(db, vector_store_id)
        if source_doc:
            logger.info(f"[QUERY] Source document: {source_doc['filename']}")
        
        # Step 1: Rewrite question for better retrieval
        logger.info(f"[QUERY] Rewriting question for better retrieval...")
        rewritten_question = rewrite_question(question)
        logger.info(f"[QUERY] Rewritten question: {rewritten_question[:50]}")
        
        # Step 2: Collect full answer using rewritten question (using tools)
        logger.info(f"[QUERY] Collecting answer with tools...")
        full_answer = collect_answer_with_tools(rewritten_question, vector_store_id)
        logger.info(f"[QUERY] Answer collected, length: {len(full_answer)}")
        
        # Step 3: Save to database with session grouping
        logger.info(f"[QUERY] Saving to database...")
        import json
        keywords_list = question.split()[:5]
        
        # Get the actual document_id from the vector_store_id
        actual_doc_id = None
        if source_doc:
            actual_doc_id = source_doc.get('document_id') or source_doc.get('id')
        
        if not actual_doc_id:
            logger.warning(f"[QUERY] Could not find document_id for vector_store_id: {vector_store_id}")
            actual_doc_id = vector_store_id  # Fallback to vector_store_id
        
        save_message(
            db, 
            actual_doc_id,  # Use the actual document_id, not vector_store_id
            question, 
            full_answer,
            session_id=session_id,
            keywords=json.dumps(keywords_list)  # Convert list to JSON string
        )
        logger.info(f"[QUERY] Query processed for document {actual_doc_id}, session: {session_id}")
        
        # Step 4: Return streaming response with source metadata
        def response_generator():
            # Send source information first (files in this vector store)
            if source_doc:
                source_label = source_doc.get('filename') or source_doc.get('display_name') or 'Documents'
                source_header = f"📄 Source: {source_label}\n"
                source_header += f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                yield source_header
            
            # Stream the answer
            for chunk in stream_answer_with_tools(rewritten_question, vector_store_id):
                yield chunk
            
            # Add footer with document summary
            if source_doc and source_doc.get('summary'):
                footer = f"\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                footer += f"📋 Document Summary: {source_doc['summary'][:150]}...\n"
                yield footer
        
        return StreamingResponse(
            response_generator(),
            media_type="text/plain"
        )

    except Exception as e:
        import traceback
        logger.error(f"[QUERY] Query failed: {str(e)}")
        logger.error(f"[QUERY] Traceback: {traceback.format_exc()}")
        return {"error": str(e)}, 500