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
INSERT INTO anime_list_status (status_id, status_name) VALUES
    (1, 'watching'),
    (2, 'completed'),
    (3, 'on_hold'),
    (4, 'dropped'),
    (6, 'plan_to_watch');

INSERT INTO anime (
    anime_id, title, title_english, title_japanese, title_synonyms, image_url,
    type, source, episodes, status, airing, aired_string, aired, duration,
    duration_min, aired_from_year, rating, score, scored_by, rank, popularity,
    members, favorites, background, premiered, broadcast, related,
    opening_theme, ending_theme
)
SELECT
    NULLIF(BTRIM(anime_id), '')::INTEGER,
    NULLIF(BTRIM(title), ''),
    NULLIF(BTRIM(title_english), ''),
    NULLIF(BTRIM(title_japanese), ''),
    NULLIF(BTRIM(title_synonyms), ''),
    NULLIF(BTRIM(image_url), ''),
    NULLIF(BTRIM(type), ''),
    NULLIF(BTRIM(source), ''),
    NULLIF(BTRIM(episodes), '')::INTEGER,
    NULLIF(BTRIM(status), ''),
    CASE
        WHEN NULLIF(BTRIM(airing), '') IS NULL THEN NULL
        ELSE NULLIF(BTRIM(airing), '')::BOOLEAN
    END,
    NULLIF(BTRIM(aired_string), ''),
    NULLIF(BTRIM(aired), ''),
    NULLIF(BTRIM(duration), ''),
    NULLIF(BTRIM(duration_min), '')::NUMERIC(8,2),
    NULLIF(BTRIM(aired_from_year), '')::NUMERIC::INTEGER,
    NULLIF(BTRIM(rating), ''),
    NULLIF(BTRIM(score), '')::NUMERIC(4,2),
    NULLIF(BTRIM(scored_by), '')::INTEGER,
    NULLIF(BTRIM(rank), '')::NUMERIC::INTEGER,
    NULLIF(BTRIM(popularity), '')::INTEGER,
    NULLIF(BTRIM(members), '')::INTEGER,
    NULLIF(BTRIM(favorites), '')::INTEGER,
    NULLIF(BTRIM(background), ''),
    NULLIF(BTRIM(premiered), ''),
    NULLIF(BTRIM(broadcast), ''),
    NULLIF(BTRIM(related), ''),
    NULLIF(BTRIM(opening_theme), ''),
    NULLIF(BTRIM(ending_theme), '')
FROM raw_anime;

INSERT INTO users (
    user_id, username, user_watching, user_completed, user_onhold, user_dropped,
    user_plantowatch, user_days_spent_watching, gender, location, birth_date,
    access_rank, join_date, last_online, stats_mean_score, stats_rewatched,
    stats_episodes
)
SELECT
    NULLIF(BTRIM(user_id), '')::INTEGER,
    NULLIF(BTRIM(username), ''),
    COALESCE(NULLIF(BTRIM(user_watching), '')::INTEGER, 0),
    COALESCE(NULLIF(BTRIM(user_completed), '')::INTEGER, 0),
    COALESCE(NULLIF(BTRIM(user_onhold), '')::INTEGER, 0),
    COALESCE(NULLIF(BTRIM(user_dropped), '')::INTEGER, 0),
    COALESCE(NULLIF(BTRIM(user_plantowatch), '')::INTEGER, 0),
    NULLIF(BTRIM(user_days_spent_watching), '')::NUMERIC(12,4),
    NULLIF(BTRIM(gender), ''),
    NULLIF(BTRIM(location), ''),
    CASE
        WHEN NULLIF(BTRIM(birth_date), '') IS NULL THEN NULL
        ELSE NULLIF(BTRIM(birth_date), '')::TIMESTAMP::DATE
    END,
    NULLIF(BTRIM(access_rank), '')::NUMERIC(10,2),
    CASE
        WHEN NULLIF(BTRIM(join_date), '') IS NULL THEN NULL
        ELSE NULLIF(BTRIM(join_date), '')::TIMESTAMP::DATE
    END,
    CASE
        WHEN NULLIF(BTRIM(last_online), '') IS NULL THEN NULL
        ELSE NULLIF(BTRIM(last_online), '')::TIMESTAMP
    END,
    NULLIF(BTRIM(stats_mean_score), '')::NUMERIC(4,2),
    COALESCE(NULLIF(BTRIM(stats_rewatched), '')::NUMERIC::INTEGER, 0),
    COALESCE(NULLIF(BTRIM(stats_episodes), '')::INTEGER, 0)
FROM raw_users;

