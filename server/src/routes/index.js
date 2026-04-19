import { Router } from 'express';
import meta from './meta.js';
import anime from './anime.js';
import users from './users.js';
import recommend from './recommend.js';
import compat from './compat.js';
import analytics from './analytics.js';

const router = Router();

// Order matters for overlapping paths:
//   anime.js registers /anime/top BEFORE /anime/:id
//   recommend.js's /anime/:id/recommendations is a distinct exact path — no collision
//   compat.js's /users/:a/compatibility/:b has a longer path than users.js's /users/:username — distinct
router.use('/', meta);
router.use('/', anime);
router.use('/', users);
router.use('/', recommend);
router.use('/', compat);
router.use('/', analytics);

export default router;
