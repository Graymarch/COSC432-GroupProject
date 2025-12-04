/**
 * Search Route - Information Access Mode
 * 
 * This route handles the information access mode of the OCA system.
 * Students can search for course information and get summarized results with citations.
 * 
 * Features:
 * - RAG-based search: Finds relevant course material chunks
 * - Summarization: LLM summarizes the retrieved information
 * - Source citations: Returns references to course materials
 * - Structured response: JSON format with summary and sources
 * 
 * Request Flow:
 * 1. Receive search query
 * 2. Retrieve relevant course material chunks (RAG)
 * 3. Generate summary using LLM
 * 4. Format sources with citations
 * 5. Archive interaction (async)
 * 6. Return JSON response
 * 
 * @module routes/search
 */

const express = require('express');
const router = express.Router();
const llmService = require('../services/llmService');
const ragService = require('../services/ragService');
const supabase = require('../config/database');

/**
 * POST /api/search
 * 
 * Information access mode endpoint - provides summarized course information
 * 
 * Request Body:
 *   {
 *     "query": "requirements modeling techniques",  // Search query (required)
 *     "sessionId": "uuid-string",                  // Session ID (required)
 *     "studentId": "student-123",                  // Student ID (optional)
 *     "maxResults": 5                              // Max chunks to retrieve (optional, default: 5)
 *   }
 * 
 * Response:
 *   {
 *     "summary": "Requirements modeling techniques include...",  // LLM-generated summary
 *     "sources": [                                                // Array of source citations
 *       {
 *         "chunkId": "uuid",
 *         "document": "COSC432_Chapter2.pdf",
 *         "section": "2.3 Requirements Modeling",
 *         "page": 45,
 *         "excerpt": "Requirements modeling is..."
 *       }
 *     ],
 *     "timestamp": "2024-01-15T10:30:00Z"
 *   }
 * 
 * Example:
 *   POST /api/search
 *   {
 *     "query": "What are use cases?",
 *     "sessionId": "session-abc-123",
 *     "maxResults": 3
 *   }
 */
router.post('/', async (req, res, next) => {
  try {
    const { query, sessionId, studentId, maxResults = 5 } = req.body;

    // Validate request
    if (!query || !sessionId) {
      return res.status(400).json({
        error: 'Missing required fields: query and sessionId are required'
      });
    }

    if (!supabase) {
      return res.status(503).json({
        error: 'Course material search is not available until Supabase is configured.'
      });
    }

    // Retrieve relevant chunks using RAG
    const relevantChunks = await ragService.retrieveRelevantChunks(query, {
      mode: 'info_access',
      topK: maxResults
    });

    if (relevantChunks.length === 0) {
      return res.status(404).json({
        error: 'No relevant course material found for this query'
      });
    }

    // Build context from retrieved chunks
    const context = relevantChunks
      .map(chunk => `[${chunk.document_name}, Section: ${chunk.section}, Page: ${chunk.page_number}]\n${chunk.chunk_text}`)
      .join('\n\n');

    // Build system prompt for info access mode
    const systemPrompt = `You are an interactive teaching assistant for COSC432. Your role is to help students find and understand course information.

RELEVANT COURSE MATERIAL:
${context}

INSTRUCTIONS:
1. Summarize the relevant information clearly and concisely.
2. Provide specific references to course materials.
3. Highlight key concepts and their relationships.
4. Keep the summary focused and actionable.
5. Format your response with clear structure and citations.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query }
    ];

    // Get summary from LLM
    let summary = '';
    for await (const chunk of llmService.chat(messages, { stream: false })) {
      summary += chunk;
    }

    // Format sources
    const sources = relevantChunks.map(chunk => ({
      chunkId: chunk.id,
      document: chunk.document_name,
      section: chunk.section,
      page: chunk.page_number,
      excerpt: chunk.chunk_text.substring(0, 200) + '...'
    }));

    // Archive interaction (async, don't wait)
    if (studentId && supabase) {
      supabase.from('interactions').insert({
        student_id: studentId,
        session_id: sessionId,
        mode: 'info_access',
        user_message: query,
        assistant_response: summary,
        retrieved_chunk_ids: relevantChunks.map(c => c.id),
        metadata: { sources_count: sources.length }
      }).catch(err => console.error('Failed to archive interaction:', err));
    } else if (studentId && !supabase) {
      console.warn('[Search] Supabase not configured. Skipping interaction archive.');
    }

    // Return response
    res.json({
      summary,
      sources,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

