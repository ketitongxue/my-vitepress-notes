WITH latest AS (
  SELECT schema_version, config_json
  FROM home_config_versions
  WHERE published_at IS NOT NULL
  ORDER BY published_at DESC, revision DESC
  LIMIT 1
), updated AS (
  SELECT schema_version,
    json_set(
      json_set(config_json, '$.desktop.menuLinks', (
        SELECT json_group_array(json(link.value))
        FROM json_each(config_json, '$.desktop.menuLinks') AS link
        WHERE COALESCE(json_extract(link.value, '$.href'), '') <> '#knowledge'
      )),
      '$.desktop.entries', (
        SELECT json_group_array(json(entry.value))
        FROM json_each(config_json, '$.desktop.entries') AS entry
        WHERE COALESCE(json_extract(entry.value, '$.id'), '') NOT IN ('llm-wiki', 'finance-wiki', 'ask', 'skill')
      )
    ) AS config_json
  FROM latest
)
INSERT INTO home_config_versions (schema_version, config_json, note, created_by, published_at)
SELECT schema_version, config_json, 'Remove public knowledge navigation and entries', 'migration', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM updated
WHERE json_extract(config_json, '$.desktop.menuLinks') IS NOT NULL;

WITH personal_latest AS (
  SELECT schema_version, config_json
  FROM personal_os_config_versions
  WHERE published_at IS NOT NULL
  ORDER BY published_at DESC, revision DESC
  LIMIT 1
), personal_updated AS (
  SELECT schema_version,
    json_set(config_json, '$.cards', (
      SELECT json_group_array(json(card.value))
      FROM json_each(config_json, '$.cards') AS card
      WHERE json_extract(card.value, '$.id') <> 'knowledge-products'
         OR json_array_length(json_extract(card.value, '$.links')) = 0
    )) AS config_json
  FROM personal_latest
)
INSERT INTO personal_os_config_versions (schema_version, config_json, note, created_by, published_at)
SELECT schema_version, config_json, 'Remove public knowledge links from Personal OS', 'migration', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM personal_updated
WHERE EXISTS (
  SELECT 1 FROM personal_latest, json_each(personal_latest.config_json, '$.cards') AS card
  WHERE json_extract(card.value, '$.id') = 'knowledge-products'
    AND json_array_length(json_extract(card.value, '$.links')) > 0
);
