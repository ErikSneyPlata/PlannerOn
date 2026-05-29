import { Router } from "express";
import { getDashboardStats } from "./stats.controller";
import { authMiddleware } from "../../shared/middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/dashboard", getDashboardStats);

export default router;
