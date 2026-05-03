import { describe, it, expect, vi } from 'vitest';
import {
  HttpError,
  asyncHandler,
  notFoundHandler,
  errorHandler,
} from '../../../server/src/middleware/errors.js';

function fakeRes() {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
}

describe('HttpError', () => {
  it('captures status, message, and details', () => {
    const e = new HttpError(404, 'gone', { id: 7 });
    expect(e.status).toBe(404);
    expect(e.message).toBe('gone');
    expect(e.publicMessage).toBe('gone');
    expect(e.details).toEqual({ id: 7 });
  });

  it('omits details when not given', () => {
    const e = new HttpError(400, 'bad');
    expect(e.details).toBeUndefined();
  });
});

describe('asyncHandler', () => {
  it('forwards resolved values without calling next', async () => {
    const next = vi.fn();
    const fn = vi.fn().mockResolvedValue('ok');
    await asyncHandler(fn)({}, {}, next);
    expect(fn).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('routes a thrown async error to next()', async () => {
    const next = vi.fn();
    const boom = new Error('boom');
    const fn = vi.fn().mockRejectedValue(boom);
    await asyncHandler(fn)({}, {}, next);
    expect(next).toHaveBeenCalledWith(boom);
  });

  it('does not call next on a successful sync handler', async () => {
    const next = vi.fn();
    const fn = vi.fn(() => 'sync-ok');
    await asyncHandler(fn)({}, {}, next);
    expect(fn).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});

describe('notFoundHandler', () => {
  it('responds 404 with the original URL', () => {
    const res = fakeRes();
    notFoundHandler({ originalUrl: '/api/missing' }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not found', path: '/api/missing' });
  });
});

describe('errorHandler', () => {
  it('formats a 4xx HttpError using its publicMessage', () => {
    const res = fakeRes();
    errorHandler(new HttpError(400, 'bad input'), {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'bad input' });
  });

  it('includes details when present', () => {
    const res = fakeRes();
    errorHandler(new HttpError(400, 'bad', { field: 'id' }), {}, res, () => {});
    expect(res.json).toHaveBeenCalledWith({ error: 'bad', details: { field: 'id' } });
  });

  it('hides 500 messages behind a generic envelope', () => {
    const res = fakeRes();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    errorHandler(new Error('internal secret stack info'), {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal Server Error' });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('falls back to status 500 when err.status is non-integer', () => {
    const res = fakeRes();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    errorHandler({ status: 'oops', message: 'x' }, {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(500);
    spy.mockRestore();
  });
});
