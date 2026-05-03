# Step 1: create a fresh database
str1 = """
CREATE DATABASE anime_analytics;
"""

# Step 2: create raw import tables
str2 = """
DROP TABLE IF EXISTS raw_user_anime_list;
DROP TABLE IF EXISTS raw_users;
DROP TABLE IF EXISTS raw_anime;

CREATE TABLE raw_anime (
    anime_id TEXT,
    title TEXT,
    title_english TEXT,
    title_japanese TEXT,
    title_synonyms TEXT,
    image_url TEXT,
    type TEXT,
    source TEXT,
    episodes TEXT,
    status TEXT,
    airing TEXT,
    aired_string TEXT,
    aired TEXT,
    duration TEXT,
    rating TEXT,
    score TEXT,
    scored_by TEXT,
    rank TEXT,
    popularity TEXT,
    members TEXT,
    favorites TEXT,
    background TEXT,
    premiered TEXT,
    broadcast TEXT,
    related TEXT,
    producer TEXT,
    licensor TEXT,
    studio TEXT,
    genre TEXT,
    opening_theme TEXT,
    ending_theme TEXT,
    duration_min TEXT,
    aired_from_year TEXT
);

CREATE TABLE raw_users (
    username TEXT,
    user_id TEXT,
    user_watching TEXT,
    user_completed TEXT,
    user_onhold TEXT,
    user_dropped TEXT,
    user_plantowatch TEXT,
    user_days_spent_watching TEXT,
    gender TEXT,
    location TEXT,
    birth_date TEXT,
    access_rank TEXT,
    join_date TEXT,
    last_online TEXT,
    stats_mean_score TEXT,
    stats_rewatched TEXT,
    stats_episodes TEXT
);

CREATE TABLE raw_user_anime_list (
    username TEXT,
    anime_id TEXT,
    my_watched_episodes TEXT,
    my_start_date TEXT,
    my_finish_date TEXT,
    my_score TEXT,
    my_status TEXT,
    my_rewatching TEXT,
    my_rewatching_ep TEXT,
    my_last_updated TEXT
);
"""

# Step 4: create the final normalized schema
str4 = """
DROP MATERIALIZED VIEW IF EXISTS completed_high_score_lists;
DROP TABLE IF EXISTS anime_licensors;
DROP TABLE IF EXISTS anime_producers;
DROP TABLE IF EXISTS anime_studios;
DROP TABLE IF EXISTS anime_genres;
DROP TABLE IF EXISTS user_anime_list;
DROP TABLE IF EXISTS anime_list_status;
DROP TABLE IF EXISTS licensors;
DROP TABLE IF EXISTS producers;
DROP TABLE IF EXISTS studios;
DROP TABLE IF EXISTS genres;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS anime;

CREATE TABLE anime (
    anime_id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    title_english TEXT,
    title_japanese TEXT,
    title_synonyms TEXT,
    image_url TEXT,
    type VARCHAR(50),
    source VARCHAR(100),
    episodes INTEGER CHECK (episodes >= 0),
    status VARCHAR(100),
    airing BOOLEAN,
    aired_string TEXT,
    aired TEXT,
    duration VARCHAR(100),
    duration_min NUMERIC(8,2),
    aired_from_year INTEGER,
    rating VARCHAR(100),
    score NUMERIC(4,2) CHECK (score BETWEEN 0 AND 10),
    scored_by INTEGER CHECK (scored_by >= 0),
    rank INTEGER,
    popularity INTEGER,
    members INTEGER,
    favorites INTEGER,
    background TEXT,
    premiered VARCHAR(100),
    broadcast VARCHAR(200),
    related TEXT,
    opening_theme TEXT,
    ending_theme TEXT
);

CREATE TABLE users (
    user_id INTEGER PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    user_watching INTEGER DEFAULT 0,
    user_completed INTEGER DEFAULT 0,
    user_onhold INTEGER DEFAULT 0,
    user_dropped INTEGER DEFAULT 0,
    user_plantowatch INTEGER DEFAULT 0,
    user_days_spent_watching NUMERIC(12,4),
    gender VARCHAR(50),
    location TEXT,
    birth_date DATE,
    access_rank NUMERIC(10,2),
    join_date DATE,
    last_online TIMESTAMP,
    stats_mean_score NUMERIC(4,2),
    stats_rewatched INTEGER DEFAULT 0,
    stats_episodes INTEGER DEFAULT 0
);

CREATE TABLE anime_list_status (
    status_id SMALLINT PRIMARY KEY,
    status_name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE user_anime_list (
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    anime_id INTEGER NOT NULL REFERENCES anime(anime_id) ON DELETE CASCADE,
    my_watched_episodes INTEGER DEFAULT 0 CHECK (my_watched_episodes >= 0),
    my_start_date DATE,
    my_finish_date DATE,
    my_score NUMERIC(4,2) CHECK (my_score BETWEEN 0 AND 10),
    status_id SMALLINT REFERENCES anime_list_status(status_id),
    my_rewatching BOOLEAN,
    my_rewatching_ep INTEGER DEFAULT 0 CHECK (my_rewatching_ep >= 0),
    my_last_updated TIMESTAMP,
    PRIMARY KEY (user_id, anime_id)
);

CREATE TABLE genres (
    genre_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    genre_name TEXT NOT NULL UNIQUE
);

CREATE TABLE studios (
    studio_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    studio_name TEXT NOT NULL UNIQUE
);

CREATE TABLE producers (
    producer_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    producer_name TEXT NOT NULL UNIQUE
);

CREATE TABLE licensors (
    licensor_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    licensor_name TEXT NOT NULL UNIQUE
);

CREATE TABLE anime_genres (
    anime_id INTEGER NOT NULL REFERENCES anime(anime_id) ON DELETE CASCADE,
    genre_id INTEGER NOT NULL REFERENCES genres(genre_id) ON DELETE CASCADE,
    PRIMARY KEY (anime_id, genre_id)
);

CREATE TABLE anime_studios (
    anime_id INTEGER NOT NULL REFERENCES anime(anime_id) ON DELETE CASCADE,
    studio_id INTEGER NOT NULL REFERENCES studios(studio_id) ON DELETE CASCADE,
    PRIMARY KEY (anime_id, studio_id)
);

CREATE TABLE anime_producers (
    anime_id INTEGER NOT NULL REFERENCES anime(anime_id) ON DELETE CASCADE,
    producer_id INTEGER NOT NULL REFERENCES producers(producer_id) ON DELETE CASCADE,
    PRIMARY KEY (anime_id, producer_id)
);

CREATE TABLE anime_licensors (
    anime_id INTEGER NOT NULL REFERENCES anime(anime_id) ON DELETE CASCADE,
    licensor_id INTEGER NOT NULL REFERENCES licensors(licensor_id) ON DELETE CASCADE,
    PRIMARY KEY (anime_id, licensor_id)
);
"""

