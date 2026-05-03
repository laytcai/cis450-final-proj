import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { buildApp } from '../helpers/buildApp.js';
import { queryMock, resetMocks } from '../helpers/mockPg.js';

const app = buildApp();

beforeEach(() => resetMocks());

describe('GET /api/anime/:id/recommendations', () => {
  it('returns recs and echoes params', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        { anime_id: 11, title: 'Trigun', co_viewers: 50, avg_co_score: 8.4 },
      ],
    });
    const res = await request(app).get('/api/anime/1/recommendations?limit=10&min_co_viewers=20');
    expect(res.status).toBe(200);
    expect(res.body.anime_id).toBe(1);
    expect(res.body.params).toEqual({ min_co_viewers: 20, limit: 10 });
    expect(res.body.results).toHaveLength(1);

    // SQL params: [id, min_co_viewers, limit]
    expect(queryMock.mock.calls[0][1]).toEqual([1, 20, 10]);
  });

  it('uses default min_co_viewers=10 and limit=20', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    await request(app).get('/api/anime/7/recommendations');
    expect(queryMock.mock.calls[0][1]).toEqual([7, 10, 20]);
  });

  it('rejects non-integer id with 400', async () => {
    const res = await request(app).get('/api/anime/abc/recommendations');
    expect(res.status).toBe(400);
  });

  it('rejects out-of-range min_co_viewers with 400', async () => {
    const res = await request(app).get('/api/anime/1/recommendations?min_co_viewers=99999');
    expect(res.status).toBe(400);
  });
});
