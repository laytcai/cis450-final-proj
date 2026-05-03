-- C7 - Collaborative "users who liked X also liked Y" recommendations.
-- Reads precomputed pairs from anime_recommendations (top-50 per seed,
-- co_viewers >= 50, built by build_anime_recs() against
-- completed_high_score_lists). Falls back to no rows for seeds that were
-- not popular enough to be precomputed.
-- Params:
--   $1 int - anime_id of the source anime
--   $2 int - min_co_viewers (additional HAVING-style floor on the cached rows)
--   $3 int - limit
SELECT a2.anime_id,
       a2.title,
       a2.title_english,
       a2.type,
       a2.score AS mal_score,
       a2.image_url,
       a2.aired_from_year,
       r.co_viewers,
       r.avg_co_score
FROM anime_recommendations r
JOIN anime a2 ON a2.anime_id = r.rec_anime_id
WHERE r.seed_anime_id = $1
  AND r.co_viewers   >= $2
ORDER BY r.co_viewers DESC, r.avg_co_score DESC
LIMIT $3;
