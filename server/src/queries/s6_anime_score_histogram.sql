-- S6 — Score histogram for a single anime.
-- Aggregates first then fills empty buckets via LEFT JOIN — avoids per-row
-- bucket matching and enables index-only scan on idx_ual_anime_score.
-- Params: $1 = anime_id
SELECT b.bucket,
       COALESCE(counts.n, 0)::INT AS n
FROM generate_series(1, 10) AS b(bucket)
LEFT JOIN (
  SELECT FLOOR(my_score)::INT AS bucket,
         COUNT(*)::INT        AS n
  FROM user_anime_list
  WHERE anime_id  = $1
    AND my_score IS NOT NULL
    AND my_score  > 0
  GROUP BY FLOOR(my_score)::INT
) counts ON counts.bucket = b.bucket
ORDER BY b.bucket;
