-- S6 — User score distribution (histogram) for a single anime.
-- Params: $1 = anime_id
WITH buckets AS (
  SELECT generate_series(1, 10) AS bucket
)
SELECT b.bucket,
       COALESCE(COUNT(ual.my_score), 0)::INT AS n
FROM buckets b
LEFT JOIN user_anime_list ual
  ON ual.anime_id = $1
 AND ual.my_score IS NOT NULL
 AND ual.my_score > 0
 AND FLOOR(ual.my_score)::INT = b.bucket
GROUP BY b.bucket
ORDER BY b.bucket;
