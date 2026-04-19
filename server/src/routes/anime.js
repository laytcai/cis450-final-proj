import { Router } from 'express';
import { pool, loadSql } from '../db.js';
import { asyncHandler, HttpError } from '../middleware/errors.js';
import {
  requireIntParam,
  optionalIntQuery,
  optionalFloatQuery,
  optionalStringQuery,
  clampLimit,
  clampOffset,
} from '../middleware/validate.js';

const router = Router();

// Escape %, _, and \ so user input doesn't act as ILIKE wildcards.
function escapeLike(s) {
  if (s === undefined || s === null) return null;
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

// S2 — GET /api/anime (search + filter)
router.get(
  '/anime',
  optionalStringQuery('q', { maxLength: 100 }),
  optionalStringQuery('genre', { maxLength: 100 }),
  optionalStringQuery('type', { maxLength: 50 }),
  optionalIntQuery('year_from', { min: 1900, max: 2100 }),
  optionalIntQuery('year_to', { min: 1900, max: 2100 }),
  optionalFloatQuery('min_score', { min: 0, max: 10 }),
  clampLimit,
  clampOffset,
  asyncHandler(async (req, res) => {
    const { q, genre, type, year_from, year_to, min_score, limit, offset } = req.query;
    if (year_from !== undefined && year_to !== undefined && year_from > year_to) {
      throw new HttpError(400, 'year_from must be ≤ year_to');
    }
    const params = [
      q ? escapeLike(q) : null,
      genre || null,
      type || null,
      year_from ?? null,
      year_to ?? null,
      min_score ?? null,
      limit,
      offset,
    ];
    const { rows } = await pool.query(loadSql('s2_search_anime'), params);
    const total = rows[0]?.total_count ?? 0;
    res.json({
      total,
      limit,
      offset,
      results: rows.map(({ total_count, ...rest }) => rest),
    });
  })
);

// S4 — GET /api/anime/top (must be registered BEFORE /anime/:id so Express matches it first)
router.get(
  '/anime/top',
  optionalStringQuery('type', { maxLength: 50 }),
  optionalIntQuery('min_scored_by', { min: 0, max: 10_000_000, default: 1000 }),
  clampLimit,
  asyncHandler(async (req, res) => {
    const { type, min_scored_by, limit } = req.query;
    const { rows } = await pool.query(loadSql('s4_top_anime'), [
      type || null,
      min_scored_by,
      limit,
    ]);
    res.json({ results: rows });
  })
);

// S1 — GET /api/anime/:id
router.get(
  '/anime/:id',
  requireIntParam('id'),
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(loadSql('s1_anime_by_id'), [req.params.id]);
    if (rows.length === 0) throw new HttpError(404, `Anime ${req.params.id} not found`);
    res.json(rows[0]);
  })
);

// S6 — GET /api/anime/:id/stats
router.get(
  '/anime/:id/stats',
  requireIntParam('id'),
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(loadSql('s6_anime_score_histogram'), [req.params.id]);
    const total = rows.reduce((sum, r) => sum + r.n, 0);
    res.json({ anime_id: req.params.id, total_ratings: total, histogram: rows });
  })
);

export default router;
