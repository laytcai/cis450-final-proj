import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';

// config.js is a side-effecting module that reads process.env at import time.
// Use vi.resetModules() to force a fresh evaluation per test.
const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  for (const k of Object.keys(process.env)) {
    if (!(k in ORIGINAL_ENV)) delete process.env[k];
  }
  Object.assign(process.env, ORIGINAL_ENV);
});

describe('config', () => {
  it('exposes db settings derived from env', async () => {
    process.env.PGHOST = 'h';
    process.env.PGPORT = '6543';
    process.env.PGUSER = 'u';
    process.env.PGPASSWORD = 'p';
    process.env.PGDATABASE = 'd';
    process.env.PGSSL = 'disable';
    const { config } = await import('../../../server/src/config.js');
    expect(config.db).toMatchObject({
      host: 'h',
      port: 6543,
      user: 'u',
      password: 'p',
      database: 'd',
      ssl: false,
    });
  });

  it('defaults SSL to rejectUnauthorized:false when PGSSL is unset', async () => {
    process.env.PGHOST = 'h';
    process.env.PGUSER = 'u';
    process.env.PGPASSWORD = 'p';
    process.env.PGDATABASE = 'd';
    delete process.env.PGSSL;
    const { config } = await import('../../../server/src/config.js');
    expect(config.db.ssl).toEqual({ rejectUnauthorized: false });
  });

  it('defaults port to 8080 and nodeEnv to development', async () => {
    process.env.PGHOST = 'h';
    process.env.PGUSER = 'u';
    process.env.PGPASSWORD = 'p';
    process.env.PGDATABASE = 'd';
    delete process.env.PORT;
    delete process.env.NODE_ENV;
    const { config } = await import('../../../server/src/config.js');
    expect(config.port).toBe(8080);
    expect(config.nodeEnv).toBe('development');
  });

  it('parses CORS_ORIGINS as a comma-separated list with trimming', async () => {
    process.env.PGHOST = 'h';
    process.env.PGUSER = 'u';
    process.env.PGPASSWORD = 'p';
    process.env.PGDATABASE = 'd';
    process.env.CORS_ORIGINS = 'http://a.com, http://b.com ,';
    const { config } = await import('../../../server/src/config.js');
    expect(config.corsOrigins).toEqual(['http://a.com', 'http://b.com']);
  });

  it('throws when a required env var is missing', async () => {
    delete process.env.PGHOST;
    process.env.PGUSER = 'u';
    process.env.PGPASSWORD = 'p';
    process.env.PGDATABASE = 'd';
    await expect(import('../../../server/src/config.js')).rejects.toThrow(/PGHOST/);
  });

  it('throws when a required env var is blank', async () => {
    process.env.PGHOST = '   ';
    process.env.PGUSER = 'u';
    process.env.PGPASSWORD = 'p';
    process.env.PGDATABASE = 'd';
    await expect(import('../../../server/src/config.js')).rejects.toThrow(/PGHOST/);
  });
});
