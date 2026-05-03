import express from 'express';
import routes from '../../../server/src/routes/index.js';
import { errorHandler, notFoundHandler } from '../../../server/src/middleware/errors.js';

// Mirrors the mounting logic in server/src/index.js minus app.listen()
// so supertest can drive the Express app in-process.
export function buildApp() {
  const app = express();
  app.use(express.json({ limit: '100kb' }));
  app.use('/api', routes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
