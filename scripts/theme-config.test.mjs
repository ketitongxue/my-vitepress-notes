import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolveConfig } from 'vitepress'

const config = await resolveConfig('docs', 'build')

assert.equal(
  config.site.appearance,
  'force-dark',
  'the site must force its dark appearance to match the custom palette'
)

assert.deepEqual(
  config.site.themeConfig.footer,
  {
    message: '持续记录 AI、产品、工程与个人实践之间的连接。',
    copyright: 'Copyright © 2026 柯提'
  },
  'the site must render the configured garden footer'
)

assert.ok(
  config.site.themeConfig.nav.some(
    (item) => item.text === '知识库' && item.link === '/wiki/'
  ),
  'the main navigation must link to the wiki landing page'
)

const wikiSidebar = config.site.themeConfig.sidebar['/wiki/']
assert.deepEqual(
  wikiSidebar.map((group) => group.text),
  ['实体', '概念', '对比分析'],
  'the wiki sidebar must use the three Chinese index sections'
)
assert.deepEqual(
  wikiSidebar.map(({ text, collapsed }) => ({ text, collapsed: collapsed ?? false })),
  [
    { text: '实体', collapsed: false },
    { text: '概念', collapsed: true },
    { text: '对比分析', collapsed: false }
  ],
  'only the long concepts group should be collapsed by default'
)

const sidebarItems = wikiSidebar.flatMap((group) => group.items)
const manifest = JSON.parse(await readFile('wiki-manifest.json', 'utf8'))
assert.equal(
  sidebarItems.length,
  manifest.pages.length,
  'the wiki sidebar must list every published manifest page'
)

const sidebarLinks = sidebarItems.map((item) => item.link)
assert.equal(
  new Set(sidebarLinks).size,
  sidebarLinks.length,
  'every wiki sidebar link must be unique'
)

const manifestLinks = manifest.pages.map(({ publicPath }) =>
  `/${publicPath.replace(/^docs\//, '').replace(/\.md$/, '')}`
)
assert.deepEqual(
  [...sidebarLinks].sort(),
  [...manifestLinks].sort(),
  'wiki sidebar links must match manifest public URLs'
)

const wikiIndex = await readFile('docs/wiki/index.md', 'utf8')
const indexHeadings = [...wikiIndex.matchAll(/^## (实体|概念|对比分析)$/gm)]
const indexGroups = indexHeadings.map((heading, index) => ({
  text: heading[1],
  items: [...wikiIndex
    .slice(heading.index + heading[0].length, indexHeadings[index + 1]?.index)
    .matchAll(/^- \[([^\]]+)\]\((\/wiki\/[^)]+)\)$/gm)].map(
    ([, itemText, link]) => ({ text: itemText, link })
  )
}))
assert.deepEqual(
  wikiSidebar.map(({ text, items }) => ({ text, items })),
  indexGroups,
  'wiki sidebar titles and order must match the Chinese wiki index'
)

console.log('theme config tests passed')
