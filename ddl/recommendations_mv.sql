-- ============================================================================
-- M5 OPTIMIZATION LAYER FOR THE C7 RECOMMENDATIONS ROUTE
-- ============================================================================
-- Three-stage optimization on /api/anime/:id/recommendations:
--   1. Raw 3-way self-join on user_anime_list .................... ~35 s
--   2. + completed_high_score_lists materialized view ........... ~8.5 s
--   3. + anime_recommendations precomputed pairs ................. <50 ms
--
-- Run this script ONCE after the main ddl.py pipeline finishes, and rerun the
-- final `CALL build_anime_recs();` block after any reload of user_anime_list.
--
-- ----------------------------------------------------------------------------
-- DataGrip / psql notes
-- ----------------------------------------------------------------------------
-- The build procedure issues `COMMIT` per loop iteration to keep temp files
-- bounded (a one-shot all-pairs MV blew RDS disk). That requires the CALL to
-- run with auto-commit enabled. In DataGrip: set the console's Tx dropdown to
-- "Auto" before running `CALL build_anime_recs()`. In psql: the default mode
-- is fine.
--
-- The script is idempotent: re-running it drops/recreates structural objects
-- and uses ON CONFLICT DO NOTHING in the procedure so a partial build can be
-- resumed by simply re-issuing CALL.
-- ============================================================================


-- ============================================================================
-- STAGE 1 — completed_high_score_lists (CHSL)
-- Filter UAL once to the rows that the recommendation logic actually scans:
-- completed entries with my_score >= 7. Indexed for both directions of the
-- self-join (anime -> users, users -> anime).
-- ============================================================================

DROP MATERIALIZED VIEW IF EXISTS completed_high_score_lists CASCADE;

CREATE MATERIALIZED VIEW completed_high_score_lists AS
SELECT user_id, anime_id, my_score
FROM user_anime_list
WHERE status_id = 2
  AND my_score >= 7;

CREATE INDEX idx_chsl_anime_user_score
  ON completed_high_score_lists (anime_id, user_id, my_score);

CREATE INDEX idx_chsl_user_anime_score
  ON completed_high_score_lists (user_id, anime_id, my_score);

ANALYZE completed_high_score_lists;


-- ============================================================================
-- STAGE 2 — anime_recommendations precomputed pairs
-- For each "popular enough" seed anime, store the top-50 co-viewed anime
-- (HAVING COUNT(*) >= 50). Built one seed at a time so each iteration's
-- intermediate hash stays small and a per-iteration COMMIT clears temp files.
-- ============================================================================

-- Result table (NOT a materialized view, so the procedure can incrementally
-- INSERT into it across many transactions).
DROP TABLE IF EXISTS anime_recommendations;

CREATE TABLE anime_recommendations (
  seed_anime_id INT NOT NULL,
  rec_anime_id  INT NOT NULL,
  co_viewers    INT NOT NULL,
  avg_co_score  NUMERIC(4,2) NOT NULL,
  PRIMARY KEY (seed_anime_id, rec_anime_id)
);

-- Which anime are popular enough to be worth precomputing recommendations for.
-- Threshold (200) is tunable: lower = more coverage but longer build.
DROP TABLE IF EXISTS seed_anime_list;

CREATE TABLE seed_anime_list AS
SELECT anime_id
FROM completed_high_score_lists
WHERE my_score >= 8
GROUP BY anime_id
HAVING COUNT(*) >= 200;

-- Build procedure. PROCEDURE (not FUNCTION/DO-block) so it can issue COMMIT
-- mid-execution. Each iteration is its own transaction; partial progress
-- survives Ctrl-C and can be resumed by re-running CALL build_anime_recs().
CREATE OR REPLACE PROCEDURE build_anime_recs() LANGUAGE plpgsql AS $$
DECLARE
  a     INT;
  done  INT := 0;
  total INT;
BEGIN
  SELECT COUNT(*) INTO total FROM seed_anime_list;

  FOR a IN SELECT anime_id FROM seed_anime_list LOOP
    INSERT INTO anime_recommendations
    SELECT a,
           c.anime_id,
           COUNT(*)::INT,
           ROUND(AVG(c.my_score)::numeric, 2)
    FROM completed_high_score_lists seed
    JOIN completed_high_score_lists c
      ON c.user_id  = seed.user_id
     AND c.anime_id <> a
    WHERE seed.anime_id = a
      AND seed.my_score >= 8
    GROUP BY c.anime_id
    HAVING COUNT(*) >= 50
    ORDER BY COUNT(*) DESC
    LIMIT 50
    ON CONFLICT (seed_anime_id, rec_anime_id) DO NOTHING;

    done := done + 1;
    COMMIT;

    IF done % 25 = 0 THEN
      RAISE NOTICE 'build_anime_recs progress: % / %', done, total;
    END IF;
  END LOOP;
END $$;

-- Kick off the build. Expect tens of minutes on a populated UAL; safe to
-- cancel and resume.
CALL build_anime_recs();

-- Lookup index for the runtime query in c7_recommendations.sql.
-- Created AFTER the build so iteration INSERTs don't pay maintenance cost.
CREATE INDEX IF NOT EXISTS idx_anime_recs_seed_co
  ON anime_recommendations (seed_anime_id, co_viewers DESC);

ANALYZE anime_recommendations;


-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Coverage sanity
SELECT (SELECT COUNT(*) FROM seed_anime_list)              AS seeds_planned,
       (SELECT COUNT(DISTINCT seed_anime_id)
          FROM anime_recommendations)                       AS seeds_built,
       (SELECT COUNT(*) FROM anime_recommendations)        AS total_pairs,
       pg_size_pretty(pg_total_relation_size('anime_recommendations'))
                                                            AS table_size;

-- Sample lookup against a known popular anime (Fullmetal Alchemist:
-- Brotherhood = 5114). Should return in <50ms with the EXPLAIN ANALYZE plan
-- showing an index scan on idx_anime_recs_seed_co + a lookup into anime.
EXPLAIN ANALYZE
SELECT a2.anime_id, a2.title, a2.title_english, a2.type,
       a2.score AS mal_score, a2.image_url, a2.aired_from_year,
       r.co_viewers, r.avg_co_score
FROM anime_recommendations r
JOIN anime a2 ON a2.anime_id = r.rec_anime_id
WHERE r.seed_anime_id = 5114
ORDER BY r.co_viewers DESC, r.avg_co_score DESC
LIMIT 10;


-- ============================================================================
-- ROLLBACK (uncomment if you need to start over)
-- ============================================================================
-- DROP TABLE         IF EXISTS anime_recommendations;
-- DROP TABLE         IF EXISTS seed_anime_list;
-- DROP PROCEDURE     IF EXISTS build_anime_recs();
-- DROP MATERIALIZED VIEW IF EXISTS completed_high_score_lists CASCADE;
