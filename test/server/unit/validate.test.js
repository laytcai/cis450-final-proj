import { describe, it, expect, vi } from 'vitest';
import {
  requireIntParam,
  requireNonEmptyParam,
  optionalIntQuery,
  optionalFloatQuery,
  optionalStringQuery,
  clampLimit,
  clampOffset,
} from '../../../server/src/middleware/validate.js';
import { HttpError } from '../../../server/src/middleware/errors.js';

function runMiddleware(mw, req) {
  const next = vi.fn();
  mw(req, {}, next);
  return next;
}

describe('requireIntParam', () => {
  const mw = requireIntParam('id');

  it('coerces a positive int and calls next() without error', () => {
    const req = { params: { id: '42' } };
    const next = runMiddleware(mw, req);
    expect(next).toHaveBeenCalledWith();
    expect(req.params.id).toBe(42);
  });

  it('rejects non-numeric input with 400', () => {
    const next = runMiddleware(mw, { params: { id: 'abc' } });
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(HttpError);
    expect(err.status).toBe(400);
  });

  it('rejects zero with 400', () => {
    const next = runMiddleware(mw, { params: { id: '0' } });
    expect(next.mock.calls[0][0].status).toBe(400);
  });

  it('rejects negative numbers with 400', () => {
    const next = runMiddleware(mw, { params: { id: '-3' } });
    expect(next.mock.calls[0][0].status).toBe(400);
  });

  it('rejects floats with 400', () => {
    const next = runMiddleware(mw, { params: { id: '1.5' } });
    expect(next.mock.calls[0][0].status).toBe(400);
  });
});

describe('requireNonEmptyParam', () => {
  const mw = requireNonEmptyParam('username');

  it('trims and passes a non-empty string', () => {
    const req = { params: { username: '  alice  ' } };
    const next = runMiddleware(mw, req);
    expect(next).toHaveBeenCalledWith();
    expect(req.params.username).toBe('alice');
  });

  it('rejects whitespace-only with 400', () => {
    const next = runMiddleware(mw, { params: { username: '   ' } });
    expect(next.mock.calls[0][0].status).toBe(400);
  });

  it('rejects undefined with 400', () => {
    const next = runMiddleware(mw, { params: {} });
    expect(next.mock.calls[0][0].status).toBe(400);
  });
});

describe('optionalIntQuery', () => {
  const mw = optionalIntQuery('limit', { min: 1, max: 100, default: 20 });

  it('applies the default when missing', () => {
    const req = { query: {} };
    const next = runMiddleware(mw, req);
    expect(next).toHaveBeenCalledWith();
    expect(req.query.limit).toBe(20);
  });

  it('applies the default when empty string', () => {
    const req = { query: { limit: '' } };
    runMiddleware(mw, req);
    expect(req.query.limit).toBe(20);
  });

  it('coerces an in-range int', () => {
    const req = { query: { limit: '50' } };
    runMiddleware(mw, req);
    expect(req.query.limit).toBe(50);
  });

  it('rejects values below min', () => {
    const next = runMiddleware(mw, { query: { limit: '0' } });
    expect(next.mock.calls[0][0].status).toBe(400);
  });

  it('rejects values above max', () => {
    const next = runMiddleware(mw, { query: { limit: '101' } });
    expect(next.mock.calls[0][0].status).toBe(400);
  });

  it('rejects non-integer numbers', () => {
    const next = runMiddleware(mw, { query: { limit: '3.5' } });
    expect(next.mock.calls[0][0].status).toBe(400);
  });

  it('with no default, leaves missing values undefined', () => {
    const noDefault = optionalIntQuery('foo', { min: 0, max: 10 });
    const req = { query: {} };
    const next = runMiddleware(noDefault, req);
    expect(next).toHaveBeenCalledWith();
    expect(req.query.foo).toBeUndefined();
  });
});

describe('optionalFloatQuery', () => {
  const mw = optionalFloatQuery('min_score', { min: 0, max: 10, default: 0 });

  it('applies the default when missing', () => {
    const req = { query: {} };
    runMiddleware(mw, req);
    expect(req.query.min_score).toBe(0);
  });

  it('coerces a valid float', () => {
    const req = { query: { min_score: '7.5' } };
    runMiddleware(mw, req);
    expect(req.query.min_score).toBe(7.5);
  });

  it('rejects out-of-range values', () => {
    const next = runMiddleware(mw, { query: { min_score: '11' } });
    expect(next.mock.calls[0][0].status).toBe(400);
  });

  it('rejects non-finite values like NaN', () => {
    const next = runMiddleware(mw, { query: { min_score: 'oops' } });
    expect(next.mock.calls[0][0].status).toBe(400);
  });

  it('with no default, leaves missing values undefined', () => {
    const noDefault = optionalFloatQuery('foo', { min: 0, max: 10 });
    const req = { query: {} };
    runMiddleware(noDefault, req);
    expect(req.query.foo).toBeUndefined();
  });
});

describe('optionalStringQuery', () => {
  const mw = optionalStringQuery('q', { maxLength: 10 });

  it('clears empty string to undefined', () => {
    const req = { query: { q: '' } };
    runMiddleware(mw, req);
    expect(req.query.q).toBeUndefined();
  });

  it('clears missing param to undefined', () => {
    const req = { query: {} };
    runMiddleware(mw, req);
    expect(req.query.q).toBeUndefined();
  });

  it('trims valid input', () => {
    const req = { query: { q: '  hi ' } };
    runMiddleware(mw, req);
    expect(req.query.q).toBe('hi');
  });

  it('rejects strings over max length', () => {
    const next = runMiddleware(mw, { query: { q: 'x'.repeat(11) } });
    expect(next.mock.calls[0][0].status).toBe(400);
  });

  it('uses default maxLength of 200 when not provided', () => {
    const m = optionalStringQuery('q');
    const next = runMiddleware(m, { query: { q: 'x'.repeat(201) } });
    expect(next.mock.calls[0][0].status).toBe(400);
  });
});

describe('clampLimit / clampOffset', () => {
  it('clampLimit defaults to 20', () => {
    const req = { query: {} };
    runMiddleware(clampLimit, req);
    expect(req.query.limit).toBe(20);
  });

  it('clampLimit rejects values above 100', () => {
    const next = runMiddleware(clampLimit, { query: { limit: '500' } });
    expect(next.mock.calls[0][0].status).toBe(400);
  });

  it('clampOffset defaults to 0', () => {
    const req = { query: {} };
    runMiddleware(clampOffset, req);
    expect(req.query.offset).toBe(0);
  });

  it('clampOffset rejects negative values', () => {
    const next = runMiddleware(clampOffset, { query: { offset: '-1' } });
    expect(next.mock.calls[0][0].status).toBe(400);
  });
});
