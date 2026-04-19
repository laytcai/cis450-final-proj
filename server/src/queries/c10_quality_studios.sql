-- C10 — Universal check: studios where EVERY produced anime has score ≥ $2,
-- and the studio has at least $1 productions.
-- Uses NOT EXISTS for the "all satisfy" predicate.
-- Params: $1 = min_productions, $2 = score_floor
SELECT s.studio_name,
       COUNT(DISTINCT a.anime_id)::INT AS productions,
       ROUND(AVG(a.score)::numeric, 2) AS avg_score,
       MIN(a.score) AS min_score,
       MAX(a.score) AS max_score
FROM studios        s
JOIN anime_studios  asx ON asx.studio_id = s.studio_id
JOIN anime          a   ON a.anime_id    = asx.anime_id
WHERE a.score IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM anime_studios asx2
    JOIN anime a2 ON a2.anime_id = asx2.anime_id
    WHERE asx2.studio_id = s.studio_id
      AND (a2.score < $2 OR a2.score IS NULL)
  )
GROUP BY s.studio_name
HAVING COUNT(DISTINCT a.anime_id) >= $1
ORDER BY avg_score DESC, productions DESC;
