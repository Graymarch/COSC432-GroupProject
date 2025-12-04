const express = require('express');
const router = express.Router();
const supabase = require('../config/database');

/**
 * GET /api/interactions
 * Retrieve archived interactions for a student
 */
router.get('/', async (req, res, next) => {
  try {
    if (!supabase) {
      return res.status(503).json({
        error: 'Interaction history is unavailable until Supabase is configured.'
      });
    }

    const { studentId, sessionId, limit = 50, offset = 0 } = req.query;

    if (!studentId) {
      return res.status(400).json({
        error: 'Missing required parameter: studentId'
      });
    }

    let query = supabase
      .from('interactions')
      .select('*')
      .eq('student_id', studentId)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    // Get total count
    const { count: totalCount } = await supabase
      .from('interactions')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId);

    res.json({
      interactions: data || [],
      total: totalCount || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/interactions/:id
 * Get a specific interaction by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    if (!supabase) {
      return res.status(503).json({
        error: 'Interaction history is unavailable until Supabase is configured.'
      });
    }

    const { id } = req.params;

    const { data, error } = await supabase
      .from('interactions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      return res.status(404).json({ error: 'Interaction not found' });
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

