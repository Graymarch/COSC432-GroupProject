/**
 * OCA Backend - Main Express Application
 * 
 * This is the entry point for the OCA (On-Demand Interactive Course Assistant) API.
 * It sets up the Express server, configures middleware, and registers all API routes.
 * 
 * Architecture:
 * - Express.js framework for handling HTTP requests
 * - Middleware for CORS, logging, and JSON parsing
 * - Route handlers for different API endpoints
 * - Error handling for graceful failure
 * 
 * @module app
 */

const dotenv = require('dotenv');
const createError = require('http-errors');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

// Load environment variables from .env file
// This allows us to configure the app without hardcoding values
dotenv.config();

// ============================================================================
// ROUTE IMPORTS
// ============================================================================

// Import all route handlers
// Each route file handles a specific set of API endpoints
const indexRouter = require('./routes/index');           // Health check endpoint
const chatRouter = require('./routes/chat');              // Tutoring mode chat
const searchRouter = require('./routes/search');          // Info access mode search
const interactionsRouter = require('./routes/interactions'); // Interaction history
const sessionsRouter = require('./routes/sessions');      // Session management

// ============================================================================
// EXPRESS APP SETUP
// ============================================================================

// Create Express application instance
const app = express();

// ============================================================================
// MIDDLEWARE CONFIGURATION
// ============================================================================

// CORS (Cross-Origin Resource Sharing)
// Allows frontend (React app) to make requests from different origin/port
app.use(cors());

// HTTP request logger
// Logs all incoming requests to console (useful for debugging)
// 'dev' format shows: method, url, status, response time
app.use(morgan('dev'));

// JSON body parser
// Automatically parses JSON request bodies and makes them available in req.body
app.use(express.json());

// URL-encoded body parser
// Parses form data (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: false }));

// ============================================================================
// ROUTE REGISTRATION
// ============================================================================

// Register route handlers
// Each app.use() maps a URL path to a router
app.use('/', indexRouter);                    // GET / - Health check
app.use('/api/chat', chatRouter);             // POST /api/chat - Tutoring mode
app.use('/api/search', searchRouter);         // POST /api/search - Info access mode
app.use('/api/interactions', interactionsRouter); // GET /api/interactions - History
app.use('/api/sessions', sessionsRouter);     // POST/GET /api/sessions - Sessions

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 Handler - catches all requests that don't match any route
// This must be after all route registrations
app.use((req, res, next) => {
  // Create a 404 error and pass it to the error handler
  next(createError(404, 'Route not found'));
});

// Global Error Handler - handles all errors in the application
// This is the last middleware and catches any errors from routes
app.use((err, req, res, next) => {
  // Set HTTP status code (default to 500 if not set)
  const status = err.status || 500;
  
  // Send JSON error response
  res.status(status).json({
    error: err.message || 'Internal server error',
    // Only include stack trace in development mode (for debugging)
    // Never expose stack traces in production (security risk)
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================================================
// EXPORT
// ============================================================================

// Export the Express app so it can be used by the server (bin/www)
module.exports = app;
