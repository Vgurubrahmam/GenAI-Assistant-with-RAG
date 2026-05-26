# v2_openai_rag – Document Aware QA Backend

A production-style Document-Aware Question Answering backend built using OpenAI APIs, focused on zero hallucination, automation, async processing, and clean architecture.

This backend allows users to upload documents and ask questions. Answers are generated only from the uploaded documents, with source tracking, chat history, and automatic metadata extraction.

---

## 1. Problem Statement

Large Language Models (LLMs) answer from training data. In real applications, answers must come only from user documents.

**Problems:**

- Hallucinated answers  
- Manual prompt tuning  
- Manual chunk selection  
- No source tracking  
- No document isolation  
- No chat history  

---

## 2. Solution

This backend implements a production-grade RAG system using OpenAI platform tools.

**It provides:**

- Automatic document ingestion (multi-file, unique document per file)
- OpenAI vector storage & retrieval (file_search)
- Automatic chunk selection (no manual top-k)
- Streaming responses (token-by-token)
- Local SQLite DB for documents and chat history
- Source document extraction in responses
- Metadata extraction (title, summary, keywords via OpenAI)
- Async APIs for performance
- CRUD for documents and chat messages

---

## 3. System Flow

### Document Ingestion

1. User uploads file(s) via `POST /ingest` (FormData: `document_id`, `files[]`)
2. Each file gets a unique `document_id` (base_id + filename without extension)
3. File is stored locally in `data/uploads/`
4. Text is read from file (PDF/TXT)
5. Metadata is extracted using OpenAI
6. Document summary is generated using GPT
7. OpenAI vector store is created per document
8. File is uploaded to OpenAI vector store
9. Mapping (document_id, vector_store_id, filename, summary, metadata) is saved in SQLite

### Question Answering

1. User sends question + `vector_store_id` + optional `session_id` via `POST /query`
2. Source document is resolved from DB by `vector_store_id`
3. Question is rewritten for better retrieval (JSON prompt)
4. Answer is generated using GPT-4.1-mini with `file_search` (OpenAI retrieval)
5. Response is streamed token-by-token (source header → answer → summary footer)
6. Chat message is saved in SQLite (document_id, session_id, question, answer, keywords)

---

## 4. Tech Stack

| Layer      | Stack |
|-----------|--------|
| **Backend** | FastAPI (async APIs), Python 3.11+, OpenAI SDK (Responses API, Vector Stores, File Search), Pydantic (schema validation), SQLAlchemy + aiosqlite |
| **Storage** | OpenAI Vector Store (document embeddings), SQLite (documents + chat history), Local file system (uploads) |
| **AI**      | GPT-4.1-mini (answers, metadata, summary), OpenAI retrieval (automatic chunking & search) |

---

## 5. Key Features Implemented

| Feature | Description |
|--------|--------------|
| **OpenAI Native RAG** | No FAISS, no manual top-k, no manual chunking; automatic retrieval via `file_search` |
| **Streaming answers** | Real-time token streaming with source header and summary footer |
| **Metadata extraction** | Title, summary, keywords via OpenAI; stored in DB |
| **Source tracking** | Answer source document and summary returned in stream; no guessing |
| **Async APIs** | Async ingestion, async multi-file upload, async query streaming |
| **Chat history** | Stored per document with optional session_id; search, get, update, delete messages and sessions |
| **Document CRUD** | List, get, update (display_name), delete documents; cascade delete chat history |
| **JSON prompts** | Document grounding, rewrite query, summary, metadata, answer prompts in `app/prompts/` |

---

## 6. Folder Structure

```
v2_openai_rag/
├── app/
│   ├── api/                  # FastAPI routes
│   │   ├── ingest.py         # POST /ingest
│   │   ├── query.py          # POST /query
│   │   ├── documents.py      # GET/PUT/DELETE /documents
│   │   ├── history.py        # GET /history/{document_id}
│   │   └── chats.py          # GET/PUT/DELETE /chats, /chats/document/{id}, /chats/session/{id}
│   ├── config.py             # Settings, paths (GROQ_API_KEY, GROQ_MODEL, DATA_DIR)
│   ├── db/                   # SQLite layer
│   │   ├── models.py         # Document, ChatHistory (SQLAlchemy)
│   │   ├── repository.py    # CRUD for documents & chat history
│   │   ├── sqlite.py         # Engine, Base, SessionLocal
│   │   └── dependencies.py  # get_db
│   ├── prompts/              # JSON prompts
│   │   ├── loader.py
│   │   ├── document_prompt.json
│   │   ├── rewrite_query_prompt.json
│   │   ├── summary_prompt.json
│   │   ├── metadata_prompt.json
│   │   └── answer_prompt.json
│   ├── schemas/              # Pydantic request/response schemas
│   │   ├── response_schema.py
│   │   ├── chat_schema.py
│   │   ├── history_schema.py
│   │   └── metadata_schema.py
│   ├── services/             # Business logic
│   │   ├── ingestion_service.py   # ingest_document (save, read, metadata, summary, vector store, DB)
│   │   ├── generation_service.py # rewrite_question, stream_answer_with_tools, collect_answer_with_tools
│   │   └── metadata_service.py   # extract_metadata
│   ├── utils/
│   │   ├── file_utils.py     # save_file, read_file
│   │   └── logger.py
│   ├── openai_client.py      # OpenAI client
│   └── main.py               # FastAPI app, CORS, lifespan (create tables), route includes
├── data/                     # Runtime data (created on first run; uploads stored here)
├── requirements.txt
└── README.md
```

