export const libraryUrl = 'https://ketitongxue.github.io/ai-era-html-docs/'
export const libraryTreeUrl = '/api/knowledge/tree'

export function getLibraryDirectoryView(groups, selectedCategory = null) {
  const category = groups.some((group) => group.title === selectedCategory) ? selectedCategory : null
  const visibleGroups = category === null ? groups : groups.filter((group) => group.title === category)
  return {
    selectedCategory: category,
    groups: visibleGroups,
    total: visibleGroups.reduce((count, group) => count + group.articles.length, 0),
  }
}

export async function loadLibraryDocuments({ signal, fetchImpl = fetch } = {}) {
  const response = await fetchImpl(libraryTreeUrl, { signal })
  if (!response.ok) throw new Error('Library unavailable')
  const data = await response.json()
  return {
    groups: groupLibraryDocuments(data),
    usingSnapshot: data.source === 'snapshot',
  }
}

export function isLibraryRootHref(href) {
  if (typeof href !== 'string' || /[\\\u0000-\u0020]/.test(href)) return false
  if (!/^https:\/\/[^/?#@]+(?:[/?#]|$)/i.test(href)) return false
  try {
    const url = new URL(href)
    return url.origin === 'https://ketitongxue.github.io'
      && !url.username && !url.password
      && ['/ai-era-html-docs', '/ai-era-html-docs/', '/ai-era-html-docs/index.html'].includes(url.pathname)
  } catch {
    return false
  }
}

export function observeEmbeddedFrameFocus({ windowLike, getFrame, activate }) {
  let pendingFrame = null
  const handleBlur = () => {
    if (pendingFrame !== null) windowLike.cancelAnimationFrame(pendingFrame)
    pendingFrame = windowLike.requestAnimationFrame(() => {
      pendingFrame = null
      const frame = getFrame()
      if (frame && windowLike.document.activeElement === frame) activate()
    })
  }
  windowLike.addEventListener('blur', handleBlur)
  return () => {
    windowLike.removeEventListener('blur', handleBlur)
    if (pendingFrame !== null) windowLike.cancelAnimationFrame(pendingFrame)
    pendingFrame = null
  }
}

function categoryFor(path, title) {
  const folders = path.slice(5).split('/')
  if (folders.length > 1) return folders[0]
  if (/obsidian/i.test(title)) return '工具与集成'
  if (/claude\s*code/i.test(title)) return 'Claude Code'
  if (/SDD|工作流/i.test(title)) return '开发工作流'
  return '其他文章'
}

export function groupLibraryDocuments(data) {
  if (!Array.isArray(data?.tree) || data.truncated) throw new Error('Incomplete library tree')
  const groups = new Map()
  const paths = new Set()
  for (const item of [...data.tree].sort((a, b) => String(a?.path).localeCompare(String(b?.path), 'zh-CN', { numeric: true }))) {
    const path = item?.path
    if (item?.type !== 'blob' || item.mode !== '100644' || typeof path !== 'string'
      || !path.startsWith('docs/') || !/\.html?$/i.test(path)
      || path.split('/').some((part) => !part || part === '.' || part === '..') || paths.has(path)) continue
    paths.add(path)
    const title = path.split('/').at(-1).replace(/\.html?$/i, '')
    const category = categoryFor(path, title)
    if (!groups.has(category)) groups.set(category, [])
    groups.get(category).push({ title, href: libraryUrl + path.split('/').map(encodeURIComponent).join('/') })
  }
  return [...groups].map(([title, articles]) => ({ title, articles }))
}
