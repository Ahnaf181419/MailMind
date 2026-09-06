import { Router } from 'express';
import { requireSession } from '../middleware/auth.js';
import {
  listThreadsHandler,
  followUpHandler,
  otherHandler,
  threadDetailHandler,
  listThreadsValidator,
} from '../controllers/threads.controller.js';
import {
  patchReadHandler,
  patchStatusHandler,
  patchSnoozeHandler,
  patchReclassifyHandler,
  postDraftReplyHandler,
  patchDraftHandler,
} from '../controllers/threadActions.controller.js';

const router = Router();

router.use(requireSession);

router.get('/', listThreadsValidator, listThreadsHandler);
router.get('/follow-up', followUpHandler);
router.get('/other', otherHandler);
router.get('/:id', threadDetailHandler);

router.patch('/:id/read', patchReadHandler);
router.patch('/:id/status', patchStatusHandler);
router.patch('/:id/snooze', patchSnoozeHandler);
router.patch('/:id/reclassify', patchReclassifyHandler);
router.post('/:id/draft-reply', postDraftReplyHandler);
router.patch('/:id/draft', patchDraftHandler);

export default router;
