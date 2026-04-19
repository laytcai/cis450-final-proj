export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.publicMessage = message;
    if (details !== undefined) this.details = details;
  }
}

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
}

export function errorHandler(err, _req, res, _next) {
  const status = Number.isInteger(err.status) ? err.status : 500;
  const payload = {
    error: err.publicMessage || (status >= 500 ? 'Internal Server Error' : err.message),
  };
  if (err.details !== undefined) payload.details = err.details;
  if (status >= 500) console.error('[error]', err);
  res.status(status).json(payload);
}
