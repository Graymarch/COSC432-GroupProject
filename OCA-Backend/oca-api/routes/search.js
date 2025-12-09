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
const { v4: uuidv4 } = require('uuid');
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
    const { query, sessionId: providedSessionId, studentId, maxResults = 5 } = req.body;

    // Validate request - only query is required
    if (!query) {
      return res.status(400).json({
        error: 'Missing required field: query is required'
      });
    }

    if (!supabase) {
      return res.status(503).json({
        error: 'Course material search is not available until Supabase is configured.'
      });
    }

    // Use provided sessionId or generate a new one
    // Use provided studentId or default to "anonymous"
    let sessionId = providedSessionId;
    const userId = studentId || 'anonymous';

    // Generate sessionId if not provided
    if (!sessionId) {
      sessionId = uuidv4();
      console.log('[Search] Generated new session ID:', sessionId);
    }

    // Ensure session exists in database
    try {
      // Check if session exists
      const { data: existingSession, error: checkError } = await supabase
        .from('sessions')
        .select('id')
        .eq('id', sessionId)
        .single();

      // If session doesn't exist, create it
      if (checkError || !existingSession) {
        const { data: newSession, error: createError } = await supabase
          .from('sessions')
          .insert({
            id: sessionId,
            student_id: userId,
            mode: 'info_access',
            created_at: new Date().toISOString(),
            last_activity: new Date().toISOString(),
            context: {}
          })
          .select()
          .single();

        if (createError) {
          console.warn('[Search] ⚠️  Failed to create session:', createError.message);
          // Continue anyway
        } else {
          console.log('[Search] ✅ Auto-created session:', sessionId);
        }
      } else {
        // Update last activity (async)
        supabase
          .from('sessions')
          .update({ last_activity: new Date().toISOString() })
          .eq('id', sessionId)
          .then(() => {})
          .catch(() => {});
      }
    } catch (err) {
      console.warn('[Search] Session check/creation error:', err.message);
      // Continue anyway
    }

    // Retrieve relevant chunks using RAG
    const relevantChunks = await ragService.retrieveRelevantChunks(query, {
      mode: 'info_access',
      topK: maxResults
    });

    let summary = '';
    let sources = [];

    if (relevantChunks.length === 0) {
      // No course material found - provide fallback response
      console.warn('[Search] No relevant course material found for query:', query);
      
      // Build fallback system prompt without specific course context
      const systemPrompt = `You are an interactive teaching assistant for COSC432 (Requirements Analysis and Modeling).
Your role is to help students understand course concepts.

INSTRUCTIONS:
1. Provide a helpful response about the requested topic if it relates to COSC432.
2. Explain the concept clearly using general knowledge about requirements analysis.
3. If the query is not related to COSC432, politely decline and redirect to course topics.
4. Be encouraging and supportive in your teaching style.`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ];

      // Get response from LLM without course context
      for await (const chunk of llmService.chat(messages, { stream: false })) {
        summary += chunk;
      }

      // No sources available when no chunks found
      sources = [];
    } else {
      // Course material found - use RAG context
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
      for await (const chunk of llmService.chat(messages, { stream: false })) {
        summary += chunk;
      }

      // Format sources
      sources = relevantChunks.map(chunk => ({
        chunkId: chunk.id,
        document: chunk.document_name,
        section: chunk.section,
        page: chunk.page_number,
        excerpt: chunk.chunk_text.substring(0, 200) + '...'
      }));
    }

    // Archive interaction (async, don't wait)
    // Always archive if Supabase is configured (even for anonymous users)
    if (supabase && sessionId) {
      supabase.from('interactions')
        .insert({
          student_id: userId,  // Use userId (could be "anonymous")
          session_id: sessionId,
          mode: 'info_access',
          user_message: query,
          assistant_response: summary,
          retrieved_chunk_ids: relevantChunks.map(c => c.id) || [],
          metadata: { sources_count: sources.length }
        })
        .select()  // Return the inserted row
        .then(({ data, error }) => {
          if (error) {
            console.error('[Search] ❌ Failed to archive interaction');
            console.error('[Search] Error:', error.message);
            console.error('[Search] Error details:', JSON.stringify(error, null, 2));
          } else {
            console.log('[Search] ✅ Interaction archived successfully');
            if (data && data.length > 0) {
              console.log('[Search] Interaction ID:', data[0].id);
            }
          }
        })
        .catch(err => {
          console.error('[Search] ❌ Archive exception:', err.message);
        });
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

