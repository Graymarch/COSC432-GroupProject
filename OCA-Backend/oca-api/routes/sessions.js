const express = require('express');
const router = express.Router();
const supabase = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * POST /api/sessions
 * Create a new session
 */
router.post('/', async (req, res, next) => {
  try {
    if (!supabase) {
      return res.status(503).json({
        error: 'Session management is unavailable until Supabase is configured.'
      });
    }

    const { studentId, mode } = req.body;

    if (!studentId || !mode) {
      return res.status(400).json({
        error: 'Missing required fields: studentId and mode are required'
      });
    }

    if (!['tutoring', 'info_access'].includes(mode)) {
      return res.status(400).json({
        error: 'Invalid mode. Must be "tutoring" or "info_access"'
      });
    }

    const sessionData = {
      id: uuidv4(),
      student_id: studentId,
      mode,
      created_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
      context: {}
    };

    const { data, error } = await supabase
      .from('sessions')
      .insert(sessionData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sessions/student/:studentId
 * Get all sessions for a student
 * NOTE: This route must come before /:sessionId to avoid route conflicts
 */
router.get('/student/:studentId', async (req, res, next) => {
  try {
    if (!supabase) {
      return res.status(503).json({
        error: 'Session history is unavailable until Supabase is configured.'
      });
    }

    const { studentId } = req.params;

    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json(data || []);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sessions/:sessionId
 * Get session details
 */
router.get('/:sessionId', async (req, res, next) => {
  try {
    if (!supabase) {
      return res.status(503).json({
        error: 'Session details are unavailable until Supabase is configured.'
      });
    }

    const { sessionId } = req.params;

    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get message count for this session
    const { count } = await supabase
      .from('interactions')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId);

    res.json({
      ...data,
      messageCount: count || 0
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/sessions/:sessionId
 * Update session (e.g., update last_activity)
 */
router.patch('/:sessionId', async (req, res, next) => {
  try {
    if (!supabase) {
      return res.status(503).json({
        error: 'Session management is unavailable until Supabase is configured.'
      });
    }

    const { sessionId } = req.params;
    const updates = req.body;

    // Only allow updating certain fields
    const allowedUpdates = ['last_activity', 'context', 'mode'];
    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key];
        return obj;
      }, {});

    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({
        error: 'No valid fields to update'
      });
    }

    const { data, error } = await supabase
      .from('sessions')
      .update(filteredUpdates)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

