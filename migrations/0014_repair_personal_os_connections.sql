-- Migration 0011 removed knowledge-products but retained its connections.
-- Append a corrected published revision; retain the original history unchanged.
-- Only repair the known migration when it is still the latest revision, so a
-- newer administrator draft or publication is never superseded.
WITH latest AS (
  SELECT *
  FROM personal_os_config_versions
  ORDER BY revision DESC
  LIMIT 1
), repaired AS (
  SELECT schema_version,
    json_set(config_json, '$.connections', (
      SELECT json_group_array(json(edge.value))
      FROM json_each(config_json, '$.connections') AS edge
      WHERE json_extract(edge.value, '$.from') <> 'knowledge-products'
        AND json_extract(edge.value, '$.to') <> 'knowledge-products'
    )) AS config_json
  FROM latest
  WHERE note = 'Remove public knowledge links from Personal OS'
    AND created_by = 'migration'
    AND published_at IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM json_each(config_json, '$.cards') AS card
      WHERE json_extract(card.value, '$.id') = 'knowledge-products'
    )
)
INSERT INTO personal_os_config_versions
  (schema_version, config_json, note, created_by, published_at)
SELECT schema_version, config_json,
  'Repair dangling Personal OS connections after knowledge removal',
  'migration', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM repaired
WHERE config_json <> (SELECT config_json FROM latest);
