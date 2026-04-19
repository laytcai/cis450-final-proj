import { HttpError } from './errors.js';

export function requireIntParam(name) {
  return (req, _res, next) => {
    const raw = req.params[name];
    const n = Number(raw);
    if (!Number.isInteger(n) || n <= 0) {
      return next(new HttpError(400, `Path param "${name}" must be a positive integer`));
    }
    req.params[name] = n;
    next();
  };
}

export function requireNonEmptyParam(name) {
  return (req, _res, next) => {
    const raw = req.params[name];
    if (typeof raw !== 'string' || raw.trim() === '') {
      return next(new HttpError(400, `Path param "${name}" must be a non-empty string`));
    }
    req.params[name] = raw.trim();
    next();
  };
}

export function optionalIntQuery(name, { min = 0, max = Number.MAX_SAFE_INTEGER, default: def } = {}) {
  return (req, _res, next) => {
    const raw = req.query[name];
    if (raw === undefined || raw === '') {
      if (def !== undefined) req.query[name] = def;
      return next();
    }
    const n = Number(raw);
    if (!Number.isInteger(n) || n < min || n > max) {
      return next(new HttpError(400, `Query param "${name}" must be an integer in [${min}, ${max}]`));
    }
    req.query[name] = n;
    next();
  };
}

export function optionalFloatQuery(name, { min = -Infinity, max = Infinity, default: def } = {}) {
  return (req, _res, next) => {
    const raw = req.query[name];
    if (raw === undefined || raw === '') {
      if (def !== undefined) req.query[name] = def;
      return next();
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < min || n > max) {
      return next(new HttpError(400, `Query param "${name}" must be a number in [${min}, ${max}]`));
    }
    req.query[name] = n;
    next();
  };
}

export function optionalStringQuery(name, { maxLength = 200 } = {}) {
  return (req, _res, next) => {
    const raw = req.query[name];
    if (raw === undefined || raw === '') {
      req.query[name] = undefined;
      return next();
    }
    if (typeof raw !== 'string' || raw.length > maxLength) {
      return next(new HttpError(400, `Query param "${name}" must be a string ≤ ${maxLength} chars`));
    }
    req.query[name] = raw.trim();
    next();
  };
}

export const clampLimit = optionalIntQuery('limit', { min: 1, max: 100, default: 20 });
export const clampOffset = optionalIntQuery('offset', { min: 0, max: 100000, default: 0 });
