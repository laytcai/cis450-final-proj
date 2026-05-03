# M4 Smoke Test

Verify every route against a populated `anime_analytics` RDS. Run these in order — later tests depend on IDs/usernames pulled from the live DB.

Before you start:

```bash
# Backend must be running
cd server && npm install && npm run dev   # http://localhost:8080

# In another shell — pick a real username + anime_id from the DB (you'll plug these in below)
psql "$DATABASE_URL" -c "SELECT anime_id, title FROM anime ORDER BY scored_by DESC NULLS LAST LIMIT 5;"
psql "$DATABASE_URL" -c "SELECT username FROM users WHERE user_completed > 50 LIMIT 5;"
```

Export the values so the commands below are reusable:

```bash
export API=http://localhost:8080
export ANIME_ID=1          # e.g. Cowboy Bebop — replace with any populated id
export USER_A=karthiga     # replace with a real username
export USER_B=Aliice1       # replace with a real username that shares anime with USER_A
export GENRE=Action
```

> If you don't have `jq`, drop the `| jq` suffix — the response will still print.

---

## 1. `GET /api/health`

```bash
curl -s "$API/api/health" | jq
```

Expected:

```json
{ "ok": true, "db": "connected", "timestamp": "2026-04-18T..." }
```

Fail cases: `db` = `"unreachable"` → check `.env`, RDS security group, and password. A non-2xx means the server didn't even start.

---

## 2. `GET /api/options`

```bash
curl -s "$API/api/options" | jq
```

Expected:

```json
{
  "types":    ["Movie", "Music", "ONA", "OVA", "Special", "TV"],
  "sources":  ["Book", "Card game", "..."],
  "ratings":  ["G - All Ages", "PG-13 - Teens 13 or older", "..."],
  "statuses": [
    { "id": 1, "name": "watching" },
    { "id": 2, "name": "completed" },
    { "id": 3, "name": "on_hold" },
    { "id": 4, "name": "dropped" },
    { "id": 6, "name": "plan_to_watch" }
  ],
  "min_year": 1917, "max_year": 2018,
  "cached": false
}
```

Hit it again — `cached` should flip to `true` (5-min in-process cache).

---

## 3. `GET /api/genres`

```bash
curl -s "$API/api/genres" | jq '.genres | .[0:5]'
```

Expected: array of `{ genre_id, genre_name, anime_count }`, ordered by `anime_count DESC`. Top genre is usually `Comedy`, `Action`, or `Adventure`.

---

## 4. `GET /api/anime` (S2 — search)

```bash
# No filters — sanity check pagination shape
curl -s "$API/api/anime?limit=5" | jq '{ total, limit, offset, count: (.results|length) }'

# With filters
curl -s "$API/api/anime?q=naruto&genre=Action&min_score=7&limit=5" | jq '.results[] | { anime_id, title, score, aired_from_year }'

# Bad input — expect 400
curl -s -o /dev/null -w "%{http_code}\n" "$API/api/anime?limit=999"       # 400
curl -s -o /dev/null -w "%{http_code}\n" "$API/api/anime?min_score=11"    # 400
curl -s -o /dev/null -w "%{http_code}\n" "$API/api/anime?year_from=2000&year_to=1990"  # 400
```

`total` should be > 0; each result has `anime_id`, `title`, `score`, `image_url`, etc. Verify `limit` clamped to 100 max.

---

## 5. `GET /api/anime/top` (S4)

```bash
curl -s "$API/api/anime/top?type=TV&limit=10" | jq '.results[] | { title, score, scored_by }'
```

Expected: 10 anime of type `TV`, ordered by `score DESC` with `scored_by ≥ 1000` (default floor). Usually starts with *Fullmetal Alchemist: Brotherhood*-tier titles.

---

## 6. `GET /api/anime/:id` (S1)

```bash
curl -s "$API/api/anime/$ANIME_ID" | jq '{ title, score, genres, studios, producers, licensors }'

# Bad input — expect 400/404
curl -s -o /dev/null -w "%{http_code}\n" "$API/api/anime/abc"        # 400
curl -s -o /dev/null -w "%{http_code}\n" "$API/api/anime/99999999"   # 404
```

Response is a single object (not wrapped). `genres` / `studios` / `producers` / `licensors` are string arrays (may be `[]`).

---

## 7. `GET /api/anime/:id/stats` (S6)

```bash
curl -s "$API/api/anime/$ANIME_ID/stats" | jq
```

Expected:

```json
{
  "anime_id": 1,
  "total_ratings": 12345,
  "histogram": [
    { "bucket": 1, "n": 12 },
    { "bucket": 2, "n": 34 },
    ...
    { "bucket": 10, "n": 9876 }
  ]
}
```

