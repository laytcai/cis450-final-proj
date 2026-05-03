import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { buildApp } from '../helpers/buildApp.js';
import { queryMock, resetMocks } from '../helpers/mockPg.js';

const app = buildApp();

beforeEach(() => resetMocks());

describe('GET /api/anime (search)', () => {
  it('returns paginated results', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        { anime_id: 1, title: 'Bebop', total_count: 2 },
        { anime_id: 2, title: 'Trigun', total_count: 2 },
      ],
    });
    const res = await request(app).get('/api/anime?q=bebop&limit=10&offset=0');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.results).toHaveLength(2);
    expect(res.body.results[0]).not.toHaveProperty('total_count');
  });

  it('returns total:0 when there are no rows', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/anime');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
    expect(res.body.results).toEqual([]);
  });

  it('escapes ILIKE wildcards in q before binding', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    await request(app).get('/api/anime?q=100%25_real');
    const params = queryMock.mock.calls[0][1];
    // q should be the FIRST param; %, _ and \ are escaped with backslashes
    expect(params[0]).toBe('100\\%\\_real');
  });

  it('rejects year_from > year_to with 400', async () => {
    const res = await request(app).get('/api/anime?year_from=2020&year_to=2010');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/year_from/);
  });

  it('rejects out-of-range min_score with 400', async () => {
    const res = await request(app).get('/api/anime?min_score=11');
    expect(res.status).toBe(400);
  });

  it('rejects limit > 100 with 400', async () => {
    const res = await request(app).get('/api/anime?limit=500');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/anime/top', () => {
  it('matches before /:id when path is /anime/top', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ anime_id: 1, title: 'FMAB', score: 9.2 }],
    });
    const res = await request(app).get('/api/anime/top?type=TV&limit=5');
    expect(res.status).toBe(200);
    expect(res.body.results[0].title).toBe('FMAB');
  });

  it('uses default min_scored_by=1000', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    await request(app).get('/api/anime/top');
    expect(queryMock.mock.calls[0][1]).toEqual([null, 1000, 20]);
  });
});

describe('GET /api/anime/:id', () => {
  it('returns the matched row', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ anime_id: 5, title: 'Steins;Gate' }],
    });
    const res = await request(app).get('/api/anime/5');
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Steins;Gate');
    expect(queryMock.mock.calls[0][1]).toEqual([5]);
  });

  it('returns 404 when no row matches', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/anime/999999');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('rejects non-integer id with 400', async () => {
    const res = await request(app).get('/api/anime/abc');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/anime/:id/stats', () => {
  it('computes total_ratings as sum of histogram bucket counts', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        { bucket: 7, n: 10 },
        { bucket: 8, n: 25 },
        { bucket: 9, n: 5 },
      ],
    });
    const res = await request(app).get('/api/anime/42/stats');
    expect(res.status).toBe(200);
    expect(res.body.anime_id).toBe(42);
    expect(res.body.total_ratings).toBe(40);
    expect(res.body.histogram).toHaveLength(3);
  });

  it('returns total_ratings:0 with no histogram rows', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/anime/42/stats');
    expect(res.status).toBe(200);
    expect(res.body.total_ratings).toBe(0);
  });

  it('rejects non-integer id with 400', async () => {
    const res = await request(app).get('/api/anime/oops/stats');
    expect(res.status).toBe(400);
  });
});
