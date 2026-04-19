import { Router } from 'express';
import { pool, loadSql, pingDb } from '../db.js';
import { asyncHandler } from '../middleware/errors.js';

const router = Router();

router.get(
  '/health',
  asyncHandler(async (_req, res) => {
    let db = 'unreachable';
    let dbError;
    try {
      db = (await pingDb()) ? 'connected' : 'unreachable';
    } catch (err) {
      dbError = err.message;
    }
    res.json({
      ok: true,
      db,
      ...(dbError && { dbError }),
      timestamp: new Date().toISOString(),
    });
  })
);

// Cached dropdown options — refreshed every 5 min.
let optionsCache = { data: null, at: 0 };
const OPTIONS_TTL_MS = 5 * 60 * 1000;

router.get(
  '/options',
  asyncHandler(async (_req, res) => {
    const now = Date.now();
    if (optionsCache.data && now - optionsCache.at < OPTIONS_TTL_MS) {
      return res.json({ ...optionsCache.data, cached: true });
    }
    const { rows } = await pool.query(loadSql('meta_options'));
    optionsCache = { data: rows[0] || {}, at: now };
    res.json({ ...optionsCache.data, cached: false });
  })
);

router.get(
  '/genres',
  asyncHandler(async (_req, res) => {
    const { rows } = await pool.query(loadSql('s3_list_genres'));
    res.json({ genres: rows });
  })
);

export default router;