Histogram always returns 10 buckets (missing ones have `n = 0`). This drives the Recharts bar chart on `AnimeDetail`.

---

## 8. `GET /api/anime/:id/recommendations` (C7 — optimized)

```bash
# Post-opt: served from anime_recommendations cache, expect <100ms
time curl -s "$API/api/anime/$ANIME_ID/recommendations?limit=10&min_co_viewers=5" | jq '.results | length'
```

Expected: `{ anime_id, params, results: [...] }`. Each result row: `anime_id`, `title`, `title_english`, `type`, `mal_score`, `image_url`, `aired_from_year`, `co_viewers`, `avg_co_score`.

**Coverage:** the cache only contains anime that had ≥ 200 high-score viewers at build time. Obscure anime return `[]`. If `results` is empty, try a more popular anime_id (higher `scored_by`) — the demo flow lands on popular anime and is fully covered.

**M5 timing reference (anime_id 5114):**
- Pre-opt baseline (raw 3-way self-join on full UAL): **~35 s**
- Stage 1 (`completed_high_score_lists` MV only): **~8.5 s**
- Stage 2 (CHSL + `anime_recommendations` cache, current): **<50 ms**

Build/refresh: see [`ddl/recommendations_mv.sql`](../ddl/recommendations_mv.sql). Rerun `CALL build_anime_recs();` after each `user_anime_list` reload.

---

## 9. `GET /api/users/:username` (S5 + S5b)

```bash
curl -s "$API/api/users/$USER_A?top=5" | jq '{ profile: .profile | { username, user_completed, computed_mean_score, list_entries }, top_titles: [.top_anime[] | .title] }'

# Bad inputs
curl -s -o /dev/null -w "%{http_code}\n" "$API/api/users/%20"                    # 400 (empty username)
curl -s -o /dev/null -w "%{http_code}\n" "$API/api/users/nonexistent_user_xyz"   # 404
```

`top` default is 5, max 50. Response: `{ profile: {...}, top_anime: [...] }`.

---

## 10. `GET /api/users/:a/compatibility/:b` (C8)

```bash
curl -s "$API/api/users/$USER_A/compatibility/$USER_B" | jq '{ overlap, pearson, mean_abs_diff, agreements: (.top_agreements | length) }'

# Same user twice — expect 400
curl -s -o /dev/null -w "%{http_code}\n" "$API/api/users/$USER_A/compatibility/$USER_A"  # 400
```

`pearson` can be `null` if overlap < 2. `top_agreements` is a JSON array of up to 10 `{ anime_id, title, score_a, score_b }`.

Pick two users with large completed lists so `overlap > 10`, otherwise the metrics will be noisy.

---

## 11. `GET /api/genres/:name/trend` (C9)

```bash
curl -s "$API/api/genres/$GENRE/trend?year_from=2000&year_to=2020" | jq '.points[] | { year, releases, avg_score, top_title }'
```

Expected: `{ genre, year_from, year_to, points: [...] }`. Each point has `year`, `releases` (int), `avg_score` (string/numeric), `avg_members` (int), `top_title` (string).

URL-encode genre names with spaces: `Slice%20of%20Life`.

---

## 12. `GET /api/studios/quality` (C10 — ⚠️ slow + universal check)

```bash
# Defaults: min_productions=5, score_floor=7
time curl -s "$API/api/studios/quality" | jq '{ params: { min_productions, score_floor }, studios: (.results | length), top: .results[0:5] }'

# Elite cutoff — dramatic filter
curl -s "$API/api/studios/quality?min_productions=10&score_floor=8" | jq '.results | length'

# Bad inputs
curl -s -o /dev/null -w "%{http_code}\n" "$API/api/studios/quality?score_floor=11"      # 400
curl -s -o /dev/null -w "%{http_code}\n" "$API/api/studios/quality?min_productions=0"   # 400
```

**Note for M5:** this is the second "slow ≥15s" query alongside C7 — record pre-opt timing here too.

Result row shape: `{ studio_name, productions, avg_score, min_score, max_score }`, default sort `avg_score DESC`.

---

## If everything above returns 200

You're green for the M4 demo. Spin up the frontend (`cd client && npm run dev`) and click through:

- `/` — Home. Genres panel populates → backend is reachable from browser.
- `/browse` → pick a card → `/anime/:id` → scroll to recommendations.
- Home "Look up a viewer" → `/users/:username`.
- `/compare` → two usernames that share anime.
- `/trends` → pick a genre, set 1990–2020.
- `/studios` → defaults, then raise score floor to 8 to watch the list shrink.

If the frontend shows an `ErrorBanner` but `curl` works, it's almost always CORS — check `server/.env` `CORS_ORIGINS` matches the URL the browser is hitting (default `http://localhost:5173`).
