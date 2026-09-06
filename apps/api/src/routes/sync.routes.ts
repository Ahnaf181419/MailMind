import { Router } from 'express';
import { requireSession } from '../middleware/auth.js';
import { syncRateLimit } from '../middleware/rateLimiter.js';
import { syncMockHandler } from '../controllers/sync.controller.js';

const router = Router();
router.use(requireSession, syncRateLimit);
router.post('/mock', syncMockHandler);

export default router;
