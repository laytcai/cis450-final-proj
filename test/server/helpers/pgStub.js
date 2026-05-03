// This file replaces the real `pg` module under test via vitest.config.js
// `test.alias`. Avoids vi.mock hoisting nuances entirely — Vite resolves any
// `import pg from 'pg'` to this module instead.
//
// queryMock is shared via globalThis so tests can drive it from anywhere.
import { vi } from 'vitest';

if (!globalThis.__queryMock) {
  globalThis.__queryMock = vi.fn();
}

class Pool {
  constructor() {}
  query(...args) {
    return globalThis.__queryMock(...args);
  }
  on() {}
  end() {
    return Promise.resolve();
  }
}

export { Pool };
export default { Pool };
