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
        WHEN BTRIM(COALESCE(birth_date, '')) ~ '^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$'
         AND SUBSTRING(BTRIM(birth_date), 6, 2) <> '00'
         AND SUBSTRING(BTRIM(birth_date), 9, 2) <> '00'
        THEN BTRIM(birth_date)::TIMESTAMP::DATE
        ELSE NULL
    END,
    NULLIF(BTRIM(access_rank), '')::NUMERIC(10,2),
    CASE
        WHEN BTRIM(COALESCE(join_date, '')) ~ '^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$'
         AND SUBSTRING(BTRIM(join_date), 6, 2) <> '00'
         AND SUBSTRING(BTRIM(join_date), 9, 2) <> '00'
        THEN BTRIM(join_date)::TIMESTAMP::DATE
        ELSE NULL
    END,
    CASE
        WHEN BTRIM(COALESCE(last_online, '')) ~ '^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$'
         AND SUBSTRING(BTRIM(last_online), 6, 2) <> '00'
         AND SUBSTRING(BTRIM(last_online), 9, 2) <> '00'
        THEN BTRIM(last_online)::TIMESTAMP
        ELSE NULL
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
        WHEN BTRIM(COALESCE(r.my_start_date, '')) ~ '^\d{4}-\d{2}-\d{2}$'
         AND SUBSTRING(BTRIM(r.my_start_date), 6, 2) <> '00'
         AND SUBSTRING(BTRIM(r.my_start_date), 9, 2) <> '00'
        THEN BTRIM(r.my_start_date)::DATE
        ELSE NULL
    END,

    CASE
        WHEN BTRIM(COALESCE(r.my_finish_date, '')) ~ '^\d{4}-\d{2}-\d{2}$'
         AND SUBSTRING(BTRIM(r.my_finish_date), 6, 2) <> '00'
         AND SUBSTRING(BTRIM(r.my_finish_date), 9, 2) <> '00'
        THEN BTRIM(r.my_finish_date)::DATE
        ELSE NULL
    END,

    NULLIF(NULLIF(BTRIM(r.my_score), ''), '0')::NUMERIC(4,2),
    NULLIF(BTRIM(r.my_status), '')::SMALLINT,

    CASE
        WHEN BTRIM(COALESCE(r.my_rewatching, '')) IN ('1', 'true', 'TRUE', 't') THEN TRUE
        WHEN BTRIM(COALESCE(r.my_rewatching, '')) IN ('0', 'false', 'FALSE', 'f', '') THEN FALSE
        ELSE NULL
    END,

    COALESCE(NULLIF(BTRIM(r.my_rewatching_ep), '')::INTEGER, 0),

    CASE
        WHEN BTRIM(COALESCE(r.my_last_updated, '')) ~ '^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$'
         AND SUBSTRING(BTRIM(r.my_last_updated), 6, 2) <> '00'
         AND SUBSTRING(BTRIM(r.my_last_updated), 9, 2) <> '00'
        THEN BTRIM(r.my_last_updated)::TIMESTAMP
        ELSE NULL
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
        WHEN BTRIM(COALESCE(r.my_last_updated, '')) ~ '^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$'
         AND SUBSTRING(BTRIM(r.my_last_updated), 6, 2) <> '00'
         AND SUBSTRING(BTRIM(r.my_last_updated), 9, 2) <> '00'
        THEN BTRIM(r.my_last_updated)::TIMESTAMP
        ELSE TIMESTAMP '1900-01-01'
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

# Reset ddl
str_reset = """
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