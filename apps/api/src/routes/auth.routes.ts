import { Router } from 'express';
import { authHandler } from '../controllers/auth.controller.js';

const router = Router();
router.all('/*', authHandler);
export default router;
