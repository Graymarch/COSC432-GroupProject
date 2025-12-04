/**
 * Supabase Database Configuration Module
 * 
 * This module configures the Supabase client for database operations.
 * Supabase is used for:
 * - Storing conversation history (interactions)
 * - Managing sessions
 * - Storing course material chunks with embeddings (RAG)
 * - Vector similarity search
 * 
 * The backend can work without Supabase (basic chat mode), but features like:
 * - Conversation history
 * - RAG (course material context)
 * - Session management
 * - Interaction archiving
 * 
 * ...will be disabled until Supabase is configured.
 * 
 * @module config/database
 */

const { createClient } = require('@supabase/supabase-js');

// ============================================================================
// SUPABASE CLIENT INITIALIZATION
// ============================================================================

// Initialize as null - will be set if credentials are provided
let supabase = null;

// Check if Supabase environment variables are configured
// We need both URL and service role key to connect
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  // Create Supabase client with credentials
  // SUPABASE_URL: Your project URL (e.g., https://xxxxx.supabase.co)
  // SUPABASE_SERVICE_ROLE_KEY: Service role key (has admin privileges)
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  // Note: Service role key bypasses Row Level Security (RLS)
  // This is safe for backend use, but NEVER expose it in frontend code
} else {
  // Supabase not configured - log warning but don't crash
  // The app will work in "basic mode" without Supabase features
  console.warn(
    '[Supabase] Environment variables not found. Features depending on Supabase are disabled until configured.'
  );
}

// ============================================================================
// EXPORT
// ============================================================================

// Export the Supabase client (or null if not configured)
// Other modules check if supabase is null before using it
module.exports = supabase;

