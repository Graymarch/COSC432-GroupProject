require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

// RAG/Embedding dependencies
const officeParser = require('officeparser'); // For robust DOCX/PPTX parsing
const { parse } = require('csv-parse'); 
const { Transform, Readable } = require('stream'); 
const { promisify } = require('util');
const pipeline = promisify(require('stream').pipeline);

// Import services and configurations
const supabase = require('../config/database');
const embeddingService = require('./embeddingService');
const pdfParse = require('pdf-parse');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 150;

// The bucket name (which is also the name of the course)
const BUCKET = 'cosc432-course-materials';

// ============================================================================
// INITIALIZATION
// ============================================================================

// Create Supabase storage client using service role key
const storageClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Split text into overlapping chunks
 * @param {string} text - Full text to chunk
 * @returns {Array<string>} Array of text chunks
 */
function chunkText(text) {
    const chunks = [];
    
    // Step through text by (CHUNK_SIZE - CHUNK_OVERLAP) characters each iteration
    for (let i = 0; i < text.length; i += (CHUNK_SIZE - CHUNK_OVERLAP)) {
        chunks.push(text.slice(i, i + CHUNK_SIZE));
    }
    
    return chunks;
}

/**
 * Download file from Supabase storage bucket
 * * @param {string} path - Path to file in bucket (e.g., "lecture.pdf")
 * @returns {Promise<Buffer>} File contents as binary buffer
 */
async function fetchFile(path) {
    // Call Supabase storage API to download file
    const { data, error } = await storageClient.storage
        .from(BUCKET)
        .download(path);
    
    if (error) throw error;
    
    // Convert response data to Node.js Buffer (binary data)
    return Buffer.from(await data.arrayBuffer());
}

/**
 * Extract text from PDF, DOCX, CSV, PPTX, or TXT file
 * * @param {string} path - File path (used to detect file type)
 * @param {Buffer} buffer - File contents as binary buffer
 * @returns {Promise<string>} Extracted text
 */
async function extractText(path, buffer) {
    const fileType = path.toLowerCase().split('.').pop();
    
    // --- 1. PDF Handling ---
    if (fileType === 'pdf') {
        const res = await pdfParse(buffer);
        return res.text;
    }
    
    // --- 2. DOCX and PPTX Handling (Robust Parser) ---
    if (fileType === 'pptx' || fileType === 'docx') {
        try {
            const text = await officeParser.parseOfficeAsync(buffer, {
                ignoreNotes: true // Ignore speaker notes
            });
            return text;
        } catch (err) {
            console.error(`Error parsing ${fileType.toUpperCase()} ${path}:`, err.message);
            return ''; 
        }
    }
    
    // --- 3. CSV Handling ---
    if (fileType === 'csv') {
        let csvText = '';
        const stream = Readable.from(buffer);
        
        // Transform stream converts each row object into a readable text string
        const textCollector = new Transform({
            writableObjectMode: true,
            transform(chunk, encoding, callback) {
                const rowString = Object.entries(chunk).map(([key, value]) => `${key}: ${value}`).join(' | ');
                csvText += rowString + '\n';
                callback();
            }
        });
        
        await pipeline(
            stream,
            parse({
                columns: true, // Treat first row as headers
                skip_empty_lines: true
            }),
            textCollector
        );
        return csvText;
    }
    
    // --- 4. TXT (Default/Fallback) ---
    if (fileType === 'txt') {
        return buffer.toString('utf8');
    }

    // Default return for unsupported file types
    return '';
}

// ============================================================================
// MAIN INGESTION LOGIC
// ============================================================================

/**
 * Process a single file: download → extract → chunk → embed → store
 * * @param {Object} obj - Supabase file object { name, id, ... }
 */
async function ingestObject(obj) {
    // Step 1: Download file from bucket
    const buf = await fetchFile(obj.name);
        
    // Step 2: Extract text from file
    const text = await extractText(obj.name, buf);
    
    // Skip if no text was extracted
    if (!text || text.trim().length === 0) {
        console.log(`Skipped ${obj.name} (no text extracted)`);
        return;
    }
    
    // Step 3: Split text into overlapping chunks
    const chunks = chunkText(text);
    
    // Step 4: Process each chunk
    for (let idx = 0; idx < chunks.length; idx++) {
        const chunk_text = chunks[idx];
        
        // Generate embedding for this chunk
        const embedding = await embeddingService.generateEmbedding(chunk_text);
        
        // Insert chunk into document_chunks table
        const { error } = await supabase
            .from('document_chunks')
            .insert({
                document_name: obj.name, // Now just the file name
                section: null, 
                page_number: null, 
                chunk_index: idx, 
                chunk_text, 
                embedding 
            });
        
        if (error) throw error;
    }
    
    console.log(`✓ Ingested ${obj.name} (${chunks.length} chunks)`);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

(async () => {
    try {
        console.log('Starting ingestion...');
        
        // Step 1: List all files in the root of the bucket
        const { data: objects, error } = await storageClient.storage
            .from(BUCKET)
            .list('', { // <-- FIX: Passing empty string to list the root directory
                limit: 1000, 
                search: '.' 
            });
        
        if (error) throw error;
        
        // Filter out any potential directories/prefixes returned by list
        const validFiles = objects.filter(obj => 
            obj.name && obj.name.match(/\.(pdf|txt|pptx|docx|csv)$/i)
        );
        
        console.log(`Found ${validFiles.length} files to ingest`);
        
        // Step 2: Process all files CONCURRENTLY (parallel processing)
        await Promise.all(validFiles.map(obj => {
            return ingestObject(obj).catch(err => {
                // Log and ignore error for one file to allow others to continue
                console.error(`✗ Error processing ${obj.name}:`, err.message);
            });
        }));
        
        console.log('✓ Ingestion complete!');
    } catch (err) {
        console.error('Fatal error:', err.message);
        process.exit(1);
    }
})();