# app/api/history.py

from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from sqlalchemy import and_
from datetime import datetime, timedelta
from app.db.models import ChatHistory,Document
from app.utils.logger import get_logger
import uuid
import json

logger = get_logger(__name__)

 
 #--documents--

def save_document(db:Session, document_id:str, vector_store_id:str, filename:str, metadata:dict, summary:str=""):
    try:
        doc=Document(
            document_id=document_id,
            vector_store_id=vector_store_id,
            filename=filename,
            display_name=filename,
            summary=summary,
            doc_metadata=metadata
        )
        db.add(doc)
        db.commit()
        logger.info(f"Document saved successfully: {document_id}")
        return doc
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Integrity error while saving document {document_id}: {str(e)}")
        raise Exception(f"Document with ID {document_id} already exists")
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error while saving document: {str(e)}")
        raise Exception("Failed to save document to database")
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error while saving document: {str(e)}")
        raise

def get_documents(db:Session):
    try:
        documents = db.query(Document).order_by(Document.created_at.desc()).all()
        logger.info(f"Retrieved {len(documents)} documents")
        return documents
    except SQLAlchemyError as e:
        logger.error(f"Database error while retrieving documents: {str(e)}")
        raise Exception("Failed to retrieve documents from database")
    except Exception as e:
        logger.error(f"Unexpected error while retrieving documents: {str(e)}")
        raise

def get_document_by_vector_store_id(db:Session, vector_store_id:str):
    """Get document details by vector store ID"""
    try:
        document = db.query(Document).filter(Document.vector_store_id == vector_store_id).first()
        if document:
            logger.info(f"[SOURCE] Retrieved document: {document.filename} for vector_store: {vector_store_id}")
            return {
                "document_id": document.document_id,
                "filename": document.filename,
                "display_name": document.display_name or document.filename,
                "summary": document.summary,
                "created_at": document.created_at.isoformat() if document.created_at else None
            }
        else:
            logger.warning(f"[SOURCE] No document found for vector_store_id: {vector_store_id}")
            return None
    except SQLAlchemyError as e:
        logger.error(f"[SOURCE] Database error while retrieving document by vector_store_id: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"[SOURCE] Unexpected error while retrieving document: {str(e)}")
        return None
        raise

# --chat history--

def save_message(db:Session, document_id:str, question:str, answer:str, session_id:str = None, keywords:str = None, tags:str = None):
    try:
        msg=ChatHistory(
            id=str(uuid.uuid4()),
            session_id=session_id,
            document_id=document_id,
            question=question,
            answer=answer,
            keywords=keywords,
            tags=tags
        )
        db.add(msg)
        db.commit()
        logger.info(f"Chat message saved for document: {document_id}, session: {session_id}")
        return msg
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Integrity error while saving message: {str(e)}")
        raise Exception(f"Document with ID {document_id} does not exist")
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error while saving message: {str(e)}")
        raise Exception("Failed to save chat message to database")
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error while saving message: {str(e)}")
        raise

def get_history(db:Session,document_id:str):
    try:
        history = db.query(ChatHistory)\
            .filter(ChatHistory.document_id==document_id)\
            .order_by(ChatHistory.created_at)\
            .all()
        logger.info(f"Retrieved {len(history)} chat messages for document: {document_id}")
        return history
    except SQLAlchemyError as e:
        logger.error(f"Database error while retrieving chat history: {str(e)}")
        raise Exception("Failed to retrieve chat history from database")
    except Exception as e:
        logger.error(f"Unexpected error while retrieving chat history: {str(e)}")
        raise


def delete_document(db:Session, document_id:str):
    """Delete a document and its associated chat history (CASCADE)"""
    try:
        # Try to find by document_id or vector_store_id
        document = db.query(Document).filter(Document.document_id == document_id).first()
        if not document:
            document = db.query(Document).filter(Document.vector_store_id == document_id).first()
        if not document:
            logger.warning(f"[DELETE] Document not found: {document_id}")
            raise Exception(f"Document with ID {document_id} not found")
        
        # Get filename before deletion
        filename = document.filename
        vector_store_id = document.vector_store_id
        
        # Delete document (CASCADE will delete chat history)
        db.delete(document)
        db.commit()
        
        logger.info(f"[DELETE] Document deleted successfully: {document_id} (filename: {filename})")
        logger.info(f"[DELETE] Associated vector store: {vector_store_id}")
        
        return {
            "document_id": document_id,
            "filename": filename,
            "vector_store_id": vector_store_id,
            "message": "Document and associated chat history deleted successfully"
        }
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"[DELETE] Database error while deleting document: {str(e)}")
        raise Exception("Failed to delete document from database")
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE] Error while deleting document: {str(e)}")
        raise


