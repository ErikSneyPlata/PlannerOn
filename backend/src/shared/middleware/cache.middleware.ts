// backend/src/shared/middleware/cache.middleware.ts
import { Response, NextFunction } from "express";
import { appCache } from "../utils/cache";

/**
 * Middleware that wraps res.json to automatically invalidate a user's stats/data cache
 * when they make any mutating request (POST, PUT, PATCH, DELETE) that completes successfully.
 */
export const cacheInvalidatorMiddleware = (req: any, res: Response, next: NextFunction) => {
  const originalJson = res.json;

  res.json = function (body: any) {
    // Only invalidate if user is authenticated and this is a mutating request returning success
    if (req.userId && ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        appCache.invalidateUserCache(req.userId);
      }
    }
    return originalJson.call(this, body);
  };

  next();
};
