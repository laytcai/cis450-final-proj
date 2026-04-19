-- S5b — Top-N anime from a user's list (by their own score).
-- Params: $1 = username, $2 = limit
SELECT a.anime_id,
       a.title,
       a.title_english,
       a.type,
       a.score       AS mal_score,
       a.image_url,
       ual.my_score,
       ual.my_watched_episodes,
       ual.status_id,
       als.status_name
FROM user_anime_list ual
JOIN users             u   ON u.user_id   = ual.user_id
JOIN anime             a   ON a.anime_id  = ual.anime_id
LEFT JOIN anime_list_status als ON als.status_id = ual.status_id
WHERE u.username = $1
  AND ual.my_score IS NOT NULL
  AND ual.my_score > 0
ORDER BY ual.my_score DESC, a.score DESC NULLS LAST
LIMIT $2;
