import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';

const app = express();

app.use(cors({ origin: config.corsOrigins }));
app.use(express.json({ limit: '100kb' }));
app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));

app.get('/', (_req, res) =>
  res.json({ name: 'anime-analytics-api', version: '0.1.0', docs: '/api/health' })
);
app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(config.port, () => {
  console.log(`[server] listening on http://localhost:${config.port}`);
  console.log(`[server] health:    http://localhost:${config.port}/api/health`);
});

function shutdown(signal) {
  console.log(`[server] ${signal} received, shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
