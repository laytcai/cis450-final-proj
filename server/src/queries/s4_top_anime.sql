-- S4 — Top anime by score, optionally filtered by type.
-- Params:
--   $1 text — anime type (NULL = any)
--   $2 int  — min scored_by threshold to exclude obscure titles
--   $3 int  — limit
SELECT a.anime_id,
       a.title,
       a.title_english,
       a.type,
       a.score,
       a.scored_by,
       a.members,
       a.popularity,
       a.aired_from_year,
       a.image_url
FROM anime a
WHERE a.score IS NOT NULL
  AND a.scored_by IS NOT NULL
  AND a.scored_by >= $2
  AND ($1::text IS NULL OR a.type = $1)
ORDER BY a.score DESC NULLS LAST, a.scored_by DESC NULLS LAST
LIMIT $3;
