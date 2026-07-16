CREATE TABLE home_config_versions (
  revision INTEGER PRIMARY KEY AUTOINCREMENT,
  schema_version INTEGER NOT NULL DEFAULT 1 CHECK (schema_version = 1),
  config_json TEXT NOT NULL
    CHECK (length(config_json) <= 131072)
    CHECK (json_valid(config_json))
    CHECK (json_type(config_json) = 'object'),
  note TEXT NOT NULL DEFAULT '' CHECK (length(note) <= 240),
  created_by TEXT NOT NULL CHECK (length(created_by) BETWEEN 3 AND 320),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  published_at TEXT
) STRICT;

CREATE INDEX idx_home_config_published
ON home_config_versions(published_at DESC, revision DESC)
WHERE published_at IS NOT NULL;

INSERT INTO home_config_versions
  (schema_version, config_json, note, created_by, published_at)
VALUES (
  1,
  '{"boot":{"lines":["JuZX@digital-factory ~ zsh","$ whoami","Product Manager / Industrial Digitalization Explorer","$ open juzx-os"],"launchLabel":"启动 JuZX OS"},"desktop":{"brand":"JuZX OS","menuLinks":[{"label":"About","href":"/about"},{"label":"Knowledge","href":"#knowledge"},{"label":"Now","href":"#system"}],"resetLabel":"重置桌面位置","entries":[{"id":"llm-wiki","label":"LLM Wiki","icon":"folder","position":{"x":80,"y":84},"window":{"title":"LLM Wiki","summary":"AI、Agent 与知识工程的结构化知识库。","href":"/wiki/"}},{"id":"finance-wiki","label":"Finance Wiki","icon":"folder","position":{"x":176,"y":84},"window":{"title":"Finance Wiki","summary":"金融、量化与市场结构知识库。","href":"/finance/"}},{"id":"ask","label":"知识问答","icon":"terminal","position":{"x":80,"y":176},"window":{"title":"知识问答","summary":"基于 LLM Wiki 检索结果回答问题。","href":"/ask/"}},{"id":"skill","label":"llm-wiki Skill","icon":"file","position":{"x":176,"y":176},"window":{"title":"llm-wiki Skill","summary":"公开的知识库构建方法、流程与安装指南。","href":"/llm-wiki/"}},{"id":"experiments","label":"AI 实验","icon":"folder","position":{"x":80,"y":268},"window":{"title":"AI 实验","summary":"个人 AI 工具、Agent 与工作流实验。"}},{"id":"projects","label":"项目档案","icon":"folder","position":{"x":176,"y":268},"window":{"title":"项目档案","summary":"MES 与工业数字化项目实践。"}},{"id":"about","label":"关于我","icon":"file","position":{"x":80,"y":360},"window":{"title":"关于我","summary":"JuZX 的角色、关注方向与当前实践。","href":"/about"}},{"id":"contact","label":"联系方式","icon":"terminal","position":{"x":176,"y":360},"window":{"title":"联系方式","summary":"GitHub: ketitongxue"}},{"id":"github","label":"GitHub","icon":"world","position":{"x":80,"y":452},"window":{"title":"GitHub","summary":"查看公开项目与提交记录。","href":"https://github.com/ketitongxue"}},{"id":"changelog","label":"网站更新记录","icon":"file","position":{"x":176,"y":452},"window":{"title":"网站更新记录","summary":"AI 纪元的内容与系统更新。","href":"/notes/sustainable-ai-workflow"}}]},"exit":{"title":"JuZX@digital-factory ~ zsh","lines":["$ logout","Session complete."]}}',
  'Initial static homepage configuration',
  'migration',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);
