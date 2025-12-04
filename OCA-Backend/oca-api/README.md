# OCA Backend API

On-Demand Interactive Course Assistant (OCA) Backend API

## Quick Start

1. **Install dependencies**: `npm install`
2. **Configure environment**: Create `.env` file (see `SETUP.md`)
3. **Start Ollama**: `ollama serve` (in separate terminal)
4. **Pull model**: `ollama pull llama3`
5. **Start server**: `npm start`

For detailed setup instructions, see **[SETUP.md](./SETUP.md)**  
For implementation progress, see **[PROGRESS.md](./PROGRESS.md)**  
For switching LLM providers (Local ↔ Cloud Ollama), see **[LLM_SWITCHING_GUIDE.md](./LLM_SWITCHING_GUIDE.md)**  
**For beginners**: See **[CODE_DOCUMENTATION.md](./CODE_DOCUMENTATION.md)** to understand the codebase

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
│   ├── interactions.js   # GET /api/interactions - Archive management
│   └── sessions.js       # POST/GET /api/sessions - Session management
├── services/
│   ├── llmService.js      # LLM abstraction layer
│   ├── ragService.js     # RAG retrieval service
│   └── embeddingService.js # Embedding generation service
└── package.json          # Dependencies
```

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Create a `.env` file in the root directory:
   ```env

   ```

3. **Start the server:**
   ```bash
   npm start
   # or for development with auto-reload:
   npm run dev
   ```

## API Endpoints

### Health Check
- `GET /` - API status and available endpoints

### Chat (Tutoring Mode)
- `POST /api/chat` - Interactive tutoring with RAG
  ```json
  {
    "message": "What is requirements analysis?",
    "sessionId": "uuid",
    "studentId": "uuid"
  }
  ```
  Returns: Streaming text response

### Search (Info Access Mode)
- `POST /api/search` - Course information search
  ```json
  {
    "query": "requirements modeling techniques",
    "sessionId": "uuid",
    "studentId": "uuid",
    "maxResults": 5
  }
  ```
  Returns: JSON with summary and sources

### Sessions
- `POST /api/sessions` - Create new session
- `GET /api/sessions/:sessionId` - Get session details
- `PATCH /api/sessions/:sessionId` - Update session
- `GET /api/sessions/student/:studentId` - Get all sessions for student

### Interactions
- `GET /api/interactions?studentId=uuid` - Get archived interactions
- `GET /api/interactions/:id` - Get specific interaction

## Prerequisites

1. **Ollama** - Local LLM instance running on `localhost:11434`
   - Install from: https://ollama.ai
   - Pull a model: `ollama pull llama3`

2. **Supabase** - Database and storage
   - Create project at: https://supabase.com
   - Set up database schema (see system design document)
   - Enable pgvector extension

## Development

The skeleton is designed to be extended. Key extension points:

- **Services**: Add new service files in `services/` directory
- **Routes**: Add new route files in `routes/` directory and register in `app.js`
- **Middleware**: Add custom middleware as needed
- **Config**: Add new configuration files in `config/` directory

## Next Steps

1. Set up Supabase database schema
2. Implement document processing pipeline
3. Test RAG retrieval with sample documents
4. Integrate with frontend

