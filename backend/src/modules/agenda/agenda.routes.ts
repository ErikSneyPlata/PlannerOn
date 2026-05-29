import { Router } from "express";
import { getEvents, createEvent, deleteEvent } from "./agenda.controller";
import { authMiddleware } from "../../shared/middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", getEvents);
router.post("/", createEvent);
router.delete("/:id", deleteEvent);

export default router;
