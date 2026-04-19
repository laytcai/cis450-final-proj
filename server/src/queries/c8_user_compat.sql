-- C8 — Compatibility score between two users.
-- Returns overlap count, Pearson correlation, mean absolute diff,
-- and a JSON array of up to 10 "agreement" anime (where |score_a - score_b| ≤ 1).
-- Params: $1 = username_a, $2 = username_b
WITH ids AS (
  SELECT (SELECT user_id FROM users WHERE username = $1) AS a,
         (SELECT user_id FROM users WHERE username = $2) AS b
),
pairs AS (
  SELECT u1.anime_id,
         u1.my_score AS sa,
         u2.my_score AS sb
  FROM user_anime_list u1
  JOIN user_anime_list u2 ON u2.anime_id = u1.anime_id
  CROSS JOIN ids
  WHERE u1.user_id = ids.a
    AND u2.user_id = ids.b
    AND u1.my_score IS NOT NULL AND u1.my_score > 0
    AND u2.my_score IS NOT NULL AND u2.my_score > 0
)
SELECT
  (SELECT a FROM ids) AS user_a_id,
  (SELECT b FROM ids) AS user_b_id,
  (SELECT COUNT(*)::INT FROM pairs)                          AS overlap,
  (SELECT ROUND(CORR(sa, sb)::numeric, 3)     FROM pairs)    AS pearson,
  (SELECT ROUND(AVG(ABS(sa - sb))::numeric, 3) FROM pairs)   AS mean_abs_diff,
  COALESCE(
    (SELECT JSON_AGG(t) FROM (
        SELECT a.anime_id,
               a.title,
               p.sa::float AS score_a,
               p.sb::float AS score_b
        FROM pairs p
        JOIN anime a ON a.anime_id = p.anime_id
        WHERE ABS(p.sa - p.sb) <= 1
        ORDER BY (p.sa + p.sb) DESC
        LIMIT 10
    ) t),
    '[]'::json
  ) AS top_agreements;
