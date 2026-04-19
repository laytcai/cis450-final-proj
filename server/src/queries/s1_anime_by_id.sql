-- S1 — Fetch a single anime with aggregated genres, studios, producers, licensors.
-- Params: $1 = anime_id
SELECT a.anime_id,
       a.title,
       a.title_english,
       a.title_japanese,
       a.title_synonyms,
       a.image_url,
       a.type,
       a.source,
       a.episodes,
       a.status,
       a.airing,
       a.aired_string,
       a.duration,
       a.duration_min,
       a.aired_from_year,
       a.rating,
       a.score,
       a.scored_by,
       a.rank,
       a.popularity,
       a.members,
       a.favorites,
       a.background,
       a.premiered,
       a.broadcast,
       a.related,
       a.opening_theme,
       a.ending_theme,
       COALESCE(
         ARRAY_AGG(DISTINCT g.genre_name)    FILTER (WHERE g.genre_name    IS NOT NULL),
         ARRAY[]::text[]
       ) AS genres,
       COALESCE(
         ARRAY_AGG(DISTINCT s.studio_name)   FILTER (WHERE s.studio_name   IS NOT NULL),
         ARRAY[]::text[]
       ) AS studios,
       COALESCE(
         ARRAY_AGG(DISTINCT p.producer_name) FILTER (WHERE p.producer_name IS NOT NULL),
         ARRAY[]::text[]
       ) AS producers,
       COALESCE(
         ARRAY_AGG(DISTINCT l.licensor_name) FILTER (WHERE l.licensor_name IS NOT NULL),
         ARRAY[]::text[]
       ) AS licensors
FROM anime a
LEFT JOIN anime_genres    ag  ON ag.anime_id  = a.anime_id
LEFT JOIN genres          g   ON g.genre_id   = ag.genre_id
LEFT JOIN anime_studios   asx ON asx.anime_id = a.anime_id
LEFT JOIN studios         s   ON s.studio_id  = asx.studio_id
LEFT JOIN anime_producers ap  ON ap.anime_id  = a.anime_id
LEFT JOIN producers       p   ON p.producer_id = ap.producer_id
LEFT JOIN anime_licensors al  ON al.anime_id  = a.anime_id
LEFT JOIN licensors       l   ON l.licensor_id = al.licensor_id
WHERE a.anime_id = $1
GROUP BY a.anime_id;
