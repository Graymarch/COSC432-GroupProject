# OCA Backend - Progress & Implementation Status

## Project Overview

**On-Demand Interactive Course Assistant (OCA)** - A backend API for providing 24/7 course-related assistance to COSC432 students through two modes:
- **Tutoring Mode**: Interactive Q&A with leading questions
- **Info Access Mode**: Course material search and summarization

## What Has Been Completed

### ✅ Backend Infrastructure (100%)

#### 1. Express.js Application Setup
- ✅ Express server configured and running
- ✅ CORS middleware enabled for frontend integration
- ✅ JSON body parsing middleware
- ✅ Error handling middleware with JSON responses
- ✅ Environment variable configuration (dotenv)
- ✅ Server runs on port 3001

#### 2. Configuration Layer
- ✅ **Ollama Configuration** (`config/ollama.js`)
  - Local Ollama client setup
  - Configurable host (defaults to `localhost:11434`)
  - Model configuration via environment variables
  
- ✅ **Supabase Configuration** (`config/database.js`)
  - Supabase client setup
  - Graceful degradation when not configured
  - Environment variable validation

#### 3. Service Layer Architecture

- ✅ **LLM Service** (`services/llmService.js`)
  - Chat completion with streaming support
  - Embedding generation
  - Model abstraction (configurable via env)
  - Error handling

- ✅ **RAG Service** (`services/ragService.js`)
  - Vector similarity search implementation
  - Document chunk retrieval
  - Embedding-based search
  - Ready for Supabase pgvector integration

- ✅ **Embedding Service** (`services/embeddingService.js`)
  - Single and batch embedding generation
  - Local embedding model support

#### 4. API Routes

- ✅ **Health Check** (`GET /`)
  - API status endpoint
  - Returns available endpoints
  - **Status**: ✅ Working

- ✅ **Chat Endpoint** (`POST /api/chat`)
  - Tutoring mode implementation
  - Streaming responses from llama3
  - System prompt for tutoring behavior
  - RAG integration (ready, needs Supabase)
  - Interaction archiving (ready, needs Supabase)
  - **Status**: ✅ Working with local llama3

- ✅ **Search Endpoint** (`POST /api/search`)
  - Info access mode implementation
  - Course material search
  - Summarization with citations
  - **Status**: ⚠️ Requires Supabase configuration

- ✅ **Sessions Endpoint** (`POST/GET/PATCH /api/sessions`)
  - Session creation and management
  - Session retrieval by ID
  - Session updates
  - Student session listing
  - **Status**: ⚠️ Requires Supabase configuration

- ✅ **Interactions Endpoint** (`GET /api/interactions`)
  - Interaction history retrieval
  - Filtering by student and session
  - Pagination support
  - **Status**: ⚠️ Requires Supabase configuration

### ✅ Local LLM Integration (100%)

- ✅ Ollama integration working
- ✅ llama3 model tested and functional
- ✅ Streaming responses implemented
- ✅ Local processing (no cloud uploads)
- ✅ Model configuration via environment variables

### ✅ Error Handling (100%)

- ✅ Graceful Supabase degradation
- ✅ Clear error messages for missing dependencies
- ✅ JSON error responses
- ✅ Development vs production error details

## Current Status Summary

### Fully Functional ✅
- Backend server running
- Health check endpoint
- Chat endpoint with local llama3
- Tutoring mode with streaming responses
- Error handling and validation

### Requires Supabase Configuration ⚠️
- Search endpoint (info access mode)
- Sessions management
- Interactions archiving
- RAG document retrieval
- Course material storage

### Not Yet Implemented ❌
- Supabase database schema setup
- Document processing pipeline
- Course material upload and chunking
- Frontend integration
- Advanced prompt engineering
- Assignment/exam detection refinement

## Architecture Decisions

### Technology Stack
- **Runtime**: Node.js
- **Framework**: Express.js 4.16.1
- **LLM**: Ollama (local) with llama3 model
- **Database**: Supabase PostgreSQL (when configured)
- **Vector DB**: Supabase pgvector extension
- **Embeddings**: Local Ollama embedding models

### Design Patterns
- **Service Layer Pattern**: Separation of concerns (config → services → routes)
- **Graceful Degradation**: Backend works without Supabase
- **Streaming**: Real-time response streaming for better UX
- **Error Handling**: Consistent JSON error responses

