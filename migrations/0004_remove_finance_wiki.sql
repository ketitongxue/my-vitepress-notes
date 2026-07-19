INSERT INTO home_config_versions
  (schema_version, config_json, note, created_by, published_at)
SELECT
  latest.schema_version,
  json_remove(
    latest.config_json,
    (
      SELECT entry.fullkey
      FROM json_tree(latest.config_json, '$.desktop.entries') AS entry
      WHERE entry.type = 'object'
        AND json_extract(entry.value, '$.id') = 'finance-wiki'
      LIMIT 1
    )
  ),
  'Remove retired Finance Wiki desktop entry',
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
  FROM json_tree(latest.config_json, '$.desktop.entries') AS entry
  WHERE entry.type = 'object'
    AND json_extract(entry.value, '$.id') = 'finance-wiki'
);

INSERT INTO personal_os_config_versions
  (schema_version, config_json, note, created_by, published_at)
SELECT
  latest.schema_version,
  json_remove(
    latest.config_json,
    (
      SELECT link.fullkey
      FROM json_tree(latest.config_json, '$.cards') AS link
      WHERE link.type = 'object'
        AND json_extract(link.value, '$.href') = '/finance/'
      LIMIT 1
    )
  ),
  'Remove retired Finance Wiki knowledge link',
  'migration',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM (
  SELECT schema_version, config_json
  FROM personal_os_config_versions
  WHERE published_at IS NOT NULL
  ORDER BY published_at DESC, revision DESC
  LIMIT 1
) AS latest
WHERE EXISTS (
  SELECT 1
  FROM json_tree(latest.config_json, '$.cards') AS link
  WHERE link.type = 'object'
    AND json_extract(link.value, '$.href') = '/finance/'
);
