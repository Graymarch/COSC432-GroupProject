#!/usr/bin/env node

/**
 * Document Processing Script
 * 
 * This script processes course material documents and stores them in Supabase
 * for RAG (Retrieval Augmented Generation).
 * 
 * Usage:
 *   node scripts/processDocuments.js <directory-or-file>
 * 
 * Examples:
 *   node scripts/processDocuments.js ./course-materials
 *   node scripts/processDocuments.js ./course-materials/chapter1.pdf
 * 
 * @module scripts/processDocuments
 */

require('dotenv').config();
const documentService = require('../services/documentService');
const path = require('path');
const fs = require('fs').promises;

async function main() {
  try {
    // Get file/directory path from command line
    const filePath = process.argv[2];

    if (!filePath) {
      console.error('❌ Error: Please provide a file or directory path');
      console.log('\nUsage:');
      console.log('  node scripts/processDocuments.js <file-or-directory>');
      console.log('\nExamples:');
      console.log('  node scripts/processDocuments.js ./course-materials');
      console.log('  node scripts/processDocuments.js ./course-materials/chapter1.pdf');
      process.exit(1);
    }

    // Check if path exists
    try {
      const stats = await fs.stat(filePath);
      const isDirectory = stats.isDirectory();
      const isFile = stats.isFile();

      if (!isDirectory && !isFile) {
        throw new Error('Path is neither a file nor directory');
      }

      console.log('🚀 OCA Document Processing');
      console.log('='.repeat(50));
      console.log(`📁 Path: ${filePath}`);
      console.log(`📋 Type: ${isDirectory ? 'Directory' : 'File'}`);
      console.log('');

      // Check Supabase configuration
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('❌ Error: Supabase not configured');
        console.log('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env file');
        process.exit(1);
      }

      console.log('✅ Supabase configured');
      console.log('');

      let results;

      if (isDirectory) {
        // Process directory
        console.log('📂 Processing directory...');
        results = await documentService.processDirectory(filePath, {
          chunkSize: 1000,
          overlap: 200
        });
      } else {
        // Process single file
        console.log('📄 Processing file...');
        const chunks = await documentService.processDocument(filePath, {
          chunkSize: 1000,
          overlap: 200
        });
        
        // Store chunks
        const ragService = require('../services/ragService');
        const storedChunks = await ragService.storeDocumentChunks(chunks);
        
        results = {
          processed: 1,
          failed: 0,
          totalChunks: storedChunks.length,
          errors: []
        };
      }

      // Print results
      console.log('');
      console.log('='.repeat(50));
      console.log('📊 Processing Results');
      console.log('='.repeat(50));
      console.log(`✅ Processed: ${results.processed} document(s)`);
      console.log(`❌ Failed: ${results.failed} document(s)`);
      console.log(`📦 Total chunks stored: ${results.totalChunks}`);

      if (results.errors.length > 0) {
        console.log('\n⚠️  Errors:');
        results.errors.forEach(({ file, error }) => {
          console.log(`   ${file}: ${error}`);
        });
      }

      console.log('');
      console.log('✅ Document processing complete!');
      console.log('You can now use RAG to retrieve course materials.');
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.error(`❌ Error: Path not found: ${filePath}`);
        process.exit(1);
      }
      throw error;
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack && process.env.NODE_ENV === 'development') {
      console.error('\nStack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the script
main();

