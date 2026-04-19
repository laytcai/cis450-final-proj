-- Aux — distinct values for UI dropdowns, returned as JSON arrays in a single row.
-- Params: none. Response is cached at the application layer (see routes/meta.js).
SELECT
  (SELECT JSON_AGG(DISTINCT a.type    ORDER BY a.type)   FROM anime a WHERE a.type   IS NOT NULL) AS types,
  (SELECT JSON_AGG(DISTINCT a.source  ORDER BY a.source) FROM anime a WHERE a.source IS NOT NULL) AS sources,
  (SELECT JSON_AGG(DISTINCT a.rating  ORDER BY a.rating) FROM anime a WHERE a.rating IS NOT NULL) AS ratings,
  (SELECT JSON_AGG(row_to_json(s))
     FROM (
       SELECT status_id AS id, status_name AS name
       FROM anime_list_status
       ORDER BY status_id
     ) s
  ) AS statuses,
  (SELECT MIN(aired_from_year) FROM anime WHERE aired_from_year IS NOT NULL) AS min_year,
  (SELECT MAX(aired_from_year) FROM anime WHERE aired_from_year IS NOT NULL) AS max_year;
