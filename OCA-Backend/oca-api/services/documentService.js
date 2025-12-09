/**
 * Document Processing Service
 * 
 * This service handles processing course material documents (PDFs, text files)
 * and preparing them for RAG storage in Supabase.
 * 
 * Process:
 * 1. Parse documents (PDF or text)
 * 2. Split into chunks with overlap
 * 3. Extract metadata (section, page, etc.)
 * 4. Generate embeddings
 * 5. Store in Supabase
 * 
 * @module services/documentService
 */

const fs = require('fs').promises;
const path = require('path');
const ragService = require('./ragService');

/**
 * Document Processing Service Class
 * 
 * Provides methods for:
 * - Parsing PDF and text files
 * - Chunking documents
 * - Processing and storing documents
 */
class DocumentService {
  /**
   * Parse a text file
   * 
   * @param {string} filePath - Path to the text file
   * @returns {Promise<string>} File contents as string
   */
  async parseTextFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      throw new Error(`Failed to read text file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Parse a PDF file
   * 
   * Note: Requires pdf-parse package
   * Install: npm install pdf-parse
   * 
   * @param {string} filePath - Path to the PDF file
   * @returns {Promise<Array<Object>>} Array of page objects with text and page number
   */
  async parsePDFFile(filePath) {
    try {
      // Dynamic import to handle missing dependency gracefully
      const pdfParse = require('pdf-parse');
      const dataBuffer = await fs.readFile(filePath);
      const pdfData = await pdfParse(dataBuffer);
      
      // Return pages as array (pdf-parse gives us full text, but we can split by pages)
      // For now, return as single document - you can enhance this to extract page-by-page
      return [{
        text: pdfData.text,
        pageNumber: 1, // pdf-parse doesn't always give page-by-page, so we'll chunk the whole thing
        totalPages: pdfData.numpages
      }];
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error('pdf-parse package not installed. Run: npm install pdf-parse');
      }
      throw new Error(`Failed to parse PDF ${filePath}: ${error.message}`);
    }
  }

  /**
   * Chunk text into smaller pieces with overlap
   * 
   * @param {string} text - Text to chunk
   * @param {Object} options - Chunking options
   *   - chunkSize: number - Characters per chunk (default: 1000)
   *   - overlap: number - Overlap between chunks in characters (default: 200)
   * 
   * @returns {Array<string>} Array of text chunks
   */
  chunkText(text, options = {}) {
    const {
      chunkSize = 1000,  // ~1000 characters per chunk
      overlap = 200      // 200 characters overlap between chunks
    } = options;

    const chunks = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      const chunk = text.slice(start, end);
      
      // Only add non-empty chunks
      if (chunk.trim().length > 0) {
        chunks.push(chunk.trim());
      }
      
      // Move start position forward (with overlap)
      start = end - overlap;
      
      // Prevent infinite loop if overlap >= chunkSize
      if (start <= chunks.length * (chunkSize - overlap)) {
        start = chunks.length * (chunkSize - overlap);
      }
      
      // Safety check
      if (start >= text.length) break;
    }

    return chunks;
  }

  /**
   * Process a single document file
   * 
   * @param {string} filePath - Path to the document file
   * @param {Object} options - Processing options
   *   - documentName: string - Name for the document (default: filename)
   *   - section: string - Section/topic name (optional)
   *   - chunkSize: number - Characters per chunk
   *   - overlap: number - Overlap between chunks
   * 
   * @returns {Promise<Array<Object>>} Array of chunk objects ready for storage
   */
  async processDocument(filePath, options = {}) {
    const {
      documentName = path.basename(filePath),
      section = null,
      chunkSize = 1000,
      overlap = 200
    } = options;

    try {
      // Determine file type
      const ext = path.extname(filePath).toLowerCase();
      let text = '';
      let pageNumber = null;

      // Parse based on file type
      if (ext === '.pdf') {
        const pages = await this.parsePDFFile(filePath);
        // Combine all pages into single text (you can enhance this to keep pages separate)
        text = pages.map(p => p.text).join('\n\n');
        pageNumber = pages[0]?.pageNumber || 1;
      } else if (ext === '.txt' || ext === '.md') {
        text = await this.parseTextFile(filePath);
        pageNumber = 1;
      } else {
        throw new Error(`Unsupported file type: ${ext}. Supported: .pdf, .txt, .md`);
      }

      // Chunk the text
      const textChunks = this.chunkText(text, { chunkSize, overlap });

      // Create chunk objects with metadata
      const chunks = textChunks.map((chunkText, index) => ({
        document_name: documentName,
        document_path: filePath,
        section: section || `Section ${Math.floor(index / 10) + 1}`, // Auto-section if not provided
        page_number: pageNumber,
        chunk_text: chunkText,
        chunk_index: index,
        metadata: {
          total_chunks: textChunks.length,
          chunk_size: chunkText.length,
          file_type: ext
        }
      }));

      return chunks;
    } catch (error) {
      throw new Error(`Failed to process document ${filePath}: ${error.message}`);
    }
  }

  /**
   * Process multiple documents and store them in Supabase
   * 
   * @param {Array<string>} filePaths - Array of file paths to process
   * @param {Object} options - Processing options
   * 
   * @returns {Promise<Object>} Processing results
   */
  async processAndStoreDocuments(filePaths, options = {}) {
    const results = {
      processed: 0,
      failed: 0,
      totalChunks: 0,
      errors: []
    };

    for (const filePath of filePaths) {
      try {
        console.log(`\n📄 Processing: ${filePath}`);
        
        // Process document into chunks
        const chunks = await this.processDocument(filePath, options);
        console.log(`   ✅ Generated ${chunks.length} chunks`);

        // Store chunks in Supabase (with embeddings)
        const storedChunks = await ragService.storeDocumentChunks(chunks);
        console.log(`   ✅ Stored ${storedChunks.length} chunks in database`);

        results.processed++;
        results.totalChunks += storedChunks.length;
      } catch (error) {
        console.error(`   ❌ Failed: ${error.message}`);
        results.failed++;
        results.errors.push({
          file: filePath,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Process all documents in a directory
   * 
   * @param {string} directoryPath - Path to directory containing documents
   * @param {Object} options - Processing options
   * 
   * @returns {Promise<Object>} Processing results
   */
  async processDirectory(directoryPath, options = {}) {
    try {
      // Read directory
      const files = await fs.readdir(directoryPath);
      
      // Filter for supported file types
      const supportedExtensions = ['.pdf', '.txt', '.md'];
      const documentFiles = files
        .filter(file => {
          const ext = path.extname(file).toLowerCase();
          return supportedExtensions.includes(ext);
        })
        .map(file => path.join(directoryPath, file));

      if (documentFiles.length === 0) {
        throw new Error(`No supported documents found in ${directoryPath}`);
      }

      console.log(`Found ${documentFiles.length} document(s) to process`);

      // Process all documents
      return await this.processAndStoreDocuments(documentFiles, options);
    } catch (error) {
      throw new Error(`Failed to process directory ${directoryPath}: ${error.message}`);
    }
  }
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = new DocumentService();

