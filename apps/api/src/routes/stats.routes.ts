import { Router } from 'express';
import { requireSession } from '../middleware/auth.js';
import { statsOverviewHandler, dashboardHandler } from '../controllers/stats.controller.js';

const router = Router();
router.use(requireSession);

router.get('/overview', statsOverviewHandler);

export const dashboardRouter = Router();
dashboardRouter.use(requireSession);
dashboardRouter.get('/', dashboardHandler);

export default router;