---

## 7. API Endpoints

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check; returns `{ "status": "running", "version": "v2" }` |

### Ingest

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ingest` | Ingest one or more files. **FormData:** `document_id` (base id), `files[]`. Each file gets unique id `{document_id}_{filename_without_ext}`. Returns `files[]` with `document_id`, `vector_store_id`, `filename`, `summary` per file. |

### Query

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/query` | Query a document. **Query/Form params:** `question`, `vector_store_id`, `session_id` (optional). Returns **streaming** text/plain: source header → answer → summary footer. Saves Q&A to DB. |

### Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/documents` | List all documents (document_id, filename, display_name, vector_store_id, summary, created_at). |
| GET | `/documents/{document_id}` | Get one document by document_id or vector_store_id. |
| PUT | `/documents/{document_id}` | Update display name; query param `display_name`. |
| DELETE | `/documents/{document_id}` | Delete document and all its chat history (CASCADE). |

### History (legacy)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/history/{document_id}` | Get full chat history for a document (flat list). |

### Chats (full CRUD)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/chats` | Search chat messages. **Query:** `keyword`, `document_id`, `session_id`, `days`. |
| GET | `/chats/document/{document_id}` | Get chat history for document; optional `session_id`. |
| GET | `/chats/{message_id}` | Get single chat message by ID. |
| PUT | `/chats/{message_id}` | Update message (answer, keywords, tags). |
| DELETE | `/chats/{message_id}` | Delete one chat message. |
| DELETE | `/chats/session/{session_id}` | Delete entire session (all messages in that session). |

---

## 8. Why This Is Production-Ready

- Uses OpenAI official retrieval (`file_search`); no custom vector DB bugs.
- Async where it matters; scalable request handling.
- No manual tuning: prompts in JSON, retrieval and chunking handled by OpenAI.
- Clear separation: API → services → repository → DB; schemas for validation.
- Local SQLite for documents and chat persistence; CORS configured for frontend.
- Streaming for better UX; strict document-only grounding via system prompt.

---

## 9. What Was Improved (Implemented)

- Replaced manual prompts → JSON prompts in `app/prompts/`.
- Replaced FAISS → OpenAI vector store.
- Replaced manual chunking → OpenAI retrieval (`file_search`).
- Replaced other models → OpenAI GPT-4.1-mini.
- Added streaming responses.
- Added metadata extraction and summary generation.
- Added chat history DB and full CRUD (messages + sessions).
- Added document CRUD APIs.
- Made ingestion async; multi-file upload with per-file document_id.
- Improved structure and performance.

---

## 10. How To Run Backend

```bash
git clone https://github.com/Vgurubrahmam/Document_Aware_QA_Service.git
cd v2_openai_rag

python -m venv venv
# Windows: venv\Scripts\activate
# Linux/macOS: source venv/bin/activate

pip install -r requirements.txt
```

Set OpenAI key (create `.env` in `v2_openai_rag/` if needed):

```bash
# .env
GROQ_API_KEY=your_key
# optional:
GROQ_MODEL=gpt-4.1-mini
```

Run the server:

```bash
python -m uvicorn app.main:app --reload
```

- **API docs (Swagger):** http://localhost:8000/docs  
- **Health:** http://localhost:8000/

---

## 11. What This Project Shows

- Real GenAI backend architecture (ingest → vector store → query → stream → persist).
- OpenAI platform usage in a production-oriented way (vector stores, file_search, streaming).
- RAG done with OpenAI-native retrieval and document-only answers.
- Async backend design and clear separation of API, services, DB, and prompts.
- Clean code structure: routes, schemas, repository, JSON-driven prompts.
