# M4 Pre-Submission Checklist

Due **2026-04-20**. Run through this the day before submitting. Tick every box.

## API specification PDF (Gradescope)

- [ ] `docs/api_spec.md` covers all 12 routes (10 SQL + `/health` + `/options`).
- [ ] Each section has: method + path, description, request params table, SQL-placeholder mapping, response example, error codes.
- [ ] Rendered to PDF:
  ```bash
  cd docs
  pandoc api_spec.md -o api_spec.pdf --pdf-engine=xelatex \
    --variable geometry:margin=1in --toc --toc-depth=2
  ```
- [ ] PDF is ≤ 15 pages and renders cleanly (no broken tables).
- [ ] Uploaded to Gradescope under "Milestone 4: API Specification."

## Mentor check-in Zoom

- [ ] Scheduled 15-min slot.
- [ ] All 4 team members on camera.
- [ ] Backend smoke-tested green — see [`smoke_test.md`](smoke_test.md).
- [ ] Frontend running — at minimum Home + Browse + AnimeDetail reachable.
- [ ] Ideally: live walk-through of the full demo trio + one complex-query page.

## Backend readiness

- [ ] `.env` points at the **populated** RDS (row counts match the ETL expectations in the root README).
- [ ] `curl /api/health` → `{"ok": true, "db": "connected"}`.
- [ ] All 12 `curl` checks in [`smoke_test.md`](smoke_test.md) pass.
- [ ] Input-validation checks (400s for bad IDs / scores / years) pass — this is the rubric's 1-pt "Input Sanity" gate.

## Frontend readiness

- [ ] `cd client && npm install && npm run dev` boots on port 5173 with no console errors.
- [ ] Home genres panel populates (backend reachable from browser).
- [ ] Browse: filters apply + Load more paginates + empty state shows when filters return nothing.
- [ ] AnimeDetail: header image loads, histogram renders, recommendations appear (may take a few seconds on full UAL — that's expected).
- [ ] UserProfile: stats card + top-N grid render for a real username.
- [ ] Compare: Pearson metric card appears for two users with shared anime.
- [ ] Trends: line chart renders for at least `Action, 1990–2020`.
- [ ] Studios: default query returns a non-empty leaderboard.

## Rubric touch-points (M4 scope)

- [ ] UI looks distinct from HW2 (dark purple shadcn theme, not Material-UI) → **Look & Feel (5 pts)**.
- [ ] Backend has multiple files — routes, middleware, queries, config — not one fat `index.js` → **Code Quality (5 pts)**.
- [ ] Every route validates params (integers, ranges, non-empty strings) → **Input Sanity (1 pt)**.

## Repo hygiene

- [ ] Branch `main` is current — `git status` clean except for maybe `.env`.
- [ ] No credentials committed — grep for `PGPASSWORD`, `postgres://`, etc.
- [ ] `.env` files are not staged (both `server/.env` and `client/.env` are gitignored).

## Extra credit to flag before demo (optional, M5 story)

- [ ] Deployment (Render free tier, Vercel static host) → **+2 pts** if live URL works during demo.
- [ ] Jikan API integration for current streaming availability → **+2 pts** (fits the external-API EC).
- [ ] Caching already in place on `/api/options` (5-min in-process cache) — mention during demo as the foundation for M5 optimization work.

---

## If something fails

- **Backend won't boot** → check `.env`, Node ≥ 20, `npm install` completed.
- **`/api/health` says `db: unreachable`** → RDS security group inbound rule missing for your IP, or `PGSSL` setting wrong.
- **CORS errors in browser** → set `CORS_ORIGINS=http://localhost:5173` in `server/.env` and restart.
- **Recommendations / Studios time out** → expected on the full UAL without indexes; this *is* the M5 optimization story. If it's blocking the M4 demo, lower `min_co_viewers` or raise `min_productions` to reduce work.
