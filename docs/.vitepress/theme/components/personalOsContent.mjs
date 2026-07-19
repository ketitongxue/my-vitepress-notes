import { DEFAULT_HOME_CONFIG } from '../../../../shared/home-config.mjs'

export const bootLines = DEFAULT_HOME_CONFIG.boot.lines
export const desktopEntries = DEFAULT_HOME_CONFIG.desktop.entries

const section = (id, label, title, summary, cardIds) =>
  Object.freeze({ id, label, title, summary, cardIds: Object.freeze(cardIds) })

export const knowledgeSections = Object.freeze([
  section('intro', 'INTRO', '身份与方向', '从工业数字化实践出发，持续搭建 AI、Agent 与知识工程系统。', ['identity', 'experience']),
  section('llm-wiki', 'LLM WIKI', 'LLM Wiki', 'AI、Agent 与知识工程的结构化知识库。', ['llm-wiki']),
  section('qa', 'Q&A', '知识问答', '基于知识库检索结果回答问题。', ['qa']),
  section('skill', 'SKILL', '能力与方法', '连接知识、项目和持续学习的方法栈。', ['skills', 'learning']),
])

const node = ({ id, type, kicker, title, body, x, y, width, height,
  minWidth, minHeight, accent, mark, items = [], links = [], status }) => Object.freeze({
  id, type, kicker, title, body, x, y, width, height, minWidth, minHeight,
  visible: true, accent, mark, status,
  items: Object.freeze(items.map((item) => typeof item === 'string' ? item : Object.freeze(item))),
  links: Object.freeze(links.map((link) => Object.freeze(link))),
})

export const canvasCards = Object.freeze([
  node({ id: 'identity', type: 'identity', kicker: "HELLO, I'M", title: 'JuZX', mark: 'JZ',
    body: 'Product Manager · Industrial Digitalization Explorer\n关注智能制造以及 AI 在个人工作流中的实践。',
    x: 120, y: 360, width: 360, height: 260, minWidth: 300, minHeight: 220, accent: 'blue' }),
  node({ id: 'growth-product', type: 'timeline', kicker: '01', title: '产品实践',
    body: '把业务问题转化为可落地的产品方案。', x: 860, y: 280, width: 240, height: 160,
    minWidth: 220, minHeight: 140, accent: 'blue' }),
  node({ id: 'growth-ai', type: 'timeline', kicker: '02', title: 'AI 工作流',
    body: '把知识、检索和 Agent 变成持续使用的系统。', x: 1500, y: 270, width: 260, height: 170,
    minWidth: 220, minHeight: 140, accent: 'blue' }),
  node({ id: 'core-story', type: 'principle', kicker: 'CORE STORY', title: '从真实问题出发',
    body: '在项目中验证，再把经验沉淀为可复用的知识。', x: 780, y: 570, width: 340, height: 190,
    minWidth: 280, minHeight: 160, accent: 'yellow' }),
  node({ id: 'capabilities', type: 'skills', kicker: 'CAPABILITIES', title: '能力与方法', body: '',
    items: ['产品规划', '工业数字化', '知识工程', 'AI 工作流'], x: 1180, y: 600,
    width: 380, height: 180, minWidth: 320, minHeight: 160, accent: 'blue' }),
  node({ id: 'knowledge-products', type: 'knowledge', kicker: 'KNOWLEDGE SYSTEM', title: '知识系统', body: '',
    links: [{ label: 'LLM Wiki', href: '/wiki/' }, { label: '知识问答', href: '/ask/' },
      { label: 'llm-wiki Skill', href: '/llm-wiki/' }],
    x: 1830, y: 500, width: 400, height: 260, minWidth: 340, minHeight: 220, accent: 'blue' }),
  node({ id: 'current-build', type: 'status', kicker: 'CURRENT BUILD', title: 'Personal Digital Factory',
    body: '持续构建中', status: 'online', x: 1740, y: 850, width: 320, height: 170,
    minWidth: 280, minHeight: 150, accent: 'green' }),
  node({ id: 'next-direction', type: 'next', kicker: 'NEXT', title: '持续演进',
    body: '持续学习、构建和记录，让个人系统保持演进。', x: 1900, y: 240, width: 300, height: 150,
    minWidth: 250, minHeight: 140, accent: 'orange' }),
])

const connection = (from, to) => Object.freeze({ from, to })

export const canvasConnections = Object.freeze([
  connection('identity', 'growth-product'),
  connection('growth-product', 'growth-ai'),
  connection('growth-product', 'core-story'),
  connection('growth-product', 'capabilities'),
  connection('growth-ai', 'capabilities'),
  connection('growth-ai', 'knowledge-products'),
  connection('growth-ai', 'current-build'),
  connection('growth-ai', 'next-direction'),
])