def update_document(db:Session, document_id:str, display_name:str = None):
    """Update document display name"""
    try:
        # Try to find by document_id or vector_store_id
        document = db.query(Document).filter(Document.document_id == document_id).first()
        if not document:
            document = db.query(Document).filter(Document.vector_store_id == document_id).first()
        if not document:
            logger.warning(f"[UPDATE] Document not found: {document_id}")
            raise Exception(f"Document with ID {document_id} not found")
        
        if display_name:
            old_name = document.display_name
            document.display_name = display_name
            db.commit()
            logger.info(f"[UPDATE] Document renamed: {document_id} from '{old_name}' to '{display_name}'")
        
        return {
            "document_id": document_id,
            "filename": document.filename,
            "display_name": document.display_name,
            "summary": document.summary,
            "vector_store_id": document.vector_store_id,
            "created_at": document.created_at.isoformat() if document.created_at else None,
            "message": "Document updated successfully"
        }
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"[UPDATE] Database error while updating document: {str(e)}")
        raise Exception("Failed to update document in database")
    except Exception as e:
        db.rollback()
        logger.error(f"[UPDATE] Error while updating document: {str(e)}")
        raise

# -- CHAT HISTORY CRUD --

def get_chat_message(db:Session, message_id:str):
    """Get a single chat message by ID"""
    try:
        message = db.query(ChatHistory).filter(ChatHistory.id == message_id).first()
        if not message:
            logger.warning(f"[CHAT] Chat message not found: {message_id}")
            raise Exception(f"Chat message with ID {message_id} not found")
        logger.info(f"[CHAT] Retrieved chat message: {message_id}")
        return message
    except Exception as e:
        logger.error(f"[CHAT] Error getting chat message: {str(e)}")
        raise


def search_chat_history(db:Session, keyword:str = None, document_id:str = None, session_id:str = None, days:int = None):
    """Search chat history with keyword, document, session filters"""
    try:
        query = db.query(ChatHistory)
        
        # Apply filters
        if document_id:
            query = query.filter(ChatHistory.document_id == document_id)
        
        if session_id:
            query = query.filter(ChatHistory.session_id == session_id)
        
        if keyword:
            # Search in question, answer, keywords, tags
            search_pattern = f"%{keyword}%"
            query = query.filter(
                (ChatHistory.question.ilike(search_pattern)) |
                (ChatHistory.answer.ilike(search_pattern)) |
                (ChatHistory.keywords.ilike(search_pattern)) |
                (ChatHistory.tags.ilike(search_pattern))
            )
        
        if days:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            query = query.filter(ChatHistory.created_at >= cutoff_date)
        
        results = query.order_by(ChatHistory.created_at.desc()).all()
        logger.info(f"[CHAT] Search found {len(results)} results - keyword: {keyword}, document: {document_id}, session: {session_id}")
        return results
    except Exception as e:
        logger.error(f"[CHAT] Error searching chat history: {str(e)}")
        raise


def update_chat_message(db:Session, message_id:str, answer:str = None, keywords:str = None, tags:str = None):
    """Update chat message content"""
    try:
        message = db.query(ChatHistory).filter(ChatHistory.id == message_id).first()
        if not message:
            logger.warning(f"[CHAT] Chat message not found for update: {message_id}")
            raise Exception(f"Chat message with ID {message_id} not found")
        
        if answer:
            message.answer = answer
        if keywords:
            message.keywords = keywords
        if tags:
            message.tags = tags
        
        db.commit()
        logger.info(f"[CHAT] Chat message updated: {message_id}")
        return message
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"[CHAT] Database error updating message: {str(e)}")
        raise Exception("Failed to update chat message")
    except Exception as e:
        db.rollback()
        logger.error(f"[CHAT] Error updating chat message: {str(e)}")
        raise


def delete_chat_message(db:Session, message_id:str):
    """Delete a specific chat message"""
    try:
        message = db.query(ChatHistory).filter(ChatHistory.id == message_id).first()
        if not message:
            logger.warning(f"[CHAT] Chat message not found for deletion: {message_id}")
            raise Exception(f"Chat message with ID {message_id} not found")
        
        doc_id = message.document_id
        db.delete(message)
        db.commit()
        logger.info(f"[CHAT] Chat message deleted: {message_id} from document: {doc_id}")
        
        return {
            "id": message_id,
            "document_id": doc_id,
            "message": "Chat message deleted successfully"
        }
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"[CHAT] Database error deleting message: {str(e)}")
        raise Exception("Failed to delete chat message")
    except Exception as e:
        db.rollback()
        logger.error(f"[CHAT] Error deleting chat message: {str(e)}")
        raise


def delete_chat_session(db:Session, session_id:str):
    """Delete all messages in a session"""
    try:
        count = db.query(ChatHistory).filter(ChatHistory.session_id == session_id).delete()
        db.commit()
        logger.info(f"[CHAT] Deleted chat session {session_id} with {count} messages")
        
        return {
            "session_id": session_id,
            "deleted_count": count,
            "message": f"Chat session deleted with {count} messages"
        }
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"[CHAT] Database error deleting session: {str(e)}")
        raise Exception("Failed to delete chat session")
    except Exception as e:
        db.rollback()
        logger.error(f"[CHAT] Error deleting chat session: {str(e)}")
        raise