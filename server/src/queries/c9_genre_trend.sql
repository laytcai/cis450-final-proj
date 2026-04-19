-- C9 — Per-year aggregate for a genre, with a correlated subquery picking
-- the top-scoring anime of that genre in each year.
-- Params: $1 = genre_name, $2 = year_from, $3 = year_to
SELECT a.aired_from_year AS year,
       COUNT(*)::INT AS releases,
       ROUND(AVG(a.score)::numeric, 2) AS avg_score,
       ROUND(AVG(a.members)::numeric, 0)::BIGINT AS avg_members,
       (SELECT a2.title
          FROM anime a2
          JOIN anime_genres ag2 ON ag2.anime_id = a2.anime_id
         WHERE ag2.genre_id = g.genre_id
           AND a2.aired_from_year = a.aired_from_year
           AND a2.score IS NOT NULL
         ORDER BY a2.score DESC NULLS LAST, a2.scored_by DESC NULLS LAST
         LIMIT 1) AS top_title
FROM anime a
JOIN anime_genres ag ON ag.anime_id  = a.anime_id
JOIN genres       g  ON g.genre_id   = ag.genre_id
WHERE g.genre_name = $1
  AND a.aired_from_year BETWEEN $2 AND $3
  AND a.score IS NOT NULL
GROUP BY a.aired_from_year, g.genre_id
ORDER BY year;
