-- Keep the three homepage entries in one right-anchored column. Positions are
-- offsets from the right edge in DesktopSurface; retain all window content.
-- Append a revision and leave administrator drafts and existing history intact.
WITH latest AS (
  SELECT *
  FROM home_config_versions
  ORDER BY revision DESC
  LIMIT 1
), ordered AS (
  SELECT entry.value,
    CASE json_extract(entry.value, '$.id')
      WHEN 'projects' THEN 0
      WHEN 'html-knowledge' THEN 1
      WHEN 'about' THEN 2
    END AS sort_order
  FROM latest, json_each(latest.config_json, '$.desktop.entries') AS entry
  WHERE json_extract(entry.value, '$.id') IN ('projects', 'html-knowledge', 'about')
), updated AS (
  SELECT schema_version,
    json_set(config_json, '$.desktop.entries', (
      SELECT json_group_array(json(positioned.value))
      FROM (
        SELECT json_set(json(value),
          '$.position.x', 80,
          '$.position.y', 84 + sort_order * 108
        ) AS value
        FROM ordered
        ORDER BY sort_order
      ) AS positioned
    )) AS config_json
  FROM latest
  WHERE published_at IS NOT NULL
    AND (SELECT COUNT(*) FROM ordered) = 3
)
INSERT INTO home_config_versions
  (schema_version, config_json, note, created_by, published_at)
SELECT schema_version, config_json,
  'Align homepage entries: projects, knowledge, about; remove AI experiments',
  'migration', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM updated
WHERE config_json <> (SELECT config_json FROM latest);
