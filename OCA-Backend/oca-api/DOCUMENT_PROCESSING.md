# Document Processing Guide

This guide explains how to process course material documents and store them in Supabase for RAG (Retrieval Augmented Generation).

## Overview

The document processing pipeline:
1. **Parse** documents (PDF, TXT, MD)
2. **Chunk** text into smaller pieces with overlap
3. **Generate embeddings** for each chunk
4. **Store** chunks + embeddings in Supabase

## Prerequisites

1. **Supabase configured** - Database and tables set up
2. **Embedding model installed** - `ollama pull nomic-embed-text`
3. **Documents ready** - PDF or text files with course materials

## Method 1: Using the Script (Recommended)

### Step 1: Install Dependencies

```bash
cd OCA-Backend/oca-api
npm install pdf-parse multer
```

### Step 2: Prepare Documents

Create a folder with your course materials:

```bash
mkdir course-materials
# Copy your PDF/text files here
```

### Step 3: Run Processing Script

**Process a directory:**
```bash
node scripts/processDocuments.js ./course-materials
```

**Process a single file:**
```bash
node scripts/processDocuments.js ./course-materials/chapter1.pdf
```

### Step 4: Verify

Check Supabase dashboard:
- Table Editor → `document_chunks` table
- Should see chunks with embeddings

## Method 2: Using API Endpoint

### Upload via Postman/curl

**POST** `/api/documents/process`

**Form Data:**
- `file`: Select your PDF/text file
- `documentName`: (optional) Custom name
- `section`: (optional) Section/topic name

**Example with curl:**
```bash
curl -X POST http://localhost:3001/api/documents/process \
  -F "file=@./course-materials/chapter1.pdf" \
  -F "documentName=COSC432_Chapter1" \
  -F "section=Introduction"
```

### List Documents

**GET** `/api/documents/list`

Returns all documents stored in the database.

## Chunking Strategy

### Default Settings
- **Chunk Size**: 1000 characters
- **Overlap**: 200 characters

### Why Overlap?

Overlap ensures context isn't lost at chunk boundaries:
```
Chunk 1: [0-1000 chars]
Chunk 2: [800-1800 chars]  ← 200 char overlap
Chunk 3: [1600-2600 chars]  ← 200 char overlap
```

This helps RAG retrieve complete context even when a concept spans chunk boundaries.

### Customizing Chunk Size

In the script or API call, you can adjust:

```javascript
// Smaller chunks (more precise, more chunks)
chunkSize: 500,
overlap: 100

// Larger chunks (more context, fewer chunks)
chunkSize: 2000,
overlap: 400
```

## Supported File Types

- **PDF** (`.pdf`) - Requires `pdf-parse` package
- **Text** (`.txt`) - Plain text files
- **Markdown** (`.md`) - Markdown formatted text

## Processing Flow

```
Document File
    ↓
Parse (PDF → text or read text file)
    ↓
Chunk Text (split into smaller pieces)
    ↓
Generate Embeddings (for each chunk)
    ↓
Store in Supabase (chunks + embeddings)
    ↓
Ready for RAG!
```

## Troubleshooting

### "pdf-parse package not installed"
```bash
npm install pdf-parse
```

### "Embedding model not found"
```bash
ollama pull nomic-embed-text
```

### "Supabase not configured"
- Check `.env` file has `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Verify Supabase tables are created (run `supabase-schema.sql`)

### "No chunks stored"
- Check Supabase connection
- Verify `document_chunks` table exists
- Check embedding dimension matches (384 for nomic-embed-text)

### Processing is slow
- Embedding generation takes time (especially for many chunks)
- Consider processing documents in smaller batches
- Check Ollama is running and responsive

## Best Practices

1. **Organize documents** - Use clear naming (e.g., `COSC432_Chapter1.pdf`)
2. **Add metadata** - Use `section` parameter to tag chunks
3. **Test with small files first** - Verify everything works
4. **Monitor chunk count** - Too many chunks = slower retrieval
5. **Update documents** - Delete old chunks before re-processing

## Example: Processing Course Materials

```bash
# 1. Create directory structure
mkdir -p course-materials

# 2. Copy your PDFs/text files
cp ~/Downloads/COSC432_*.pdf ./course-materials/

# 3. Process all documents
node scripts/processDocuments.js ./course-materials

# Output:
# 🚀 OCA Document Processing
# Found 5 document(s) to process
# 
# 📄 Processing: ./course-materials/chapter1.pdf
#    ✅ Generated 25 chunks
#    ✅ Stored 25 chunks in database
# ...
# 
# 📊 Processing Results
# ✅ Processed: 5 document(s)
# 📦 Total chunks stored: 125
```

## Next Steps

After processing documents:
1. ✅ Test RAG retrieval - Ask questions via `/api/chat`
2. ✅ Verify course material context appears in responses
3. ✅ Refine chunking if needed (adjust size/overlap)
4. ✅ Process additional documents as needed

---

**Note**: The first time processing documents, embedding generation may take a while. Be patient!

