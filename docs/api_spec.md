---
title: Anime Analytics — API Specification
subtitle: CIS 5500 Milestone 4 — Spring 2026
author: Team Anime Analytics
---

# Anime Analytics — API Specification

Backend REST API for the CIS 5500 final project. Serves query results from
the normalized PostgreSQL `anime_analytics` database defined in
[`ddl/ddl.py`](../ddl/ddl.py).

- **Base URL (dev):** `http://localhost:8080`
- **Base path:** `/api`
- **Auth:** none (public API for the scope of this milestone)
- **Content-Type:** `application/json` on all responses

## Error envelope

Every non-2xx response uses the same shape:

```json
{ "error": "Human-readable message", "details": <optional, any> }
```

| Status | Meaning |
|---|---|
| 400 | Bad/missing request parameter (validation failed) |
| 404 | Requested resource does not exist (unknown id/username/genre) |
| 500 | Unhandled server or database error |

## Pagination convention

Endpoints that return lists accept `limit` and `offset` query params. `limit`
is clamped to `[1, 100]` with default `20`; `offset` defaults to `0`. List
responses expose a `total` field (from a `COUNT(*) OVER()` window in the
underlying query) so the client can render pagination controls.

## Route index

| # | Method | Path | Query | Kind |
|---|---|---|---|---|
| 1 | GET | `/api/health` | — | aux |
| 2 | GET | `/api/options` | meta_options | aux |
| 3 | GET | `/api/genres` | S3 | small |
| 4 | GET | `/api/anime` | S2 | small |
| 5 | GET | `/api/anime/top` | S4 | small |
| 6 | GET | `/api/anime/:id` | S1 | small |
| 7 | GET | `/api/anime/:id/stats` | S6 | small |
| 8 | GET | `/api/users/:username` | S5 + S5b | small |
| 9 | GET | `/api/anime/:id/recommendations` | C7 | **complex** |
| 10 | GET | `/api/users/:a/compatibility/:b` | C8 | **complex** |
| 11 | GET | `/api/genres/:name/trend` | C9 | **complex** |
| 12 | GET | `/api/studios/quality` | C10 | **complex** |

---

## 1. GET /api/health

Liveness + DB probe. Runs `SELECT 1` through the connection pool.

**Request params** — none.

**Response 200** — `application/json`

```json
{ "ok": true, "db": "connected", "timestamp": "2026-04-18T22:30:00.000Z" }
```

| Field | Type | Description |
|---|---|---|
| `ok` | boolean | Always `true` when the server is reachable |
| `db` | string | `"connected"` or `"unreachable"` |
| `dbError` | string | Present only if `db` is `unreachable` |
| `timestamp` | string (ISO-8601) | Server time when the probe ran |

---

## 2. GET /api/options

Distinct values for UI dropdowns (anime types, sources, ratings, list
statuses) plus the min/max `aired_from_year` for range-pickers.

**Request params** — none.

**Response 200**

```json
{
  "types": ["Movie", "Music", "ONA", "OVA", "Special", "TV"],
  "sources": ["Manga", "Novel", "Original", "Visual novel", "..."],
  "ratings": ["G - All Ages", "PG - Children", "..."],
  "statuses": [
    { "id": 1, "name": "watching" },
    { "id": 2, "name": "completed" },
    { "id": 3, "name": "on_hold" },
    { "id": 4, "name": "dropped" },
    { "id": 6, "name": "plan_to_watch" }
  ],
  "min_year": 1917,
  "max_year": 2018,
  "cached": true
}
```

| Field | Type | Description |
|---|---|---|
| `types`, `sources`, `ratings` | string[] | Distinct non-null values from `anime` |
| `statuses` | `{id, name}[]` | Rows from `anime_list_status` |
| `min_year`, `max_year` | integer | Range of `anime.aired_from_year` |
| `cached` | boolean | `true` when served from the 5-min in-process cache |

---

## 3. GET /api/genres

List all genres with the number of anime tagged with each.

**Underlying query:** S3 ([`server/src/queries/s3_list_genres.sql`](../server/src/queries/s3_list_genres.sql))

**Request params** — none.

**Response 200**

```json
{ "genres": [ { "genre_id": 1, "genre_name": "Action", "anime_count": 1283 }, ... ] }
```

| Field | Type | Description |
|---|---|---|
| `genre_id` | integer | PK of `genres` |
| `genre_name` | string | Display name |
| `anime_count` | integer | Number of anime tagged with this genre |

---

