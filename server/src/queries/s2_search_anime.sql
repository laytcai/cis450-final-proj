-- S2 — Filtered anime search with pagination.
-- Params:
--   $1 text  — title search (NULL = no filter); server-side escapes %/_ before binding
--   $2 text  — genre name  (NULL = no filter)
--   $3 text  — anime type  (NULL = no filter)
--   $4 int   — year_from   (NULL = no lower bound)
--   $5 int   — year_to     (NULL = no upper bound)
--   $6 numeric — min_score (NULL = no floor)
--   $7 int   — limit
--   $8 int   — offset
-- Returns rows plus total_count via window function so the client can paginate.
SELECT a.anime_id,
       a.title,
       a.title_english,
       a.type,
       a.source,
       a.episodes,
       a.score,
       a.scored_by,
       a.aired_from_year,
       a.members,
       a.popularity,
       a.image_url,
       (COUNT(*) OVER())::INT AS total_count
FROM anime a
WHERE ($1::text IS NULL
       OR a.title         ILIKE '%' || $1 || '%' ESCAPE '\'
       OR a.title_english ILIKE '%' || $1 || '%' ESCAPE '\')
  AND ($2::text IS NULL OR EXISTS (
        SELECT 1 FROM anime_genres ag
        JOIN genres g ON g.genre_id = ag.genre_id
        WHERE ag.anime_id = a.anime_id AND g.genre_name = $2
      ))
  AND ($3::text   IS NULL OR a.type = $3)
  AND ($4::int    IS NULL OR a.aired_from_year >= $4)
  AND ($5::int    IS NULL OR a.aired_from_year <= $5)
  AND ($6::numeric IS NULL OR a.score >= $6)
ORDER BY a.score DESC NULLS LAST, a.popularity ASC NULLS LAST
LIMIT $7 OFFSET $8;
