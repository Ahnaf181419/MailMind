import { Router } from 'express';
import { dbConnectionState } from '../config/db.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    success: true,
    data: { status: 'ok', db: dbConnectionState() },
  });
});

export default router;
