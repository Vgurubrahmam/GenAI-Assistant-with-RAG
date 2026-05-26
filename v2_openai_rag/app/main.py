from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.api import ingest
from app.api import query
from app.api import history
from app.api import documents
from app.api import chats

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create all tables on startup"""
    from app.db.sqlite import engine, Base
    from app.db.models import Document, ChatHistory
    Base.metadata.create_all(bind=engine)
    yield

app=FastAPI(title="Groq + ChromaDB RAG Backend v2", lifespan=lifespan)

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://genai-assistant-with-rag-5gej.onrender.com",
        "https://gen-ai-assistant-with-rag.vercel.app",
        "https://genai-assistant-with-rag-api.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest.router)
app.include_router(query.router)
app.include_router(history.router)
app.include_router(documents.router)
app.include_router(chats.router)

@app.get("/")
def health():
    return {"status":"running","version":"v2"}

