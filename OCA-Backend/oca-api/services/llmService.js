/**
 * LLM Service Module
 * 
 * This service provides an abstraction layer for interacting with Large Language Models (LLMs).
 * It handles both chat completions and embedding generation using Ollama.
 * 
 * Key Features:
 * - Chat completion with streaming support (real-time responses)
 * - Embedding generation for RAG (Retrieval Augmented Generation)
 * - Error handling and model configuration
 * 
 * The service uses the Ollama client configured in config/ollama.js, which can be
 * either local (localhost) or cloud (ollama.com API).
 * 
 * @module services/llmService
 */

const ollama = require('../config/ollama');

/**
 * LLM Service Class
 * 
 * Provides methods for interacting with LLM models:
 * - chat(): Generate text responses from LLM
 * - generateEmbedding(): Convert text to vector embeddings
 */
class LLMService {
  /**
   * Chat completion with streaming support
   * 
   * This method sends messages to the LLM and gets a response.
   * It supports streaming, which means the response comes in chunks
   * as it's generated (like ChatGPT), rather than all at once.
   * 
   * @param {Array<Object>} messages - Array of message objects
   *   Each message has:
   *   - role: 'system' | 'user' | 'assistant'
   *   - content: string (the message text)
   * 
   *   Example:
   *   [
   *     { role: 'system', content: 'You are a helpful tutor.' },
   *     { role: 'user', content: 'What is requirements analysis?' }
   *   ]
   * 
   * @param {Object} options - Additional options
   *   - model: string - Model name (default: from env or 'llama3')
   *   - stream: boolean - Enable streaming (default: true)
   *   - ...otherOptions: Any other Ollama chat options
   * 
   * @returns {AsyncGenerator<string>} Streaming response chunks
   *   Use with: for await (const chunk of llmService.chat(messages)) { ... }
   * 
   * @example
   *   const messages = [
   *     { role: 'system', content: 'You are a tutor.' },
   *     { role: 'user', content: 'Explain vectors.' }
   *   ];
   *   
   *   for await (const chunk of llmService.chat(messages)) {
   *     console.log(chunk); // Print each chunk as it arrives
   *   }
   */
  async *chat(messages, options = {}) {
    // Extract options with defaults
    const {
      model = process.env.OLLAMA_MODEL || 'llama3',  // Model name from env or default
      stream = true,  // Enable streaming by default
      ...otherOptions  // Any other options to pass to Ollama
    } = options;

    try {
      // Call Ollama's chat API
      const response = await ollama.chat({
        model,        // Which model to use (e.g., 'llama3')
        messages,     // Conversation messages
        stream,       // Whether to stream the response
        ...otherOptions  // Pass through any additional options
      });

      // Handle streaming response
      if (stream) {
        // Stream mode: yield chunks as they arrive
        // This allows real-time response display
        for await (const part of response) {
          // Extract content from each chunk
          // part.message?.content uses optional chaining (?.) to safely access
          // If content doesn't exist, use empty string
          yield part.message?.content || '';
        }
      } else {
        // Non-streaming mode: return complete response at once
        yield response.message?.content || '';
      }
    } catch (error) {
      // Wrap error with more context
      throw new Error(`LLM service error: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for text
   * 
   * Embeddings are vector representations of text that capture semantic meaning.
   * They're used for:
   * - RAG (Retrieval Augmented Generation): Finding relevant course materials
   * - Similarity search: Finding similar text chunks
   * 
   * The embedding is a numerical array (vector) where similar texts have
   * similar vectors. This allows us to search for relevant content by
   * comparing vectors.
   * 
   * @param {string} text - The text to convert to an embedding
   *   Example: "What is requirements analysis?"
   * 
   * @param {string} model - Embedding model name
   *   Default: 'nomic-embed-text'
   *   Other options: 'all-minilm-l6-v2' (smaller, faster)
   * 
   * @returns {Promise<Array<number>>} Embedding vector
   *   Returns an array of numbers (e.g., [0.1, -0.3, 0.7, ...])
   *   The length depends on the model (typically 384 or 768 numbers)
   * 
   * @example
   *   const embedding = await llmService.generateEmbedding("Hello world");
   *   console.log(embedding); // [0.1, -0.2, 0.3, ...] (array of numbers)
   */
  async generateEmbedding(text, model = 'nomic-embed-text') {
    try {
      // Call Ollama's embeddings API
      const response = await ollama.embeddings({
        model,   // Embedding model name
        prompt: text  // Text to embed (Ollama uses 'prompt' parameter)
      });
      
      // Return the embedding vector
      // This is an array of numbers representing the text's meaning
      return response.embedding;
    } catch (error) {
      // Wrap error with more context
      throw new Error(`Embedding generation error: ${error.message}`);
    }
  }
}

// ============================================================================
// EXPORT
// ============================================================================

// Export a singleton instance (single shared instance)
// This means all modules that import this get the same LLMService instance
module.exports = new LLMService();

