import express from 'express';
import { logger } from '../utils/logger';
import { db } from '../config/database';

const router = express.Router();

/**
 * GET /api/fixes/:id
 * Get a specific fix
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const fix = await db('fixes')
      .where('id', id)
      .first();

    if (!fix) {
      return res.status(404).json({
        error: 'Fix not found',
      });
    }

    res.json({ fix });

  } catch (error) {
    logger.error('Failed to get fix:', error);
    res.status(500).json({
      error: 'Failed to get fix',
      message: error.message,
    });
  }
});

/**
 * POST /api/fixes/:id/implement
 * Mark a fix as implemented
 */
router.post('/:id/implement', async (req, res) => {
  try {
    const { id } = req.params;
    const { clientId, notes } = req.body;

    // Check if fix exists
    const fix = await db('fixes').where('id', id).first();
    if (!fix) {
      return res.status(404).json({
        error: 'Fix not found',
      });
    }

    // Check if already implemented
    const existingImplementation = await db('implementations')
      .where('client_id', clientId)
      .where('fix_id', id)
      .first();

    if (existingImplementation) {
      return res.status(409).json({
        error: 'Fix already marked as implemented',
      });
    }

    // Mark fix as implemented
    await db('fixes')
      .where('id', id)
      .update({ implemented: true });

    // Create implementation record
    await db('implementations').insert({
      client_id: clientId,
      fix_id: id,
      notes,
    });

    logger.info('Fix marked as implemented:', { fixId: id, clientId });

    res.json({
      message: 'Fix marked as implemented successfully',
    });

  } catch (error) {
    logger.error('Failed to mark fix as implemented:', error);
    res.status(500).json({
      error: 'Failed to mark fix as implemented',
      message: error.message,
    });
  }
});

/**
 * GET /api/fixes/client/:clientId
 * Get all fixes for a client
 */
router.get('/client/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { implemented, category, severity } = req.query;

    let query = db('fixes')
      .join('analyses', 'fixes.analysis_id', 'analyses.id')
      .where('analyses.client_id', clientId)
      .select('fixes.*', 'analyses.url');

    // Apply filters
    if (implemented !== undefined) {
      query = query.where('fixes.implemented', implemented === 'true');
    }

    if (category) {
      query = query.where('fixes.category', category);
    }

    if (severity) {
      query = query.where('fixes.severity', severity);
    }

    const fixes = await query.orderBy('fixes.created_at', 'desc');

    res.json({ fixes });

  } catch (error) {
    logger.error('Failed to get client fixes:', error);
    res.status(500).json({
      error: 'Failed to get fixes',
      message: error.message,
    });
  }
});

export default router;
