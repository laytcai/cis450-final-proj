-- S5 — User profile with aggregated list stats.
-- Params: $1 = username
SELECT u.user_id,
       u.username,
       u.gender,
       u.location,
       u.birth_date,
       u.join_date,
       u.last_online,
       u.user_watching,
       u.user_completed,
       u.user_onhold,
       u.user_dropped,
       u.user_plantowatch,
       u.user_days_spent_watching,
       u.stats_mean_score,
       u.stats_episodes,
       u.stats_rewatched,
       COUNT(ual.anime_id)::INT AS list_entries,
       (COUNT(ual.anime_id) FILTER (WHERE ual.status_id = 2))::INT AS completed_in_list,
       ROUND(
         AVG(ual.my_score) FILTER (WHERE ual.my_score IS NOT NULL AND ual.my_score > 0)::numeric,
         2
       ) AS computed_mean_score
FROM users u
LEFT JOIN user_anime_list ual ON ual.user_id = u.user_id
WHERE u.username = $1
GROUP BY u.user_id;
