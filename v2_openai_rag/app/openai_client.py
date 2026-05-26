"""
Client setup for Groq LLM + ChromaDB vector store + sentence-transformers embeddings.
All services must use these shared clients. Never create clients anywhere else.

Uses lazy initialization for the embedding model to avoid blocking server startup.
"""
from groq import Groq
import chromadb
from chromadb.config import Settings as ChromaSettings
from app.config import settings, CHROMA_DIR

# --- Groq LLM Client (lightweight, safe to init at import) ---
groq_client = Groq(api_key=settings.GROQ_API_KEY)

# --- ChromaDB Client (lightweight, safe to init at import) ---
chroma_client = chromadb.PersistentClient(
    path=CHROMA_DIR,
    settings=ChromaSettings(anonymized_telemetry=False)
)

# --- Embedding Model (lazy-loaded on first use because it's heavy) ---
_embedding_model = None


def get_groq_client() -> Groq:
    """Get the shared Groq LLM client."""
    return groq_client


def get_chroma_client() -> chromadb.PersistentClient:
    """Get the shared ChromaDB client."""
    return chroma_client


def get_embedding_model():
    """
    Get the shared sentence-transformers embedding model.
    Lazy-loaded on first call to avoid blocking server startup.
    """
    global _embedding_model
    if _embedding_model is None:
        from sentence_transformers import SentenceTransformer
        _embedding_model = SentenceTransformer(settings.EMBEDDING_MODEL)
    return _embedding_model
