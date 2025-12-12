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
const { v4: uuidv4 } = require('uuid');
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
 *     "sessionId": "uuid-string",                    // Session ID (optional - auto-created if not provided)
 *     "studentId": "student-123"                      // Student ID (optional - uses "anonymous" if not provided)
 *   }
 * 
 * Response:
 *   Streaming text response (Content-Type: text/plain)
 *   The response streams in real-time as the LLM generates it
 * 
 * Example:
 *   POST /api/chat
 *   {
 *     "message": "Explain eigenvectors"
 *   }
 * 
 *   Response (streaming):
 *   "Eigenvectors are special vectors that..."
 * 
 * Note: Session is automatically created on first message if not provided
 */
router.post('/', async (req, res, next) => {
  try {
    const { message, sessionId: providedSessionId, studentId } = req.body;

    // Validate request - only message is required
    if (!message) {
      return res.status(400).json({
        error: 'Missing required field: message is required'
      });
    }

    // Use provided sessionId or generate a new one
    // Use provided studentId or default to "anonymous"
    let sessionId = providedSessionId;
    const userId = studentId || 'anonymous';

    // Generate sessionId if not provided
    if (!sessionId) {
      sessionId = uuidv4();
      console.log('[Chat] Generated new session ID:', sessionId);
    }

    // Ensure session exists in database (if Supabase is configured)
    if (supabase) {
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
              mode: 'tutoring',
              created_at: new Date().toISOString(),
              last_activity: new Date().toISOString(),
              context: {}
            })
            .select()
            .single();

          if (createError) {
            console.warn('[Chat] ⚠️  Failed to create session:', createError.message);
            console.warn('[Chat] Error details:', JSON.stringify(createError, null, 2));
            // Continue anyway - sessionId is still valid for this request
          } else {
            console.log('[Chat] ✅ Auto-created session:', sessionId);
          }
        } else {
          // Session exists - update last activity (async, don't wait)
          supabase
            .from('sessions')
            .update({ last_activity: new Date().toISOString() })
            .eq('id', sessionId)
            .then(() => {})
            .catch(() => {}); // Ignore errors for activity update
        }
      } catch (err) {
        console.warn('[Chat] Session check/creation error:', err.message);
        // Continue anyway - sessionId is still valid
      }
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
    const systemPrompt = `
INSRUCTION: 
You are an out-of-classroom learning and teaching aid for COSC432 - Requirements Analysis and Modeling. 
You follow Dr. Chakraborty's teaching philosophy.

CONTEXT FROM COURSE MATERIAL:
${context || 'No specific course material found for this query.'}

GUIDELINES:
1. Identify if the question is assignment/exam related. If so, help with concepts but avoid providing answers.
2. Reference specific course materials when explaining concepts and site where it can be found when possible.
3. If non-academic, redirect to course-related topics.
4. Respond in a style that encourages learning through discovery.
5. Use the conversation history to maintain context and build upon previous discussion.
6. Format your responses, use newlines and numbered lists instead of markdown shortcuts as markdown will not be formatted and overclutters results.\
7. Keep your responses as brief as you may believe is reasonable unless a more detailed response is necessary, or the user asks for a more detailed answer.
8. If deemed necessary to provide a more precise answer, use leading questions to assess the student's comprehension level and maintain current conversation.

EXAMPLE:
  [A student begins a converstaion with you with the following]  
    Hi! I am new to requirements engineering and would like to know what to expect from a college course about it.

  [Your response should look something like this]
    I'm so glad to hear that you are beginning to learn Requirements Engineering.\n

    Before we get into the details, let's do a small overview of a Requirements Engineering course syllabus:\n
     \t 1. What is a Requirement?\n
         \t\t The Requirements Engineering (RE) Lifecycle\n
         \t\t How RE flows through the Software Development Lifecycle (SDLC)\n
     \t 2. RE within the SDLC\n
         \t\t Techniques and Tools\n

  [Continue on until you go over the syallabus, but take note of how the use of newlines, indentation, and numbered lists makes the result easier to read for the student, you may want to add escape characters in your response to have messages reflect the structure above.]

EXAMPLE:
  [A student write the following to you in the middle of a conversation]
    Can you show me what a Business Use Case looks like in the following scenario:
      [The student uses a scenario found in an exam within your vector database]
  
 [Your response should look something like this]
    I see that this example is part of course material, more specifically one of the exams.

    While I won't give you what a Business Use Cases looks like in that scenario, I can help you find out how to identity and build one.

    [From this point, you list how Business Use Cases and be identified and created. From this example, consider the language used to still be an assist to the student, but not outright give them the solution to the question.]
`;

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
    // Always archive if Supabase is configured (even for anonymous users)
    if (supabase && sessionId) {
      supabase.from('interactions')
        .insert({
          student_id: userId,  // Use userId (could be "anonymous")
          session_id: sessionId,
          mode: 'tutoring',
          user_message: message,
          assistant_response: fullResponse,
          retrieved_chunk_ids: relevantChunks.map(c => c.id) || [],
          metadata: { chunks_count: relevantChunks.length }
        })
        .select()  // Return the inserted row
        .then(({ data, error }) => {
          if (error) {
            console.error('[Chat] ❌ Failed to archive interaction');
            console.error('[Chat] Error code:', error.code);
            console.error('[Chat] Error message:', error.message);
            console.error('[Chat] Error details:', JSON.stringify(error, null, 2));
            console.error('[Chat] Attempted data:', {
              student_id: userId,
              session_id: sessionId,
              mode: 'tutoring',
              message_length: message.length,
              response_length: fullResponse.length,
              chunks_count: relevantChunks.length
            });
          } else {
            console.log('[Chat] ✅ Interaction archived successfully');
            if (data && data.length > 0) {
              console.log('[Chat] Interaction ID:', data[0].id);
            } else {
              console.log('[Chat] Interaction saved (ID not returned)');
            }
          }
        })
        .catch(err => {
          console.error('[Chat] ❌ Archive exception:', err.message);
          // Don't throw - response already sent
        });
    } else if (!supabase) {
      console.warn('[Chat] ⚠️  Supabase not configured. Skipping interaction archive.');
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;

