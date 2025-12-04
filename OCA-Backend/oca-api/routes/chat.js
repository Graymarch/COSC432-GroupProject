/**
 * Chat Route - Tutoring Mode
 * 
 * This route handles the tutoring mode of the OCA system.
 * Students can ask questions and get interactive tutoring responses.
 * 
 * Features:
 * - RAG (Retrieval Augmented Generation): Includes relevant course material context
 * - Conversation History: Maintains context across multiple questions
 * - Streaming Responses: Real-time response generation
 * - Interaction Archiving: Saves all conversations for analysis
 * 
 * Request Flow:
 * 1. Receive student question
 * 2. Retrieve conversation history (if available)
 * 3. Retrieve relevant course material chunks (RAG)
 * 4. Build prompt with context
 * 5. Stream response from LLM
 * 6. Archive interaction (async)
 * 
 * @module routes/chat
 */

const express = require('express');
const router = express.Router();
const llmService = require('../services/llmService');
const ragService = require('../services/ragService');
const supabase = require('../config/database');

/**
 * POST /api/chat
 * 
 * Tutoring mode endpoint - handles student questions with RAG and conversation history
 * 
 * Request Body:
 *   {
 *     "message": "What is requirements analysis?",  // Student's question (required)
 *     "sessionId": "uuid-string",                    // Session ID (required)
 *     "studentId": "student-123"                      // Student ID (optional, for archiving)
 *   }
 * 
 * Response:
 *   Streaming text response (Content-Type: text/plain)
 *   The response streams in real-time as the LLM generates it
 * 
 * Example:
 *   POST /api/chat
 *   {
 *     "message": "Explain eigenvectors",
 *     "sessionId": "session-abc-123",
 *     "studentId": "student-xyz"
 *   }
 * 
 *   Response (streaming):
 *   "Eigenvectors are special vectors that..."
 */
router.post('/', async (req, res, next) => {
  try {
    const { message, sessionId, studentId } = req.body;

    // Validate request
    if (!message || !sessionId) {
      return res.status(400).json({
        error: 'Missing required fields: message and sessionId are required'
      });
    }

    // Retrieve conversation history for this session (if Supabase is configured)
    let conversationHistory = [];
    if (supabase) {
      try {
        const { data: history } = await supabase
          .from('interactions')
          .select('user_message, assistant_response')
          .eq('session_id', sessionId)
          .order('timestamp', { ascending: true })
          .limit(10); // Last 10 interactions for context
        
        if (history && history.length > 0) {
          // Convert history to message format
          conversationHistory = history.flatMap(interaction => [
            { role: 'user', content: interaction.user_message },
            { role: 'assistant', content: interaction.assistant_response }
          ]);
        }
      } catch (err) {
        console.warn('[Chat] Failed to retrieve conversation history:', err.message);
        // Continue without history if retrieval fails
      }
    }

    // Retrieve relevant chunks using RAG (vector store context)
    const relevantChunks = await ragService.retrieveRelevantChunks(message, {
      mode: 'tutoring',
      topK: 5
    });

    // Build context from retrieved chunks
    const context = relevantChunks
      .map(chunk => `[${chunk.document_name}, Section: ${chunk.section}, Page: ${chunk.page_number}]\n${chunk.chunk_text}`)
      .join('\n\n');

    // Build system prompt for tutoring mode
    const systemPrompt = `You are an out-of-classroom learning and teaching aid for COSC432 - Requirements Analysis and Modeling. 
You follow Dr. Chakraborty's teaching philosophy.

CONTEXT FROM COURSE MATERIAL:
${context || 'No specific course material found for this query.'}

INSTRUCTIONS:
1. Identify if the question is assignment/exam related. If so, help with concepts but DO NOT provide answers.
2. Use leading questions to assess the student's comprehension level.
3. Reference specific course materials when explaining concepts.
4. If non-academic, redirect to course-related topics.
5. Respond in a tutoring style that encourages learning through discovery.
6. Use the conversation history to maintain context and build upon previous discussions.`;

    // Build messages array with conversation history
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory, // Previous conversation turns
      { role: 'user', content: message } // Current question
    ];

    // Stream response from LLM
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    
    let fullResponse = '';
    for await (const chunk of llmService.chat(messages)) {
      res.write(chunk);
      fullResponse += chunk;
    }
    res.end();

    // Archive interaction (async, don't wait)
    if (studentId && supabase) {
      supabase.from('interactions').insert({
        student_id: studentId,
        session_id: sessionId,
        mode: 'tutoring',
        user_message: message,
        assistant_response: fullResponse,
        retrieved_chunk_ids: relevantChunks.map(c => c.id),
        metadata: { chunks_count: relevantChunks.length }
      }).catch(err => console.error('Failed to archive interaction:', err));
    } else if (studentId && !supabase) {
      console.warn('[Chat] Supabase not configured. Skipping interaction archive.');
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;

