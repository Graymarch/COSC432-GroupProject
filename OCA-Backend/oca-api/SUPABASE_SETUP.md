# Supabase Setup Guide for OCA Backend

This guide will help you set up Supabase for the RAG (Retrieval Augmented Generation) system.

## Prerequisites

- ✅ Supabase account (sign up at https://supabase.com if needed)
- ✅ Course materials uploaded to Supabase Storage (or ready to upload)
- ✅ `.env` file in the project root

## Step-by-Step Setup

### Step 1: Create Supabase Project

1. Go to https://supabase.com and sign in
2. Click **"New Project"**
3. Fill in project details:
   - **Name**: `oca-backend` (or your preferred name)
   - **Database Password**: Choose a strong password (⚠️ **SAVE THIS!**)
   - **Region**: Choose closest to you
   - **Pricing Plan**: Free tier is sufficient for prototype
4. Wait for project creation (2-3 minutes)

### Step 2: Get Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy these values (you'll need them for `.env`):
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **Service Role Key** (⚠️ **Keep secret!** Never expose in frontend)

### Step 3: Update `.env` File

Open `.env` in the project root and add/update:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Important**: 
- Replace `your-project-id` with your actual project ID
- Replace `your_service_role_key_here` with your actual Service Role Key
- Use **Service Role Key**, not the anon key

### Step 4: Enable pgvector Extension

1. In Supabase dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Run this SQL:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

4. Click **"Run"** (or press Cmd/Ctrl + Enter)
5. You should see: ✅ "Success. No rows returned"

### Step 5: Create Database Schema

1. In **SQL Editor**, click **"New Query"**
2. Copy the **entire contents** of `supabase-schema-768.sql` file
3. Paste into the SQL Editor
4. Click **"Run"** to execute all at once

**What this creates:**
- `document_chunks` table (with 768-dimension vector column)
- `sessions` table
- `interactions` table
- `students` table (optional)
- `match_documents` function (for vector search)
- All necessary indexes

5. Verify success: You should see multiple "Success" messages

### Step 6: Create Storage Bucket

1. In Supabase dashboard, go to **Storage**
2. Click **"New bucket"**
3. Bucket details:
   - **Name**: `cosc432-course-materials` (must match exactly)
   - **Public bucket**: ✅ **Unchecked** (keep private)
   - **File size limit**: 50MB (default is fine)
   - **Allowed MIME types**: Leave empty (allows all types)
4. Click **"Create bucket"**

### Step 7: Upload Course Materials

1. In **Storage** → `cosc432-course-materials` bucket
2. Click **"Upload file"** or drag and drop files
3. Upload your course materials:
   - PDF files (`.pdf`)
   - Word documents (`.docx`)
   - PowerPoint (`.pptx`)
   - Text files (`.txt`)
   - CSV files (`.csv`)

**Note**: Files should be in the **root** of the bucket (not in subfolders)

### Step 8: Verify Setup

Run this command to test your Supabase connection:

```bash
cd OCA-Backend/oca-api
node -e "require('dotenv').config(); const supabase = require('./config/database'); console.log('Supabase configured:', !!supabase);"
```

Expected output: `Supabase configured: true`

### Step 9: Process Documents into Vector Store

Run the ingestion script to process all files from Storage:

```bash
cd OCA-Backend/oca-api
node services/chunky.js
```

**What this does:**
- Downloads all files from `cosc432-course-materials` bucket
- Extracts text from PDF, DOCX, PPTX, CSV, TXT files
- Chunks text into smaller pieces (800 chars, 150 overlap)
- Generates embeddings for each chunk
- Stores chunks + embeddings in `document_chunks` table

**Expected output:**
```
Starting ingestion...
Found X files to ingest
✓ Ingested file1.pdf (25 chunks)
✓ Ingested file2.docx (18 chunks)
...
✓ Ingestion complete!
```

### Step 10: Verify Documents Are Stored

1. In Supabase dashboard, go to **Table Editor**
2. Select `document_chunks` table
3. You should see rows with:
   - `document_name` (file name)
   - `chunk_text` (text content)
   - `embedding` (vector data)
   - `chunk_index` (chunk number)

### Step 11: Test RAG

Test the chat endpoint to verify RAG is working:

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is requirements analysis?"}'
```

**Expected**: Response should include relevant course material context.

## Troubleshooting

### "Supabase not configured"
- Check `.env` file exists and has correct values
- Verify `SUPABASE_URL` starts with `https://`
- Restart the backend server after updating `.env`

### "function match_documents does not exist"
- Run the SQL schema again (Step 5)
- Check SQL Editor for any error messages

### "vector dimension mismatch"
- Ensure you're using `supabase-schema-768.sql` (not the 384 version)
- The schema must match your embedding model dimension

### "No files found in bucket"
- Verify bucket name is exactly `cosc432-course-materials`
- Check files are in the root of the bucket (not in subfolders)
- Verify files are uploaded (check Storage dashboard)

### "Embedding model not found"
```bash
ollama pull nomic-embed-text
```

### "Error processing file"
- Check file format is supported (PDF, DOCX, PPTX, CSV, TXT)
- Verify file isn't corrupted
- Check file size (should be < 50MB)

## Verification Checklist

- [ ] Supabase project created
- [ ] `.env` file has `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- [ ] pgvector extension enabled
- [ ] Database schema created (all tables exist)
- [ ] Storage bucket `cosc432-course-materials` created
- [ ] Course materials uploaded to bucket
- [ ] `chunky.js` script ran successfully
- [ ] `document_chunks` table has data
- [ ] `/api/chat` endpoint returns responses with context

## Next Steps

Once setup is complete:
1. ✅ RAG is fully functional
2. ✅ Chat endpoint retrieves relevant course materials
3. ✅ Conversation history is stored
4. ✅ Sessions are managed automatically

You can now use the OCA system with full RAG capabilities!

