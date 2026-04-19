-- S3 — List all genres with anime count.
-- Params: none
SELECT g.genre_id,
       g.genre_name,
       COUNT(ag.anime_id)::INT AS anime_count
FROM genres g
LEFT JOIN anime_genres ag ON ag.genre_id = g.genre_id
GROUP BY g.genre_id, g.genre_name
ORDER BY anime_count DESC, g.genre_name;
