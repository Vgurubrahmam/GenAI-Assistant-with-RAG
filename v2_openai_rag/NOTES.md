# Project Notes

This project is a document-based Question Answering system. It answers questions only from uploaded documents and avoids guessing or hallucination.

---

## 1. Assumptions

- One user uploads and queries documents at a time (no multi-tenant auth).
- Every query uses a **vector_store_id** (tied to one document) so the correct document is used.
- Documents are in **PDF or TXT** format.
- System runs with network access to **OpenAI API** (cloud; not local LLM).
- **OpenAI API key** is set via environment (e.g. `.env`); no key means ingestion and query fail.
- Frontend runs separately (e.g. Vite on port 5173); CORS is configured for local dev origins.
- SQLite and local `data/uploads` are sufficient for documents and chat history (single-instance use).

---

## 2. Design Decisions (Why I built it this way)

**Document grounding**

- The system answers only from document content using OpenAI **file_search** over a single vector store.
- System prompt (in `app/prompts/document_prompt.json`) instructs the model to use only the retrieved context and to avoid guessing.
- This reduces wrong or fake answers from model priors.

**Document isolation**

- Each uploaded file gets its own **document_id** (`{base_id}_{filename_without_ext}`) and its own **vector_store_id**.
- Queries are scoped by **vector_store_id** (one document per query).
- This prevents mixing content from different files.

**No manual chunking or FAISS**

- Chunking and retrieval are handled by **OpenAI vector stores** and **file_search**.
- No manual chunk size, overlap, or top-k; OpenAI handles retrieval and context assembly.
- Avoids tuning and maintenance of a separate vector DB (e.g. FAISS).

**Streaming answers**

- Answers are streamed token-by-token with a source header (filename/display name) and optional summary footer.
- Improves perceived speed and makes it clear which document the answer comes from.

**Source tracking**

- Before streaming, the backend resolves **vector_store_id** → document (filename, display_name, summary) from SQLite.
- Source info is sent at the start of the stream; summary can be appended at the end.
- Makes answers easier to verify and trust.

**Chat history and sessions**

- Every Q&A is saved in SQLite with **document_id** and optional **session_id**.
- Enables search, list-by-document, update/delete of messages, and delete-by-session.
- Aligns with a “one chat per document” or session-based UX on the frontend.

**JSON prompts**

- Grounding, rewrite-question, summary, metadata, and answer behaviour are driven by JSON files in `app/prompts/`.
- Easier to change behaviour without touching Python logic.

**Async ingestion**

- Ingestion is async; multiple files in one request are processed sequentially per file, but the API stays non-blocking.
- Helps with responsiveness when uploading larger files.

---

## 3. Limitations (Current Version)

- **No login or authentication** – anyone with network access to the backend can ingest and query.
- **No rate limiting** – heavy use can hit OpenAI quotas and cost.
- **OpenAI dependency** – requires API key and internet; cost and latency depend on OpenAI, not local hardware.
- **Single-instance** – SQLite and local file storage are not shared across multiple server instances.
- **No built-in retries** – transient OpenAI errors surface directly to the client.
- **CORS** is set for specific dev origins; production origins must be added or configured separately.

---

## 4. Why this project

This project is built like a real backend system, not a demo:

- **Clear separation** – API routes, services, repository, DB models, schemas, and prompts are separated.
- **Safe document handling** – answers are tied to a single document via vector_store_id; source is tracked and streamed.
- **No hallucinations by design** – document-only prompt and retrieval; no general-knowledge-only answers.
- **Production-style structure** – async APIs, streaming, CRUD for documents and chat, schema validation, and config via env.

---

## Final Note

I focused on:

- **Correct answers** – only from the selected document, with visible source and optional summary.
- **Clean backend code** – layered, testable, and prompt-configurable.
- **Real-world design** – streaming, history, document and chat CRUD, and OpenAI-native RAG instead of custom vector DBs and manual chunking.
