export const bootLines = Object.freeze([
  'JuZX@digital-factory ~ zsh',
  '$ whoami',
  'MES Product Manager / Industrial Digitalization Explorer',
  '$ open juzx-os',
])

const entry = (id, label, icon, x, y, title, summary, href, external = false) =>
  Object.freeze({ id, label, icon, position: Object.freeze({ x, y }), window: Object.freeze({ title, summary, href, external }) })

export const desktopEntries = Object.freeze([
  entry('llm-wiki', 'LLM Wiki', 'folder', 80, 84, 'LLM Wiki', 'AI、Agent 与知识工程的结构化知识库。', '/wiki/'),
  entry('finance-wiki', 'Finance Wiki', 'folder', 176, 84, 'Finance Wiki', '金融、量化与市场结构知识库。', '/finance/'),
  entry('ask', '知识问答', 'terminal', 80, 176, '知识问答', '基于 LLM Wiki 检索结果回答问题。', '/ask/'),
  entry('skill', 'llm-wiki Skill', 'file', 176, 176, 'llm-wiki Skill', '公开的知识库构建方法、流程与安装指南。', '/llm-wiki/'),
  entry('experiments', 'AI 实验', 'folder', 80, 268, 'AI 实验', '个人 AI 工具、Agent 与工作流实验。'),
  entry('projects', '项目档案', 'folder', 176, 268, '项目档案', 'MES 与工业数字化项目实践。'),
  entry('about', '关于我', 'file', 80, 360, '关于我', 'JuZX 的角色、关注方向与当前实践。', '/about'),
  entry('contact', '联系方式', 'terminal', 176, 360, '联系方式', 'GitHub: ketitongxue'),
  entry('github', 'GitHub', 'world', 80, 452, 'GitHub', '查看公开项目与提交记录。', 'https://github.com/ketitongxue', true),
  entry('changelog', '网站更新记录', 'file', 176, 452, '网站更新记录', 'AI 纪元的内容与系统更新。', '/notes/sustainable-ai-workflow'),
])

const section = (id, label, title, summary, cardIds) =>
  Object.freeze({ id, label, title, summary, cardIds: Object.freeze(cardIds) })

export const knowledgeSections = Object.freeze([
  section('intro', 'INTRO', '身份与方向', '从工业数字化实践出发，持续搭建个人知识与实验系统。', ['identity', 'experience']),
  section('llm-wiki', 'LLM WIKI', 'LLM Wiki', 'AI、Agent 与知识工程的结构化知识库。', ['llm-wiki']),
  section('finance', 'FINANCE', 'Finance Wiki', '金融、量化与市场结构知识库。', ['finance']),
  section('qa', 'Q&A', '知识问答', '基于知识库检索结果回答问题。', ['qa']),
  section('skill', 'SKILL', '能力与方法', '连接知识、项目和持续学习的方法栈。', ['skills', 'learning']),
  section('recent', 'RECENT', '近期实践', '持续推进的项目与 AI 实验。', ['projects', 'experiments']),
])

const card = (id, title, kicker, body, x, y, width, height, visible, accent, href) =>
  Object.freeze({ id, title, kicker, body, x, y, width, height, visible, accent, href })

export const canvasCards = Object.freeze([
  card('identity', 'JuZX', 'IDENTITY', 'MES 产品经理，工业数字化探索者。', 72, 72, 286, 184, true, 'cyan'),
  card('experience', 'Industrial Experience', 'EXPERIENCE', '连接制造现场、产品设计与数字系统。', 408, 76, 304, 168, true, 'amber'),
  card('skills', 'Product × Technology', 'SKILLS', '产品规划、知识工程与 AI 工作流。', 120, 324, 296, 176, true, 'violet'),
  card('projects', 'Project Archive', 'PROJECTS', 'MES 与工业数字化项目实践档案。', 482, 322, 306, 180, true, 'amber'),
  card('learning', 'Continuous Learning', 'LEARNING', '把输入沉淀为可检索、可连接的知识。', 220, 590, 316, 176, true, 'cyan'),
  card('llm-wiki', 'LLM Wiki', 'KNOWLEDGE BASE', 'AI、Agent 与知识工程的结构化知识库。', 862, 92, 320, 188, true, 'violet', '/wiki/'),
  card('finance', 'Finance Wiki', 'KNOWLEDGE BASE', '金融、量化与市场结构知识库。', 894, 344, 316, 176, true, 'amber', '/finance/'),
  card('qa', '知识问答', 'RETRIEVAL', '基于 LLM Wiki 检索结果回答问题。', 722, 600, 304, 174, true, 'cyan', '/ask/'),
  card('experiments', 'AI 实验', 'LAB', '个人 AI 工具、Agent 与工作流实验。', 1122, 584, 310, 180, true, 'violet'),
])

const connection = (from, to) => Object.freeze({ from, to })

export const canvasConnections = Object.freeze([
  connection('identity', 'experience'),
  connection('identity', 'skills'),
  connection('experience', 'projects'),
  connection('skills', 'learning'),
  connection('skills', 'llm-wiki'),
  connection('learning', 'qa'),
  connection('llm-wiki', 'finance'),
  connection('llm-wiki', 'qa'),
  connection('projects', 'experiments'),
  connection('qa', 'experiments'),
])
