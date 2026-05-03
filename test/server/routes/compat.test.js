import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { buildApp } from '../helpers/buildApp.js';
import { queryMock, resetMocks } from '../helpers/mockPg.js';

const app = buildApp();

beforeEach(() => resetMocks());

describe('GET /api/users/:a/compatibility/:b', () => {
  it('returns the compatibility row', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          user_a_id: 1,
          user_b_id: 2,
          overlap: 30,
          pearson: 0.7,
          mean_abs_diff: 1.1,
          top_agreements: [],
        },
      ],
    });
    const res = await request(app).get('/api/users/alice/compatibility/bob');
    expect(res.status).toBe(200);
    expect(res.body.user_a).toBe('alice');
    expect(res.body.user_b).toBe('bob');
    expect(res.body.overlap).toBe(30);
    expect(res.body.pearson).toBe(0.7);
  });

  it('rejects when both usernames are the same', async () => {
    const res = await request(app).get('/api/users/alice/compatibility/alice');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/different usernames/);
  });

  it('returns 404 when one user is missing (user_a_id null)', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ user_a_id: null, user_b_id: 2 }],
    });
    const res = await request(app).get('/api/users/ghost/compatibility/bob');
    expect(res.status).toBe(404);
  });

  it('returns 404 when DB returns zero rows', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/users/alice/compatibility/bob');
    expect(res.status).toBe(404);
  });
});
