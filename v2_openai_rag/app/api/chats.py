from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.repository import (
    get_chat_message,
    search_chat_history,
    update_chat_message,
    delete_chat_message,
    delete_chat_session,
    get_history
)
from app.db.dependencies import get_db
from app.schemas.chat_schema import (
    ChatMessageResponse,
    ChatHistoryResponse,
    ChatSearchResponse,
    ChatUpdateRequest,
    ChatUpdateResponse,
    ChatDeleteResponse,
    ErrorResponse
)
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/chats", tags=["chats"])


@router.get("", response_model=ChatSearchResponse)
async def search_chats(
    keyword: str = Query(None, description="Search keyword in questions, answers, keywords, tags"),
    document_id: str = Query(None, description="Filter by document ID"),
    session_id: str = Query(None, description="Filter by session ID"),
    days: int = Query(None, description="Filter messages from last N days"),
    db: Session = Depends(get_db)
):
    """
    Search chat history with optional filters.
    
    Query Parameters:
    - keyword: Search in question, answer, keywords, tags (case-insensitive)
    - document_id: Filter by specific document
    - session_id: Filter by conversation session
    - days: Filter messages from last N days
    
    Returns:
    - Matching chat messages with search metadata
    """
    try:
        logger.info(f"[CHATS] Searching: keyword={keyword}, doc={document_id}, session={session_id}, days={days}")
        
        results = search_chat_history(db, keyword=keyword, document_id=document_id, session_id=session_id, days=days)
        
        chat_messages = []
        for msg in results:
            chat_messages.append(ChatMessageResponse(
                id=msg.id,
                session_id=msg.session_id,
                document_id=msg.document_id,
                question=msg.question,
                answer=msg.answer,
                keywords=msg.keywords,
                tags=msg.tags,
                created_at=msg.created_at.isoformat() if msg.created_at else None
            ))
        
        filters_applied = []
        if keyword:
            filters_applied.append(f"keyword: {keyword}")
        if document_id:
            filters_applied.append(f"document_id: {document_id}")
        if session_id:
            filters_applied.append(f"session_id: {session_id}")
        if days:
            filters_applied.append(f"days: {days}")
        
        logger.info(f"[CHATS] Search returned {len(chat_messages)} results")
        return ChatSearchResponse(
            results=chat_messages,
            total=len(chat_messages),
            query=keyword or "all",
            filters_applied=", ".join(filters_applied) or "none",
            message="Search completed successfully"
        )
    except Exception as e:
        logger.error(f"[CHATS] Error searching chats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/document/{document_id}", response_model=ChatHistoryResponse)
async def get_document_history(
    document_id: str,
    session_id: str = Query(None, description="Filter by session ID"),
    db: Session = Depends(get_db)
):
    """
    Get full chat history for a document.
    
    Args:
    - document_id: Document to get history for
    - session_id: Optional session filter
    
    Returns:
    - All chat messages for document, optionally filtered by session
    """
    try:
        logger.info(f"[CHATS] Getting history for document: {document_id}, session: {session_id}")
        
        if session_id:
            history = search_chat_history(db, document_id=document_id, session_id=session_id)
        else:
            history = get_history(db, document_id)
        
        chat_messages = []
        for msg in history:
            chat_messages.append(ChatMessageResponse(
                id=msg.id,
                session_id=msg.session_id,
                document_id=msg.document_id,
                question=msg.question,
                answer=msg.answer,
                keywords=msg.keywords,
                tags=msg.tags,
                created_at=msg.created_at.isoformat() if msg.created_at else None
            ))
        
        logger.info(f"[CHATS] Retrieved {len(chat_messages)} messages for document: {document_id}")
        return ChatHistoryResponse(
            messages=chat_messages,
            total=len(chat_messages),
            session_id=session_id,
            message="Chat history retrieved successfully"
        )
    except Exception as e:
        logger.error(f"[CHATS] Error getting document history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{message_id}", response_model=ChatMessageResponse)
async def get_chat(message_id: str, db: Session = Depends(get_db)):
    """
    Get single chat message by ID.
    
    Args:
    - message_id: Chat message ID to retrieve
    
    Returns:
    - Chat message details
    """
    try:
        logger.info(f"[CHATS] Getting chat message: {message_id}")
        message = get_chat_message(db, message_id)
        
        logger.info(f"[CHATS] Retrieved chat: {message_id}")
        return ChatMessageResponse(
            id=message.id,
            session_id=message.session_id,
            document_id=message.document_id,
            question=message.question,
            answer=message.answer,
            keywords=message.keywords,
            tags=message.tags,
            created_at=message.created_at.isoformat() if message.created_at else None
        )
    except Exception as e:
        logger.error(f"[CHATS] Error getting chat: {str(e)}")
        raise HTTPException(status_code=404 if "not found" in str(e).lower() else 500, detail=str(e))


@router.put("/{message_id}", response_model=ChatUpdateResponse)
async def update_chat(
    message_id: str,
    update_data: ChatUpdateRequest,
    db: Session = Depends(get_db)
):
    """
    Update chat message content.
    
    Args:
    - message_id: Chat message ID to update
    - update_data: Updated answer, keywords, and/or tags
    
    Returns:
    - Updated chat message
    """
    try:
        logger.info(f"[CHATS] Updating chat message: {message_id}")
        message = update_chat_message(
            db,
            message_id,
            answer=update_data.answer,
            keywords=update_data.keywords,
            tags=update_data.tags
        )
        
        logger.info(f"[CHATS] Chat message updated: {message_id}")
        return ChatUpdateResponse(
            chat=ChatMessageResponse(
                id=message.id,
                session_id=message.session_id,
                document_id=message.document_id,
                question=message.question,
                answer=message.answer,
                keywords=message.keywords,
                tags=message.tags,
                created_at=message.created_at.isoformat() if message.created_at else None
            ),
            message="Chat message updated successfully"
        )
    except Exception as e:
        logger.error(f"[CHATS] Error updating chat: {str(e)}")
        raise HTTPException(status_code=404 if "not found" in str(e).lower() else 500, detail=str(e))


@router.delete("/{message_id}", response_model=ChatDeleteResponse)
async def delete_chat(message_id: str, db: Session = Depends(get_db)):
    """
    Delete a chat message.
    
    Args:
    - message_id: Chat message ID to delete
    
    Returns:
    - Deletion confirmation with message ID and document ID
    """
    try:
        logger.info(f"[CHATS] Deleting chat message: {message_id}")
        result = delete_chat_message(db, message_id)
        logger.info(f"[CHATS] Chat deleted: {message_id}")
        return ChatDeleteResponse(**result)
    except Exception as e:
        logger.error(f"[CHATS] Error deleting chat: {str(e)}")
        raise HTTPException(status_code=404 if "not found" in str(e).lower() else 500, detail=str(e))


@router.delete("/session/{session_id}")
async def delete_session(session_id: str, db: Session = Depends(get_db)):
    """
    Delete entire chat session (all messages in session).
    
    Args:
    - session_id: Session ID to delete
    
    Returns:
    - Confirmation with count of deleted messages
    """
    try:
        logger.info(f"[CHATS] Deleting chat session: {session_id}")
        result = delete_chat_session(db, session_id)
        logger.info(f"[CHATS] Session deleted: {session_id} with {result['deleted_count']} messages")
        return result
    except Exception as e:
        logger.error(f"[CHATS] Error deleting session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
