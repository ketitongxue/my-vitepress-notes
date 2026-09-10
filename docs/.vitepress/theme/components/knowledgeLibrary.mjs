export const libraryUrl = 'https://ketitongxue.github.io/ai-era-html-docs/'
export const libraryTreeUrl = 'https://api.github.com/repos/ketitongxue/ai-era-html-docs/git/trees/main?recursive=1'

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
