import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_BODY',
          message: 'Request body validation failed',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }
    req.body = parsed.data;
    next();
  };
}

export function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_QUERY_PARAM',
          message: 'Query validation failed',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }
    (req as Request & { validatedQuery?: unknown }).validatedQuery =
      parsed.data;
    next();
  };
}
