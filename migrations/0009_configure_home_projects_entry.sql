WITH latest AS (
  SELECT schema_version, config_json
  FROM home_config_versions
  WHERE published_at IS NOT NULL
  ORDER BY published_at DESC, revision DESC
  LIMIT 1
),
updated AS (
  SELECT
    latest.schema_version,
    json_set(
      latest.config_json,
      '$.desktop.entries',
      (
        SELECT json_group_array(json(configured.value))
        FROM (
          SELECT
            CASE
              WHEN json_extract(entry.value, '$.id') = 'projects'
                THEN json_set(
                  json(entry.value),
                  '$.window.summary',
                  '记录我把 AI Agent、工具调用与工程化实践做成可运行系统的过程。',
                  '$.window.href',
                  '/projects/go-tiny-claw',
                  '$.window.linkLabel',
                  '查看 go-tiny-claw 项目介绍 →'
                )
              ELSE json(entry.value)
            END AS value
          FROM json_each(latest.config_json, '$.desktop.entries') AS entry
          ORDER BY CAST(entry.key AS INTEGER)
        ) AS configured
      )
    ) AS config_json
  FROM latest
)
INSERT INTO home_config_versions
  (schema_version, config_json, note, created_by, published_at)
SELECT
  schema_version,
  config_json,
  'Configure homepage projects entry from JSON',
  'migration',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM updated
WHERE EXISTS (
  SELECT 1
  FROM latest, json_each(latest.config_json, '$.desktop.entries') AS entry
  WHERE json_extract(entry.value, '$.id') = 'projects'
    AND (
      COALESCE(json_extract(entry.value, '$.window.summary'), '')
        <> '记录我把 AI Agent、工具调用与工程化实践做成可运行系统的过程。'
      OR COALESCE(json_extract(entry.value, '$.window.href'), '')
        <> '/projects/go-tiny-claw'
      OR COALESCE(json_extract(entry.value, '$.window.linkLabel'), '')
        <> '查看 go-tiny-claw 项目介绍 →'
    )
);
