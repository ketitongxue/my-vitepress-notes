INSERT INTO home_config_versions
  (schema_version, config_json, note, created_by, published_at)
SELECT
  latest.schema_version,
  json_set(
    latest.config_json,
    '$.desktop.brand',
    'AI 纪元',
    '$.boot.launchLabel',
    CASE
      WHEN json_extract(latest.config_json, '$.boot.launchLabel') = '启动 JuZX OS'
        THEN '启动 AI 纪元'
      ELSE json_extract(latest.config_json, '$.boot.launchLabel')
    END,
    '$.boot.lines[3]',
    CASE
      WHEN json_extract(latest.config_json, '$.boot.lines[3]') = '$ open juzx-os'
        THEN '$ open ai-era'
      ELSE json_extract(latest.config_json, '$.boot.lines[3]')
    END
  ),
  'Rename homepage brand to AI Era',
  'migration',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM (
  SELECT schema_version, config_json
  FROM home_config_versions
  WHERE published_at IS NOT NULL
  ORDER BY published_at DESC, revision DESC
  LIMIT 1
) AS latest
WHERE json_extract(latest.config_json, '$.desktop.brand') <> 'AI 纪元'
   OR json_extract(latest.config_json, '$.boot.launchLabel') = '启动 JuZX OS'
   OR json_extract(latest.config_json, '$.boot.lines[3]') = '$ open juzx-os';
