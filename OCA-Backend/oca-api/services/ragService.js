/**
 * RAG Service Module
 * 
 * RAG stands for "Retrieval Augmented Generation" - a technique that improves
 * LLM responses by providing relevant context from a knowledge base.
 * 
 * How RAG Works:
 * 1. User asks a question
 * 2. Convert question to embedding (vector)
 * 3. Search database for similar document chunks (using vector similarity)
 * 4. Retrieve top-k most relevant chunks
 * 5. Include chunks as context when asking LLM
 * 6. LLM generates response using both its knowledge AND the retrieved context
 * 
 * This service handles:
 * - Retrieving relevant course material chunks for a query
 * - Storing document chunks with embeddings in the database
 * 
 * @module services/ragService
 */

const supabase = require('../config/database');
const embeddingService = require('./embeddingService');

/**
 * RAG Service Class
 * 
 * Provides methods for RAG operations:
 * - retrieveRelevantChunks(): Find relevant course material for a query
 * - storeDocumentChunks(): Store course materials with embeddings
 */
class RAGService {
  /**
   * Retrieve relevant document chunks using vector similarity search
   * 
   * This is the core RAG retrieval function. It:
   * 1. Converts the user's query into an embedding (vector)
   * 2. Searches the database for document chunks with similar embeddings
   * 3. Returns the most relevant chunks
   * 
   * These chunks are then used as context when generating the LLM response,
   * ensuring the answer is grounded in actual course materials.
   * 
   * @param {string} query - The user's question or search query
   *   Example: "What is requirements analysis?"
   * 
   * @param {Object} options - Search configuration
   *   - topK: number - How many chunks to return (default: 5)
   *   - threshold: number - Similarity threshold 0-1 (default: 0.7)
   *     Higher = more strict (only very similar chunks)
   *     Lower = more lenient (more chunks, but less relevant)
   *   - mode: string - 'tutoring' or 'info_access' (for future use)
   * 
   * @returns {Promise<Array<Object>>} Array of relevant document chunks
   *   Each chunk contains:
   *   - id: UUID - Chunk identifier
   *   - document_name: string - Source document name
   *   - section: string - Section/topic name
   *   - page_number: number - Page in source document
   *   - chunk_text: string - The actual text content
   *   - similarity: number - How similar to query (0-1)
   *   - metadata: object - Additional metadata
   * 
   * @example
   *   const chunks = await ragService.retrieveRelevantChunks(
   *     "What is requirements analysis?",
   *     { topK: 5, threshold: 0.7 }
   *   );
   *   // Returns 5 most relevant course material chunks
   */
  async retrieveRelevantChunks(query, options = {}) {
    // Extract options with defaults
    const {
      topK = 5,           // Return top 5 most relevant chunks
      threshold = 0.7,    // 70% similarity threshold
      mode = 'tutoring'   // Mode (for future filtering)
    } = options;

    try {
      // Check if Supabase is configured
      // Without Supabase, we can't do vector search
      if (!supabase) {
        console.warn('[RAG] Supabase not configured. Returning empty search results.');
        return [];  // Return empty array - app continues without RAG context
      }

      // Step 1: Convert query to embedding (vector)
      // This converts the text question into a numerical representation
      // that captures its semantic meaning
      // Uses embeddingService for consistent embedding generation
      const queryEmbedding = await embeddingService.generateEmbedding(query);

      // Step 2: Search Supabase using pgvector
      // The match_documents function is a PostgreSQL function that:
      // - Takes the query embedding
      // - Compares it to all stored document chunk embeddings
      // - Returns chunks with similarity above threshold
      // - Orders by similarity (most similar first)
      // - Limits to topK results
      const { data, error } = await supabase.rpc('match_documents', {
        query_embedding: queryEmbedding,  // The query as a vector
        match_threshold: threshold,        // Minimum similarity (0.7 = 70%)
        match_count: topK                  // How many to return
      });

      // Check for database errors
      if (error) {
        throw error;
      }

      // Return the retrieved chunks (or empty array if none found)
      return data || [];
    } catch (error) {
      // Wrap error with context
      throw new Error(`RAG retrieval error: ${error.message}`);
    }
  }

  /**
   * Store document chunks with embeddings in the database
   * 
   * This function is used during the initial setup phase to:
   * 1. Take course material documents (PDFs, text files)
   * 2. Split them into chunks (smaller pieces)
   * 3. Generate embeddings for each chunk
   * 4. Store chunks + embeddings in Supabase
   * 
   * Once stored, these chunks can be retrieved using retrieveRelevantChunks()
   * 
   * @param {Array<Object>} chunks - Array of chunk objects to store
   *   Each chunk should have:
   *   - text: string - The chunk text content
   *   - document_name: string - Source document name
   *   - section: string - Section/topic (optional)
   *   - page_number: number - Page number (optional)
   *   - chunk_index: number - Index in document (optional)
   *   - metadata: object - Additional metadata (optional)
   * 
   * @returns {Promise<Array<Object>>} Stored chunks with database IDs
   *   Returns the same chunks but now with:
   *   - id: UUID - Database-generated ID
   *   - embedding: Array<number> - Generated embedding vector
   * 
   * @example
   *   const chunks = [
   *     {
   *       text: "Requirements analysis is the process of...",
   *       document_name: "COSC432_Chapter1.pdf",
   *       section: "1.2 Requirements Analysis",
   *       page_number: 15
   *     }
   *   ];
   *   
   *   const stored = await ragService.storeDocumentChunks(chunks);
   *   // Chunks are now in database with embeddings
   */
  async storeDocumentChunks(chunks) {
    try {
      // Step 1: Generate embeddings for all chunks
      // We use Promise.all to generate embeddings in parallel (faster)
      // For each chunk, we:
      //   1. Generate embedding from chunk text
      //   2. Add embedding to chunk object
      const chunksWithEmbeddings = await Promise.all(
        chunks.map(async (chunk) => {
          // Generate embedding for this chunk's text
          // Uses embeddingService for consistent embedding generation
          const embedding = await embeddingService.generateEmbedding(chunk.text);
          
          // Return chunk with embedding added
          // The spread operator (...) copies all existing chunk properties
          // and adds the embedding
          return {
            ...chunk,      // All original chunk properties
            embedding      // Add the embedding vector
          };
        })
      );

      // Step 2: Store in Supabase
      // Check if Supabase is configured
      if (!supabase) {
        throw new Error('Supabase is not configured. Cannot store document chunks.');
      }

      // Insert all chunks into the document_chunks table
      // .insert() - Adds new rows
      // .select() - Returns the inserted rows (with generated IDs)
      const { data, error } = await supabase
        .from('document_chunks')           // Table name
        .insert(chunksWithEmbeddings)       // Insert all chunks
        .select();                          // Return inserted data

      // Check for database errors
      if (error) {
        throw error;
      }

      // Return the stored chunks (now with database IDs)
      return data;
    } catch (error) {
      // Wrap error with context
      throw new Error(`Document storage error: ${error.message}`);
    }
  }
}

// ============================================================================
// EXPORT
// ============================================================================

// Export a singleton instance
module.exports = new RAGService();

