import type { Request, Response, NextFunction } from 'express';

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  const e = err as Error;
  // Log full error server-side; never leak stack traces in production responses
  // eslint-disable-next-line no-console
  console.error('UNHANDLED', e?.stack ?? e);

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL',
      message:
        process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : e?.message ?? 'Internal server error',
    },
  });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  });
}
