-- Stack the homepage desktop icons into one ordered column.
WITH latest AS (
  SELECT schema_version, config_json
  FROM home_config_versions
  WHERE published_at IS NOT NULL
  ORDER BY published_at DESC, revision DESC
  LIMIT 1
), ordered AS (
  SELECT
    latest.schema_version,
    latest.config_json,
    entry.value,
    CAST(entry.key AS INTEGER) AS original_order,
    CASE json_extract(entry.value, '$.id')
      WHEN 'projects' THEN 1
      WHEN 'experiments' THEN 2
      WHEN 'html-knowledge' THEN 3
      WHEN 'about' THEN 4
      WHEN 'github' THEN 5
      ELSE 99
    END AS sort_order
  FROM latest, json_each(latest.config_json, '$.desktop.entries') AS entry
), ranked AS (
  SELECT
    schema_version,
    config_json,
    value,
    ROW_NUMBER() OVER (ORDER BY sort_order, original_order) AS row_index
  FROM ordered
), updated AS (
  SELECT
    schema_version,
    json_set(
      config_json,
      '$.desktop.entries',
      (
        SELECT json_group_array(json(positioned.value))
        FROM (
          SELECT json_set(
            json(value),
            '$.position.x', 80,
            '$.position.y', 84 + (row_index - 1) * 108
          ) AS value
          FROM ranked
          ORDER BY row_index
        ) AS positioned
      )
    ) AS config_json
  FROM ranked
  LIMIT 1
)
INSERT INTO home_config_versions
  (schema_version, config_json, note, created_by, published_at)
SELECT
  schema_version,
  config_json,
  'Stack homepage desktop icons in a single ordered column',
  'migration',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM updated
WHERE config_json <> (SELECT config_json FROM latest);