## Testing Status

### Tested Endpoints ✅
- `GET /` - Health check
- `POST /api/chat` - Tutoring mode with llama3

### Endpoints Requiring Supabase ⚠️
- `POST /api/search` - Returns clear error message
- `POST /api/sessions` - Returns clear error message
- `GET /api/interactions` - Returns clear error message

## Known Limitations

1. **No RAG Context**: Without Supabase, chat responses don't include course material context
2. **No Archiving**: Interactions are not stored without Supabase
3. **No Session Management**: Sessions cannot be created/managed without Supabase
4. **Basic Prompts**: System prompts are functional but can be refined

## Next Implementation Steps

### Phase 1: Supabase Setup

#### Step 1: Create Supabase Project
1. Go to https://supabase.com and sign up/login
2. Click "New Project"
3. Fill in project details:
   - **Name**: `oca-backend` (or your preferred name)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to you
   - **Pricing Plan**: Free tier is sufficient for prototype
4. Wait for project to be created (2-3 minutes)

#### Step 2: Get Supabase Credentials
1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **Service Role Key** (⚠️ Keep this secret! Never expose in frontend)
   - **Anon Key** (optional, for client-side operations)

#### Step 3: Enable pgvector Extension
1. In Supabase dashboard, go to **SQL Editor**
2. Run this SQL command:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. Verify extension is enabled (should see success message)

#### Step 4: Create Database Schema

**Option A: Quick Setup (Recommended)**
1. Copy the contents of `supabase-schema.sql` file
2. Paste into Supabase SQL Editor
3. Click "Run" to execute all at once

**Option B: Step-by-Step Setup**
Run these SQL commands individually in the **SQL Editor**:

**4a. Document Chunks Table (with pgvector)**
```sql
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_name TEXT NOT NULL,
    document_path TEXT,
    section TEXT,
    page_number INTEGER,
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER,
    embedding vector(384), -- Adjust dimension based on embedding model
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON document_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX idx_document_chunks_name ON document_chunks(document_name);
```

**4b. Sessions Table**
```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL,
    mode TEXT NOT NULL CHECK(mode IN ('tutoring', 'info_access')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    context JSONB
);

CREATE INDEX idx_sessions_student ON sessions(student_id);
CREATE INDEX idx_sessions_created ON sessions(created_at);
```

**4c. Interactions Table**
```sql
CREATE TABLE interactions (
    id BIGSERIAL PRIMARY KEY,
    student_id TEXT NOT NULL,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    mode TEXT NOT NULL CHECK(mode IN ('tutoring', 'info_access')),
    user_message TEXT NOT NULL,
    assistant_response TEXT NOT NULL,
    retrieved_chunk_ids UUID[],
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);

CREATE INDEX idx_interactions_student ON interactions(student_id);
CREATE INDEX idx_interactions_session ON interactions(session_id);
CREATE INDEX idx_interactions_timestamp ON interactions(timestamp);
```

**4d. Students Table (Optional)**
```sql
CREATE TABLE students (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Step 5: Create Vector Search Function

Run this SQL in the **SQL Editor**:

```sql
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  document_name text,
  section text,
  page_number integer,
  chunk_text text,
  chunk_index integer,
  similarity float,
  metadata jsonb
)
LANGUAGE sql STABLE
AS $$
  SELECT
    document_chunks.id,
    document_chunks.document_name,
    document_chunks.section,
    document_chunks.page_number,
    document_chunks.chunk_text,
    document_chunks.chunk_index,
    1 - (document_chunks.embedding <=> query_embedding) as similarity,
    document_chunks.metadata
  FROM document_chunks
  WHERE 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY document_chunks.embedding <=> query_embedding
  LIMIT match_count;
