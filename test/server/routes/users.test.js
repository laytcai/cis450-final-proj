import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { buildApp } from '../helpers/buildApp.js';
import { queryMock, resetMocks } from '../helpers/mockPg.js';

const app = buildApp();

beforeEach(() => resetMocks());

describe('GET /api/users/:username', () => {
  it('returns profile + top anime on success', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ user_id: 1, username: 'alice' }] })
      .mockResolvedValueOnce({
        rows: [
          { title: 'Bebop', my_score: 10 },
          { title: 'Trigun', my_score: 9 },
        ],
      });

    const res = await request(app).get('/api/users/alice?top=2');
    expect(res.status).toBe(200);
    expect(res.body.profile.username).toBe('alice');
    expect(res.body.top_anime).toHaveLength(2);

    // SQL bindings: profile gets ['alice']; top_anime gets ['alice', 2]
    expect(queryMock.mock.calls[0][1]).toEqual(['alice']);
    expect(queryMock.mock.calls[1][1]).toEqual(['alice', 2]);
  });

  it('uses default top=5 when not specified', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ user_id: 1, username: 'bob' }] })
      .mockResolvedValueOnce({ rows: [] });

    await request(app).get('/api/users/bob');
    expect(queryMock.mock.calls[1][1]).toEqual(['bob', 5]);
  });

  it('returns 404 when user does not exist', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/users/ghost');
    expect(res.status).toBe(404);
  });

  it('rejects empty username path with 404 (express routing)', async () => {
    const res = await request(app).get('/api/users/');
    // Express routes /users/ to no handler -> 404 from notFoundHandler
    expect(res.status).toBe(404);
  });

  it('rejects out-of-range top with 400', async () => {
    const res = await request(app).get('/api/users/alice?top=999');
    expect(res.status).toBe(400);
  });
});
