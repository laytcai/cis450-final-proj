# Anime Analytics

Full-stack analytics app over a [MyAnimeList](https://myanimelist.net/) scrape — 6,600+ anime, 100k+ users, and a very wide user-anime-list table. Built for **CIS 5500 · UPenn · Spring 2026 · Milestone 4**.

## Stack

| Layer | Tech |
|---|---|
| Database | PostgreSQL 16 on AWS RDS (`anime_analytics`) |
| ETL | Python 3 · `psycopg` · [`ddl/ddl.py`](ddl/ddl.py) |
| Backend | Node 20 · Express · `pg` · parameterized raw SQL |
| Frontend | Vite · React 18 · React Router 6 · Tailwind v3 · shadcn-style components · Recharts |
| Docs | Markdown → `pandoc` → PDF for Gradescope |

## Repo tour

```
cis450-final-proj/
├── ddl/                  # Python ETL — creates schema + loads CSVs (authoritative)
├── raw_csv/              # source data + graded PDFs (guidelines, rubric)
├── server/               # Express backend — 12 routes, one .sql file per query
│   └── src/
│       ├── config.js     # env loader
│       ├── db.js         # pg Pool + loadSql() + pingDb()
│       ├── middleware/   # asyncHandler, error envelope, validators
│       ├── queries/      # parameterized SQL (s1–s6, s5b, c7–c10, meta_options)
│       └── routes/       # Express subrouters (meta, anime, users, recommend, compat, analytics)
├── client/               # Vite + React frontend — 7 pages, shared UI primitives
│   └── src/
│       ├── api/          # apiGet() + ApiError
│       ├── components/   # AnimeCard, SearchBar, Layout, Navbar, ui/*
│       ├── hooks/        # useFetch with AbortController cleanup
│       └── pages/        # Home, Browse, AnimeDetail, UserProfile, Compare, Trends, Studios
└── docs/
    ├── api_spec.md                  # API specification (one section per route)
    ├── smoke_test.md                # 12 curl checks against a populated DB
    └── m4_submission_checklist.md   # pre-submission punch list
```

---

## Prerequisites

- **Node.js ≥ 20** (check: `node --version`)
- **Python 3** + `psycopg[binary]` and `pandas` (for the ETL script)
- **PostgreSQL 16** — an AWS RDS instance, or local Postgres for development
- `psql` CLI (for running the client-side `\copy` bulk loads)

---

## Database setup

The database is populated by [`ddl/ddl.py`](ddl/ddl.py), which stores each step as a Python string (`str1` … `str6`). The intended workflow:

### 1. Provision the instance

- **AWS RDS (production):** create a PostgreSQL 16 instance (`db.t4g.micro` is enough for the M4 demo). Note the endpoint, port (default `5432`), master username, and master password. Open inbound `5432` from your IP in the instance's security group.
- **Local dev:** `postgres://postgres:postgres@localhost:5432/postgres` works if you have a local Postgres running.

### 2. Create the database

Connect to the **default** DB as the master user, then run `str1`:

```bash
psql "postgres://<master>:<pw>@<host>:5432/postgres" -c "CREATE DATABASE anime_analytics;"
```

Reconnect to the new DB for the remaining steps:

```bash
psql "postgres://<master>:<pw>@<host>:5432/anime_analytics"
```

### 3. Create raw staging tables

Run the SQL in `str2` from `ddl/ddl.py` (or execute the whole script — see §6 below).

### 4. Bulk-load the CSVs

RDS does **not** allow server-side `COPY FROM '/path'`, so use `\copy` from `psql`:

```sql
\copy raw_anime          FROM 'raw_csv/anime_cleaned.csv'                       WITH (FORMAT csv, HEADER true);
\copy raw_users          FROM 'raw_csv/users_cleaned.csv'                       WITH (FORMAT csv, HEADER true);
\copy raw_user_anime_list FROM 'raw_csv/animelists_cleaned_subset.csv'          WITH (FORMAT csv, HEADER true);
```

The `animelists_cleaned_subset.csv` in this repo is a 2,000-row sample. For the full dataset, download the original `animelists_cleaned.csv` from the source (referenced in the course materials).

### 5. Run the ETL + final schema

Run `str4` (final normalized schema) then `str5` (safe-cast functions → inserts → dimension tokenization → indexes → `ANALYZE`). `str5` is wrapped in a transaction and is idempotent (truncates and restarts before re-running). If you tweak the ETL and need to re-run, use `str_reset` to truncate all final tables while keeping the schema.

### 6. Sanity check

Run `str6` to print row counts. Ballpark expectations on the sample data:

```
SELECT COUNT(*) FROM anime;              -- ~6,669
SELECT COUNT(*) FROM users;              -- ~108,713
SELECT COUNT(*) FROM user_anime_list;    -- ~2,000 on the sample; millions on full
```

### 7. Credentials

Credentials live in `server/.env` (gitignored — never commit). See [`server/.env.example`](server/.env.example) for the exact keys. The minimum you need to fill in:

```dotenv
PGHOST=your-rds-endpoint.region.rds.amazonaws.com
PGPORT=5432
PGUSER=your_db_user
PGPASSWORD=your_db_password
PGDATABASE=anime_analytics
PGSSL=require          # keep as `require` for RDS; set to `disable` only for local Postgres
PORT=8080
CORS_ORIGINS=http://localhost:5173
```

---

## Run the backend

```bash
cd server
cp .env.example .env       # fill in the credentials from step 7 above
npm install
npm run dev                # starts on http://localhost:8080 with nodemon

# quick sanity check:
curl -s http://localhost:8080/api/health
# => {"ok":true,"db":"connected","timestamp":"..."}
```

If `db` comes back as `unreachable`, double-check the `.env` values and that RDS inbound rules include your IP.

## Run the frontend

```bash
cd client
cp .env.example .env       # default VITE_API_URL=http://localhost:8080 is fine for local dev
npm install
npm run dev                # starts on http://localhost:5173
```

Open `http://localhost:5173`. The home page pulls live genre data from the backend on load — if you see the error banner, the frontend can't reach the backend (check CORS + that the backend is running).

---

## Features

| Page | Route | Backing endpoints |
|---|---|---|
| Home | `/` | `GET /api/genres` — live stats + user lookup form |
| Browse | `/browse` | `GET /api/anime`, `/api/options`, `/api/genres` |
| Anime detail | `/anime/:id` | `GET /api/anime/:id`, `.../stats`, `.../recommendations` |
| User profile | `/users/:username` | `GET /api/users/:username` |
| Compare | `/compare` | `GET /api/users/:a/compatibility/:b` |
| Trends | `/trends` | `GET /api/genres/:name/trend` |
| Studios | `/studios` | `GET /api/studios/quality` |

There are also two auxiliary routes: `GET /api/health` and `GET /api/options` (5-minute in-process cache).

---

## What's next

Once your backend and frontend are both running against a populated DB:

1. **Smoke-test every route.** Follow [`docs/smoke_test.md`](docs/smoke_test.md) — 12 `curl` commands with expected JSON shapes and bad-input cases that exercise the 400/404 error envelope. Plug in a real `ANIME_ID` and two real `USER_A` / `USER_B` values from the DB.
2. **Render the API spec PDF for Gradescope.**
   ```bash
   cd docs
   pandoc api_spec.md -o api_spec.pdf --pdf-engine=xelatex \
     --variable geometry:margin=1in --toc --toc-depth=2
   ```
   Upload `api_spec.pdf` to the M4 Gradescope assignment.
3. **Schedule the mentor check-in.** 15-minute Zoom, all 4 members on camera; demo the backend + at least one page of the frontend.
4. **Run the pre-submission checklist.** [`docs/m4_submission_checklist.md`](docs/m4_submission_checklist.md) is a day-before punch list covering Gradescope, mentor Zoom, backend/frontend readiness, rubric touch-points, and repo hygiene.

---

## Docs

- [`docs/api_spec.md`](docs/api_spec.md) — REST API specification, one section per route.
- [`docs/smoke_test.md`](docs/smoke_test.md) — `curl` checks for every route, in order.
- [`docs/m4_submission_checklist.md`](docs/m4_submission_checklist.md) — pre-submission punch list.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `/api/health` returns `db: "unreachable"` | Wrong `.env` values, RDS security group missing your IP, or `PGSSL=disable` on an RDS instance. |
| CORS error in the browser console | `CORS_ORIGINS` in `server/.env` doesn't include `http://localhost:5173`. Restart the backend after changing it. |
| Recommendations / studios query times out | Expected on the full UAL table without the recommended indexes — see the query comments in `server/src/queries/c7_recommendations.sql` and `c10_quality_studios.sql`. Work around with a more popular anime or a higher `min_productions`. |
| `\copy` fails with "permission denied" | You're running `COPY` server-side; use `\copy` (backslash, client-side) from `psql`. |
| `pandoc` missing when rendering PDF | Install `pandoc` and a LaTeX distribution (e.g. `tinytex` or MacTeX). |

## License

Course project — not licensed for external use.
