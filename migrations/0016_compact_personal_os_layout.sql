-- Compact the layout published as revision 5 and add the third AI Agent stage.
-- Append a publication only while the original five-card geometry is current.
-- Preserve existing content and history, and leave newer administrator work alone.
WITH latest AS (
  SELECT *
  FROM personal_os_config_versions
  ORDER BY revision DESC
  LIMIT 1
), positions (id, old_x, old_y, width, height, x, y) AS (
  VALUES
    ('identity', 120, 360, 360, 260, 120, 320),
    ('growth-devops', 860, 280, 240, 160, 560, 220),
    ('growth-pm', 1500, 270, 260, 170, 900, 215),
    ('core-story', 780, 570, 340, 190, 510, 490),
    ('next-direction', 1900, 240, 300, 150, 1640, 225)
), eligible AS (
  SELECT *
  FROM latest
  WHERE revision = 5
    AND published_at IS NOT NULL
    AND (SELECT MAX(revision) FROM personal_os_config_versions WHERE published_at IS NOT NULL) = 5
    AND json_array_length(config_json, '$.cards') = 5
    AND EXISTS (
      SELECT 1 FROM json_each(config_json, '$.connections') AS edge
      WHERE json_extract(edge.value, '$.from') = 'growth-pm'
        AND json_extract(edge.value, '$.to') = 'next-direction'
    )
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
        SELECT json_set(card.value, '$.x', positions.x, '$.y', positions.y) AS value,
          CAST(card.key AS REAL) AS card_order
        FROM json_each(eligible.config_json, '$.cards') AS card
        JOIN positions ON positions.id = json_extract(card.value, '$.id')
        UNION ALL
        SELECT json_object(
          'id', 'growth-agent', 'type', 'timeline', 'kicker', '03',
          'title', 'AI Agent',
          'body', '探索 AI Agent 的工具调用、知识检索与任务协作，让想法变成可执行的工作流。',
          'x', 1260, 'y', 210, 'width', 300, 'height', 180,
          'minWidth', 260, 'minHeight', 160, 'visible', json('true'),
          'accent', 'blue', 'items', json('[]'), 'links', json('[]')
        ), CAST(card.key AS REAL) + 0.5
        FROM json_each(eligible.config_json, '$.cards') AS card
        WHERE json_extract(card.value, '$.id') = 'growth-pm'
        ORDER BY card_order
      ) AS positioned
    ), '$.connections', (
      SELECT json_group_array(json(connected.value))
      FROM (
        SELECT CASE
          WHEN json_extract(edge.value, '$.from') = 'growth-pm'
            AND json_extract(edge.value, '$.to') = 'next-direction'
          THEN json_set(edge.value, '$.to', 'growth-agent')
          ELSE edge.value
        END AS value, CAST(edge.key AS REAL) AS edge_order
        FROM json_each(eligible.config_json, '$.connections') AS edge
        UNION ALL
        SELECT json_object('from', 'growth-agent', 'to', 'next-direction'),
          json_array_length(eligible.config_json, '$.connections')
        ORDER BY edge_order
      ) AS connected
    )) AS config_json
  FROM eligible
)
INSERT INTO personal_os_config_versions
  (schema_version, config_json, note, created_by, published_at)
SELECT schema_version, config_json,
  'Compact Personal OS layout and add the AI Agent stage',
  'migration', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM updated;
