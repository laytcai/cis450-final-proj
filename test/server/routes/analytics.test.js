import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { buildApp } from '../helpers/buildApp.js';
import { queryMock, resetMocks } from '../helpers/mockPg.js';

const app = buildApp();

beforeEach(() => resetMocks());

describe('GET /api/genres/:name/trend', () => {
  it('returns trend points', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        { year: 2010, releases: 5, avg_score: 7.2 },
        { year: 2011, releases: 8, avg_score: 7.4 },
      ],
    });
    const res = await request(app).get('/api/genres/Action/trend?year_from=2010&year_to=2011');
    expect(res.status).toBe(200);
    expect(res.body.genre).toBe('Action');
    expect(res.body.points).toHaveLength(2);
    expect(queryMock.mock.calls[0][1]).toEqual(['Action', 2010, 2011]);
  });

  it('uses default year_from=1990', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    await request(app).get('/api/genres/Comedy/trend');
    const params = queryMock.mock.calls[0][1];
    expect(params[0]).toBe('Comedy');
    expect(params[1]).toBe(1990);
  });

  it('rejects year_from > year_to with 400', async () => {
    const res = await request(app).get('/api/genres/Action/trend?year_from=2020&year_to=2000');
    expect(res.status).toBe(400);
  });

  it('rejects out-of-range year with 400', async () => {
    const res = await request(app).get('/api/genres/Action/trend?year_from=1800');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/studios/quality', () => {
  it('returns quality studios', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        { studio_name: 'Bones', productions: 12, avg_score: 8.1 },
      ],
    });
    const res = await request(app).get('/api/studios/quality?min_productions=5&score_floor=7');
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
    expect(res.body.min_productions).toBe(5);
    expect(res.body.score_floor).toBe(7);
    expect(queryMock.mock.calls[0][1]).toEqual([5, 7]);
  });

  it('uses defaults min_productions=5 score_floor=7', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    await request(app).get('/api/studios/quality');
    expect(queryMock.mock.calls[0][1]).toEqual([5, 7]);
  });

  it('rejects out-of-range score_floor with 400', async () => {
    const res = await request(app).get('/api/studios/quality?score_floor=15');
    expect(res.status).toBe(400);
  });
});
