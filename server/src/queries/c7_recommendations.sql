-- C7 - Collaborative "users who liked X also liked Y" recommendations.
-- Uses completed_high_score_lists, a materialized view of completed UAL rows
-- with scores >= 7. Rebuild it after reloading user_anime_list.
-- Params:
--   $1 int - anime_id of the source anime
--   $2 int - min_co_viewers (HAVING threshold)
--   $3 int - limit
WITH seed_users AS (
  SELECT user_id
  FROM completed_high_score_lists
  WHERE anime_id = $1
    AND my_score >= 8
)
SELECT a2.anime_id,
       a2.title,
       a2.title_english,
       a2.type,
       a2.score AS mal_score,
       a2.image_url,
       a2.aired_from_year,
       COUNT(*)::INT AS co_viewers,
       ROUND(AVG(c.my_score)::numeric, 2) AS avg_co_score
FROM seed_users su
JOIN completed_high_score_lists c
  ON c.user_id = su.user_id
 AND c.anime_id <> $1
JOIN anime a2 ON a2.anime_id = c.anime_id
GROUP BY a2.anime_id, a2.title, a2.title_english, a2.type,
         a2.score, a2.image_url, a2.aired_from_year
HAVING COUNT(*) >= $2
ORDER BY co_viewers DESC, avg_co_score DESC
LIMIT $3;
