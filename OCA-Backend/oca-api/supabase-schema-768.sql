-- OCA Backend - Supabase Database Schema (768 dimensions for nomic-embed-text)
-- Run this entire script in Supabase SQL Editor
-- 
-- IMPORTANT: This schema uses vector(768) for nomic-embed-text model
-- If you're using a different embedding model, adjust the dimension accordingly

-- ============================================
-- Step 1: Enable pgvector Extension
-- ============================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- Step 2: Create Tables
-- ============================================

-- Document Chunks Table (with pgvector for RAG)
-- Using vector(768) for nomic-embed-text model
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_name TEXT NOT NULL,
    document_path TEXT,
    section TEXT,
    page_number INTEGER,
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER,
    embedding vector(768), -- 768 dimensions for nomic-embed-text
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for vector similarity search
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx 
ON document_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Index for document name searches
CREATE INDEX IF NOT EXISTS idx_document_chunks_name 
ON document_chunks(document_name);

-- Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL,
    mode TEXT NOT NULL CHECK(mode IN ('tutoring', 'info_access')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    context JSONB
);

-- Indexes for session queries
CREATE INDEX IF NOT EXISTS idx_sessions_student 
ON sessions(student_id);

CREATE INDEX IF NOT EXISTS idx_sessions_created 
ON sessions(created_at);

-- Interactions Table
CREATE TABLE IF NOT EXISTS interactions (
    id BIGSERIAL PRIMARY KEY,
    student_id TEXT NOT NULL,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    mode TEXT NOT NULL CHECK(mode IN ('tutoring', 'info_access')),
    user_message TEXT NOT NULL,
    assistant_response TEXT NOT NULL,
    retrieved_chunk_ids UUID[], -- Array of document_chunk IDs
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);

-- Indexes for interaction queries
CREATE INDEX IF NOT EXISTS idx_interactions_student 
ON interactions(student_id);

CREATE INDEX IF NOT EXISTS idx_interactions_session 
ON interactions(session_id);

CREATE INDEX IF NOT EXISTS idx_interactions_timestamp 
ON interactions(timestamp);

-- Students Table (Optional - for user management)
CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Step 3: Create Vector Search Function
-- ============================================

-- Function for vector similarity search (RAG retrieval)
-- Using vector(768) for nomic-embed-text model
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(768),
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

-- ============================================
-- Notes:
-- ============================================
-- 1. Embedding dimension (768) matches nomic-embed-text model
--    - nomic-embed-text: 768 dimensions ✅
--    - all-minilm-l6-v2: 384 dimensions (use supabase-schema.sql instead)
--
-- 2. IVFFlat index lists parameter (100) is a good default for:
--    - Small to medium datasets (< 1M vectors)
--    - Adjust based on your data size (rule: lists = rows / 1000)
--
-- 3. Match threshold (0.7) can be adjusted:
--    - Higher (0.8-0.9) = more strict, fewer results
--    - Lower (0.5-0.6) = more lenient, more results
--
-- 4. If you need to change embedding dimension:
--    - Drop the table: DROP TABLE IF EXISTS document_chunks CASCADE;
--    - Drop the function: DROP FUNCTION IF EXISTS match_documents;
--    - Run this schema again with new dimension

