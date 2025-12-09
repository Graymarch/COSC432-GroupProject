# Code Documentation for Beginners

This guide explains the codebase structure and how everything works together. Perfect for beginners who want to understand or contribute to the project.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Code Structure](#code-structure)
3. [How It Works](#how-it-works)
4. [Key Concepts](#key-concepts)
5. [File-by-File Guide](#file-by-file-guide)
6. [Data Flow Examples](#data-flow-examples)

## Project Overview

**OCA (On-Demand Interactive Course Assistant)** is a backend API that helps students learn by:
- Answering questions with course-specific context (Tutoring Mode)
- Searching and summarizing course materials (Info Access Mode)
- Maintaining conversation history
- Using AI (LLM) to generate responses

## Code Structure

```
oca-api/
├── app.js                    # Main Express application (entry point)
├── bin/
│   └── www                   # Server startup script
├── config/                   # Configuration files
│   ├── database.js          # Supabase database connection
│   └── ollama.js            # Ollama LLM client setup
├── routes/                   # API endpoint handlers
│   ├── index.js             # Health check endpoint
│   ├── chat.js              # Tutoring mode endpoint
│   ├── search.js            # Info access mode endpoint
│   ├── sessions.js          # Session management
│   └── interactions.js      # Interaction history
├── services/                 # Business logic layer
│   ├── llmService.js        # LLM interaction (chat, embeddings)
│   ├── ragService.js        # RAG (course material search)
│   └── embeddingService.js  # Embedding generation wrapper
└── package.json             # Dependencies and scripts
```

## How It Works

### High-Level Flow

```
Student Question
    ↓
API Route (chat.js or search.js)
    ↓
Service Layer (llmService, ragService)
    ↓
Configuration Layer (ollama, database)
    ↓
External Services (Ollama LLM, Supabase Database)
    ↓
Response back to Student
```

### Request Flow Example

**Example: Student asks "What is requirements analysis?"**

1. **Frontend sends request** → `POST /api/chat`
2. **Route handler** (`routes/chat.js`) receives request
3. **Retrieve conversation history** (if Supabase configured)
4. **RAG Service** (`services/ragService.js`) searches for relevant course material
5. **LLM Service** (`services/llmService.js`) generates response using:
   - System prompt (instructions)
   - Course material context (from RAG)
   - Conversation history
   - Student's question
6. **Stream response** back to student in real-time
7. **Archive interaction** (save to database)

## Key Concepts

### 1. Express.js Routes

Routes handle HTTP requests. Each route file defines endpoints:

```javascript
// routes/chat.js
router.post('/', async (req, res, next) => {
  // Handle POST /api/chat requests
  // req.body contains the request data
  // res is used to send the response
});
```

### 2. Services (Business Logic)

Services contain the actual logic. Routes call services:

```javascript
// In a route:
const response = await llmService.chat(messages);

// llmService handles the complexity of talking to the LLM
```

### 3. Configuration

Configuration files set up external connections:

```javascript
// config/ollama.js
// Sets up connection to Ollama (local or cloud)

// config/database.js
// Sets up connection to Supabase database
```

### 4. Middleware

Middleware runs before routes. In `app.js`:

- **CORS**: Allows frontend to make requests
- **morgan**: Logs requests
- **express.json()**: Parses JSON request bodies

### 5. Error Handling

Errors are caught and returned as JSON:

```javascript
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});
```

## File-by-File Guide

### `app.js` - Main Application

**What it does:**
- Sets up Express server
- Configures middleware
- Registers all routes
- Handles errors

**Key parts:**
```javascript
// Middleware - runs on every request
app.use(cors());              // Allow cross-origin requests
app.use(express.json());      // Parse JSON bodies

// Routes - handle specific URLs
app.use('/api/chat', chatRouter);  // POST /api/chat → chat.js
```

### `config/ollama.js` - LLM Configuration

**What it does:**
- Connects to Ollama (local or cloud)
- Handles API key for cloud mode
- Exports configured client

**Key concept:**
- Detects if using local (`localhost:11434`) or cloud (`ollama.com`)
- Adds API key header if cloud mode

### `config/database.js` - Database Configuration

**What it does:**
- Connects to Supabase
- Returns `null` if not configured (graceful degradation)

**Key concept:**
- App works without Supabase (basic mode)
- Features like RAG require Supabase

### `services/llmService.js` - LLM Interaction

**What it does:**
- Sends messages to LLM
- Gets responses (streaming or complete)
- Generates embeddings

**Key methods:**
- `chat(messages)`: Get LLM response
- `generateEmbedding(text)`: Convert text to vector

**Example:**
```javascript
const messages = [
  { role: 'system', content: 'You are a tutor.' },
  { role: 'user', content: 'What is X?' }
];

for await (const chunk of llmService.chat(messages)) {
  console.log(chunk); // Streams response
}
```

### `services/ragService.js` - Course Material Search

**What it does:**
- Searches for relevant course material chunks
- Uses vector similarity (embeddings)
- Stores document chunks

**How RAG works:**
1. Convert query to embedding (vector)
2. Search database for similar embeddings
3. Return most relevant chunks
4. Use chunks as context for LLM

**Key method:**
```javascript
const chunks = await ragService.retrieveRelevantChunks(
  "What is requirements analysis?",
  { topK: 5 }  // Get top 5 most relevant chunks
);
```

### `routes/chat.js` - Tutoring Mode

**What it does:**
- Handles student questions
- Retrieves conversation history
- Gets relevant course material (RAG)
- Streams LLM response
- Archives interaction

**Request/Response:**
```javascript
// Request
POST /api/chat
{
  "message": "What is X?",
  "sessionId": "abc-123",
  "studentId": "student-1"
}

// Response (streaming text)
"What is X? Well, X is..."
```

### `routes/search.js` - Info Access Mode

**What it does:**
- Searches course materials
- Generates summary
- Returns sources with citations

**Request/Response:**
```javascript
// Request
POST /api/search
{
  "query": "requirements modeling",
  "sessionId": "abc-123"
}

// Response (JSON)
{
  "summary": "Requirements modeling is...",
  "sources": [
    {
      "document": "Chapter2.pdf",
      "section": "2.3",
      "page": 45
    }
  ]
}
```

## Data Flow Examples

### Example 1: Simple Chat (No Supabase)

```
1. Student: "What is requirements analysis?"
   ↓
2. POST /api/chat
   ↓
3. chat.js validates request
   ↓
4. ragService.retrieveRelevantChunks() → returns [] (no Supabase)
   ↓
5. Build prompt with empty context
   ↓
6. llmService.chat() → sends to Ollama
   ↓
7. Ollama generates response
   ↓
8. Stream response to student
```

### Example 2: Chat with RAG (Supabase Configured)

```
1. Student: "What is requirements analysis?"
   ↓
2. POST /api/chat
   ↓
3. chat.js retrieves conversation history (if any)
   ↓
4. ragService.retrieveRelevantChunks():
   a. Convert query to embedding
   b. Search Supabase for similar chunks
   c. Return top 5 relevant chunks
   ↓
5. Build prompt with:
   - System instructions
   - Course material context (from RAG)
   - Conversation history
   - Student's question
   ↓
6. llmService.chat() → sends to Ollama
   ↓
7. Ollama generates response using context
   ↓
8. Stream response to student
   ↓
9. Archive interaction to Supabase (async)
```

### Example 3: Search Mode

```
1. Student: "requirements modeling techniques"
   ↓
2. POST /api/search
   ↓
3. search.js validates request
   ↓
4. ragService.retrieveRelevantChunks() → finds relevant chunks
   ↓
5. Build prompt asking LLM to summarize
   ↓
6. llmService.chat() → gets summary
   ↓
7. Format sources with citations
   ↓
8. Return JSON with summary + sources
```

## Common Patterns

### 1. Async/Await

Most functions are `async` because they wait for:
- Database queries
- LLM responses
- Network requests

```javascript
async function getData() {
  const result = await database.query();  // Wait for database
  return result;
}
```

### 2. Error Handling

Errors are caught and passed to error handler:

```javascript
try {
  // Do something that might fail
} catch (error) {
  next(error);  // Pass to error handler
}
```

### 3. Streaming

Chat responses stream in real-time:

```javascript
for await (const chunk of llmService.chat(messages)) {
  res.write(chunk);  // Send chunk immediately
}
res.end();  // Close stream
```

### 4. Graceful Degradation

Code checks if services are available:

```javascript
if (!supabase) {
  // Work without Supabase (basic mode)
  return [];
}
// Use Supabase features
```

## Adding New Features

### Adding a New Route

1. Create file in `routes/`:
```javascript
// routes/myroute.js
const router = require('express').Router();

router.get('/', (req, res) => {
  res.json({ message: 'Hello' });
});

module.exports = router;
```

2. Register in `app.js`:
```javascript
const myRoute = require('./routes/myroute');
app.use('/api/myroute', myRoute);
```

### Adding a New Service

1. Create file in `services/`:
```javascript
// services/myService.js
class MyService {
  async doSomething() {
    // Your logic here
  }
}

module.exports = new MyService();
```

2. Use in routes:
```javascript
const myService = require('../services/myService');
const result = await myService.doSomething();
```

## Tips for Beginners

1. **Start with `app.js`** - See how everything connects
2. **Follow a request** - Pick an endpoint and trace through the code
3. **Read the comments** - Each file has detailed explanations
4. **Check the services** - Business logic is in services/
5. **Test endpoints** - Use curl or Postman to test

## Questions?

- **What is RAG?** See `IMPROVEMENT_STRATEGY.md`
- **How to set up?** See `SETUP.md`
- **What's implemented?** See `PROGRESS.md`
- **How to switch LLM?** See `LLM_SWITCHING_GUIDE.md`

---

**Remember**: The code is heavily commented. Read the comments in each file for detailed explanations!

