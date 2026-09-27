-- Add the website repository immediately above About in the existing column.
-- Append a published revision while retaining custom content, extra entries and
-- all history. Do not overwrite an administrator draft or an existing entry.
WITH latest AS (
  SELECT *
  FROM home_config_versions
  ORDER BY revision DESC
  LIMIT 1
), about AS (
  SELECT CAST(entry.key AS INTEGER) AS entry_order,
    json_extract(entry.value, '$.position.x') AS x,
    json_extract(entry.value, '$.position.y') AS y
  FROM latest, json_each(latest.config_json, '$.desktop.entries') AS entry
  WHERE json_extract(entry.value, '$.id') = 'about'
), eligible AS (
  SELECT latest.*
  FROM latest
  WHERE published_at IS NOT NULL
    AND json_array_length(config_json, '$.desktop.entries') < 40
    AND (SELECT COUNT(*) FROM about) = 1
    AND NOT EXISTS (
      SELECT 1 FROM json_each(latest.config_json, '$.desktop.entries') AS entry
      WHERE json_extract(entry.value, '$.id') = 'site-repository'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM json_each(latest.config_json, '$.desktop.entries') AS entry, about
      WHERE json_extract(entry.value, '$.position.x') = about.x
        AND json_extract(entry.value, '$.position.y') >= about.y
        AND json_extract(entry.value, '$.position.y') + 108 > 5000
    )
), updated AS (
  SELECT schema_version,
    json_set(config_json, '$.desktop.entries', (
      SELECT json_group_array(json(positioned.value))
      FROM (
        SELECT CASE
          WHEN json_extract(entry.value, '$.position.x') = about.x
            AND json_extract(entry.value, '$.position.y') >= about.y
          THEN json_set(entry.value, '$.position.y', json_extract(entry.value, '$.position.y') + 108)
          ELSE entry.value
        END AS value, CAST(entry.key AS REAL) AS entry_order
        FROM json_each(eligible.config_json, '$.desktop.entries') AS entry, about
        UNION ALL
        SELECT json_object(
          'id', 'site-repository', 'label', '网站源码', 'icon', 'github',
          'position', json_object('x', about.x, 'y', about.y),
          'window', json_object(
            'title', '网站源码',
            'summary', 'AI 纪元的 GitHub 仓库，记录这个个人网站的页面、交互与持续迭代。' || char(10) || char(10) || '基于 VitePress、Vue 与 Cloudflare 构建，包含个人桌面、知识库阅读窗口和 Personal OS 画布。欢迎查看源码与提交记录。',
            'href', 'https://github.com/ketitongxue/my-vitepress-notes',
            'linkLabel', '访问 GitHub 仓库 →'
          )
        ), about.entry_order - 0.5
        FROM about
        ORDER BY entry_order
      ) AS positioned
    )) AS config_json
  FROM eligible
)
INSERT INTO home_config_versions
  (schema_version, config_json, note, created_by, published_at)
SELECT schema_version, config_json,
  'Add website repository entry above About while preserving homepage content',
  'migration', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM updated;