$$;
```

**Note**: The embedding dimension (384) should match your embedding model:
- `nomic-embed-text`: 768 dimensions
- `all-minilm-l6-v2`: 384 dimensions
- Adjust `vector(384)` in both table and function if using different model
- See `supabase-schema.sql` for complete schema with notes

#### Step 6: Configure Environment Variables

1. Open your `.env` file in `oca-api` directory
2. Add Supabase credentials:
   ```env
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   SUPABASE_ANON_KEY=your_anon_key_here
   ```
3. Replace with your actual values from Step 2
4. **Important**: Never commit `.env` to git!

#### Step 7: Test Supabase Connection

1. Restart your backend server:
   ```bash
   npm start
   ```
2. You should see: `[Supabase] Connected successfully` (or no error)
3. Test endpoints:
   ```bash
   # Test sessions endpoint
   curl -X POST http://localhost:3001/api/sessions \
     -H "Content-Type: application/json" \
     -d '{"studentId": "test-1", "mode": "tutoring"}'
   
   # Should return a session object, not an error
   ```

#### Step 8: Verify Setup

✅ **Checklist:**
- [ ] Supabase project created
- [ ] pgvector extension enabled
- [ ] All tables created (document_chunks, sessions, interactions)
- [ ] `match_documents` function created
- [ ] Environment variables configured
- [ ] Backend connects to Supabase without errors
- [ ] Sessions endpoint works (creates sessions)
- [ ] Interactions endpoint works (can retrieve history)

#### Troubleshooting

**Issue**: "Invalid supabaseUrl"
- **Solution**: Check that `SUPABASE_URL` in `.env` is correct (should start with `https://`)

**Issue**: "permission denied for table"
- **Solution**: Ensure you're using `SUPABASE_SERVICE_ROLE_KEY`, not the anon key

**Issue**: "function match_documents does not exist"
- **Solution**: Run the SQL function creation script again in SQL Editor

**Issue**: "extension vector does not exist"
- **Solution**: Run `CREATE EXTENSION IF NOT EXISTS vector;` in SQL Editor

#### Next Steps After Supabase Setup

Once Supabase is configured:
1. ✅ Test `/api/sessions` - Should create sessions
2. ✅ Test `/api/interactions` - Should retrieve history
3. ✅ Test `/api/search` - Will work once documents are uploaded
4. ✅ Test `/api/chat` - Will use conversation history automatically
5. → Proceed to **Phase 2: Document Processing**

### Phase 2: Document Processing
1. Implement PDF/text parsing
2. Create document chunking service
3. Generate embeddings for course materials
4. Store chunks in Supabase

### Phase 3: Frontend Development
1. Create React components
2. Implement chat interface
3. Add mode switching (tutoring/info access)
4. Integrate with backend API

### Phase 4: Enhancement
1. Refine system prompts
2. Improve assignment/exam detection
3. Add conversation history management
4. Implement course material references

## File Structure

```
oca-api/
├── app.js                    ✅ Main application
├── bin/www                   ✅ Server entry point
├── config/
│   ├── database.js           ✅ Supabase config
│   └── ollama.js             ✅ Ollama config
├── routes/
│   ├── index.js              ✅ Health check
│   ├── chat.js               ✅ Tutoring mode
│   ├── search.js             ✅ Info access mode
│   ├── interactions.js       ✅ Archive
│   └── sessions.js            ✅ Sessions
├── services/
│   ├── llmService.js         ✅ LLM abstraction
│   ├── ragService.js         ✅ RAG retrieval
│   └── embeddingService.js   ✅ Embeddings
├── .env                      ⚠️ Needs configuration
├── package.json              ✅ Dependencies
├── README.md                 ✅ API docs
├── SETUP.md                  ✅ Setup guide (cross-platform)
├── PROGRESS.md               ✅ This file
├── IMPROVEMENT_STRATEGY.md   ✅ RAG + History strategy
├── LLM_SWITCHING_GUIDE.md    ✅ Switch to cloud GPT guide
└── supabase-schema.sql       ✅ Database schema SQL
```

## Environment Variables

### Required for Basic Operation
- `PORT` - Server port (default: 3001)
- `OLLAMA_HOST` - Ollama server URL (default: http://localhost:11434)
- `OLLAMA_MODEL` - Model name (default: llama3)

### Required for Full Functionality
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

## Success Metrics

- ✅ Backend server starts without errors
- ✅ Health check endpoint responds correctly
- ✅ Chat endpoint streams responses from llama3
- ✅ Error handling works for missing Supabase
- ✅ Code structure is clean and extensible
- ✅ Documentation is complete

## Notes

- The backend is designed to work incrementally - basic chat works without Supabase
- All Supabase-dependent features gracefully degrade with clear error messages
- The architecture is ready for extension as requirements evolve
- Local LLM processing ensures no copyrighted material is uploaded to cloud

---

**Last Updated**: Current session  
**Status**: Backend skeleton complete and functional  
**Next Milestone**: Supabase configuration and document processing

