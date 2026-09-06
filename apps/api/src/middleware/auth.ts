import type { Request, Response, NextFunction } from 'express';
import { getAuth } from '../config/betterAuth.js';

export interface AuthedUser {
  id: string;
  email: string;
  name: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthedUser;
      requestId?: string;
    }
  }
}

export async function requireSession(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = getAuth();
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (typeof v === 'string') headers.set(k, v);
      else if (Array.isArray(v)) headers.set(k, v.join(', '));
    }
    const session = await auth.api.getSession({ headers });
    if (!session?.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHENTICATED', message: 'Authentication required' },
      });
      return;
    }
    req.user = {
      id: String(session.user.id),
      email: session.user.email,
      name: session.user.name ?? session.user.email,
    };
    next();
  } catch (err) {
    next(err);
  }
}

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id =
    (req.headers['x-request-id'] as string | undefined) ??
    `req_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
  req.requestId = id;
  res.setHeader('x-request-id', id);
  next();
}
