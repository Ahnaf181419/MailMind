import type { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

export const globalRateLimit = rateLimit({
  windowMs: 60_000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests' },
  },
});

export const syncRateLimit = rateLimit({
  windowMs: 60_000,
  max: 10,
  keyGenerator: (req: Request) => {
    return (req as Request & { user?: { id?: string } }).user?.id ?? req.ip ?? 'anon';
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many sync requests' },
  },
});

export const llmRateLimit = rateLimit({
  windowMs: 60_000,
  max: 20,
  keyGenerator: (req: Request) => {
    return (req as Request & { user?: { id?: string } }).user?.id ?? req.ip ?? 'anon';
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many LLM requests' },
  },
});
