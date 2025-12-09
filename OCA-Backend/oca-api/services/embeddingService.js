/**
 * Embedding Service Module
 * 
 * This service provides a convenient wrapper around embedding generation.
 * It simplifies the process of generating embeddings for single texts or batches.
 * 
 * Embeddings are used for:
 * - RAG (Retrieval Augmented Generation): Converting text to searchable vectors
 * - Similarity search: Finding similar content in course materials
 * 
 * This service delegates to llmService.generateEmbedding() but provides
 * additional convenience methods for batch processing.
 * 
 * @module services/embeddingService
 */

const llmService = require('./llmService');

/**
 * Embedding Service Class
 * 
 * Provides methods for generating embeddings:
 * - generateEmbedding(): Single text embedding
 * - generateEmbeddings(): Batch embedding generation
 */
class EmbeddingService {
  /**
   * Generate embedding for a single text
   * 
   * This is a convenience wrapper around llmService.generateEmbedding().
   * It provides a consistent interface for embedding generation.
   * 
   * @param {string} text - The text to convert to an embedding
   *   Example: "What is requirements analysis?"
   * 
   * @param {string} model - Embedding model name
   *   Default: 'nomic-embed-text'
   *   Options: 'nomic-embed-text', 'all-minilm-l6-v2'
   * 
   * @returns {Promise<Array<number>>} Embedding vector
   *   Returns an array of numbers representing the text's semantic meaning
   * 
   * @example
   *   const embedding = await embeddingService.generateEmbedding("Hello world");
   *   console.log(embedding.length); // e.g., 768 (depends on model)
   */
  async generateEmbedding(text, model = 'nomic-embed-text') {
    // Delegate to llmService - it handles the actual embedding generation
    return llmService.generateEmbedding(text, model);
  }

  /**
   * Generate embeddings for multiple texts in batch
   * 
   * This method processes multiple texts in parallel for efficiency.
   * Instead of calling generateEmbedding() multiple times sequentially,
   * this processes them all at once using Promise.all().
   * 
   * @param {Array<string>} texts - Array of texts to embed
   *   Example: ["What is requirements analysis?", "Explain use cases"]
   * 
   * @param {string} model - Embedding model name
   *   Default: 'nomic-embed-text'
   * 
   * @returns {Promise<Array<Array<number>>>} Array of embedding vectors
   *   Returns an array where each element is an embedding vector
   *   The order matches the input texts array
   * 
   * @example
   *   const texts = [
   *     "What is requirements analysis?",
   *     "Explain use cases"
   *   ];
   *   
   *   const embeddings = await embeddingService.generateEmbeddings(texts);
   *   console.log(embeddings.length); // 2
   *   console.log(embeddings[0].length); // e.g., 768 (embedding dimension)
   */
  async generateEmbeddings(texts, model = 'nomic-embed-text') {
    try {
      // Process all texts in parallel using Promise.all()
      // This is much faster than processing them one by one
      const embeddings = await Promise.all(
        // Map each text to a promise that generates its embedding
        texts.map(text => this.generateEmbedding(text, model))
      );
      
      return embeddings;
    } catch (error) {
      // Wrap error with context
      throw new Error(`Batch embedding generation error: ${error.message}`);
    }
  }
}

// ============================================================================
// EXPORT
// ============================================================================

// Export a singleton instance
module.exports = new EmbeddingService();

