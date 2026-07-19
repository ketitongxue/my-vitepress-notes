import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const sections = [
  ['entities', '实体'],
  ['concepts', '概念'],
  ['comparisons', '对比分析'],
]

export function sidebarFor(name, root = projectRoot) {
  const manifest = JSON.parse(readFileSync(path.join(root, `${name}-manifest.json`), 'utf8'))
  const index = readFileSync(path.join(root, 'docs', name, 'index.md'), 'utf8')
  const groups = sections.map(([, text], groupIndex) => {
    const heading = `## ${text}`
    const start = index.indexOf(heading)
    if (start === -1) throw new Error(`${name} index is missing ${heading}`)
    const nextHeading = sections[groupIndex + 1]?.[1]
    const end = nextHeading ? index.indexOf(`## ${nextHeading}`, start + heading.length) : index.length
    const items = [...index.slice(start + heading.length, end)
      .matchAll(new RegExp(`^- \\[([^\\]]+)\\]\\((/${name}/[^)]+)\\)$`, 'gm'))]
      .map(([, textValue, link]) => ({ text: textValue, link }))
    return { text, collapsed: true, items }
  })
  const links = groups.flatMap((group) => group.items.map((item) => item.link))
  const expectedLinks = manifest.pages.map((page) => page.publicPath
    .replace(new RegExp(`^docs/${name}/`), `/${name}/`)
    .replace(/\.md$/, ''))
  if (new Set(links).size !== links.length
    || JSON.stringify([...links].sort()) !== JSON.stringify([...expectedLinks].sort())) {
    throw new Error(`${name} navigation and manifest are inconsistent`)
  }
  return groups
}

export const knowledgeSidebars = {
  '/wiki/': sidebarFor('wiki'),
}
