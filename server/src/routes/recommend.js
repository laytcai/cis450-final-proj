import { Router } from 'express';
import { pool, loadSql } from '../db.js';
import { asyncHandler } from '../middleware/errors.js';
import { requireIntParam, optionalIntQuery, clampLimit } from '../middleware/validate.js';

const router = Router();

// C7 — GET /api/anime/:id/recommendations
router.get(
  '/anime/:id/recommendations',
  requireIntParam('id'),
  optionalIntQuery('min_co_viewers', { min: 1, max: 10_000, default: 10 }),
  clampLimit,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { min_co_viewers, limit } = req.query;
    const { rows } = await pool.query(loadSql('c7_recommendations'), [id, min_co_viewers, limit]);
    res.json({
      anime_id: id,
      params: { min_co_viewers, limit },
      results: rows,
    });
  })
);

export default router;
