import { describe, it, expect, beforeEach } from 'vitest';
import { loadSql, pingDb } from '../../../server/src/db.js';
import { queryMock, resetMocks } from '../helpers/mockPg.js';

beforeEach(() => resetMocks());

describe('loadSql', () => {
  it('reads a real query file from server/src/queries', () => {
    const sql = loadSql('s1_anime_by_id');
    expect(typeof sql).toBe('string');
    expect(sql.length).toBeGreaterThan(0);
  });

  it('caches subsequent reads (returns identical string instance)', () => {
    const a = loadSql('s3_list_genres');
    const b = loadSql('s3_list_genres');
    expect(a).toBe(b);
  });

  it('throws when the query file does not exist', () => {
    expect(() => loadSql('does_not_exist_12345')).toThrow();
  });
});

describe('pingDb', () => {
  it('returns true when SELECT 1 returns ok=1', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ ok: 1 }] });
    await expect(pingDb()).resolves.toBe(true);
  });

  it('returns false when the row shape is unexpected', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ ok: 0 }] });
    await expect(pingDb()).resolves.toBe(false);
  });

  it('returns false when no rows come back', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    await expect(pingDb()).resolves.toBe(false);
  });

  it('propagates pool errors', async () => {
    queryMock.mockRejectedValueOnce(new Error('connection refused'));
    await expect(pingDb()).rejects.toThrow('connection refused');
  });
});
