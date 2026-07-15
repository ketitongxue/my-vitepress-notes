CREATE TABLE personal_os_config_versions (
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

CREATE INDEX idx_personal_os_published
ON personal_os_config_versions(published_at DESC, revision DESC)
WHERE published_at IS NOT NULL;

INSERT INTO personal_os_config_versions
  (schema_version, config_json, note, created_by, published_at)
VALUES (
  1,
  '{"cards":[{"id":"identity","type":"identity","kicker":"HELLO, I''M","title":"JuZX","body":"Product Manager · Industrial Digitalization Explorer\n关注智能制造以及 AI 在个人工作流中的实践。","x":120,"y":360,"width":360,"height":260,"minWidth":300,"minHeight":220,"visible":true,"accent":"blue","mark":"JZ","items":[],"links":[]},{"id":"growth-product","type":"timeline","kicker":"01","title":"产品实践","body":"把业务问题转化为可落地的产品方案。","x":860,"y":280,"width":240,"height":160,"minWidth":220,"minHeight":140,"visible":true,"accent":"blue","items":[],"links":[]},{"id":"growth-ai","type":"timeline","kicker":"02","title":"AI 工作流","body":"把知识、检索和 Agent 变成持续使用的系统。","x":1500,"y":270,"width":260,"height":170,"minWidth":220,"minHeight":140,"visible":true,"accent":"blue","items":[],"links":[]},{"id":"core-story","type":"principle","kicker":"CORE STORY","title":"从真实问题出发","body":"在项目中验证，再把经验沉淀为可复用的知识。","x":780,"y":570,"width":340,"height":190,"minWidth":280,"minHeight":160,"visible":true,"accent":"yellow","items":[],"links":[]},{"id":"capabilities","type":"skills","kicker":"CAPABILITIES","title":"能力与方法","body":"","x":1180,"y":600,"width":380,"height":180,"minWidth":320,"minHeight":160,"visible":true,"accent":"blue","items":["产品规划","工业数字化","知识工程","AI 工作流"],"links":[]},{"id":"knowledge-products","type":"knowledge","kicker":"KNOWLEDGE SYSTEM","title":"知识系统","body":"","x":1830,"y":500,"width":400,"height":260,"minWidth":340,"minHeight":220,"visible":true,"accent":"blue","items":[],"links":[{"label":"LLM Wiki","href":"/wiki/"},{"label":"Finance Wiki","href":"/finance/"},{"label":"知识问答","href":"/ask/"},{"label":"llm-wiki Skill","href":"/llm-wiki/"}]},{"id":"current-build","type":"status","kicker":"CURRENT BUILD","title":"Personal Digital Factory","body":"持续构建中","x":1740,"y":850,"width":320,"height":170,"minWidth":280,"minHeight":150,"visible":true,"accent":"green","status":"online","items":[],"links":[]},{"id":"next-direction","type":"next","kicker":"NEXT","title":"持续演进","body":"持续学习、构建和记录，让个人系统保持演进。","x":1900,"y":240,"width":300,"height":150,"minWidth":250,"minHeight":140,"visible":true,"accent":"orange","items":[],"links":[]}],"connections":[{"from":"identity","to":"growth-product"},{"from":"growth-product","to":"growth-ai"},{"from":"growth-product","to":"core-story"},{"from":"growth-product","to":"capabilities"},{"from":"growth-ai","to":"capabilities"},{"from":"growth-ai","to":"knowledge-products"},{"from":"growth-ai","to":"current-build"},{"from":"growth-ai","to":"next-direction"}]}',
  'Initial static Personal OS configuration',
  'migration',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);
