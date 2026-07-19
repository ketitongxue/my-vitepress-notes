INSERT INTO home_config_versions
  (schema_version, config_json, note, created_by, published_at)
SELECT
  latest.schema_version,
  json_remove(
    latest.config_json,
    '$.desktop.entries[' || (
      SELECT CAST(entry.key AS TEXT)
      FROM json_each(latest.config_json, '$.desktop.entries') AS entry
      WHERE json_extract(entry.value, '$.id') = 'changelog'
      ORDER BY CAST(entry.key AS INTEGER)
      LIMIT 1
    ) || ']'
  ),
  'Remove deleted starter note link',
  'migration',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM (
  SELECT schema_version, config_json
  FROM home_config_versions
  WHERE published_at IS NOT NULL
  ORDER BY published_at DESC, revision DESC
  LIMIT 1
) AS latest
WHERE EXISTS (
  SELECT 1
  FROM json_each(latest.config_json, '$.desktop.entries') AS entry
  WHERE json_extract(entry.value, '$.id') = 'changelog'
);
