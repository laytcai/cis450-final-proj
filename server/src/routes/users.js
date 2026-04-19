import { Router } from 'express';
import { pool, loadSql } from '../db.js';
import { asyncHandler, HttpError } from '../middleware/errors.js';
import { requireNonEmptyParam, optionalIntQuery } from '../middleware/validate.js';

const router = Router();

const topLimit = optionalIntQuery('top', { min: 1, max: 50, default: 5 });

// S5 (+ S5b) — GET /api/users/:username
router.get(
  '/users/:username',
  requireNonEmptyParam('username'),
  topLimit,
  asyncHandler(async (req, res) => {
    const { username } = req.params;
    const { top } = req.query;
    const { rows: profileRows } = await pool.query(loadSql('s5_user_profile'), [username]);
    if (profileRows.length === 0) {
      throw new HttpError(404, `User "${username}" not found`);
    }
    const { rows: topRows } = await pool.query(loadSql('s5b_user_top_anime'), [username, top]);
    res.json({ profile: profileRows[0], top_anime: topRows });
  })
);

export default router;
