WITH latest AS (
  SELECT schema_version, config_json
  FROM home_config_versions
  WHERE published_at IS NOT NULL
  ORDER BY published_at DESC, revision DESC
  LIMIT 1
),
contact AS (
  SELECT json_extract(entry.value, '$.window.summary') AS summary
  FROM latest, json_each(latest.config_json, '$.desktop.entries') AS entry
  WHERE json_extract(entry.value, '$.id') = 'contact'
  ORDER BY CAST(entry.key AS INTEGER)
  LIMIT 1
),
updated AS (
  SELECT
    latest.schema_version,
    json_set(
      latest.config_json,
      '$.desktop.menuLinks',
      (
        SELECT json_group_array(json(filtered.value))
        FROM (
          SELECT link.value
          FROM json_each(latest.config_json, '$.desktop.menuLinks') AS link
          WHERE json_extract(link.value, '$.href') <> '/about'
          ORDER BY CAST(link.key AS INTEGER)
        ) AS filtered
      ),
      '$.desktop.entries',
      (
        SELECT json_group_array(json(filtered.value))
        FROM (
          SELECT
            CASE
              WHEN json_extract(entry.value, '$.id') = 'about'
                THEN json_remove(
                  json_set(
                    json(entry.value),
                    '$.window.summary',
                    trim(
                      json_extract(entry.value, '$.window.summary')
                      || CASE
                        WHEN contact.summary IS NULL OR trim(contact.summary) = '' THEN ''
                        ELSE ' 联系方式：' || contact.summary
                      END
                    )
                  ),
                  '$.window.href'
                )
              ELSE json(entry.value)
            END AS value
          FROM json_each(latest.config_json, '$.desktop.entries') AS entry
          WHERE json_extract(entry.value, '$.id') <> 'contact'
          ORDER BY CAST(entry.key AS INTEGER)
        ) AS filtered
      )
    ) AS config_json
  FROM latest
  LEFT JOIN contact ON true
)
INSERT INTO home_config_versions
  (schema_version, config_json, note, created_by, published_at)
SELECT
  schema_version,
  config_json,
  'Merge homepage contact into About entry',
  'migration',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM updated
WHERE EXISTS (
  SELECT 1
  FROM latest, json_each(latest.config_json, '$.desktop.entries') AS entry
  WHERE json_extract(entry.value, '$.id') IN ('about', 'contact')
)
   OR EXISTS (
     SELECT 1
     FROM latest, json_each(latest.config_json, '$.desktop.menuLinks') AS link
     WHERE json_extract(link.value, '$.href') = '/about'
   );
