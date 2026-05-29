// backend/src/modules/notes/notes.routes.ts
import { Router } from 'express';
import { getNotes, createNote, updateNote, deleteNote } from './notes.controller';
import { authMiddleware } from "../../shared/middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get(   '/',    getNotes);
router.post(  '/',    createNote);
router.patch( '/:id', updateNote);
router.delete('/:id', deleteNote);

export default router;