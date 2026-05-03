import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { buildApp } from '../helpers/buildApp.js';
import { queryMock, resetMocks } from '../helpers/mockPg.js';

const app = buildApp();

beforeEach(() => {
  resetMocks();
  // Silence the expected 5xx log line from errorHandler in the DB-error test below.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('GET /api/health', () => {
  it('returns ok:true and db:connected on success', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ ok: 1 }] });
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.db).toBe('connected');
    expect(typeof res.body.timestamp).toBe('string');
  });

  it('reports dbError but still returns 200 when DB throws', async () => {
    queryMock.mockRejectedValueOnce(new Error('rds down'));
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.db).toBe('unreachable');
    expect(res.body.dbError).toBe('rds down');
  });
});

describe('GET /api/options', () => {
  it('returns rows[0] as the body and cached:false on first call', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ types: ['TV'], statuses: ['Finished Airing'], sources: ['Manga'] }],
    });
    const res = await request(app).get('/api/options');
    expect(res.status).toBe(200);
    expect(res.body.types).toEqual(['TV']);
    expect(res.body.cached).toBe(false);
  });

  it('serves from cache (no second DB call) within TTL', async () => {
    // First call seeds the cache from the prior test? Reset to be safe and seed here.
    queryMock.mockResolvedValueOnce({ rows: [{ types: ['Movie'] }] });
    await request(app).get('/api/options');
    const callsAfterFirst = queryMock.mock.calls.length;

    const res = await request(app).get('/api/options');
    expect(res.status).toBe(200);
    expect(res.body.cached).toBe(true);
    expect(queryMock.mock.calls.length).toBe(callsAfterFirst); // no additional DB hit
  });

});

describe('GET /api/genres', () => {
  it('returns the genres array', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        { genre_id: 1, genre_name: 'Action', anime_count: 100 },
        { genre_id: 2, genre_name: 'Comedy', anime_count: 80 },
      ],
    });
    const res = await request(app).get('/api/genres');
    expect(res.status).toBe(200);
    expect(res.body.genres).toHaveLength(2);
    expect(res.body.genres[0].genre_name).toBe('Action');
  });

  it('surfaces a 500 when the DB throws', async () => {
    queryMock.mockRejectedValueOnce(new Error('db boom'));
    const res = await request(app).get('/api/genres');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal Server Error');
  });
});

describe('404 handler', () => {
  it('returns the not-found envelope on unknown paths', async () => {
    const res = await request(app).get('/api/this-does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not found');
  });
});
