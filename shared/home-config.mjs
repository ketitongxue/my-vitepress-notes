const ICONS = new Set(['folder', 'file', 'terminal', 'world'])
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const MAX_BOOT_LINES = 12
const MAX_MENU_LINKS = 8
const MAX_ENTRIES = 40

export const HOME_CONFIG_SCHEMA_VERSION = 1

export class HomeConfigError extends Error {
  constructor(message) {
    super(message)
    this.name = 'HomeConfigError'
  }
}

function fail(message) {
  throw new HomeConfigError(message)
}

function exactObject(value, name, allowedKeys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${name} must be an object`)
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) fail(`${name}.${key} is not supported`)
  }
  return value
}

function text(value, name, { max, required = true } = {}) {
  if (typeof value !== 'string') fail(`${name} must be a string`)
  const normalized = value.trim()
  if (required && normalized.length === 0) fail(`${name} is required`)
  if (normalized.length > max) fail(`${name} is too long`)
  return normalized
}

function number(value, name, min, max) {
  if (!Number.isFinite(value) || value < min || value > max) fail(`${name} is out of range`)
  return Math.round(value * 100) / 100
}

function safeHref(value, name) {
  const href = text(value, name, { max: 500 })
  if (/^#(?:home|knowledge|system)$/.test(href)) return href
  if (/^\/(?!\/)[^\s]*$/.test(href)) return href
  try {
    const url = new URL(href)
    if (url.protocol === 'https:') return url.href
  } catch {
    // Fall through to the validation error.
  }
  fail(`${name} must be a site path, OS hash, or HTTPS URL`)
}

function stringList(value, name, { min = 0, maxItems, maxText }) {
  if (!Array.isArray(value) || value.length < min || value.length > maxItems) fail(`${name} is invalid`)
  return value.map((item, index) => text(item, `${name}[${index}]`, { max: maxText }))
}

function normalizeLink(value, name) {
  const link = exactObject(value, name, new Set(['label', 'href']))
  return {
    label: text(link.label, `${name}.label`, { max: 48 }),
    href: safeHref(link.href, `${name}.href`),
  }
}

function normalizeEntry(value, index) {
  const name = `desktop.entries[${index}]`
  const entry = exactObject(value, name, new Set(['id', 'label', 'icon', 'position', 'window']))
  const id = text(entry.id, `${name}.id`, { max: 64 })
  if (!ID_PATTERN.test(id)) fail(`${name}.id has an invalid format`)
  const icon = text(entry.icon, `${name}.icon`, { max: 24 })
  if (!ICONS.has(icon)) fail(`${name}.icon is not supported`)

  const position = exactObject(entry.position, `${name}.position`, new Set(['x', 'y']))
  const windowConfig = exactObject(entry.window, `${name}.window`, new Set(['title', 'summary', 'href']))
  const normalizedWindow = {
    title: text(windowConfig.title, `${name}.window.title`, { max: 100 }),
    summary: text(windowConfig.summary, `${name}.window.summary`, { max: 800, required: false }),
  }
  if (windowConfig.href !== undefined && windowConfig.href !== '') {
    normalizedWindow.href = safeHref(windowConfig.href, `${name}.window.href`)
  }

  return {
    id,
    label: text(entry.label, `${name}.label`, { max: 48 }),
    icon,
    position: {
      x: number(position.x, `${name}.position.x`, 0, 5000),
      y: number(position.y, `${name}.position.y`, 0, 5000),
    },
    window: normalizedWindow,
  }
}

export function normalizeHomeConfig(input) {
  const root = exactObject(input, 'config', new Set(['boot', 'desktop', 'exit']))
  const boot = exactObject(root.boot, 'boot', new Set(['lines', 'launchLabel']))
  const desktop = exactObject(root.desktop, 'desktop', new Set(['brand', 'menuLinks', 'resetLabel', 'entries']))
  const exit = exactObject(root.exit, 'exit', new Set(['title', 'lines']))

  if (!Array.isArray(desktop.menuLinks) || desktop.menuLinks.length > MAX_MENU_LINKS) {
    fail('desktop.menuLinks is invalid')
  }
  if (!Array.isArray(desktop.entries) || desktop.entries.length === 0 || desktop.entries.length > MAX_ENTRIES) {
    fail('desktop.entries is invalid')
  }

  const entries = desktop.entries.map(normalizeEntry)
  const ids = new Set()
  for (const entry of entries) {
    if (ids.has(entry.id)) fail(`duplicate desktop entry id: ${entry.id}`)
    ids.add(entry.id)
  }

  return {
    boot: {
      lines: stringList(boot.lines, 'boot.lines', { min: 1, maxItems: MAX_BOOT_LINES, maxText: 160 }),
      launchLabel: text(boot.launchLabel, 'boot.launchLabel', { max: 48 }),
    },
    desktop: {
      brand: text(desktop.brand, 'desktop.brand', { max: 48 }),
      menuLinks: desktop.menuLinks.map((link, index) => normalizeLink(link, `desktop.menuLinks[${index}]`)),
      resetLabel: text(desktop.resetLabel, 'desktop.resetLabel', { max: 48 }),
      entries,
    },
    exit: {
      title: text(exit.title, 'exit.title', { max: 120 }),
      lines: stringList(exit.lines, 'exit.lines', { min: 1, maxItems: 8, maxText: 160 }),
    },
  }
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  Object.freeze(value)
  for (const child of Object.values(value)) deepFreeze(child)
  return value
}

export const DEFAULT_HOME_CONFIG = deepFreeze(normalizeHomeConfig({
  boot: {
    lines: [
      'JuZX@digital-factory ~ zsh',
      '$ whoami',
      'Product Manager / Industrial Digitalization Explorer',
      '$ open juzx-os',
    ],
    launchLabel: '启动 JuZX OS',
  },
  desktop: {
    brand: 'JuZX OS',
    menuLinks: [
      { label: 'About', href: '/about' },
      { label: 'Knowledge', href: '#knowledge' },
      { label: 'Now', href: '#system' },
    ],
    resetLabel: '重置桌面位置',
    entries: [
      { id: 'llm-wiki', label: 'LLM Wiki', icon: 'folder', position: { x: 80, y: 84 }, window: { title: 'LLM Wiki', summary: 'AI、Agent 与知识工程的结构化知识库。', href: '/wiki/' } },
      { id: 'finance-wiki', label: 'Finance Wiki', icon: 'folder', position: { x: 176, y: 84 }, window: { title: 'Finance Wiki', summary: '金融、量化与市场结构知识库。', href: '/finance/' } },
      { id: 'ask', label: '知识问答', icon: 'terminal', position: { x: 80, y: 176 }, window: { title: '知识问答', summary: '基于 LLM Wiki 检索结果回答问题。', href: '/ask/' } },
      { id: 'skill', label: 'llm-wiki Skill', icon: 'file', position: { x: 176, y: 176 }, window: { title: 'llm-wiki Skill', summary: '公开的知识库构建方法、流程与安装指南。', href: '/llm-wiki/' } },
      { id: 'experiments', label: 'AI 实验', icon: 'folder', position: { x: 80, y: 268 }, window: { title: 'AI 实验', summary: '个人 AI 工具、Agent 与工作流实验。' } },
      { id: 'projects', label: '项目档案', icon: 'folder', position: { x: 176, y: 268 }, window: { title: '项目档案', summary: 'MES 与工业数字化项目实践。' } },
      { id: 'about', label: '关于我', icon: 'file', position: { x: 80, y: 360 }, window: { title: '关于我', summary: 'JuZX 的角色、关注方向与当前实践。', href: '/about' } },
      { id: 'contact', label: '联系方式', icon: 'terminal', position: { x: 176, y: 360 }, window: { title: '联系方式', summary: 'GitHub: ketitongxue' } },
      { id: 'github', label: 'GitHub', icon: 'world', position: { x: 80, y: 452 }, window: { title: 'GitHub', summary: '查看公开项目与提交记录。', href: 'https://github.com/ketitongxue' } },
      { id: 'changelog', label: '网站更新记录', icon: 'file', position: { x: 176, y: 452 }, window: { title: '网站更新记录', summary: 'AI 纪元的内容与系统更新。', href: '/notes/sustainable-ai-workflow' } },
    ],
  },
  exit: {
    title: 'JuZX@digital-factory ~ zsh',
    lines: ['$ logout', 'Session complete.'],
  },
}))
