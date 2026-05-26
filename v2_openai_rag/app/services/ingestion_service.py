"""
Ingestion service: saves files, chunks text, embeds with sentence-transformers,
stores in ChromaDB, extracts metadata, generates summary, saves to SQLite.

Replaces the previous OpenAI Vector Store approach with a fully local pipeline.
"""
from app.openai_client import get_groq_client, get_chroma_client, get_embedding_model
from app.utils.file_utils import save_file, read_file
from app.services.metadata_service import extract_metadata
from app.services.generation_service import generate_summary
from app.db.repository import save_document
from app.db.sqlite import SessionLocal
from app.utils.logger import get_logger
from typing import List
import os
import uuid

logger = get_logger(__name__)

chroma_client = get_chroma_client()

UPLOAD_DIR = "data/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 100) -> List[str]:
    """
    Split text into overlapping chunks for embedding.
    
    Args:
        text: Full document text
        chunk_size: Number of characters per chunk
        overlap: Number of overlapping characters between chunks
        
    Returns:
        List of text chunks
    """
    if not text or not text.strip():
        return []

    chunks = []
    start = 0
    text = text.strip()

    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        
        # Try to break at a sentence boundary if possible
        if end < len(text):
            # Look for the last period, newline, or other sentence-ender in the chunk
            for sep in ['. ', '.\n', '\n\n', '\n', '? ', '! ']:
                last_sep = chunk.rfind(sep)
                if last_sep > chunk_size * 0.5:  # Only break if we're past halfway
                    end = start + last_sep + len(sep)
                    chunk = text[start:end]
                    break

        chunk = chunk.strip()
        if chunk and len(chunk) > 20:  # Skip tiny chunks
            chunks.append(chunk)
        
        start = end - overlap if end < len(text) else len(text)

    logger.info(f"[CHUNK] Split text ({len(text)} chars) into {len(chunks)} chunks")
    return chunks


def embed_and_store(document_id: str, chunks: List[str]) -> str:
    """
    Embed text chunks using sentence-transformers and store in ChromaDB.
    
    Args:
        document_id: Unique document identifier (used as collection name)
        chunks: List of text chunks
        
    Returns:
        collection_name (used as vector_store_id)
    """
    if not chunks:
        raise Exception("No text chunks to embed")

    # Create a sanitized collection name (ChromaDB rules: 3-63 chars, alphanumeric + underscores)
    collection_name = "doc_" + document_id.replace("-", "_").replace(" ", "_")[:58]
    
    logger.info(f"[EMBED] Embedding {len(chunks)} chunks into collection: {collection_name}")

    # Generate embeddings locally
    embeddings = get_embedding_model().encode(chunks).tolist()

    # Create or get ChromaDB collection
    collection = chroma_client.get_or_create_collection(
        name=collection_name,
        metadata={"document_id": document_id}
    )

    # Add chunks with embeddings and IDs
    ids = [f"{collection_name}_chunk_{i}" for i in range(len(chunks))]
    
    collection.add(
        ids=ids,
        documents=chunks,
        embeddings=embeddings,
        metadatas=[{"document_id": document_id, "chunk_index": i} for i in range(len(chunks))]
    )

    logger.info(f"[EMBED] Stored {len(chunks)} chunks in ChromaDB collection: {collection_name}")
    return collection_name


