// backend/src/modules/focus/focus.routes.ts
import { Router } from 'express';
import {
  getFocusSessions,
  createFocusSession,
  completeFocusSession,
  deleteFocusSession,
} from './focus.controller';
import { authMiddleware } from "../../shared/middleware/auth.middleware";

const router = Router();
router.use(authMiddleware);

router.get(   '/',              getFocusSessions);
router.post(  '/',              createFocusSession);
router.patch( '/:id/complete',  completeFocusSession);
router.delete('/:id',           deleteFocusSession);

export default router;
