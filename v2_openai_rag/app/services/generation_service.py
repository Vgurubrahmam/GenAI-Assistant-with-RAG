"""
Generation service: retrieves relevant chunks from ChromaDB, then generates
answers using Groq LLM. Also handles question rewriting and summary generation.

Replaces the previous OpenAI Responses API + file_search approach.
"""
from app.openai_client import get_groq_client, get_chroma_client, get_embedding_model
from app.prompts.loader import load_prompt
from app.utils.logger import get_logger
from app.config import settings

logger = get_logger(__name__)
groq_client = get_groq_client()
chroma_client = get_chroma_client()

# Load document-only system prompt from prompts folder
_document_prompt = load_prompt("document_prompt.json")
DOCUMENT_ONLY_SYSTEM_PROMPT = _document_prompt.get("system", "")


def retrieve_context(vector_store_id: str, query: str, top_k: int = 5) -> str:
    """
    Retrieve the most relevant text chunks from ChromaDB for a given query.
    
    Args:
        vector_store_id: ChromaDB collection name
        query: User question to search for
        top_k: Number of top chunks to retrieve
        
    Returns:
        Concatenated context string from top matching chunks
    """
    try:
        collection = chroma_client.get_collection(name=vector_store_id)
        
        # Embed the query using the same model used for document ingestion
        query_embedding = get_embedding_model().encode([query]).tolist()
        
        results = collection.query(
            query_embeddings=query_embedding,
            n_results=min(top_k, collection.count()),
            include=["documents", "distances"]
        )
        
        if results and results["documents"] and results["documents"][0]:
            chunks = results["documents"][0]
            logger.info(f"[RETRIEVE] Retrieved {len(chunks)} chunks from {vector_store_id}")
            return "\n\n---\n\n".join(chunks)
        else:
            logger.warning(f"[RETRIEVE] No chunks found in {vector_store_id}")
            return ""
            
    except Exception as e:
        logger.error(f"[RETRIEVE] Error retrieving from ChromaDB: {str(e)}")
        return ""


def stream_answer_with_tools(question: str, vector_store_id: str):
    """
    Stream answer using Groq LLM with ChromaDB-retrieved context (document-only).
    Yields text in short, formatted chunks.
    """
    if not question or not question.strip():
        logger.warning("[STREAM] Empty question provided")
        return
    
    if not vector_store_id or not vector_store_id.strip():
        logger.warning("[STREAM] Empty vector_store_id provided")
        return

    # 1. Retrieve relevant context from ChromaDB
    context = retrieve_context(vector_store_id, question)
    
    if not context:
        yield "No relevant information found in the uploaded documents.\n"
        return

    # 2. Build prompt with context
    answer_prompt = load_prompt("answer_prompt.json")
    user_message = answer_prompt["user"].format(question=question, context=context)

    # 3. Stream response from Groq
    stream = groq_client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=[
            {"role": "system", "content": DOCUMENT_ONLY_SYSTEM_PROMPT},
            {"role": "user", "content": user_message}
        ],
        temperature=0.2,
        max_tokens=1500,
        stream=True
    )

    buffer = ""

    for chunk in stream:
        if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
            text = chunk.choices[0].delta.content
            buffer += text

            # Aggressive breaking on multiple punctuation types
            while True:
                break_patterns = [
                    (buffer.find("\n•"), 0),
                    (buffer.find("\n-"), 0),
                    (buffer.find("\n"), 0),
                    (buffer.find(". "), 1),
                    (buffer.find("! "), 1),
                    (buffer.find("? "), 1),
                ]
                
                valid_patterns = [(pos, offset) for pos, offset in break_patterns if pos != -1]
                
                if not valid_patterns:
                    break
                    
                break_pos, offset = min(valid_patterns, key=lambda x: x[0])
                break_at = break_pos + 1 + offset
                
                chunk_to_yield = buffer[:break_at].strip()
                if chunk_to_yield and len(chunk_to_yield) > 2:
                    yield chunk_to_yield + "\n"
                
                buffer = buffer[break_at:].strip()

    # Yield remaining content
    if buffer.strip() and len(buffer.strip()) > 2:
        yield buffer.strip() + "\n"


