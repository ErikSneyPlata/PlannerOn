// backend/src/shared/middleware/security.middleware.ts
import { Request, Response, NextFunction } from "express";

// Memory storage for rate limiting
const ipRequests = new Map<string, { count: number; resetTime: number }>();
const authRequests = new Map<string, { count: number; resetTime: number }>();

/**
 * Custom lightweight rate limiting to protect endpoints against brute force, DDoS, and scraping.
 * Default: Max 120 requests per minute window.
 */
export const rateLimiterMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Try to grab real IP behind proxies as well
  const ip = (req.headers["x-forwarded-for"] as string) || req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxRequests = 120;

  let record = ipRequests.get(ip);

  // If no record exists or window expired, reset rate limit entry
  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + windowMs };
    ipRequests.set(ip, record);
    return next();
  }

  record.count++;

  if (record.count > maxRequests) {
    console.warn(`[ANTI-HACKER] Rate limit exceeded by IP: ${ip} targeting ${req.method} ${req.path}`);
    return res.status(429).json({
      error: "Too Many Requests / Demasiadas Peticiones",
      message: "Has excedido el límite de seguridad de peticiones por minuto. Por favor, disminuye la velocidad o espera antes de continuar."
    });
  }

  next();
};

/**
 * Strict Rate Limiter specifically for Authentication routes (/login and /register).
 * Max 5 attempts per 2-minute window per IP.
 */
export const authRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const ip = (req.headers["x-forwarded-for"] as string) || req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const windowMs = 2 * 60 * 1000; // 2 minutes
  const maxAttempts = 5;

  let record = authRequests.get(ip);

  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + windowMs };
    authRequests.set(ip, record);
    return next();
  }

  record.count++;

  if (record.count > maxAttempts) {
    const timeLeft = Math.ceil((record.resetTime - now) / 1000);
    console.warn(`[ANTI-BRUTE] Auth Rate limit exceeded by IP: ${ip} targeting auth endpoints.`);
    return res.status(429).json({
      error: `Has realizado demasiados intentos de autenticación. Por razones de seguridad, espera ${timeLeft} segundos antes de volver a intentarlo.`
    });
  }

  next();
};

/**
 * Custom Security Headers to mitigate cross-site scripting (XSS), clickjacking, 
 * MIME-sniffing, and other web security threats.
 */
export const securityHeadersMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Prevent clickjacking by restricting framing
  res.setHeader("X-Frame-Options", "SAMEORIGIN");

  // Prevent browsers from sniffing MIME-types away from declared Content-Type
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Enable XSS filtering in legacy browsers (will block page if attack detected)
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Restrict information passed in the Referer header
  res.setHeader("Referrer-Policy", "same-origin");

  // Prevent IE from auto-executing downloads in site's context
  res.setHeader("X-Download-Options", "noopen");

  // Turn off DNS prefetching for privacy
  res.setHeader("X-DNS-Prefetch-Control", "off");

  // Restrict browser feature usage via Permissions-Policy
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  next();
};
