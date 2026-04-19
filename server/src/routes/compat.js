import { Router } from 'express';
import { pool, loadSql } from '../db.js';
import { asyncHandler, HttpError } from '../middleware/errors.js';
import { requireNonEmptyParam } from '../middleware/validate.js';

const router = Router();

// C8 — GET /api/users/:a/compatibility/:b
router.get(
  '/users/:a/compatibility/:b',
  requireNonEmptyParam('a'),
  requireNonEmptyParam('b'),
  asyncHandler(async (req, res) => {
    const { a, b } = req.params;
    if (a === b) {
      throw new HttpError(400, 'Two different usernames are required');
    }
    const { rows } = await pool.query(loadSql('c8_user_compat'), [a, b]);
    const row = rows[0];
    if (!row || row.user_a_id === null || row.user_b_id === null) {
      throw new HttpError(404, 'One or both users not found');
    }
    res.json({
      user_a: a,
      user_b: b,
      overlap: row.overlap,
      pearson: row.pearson,
      mean_abs_diff: row.mean_abs_diff,
      top_agreements: row.top_agreements,
    });
  })
);

export default router;
