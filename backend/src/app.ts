// app.ts
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

// Routes imports
import authRoutes from "./modules/auth/auth.routes";
import taskRoutes from "./modules/tasks/tasks.routes";
import projectRoutes from "./modules/projects/projects.routes";
import financeRoutes from "./modules/finance/finance.routes";
import habitRoutes from "./modules/habits/habits.routes";
import agendaRoutes from "./modules/agenda/agenda.routes";
import statsRoutes from "./modules/stats/stats.routes";
import notesRoutes from "./modules/notes/notes.routes";
import focusRoutes from "./modules/focus/focus.routes";
import settingsRoutes from "./modules/settings/settings.routes";

import path from "path";
import fs from "fs";
import documentationRoutes from "./modules/documentation/documentation.routes";
import { cacheInvalidatorMiddleware } from "./shared/middleware/cache.middleware";
import { rateLimiterMiddleware, securityHeadersMiddleware } from "./shared/middleware/security.middleware";

dotenv.config();

const app = express();

// Apply security headers & request rate protections globally
app.use(securityHeadersMiddleware);
app.use(rateLimiterMiddleware);

// Middleware
app.use((req, res, next) => {
  console.log(`[BACKEND] ${req.method} ${req.path}`);
  next();
});
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(cacheInvalidatorMiddleware); // Auto-clear user statistics cache on successful mutative operations

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/habits", habitRoutes);
app.use("/api/agenda", agendaRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/focus", focusRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/documentation", documentationRoutes);

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", engine: "PlannerOn Backend" });
});



app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
  });
});

export default app;
