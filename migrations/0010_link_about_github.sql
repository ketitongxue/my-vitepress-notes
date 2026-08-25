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
              WHEN json_extract(entry.value, '$.id') = 'about'
                THEN json_set(
                  json(entry.value),
                  '$.window.summary',
                  trim(
                    replace(replace(replace(replace(
                      replace(replace(replace(replace(
                        json_extract(entry.value, '$.window.summary'),
                        char(10) || 'Github:ketitongxue', ''),
                        char(10) || 'Github: ketitongxue', ''),
                        char(10) || 'GitHub:ketitongxue', ''),
                        char(10) || 'GitHub: ketitongxue', ''),
                      'Github:ketitongxue', ''),
                      'Github: ketitongxue', ''),
                      'GitHub:ketitongxue', ''),
                      'GitHub: ketitongxue', '')
                  ),
                  '$.window.href',
                  'https://github.com/ketitongxue',
                  '$.window.linkLabel',
                  'Github:ketitongxue'
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
  'Link About entry to GitHub and remove its pending status',
  'migration',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM updated
WHERE EXISTS (
  SELECT 1
  FROM latest, json_each(latest.config_json, '$.desktop.entries') AS entry
  WHERE json_extract(entry.value, '$.id') = 'about'
    AND (
      COALESCE(json_extract(entry.value, '$.window.href'), '')
        <> 'https://github.com/ketitongxue'
      OR COALESCE(json_extract(entry.value, '$.window.linkLabel'), '')
        <> 'Github:ketitongxue'
      OR instr(
        COALESCE(json_extract(entry.value, '$.window.summary'), ''),
        'Github:ketitongxue'
      ) > 0
      OR instr(
        COALESCE(json_extract(entry.value, '$.window.summary'), ''),
        'GitHub:ketitongxue'
      ) > 0
    )
);
