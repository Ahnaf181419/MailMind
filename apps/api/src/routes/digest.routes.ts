import { Router } from 'express';
import { requireSession } from '../middleware/auth.js';
import { digestHandler } from '../controllers/digest.controller.js';

const router = Router();
router.use(requireSession);
router.get('/', digestHandler);

export default router;
