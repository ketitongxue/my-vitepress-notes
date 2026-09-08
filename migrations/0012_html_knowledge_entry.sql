-- Append the new library without replacing the owner's existing homepage.
WITH latest AS (
  SELECT schema_version, config_json FROM home_config_versions
  WHERE published_at IS NOT NULL
  ORDER BY published_at DESC, revision DESC LIMIT 1
)
INSERT INTO home_config_versions (schema_version, config_json, note, created_by, published_at)
SELECT schema_version,
  json_insert(config_json,
    '$.desktop.entries[#]', json('{"id":"html-knowledge","label":"知识库","icon":"folder","position":{"x":176,"y":176},"window":{"title":"知识库","summary":"AI 与实践的 HTML 文档，持续整理与更新。","href":"https://ketitongxue.github.io/ai-era-html-docs/","linkLabel":"打开知识库 →"}}'),
    '$.desktop.menuLinks[#]', json('{"label":"知识库","href":"https://ketitongxue.github.io/ai-era-html-docs/"}')
  ),
  'Add independent HTML knowledge library', 'migration', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM latest
WHERE NOT EXISTS (
  SELECT 1 FROM json_each(config_json, '$.desktop.entries')
  WHERE json_extract(value, '$.id') = 'html-knowledge'
);
