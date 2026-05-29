import { Router } from "express";
import { getHabits, createHabit, logHabit, deleteHabit, updateHabit } from "./habits.controller";
import { authMiddleware } from "../../shared/middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", getHabits);
router.post("/", createHabit);
router.post("/:id/log", logHabit);
router.delete("/:id", deleteHabit);
router.patch("/:id", updateHabit);

export default router;