def collect_answer_with_tools(question: str, vector_store_id: str) -> str:
    """Collect complete answer using Groq LLM with ChromaDB-retrieved context (document-only)."""
    if not question or not question.strip():
        logger.warning("[COLLECT] Empty question provided")
        return "Question cannot be empty"
    
    if not vector_store_id or not vector_store_id.strip():
        logger.warning("[COLLECT] Empty vector_store_id provided")
        return "Vector store ID is required"
    
    try:
        # 1. Retrieve relevant context from ChromaDB
        context = retrieve_context(vector_store_id, question)
        
        if not context:
            return "No relevant information found in the uploaded documents."

        # 2. Build prompt with context
        answer_prompt = load_prompt("answer_prompt.json")
        user_message = answer_prompt["user"].format(question=question, context=context)

        # 3. Generate answer via Groq
        response = groq_client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": DOCUMENT_ONLY_SYSTEM_PROMPT},
                {"role": "user", "content": user_message}
            ],
            temperature=0.2,
            max_tokens=1000,
        )

        answer = response.choices[0].message.content if response.choices else ""
        
        if not answer:
            logger.error("No text content in response")
            return "Unable to generate answer from documents"
        
        # Remove source citations from every line
        import re
        answer = re.sub(r'\s*\([^)]*\.pdf\)\s*', '', answer)
            
        logger.info(f"Answer collected for question: {question[:50]}")
        return answer
        
    except Exception as e:
        logger.error(f"Error in collect_answer_with_tools: {str(e)}")
        return "Error processing your question"


def rewrite_question(original_question: str) -> str:
    """
    Rewrite user question to improve vector database retrieval.
    Makes questions more specific with better keywords for semantic search.
    Uses Groq for text generation.
    """
    if not original_question or not original_question.strip():
        logger.warning("[REWRITE] Empty question provided")
        return original_question
    
    try:
        prompt = load_prompt("rewrite_query_prompt.json")
        
        response = groq_client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": prompt["system"]},
                {"role": "user", "content": prompt["user"].format(question=original_question)}
            ],
            temperature=0.3,
            max_tokens=200,
        )
        
        rewritten = response.choices[0].message.content if response.choices else original_question
        
        if rewritten.strip():
            logger.info(f"[REWRITE] Original: {original_question[:50]}")
            logger.info(f"[REWRITE] Rewritten: {rewritten[:50]}")
            return rewritten.strip()
        else:
            return original_question
            
    except Exception as e:
        logger.error(f"[REWRITE] Error rewriting question: {str(e)}")
        return original_question


def generate_summary(document_text: str, max_length: int = 2000) -> str:
    """
    Generate a concise summary of document for UI preview.
    Truncates long documents first to stay within token limits.
    Uses Groq for text generation.
    """
    if not document_text or not document_text.strip():
        logger.warning("[SUMMARY] Empty document text provided")
        return ""
    
    try:
        # Truncate to reasonable length for summarization
        text_to_summarize = document_text[:max_length]
        
        prompt = load_prompt("summary_prompt.json")
        
        response = groq_client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": prompt["system"]},
                {"role": "user", "content": prompt["user"].format(content=text_to_summarize)}
            ],
            temperature=0.2,
            max_tokens=300,
        )
        
        summary = response.choices[0].message.content if response.choices else ""
        
        if summary.strip():
            logger.info(f"[SUMMARY] Generated summary length: {len(summary)}")
            return summary.strip()
        else:
            logger.warning("[SUMMARY] Empty summary generated, using fallback")
            return text_to_summarize[:200]
            
    except Exception as e:
        logger.error(f"[SUMMARY] Error generating summary: {str(e)}")
        return ""