## 4. GET /api/anime

Paginated anime search with filter chips. At least one filter is typical,
but all are optional.

**Underlying query:** S2 ([`server/src/queries/s2_search_anime.sql`](../server/src/queries/s2_search_anime.sql))

**Request params**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `q` | query | string (≤100) | no | Case-insensitive substring match on `title` or `title_english`. Server escapes `%`/`_`/`\` before binding. |
| `genre` | query | string (≤100) | no | Exact genre name; matched via `EXISTS` on the `anime_genres` junction |
| `type` | query | string (≤50) | no | Exact match on `anime.type` (e.g. `TV`, `Movie`) |
| `year_from` | query | integer | no | Lower bound on `aired_from_year` (inclusive) |
| `year_to` | query | integer | no | Upper bound on `aired_from_year` (inclusive) |
| `min_score` | query | number `[0,10]` | no | Lower bound on `anime.score` |
| `limit` | query | integer `[1,100]` | no | default 20 |
| `offset` | query | integer ≥ 0 | no | default 0 |

400 is returned when `year_from > year_to`.

**SQL params**

| Placeholder | Request param |
|---|---|
| `$1` | `q` (LIKE-escaped) or NULL |
| `$2` | `genre` or NULL |
| `$3` | `type` or NULL |
| `$4` | `year_from` or NULL |
| `$5` | `year_to` or NULL |
| `$6` | `min_score` or NULL |
| `$7` | `limit` |
| `$8` | `offset` |

**Response 200**

```json
{
  "total": 184,
  "limit": 20,
  "offset": 0,
  "results": [
    {
      "anime_id": 5114,
      "title": "Fullmetal Alchemist: Brotherhood",
      "title_english": "...",
      "type": "TV",
      "source": "Manga",
      "episodes": 64,
      "score": 9.22,
      "scored_by": 793700,
      "aired_from_year": 2009,
      "members": 1200000,
      "popularity": 3,
      "image_url": "https://cdn.myanimelist.net/..."
    }
  ]
}
```

---

## 5. GET /api/anime/top

Top-rated anime, optionally filtered by type. Filters out obscure titles via
a `scored_by` threshold.

**Underlying query:** S4 ([`server/src/queries/s4_top_anime.sql`](../server/src/queries/s4_top_anime.sql))

**Request params**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `type` | query | string (≤50) | no | e.g. `TV`, `Movie` |
| `min_scored_by` | query | integer | no | default `1000` |
| `limit` | query | integer `[1,100]` | no | default 20 |

**SQL params**

| Placeholder | Request param |
|---|---|
| `$1` | `type` or NULL |
| `$2` | `min_scored_by` |
| `$3` | `limit` |

**Response 200**

```json
{
  "results": [
    { "anime_id": 5114, "title": "Fullmetal Alchemist: Brotherhood",
      "type": "TV", "score": 9.22, "scored_by": 793700,
      "members": 1200000, "popularity": 3, "aired_from_year": 2009,
      "image_url": "..." }
  ]
}
```

---

## 6. GET /api/anime/:id

Fetch one anime with all associated dimensions (`genres`, `studios`,
`producers`, `licensors`) aggregated into arrays.

**Underlying query:** S1 ([`server/src/queries/s1_anime_by_id.sql`](../server/src/queries/s1_anime_by_id.sql))

**Request params**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer > 0 | yes | `anime.anime_id` |

**SQL params**

| Placeholder | Request param |
|---|---|
| `$1` | `id` |

**Response 200**

```json
{
  "anime_id": 5114,
  "title": "Fullmetal Alchemist: Brotherhood",
  "title_english": "...",
  "title_japanese": "...",
  "type": "TV",
  "source": "Manga",
  "episodes": 64,
  "status": "Finished Airing",
  "airing": false,
  "score": 9.22,
  "scored_by": 793700,
  "rank": 1,
  "popularity": 3,
  "members": 1200000,
  "aired_from_year": 2009,
  "duration_min": 24.0,
  "rating": "R - 17+",
  "image_url": "...",
  "opening_theme": "...",
  "ending_theme": "...",
  "genres":    ["Action", "Adventure", "Drama", "Fantasy"],
  "studios":   ["Bones"],
  "producers": ["Aniplex", "Square Enix"],
  "licensors": ["Funimation", "Aniplex of America"]
}
```

All scalar fields mirror the columns on the `anime` table (see
[`ddl/ddl.py:97-127`](../ddl/ddl.py#L97-L127)). The four array fields are
aggregated via `ARRAY_AGG(DISTINCT ...) FILTER (WHERE ... IS NOT NULL)` and
return `[]` when no rows exist on the corresponding junction.

**Errors**

| Status | When |
|---|---|
| 400 | `id` not a positive integer |
| 404 | No row in `anime` with that id |

---

## 7. GET /api/anime/:id/stats

User score distribution (histogram) for a single anime. Returns 10 buckets
(`FLOOR(my_score) ∈ [1,10]`) always — zero-filled for missing buckets.

**Underlying query:** S6 ([`server/src/queries/s6_anime_score_histogram.sql`](../server/src/queries/s6_anime_score_histogram.sql))

**Request params**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer > 0 | yes | `anime.anime_id` |

**Response 200**

```json
{
  "anime_id": 5114,
  "total_ratings": 793700,
  "histogram": [
    { "bucket": 1, "n": 2100 },
    { "bucket": 2, "n": 1400 },
    ...
    { "bucket": 10, "n": 312500 }
  ]
}
```

| Field | Type | Description |
|---|---|---|
| `total_ratings` | integer | Sum of `n` across buckets |
| `histogram[].bucket` | integer | Score bucket, 1–10 |
| `histogram[].n` | integer | Number of users who rated this bucket |

---

## 8. GET /api/users/:username

User profile + top-N of their rated anime.

**Underlying queries:** S5
([`s5_user_profile.sql`](../server/src/queries/s5_user_profile.sql)) and
S5b
([`s5b_user_top_anime.sql`](../server/src/queries/s5b_user_top_anime.sql)).

**Request params**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `username` | path | string (non-empty) | yes | Exact match on `users.username` |
| `top` | query | integer `[1,50]` | no | default 5 — number of top-rated anime to include |

**SQL params (S5)**

| Placeholder | Request param |
|---|---|
| `$1` | `username` |

**SQL params (S5b)**

| Placeholder | Request param |
|---|---|
| `$1` | `username` |
| `$2` | `top` |

**Response 200**

```json
{
  "profile": {
    "user_id": 12345,
    "username": "anime_fan_42",
    "gender": "...",
    "location": "...",
    "birth_date": "1998-04-21",
    "join_date": "2014-01-15",
    "last_online": "2018-12-31T22:11:00.000Z",
    "user_watching": 12,
    "user_completed": 189,
    "user_onhold": 3,
    "user_dropped": 7,
    "user_plantowatch": 55,
    "user_days_spent_watching": 42.37,
    "stats_mean_score": 7.85,
    "stats_episodes": 4921,
    "stats_rewatched": 12,
    "list_entries": 266,
    "completed_in_list": 189,
    "computed_mean_score": 7.91
  },
  "top_anime": [
    { "anime_id": 5114, "title": "Fullmetal Alchemist: Brotherhood",
      "type": "TV", "mal_score": 9.22, "my_score": 10, "my_watched_episodes": 64,
      "status_id": 2, "status_name": "completed", "image_url": "..." }
  ]
}
```

**Errors**

| Status | When |
|---|---|
| 400 | `username` is empty |
| 404 | No user with that username |

---

## 9. GET /api/anime/:id/recommendations — complex

"Users who completed *this anime* with score ≥ 8 also completed ___ with
score ≥ 7." Self-join on `user_anime_list`. **Intentionally slow on the full
UAL**; this is one of the two queries whose optimization story (indexing +
potentially materialized views) will be reported in M5.

**Underlying query:** C7 ([`c7_recommendations.sql`](../server/src/queries/c7_recommendations.sql))

**Request params**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer > 0 | yes | Source anime |
| `min_co_viewers` | query | integer `[1,10000]` | no | default 10 — `HAVING COUNT(*) >= ?` threshold |
| `limit` | query | integer `[1,100]` | no | default 20 |

**SQL params**

| Placeholder | Request param |
|---|---|
| `$1` | `id` |
| `$2` | `min_co_viewers` |
| `$3` | `limit` |

**Response 200**

```json
{
  "anime_id": 5114,
  "params": { "min_co_viewers": 10, "limit": 20 },
  "results": [
    { "anime_id": 11061, "title": "Hunter x Hunter (2011)",
      "type": "TV", "mal_score": 9.09, "image_url": "...",
      "aired_from_year": 2011,
      "co_viewers": 48213, "avg_co_score": 9.12 }
  ]
}
```

| Field | Type | Description |
|---|---|---|
| `co_viewers` | integer | Users who completed both anime with scores meeting thresholds |
| `avg_co_score` | number | Mean of co-viewers' score on the recommended anime |

---

## 10. GET /api/users/:a/compatibility/:b — complex

Compare two users' tastes. Returns overlap count, Pearson correlation, mean
absolute score diff, and up to 10 "agreement" anime (where
`|score_a − score_b| ≤ 1`).

**Underlying query:** C8 ([`c8_user_compat.sql`](../server/src/queries/c8_user_compat.sql))

**Request params**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `a` | path | string (non-empty) | yes | First username |
| `b` | path | string (non-empty) | yes | Second username — must differ from `a` |

**SQL params**

| Placeholder | Request param |
|---|---|
| `$1` | `a` |
| `$2` | `b` |

**Response 200**

```json
{
  "user_a": "alice",
  "user_b": "bob",
  "overlap": 57,
  "pearson": 0.712,
  "mean_abs_diff": 0.842,
  "top_agreements": [
    { "anime_id": 5114, "title": "Fullmetal Alchemist: Brotherhood",
      "score_a": 10, "score_b": 10 }
  ]
}
```

| Field | Type | Description |
|---|---|---|
| `overlap` | integer | Anime both users rated (both scores > 0) |
| `pearson` | number \| null | Pearson correlation coefficient; null when overlap < 2 |
| `mean_abs_diff` | number \| null | Mean \|score_a − score_b\|; null when overlap = 0 |
| `top_agreements` | object[] | Up to 10 anime sorted by `score_a + score_b` desc |

**Errors**

| Status | When |
|---|---|
| 400 | `a` or `b` empty, or `a === b` |
| 404 | Either username not found |

---

## 11. GET /api/genres/:name/trend — complex

Year-by-year aggregate (average score, release count, average member count)
for a genre, with a correlated subquery picking the top-rated anime of that
genre in each year.

**Underlying query:** C9 ([`c9_genre_trend.sql`](../server/src/queries/c9_genre_trend.sql))

**Request params**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `name` | path | string (non-empty) | yes | Exact match on `genres.genre_name` |
| `year_from` | query | integer `[1900,2100]` | no | default 1990 |
| `year_to` | query | integer `[1900,2100]` | no | default current year |

400 when `year_from > year_to`.

**SQL params**

| Placeholder | Request param |
|---|---|
| `$1` | `name` |
| `$2` | `year_from` |
| `$3` | `year_to` |

**Response 200**

```json
{
  "genre": "Action",
  "year_from": 1990,
  "year_to": 2018,
  "points": [
    { "year": 1990, "releases": 14, "avg_score": 7.12, "avg_members": 24500, "top_title": "..." },
    { "year": 1991, "releases": 17, "avg_score": 7.04, "avg_members": 19800, "top_title": "..." }
  ]
}
```

---

## 12. GET /api/studios/quality — complex (universal check)

Studios where **every** anime they produced has `score ≥ score_floor`, and
the studio has ≥ `min_productions` works. Implemented via `NOT EXISTS`
(the classic universal-as-negation transformation).

**Underlying query:** C10 ([`c10_quality_studios.sql`](../server/src/queries/c10_quality_studios.sql))

**Request params**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `min_productions` | query | integer `[1,1000]` | no | default 5 |
| `score_floor` | query | number `[0,10]` | no | default 7 |

**SQL params**

| Placeholder | Request param |
|---|---|
| `$1` | `min_productions` |
| `$2` | `score_floor` |

**Response 200**

```json
{
  "min_productions": 5,
  "score_floor": 7,
  "results": [
    { "studio_name": "Kyoto Animation",
      "productions": 28, "avg_score": 7.82, "min_score": 7.03, "max_score": 9.05 }
  ]
}
```

| Field | Type | Description |
|---|---|---|
| `productions` | integer | Distinct anime produced by this studio with non-null scores |
| `avg_score` / `min_score` / `max_score` | number | Score aggregates; `min_score` is guaranteed ≥ `score_floor` by the universal predicate |

---

## Rendering to PDF for Gradescope

```bash
cd docs
pandoc api_spec.md -o api_spec.pdf \
  --pdf-engine=xelatex \
  --variable geometry:margin=1in \
  --variable fontsize=11pt \
  --toc --toc-depth=2
```

If `pandoc` isn't installed, the team can open `api_spec.md` in VS Code,
use the Markdown preview, and export via "Print → Save as PDF". Any
markdown-to-PDF renderer will work — the content is the deliverable, the
rendering is just presentation.
