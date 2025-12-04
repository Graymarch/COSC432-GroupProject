# OCA Backend - Setup & Running Guide

## Prerequisites

Before running the backend, ensure you have the following installed:

1. **Node.js** (v18 or higher recommended)
   ```bash
   node --version
   ```

2. **Ollama** (Local LLM runtime)
   
   **macOS:**
   - Download from: https://ollama.com
   - Install the macOS app (.dmg)
   - After installation, verify:
     ```bash
     ollama --version
     ```
   
   **Windows:**
   - Download from: https://ollama.com
   - Install the Windows app (.exe)
   - After installation, verify in PowerShell or Command Prompt:
     ```bash
     ollama --version
     ```
   - Note: Ollama runs as a service on Windows, no need to manually start `ollama serve`
   
   **Linux:**
   - Install via curl:
     ```bash
     curl -fsSL https://ollama.com/install.sh | sh
     ```
   - Or download from: https://ollama.com
   - After installation, verify:
     ```bash
     ollama --version
     ```

3. **npm** (comes with Node.js)

## Initial Setup

### 1. Install Dependencies

```bash
cd OCA-Backend/oca-api
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `oca-api` directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Ollama Configuration
# For LOCAL Ollama (default):
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3

# For CLOUD Ollama (ollama.com API):
# OLLAMA_HOST=https://ollama.com
# OLLAMA_API_KEY=your_ollama_api_key_here
# OLLAMA_MODEL=llama3

# Supabase Configuration (Optional - for RAG and archiving)
# Uncomment and fill in when ready to use Supabase:
# SUPABASE_URL=https://your-project-id.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
# SUPABASE_ANON_KEY=your_anon_key
```

### 3. Pull Ollama Model

Before starting the backend, ensure you have the llama3 model:

```bash
ollama pull llama3
```

This downloads the model locally (may take a few minutes depending on your internet speed).

## Running the Backend

### Step 1: Start Ollama Server

**macOS/Linux:**
In **Terminal 1**, start the Ollama server:

```bash
ollama serve
```

Keep this terminal running. You should see Ollama listening on `localhost:11434`.

**Windows:**
- Ollama runs as a Windows service automatically
- No need to manually run `ollama serve`
- If Ollama isn't running, start it from the Start Menu or run:
  ```powershell
  ollama serve
  ```

**Note:** If you see `Error: listen tcp 127.0.0.1:11434: bind: address already in use`, Ollama is already running - you can skip this step.

### Step 2: Start the Backend Server

In **Terminal 2**, navigate to the backend directory and start the server:

```bash
cd OCA-Backend/oca-api
npm start
```

You should see output like:
```
[dotenv@17.2.3] injecting env (X) from .env
[Supabase] Environment variables not found. Features depending on Supabase are disabled until configured.
Listening on port 3001
```

The server is now running on `http://localhost:3001`.

## Testing the Backend

### Health Check

Test that the server is running:

```bash
curl http://localhost:3001/
```

Expected response:
```json
{
  "message": "OCA API is running",
  "version": "1.0.0",
  "endpoints": {
    "chat": "/api/chat",
    "search": "/api/search",
    "interactions": "/api/interactions",
    "sessions": "/api/sessions"
  }
}
```

### Test Chat Endpoint (Tutoring Mode)

```bash
curl -N -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Explain the concept of eigenvectors and eigenvalues",
    "sessionId": "test-session-1",
    "studentId": "test-student-1"
  }'
```

This should stream a response from llama3. The `-N` flag keeps the connection open to see the streaming response.

### Test Other Endpoints

**Search Endpoint** (requires Supabase):
```bash
curl -X POST http://localhost:3001/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "requirements modeling techniques",
    "sessionId": "test-session-1",
    "studentId": "test-student-1"
  }'
```

**Sessions Endpoint** (requires Supabase):
```bash
curl -X POST http://localhost:3001/api/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "test-student-1",
    "mode": "tutoring"
  }'
```

**Interactions Endpoint** (requires Supabase):
```bash
curl "http://localhost:3001/api/interactions?studentId=test-student-1"
```

## Troubleshooting

### Port Already in Use

If you see `Port 3001 is already in use`:

```bash
# Find the process using port 3001
lsof -i :3001

# Kill it (replace PID with the actual process ID)
kill -9 <PID>
```

### Ollama Model Not Found

If you see `model 'llama3' not found`:

1. Verify the model is pulled:
   ```bash
   ollama list
   ```

2. If llama3 is not listed, pull it:
   ```bash
   ollama pull llama3
   ```

3. Restart the backend server

### Supabase Errors

If you see Supabase-related errors but haven't set it up yet, this is expected. The backend will work without Supabase for the `/api/chat` endpoint. Other endpoints will return clear error messages indicating Supabase is required.

### Environment Variables Not Loading

1. Ensure `.env` file exists in `oca-api` directory
2. Check that variable names match exactly (case-sensitive)
3. Restart the server after changing `.env`

## Development Mode

For development with auto-reload on file changes, use:

```bash
npm run dev
```

(Requires `nodemon` to be installed - it's included in devDependencies)

## Project Structure

```
oca-api/
├── app.js                 # Main Express application
├── bin/
│   └── www               # Server entry point
├── config/
│   ├── database.js       # Supabase client configuration
│   └── ollama.js         # Ollama LLM client configuration
├── routes/
│   ├── index.js          # Health check endpoint
│   ├── chat.js           # POST /api/chat - Tutoring mode
│   ├── search.js         # POST /api/search - Info access mode
│   ├── interactions.js   # GET /api/interactions - Archive
│   └── sessions.js       # POST/GET /api/sessions - Sessions
├── services/
│   ├── llmService.js     # LLM abstraction layer
│   ├── ragService.js     # RAG retrieval service
│   └── embeddingService.js # Embedding generation
├── .env                  # Environment variables (create this)
├── package.json          # Dependencies
└── README.md            # Project overview
```

## Next Steps

Once the backend is running:

1. **Set up Supabase** - Configure database for RAG and archiving
2. **Process Course Materials** - Upload and chunk COSC432 documents
3. **Build Frontend** - Create React UI to interact with the API
4. **Enhance Prompts** - Refine tutoring style based on Dr. Chakraborty's philosophy

## API Documentation

See `README.md` for detailed API endpoint documentation.