# Step 5: populate the final tables from the raw tables
str5 = """
BEGIN;

DROP MATERIALIZED VIEW IF EXISTS completed_high_score_lists;

TRUNCATE TABLE
    anime_licensors,
    anime_producers,
    anime_studios,
    anime_genres,
    user_anime_list,
    licensors,
    producers,
    studios,
    genres,
    anime_list_status,
    users,
    anime
RESTART IDENTITY CASCADE;

CREATE OR REPLACE FUNCTION safe_numeric(txt TEXT)
RETURNS NUMERIC LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE s TEXT;
BEGIN
    s := NULLIF(BTRIM(txt), '');
    IF s IS NULL THEN RETURN NULL; END IF;
    RETURN s::NUMERIC;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END; $$;

CREATE OR REPLACE FUNCTION safe_int(txt TEXT)
RETURNS INTEGER LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE s TEXT;
BEGIN
    s := NULLIF(BTRIM(txt), '');
    IF s IS NULL THEN RETURN NULL; END IF;
    RETURN TRUNC(s::NUMERIC)::INTEGER;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END; $$;

CREATE OR REPLACE FUNCTION safe_bool(txt TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE s TEXT;
BEGIN
    s := LOWER(NULLIF(BTRIM(txt), ''));
    IF s IS NULL THEN RETURN NULL; END IF;
    IF s IN ('1','t','true','y','yes') THEN RETURN TRUE;
    ELSIF s IN ('0','f','false','n','no') THEN RETURN FALSE;
    ELSE RETURN NULL; END IF;
END; $$;

CREATE OR REPLACE FUNCTION safe_date(txt TEXT)
RETURNS DATE LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE s TEXT;
BEGIN
    s := NULLIF(BTRIM(txt), '');
    IF s IS NULL THEN RETURN NULL; END IF;
    IF s !~ '^\d{4}-\d{2}-\d{2}$' THEN RETURN NULL; END IF;
    IF SUBSTRING(s,1,4)='0000' OR SUBSTRING(s,6,2)='00' OR SUBSTRING(s,9,2)='00' THEN RETURN NULL; END IF;
    RETURN s::DATE;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END; $$;

CREATE OR REPLACE FUNCTION safe_timestamp(txt TEXT)
RETURNS TIMESTAMP LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE s TEXT;
BEGIN
    s := NULLIF(BTRIM(txt), '');
    IF s IS NULL THEN RETURN NULL; END IF;
    IF LENGTH(s) >= 10 THEN
        IF SUBSTRING(s,1,4)='0000' OR SUBSTRING(s,6,2)='00' OR SUBSTRING(s,9,2)='00' THEN RETURN NULL; END IF;
    END IF;
    RETURN s::TIMESTAMP;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END; $$;

ANALYZE raw_anime;
ANALYZE raw_users;
ANALYZE raw_user_anime_list;

INSERT INTO anime_list_status (status_id, status_name) VALUES
    (1, 'watching'),
    (2, 'completed'),
    (3, 'on_hold'),
    (4, 'dropped'),
    (6, 'plan_to_watch')
ON CONFLICT (status_id) DO NOTHING;

INSERT INTO anime (
    anime_id, title, title_english, title_japanese, title_synonyms,
    image_url, type, source, episodes, status, airing, aired_string,
    aired, duration, duration_min, aired_from_year, rating, score,
    scored_by, rank, popularity, members, favorites, background,
    premiered, broadcast, related, opening_theme, ending_theme
)
SELECT
    safe_int(anime_id),
    NULLIF(BTRIM(title), ''),
    NULLIF(BTRIM(title_english), ''),
    NULLIF(BTRIM(title_japanese), ''),
    NULLIF(BTRIM(title_synonyms), ''),
    NULLIF(BTRIM(image_url), ''),
    NULLIF(BTRIM(type), ''),
    NULLIF(BTRIM(source), ''),
    safe_int(episodes),
    NULLIF(BTRIM(status), ''),
    safe_bool(airing),
    NULLIF(BTRIM(aired_string), ''),
    NULLIF(BTRIM(aired), ''),
    NULLIF(BTRIM(duration), ''),
    safe_numeric(duration_min)::NUMERIC(8,2),
    safe_int(aired_from_year),
    NULLIF(BTRIM(rating), ''),
    safe_numeric(score)::NUMERIC(4,2),
    safe_int(scored_by),
    safe_int(rank),
    safe_int(popularity),
    safe_int(members),
    safe_int(favorites),
    NULLIF(BTRIM(background), ''),
    NULLIF(BTRIM(premiered), ''),
    NULLIF(BTRIM(broadcast), ''),
    NULLIF(BTRIM(related), ''),
    NULLIF(BTRIM(opening_theme), ''),
    NULLIF(BTRIM(ending_theme), '')
FROM raw_anime
WHERE safe_int(anime_id) IS NOT NULL;

INSERT INTO users (
    user_id, username, user_watching, user_completed, user_onhold,
    user_dropped, user_plantowatch, user_days_spent_watching, gender,
    location, birth_date, access_rank, join_date, last_online,
    stats_mean_score, stats_rewatched, stats_episodes
)
SELECT
    safe_int(user_id),
    NULLIF(BTRIM(username), ''),
    COALESCE(safe_int(user_watching), 0),
    COALESCE(safe_int(user_completed), 0),
    COALESCE(safe_int(user_onhold), 0),
    COALESCE(safe_int(user_dropped), 0),
    COALESCE(safe_int(user_plantowatch), 0),
    safe_numeric(user_days_spent_watching)::NUMERIC(12,4),
    NULLIF(BTRIM(gender), ''),
    NULLIF(BTRIM(location), ''),
    safe_date(birth_date),
    safe_numeric(access_rank)::NUMERIC(10,2),
    safe_date(join_date),
    safe_timestamp(last_online),
    safe_numeric(stats_mean_score)::NUMERIC(4,2),
    COALESCE(safe_int(stats_rewatched), 0),
    COALESCE(safe_int(stats_episodes), 0)
FROM raw_users
WHERE safe_int(user_id) IS NOT NULL
  AND NULLIF(BTRIM(username), '') IS NOT NULL;

-- -------------------------------------------------------
-- FAST staging table: inline SQL only, no PL/pgSQL calls
-- -------------------------------------------------------
DROP TABLE IF EXISTS stage_user_anime_clean;

CREATE UNLOGGED TABLE stage_user_anime_clean AS
SELECT
    BTRIM(r.username) AS username,
    TRUNC(r.anime_id::NUMERIC)::INTEGER AS anime_id,
    COALESCE(TRUNC(r.my_watched_episodes::NUMERIC)::INTEGER, 0) AS my_watched_episodes,
    CASE
        WHEN r.my_start_date ~ '^\d{4}-\d{2}-\d{2}$'
         AND SUBSTRING(r.my_start_date,1,4) <> '0000'
         AND SUBSTRING(r.my_start_date,6,2) <> '00'
         AND SUBSTRING(r.my_start_date,9,2) <> '00'
        THEN r.my_start_date::DATE
    END AS my_start_date,
    CASE
        WHEN r.my_finish_date ~ '^\d{4}-\d{2}-\d{2}$'
         AND SUBSTRING(r.my_finish_date,1,4) <> '0000'
         AND SUBSTRING(r.my_finish_date,6,2) <> '00'
         AND SUBSTRING(r.my_finish_date,9,2) <> '00'
        THEN r.my_finish_date::DATE
    END AS my_finish_date,
    CASE
        WHEN r.my_score ~ '^\d+(\.\d+)?$'
         AND r.my_score::NUMERIC > 0
        THEN r.my_score::NUMERIC(4,2)
    END AS my_score,
    CASE
        WHEN r.my_status ~ '^\d+$'
         AND r.my_status::INTEGER IN (1,2,3,4,6)
        THEN r.my_status::SMALLINT
    END AS status_id,
    CASE
        WHEN BTRIM(r.my_rewatching) IN ('1','t','true','y','yes') THEN TRUE
        WHEN BTRIM(r.my_rewatching) IN ('0','f','false','n','no') THEN FALSE
    END AS my_rewatching,
    COALESCE(TRUNC(r.my_rewatching_ep::NUMERIC)::INTEGER, 0) AS my_rewatching_ep,
    CASE
        WHEN LENGTH(BTRIM(r.my_last_updated)) >= 10
         AND SUBSTRING(BTRIM(r.my_last_updated),1,4) <> '0000'
         AND SUBSTRING(BTRIM(r.my_last_updated),6,2) <> '00'
         AND SUBSTRING(BTRIM(r.my_last_updated),9,2) <> '00'
        THEN BTRIM(r.my_last_updated)::TIMESTAMP
    END AS my_last_updated
FROM raw_user_anime_list r
WHERE BTRIM(r.username) <> ''
  AND r.anime_id ~ '^\d+(\.\d+)?$';

ANALYZE stage_user_anime_clean;

CREATE INDEX stage_username_idx ON stage_user_anime_clean(username);
CREATE INDEX stage_anime_id_idx ON stage_user_anime_clean(anime_id);

ANALYZE stage_user_anime_clean;

SET LOCAL enable_nestloop = off;

INSERT INTO user_anime_list (
    user_id, anime_id, my_watched_episodes, my_start_date, my_finish_date,
    my_score, status_id, my_rewatching, my_rewatching_ep, my_last_updated
)
SELECT
    u.user_id,
    s.anime_id,
    s.my_watched_episodes,
    s.my_start_date,
    s.my_finish_date,
    s.my_score,
    s.status_id,
    s.my_rewatching,
    s.my_rewatching_ep,
    s.my_last_updated
FROM stage_user_anime_clean s
JOIN users u ON u.username = s.username
JOIN anime a ON a.anime_id = s.anime_id
ON CONFLICT (user_id, anime_id) DO UPDATE SET
    my_watched_episodes = EXCLUDED.my_watched_episodes,
    my_start_date       = EXCLUDED.my_start_date,
    my_finish_date      = EXCLUDED.my_finish_date,
    my_score            = EXCLUDED.my_score,
    status_id           = EXCLUDED.status_id,
    my_rewatching       = EXCLUDED.my_rewatching,
    my_rewatching_ep    = EXCLUDED.my_rewatching_ep,
    my_last_updated     = EXCLUDED.my_last_updated
WHERE user_anime_list.my_last_updated IS NULL
   OR (EXCLUDED.my_last_updated IS NOT NULL
       AND EXCLUDED.my_last_updated > user_anime_list.my_last_updated);

DROP TABLE stage_user_anime_clean;

INSERT INTO genres (genre_name)
SELECT DISTINCT BTRIM(token)
FROM raw_anime
CROSS JOIN LATERAL regexp_split_to_table(COALESCE(genre, ''), ',') AS token
WHERE BTRIM(token) <> ''
ON CONFLICT (genre_name) DO NOTHING;

INSERT INTO studios (studio_name)
SELECT DISTINCT BTRIM(token)
FROM raw_anime
CROSS JOIN LATERAL regexp_split_to_table(COALESCE(studio, ''), ',') AS token
WHERE BTRIM(token) <> ''
ON CONFLICT (studio_name) DO NOTHING;

INSERT INTO producers (producer_name)
SELECT DISTINCT BTRIM(token)
FROM raw_anime
CROSS JOIN LATERAL regexp_split_to_table(COALESCE(producer, ''), ',') AS token
WHERE BTRIM(token) <> ''
ON CONFLICT (producer_name) DO NOTHING;

INSERT INTO licensors (licensor_name)
SELECT DISTINCT BTRIM(token)
FROM raw_anime
CROSS JOIN LATERAL regexp_split_to_table(COALESCE(licensor, ''), ',') AS token
WHERE BTRIM(token) <> ''
ON CONFLICT (licensor_name) DO NOTHING;

INSERT INTO anime_genres (anime_id, genre_id)
SELECT DISTINCT a.anime_id, g.genre_id
FROM raw_anime ra
JOIN anime a ON a.anime_id = safe_int(ra.anime_id)
CROSS JOIN LATERAL regexp_split_to_table(COALESCE(ra.genre, ''), ',') AS token
JOIN genres g ON g.genre_name = BTRIM(token)
WHERE BTRIM(token) <> ''
ON CONFLICT DO NOTHING;

INSERT INTO anime_studios (anime_id, studio_id)
SELECT DISTINCT a.anime_id, s.studio_id
FROM raw_anime ra
JOIN anime a ON a.anime_id = safe_int(ra.anime_id)
CROSS JOIN LATERAL regexp_split_to_table(COALESCE(ra.studio, ''), ',') AS token
JOIN studios s ON s.studio_name = BTRIM(token)
WHERE BTRIM(token) <> ''
ON CONFLICT DO NOTHING;

INSERT INTO anime_producers (anime_id, producer_id)
SELECT DISTINCT a.anime_id, p.producer_id
FROM raw_anime ra
JOIN anime a ON a.anime_id = safe_int(ra.anime_id)
CROSS JOIN LATERAL regexp_split_to_table(COALESCE(ra.producer, ''), ',') AS token
JOIN producers p ON p.producer_name = BTRIM(token)
WHERE BTRIM(token) <> ''
ON CONFLICT DO NOTHING;

INSERT INTO anime_licensors (anime_id, licensor_id)
SELECT DISTINCT a.anime_id, l.licensor_id
FROM raw_anime ra
JOIN anime a ON a.anime_id = safe_int(ra.anime_id)
CROSS JOIN LATERAL regexp_split_to_table(COALESCE(ra.licensor, ''), ',') AS token
JOIN licensors l ON l.licensor_name = BTRIM(token)
WHERE BTRIM(token) <> ''
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_user_anime_list_anime_id    ON user_anime_list(anime_id);
CREATE INDEX IF NOT EXISTS idx_user_anime_list_status_id   ON user_anime_list(status_id);
CREATE INDEX IF NOT EXISTS idx_users_username              ON users(username);
CREATE INDEX IF NOT EXISTS idx_anime_title                 ON anime(title);
CREATE INDEX IF NOT EXISTS idx_anime_type                  ON anime(type);
CREATE INDEX IF NOT EXISTS idx_anime_source                ON anime(source);
CREATE INDEX IF NOT EXISTS idx_anime_score                 ON anime(score);
CREATE INDEX IF NOT EXISTS idx_anime_popularity            ON anime(popularity);
CREATE INDEX IF NOT EXISTS idx_anime_genres_genre_id       ON anime_genres(genre_id);
CREATE INDEX IF NOT EXISTS idx_anime_studios_studio_id     ON anime_studios(studio_id);
CREATE INDEX IF NOT EXISTS idx_anime_producers_producer_id ON anime_producers(producer_id);
CREATE INDEX IF NOT EXISTS idx_anime_licensors_licensor_id ON anime_licensors(licensor_id);

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

ANALYZE;

COMMIT;
"""

# Step 6: run quick sanity checks
str6 = """
SELECT COUNT(*) AS anime_count FROM anime;
SELECT COUNT(*) AS user_count FROM users;
SELECT COUNT(*) AS user_anime_count FROM user_anime_list;
SELECT COUNT(*) AS genre_count FROM genres;
SELECT COUNT(*) AS studio_count FROM studios;
SELECT COUNT(*) AS producer_count FROM producers;
SELECT COUNT(*) AS licensor_count FROM licensors;
"""

# Reset ddl
str_reset = """
DROP MATERIALIZED VIEW IF EXISTS completed_high_score_lists;

TRUNCATE TABLE
    anime_licensors,
    anime_producers,
    anime_studios,
    anime_genres,
    user_anime_list,
    licensors,
    producers,
    studios,
    genres,
    anime_list_status,
    users,
    anime
RESTART IDENTITY CASCADE;
"""
