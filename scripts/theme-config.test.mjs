import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolveConfig } from 'vitepress'

const config = await resolveConfig('docs', 'build')

assert.equal(
  config.site.appearance,
  'dark',
  'the site must default to dark while allowing a persisted visitor choice'
)

assert.equal(
  config.site.themeConfig.darkModeSwitchLabel,
  '主题颜色',
  'the native appearance switch must have a Chinese label'
)

assert.deepEqual(
  config.site.themeConfig.footer,
  {
    message: '持续记录 AI、产品、工程与个人实践之间的连接。',
    copyright: 'Copyright © 2026 柯提'
  },
  'the site must render the configured garden footer'
)

const knowledgeNav = config.site.themeConfig.nav.find((item) => item.text === '知识库')
assert.deepEqual(
  knowledgeNav,
  { text: '知识库', link: '/wiki/' },
  'the main navigation must link directly to the AI knowledge base'
)

assert.equal(
  JSON.stringify(config.site.themeConfig.nav).includes('/finance/'),
  false,
  'the retired Finance route must not remain in navigation'
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
    { text: '实体', collapsed: true },
    { text: '概念', collapsed: true },
    { text: '对比分析', collapsed: true }
  ],
  'every wiki sidebar group should be collapsed by default'
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

assert.equal(config.site.themeConfig.sidebar['/finance/'], undefined)

console.log('theme config tests passed')
