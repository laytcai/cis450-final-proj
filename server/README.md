# Anime Analytics — Server

Node + Express + `pg` backend for the CIS 5500 anime analytics project. Reads from the PostgreSQL `anime_analytics` database populated by [`../ddl/ddl.py`](../ddl/ddl.py).

## Prerequisites

- Node.js ≥ 20
- Populated `anime_analytics` database (AWS RDS or local Postgres) — see the [root README](../README.md) for the full DB setup walkthrough

## First run

```bash
cp .env.example .env
# Edit .env and fill in PGHOST / PGUSER / PGPASSWORD / PGDATABASE (RDS credentials)
npm install
npm run dev
```

The server starts on `http://localhost:8080`. Smoke test:

```bash
curl -s http://localhost:8080/api/health | jq
# => { "ok": true, "db": "connected", "timestamp": "..." }
```

If `db` shows `unreachable`, double-check your `.env` and that your RDS security group allows inbound on 5432 from your current IP.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start with `nodemon` (auto-reload) |
| `npm start` | Start once (production-style) |

## Tests + coverage

The unit and route test suite for this backend is **not** in this folder — it's under [`../test/server/`](../test/server) as a separate npm package so `server/` stays free of test dependencies. Tests use Vitest + Supertest, mock `pg` at module-resolution time (no RDS needed), and enforce a ≥80% coverage threshold for the rubric extra-credit item.

```bash
cd ../test/server
npm install            # first time only
npm test               # 93 tests
npm run coverage       # tests + HTML/lcov report at test/server/coverage/
```

See [`test/server/README.md`](../test/server/README.md) for the full layout and how to add tests for new routes.

## Layout

```
server/
├── .env.example
├── package.json
└── src/
    ├── index.js              # Express bootstrap
    ├── config.js             # env loader
    ├── db.js                 # pg Pool + loadSql() + pingDb()
    ├── middleware/
    │   ├── errors.js         # asyncHandler + error envelope
    │   └── validate.js       # param/query validators
    ├── routes/
    │   ├── index.js          # mounts all subrouters
    │   └── meta.js           # /api/health (P1); /api/options, /api/genres (P2)
    └── queries/              # one .sql file per route (populated in P2)
```

## Phase status

- **P1** — scaffold + `/api/health` (this commit)
- **P2** — 10 SQL routes (next)

See readme.md for the full phase tracker.
