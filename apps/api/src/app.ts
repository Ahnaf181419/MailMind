import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import { requestId, requireSession } from './middleware/auth.js';
import { globalRateLimit } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import threadRoutes from './routes/threads.routes.js';
import statsRoutes, { dashboardRouter } from './routes/stats.routes.js';
import digestRoutes from './routes/digest.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import syncRoutes from './routes/sync.routes.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(requestId);
  app.use(globalRateLimit);

  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);

  app.use('/api/threads', threadRoutes);
  app.use('/api/stats', statsRoutes);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/digest', digestRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/sync', syncRoutes);

  app.get('/api/me', requireSession, (req, res) => {
    res.json({
      success: true,
      data: { user: req.user },
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
