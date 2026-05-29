import { Router } from "express";
import { getEvents, createEvent, deleteEvent, updateEvent } from "./agenda.controller";
import { authMiddleware } from "../../shared/middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", getEvents);
router.post("/", createEvent);
router.patch("/:id", updateEvent);
router.delete("/:id", deleteEvent);

export default router;
