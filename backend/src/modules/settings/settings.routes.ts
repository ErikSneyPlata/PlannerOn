// backend/src/modules/settings/settings.routes.ts

import { Router } from "express";

import {
    getSettings,
    updateSettings,
    getProfile,
    updateProfile,
    deleteAccount,
} from "./settings.controller";

import { authMiddleware } from "../../shared/middleware/auth.middleware";

const router = Router();

// ======================================================
// SETTINGS
// ======================================================

router.get("/", authMiddleware, getSettings);

router.patch(
    "/",
    authMiddleware,
    updateSettings
);

// ======================================================
// PROFILE
// ======================================================

router.get(
    "/profile",
    authMiddleware,
    getProfile
);

router.patch(
    "/profile",
    authMiddleware,
    updateProfile
);

// ======================================================
// ACCOUNT
// ======================================================

router.delete(
    "/account",
    authMiddleware,
    deleteAccount
);

export default router;