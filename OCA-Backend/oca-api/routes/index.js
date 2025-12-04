/**
 * Index Route - Health Check
 * 
 * This route provides a simple health check endpoint to verify the API is running.
 * It returns basic information about the API and available endpoints.
 * 
 * @module routes/index
 */

const express = require('express');
const router = express.Router();

/**
 * GET /
 * 
 * API health check endpoint
 * 
 * Returns basic API information and available endpoints.
 * Useful for:
 * - Verifying the server is running
 * - Discovering available API endpoints
 * - Health checks in deployment environments
 * 
 * Response:
 *   {
 *     "message": "OCA API is running",
 *     "version": "1.0.0",
 *     "endpoints": {
 *       "chat": "/api/chat",
 *       "search": "/api/search",
 *       "interactions": "/api/interactions",
 *       "sessions": "/api/sessions"
 *     }
 *   }
 * 
 * Example:
 *   GET http://localhost:3001/
 * 
 *   Response:
 *   {
 *     "message": "OCA API is running",
 *     "version": "1.0.0",
 *     "endpoints": { ... }
 *   }
 */
router.get('/', (req, res) => {
  res.json({
    message: 'OCA API is running',
    version: '1.0.0',
    endpoints: {
      chat: '/api/chat',
      search: '/api/search',
      interactions: '/api/interactions',
      sessions: '/api/sessions'
    }
  });
});

module.exports = router;
