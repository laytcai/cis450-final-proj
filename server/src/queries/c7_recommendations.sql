-- C7 — Collaborative "users who liked X also liked Y" recommendations.
-- Joins user_anime_list to itself via user_id; intentionally expensive on the full UAL.
-- Params:
--   $1 int — anime_id of the source anime
--   $2 int — min_co_viewers (HAVING threshold)
--   $3 int — limit
SELECT a2.anime_id,
       a2.title,
       a2.title_english,
       a2.type,
       a2.score AS mal_score,
       a2.image_url,
       a2.aired_from_year,
       COUNT(*)::INT AS co_viewers,
       ROUND(AVG(ual2.my_score)::numeric, 2) AS avg_co_score
FROM user_anime_list ual1
JOIN user_anime_list ual2
  ON ual1.user_id  = ual2.user_id
 AND ual2.anime_id <> ual1.anime_id
JOIN anime a2 ON a2.anime_id = ual2.anime_id
WHERE ual1.anime_id = $1
  AND ual1.status_id = 2 AND ual1.my_score >= 8
  AND ual2.status_id = 2 AND ual2.my_score >= 7
GROUP BY a2.anime_id, a2.title, a2.title_english, a2.type, a2.score, a2.image_url, a2.aired_from_year
HAVING COUNT(*) >= $2
ORDER BY co_viewers DESC, avg_co_score DESC
LIMIT $3;
