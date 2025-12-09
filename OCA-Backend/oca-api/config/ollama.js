/**
 * Ollama Configuration Module
 * 
 * This module configures the Ollama client for interacting with LLM models.
 * It supports both local and cloud Ollama instances.
 * 
 * Local Ollama:
 * - Runs on your machine at http://localhost:11434
 * - Requires Ollama to be installed and running locally
 * - No API key needed
 * - All processing happens on your machine (privacy)
 * 
 * Cloud Ollama:
 * - Uses Ollama's cloud API at https://ollama.com
 * - Requires API key for authentication
 * - Processing happens on Ollama's servers
 * - Requires internet connection
 * 
 * Configuration is determined by the OLLAMA_HOST environment variable.
 * 
 * @module config/ollama
 */

const { Ollama } = require('ollama');

// ============================================================================
// CONFIGURATION DETECTION
// ============================================================================

// Get the Ollama host from environment variables
// Default to localhost if not specified
const host = process.env.OLLAMA_HOST || 'http://localhost:11434';

// Determine if we're using cloud Ollama
// Cloud Ollama uses https://ollama.com or any https:// URL
// Local Ollama uses http://localhost:11434
const isCloud = host.includes('ollama.com') || host.startsWith('https://');

// ============================================================================
// BUILD OLLAMA CONFIGURATION
// ============================================================================

// Start with basic configuration
const ollamaConfig = {
  host: host  // The URL where Ollama is running
};

// Add API key header if using cloud Ollama
// Cloud Ollama requires authentication via Bearer token
if (isCloud && process.env.OLLAMA_API_KEY) {
  ollamaConfig.headers = {
    // Format: "Bearer <api_key>"
    // This is the standard way to send API keys in HTTP headers
    Authorization: 'Bearer ' + process.env.OLLAMA_API_KEY
  };
}

// ============================================================================
// CREATE OLLAMA CLIENT
// ============================================================================

// Create and configure the Ollama client instance
// This client will be used throughout the application to interact with LLM models
const ollama = new Ollama(ollamaConfig);

// ============================================================================
// LOGGING (for debugging)
// ============================================================================

// Log which mode we're using (helpful when starting the server)
if (isCloud) {
  console.log('[Ollama] Using cloud Ollama at', host);
} else {
  console.log('[Ollama] Using local Ollama at', host);
}

// ============================================================================
// EXPORT
// ============================================================================

// Export the configured Ollama client
// Other modules can import this to use Ollama
module.exports = ollama;