INSERT INTO user_anime_list (
    user_id, anime_id, my_watched_episodes, my_start_date, my_finish_date,
    my_score, status_id, my_rewatching, my_rewatching_ep, my_last_updated
)
SELECT DISTINCT ON (u.user_id, a.anime_id)
    u.user_id,
    a.anime_id,
    COALESCE(NULLIF(BTRIM(r.my_watched_episodes), '')::INTEGER, 0),
    CASE
        WHEN BTRIM(r.my_start_date) IN ('', '0000-00-00') THEN NULL
        ELSE BTRIM(r.my_start_date)::DATE
    END,
    CASE
        WHEN BTRIM(r.my_finish_date) IN ('', '0000-00-00') THEN NULL
        ELSE BTRIM(r.my_finish_date)::DATE
    END,
    NULLIF(NULLIF(BTRIM(r.my_score), ''), '0')::NUMERIC(4,2),
    NULLIF(BTRIM(r.my_status), '')::SMALLINT,
    CASE
        WHEN BTRIM(r.my_rewatching) = '1' THEN TRUE
        WHEN BTRIM(r.my_rewatching) = '0' THEN FALSE
        ELSE NULL
    END,
    COALESCE(NULLIF(BTRIM(r.my_rewatching_ep), '')::INTEGER, 0),
    CASE
        WHEN NULLIF(BTRIM(r.my_last_updated), '') IS NULL THEN NULL
        ELSE BTRIM(r.my_last_updated)::TIMESTAMP
    END
FROM raw_user_anime_list r
JOIN users u
  ON u.username = NULLIF(BTRIM(r.username), '')
JOIN anime a
  ON a.anime_id = NULLIF(BTRIM(r.anime_id), '')::INTEGER
ORDER BY
    u.user_id,
    a.anime_id,
    CASE
        WHEN NULLIF(BTRIM(r.my_last_updated), '') IS NULL THEN TIMESTAMP '1900-01-01'
        ELSE BTRIM(r.my_last_updated)::TIMESTAMP
    END DESC;

INSERT INTO genres (genre_name)
SELECT DISTINCT BTRIM(token)
FROM raw_anime ra
CROSS JOIN LATERAL regexp_split_to_table(COALESCE(ra.genre, ''), ',') AS token
WHERE BTRIM(token) <> ''
ON CONFLICT (genre_name) DO NOTHING;

INSERT INTO studios (studio_name)
SELECT DISTINCT BTRIM(token)
FROM raw_anime ra
CROSS JOIN LATERAL regexp_split_to_table(COALESCE(ra.studio, ''), ',') AS token
WHERE BTRIM(token) <> ''
ON CONFLICT (studio_name) DO NOTHING;

INSERT INTO producers (producer_name)
SELECT DISTINCT BTRIM(token)
FROM raw_anime ra
CROSS JOIN LATERAL regexp_split_to_table(COALESCE(ra.producer, ''), ',') AS token
WHERE BTRIM(token) <> ''
ON CONFLICT (producer_name) DO NOTHING;

INSERT INTO licensors (licensor_name)
SELECT DISTINCT BTRIM(token)
FROM raw_anime ra
CROSS JOIN LATERAL regexp_split_to_table(COALESCE(ra.licensor, ''), ',') AS token
WHERE BTRIM(token) <> ''
ON CONFLICT (licensor_name) DO NOTHING;

INSERT INTO anime_genres (anime_id, genre_id)
SELECT DISTINCT
    ra.anime_id::INTEGER,
    g.genre_id
FROM raw_anime ra
CROSS JOIN LATERAL regexp_split_to_table(COALESCE(ra.genre, ''), ',') AS token
JOIN genres g
  ON g.genre_name = BTRIM(token)
WHERE BTRIM(token) <> '';

INSERT INTO anime_studios (anime_id, studio_id)
SELECT DISTINCT
    ra.anime_id::INTEGER,
    s.studio_id
FROM raw_anime ra
CROSS JOIN LATERAL regexp_split_to_table(COALESCE(ra.studio, ''), ',') AS token
JOIN studios s
  ON s.studio_name = BTRIM(token)
WHERE BTRIM(token) <> '';

INSERT INTO anime_producers (anime_id, producer_id)
SELECT DISTINCT
    ra.anime_id::INTEGER,
    p.producer_id
FROM raw_anime ra
CROSS JOIN LATERAL regexp_split_to_table(COALESCE(ra.producer, ''), ',') AS token
JOIN producers p
  ON p.producer_name = BTRIM(token)
WHERE BTRIM(token) <> '';

INSERT INTO anime_licensors (anime_id, licensor_id)
SELECT DISTINCT
    ra.anime_id::INTEGER,
    l.licensor_id
FROM raw_anime ra
CROSS JOIN LATERAL regexp_split_to_table(COALESCE(ra.licensor, ''), ',') AS token
JOIN licensors l
  ON l.licensor_name = BTRIM(token)
WHERE BTRIM(token) <> '';

CREATE INDEX idx_user_anime_list_anime_id ON user_anime_list(anime_id);
CREATE INDEX idx_user_anime_list_status_id ON user_anime_list(status_id);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_anime_title ON anime(title);
CREATE INDEX idx_anime_type ON anime(type);
CREATE INDEX idx_anime_source ON anime(source);
CREATE INDEX idx_anime_score ON anime(score);
CREATE INDEX idx_anime_popularity ON anime(popularity);
CREATE INDEX idx_anime_genres_genre_id ON anime_genres(genre_id);
CREATE INDEX idx_anime_studios_studio_id ON anime_studios(studio_id);
CREATE INDEX idx_anime_producers_producer_id ON anime_producers(producer_id);
CREATE INDEX idx_anime_licensors_licensor_id ON anime_licensors(licensor_id);

ANALYZE;
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

SELECT * FROM anime_list_status ORDER BY status_id;
"""