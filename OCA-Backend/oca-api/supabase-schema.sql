-- OCA Backend - Supabase Database Schema
-- Run this entire script in Supabase SQL Editor

-- ============================================
-- Step 1: Enable pgvector Extension
-- ============================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- Step 2: Create Tables
-- ============================================

-- Document Chunks Table (with pgvector for RAG)
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_name TEXT NOT NULL,
    document_path TEXT,
    section TEXT,
    page_number INTEGER,
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER,
    embedding vector(384), -- Adjust dimension based on embedding model (384 for all-minilm, 768 for nomic-embed)
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

-- ============================================
-- Notes:
-- ============================================
-- 1. Embedding dimension (384) should match your embedding model:
--    - all-minilm-l6-v2: 384 dimensions
--    - nomic-embed-text: 768 dimensions
--    - Adjust the vector(384) and function parameter accordingly
--
-- 2. To change embedding dimension:
--    - Update vector(384) to vector(768) in document_chunks table
--    - Update vector(384) to vector(768) in match_documents function
--    - Drop and recreate the embedding index
--
-- 3. IVFFlat index lists parameter (100) is a good default for:
--    - Small to medium datasets (< 1M vectors)
--    - Adjust based on your data size (rule: lists = rows / 1000)
--
-- 4. Match threshold (0.7) can be adjusted:
--    - Higher (0.8-0.9) = more strict, fewer results
--    - Lower (0.5-0.6) = more lenient, more results

