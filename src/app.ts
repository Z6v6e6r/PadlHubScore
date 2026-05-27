import cors from 'cors';
import express from 'express';
import pino from 'pino';
import { ZodError } from 'zod';
import { healthRouter } from './routes/health.js';
import { streamRouter } from './routes/stream.js';
import { adminRouter } from './routes/admin.js';
import { refereeRouter } from './routes/referee.js';
import { publicRouter } from './routes/public.js';
import { BadRequestError, ForbiddenError, NotFoundError, VersionConflictError } from './services/errors.js';

const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
});

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use((req, _res, next) => {
    logger.info({ method: req.method, path: req.path }, 'incoming request');
    next();
  });

  app.use('/api', healthRouter);
  app.use('/api/stream', streamRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/referee', refereeRouter);
  app.use('/api/public', publicRouter);

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof ZodError) {
      res.status(400).json({ message: 'Validation error', details: err.flatten() });
      return;
    }

    if (err instanceof NotFoundError) {
      res.status(404).json({ message: err.message });
      return;
    }

    if (err instanceof ForbiddenError) {
      res.status(403).json({ message: err.message });
      return;
    }

    if (err instanceof VersionConflictError) {
      res.status(409).json({ message: err.message });
      return;
    }

    if (err instanceof BadRequestError) {
      res.status(400).json({ message: err.message });
      return;
    }

    logger.error({ err }, 'Unhandled API error');
    res.status(500).json({ message: 'Internal server error' });
  });

  return app;
}
