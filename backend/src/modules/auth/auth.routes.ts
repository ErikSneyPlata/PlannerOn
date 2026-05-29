import { Router } from "express";
import { register, login, me, logout } from "./auth.controller";
import { authMiddleware } from "../../shared/middleware/auth.middleware";
import { authRateLimiter } from "../../shared/middleware/security.middleware";

const router = Router();

router.post("/register", authRateLimiter, register);
router.post("/login", authRateLimiter, login);
router.get("/me", authMiddleware, me);
router.post("/logout", logout);

export default router;
