import { Router } from 'express';
import { requireSession } from '../middleware/auth.js';
import { getSettings, patchSettings } from '../controllers/settings.controller.js';

const router = Router();
router.use(requireSession);
router.get('/', getSettings);
router.patch('/', patchSettings);

export default router;
