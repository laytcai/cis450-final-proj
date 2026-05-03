# Backend Tests + Coverage

Vitest + Supertest unit and route tests for the Express backend in [`../../server/`](../../server). Kept as its own npm package so `server/` stays untouched.

Targets the **rubric extra-credit "Code coverage (unit testing >80% backend and/or >80% frontend)"** item. Current backend coverage:

```
All files       |  99.77% stmts |  95.93% branches |  100% funcs |  99.77% lines
```

The 80% threshold is enforced — `npm test` and `npm run coverage` both fail the run if coverage drops below it on any of stmts / branches / funcs / lines.

---

## Run

```bash
cd test/server
npm install            # first time only
npm test               # 93 tests, no coverage report
npm run coverage       # tests + coverage report (text + HTML + lcov)
npm run test:watch     # watch mode for local iteration
```

After `npm run coverage`, open `test/server/coverage/index.html` for a clickable line-by-line breakdown.

The tests **do not connect to RDS** — the `pg` package is replaced at module-resolution time with a stub that forwards every `pool.query()` call to a vitest mock. You can run these with no `.env` and no network.

---

## Layout

```
test/server/
├── package.json              # vitest, @vitest/coverage-v8, supertest, express, pg, dotenv
├── vitest.config.js          # 80% thresholds, pg alias to stub, index.js excluded
├── helpers/
│   ├── setup.js              # sets fake env vars; initializes globalThis.__queryMock
│   ├── pgStub.js             # replaces real `pg`; Pool.query() → globalThis.__queryMock
│   ├── mockPg.js             # re-exports queryMock + resetMocks() for tests
│   └── buildApp.js           # builds Express app (mirrors server/src/index.js minus listen())
├── unit/
│   ├── validate.test.js      # all middleware/validate.js validators
│   ├── errors.test.js        # HttpError, asyncHandler, errorHandler, notFoundHandler
│   ├── db.test.js            # loadSql() caching + pingDb()
│   └── config.test.js        # env parsing + missing-env throws
└── routes/
    ├── meta.test.js          # /api/health, /api/options (with cache test), /api/genres
    ├── anime.test.js         # /api/anime, /anime/top, /anime/:id, /anime/:id/stats
    ├── users.test.js         # /api/users/:username
    ├── recommend.test.js     # /api/anime/:id/recommendations
    ├── compat.test.js        # /api/users/:a/compatibility/:b
    └── analytics.test.js     # /api/genres/:name/trend, /api/studios/quality
```

---

## How tests drive the database mock

```js
import { queryMock, resetMocks } from '../helpers/mockPg.js';

beforeEach(() => resetMocks());

it('returns the matched row', async () => {
  queryMock.mockResolvedValueOnce({ rows: [{ anime_id: 5, title: 'Steins;Gate' }] });
  const res = await request(app).get('/api/anime/5');
  expect(res.body.title).toBe('Steins;Gate');

  // Optional: assert the SQL placeholder bindings the route used
  expect(queryMock.mock.calls[0][1]).toEqual([5]);
});
```

`queryMock` is a `vi.fn()`. Use `mockResolvedValueOnce({ rows: [...] })` for happy-path data, `mockRejectedValueOnce(new Error(...))` to exercise error branches, and `queryMock.mock.calls[i][1]` to verify the parameter array a route built up.

---

## What's *not* covered (and why)

| File | Reason |
|---|---|
| [`server/src/index.js`](../../server/src/index.js) | Entry-point glue — `app.listen()` + `SIGINT`/`SIGTERM` handlers. Unit tests can't reasonably exercise this without binding real ports. The mounting logic is replicated in [`helpers/buildApp.js`](helpers/buildApp.js) so route tests still cover the same wiring. The exclusion is documented in [`vitest.config.js`](vitest.config.js). |

A small handful of individual lines remain uncovered (visible in the coverage report) — pool-level error event handlers, defensive 5xx fallbacks. These don't move the needle below 80%.

---

## Adding tests for new routes

1. Add a new file under `routes/<name>.test.js`.
2. `import request from 'supertest'` and `import { buildApp } from '../helpers/buildApp.js'`.
3. `import { queryMock, resetMocks } from '../helpers/mockPg.js'` and call `resetMocks()` in `beforeEach`.
4. For each test: queue a `queryMock.mockResolvedValueOnce(...)` per `pool.query()` call your route makes, then `await request(app).get(...)`.

If you add new SQL files in `server/src/queries/`, the existing `loadSql` cache will pick them up — no test-side changes needed.
