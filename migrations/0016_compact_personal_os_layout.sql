-- Compact the five-node layout published as revision 5 on 2026-09-20.
-- Append a publication only while that exact geometry is still current. Keep
-- administrator drafts, newer publications, content, connections and history.
WITH latest AS (
  SELECT *
  FROM personal_os_config_versions
  ORDER BY revision DESC
  LIMIT 1
), positions (id, old_x, old_y, width, height, x, y) AS (
  VALUES
    ('identity', 120, 360, 360, 260, 120, 320),
    ('growth-devops', 860, 280, 240, 160, 600, 220),
    ('growth-pm', 1500, 270, 260, 170, 1000, 220),
    ('core-story', 780, 570, 340, 190, 550, 480),
    ('next-direction', 1900, 240, 300, 150, 980, 490)
), eligible AS (
  SELECT *
  FROM latest
  WHERE revision = 5
    AND published_at IS NOT NULL
    AND (SELECT MAX(revision) FROM personal_os_config_versions WHERE published_at IS NOT NULL) = 5
    AND json_array_length(config_json, '$.cards') = 5
    AND NOT EXISTS (
      SELECT 1 FROM positions
      WHERE (
        SELECT COUNT(*) FROM json_each(latest.config_json, '$.cards') AS card
        WHERE json_extract(card.value, '$.id') = positions.id
          AND json_extract(card.value, '$.x') = positions.old_x
          AND json_extract(card.value, '$.y') = positions.old_y
          AND json_extract(card.value, '$.width') = positions.width
          AND json_extract(card.value, '$.height') = positions.height
      ) <> 1
    )
), updated AS (
  SELECT schema_version,
    json_set(config_json, '$.cards', (
      SELECT json_group_array(json(positioned.value))
      FROM (
        SELECT json_set(card.value, '$.x', positions.x, '$.y', positions.y) AS value
        FROM json_each(eligible.config_json, '$.cards') AS card
        JOIN positions ON positions.id = json_extract(card.value, '$.id')
        ORDER BY card.key
      ) AS positioned
    )) AS config_json
  FROM eligible
)
INSERT INTO personal_os_config_versions
  (schema_version, config_json, note, created_by, published_at)
SELECT schema_version, config_json,
  'Compact the published five-node Personal OS layout',
  'migration', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM updated;