async def ingest_documents_batch(document_id: str, files: List) -> dict:
    """
    Create one ChromaDB collection for all files, embed all chunks into it,
    save one document with document_id and comma-separated filenames.
    
    Flow:
    1. For each file: save locally, read text
    2. Chunk all text and embed into ChromaDB
    3. Extract metadata & generate summary
    4. Save document metadata to SQLite
    5. Clean up local files
    
    Args:
        document_id: User-provided identifier for this batch
        files: List of UploadFile objects
        
    Returns:
        dict with vector_store_id, document_id, filenames, summary
        
    Raises:
        Exception: If batch processing fails
    """
    db = None
    saved_paths = []
    try:
        logger.info(
            f"[INGEST_BATCH] Starting batch ingestion: "
            f"document_id={document_id}, file_count={len(files)}"
        )
        
        if not files:
            raise Exception("No files provided for batch ingestion")

        filenames = []
        all_text_parts = []
        metadata_combined = None
        summary_parts = []
        processed_count = 0

        # 1. Process each file in the batch
        for idx, file in enumerate(files, start=1):
            try:
                fname = getattr(file, "filename", f"file_{idx}")
                filenames.append(fname)
                
                logger.info(f"[INGEST_BATCH] Processing file {idx}/{len(files)}: {fname}")
                
                # Save file to disk temporarily
                safe_name = f"{document_id}_{idx}_{fname}"
                path = os.path.join(UPLOAD_DIR, safe_name)
                saved_paths.append(path)
                
                with open(path, "wb") as f:
                    content = await file.read()
                    f.write(content)
                logger.info(f"[INGEST_BATCH] File saved locally: {fname}")

                # Read file content
                text = read_file(path)
                logger.info(f"[INGEST_BATCH] File read: {fname}, length: {len(text)} chars")
                all_text_parts.append(text)
                
                # Extract metadata from first file only
                if idx == 1:
                    logger.info(f"[INGEST_BATCH] Extracting metadata from first file: {fname}")
                    metadata_combined = await extract_metadata(text)
                
                # Generate summary for each file
                try:
                    part_summary = generate_summary(text)
                    if part_summary:
                        summary_parts.append(part_summary[:500])
                        logger.info(f"[INGEST_BATCH] Summary generated for {fname}")
                except Exception as e:
                    logger.warning(f"[INGEST_BATCH] Summary generation failed for {fname}: {str(e)}")

                processed_count += 1
                
            except Exception as e:
                logger.error(
                    f"[INGEST_BATCH] Error processing file {idx} ({fname}): {str(e)}",
                    exc_info=True
                )
                raise Exception(f"Failed to process file '{fname}': {str(e)}")

        logger.info(f"[INGEST_BATCH] All {processed_count} files processed successfully")

        # 2. Chunk all text and embed into ChromaDB
        combined_text = "\n\n".join(all_text_parts)
        chunks = chunk_text(combined_text)
        
        if not chunks:
            raise Exception("No text could be extracted from the uploaded files")
        
        vector_store_id = embed_and_store(document_id, chunks)
        logger.info(f"[INGEST_BATCH] ChromaDB collection created: {vector_store_id}")
        
        # 3. Combine metadata and summary
        filename_str = ", ".join(filenames)
        summary_str = " ".join(summary_parts)[:2000] if summary_parts else ""

        # 4. Save document to database
        logger.info(f"[INGEST_BATCH] Saving document metadata to database: {document_id}")
        db = SessionLocal()
        save_document(
            db=db,
            document_id=document_id,
            vector_store_id=vector_store_id,
            filename=filename_str,
            metadata=metadata_combined or {},
            summary=summary_str
        )
        logger.info(f"[INGEST_BATCH] Document saved successfully to database: {document_id}")

        return {
            "vector_store_id": vector_store_id,
            "document_id": document_id,
            "filenames": filenames,
            "filename": filename_str,
            "summary": summary_str[:100] + "..." if len(summary_str) > 100 else summary_str,
            "file_count": len(filenames),
            "chunks_created": len(chunks),
            "status": "success"
        }
        
    except Exception as e:
        logger.error(
            f"[INGEST_BATCH] Batch ingestion failed for document_id={document_id}: {str(e)}",
            exc_info=True
        )
        raise Exception(f"Batch ingestion failed: {str(e)}")
        
    finally:
        # 5. Cleanup: close database and remove temporary files
        if db:
            try:
                db.close()
                logger.info("[INGEST_BATCH] Database connection closed")
            except Exception as e:
                logger.warning(f"[INGEST_BATCH] Error closing database: {str(e)}")
        
        for path in saved_paths:
            try:
                if os.path.exists(path):
                    os.remove(path)
                    logger.info(f"[INGEST_BATCH] Cleaned up temporary file: {path}")
            except Exception as e:
                logger.warning(f"[INGEST_BATCH] Error cleaning up {path}: {str(e)}")


async def ingest_document(document_id: str, file):
    """Single file ingestion using local chunking + ChromaDB."""
    db = None
    try:
        logger.info(f"[INGEST] Starting ingestion for document_id: {document_id}, filename: {file.filename}")
        
        # 1. Save file
        logger.info(f"[INGEST] Saving file: {file.filename}")
        file_path = await save_file(file)
        logger.info(f"[INGEST] File saved to: {file_path}")
        
        # 2. Read file content
        logger.info(f"[INGEST] Reading file content")
        text = read_file(file_path)
        logger.info(f"[INGEST] File read, length: {len(text)}")
        
        # 3. Extract metadata
        logger.info(f"[INGEST] Extracting metadata")
        metadata = await extract_metadata(text)
        logger.info(f"[INGEST] Metadata extracted")
        
        # 4. Generate document summary
        logger.info(f"[INGEST] Generating document summary")
        summary = generate_summary(text)
        logger.info(f"[INGEST] Summary generated, length: {len(summary) if summary else 0}")
        
        # 5. Chunk text and embed into ChromaDB
        logger.info(f"[INGEST] Chunking and embedding into ChromaDB")
        chunks = chunk_text(text)
        
        if not chunks:
            raise Exception("No text could be extracted from the uploaded file")
        
        vector_store_id = embed_and_store(document_id, chunks)
        logger.info(f"[INGEST] ChromaDB collection created: {vector_store_id}")
        
        # 6. Save document to database
        logger.info(f"[INGEST] Saving document to database")
        db = SessionLocal()
        save_document(
            db=db,
            document_id=document_id,
            vector_store_id=vector_store_id,
            filename=file.filename,
            metadata=metadata,
            summary=summary
        )
        logger.info(f"[INGEST] Document saved successfully")
        
        return {
            "vector_store_id": vector_store_id,
            "filename": file.filename,
            "document_id": document_id,
            "summary": summary[:100] + "..." if len(summary) > 100 else summary,
            "chunks_created": len(chunks)
        }
        
    except Exception as e:
        logger.error(f"[INGEST] Error during ingestion: {str(e)}", exc_info=True)
        raise Exception(f"Ingestion failed: {str(e)}")
    finally:
        if db:
            try:
                db.close()
            except:
                pass
