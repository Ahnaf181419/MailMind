import type { Request, Response } from 'express';
import { getAuth } from '../config/betterAuth.js';
import { env } from '../config/env.js';

export async function authHandler(req: Request, res: Response): Promise<void> {
  try {
    const auth = getAuth();
    const fullPath = `/api/auth${req.url}`;
    const url = new URL(fullPath, env.BETTER_AUTH_URL || `http://${req.headers.host ?? 'localhost'}`);
    const headersObj: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (typeof v === 'string') headersObj[k] = v;
      else if (Array.isArray(v)) headersObj[k] = v.join(', ');
    }
    const body =
      ['GET', 'HEAD'].includes(req.method) || req.body == null
        ? undefined
        : JSON.stringify(req.body);
    const request = new Request(url.toString(), {
      method: req.method,
      headers: headersObj,
      body,
    });
    const response = await auth.handler(request);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    const text = await response.text();
    res.send(text);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_INTERNAL',
        message: 'Auth handler error',
        details: (err as Error).message,
      },
    });
  }
}
