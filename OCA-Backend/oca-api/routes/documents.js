/**
 * Documents Route - Document Processing API
 * 
 * This route provides an API endpoint for processing and storing documents.
 * Useful for uploading course materials via API instead of using the script.
 * 
 * @module routes/documents
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const documentService = require('../services/documentService');
const ragService = require('../services/ragService');
const supabase = require('../config/database');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/', // Temporary storage
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept PDF, TXT, MD files
    const allowedTypes = ['.pdf', '.txt', '.md'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}. Allowed: ${allowedTypes.join(', ')}`));
    }
  }
});

/**
 * POST /api/documents/process
 * 
 * Process and store a single uploaded document
 * 
 * Request: multipart/form-data
 *   - file: Document file (PDF, TXT, or MD)
 *   - documentName: Optional custom name
 *   - section: Optional section/topic name
 * 
 * Response:
 *   {
 *     "success": true,
 *     "chunksStored": 10,
 *     "documentName": "chapter1.pdf"
 *   }
 */
router.post('/process', upload.single('file'), async (req, res, next) => {
  try {
    if (!supabase) {
      return res.status(503).json({
        error: 'Document processing requires Supabase configuration'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded'
      });
    }

    const { documentName, section } = req.body;
    const filePath = req.file.path;

    try {
      // Process document
      const chunks = await documentService.processDocument(filePath, {
        documentName: documentName || req.file.originalname,
        section: section || null,
        chunkSize: 1000,
        overlap: 200
      });

      // Store chunks
      const storedChunks = await ragService.storeDocumentChunks(chunks);

      // Clean up uploaded file
      await fs.unlink(filePath).catch(() => {});

      res.json({
        success: true,
        chunksStored: storedChunks.length,
        documentName: documentName || req.file.originalname,
        message: `Successfully processed and stored ${storedChunks.length} chunks`
      });
    } catch (error) {
      // Clean up uploaded file on error
      await fs.unlink(filePath).catch(() => {});
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/documents/list
 * 
 * List all documents stored in the database
 * 
 * Response:
 *   {
 *     "documents": [
 *       {
 *         "document_name": "chapter1.pdf",
 *         "chunk_count": 25,
 *         "first_stored": "2024-01-15T10:00:00Z"
 *       }
 *     ]
 *   }
 */
router.get('/list', async (req, res, next) => {
  try {
    if (!supabase) {
      return res.status(503).json({
        error: 'Document listing requires Supabase configuration'
      });
    }

    const { data, error } = await supabase
      .from('document_chunks')
      .select('document_name, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Group by document name and count chunks
    const documentMap = {};
    data.forEach(chunk => {
      if (!documentMap[chunk.document_name]) {
        documentMap[chunk.document_name] = {
          document_name: chunk.document_name,
          chunk_count: 0,
          first_stored: chunk.created_at
        };
      }
      documentMap[chunk.document_name].chunk_count++;
    });

    const documents = Object.values(documentMap);

    res.json({
      documents,
      total_documents: documents.length,
      total_chunks: data.length
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

