import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_SRC = path.resolve(__dirname, '../../server/src');
const PG_STUB = path.join(__dirname, 'helpers/pgStub.js');

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    setupFiles: ['./helpers/setup.js'],
    include: ['unit/**/*.test.js', 'routes/**/*.test.js'],
    // Replace the real `pg` package with our stub so no real DB connection is
    // ever attempted. The stub forwards .query() to globalThis.__queryMock,
    // which tests drive via helpers/mockPg.js.
    alias: {
      pg: PG_STUB,
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      // server/src/ lives outside this package's root (test/server/), so we
      // must opt in to external file tracking.
      allowExternal: true,
      include: [`${SERVER_SRC}/**/*.js`],
      // index.js wires app.listen() + signal handlers — entry-point glue, not
      // unit-testable without binding real ports. buildApp.js mirrors its
      // mounting logic for tests.
      exclude: [`${SERVER_SRC}/index.js`],
      all: true,
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 80,
      },
    },
  },
});
