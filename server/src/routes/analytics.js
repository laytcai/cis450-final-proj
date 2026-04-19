import { Router } from 'express';
import { pool, loadSql } from '../db.js';
import { asyncHandler, HttpError } from '../middleware/errors.js';
import {
  requireNonEmptyParam,
  optionalIntQuery,
  optionalFloatQuery,
} from '../middleware/validate.js';

const router = Router();

// C9 — GET /api/genres/:name/trend
router.get(
  '/genres/:name/trend',
  requireNonEmptyParam('name'),
  optionalIntQuery('year_from', { min: 1900, max: 2100, default: 1990 }),
  optionalIntQuery('year_to', { min: 1900, max: 2100, default: new Date().getFullYear() }),
  asyncHandler(async (req, res) => {
    const { name } = req.params;
    const { year_from, year_to } = req.query;
    if (year_from > year_to) throw new HttpError(400, 'year_from must be ≤ year_to');
    const { rows } = await pool.query(loadSql('c9_genre_trend'), [name, year_from, year_to]);
    res.json({
      genre: name,
      year_from,
      year_to,
      points: rows,
    });
  })
);

// C10 — GET /api/studios/quality
router.get(
  '/studios/quality',
  optionalIntQuery('min_productions', { min: 1, max: 1000, default: 5 }),
  optionalFloatQuery('score_floor', { min: 0, max: 10, default: 7 }),
  asyncHandler(async (req, res) => {
    const { min_productions, score_floor } = req.query;
    const { rows } = await pool.query(loadSql('c10_quality_studios'), [
      min_productions,
      score_floor,
    ]);
    res.json({
      min_productions,
      score_floor,
      results: rows,
    });
  })
);

export default router;
