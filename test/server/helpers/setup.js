import { vi } from 'vitest';

// config.js (server/src/config.js) calls required() on these at import time.
// Set them before any server module loads.
process.env.PGHOST ||= 'test-host';
process.env.PGPORT ||= '5432';
process.env.PGUSER ||= 'test-user';
process.env.PGPASSWORD ||= 'test-password';
process.env.PGDATABASE ||= 'test-db';
process.env.PGSSL ||= 'disable';
process.env.NODE_ENV = 'test';

// Shared `pool.query()` mock. Lives on globalThis so the pg stub
// (test/server/helpers/pgStub.js, swapped in via vitest.config.js alias) can
// reach it from outside this file's import graph.
globalThis.__queryMock ??= vi.fn();
